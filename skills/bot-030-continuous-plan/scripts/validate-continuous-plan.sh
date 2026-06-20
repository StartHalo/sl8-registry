#!/usr/bin/env bash
# validate-continuous-plan.sh — deterministic structural linter for continuous-plan.md
#
# A continuous-plan describes ONE unbroken continuous shot (no cuts): a base 8s segment
# plus 2-3 ~7s extend "hops". Unlike a cut-based shotlist there are NO time-codes; the
# gate instead enforces the continuity contract that holds identity across a Veo extend.
#
# Checks (all structural, zero LLM judgment):
#   - '# Continuous-plan:' title present
#   - a non-empty global style/look header line (first non-blank line after the title,
#     before the CHARACTER block)
#   - a 'CHARACTER:' block listing 5-7 frozen tokens (tokens separated by ';' or ',')
#   - exactly ONE 'Base:' block, non-empty (>= 60 chars of body), not absurdly long
#   - 2-3 numbered 'Hop N:' lines (Hop 1, Hop 2, [Hop 3]), each:
#       * carries CONTINUITY language (no-cut): one of
#         'without any cut' / 'no cut' / 'the same' / 'continues' / 'keeps moving'
#       * REPEATS a meaningful share of the subject — a token-overlap proxy for the
#         >=80%-verbatim rule: at least HALF of the CHARACTER tokens (>= ceil(0.5*K))
#         appear verbatim in the hop line (a structural floor; the rubric judges the
#         full 80% prose repeat)
#       * does NOT leak cut-language ('cut to', 'next shot', 'meanwhile', 'new shot')
#       * does NOT OPEN with negative-prompt syntax ('no '/'avoid '/'without ' as the
#         very first word — 'without any cut' is allowed because the hop body, not the
#         opener, carries it; we only flag a body whose FIRST word is a bare negative)
#   - the footer 'Total: ~Ns (one continuous take...) / AR.' present; N parsed and must
#     equal 8 + 7*hops within 1s; AR parsed (16:9 / 9:16 style)
#   - the footer carries an 'Audio:' clause and the positive-constraint suffix
#     ('one continuous shot' AND 'no cuts' AND 'stable picture')
#
# Usage:  validate-continuous-plan.sh <path/to/continuous-plan.md>
# Exit:   0 = valid, 1 = lint errors (line-itemized on stdout), 2 = usage/deps
set -euo pipefail

usage() {
  echo "usage: validate-continuous-plan.sh <path/to/continuous-plan.md>" >&2
  exit 2
}

for dep in awk; do
  if ! command -v "$dep" >/dev/null 2>&1; then
    echo "ERROR: required dependency '$dep' not found on PATH" >&2
    exit 2
  fi
done

[ "$#" -eq 1 ] || usage
PLAN="$1"

if [ ! -f "$PLAN" ]; then
  echo "FAIL: plan file not found: $PLAN"
  exit 1
fi
if [ ! -r "$PLAN" ]; then
  echo "FAIL: plan file not readable: $PLAN"
  exit 1
fi

