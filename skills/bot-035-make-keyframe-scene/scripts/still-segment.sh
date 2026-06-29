#!/usr/bin/env bash
#
# still-segment.sh — Hailuo first-last fallback: build a "morph stand-in" segment from the
# two PINNED boundary keyframes when a scene's Hailuo morph fails (or one boundary keyframe
# is missing). The journey stays K scenes long; the caller FLAGS the scene in summary.md.
#
#   - both keyframes present → hold START, then xfade (1s) to END across the duration.
#   - only one keyframe present → hold that single still for the full duration.
#   - neither present → exit non-zero (caller drops the scene, recorded).
#
# Output matches the shared video-toolkit assemble.sh normalize layout (24fps, the aspect
# canvas, black pad, H.264, yuv420p, SILENT) so concat never special-cases it. Hailuo clips
# are silent anyway — assemble.sh adds the room-tone bed for the whole episode.
#
# Usage:
#   still-segment.sh <start.png|""> <end.png|""> <duration-seconds> <out.mp4>
# Env:
#   ASPECT=16:9|9:16|1:1   target canvas (default 16:9)
#
# Prints on success:  still-segment\t<out-path>

set -euo pipefail

err() { printf 'still-segment: %s\n' "$*" >&2; }

command -v ffmpeg >/dev/null 2>&1 \
  || { err "ffmpeg not found (requires the sl8-video template)"; exit 2; }

if [[ $# -ne 4 ]]; then
  err "usage: still-segment.sh <start.png|\"\"> <end.png|\"\"> <duration-seconds> <out.mp4>"
  exit 2
fi

A=$1
B=$2
DURATION=$3
OUT=$4

[[ "$DURATION" =~ ^[0-9]+$ ]] && (( DURATION >= 1 && DURATION <= 15 )) \
  || { err "duration must be an integer 1..15 seconds: $DURATION"; exit 2; }

ASPECT=${ASPECT:-16:9}
case "$ASPECT" in
  16:9) W=1280 H=720 ;;
  9:16) W=720  H=1280 ;;
  1:1)  W=720  H=720 ;;
  *) err "unsupported ASPECT '$ASPECT' (use 16:9 | 9:16 | 1:1)"; exit 2 ;;
esac

mkdir -p "$(dirname "$OUT")"

# Uniform normalize filter (mirrors assemble.sh): fit + black-pad + setsar + yuv420p.
VF="scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p"

# Case 1: both keyframes present → hold A, xfade to B.
if [[ -n "$A" && -f "$A" && -n "$B" && -f "$B" ]]; then
  HALF=$(awk "BEGIN{printf \"%.2f\", $DURATION/2}")
  if ffmpeg -y -hide_banner -loglevel error \
      -loop 1 -t "$DURATION" -i "$A" -loop 1 -t "$DURATION" -i "$B" \
      -filter_complex "[0:v]${VF}[va];[1:v]${VF}[vb];[va][vb]xfade=transition=fade:duration=1:offset=${HALF}[v]" \
      -map "[v]" -t "$DURATION" -r 24 -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
      -an -movflags +faststart "$OUT" 2>/dev/null; then
    [[ -s "$OUT" ]] || { err "ffmpeg exited 0 but wrote no output: $OUT"; exit 1; }
    err "wrote two-keyframe morph stand-in (${DURATION}s, ${W}x${H}) — FLAG this scene as a still-segment fallback in summary.md"
    printf 'still-segment\t%s\n' "$OUT"
    exit 0
  fi
  err "two-keyframe xfade failed — trying a single-still hold"
fi

# Case 2: only one keyframe present → hold the single available still.
SINGLE=""
[[ -n "$A" && -f "$A" ]] && SINGLE="$A"
[[ -z "$SINGLE" && -n "$B" && -f "$B" ]] && SINGLE="$B"
[[ -n "$SINGLE" ]] || { err "no keyframe at either boundary — scene cannot be held; dropping (recorded)"; exit 1; }

ffmpeg -y -hide_banner -loglevel error -loop 1 -t "$DURATION" -i "$SINGLE" \
  -filter_complex "[0:v]${VF}[v]" -map "[v]" -t "$DURATION" -r 24 \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -an -movflags +faststart "$OUT" 2>/dev/null \
  || { err "ffmpeg failed building the single-still hold"; exit 1; }

[[ -s "$OUT" ]] || { err "ffmpeg exited 0 but wrote no output: $OUT"; exit 1; }

err "wrote single-still hold (${DURATION}s, ${W}x${H}) — FLAG this scene as a still-segment fallback in summary.md"
printf 'still-segment\t%s\n' "$OUT"
