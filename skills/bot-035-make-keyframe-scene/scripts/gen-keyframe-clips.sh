#!/usr/bin/env bash
#
# gen-keyframe-clips.sh — render ONE scene of a pinned-keyframe journey with Hailuo 02
# first-last-frame control. This is BOT-035's bot-local RECIPE (Layer 3, one model / one
# recipe). The keyframes themselves are generated UPSTREAM by the shared
# .claude/skills/video-toolkit/scripts/gen-image.sh (the generate stage weaves the frozen TOKENS + style into each
# state's image prompt and chains --ref state[i-1]); this script only runs the per-scene
# Hailuo morph between a pinned START keyframe and a pinned END keyframe.
#
# The mechanic (DIFFERENT from BOT-033 Seedance per-beat i2v and BOT-034 Seedance ref2video):
#   Hailuo 02 image-to-video takes a START image AND an END image and MORPHS start -> end.
#   So EVERY scene boundary is PINNED on BOTH sides. --image uploads the START keyframe (a
#   local png is fine — ai-gen uploads it); end_image_url= MUST be the HOSTED url of the END
#   keyframe (a local path will NOT work — it must be the fal.media url captured from the END
#   keyframe's gen-image.sh run). Hailuo clips are SILENT — the ambient bed is added at
#   assembly (the shared assemble.sh --roomtone always), disclosed as NON-native.
#
# Usage:
#   gen-keyframe-clips.sh <motion-prompt-file> <start-local.png> <end-hosted-url> <duration 6|10> <out.mp4>
#
# Env knobs (all optional):
#   HAILUO_MODEL     i2v slug (default fal-ai/minimax/hailuo-02/standard/image-to-video;
#                    swap /standard/ -> /pro/ for the costlier tier)
#   RESOLUTION       Hailuo resolution token, 512P | 768P (default 768P; Hailuo DOES accept it,
#                    unlike nano-banana-pro on the image side — do not confuse the two)
#   HAILUO_MAX_COST  per-scene credit cap passed to --max-cost (default 200)
#
# On success prints exactly ONE line to stdout:
#   <model-id>\t<out-path>
# Everything else goes to stderr. Non-zero exit = the Hailuo morph failed (after the documented
# retry) → the caller falls back to scripts/still-segment.sh on the two boundary keyframes and
# FLAGS the scene in summary.md. NEVER improvises outside the chain; never fabricates an MP4.

set -euo pipefail

err() { printf 'gen-keyframe-clips: %s\n' "$*" >&2; }

# jq is NOT available in the sandbox — JSON parsing uses python3.
for dep in ai-gen python3; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

# Exit 0 iff $1 is valid JSON with success==true and a non-empty files array.
json_success() {
  python3 -c '
import json, sys
try:
    doc = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(1)
ok = (isinstance(doc, dict) and doc.get("success") is True
      and isinstance(doc.get("files"), list) and len(doc["files"]) > 0)
sys.exit(0 if ok else 1)
' "$1"
}

# Print files[0].local_path from the JSON file $1, or nothing (never a non-zero exit).
# v2.1.0 files[] entries are OBJECTS ({local_path,url,...}); also accept a bare string.
json_first_file() {
  python3 -c '
import json, sys
try:
    doc = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
files = doc.get("files") if isinstance(doc, dict) else None
if not (isinstance(files, list) and files):
    sys.exit(0)
f0 = files[0]
if isinstance(f0, dict):
    p = f0.get("local_path") or ""
    if p: print(p)
elif isinstance(f0, str):
    print(f0)
' "$1"
}

