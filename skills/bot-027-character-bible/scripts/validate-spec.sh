#!/usr/bin/env bash
# validate-spec.sh — deterministic structural gate for character-spec.md
#
# character-spec.md is the FLEET INTERFACE: the Seedance render phase (phase 3) pastes its
# frozen CHARACTER_BLOCK into the multi-shot prompt, and the Kling sibling parses the same
# fixed section names — so A and B render the same brief on the same identity. This linter
# enforces the parts a machine can check (structure + the no-synonym byte-identity), with
# zero LLM judgment. (Copied + adapted verbatim from BOT-016 bot-016-character-design, which
# deployed cleanly — the section contract is byte-identical across the fleet on purpose.)
#
# Checks (all structural):
#   - '# Character Spec:' title present
#   - every contract section heading present, exactly once, none empty:
#       ## Identity Tokens · ## Seed · ## Palette · ## STYLE_STACK ·
#       ## CHARACTER_BLOCK · ## Reference image · ## Provenance · ## Downstream use
#   - Identity Tokens: >= 5 trait bullets ('- <key>: <token>'); the first three keys are
#     face, hair, eyes (the fixed face->hair->eyes order); no empty token values
#   - Seed: exactly ONE line that is a single integer (no second seed, no float, no text)
#   - STYLE_STACK and CHARACTER_BLOCK: each a single non-empty double-quoted line
#   - Reference image: exactly one of 'none' or a path ending in an image extension
#   - NO-SYNONYM LOCK: every comma-separated token inside CHARACTER_BLOCK appears
#     byte-identical as a token value in the Identity Tokens list (drift = paraphrase;
#     this is the deterministic half of the no-synonym rule)
#
# Usage:  validate-spec.sh <path/to/character-spec.md>
# Exit:   0 = valid, 1 = lint errors (line-itemized on stdout), 2 = usage/deps
set -euo pipefail

usage() {
  echo "usage: validate-spec.sh <path/to/character-spec.md>" >&2
  exit 2
}

for dep in awk python3; do
  if ! command -v "$dep" >/dev/null 2>&1; then
    echo "ERROR: required dependency '$dep' not found on PATH" >&2
    exit 2
  fi
done

[ "$#" -eq 1 ] || usage
SPEC="$1"

if [ ! -f "$SPEC" ]; then
  echo "FAIL: spec file not found: $SPEC"
  exit 1
fi
if [ ! -r "$SPEC" ]; then
  echo "FAIL: spec file not readable: $SPEC"
  exit 1
fi

