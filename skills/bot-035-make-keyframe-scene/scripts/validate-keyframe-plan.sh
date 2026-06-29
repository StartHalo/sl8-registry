#!/usr/bin/env bash
# validate-keyframe-plan.sh — deterministic structural linter for keyframe-plan.md
#
# keyframe-plan.md is the RENDER CONTRACT for the keyframe-director bot: the render phase
# pins BOTH the first and last frame of every scene. State i is generated as an image; scene
# i then animates state[i] -> state[i+1] (first frame = state[i], last frame = state[i+1]).
# Because each state is the END of one scene AND the START of the next, the whole short is a
# CONTINUITY-CHAINED journey through K+1 pinned states with NO jump cuts. The character is
# self-contained in the frozen CHARACTER tokens reused verbatim in every state — there is no
# separate character-bible artifact.
#
# This linter enforces the parts a machine can check (structure + the K+1 / K arithmetic +
# the verbatim-token reuse), with ZERO LLM judgment. Arc/reveal quality is the rubric's job.
#
# Checks (all structural):
#   - '# Keyframe Plan:' title present
#   - a non-empty '## Style' (global style/look) header section
#   - a '## Character' section listing >= 5 frozen trait bullets ('- <key>: <token>'),
#     each with a non-empty token value
#   - a '## Keyframe States' section with K+1 numbered states 'State 0:' .. 'State K:',
#     contiguous from 0, each followed by a non-empty standalone image description
#   - a '## Scenes' section with K numbered scenes 'Scene 1:' .. 'Scene K:', contiguous
#     from 1; each scene declares the chain 'state N -> state N+1' (continuity-chained:
#     scene i animates state[i-1] -> state[i]) and a non-empty motion/transition line
#   - STATE/SCENE ARITHMETIC: number-of-scenes K AND number-of-states == K+1 (K+1 states
#     for K scenes); scene i's chain is exactly 'state (i-1) -> state i'
#   - the footer 'Total: K scenes, ~Ss each, AR.' present; K agrees with the scene count;
#     and an 'Audio:' line describing an ambient bed (Hailuo clips are silent)
#   - VERBATIM-TOKEN LOCK (python3 pass): every frozen Character token value appears
#     byte-identical at least once across the State descriptions taken together (the
#     character is reused verbatim, not paraphrased per state)
#
# Usage:  validate-keyframe-plan.sh <path/to/keyframe-plan.md>
# Exit:   0 = valid, 1 = lint errors (line-itemized on stdout), 2 = usage/deps
set -euo pipefail

usage() {
  echo "usage: validate-keyframe-plan.sh <path/to/keyframe-plan.md>" >&2
  exit 2
}

for dep in awk python3; do
  if ! command -v "$dep" >/dev/null 2>&1; then
    echo "ERROR: required dependency '$dep' not found on PATH" >&2
    exit 2
  fi
done

[ "$#" -eq 1 ] || usage
PLAN="$1"

if [ ! -f "$PLAN" ]; then
  echo "FAIL: keyframe-plan file not found: $PLAN"
  exit 1
fi
if [ ! -r "$PLAN" ]; then
  echo "FAIL: keyframe-plan file not readable: $PLAN"
  exit 1
fi