if [[ $# -ne 5 ]]; then
  err "usage: gen-keyframe-clips.sh <motion-prompt-file> <start-local.png> <end-hosted-url> <duration 6|10> <out.mp4>"
  exit 2
fi

PROMPT_FILE=$1
START_LOCAL=$2
END_URL=$3
DURATION=$4
OUT_PATH=$5

HAILUO_MODEL=${HAILUO_MODEL:-fal-ai/minimax/hailuo-02/standard/image-to-video}
RESOLUTION=${RESOLUTION:-768P}
MAX_COST=${HAILUO_MAX_COST:-200}

[[ -s "$PROMPT_FILE" ]] || { err "motion prompt file missing or empty: $PROMPT_FILE"; exit 2; }
# --image START: a local png is uploaded by ai-gen; require it to exist on disk.
[[ -s "$START_LOCAL" ]] || { err "start keyframe (local png) missing or empty: $START_LOCAL"; exit 2; }
# end_image_url MUST be a HOSTED url — a local path will not morph. This is the contract.
case "$END_URL" in
  https://*) : ;;
  *) err "end_image_url must be a HOSTED https url (the END keyframe's fal.media url), got: $END_URL"; exit 2 ;;
esac
case "$DURATION" in
  6|10) : ;;
  *) err "duration must be 6 or 10 (Hailuo takes those reliably): $DURATION"; exit 2 ;;
esac
case "$RESOLUTION" in
  512P|768P) : ;;
  *) err "RESOLUTION must be 512P or 768P (got '$RESOLUTION')"; exit 2 ;;
esac

PROMPT=$(<"$PROMPT_FILE")

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT
mkdir -p "$(dirname "$OUT_PATH")"

# One Hailuo attempt. $1 = yes|no (pass duration= through).
# --image = START (uploaded); end_image_url= = HOSTED url of the END keyframe (params
# pass-through, NOT a --flag). Leaves result.json + attempt.log in $WORKDIR.
attempt() {
  local pass_duration=$1 rc=0
  local args=(video "$PROMPT" -m "$HAILUO_MODEL" --image "$START_LOCAL" "end_image_url=${END_URL}")
  args+=(--resolution "$RESOLUTION" --max-cost "$MAX_COST" -o "$WORKDIR" --format json --timeout 900000)
  [[ "$pass_duration" == yes ]] && args+=("duration=${DURATION}")
  : >"$WORKDIR/result.json"
  : >"$WORKDIR/attempt.log"
  ai-gen "${args[@]}" >"$WORKDIR/result.json" 2>"$WORKDIR/attempt.log" || rc=$?
  if [[ $rc -ne 0 ]]; then
    cat "$WORKDIR/result.json" >>"$WORKDIR/attempt.log" 2>/dev/null || true
    return 1
  fi
  json_success "$WORKDIR/result.json"
}

# Move the generated clip to its stable name and print the contract line.
deliver() {
  local file
  file=$(json_first_file "$WORKDIR/result.json")
  if [[ -z "$file" || ! -s "$file" ]]; then
    err "$HAILUO_MODEL: success reported but no clip on disk — treating as failure"
    return 1
  fi
  mv "$file" "$OUT_PATH"
  printf '%s\t%s\n' "$HAILUO_MODEL" "$OUT_PATH"
  exit 0
}

failure_mentions() {
  grep -qiE "$1" "$WORKDIR/attempt.log" "$WORKDIR/result.json" 2>/dev/null
}

err "morphing START=$START_LOCAL -> END(url)=${END_URL:0:60}... (${RESOLUTION}/${DURATION}s, max-cost ${MAX_COST}cr, timeout 900s)"
if attempt yes; then
  deliver || true
elif failure_mentions 'timed? ?out|timeout|ETIMEDOUT'; then
  err "$HAILUO_MODEL: timed out — queue congestion is transient, retrying once"
  if attempt yes; then deliver || true; fi
elif failure_mentions 'duration|unprocessable|invalid|validation|end_image'; then
  err "$HAILUO_MODEL: rejected a param — retrying WITHOUT the duration pass-through"
  err "  (clip will run at the model default length — disclose this in summary.md)"
  if attempt no; then deliver || true; fi
fi

err "Hailuo first-last morph failed for this scene (model: $HAILUO_MODEL)"
err "fall back to scripts/still-segment.sh on the two boundary keyframes and FLAG the scene in summary.md"
exit 1
