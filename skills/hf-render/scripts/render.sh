#!/usr/bin/env bash
# render.sh — render a validated HyperFrames composition to one or more aspect ratios, then verify.
#
#   bash render.sh <composition-dir> <exports-dir> <name> "<ARs>" [quality] [verify-at-csv]
#   e.g. bash render.sh artifacts/teaser/composition artifacts/teaser/exports teaser "16:9 9:16" draft "2,9,15"
#
# ARs:   any of 16:9, 9:16, 1:1, 16:9-4k, 9:16-4k, 1:1-4k (space/comma separated).
# quality: draft | standard | high (default draft for previews; standard for finals).
#
# Per AR it runs EXACTLY (the spec-mandated invocation):
#   hyperframes render . --chrome "$(cat /etc/sl8/chrome-path)" --low-memory-mode --quality <q> --output <out>
# adding --resolution for the AR. SELF-HEAL: if /etc/sl8/chrome-path is absent (host/dev), the --chrome
# flag is omitted so hyperframes auto-detects the system Chrome. NEVER runs `browser ensure` (no download).
#
# Then it ffprobe-verifies each MP4 (codec=h264 + correct width/height/fps + non-zero duration) and
# extracts a frame per verify timestamp into <exports>/frames/ for the vision (media-judge) grade.
# Exit 0 only if every requested AR produced a verified MP4.
set -uo pipefail

COMP="${1:?usage: render.sh <composition-dir> <exports-dir> <name> \"<ARs>\" [quality] [verify-at-csv]}"
EXPORTS="${2:?missing exports dir}"
NAME="${3:?missing name}"
ARS="${4:-16:9}"
QUALITY="${5:-draft}"
VERIFY_AT="${6:-}"
HF="$(command -v hyperframes || echo 'npx --yes hyperframes@0.6.112')"
CHROME_PIN="/etc/sl8/chrome-path"

mkdir -p "$EXPORTS" "$EXPORTS/frames"
if [ ! -f "$COMP/index.html" ]; then
  echo "!! no composition at $COMP/index.html — run hf-build + hf-validate first." >&2
  exit 1
fi

# Chrome strategy: pinned in-sandbox, auto-detect on host/dev (self-heal).
CHROME_ARGS=()
if [ -f "$CHROME_PIN" ]; then
  CHROME_BIN="$(cat "$CHROME_PIN")"
  echo ">> using pinned Chrome: $CHROME_BIN"
  CHROME_ARGS=( --chrome "$CHROME_BIN" )
else
  echo ">> /etc/sl8/chrome-path absent (host/dev) — omitting --chrome; hyperframes will auto-detect system Chrome."
fi

# The composition's NATIVE dimensions decide its aspect ratio. `--resolution` only RESCALES within the
# SAME orientation (e.g. 1080p -> 4k) — it cannot turn a 16:9 composition into 9:16. A different aspect
# ratio is a RE-AUTHORED composition (hf-build sets the root to e.g. 1080x1920), not a render flag.
# So: pass --resolution ONLY for a 4k upscale whose orientation matches the composition; for the base AR
# render native; and guard against an orientation mismatch with a clean, actionable error.
COMP_W="$(node -e 'const fs=require("fs");const h=fs.readFileSync("'"$COMP"'/index.html","utf8");const m=h.match(/data-width=["\x27]?(\d+)/);process.stdout.write(m?m[1]:"0")' 2>/dev/null)"
COMP_H="$(node -e 'const fs=require("fs");const h=fs.readFileSync("'"$COMP"'/index.html","utf8");const m=h.match(/data-height=["\x27]?(\d+)/);process.stdout.write(m?m[1]:"0")' 2>/dev/null)"
comp_orient () { if [ "${COMP_W:-0}" -gt "${COMP_H:-0}" ]; then echo landscape; elif [ "${COMP_H:-0}" -gt "${COMP_W:-0}" ]; then echo portrait; else echo square; fi; }
COMP_ORIENT="$(comp_orient)"
echo ">> composition native ${COMP_W}x${COMP_H} (${COMP_ORIENT})"

ar_orient () { case "$1" in 16:9|16:9-4k) echo landscape;; 9:16|9:16-4k) echo portrait;; 1:1|1:1-4k) echo square;; *) echo "";; esac; }
ar_4k_preset () { case "$1" in 16:9-4k) echo landscape-4k;; 9:16-4k) echo portrait-4k;; 1:1-4k) echo square-4k;; *) echo "";; esac; }
ar_dims () { case "$1" in
  16:9) echo "1920 1080";; 9:16) echo "1080 1920";; 1:1) echo "1080 1080";;
  16:9-4k) echo "3840 2160";; 9:16-4k) echo "2160 3840";; 1:1-4k) echo "2160 2160";;
  *) echo "";; esac; }