# ---------------------------------------------------------------------------
# Pass 1 (awk): structure, section presence, state/scene numbering + arithmetic,
# the continuity chain on every scene, the footer agreement.
# ---------------------------------------------------------------------------
awk '
function err(line, msg) { nerr++; printf("  line %-4d %s\n", line, msg) }
function ferr(msg)      { nerr++; printf("  file      %s\n", msg) }
function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t\r]+$/, "", s); return s }
BEGIN {
  nerr = 0; has_title = 0
  section = "preamble"
  has_style = 0; style_nonempty = 0
  ntokens = 0
  nstates = 0; max_state = -1; state_desc_ok = 1; last_state_idx = -1
  nscenes = 0; last_scene_idx = -1
  has_total = 0; has_audio = 0
  total_scenes = -1; total_ar = ""
}
{
  line = $0; sub(/\r$/, "", line)
  t = trim(line)

  if (line ~ /^# Keyframe Plan:/) { has_title = 1; next }

  # section headings
  if (line ~ /^## /) {
    h = trim(substr(line, 4))
    hn = h; sub(/[ \t]*\(.*$/, "", hn); hn = trim(hn)
    if      (hn == "Style")           { section = "style";  has_style = 1 }
    else if (hn == "Character")       { section = "character" }
    else if (hn == "Keyframe States") { section = "states" }
    else if (hn == "Scenes")          { section = "scenes" }
    else if (hn == "Footer")          { section = "footer" }
    else                              { section = "other" }
    next
  }

  if (t == "") next

  if (section == "style") { style_nonempty = 1; next }

  if (section == "character") {
    if (line ~ /^[ \t]*-[ \t]+/) {
      item = line; sub(/^[ \t]*-[ \t]+/, "", item); item = trim(item)
      cpos = index(item, ":")
      if (cpos == 0) {
        err(NR, "Character token bullet must be \"- <key>: <token>\": \"" item "\"")
      } else {
        v = trim(substr(item, cpos + 1))
        if (v == "") err(NR, "Character token has an empty value: \"" item "\"")
        else ntokens++
      }
    }
    next
  }

  if (section == "states") {
    # a state header:  State N:  ... (the standalone image description follows on
    # the same line and/or wraps onto following lines until the next State/section)
    if (line ~ /^State[ \t]+[0-9]+[ \t]*:/) {
      nstates++
      hd = line; sub(/:.*$/, "", hd); gsub(/[^0-9]/, "", hd)
      idx = hd + 0
      if (nstates == 1) {
        if (idx != 0) err(NR, "first state must be \"State 0:\" (found State " idx ")")
      } else {
        if (idx != last_state_idx + 1)
          err(NR, "states must be contiguous from 0 — expected State " (last_state_idx + 1) " but found State " idx)
      }
      last_state_idx = idx
      if (idx > max_state) max_state = idx
      # description = body after the colon on this line
      cpos = index(line, ":")
      body = trim(substr(line, cpos + 1))
      cur_state_has_desc = (length(body) >= 15) ? 1 : 0
      state_body_line = NR
      next
    }
    # continuation prose for the current state description
    if (nstates > 0) { cur_state_has_desc = 1 }
    next
  }

  if (section == "scenes") {
    if (line ~ /^Scene[ \t]+[0-9]+[ \t]*:/) {
      nscenes++
      hd = line; sub(/:.*$/, "", hd); gsub(/[^0-9]/, "", hd)
      idx = hd + 0
      if (nscenes == 1) {
        if (idx != 1) err(NR, "first scene must be \"Scene 1:\" (found Scene " idx ")")
      } else {
        if (idx != last_scene_idx + 1)
          err(NR, "scenes must be contiguous from 1 — expected Scene " (last_scene_idx + 1) " but found Scene " idx)
      }
      last_scene_idx = idx
      # body after the colon: must declare the chain state (idx-1) -> state idx and a motion line
      cpos = index(line, ":")
      body = trim(substr(line, cpos + 1))
      if (length(body) < 15)
        err(NR, "Scene " idx " is too thin (<15 chars after the colon) — declare \"state " (idx-1) " -> state " idx "\" and a motion/transition line")
      # the continuity chain — accept "state A -> state B" / "state A → state B" / "stateA-stateB"
      low = tolower(body)
      want_a = idx - 1; want_b = idx
      pat = "state[ \t]*" want_a "[ \t]*(->|→|to)[ \t]*state[ \t]*" want_b
      if (low !~ pat)
        err(NR, "Scene " idx " must declare the continuity chain \"state " want_a " -> state " want_b "\" (each state is the END of one scene and the START of the next)")
      next
    }
    next
  }

  # the footer can live under ## Footer OR as a bare "Total:" line anywhere
  if (line ~ /^Total:/) {
    has_total = 1
    low = tolower(line)
    if (low ~ /audio:/) has_audio = 1
    # scene count: number directly before "scene"/"scenes"
    if (match(line, /[0-9]+[ \t]*scenes?/)) {
      k = substr(line, RSTART, RLENGTH); gsub(/[^0-9]/, "", k); total_scenes = k + 0
    } else err(NR, "Total footer must state the scene count as \"Total: K scenes, ...\"")
    if (match(line, /[0-9]+:[0-9]+/)) {
      total_ar = substr(line, RSTART, RLENGTH)
    } else err(NR, "Total footer must state the aspect ratio as \"..., AR\" (e.g. 16:9)")
    next
  }

  # a separate Audio: line (when the footer puts Audio on its own line)
  if (line ~ /^Audio:/) { has_audio = 1; next }
  next
}
END {
  if (!has_title)        ferr("missing \"# Keyframe Plan: <project-name>\" title")
  if (!has_style)        ferr("missing the \"## Style\" global style/look header section")
  else if (!style_nonempty) ferr("\"## Style\" section is empty")

  if (ntokens < 5)
    ferr(sprintf("\"## Character\" must list >= 5 frozen trait tokens (found %d) — face/body/color/eyes/signature", ntokens))

  if (nstates < 2)
    ferr(sprintf("\"## Keyframe States\" must list at least 2 numbered states (found %d)", nstates))

  if (nscenes < 1)
    ferr(sprintf("\"## Scenes\" must list at least 1 numbered scene (found %d)", nscenes))

  # THE core arithmetic: K+1 states for K scenes.
  if (nstates >= 1 && nscenes >= 1 && nstates != nscenes + 1)
    ferr(sprintf("state/scene arithmetic: %d states but %d scenes — there must be exactly K+1 states for K scenes (each scene animates state[i] -> state[i+1])", nstates, nscenes))

  # state indices must run 0..K contiguously => max_state == nstates-1 and == nscenes
  if (nstates >= 1 && max_state != nstates - 1)
    ferr(sprintf("state numbering is not contiguous 0..%d (highest index seen is %d for %d states)", nstates - 1, max_state, nstates))

  if (!has_total) ferr("missing the \"Total: K scenes, ~Ss each, AR\" footer")
  if (!has_audio) ferr("missing the \"Audio:\" line (an ambient bed — Hailuo clips are silent)")

  # footer scene count must equal the number of scenes
  if (total_scenes >= 0 && nscenes > 0 && total_scenes != nscenes)
    ferr(sprintf("Total footer says %d scenes but %d numbered scenes are written", total_scenes, nscenes))

  if (nerr > 0) { printf("FAIL: %d structural error(s) in %s\n", nerr, FILENAME); exit 1 }
  printf("OK-STRUCT: %s — %d states, %d scenes (K+1==states ok), %d tokens, aspect %s\n",
         FILENAME, nstates, nscenes, ntokens, total_ar)
}
' "$PLAN"

# ---------------------------------------------------------------------------
# Pass 2 (python3): the VERBATIM-TOKEN LOCK. The character is self-contained — there is
# no separate bible — so the frozen Character tokens MUST reappear byte-identical inside
# the State descriptions (the states are the only place the character is described). We
# require each token value to appear verbatim at least once across all State descriptions
# combined. Paraphrasing a token per state is the drift vector this skill exists to prevent.
# (A token may legitimately contain an internal comma, so we match whole token values, not
# comma-split pieces.)
# ---------------------------------------------------------------------------
python3 - "$PLAN" <<'PY'
import re, sys

path = sys.argv[1]
with open(path, encoding="utf-8") as fh:
    text = fh.read()

def section_body(name):
    pat = re.compile(r'^##[ \t]+' + re.escape(name) + r'\b[^\n]*\n(.*?)(?=^##[ \t]|\Z)',
                     re.MULTILINE | re.DOTALL)
    m = pat.search(text)
    return m.group(1) if m else ""

def norm(s):
    return re.sub(r'\s+', ' ', s).strip()

# Frozen Character token values, in document order (RHS of each "- <key>: <token>").
tokens = []
for line in section_body("Character").splitlines():
    line = line.strip()
    if not line.startswith("-"):
        continue
    body = line[1:].strip()
    if ":" in body:
        val = norm(body.split(":", 1)[1])
        if val:
            tokens.append(val)

states_blob = norm(section_body("Keyframe States"))

errors = []
if not tokens:
    errors.append("Character section yielded no frozen token values to verify against the states")
elif not states_blob:
    errors.append("Keyframe States section is empty — nowhere to reuse the frozen tokens")
else:
    for val in tokens:
        if norm(val) not in states_blob:
            errors.append('frozen Character token not reused verbatim in any state description: "%s"' % val[:80])

if errors:
    print("FAIL: %d verbatim-token error(s) in %s" % (len(errors), path))
    for e in errors:
        print("  token   " + e)
    sys.exit(1)

print("OK: %s — structure sound and every frozen Character token is reused verbatim across the states" % path)
PY