# ---------------------------------------------------------------------------
# Pass 1 (awk): structure, section presence/uniqueness, token count + ordering,
# single-integer seed, non-empty quoted frozen blocks, reference-image shape.
# ---------------------------------------------------------------------------
awk '
function err(line, msg) { nerr++; printf("  line %-4d %s\n", line, msg) }
function ferr(msg)      { nerr++; printf("  file      %s\n", msg) }
function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t\r]+$/, "", s); return s }
BEGIN {
  nerr = 0; has_title = 0; section = "preamble"
  ntokens = 0
  # required section -> seen count
  split("identity seed palette stylestack characterblock refimage provenance downstream", reqarr, " ")
  for (i in reqarr) seen[reqarr[i]] = 0
}
{
  line = $0; sub(/\r$/, "", line)

  if (line ~ /^# Character Spec:/) { has_title = 1; next }

  if (line ~ /^## /) {
    h = trim(substr(line, 4))
    # normalize: strip any parenthetical note after the heading name
    hn = h; sub(/[ \t]*\(.*$/, "", hn); hn = trim(hn)
    key = ""
    if (hn == "Identity Tokens")  key = "identity"
    else if (hn == "Seed")        key = "seed"
    else if (hn == "Palette")     key = "palette"
    else if (hn == "STYLE_STACK") key = "stylestack"
    else if (hn == "CHARACTER_BLOCK") key = "characterblock"
    else if (hn == "Reference image") key = "refimage"
    else if (hn == "Provenance")  key = "provenance"
    else if (hn == "Downstream use") key = "downstream"
    if (key != "") {
      seen[key]++; sec_line[key] = NR; sec_nonempty[key] = 0
      if (seen[key] > 1) err(NR, "duplicate \"## " hn "\" section heading")
      section = key
    } else {
      section = "other"
    }
    next
  }

  body = trim(line)
  if (body == "") next

  # mark the active required section as non-empty (has a content line)
  if (section in seen) sec_nonempty[section] = 1

  if (section == "identity") {
    if (line ~ /^[ \t]*-[ \t]+/) {
      item = line; sub(/^[ \t]*-[ \t]+/, "", item); item = trim(item)
      cpos = index(item, ":")
      if (cpos == 0) {
        err(NR, "Identity Tokens bullet must be \"- <key>: <token>\": \"" item "\"")
      } else {
        k = trim(substr(item, 1, cpos - 1))
        v = trim(substr(item, cpos + 1))
        if (v == "") err(NR, "Identity Tokens: empty token value for \"" k "\"")
        ntokens++
        tkey[ntokens] = tolower(k)
      }
    }
    next
  }

  if (section == "seed") {
    seed_lines++
    if (line !~ /^[ \t]*-?[0-9]+[ \t]*$/)
      err(NR, "Seed must be a single integer on its own line (got \"" body "\")")
    next
  }

  if (section == "stylestack")     { style_body = style_body body " "; style_line = NR; next }
  if (section == "characterblock") { char_body  = char_body  body " "; char_line  = NR; next }

  if (section == "refimage") {
    refimg_seen++
    ref_val = body
    next
  }
}
END {
  if (!has_title) ferr("missing \"# Character Spec: <Name>\" title")

  hname["identity"]="Identity Tokens"; hname["seed"]="Seed"; hname["palette"]="Palette"
  hname["stylestack"]="STYLE_STACK"; hname["characterblock"]="CHARACTER_BLOCK"
  hname["refimage"]="Reference image"; hname["provenance"]="Provenance"; hname["downstream"]="Downstream use"
  norder["identity"]=1; norder["seed"]=2; norder["palette"]=3; norder["stylestack"]=4
  norder["characterblock"]=5; norder["refimage"]=6; norder["provenance"]=7; norder["downstream"]=8

  for (k in hname) {
    if (seen[k] == 0)
      ferr("missing \"## " hname[k] "\" section")
    else if (sec_nonempty[k] == 0)
      err(sec_line[k], "\"## " hname[k] "\" section is empty")
  }

  # Identity Tokens: >=5 tokens, face->hair->eyes order on the first three keys.
  if (ntokens < 5)
    ferr(sprintf("Identity Tokens must list >= 5 trait tokens (found %d) — face -> hair -> eyes -> outfit/props", ntokens))
  if (ntokens >= 1 && tkey[1] != "face")
    err(sec_line["identity"], "first Identity Token must be the face token (key \"face\"), got \"" tkey[1] "\"")
  if (ntokens >= 2 && tkey[2] != "hair")
    err(sec_line["identity"], "second Identity Token must be the hair token (key \"hair\"), got \"" tkey[2] "\"")
  if (ntokens >= 3 && tkey[3] != "eyes")
    err(sec_line["identity"], "third Identity Token must be the eyes token (key \"eyes\"), got \"" tkey[3] "\"")

  # Seed: exactly one integer line.
  if (seen["seed"] > 0 && seed_lines == 0)
    err(sec_line["seed"], "Seed section has no integer line")
  else if (seed_lines > 1)
    err(sec_line["seed"], sprintf("Seed must be exactly ONE integer line (found %d) — one fixed seed per project", seed_lines))

  # Frozen blocks: single non-empty double-quoted line each.
  sb = style_body; sub(/[ \t]+$/, "", sb)
  cb = char_body;  sub(/[ \t]+$/, "", cb)
  if (seen["stylestack"] > 0) {
    if (sb == "") err(style_line, "STYLE_STACK is empty")
    else if (sb !~ /^".*"$/) err(style_line, "STYLE_STACK must be a single double-quoted line: \"<...>\"")
  }
  if (seen["characterblock"] > 0) {
    if (cb == "") err(char_line, "CHARACTER_BLOCK is empty")
    else if (cb !~ /^".*"$/) err(char_line, "CHARACTER_BLOCK must be a single double-quoted line: \"<...>\"")
  }

  # Reference image: exactly one value, either none or an image path.
  if (seen["refimage"] > 0) {
    if (refimg_seen == 0)
      err(sec_line["refimage"], "Reference image section has no value (use \"none\" or a path like inputs/ref.png)")
    else if (refimg_seen > 1)
      err(sec_line["refimage"], "Reference image must be a single value (none, or one path)")
    else if (ref_val != "none" && ref_val !~ /\.(png|jpg|jpeg|webp)$/)
      err(sec_line["refimage"], "Reference image must be \"none\" or an image path (.png/.jpg/.jpeg/.webp): \"" ref_val "\"")
  }

  if (nerr > 0) { printf("FAIL: %d structural error(s) in %s\n", nerr, FILENAME); exit 1 }
  printf("OK-STRUCT: %s — %d tokens\n", FILENAME, ntokens)
}
' "$SPEC"

# ---------------------------------------------------------------------------
# Pass 2 (python3): the NO-SYNONYM byte-identity lock. CHARACTER_BLOCK is what
# gets pasted into prompts, so it must be EXACTLY the locked Identity Token values
# joined by ", " in list order — paraphrase there is exactly the drift vector this
# skill exists to prevent. We do NOT naively split CHARACTER_BLOCK on commas: a
# locked token value may legitimately contain an internal comma (e.g. "ornate
# plate armor, etched with silver leaf") per references/trait-lock.md § Token craft.
# Instead we (a) check exact join-equality, and (b) on mismatch, greedily consume
# the locked tokens left-to-right to point at the FIRST token that fails to line up.
# ---------------------------------------------------------------------------
python3 - "$SPEC" <<'PY'
import re, sys

path = sys.argv[1]
with open(path, encoding="utf-8") as fh:
    text = fh.read()

def section_body(name):
    # capture lines under "## <name>" (optionally followed by a parenthetical) up to
    # the next "## " heading.
    pat = re.compile(r'^##[ \t]+' + re.escape(name) + r'\b[^\n]*\n(.*?)(?=^##[ \t]|\Z)',
                     re.MULTILINE | re.DOTALL)
    m = pat.search(text)
    return m.group(1) if m else ""

def norm(s):
    # collapse whitespace runs (incl. newlines) to single spaces; strip ends.
    return re.sub(r'\s+', ' ', s).strip()

# Locked token values, in document order (the right-hand side of each
# "- <key>: <token>" bullet). Order matters — CHARACTER_BLOCK must follow it.
ordered = []
for line in section_body("Identity Tokens").splitlines():
    line = line.strip()
    if not line.startswith("-"):
        continue
    body = line[1:].strip()
    if ":" in body:
        val = norm(body.split(":", 1)[1])
        if val:
            ordered.append(val)

cb = section_body("CHARACTER_BLOCK").strip()
mq = re.search(r'"(.*)"', cb, re.DOTALL)
errors = []
if not ordered:
    errors.append("Identity Tokens list yielded no token values to check against CHARACTER_BLOCK")
elif not mq:
    errors.append("CHARACTER_BLOCK has no double-quoted payload to verify against the token list")
else:
    payload = norm(mq.group(1)).rstrip(". ").strip()   # tolerate a trailing period
    expected = ", ".join(ordered)
    if payload != expected:
        # Greedy left-to-right consume to find the first token that fails to line up
        # (this is comma-tolerant — it matches whole token values, not comma pieces).
        rest = payload
        for val in ordered:
            r = rest.lstrip(", ").strip()
            if r.startswith(val):
                rest = r[len(val):]
            else:
                errors.append(
                    'CHARACTER_BLOCK does not continue with the next locked token verbatim '
                    '(no-synonym rule). Expected next: "%s" | remaining CHARACTER_BLOCK: "%s"'
                    % (val, r[:80]))
                break
        else:
            leftover = rest.lstrip(", ").strip()
            if leftover:
                errors.append(
                    'CHARACTER_BLOCK has trailing text not in the Identity Tokens list: "%s"'
                    % leftover[:80])
            else:
                errors.append(
                    'CHARACTER_BLOCK must equal the Identity Tokens joined by ", " in list order.\n'
                    '          expected: %s\n          got:      %s' % (expected, payload))

if errors:
    print("FAIL: %d no-synonym error(s) in %s" % (len(errors), path))
    for e in errors:
        print("  token   " + e)
    sys.exit(1)

print("OK: %s — structure sound and CHARACTER_BLOCK is the locked tokens joined verbatim, in order" % path)
PY