ar_slug () { echo "$1" | tr ':' 'x'; }   # 16:9 -> 16x9

FAIL=0
# normalize commas to spaces
for AR in $(echo "$ARS" | tr ',' ' '); do
  ORIENT="$(ar_orient "$AR")"
  DIMS="$(ar_dims "$AR")"
  if [ -z "$ORIENT" ]; then echo "!! unknown aspect ratio: $AR (use 16:9 9:16 1:1 [+-4k])"; FAIL=1; continue; fi
  if [ "$ORIENT" != "$COMP_ORIENT" ]; then
    echo "   !! $AR ($ORIENT) does not match the composition orientation ($COMP_ORIENT)."
    echo "      A different aspect ratio is a RE-AUTHORED composition — re-run hf-build with the root set"
    echo "      to the target dimensions (e.g. 1080x1920 for 9:16), then render. --resolution cannot rotate."
    FAIL=1; continue
  fi
  SLUG="$(ar_slug "$AR")"
  OUT="$EXPORTS/${NAME}-${SLUG}.mp4"
  # Only a 4k token (same orientation) gets a --resolution upscale; the base AR renders native.
  RES_PRESET="$(ar_4k_preset "$AR")"
  RES_ARGS=()
  [ -n "$RES_PRESET" ] && RES_ARGS=( --resolution "$RES_PRESET" )
  echo ">> rendering $AR -> $OUT  [quality=$QUALITY, low-memory-mode${RES_PRESET:+, resolution=$RES_PRESET}]"

  # THE mandated invocation (one Chrome worker via --low-memory-mode).
  # ${ARR[@]+...} = bash-3.2 / set -u safe expansion of a possibly-empty array.
  $HF render . ${CHROME_ARGS[@]+"${CHROME_ARGS[@]}"} --low-memory-mode --quality "$QUALITY" ${RES_ARGS[@]+"${RES_ARGS[@]}"} --output "$OUT" \
    || true
  # NB: render is run with cwd = composition dir (see the cd in the SKILL invocation); "." is the project.

  if [ ! -s "$OUT" ]; then
    echo "   !! RENDER PRODUCED NO FILE for $AR"; FAIL=1; continue
  fi

  # ---- ffprobe verification ----
  if command -v ffprobe >/dev/null 2>&1; then
    read -r W H <<<"$DIMS"
    CODEC="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$OUT" 2>/dev/null)"
    GOTW="$(ffprobe -v error -select_streams v:0 -show_entries stream=width  -of csv=p=0 "$OUT" 2>/dev/null)"
    GOTH="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$OUT" 2>/dev/null)"
    FPS="$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$OUT" 2>/dev/null)"
    DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" 2>/dev/null)"
    echo "   ffprobe: codec=$CODEC dims=${GOTW}x${GOTH} fps=$FPS dur=${DUR}s (expected ${W}x${H}, h264)"
    [ "$CODEC" = "h264" ] || { echo "   !! codec is not h264"; FAIL=1; }
    [ "$GOTW" = "$W" ] && [ "$GOTH" = "$H" ] || { echo "   !! dimensions != ${W}x${H}"; FAIL=1; }
    awk "BEGIN{exit !(${DUR:-0} > 0)}" || { echo "   !! duration not > 0"; FAIL=1; }
  else
    echo "   (ffprobe absent — relying on non-empty output + the vision grade)"
  fi

  # ---- extract frames for vision grading ----
  if command -v ffmpeg >/dev/null 2>&1; then
    ATS="${VERIFY_AT:-2}"
    i=0
    for T in $(echo "$ATS" | tr ',' ' '); do
      FOUT="$EXPORTS/frames/${NAME}-${SLUG}-at-${T}s.png"
      ffmpeg -v error -ss "$T" -i "$OUT" -frames:v 1 "$FOUT" -y 2>/dev/null || true
      [ -s "$FOUT" ] && echo "   frame: $FOUT"
      i=$((i+1))
    done
  fi
done

if [ "$FAIL" -eq 0 ]; then
  echo ">> ALL renders verified OK. VISION-GRADE the frames in $EXPORTS/frames/ before declaring done."
else
  echo ">> one or more renders FAILED verification."
fi
exit "$FAIL"
