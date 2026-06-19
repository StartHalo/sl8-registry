#!/usr/bin/env bash
# run.sh — hf-studio's thin deterministic driver: scaffold -> validate -> render.
#
#   bash "$SKILL/scripts/run.sh" <project-artifacts-dir> <name> "<ARs>" [quality] [verify-at-csv] [--force]
#   e.g. bash run.sh artifacts/api-teaser api-teaser "16:9 9:16" draft "2,9,15"
#
# This is a CONVENIENCE CHAIN over three sibling skills' scripts — it does NOT author the concept,
# script, storyboard, voiceover or the scene HTML (those are reasoning phases you do by reading each
# hf-* skill). It only chains the deterministic spine so the paths/cwd are never fat-fingered:
#
#   1. hf-build/scripts/init.sh   -> scaffold <project>/composition/ from the bundled template (if absent)
#   2. hf-validate/scripts/validate.sh -> STRICT lint gate (0 errors) + snapshot key frames
#   3. hf-render/scripts/render.sh    -> render one MP4 per AR + ffprobe-verify + extract frames
#
# It STOPS before render if the composition is unscaffolded/un-authored or validate BLOCKS — you must
# author the scenes (phase 5) and reach 0 lint errors first. Local + keyless; no HeyGen cloud.
set -uo pipefail

PROJ="${1:?usage: run.sh <project-artifacts-dir> <name> \"<ARs>\" [quality] [verify-at-csv] [--force]}"
NAME="${2:?missing output name (the MP4 stem)}"
ARS="${3:-16:9}"
QUALITY="${4:-draft}"
VERIFY_AT="${5:-2,9,15}"
FORCE="${6:-}"

COMP="$PROJ/composition"
EXPORTS="$PROJ/exports"

# Resolve the sibling skills relative to THIS skill's parent (the skills/ dir). Works whether installed
# at .claude/skills/<name>/ (sandbox) or in the repo's bot/skills/<name>/ (host) — both have hf-build,
# hf-validate, hf-render as siblings of hf-studio.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # .../hf-studio/scripts
SKILLS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"                # .../skills
HF_BUILD="$SKILLS_DIR/hf-build"
HF_VALIDATE="$SKILLS_DIR/hf-validate"
HF_RENDER="$SKILLS_DIR/hf-render"

for s in "$HF_BUILD/scripts/init.sh" "$HF_VALIDATE/scripts/validate.sh" "$HF_RENDER/scripts/render.sh"; do
  if [ ! -f "$s" ]; then
    echo "!! sibling skill script missing: $s" >&2
    echo "   hf-studio expects hf-build, hf-validate, hf-render alongside it under $SKILLS_DIR." >&2
    exit 1
  fi
done

mkdir -p "$PROJ"

# ---- 1. Scaffold (only if the composition isn't there yet) ----
if [ ! -f "$COMP/index.html" ]; then
  echo ">> [1/3] no composition yet — scaffolding $COMP from the bundled hf-template"
  bash "$HF_BUILD/scripts/init.sh" "$COMP" ${FORCE:+"$FORCE"}
  echo
  echo "!! STOP: the scaffold is the lint-clean EXAMPLE, not your video."
  echo "   Author the scenes into $COMP/index.html per $PROJ/03-storyboard.md + $PROJ/04-timing.json"
  echo "   (theme to $PROJ/01-concept.md), reach 0 lint errors, then re-run run.sh to validate + render."
  exit 3
fi
echo ">> [1/3] composition present at $COMP — proceeding to validate."

# ---- 2. Validate (strict lint gate + snapshot) ----
echo ">> [2/3] validating (strict lint gate + snapshot)"
if ! bash "$HF_VALIDATE/scripts/validate.sh" "$COMP" "$PROJ" "$VERIFY_AT"; then
  echo "!! validate BLOCKED (lint errors or no frames). See $PROJ/05-validation.md." >&2
  echo "   Fix the composition in hf-build (phase 5), then re-run run.sh. NOT rendering." >&2
  exit 2
fi
echo ">> validate PASSED."

# ---- 3. Render (run from inside the composition dir; '.' = the project) ----
echo ">> [3/3] rendering: ARs=\"$ARS\" quality=$QUALITY name=$NAME"
( cd "$COMP" && bash "$HF_RENDER/scripts/render.sh" . "../exports" "$NAME" "$ARS" "$QUALITY" "$VERIFY_AT" )
RENDER_RC=$?

echo
if [ "$RENDER_RC" -eq 0 ]; then
  echo ">> DONE: MP4(s) in $EXPORTS, frames in $EXPORTS/frames/."
  echo "   NEXT (hf-studio, you): VISION-GRADE the frames (legible? on-brand? composed? varied motion?),"
  echo "   then write $PROJ/06-summary.md with the resolved params + your verdict + any fallback."
else
  echo "!! one or more renders FAILED verification (rc=$RENDER_RC). See the render log above." >&2
  echo "   A different-orientation AR is a re-author in hf-build (phase 5), not a render flag." >&2
fi
exit "$RENDER_RC"
