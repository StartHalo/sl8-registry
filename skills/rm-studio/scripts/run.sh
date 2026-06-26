#!/usr/bin/env bash
# run.sh — rm-studio's thin deterministic driver: scaffold -> validate -> render -> preview.
#
#   bash "$SKILL/scripts/run.sh" <project-artifacts-dir> <name> "<ARs>" [quality] [verify-at-seconds-csv] [--force]
#   e.g. bash run.sh artifacts/api-teaser api-teaser "16:9 9:16" draft "2,5,9"
#
# This is a CONVENIENCE CHAIN over the sibling render-core skills' scripts — it does NOT author the
# concept, script, storyboard, voiceover or the React (those are reasoning phases you do by reading each
# rm-* skill). It only chains the deterministic spine so the paths/cwd are never fat-fingered:
#
#   1. rm-build/scripts/init.sh       -> scaffold <project>/remotion-project/ from the bundled starter (if absent)
#   2. rm-validate/scripts/validate.sh -> STRICT gate (one @remotion/* version + tsc + contract-lint + stills)
#   3. rm-render/scripts/render.sh    -> render one MP4 per AR (keyless/local) + ffprobe-verify + extract frames
#   4. rm-preview/scripts/preview.sh  -> best-effort @remotion/player preview.html (Remotion-unique; non-gating)
#
# It STOPS before render if the project is unscaffolded/un-authored or validate BLOCKS — you must author
# the React (phase 5) and PASS the gate first. Render is KEYLESS + LOCAL (Remotion -> Chrome Headless Shell
# + FFmpeg); no cloud, no Lambda, no auth. Bash 3.2 compatible (no `timeout`, no GNU-only flags).
set -uo pipefail

PROJ="${1:?usage: run.sh <project-artifacts-dir> <name> \"<ARs>\" [quality] [verify-at-seconds-csv] [--force]}"
NAME="${2:?missing output name (the MP4 stem)}"
ARS="${3:-16:9}"
QUALITY="${4:-draft}"
VERIFY_AT="${5:-2,5,9}"
FORCE="${6:-}"

COMP="$PROJ/remotion-project"     # the per-project Remotion app (NOT BOT-015's composition/)
EXPORTS="$PROJ/exports"

# Resolve the sibling skills relative to THIS skill's parent (the skills/ dir). Works whether installed at
# .claude/skills/<name>/ (sandbox) or in the repo's bot/skills/<name>/ (host) — both have rm-build,
# rm-validate, rm-render (+ rm-preview) as siblings of rm-studio.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # .../rm-studio/scripts
SKILLS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"                # .../skills
RM_BUILD="$SKILLS_DIR/rm-build"
RM_VALIDATE="$SKILLS_DIR/rm-validate"
RM_RENDER="$SKILLS_DIR/rm-render"
RM_PREVIEW="$SKILLS_DIR/rm-preview"

# The three render-core scripts are REQUIRED; rm-preview is optional (best-effort).
for s in "$RM_BUILD/scripts/init.sh" "$RM_VALIDATE/scripts/validate.sh" "$RM_RENDER/scripts/render.sh"; do
  if [ ! -f "$s" ]; then
    echo "!! sibling skill script missing: $s" >&2
    echo "   rm-studio expects rm-build, rm-validate, rm-render alongside it under $SKILLS_DIR." >&2
    exit 1
  fi
done

mkdir -p "$PROJ"

# ---- 1. Scaffold (only if the Remotion app isn't there yet) ----
if [ ! -f "$COMP/package.json" ]; then
  echo ">> [1/4] no Remotion app yet — scaffolding $COMP from the bundled rm-template (init.sh)"
  if [ -n "$FORCE" ]; then
    bash "$RM_BUILD/scripts/init.sh" "$COMP" "$FORCE"
  else
    bash "$RM_BUILD/scripts/init.sh" "$COMP"
  fi
  echo
  echo "!! STOP: the scaffold is the lint-clean EXAMPLE (StudioVideo), not your video."
  echo "   Author fresh React into $COMP/src per $PROJ/03-storyboard.md + $PROJ/04-timing.json"
  echo "   (theme to $PROJ/01-concept.md, write props.json) against the composition contract, PASS rm-validate,"
  echo "   then re-run run.sh to validate + render."
  exit 3
fi
echo ">> [1/4] Remotion app present at $COMP — proceeding to validate."

# ---- 2. Validate (strict gate: one @remotion/* version + tsc + contract-lint + stills) ----
echo ">> [2/4] validating (version-skew -> tsc --noEmit -> contract-lint -> still-render)"
if ! bash "$RM_VALIDATE/scripts/validate.sh" "$COMP" "$PROJ" "$VERIFY_AT"; then
  echo "!! validate BLOCKED (version skew, tsc error, forbidden pattern, or blank still)." >&2
  echo "   See $PROJ/05-validation.md. Fix the composition in rm-build (phase 5), then re-run. NOT rendering." >&2
  exit 2
fi
echo ">> validate PASSED."

# ---- 3. Render (run from inside the app dir; '.' = the project; reads props.json) ----
echo ">> [3/4] rendering (keyless/local): ARs=\"$ARS\" quality=$QUALITY name=$NAME"
( cd "$COMP" && bash "$RM_RENDER/scripts/render.sh" . "../exports" "$NAME" "$ARS" "$QUALITY" "$VERIFY_AT" )
RENDER_RC=$?

if [ "$RENDER_RC" -ne 0 ]; then
  echo >&2
  echo "!! one or more renders FAILED verification (rc=$RENDER_RC). See the render log above." >&2
  echo "   A different-orientation AR is a re-author in rm-build (phase 5), not a render flag." >&2
  echo "   Exit-137 = OOM on the ~1.9GB template; rm-render already pins --concurrency=1." >&2
  exit "$RENDER_RC"
fi

# ---- 4. Preview (best-effort @remotion/player preview.html; never fails the run) ----
if [ -f "$RM_PREVIEW/scripts/preview.sh" ]; then
  echo ">> [4/4] generating live preview (rm-preview, best-effort)"
  bash "$RM_PREVIEW/scripts/preview.sh" "$COMP" "$PROJ" || \
    echo "   (preview.html generation reported an issue — non-fatal; the MP4s are the deliverable)"
else
  echo ">> [4/4] rm-preview not present — skipping preview.html (optional, non-gating)."
fi

echo
echo ">> DONE: MP4(s) in $EXPORTS, frames in $EXPORTS/frames/, preview at $PROJ/preview.html (if generated)."
echo "   NEXT (rm-studio, you): VISION-GRADE the frames (legible? on-brand? composed? varied motion?),"
echo "   then write $PROJ/06-summary.md with the resolved params + your verdict + any fallback."
exit 0