awk '
function err(line, msg) { nerr++; printf("  line %-4d %s\n", line, msg) }
function ferr(msg)      { nerr++; printf("  file      %s\n", msg) }
function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t\r]+$/, "", s); return s }
function ceil_half(k,   h) { h = int((k + 1) / 2); return h }   # ceil(k/2)
BEGIN {
  nerr = 0
  has_title = 0; has_header = 0
  has_character = 0; ntokens = 0
  nbase = 0
  nhops = 0
  has_total = 0; has_audio = 0; has_suffix = 0
  total_dur = -1; total_ar = ""
  in_notes = 0
}
{
  line = $0
  sub(/\r$/, "", line)
  t = trim(line)
  low = tolower(line)

  # title
  if (line ~ /^# Continuous-plan:/) { has_title = 1; next }

  # enter Notes section — everything after is free-form, stop body parsing
  if (line ~ /^## /) {
    if (line ~ /^## Notes[ \t]*$/) in_notes = 1
    next
  }
  if (in_notes) next

  # blank line
  if (t == "") next

  # CHARACTER token block: "CHARACTER: tokA; tokB; tokC; ..."
  if (line ~ /^CHARACTER[ \t]*:/) {
    has_character = 1
    cpos = index(line, ":")
    body = trim(substr(line, cpos + 1))
    # strip a trailing parenthetical note like "(5-7 frozen verbatim tokens)"
    gsub(/\([^)]*\)[ \t]*$/, "", body)
    body = trim(body)
    # split on semicolon (preferred) or comma into tokens; count + remember verbatim tokens
    n = split(body, arr, /[;,]/)
    for (i = 1; i <= n; i++) {
      tok = trim(arr[i])
      if (length(tok) >= 3) {
        ntokens++
        tokens[ntokens] = tolower(tok)
      }
    }
    next
  }

  # Base block: one line "Base: ..."
  if (line ~ /^Base[ \t]*:/) {
    nbase++
    cpos = index(line, ":")
    bbody = trim(substr(line, cpos + 1))
    if (length(bbody) < 60)
      err(NR, "Base block is too thin (<60 chars) — describe the opening frame AND the base continuous motion AND native audio")
    else if (length(bbody) > 1200)
      err(NR, "Base block is too long (>1200 chars) — tighten to one opening frame + one continuous motion + audio")
    base_line = NR
    next
  }

  # Hop line: "Hop N: ..."
  if (line ~ /^Hop[ \t]+[0-9]+[ \t]*:/) {
    nhops++
    cpos = index(line, ":")
    hbody = trim(substr(line, cpos + 1))
    hlow = tolower(hbody)
    hop_line[nhops] = NR

    if (length(hbody) < 30)
      err(NR, "Hop " nhops " is too thin (<30 chars) — repeat the subject and add one new beat")

    # continuity language present?
    if (hlow !~ /without any cut/ && hlow !~ /no cut/ && hlow !~ /the same/ && \
        hlow !~ /continues/ && hlow !~ /keeps moving/ && hlow !~ /keeps gliding/)
      err(NR, "Hop " nhops " has no continuity language — open with \"The same <subject>\" / \"without any cut\" so the shot does not read as an edit")

    # cut-language leakage?
    if (hlow ~ /cut to/ || hlow ~ /next shot/ || hlow ~ /meanwhile/ || hlow ~ /new shot/)
      err(NR, "Hop " nhops " leaks cut-language (\"cut to\" / \"next shot\" / \"meanwhile\") — this is ONE continuous take, never an edit")

    # negative-prompt syntax must not OPEN the hop body. NOTE: "without any cut" is the
    # required continuity phrase, so we ONLY flag a body whose FIRST word is "no" or
    # "avoid" (a bare negative opener), not "without".
    if (hbody ~ /^(no|avoid) [A-Za-z]/)
      err(NR, "Hop " nhops " opens with negative-prompt syntax (\"no X\" / \"avoid\") — Veo uses positive constraints; keep negatives in the footer suffix only")

    # subject-repeat proxy: count CHARACTER tokens that appear verbatim in this hop
    hop_tokhits[nhops] = 0
    if (ntokens > 0) {
      hits = 0
      for (i = 1; i <= ntokens; i++) {
        tk = tokens[i]
        if (tk != "" && index(hlow, tk) > 0) hits++
      }
      hop_tokhits[nhops] = hits
    }
    next
  }

  # the Total / Audio / suffix footer
  if (line ~ /^Total[ \t]*:/) {
    has_total = 1
    if (low ~ /audio:/) has_audio = 1
    if (low ~ /one continuous shot/ && low ~ /no cuts/ && low ~ /stable picture/) has_suffix = 1
    tmp = line
    # duration: first integer (allow a leading "~") before "s"
    if (match(tmp, /Total[ \t]*:[ \t]*~?[0-9]+[ \t]*s/)) {
      d = substr(tmp, RSTART, RLENGTH)
      gsub(/[^0-9]/, "", d); total_dur = d + 0
    } else err(NR, "Total footer must state the length as \"Total: ~Ns (one continuous take...) / AR.\"")
    # aspect ratio like 16:9 / 9:16
    if (match(tmp, /[0-9]+:[0-9]+/)) {
      total_ar = substr(tmp, RSTART, RLENGTH)
    } else err(NR, "Total footer must state the aspect ratio as \"... / AR.\" (e.g. 16:9)")
    # must mark it a continuous take
    if (low !~ /one continuous take/)
      err(NR, "Total footer must mark the take as \"(one continuous take, no cuts)\"")
    next
  }

  # the global header is the first non-blank, non-title, non-character, non-base,
  # non-hop, non-footer line we reach before any of those — mark it present
  if (!has_header && !has_character && nbase == 0 && nhops == 0) { has_header = 1; next }

  # any other prose before Notes is tolerated
  next
}
END {
  if (!has_title)     ferr("missing \"# Continuous-plan: <project-name>\" title")
  if (!has_header)    ferr("missing the global style/look header line under the title")

  if (!has_character) ferr("missing the \"CHARACTER:\" frozen-token block")
  else if (ntokens < 5 || ntokens > 7)
    ferr(sprintf("CHARACTER block must list 5-7 frozen tokens (found %d)", ntokens))

  if (nbase == 0)      ferr("missing the single \"Base:\" block (opening frame + base 8s motion + audio)")
  else if (nbase > 1)  ferr(sprintf("there must be exactly ONE Base block (found %d) — this is one continuous shot", nbase))

  if (nhops < 2 || nhops > 3)
    ferr(sprintf("hop count must be 2-3 \"Hop N:\" lines (found %d)", nhops))

  # subject-repeat floor: each hop must echo >= ceil(K/2) of the CHARACTER tokens verbatim
  if (ntokens >= 5) {
    need = ceil_half(ntokens)
    for (h = 1; h <= nhops; h++) {
      if (hop_tokhits[h] < need)
        err(hop_line[h], sprintf("Hop %d repeats only %d/%d CHARACTER tokens verbatim — repeat the subject (>= %d tokens) so identity survives the extend (the >=80%%-verbatim rule)", h, hop_tokhits[h], ntokens, need))
    }
  }

  if (!has_total)  ferr("missing the \"Total: ~Ns (one continuous take, no cuts) / AR.\" footer")
  if (!has_audio)  ferr("footer is missing the \"Audio:\" clause (native score + SFX + ambience)")
  if (!has_suffix) ferr("footer is missing the positive-constraint suffix (\"one continuous shot, no cuts ... stable picture, no flicker\")")

  # duration must equal 8 + 7*hops within 1s
  if (total_dur >= 0 && nhops >= 2 && nhops <= 3) {
    expect = 8 + 7 * nhops
    diff = total_dur - expect
    if (diff < 0) diff = -diff
    if (diff > 1)
      ferr(sprintf("Total footer says ~%ds but %d hops imply 8 + 7*%d = %ds (must match within 1s)", total_dur, nhops, nhops, expect))
  }

  if (nerr > 0) {
    printf("FAIL: %d error(s) in %s\n", nerr, FILENAME)
    exit 1
  }
  printf("OK: %s — %d character tokens, 1 base + %d hops, ~%ds total, aspect %s\n", FILENAME, ntokens, nhops, total_dur, total_ar)
  exit 0
}
' "$PLAN"
