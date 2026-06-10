#!/usr/bin/env bash
#
# still-segment.sh — Ken Burns fallback: turn a beat still into a video segment
# with a slow ~1.05x push-in. Output matches assemble.sh's normalize settings
# (24fps, target canvas, H.264, yuv420p, silent) so concat never special-cases
# it. Used when every i2v model failed for a beat — the episode KEEPS the beat;
# the caller FLAGS it in 05-summary.md.
#
# Usage:
#   still-segment.sh <still.png> <duration-seconds> <out-path.mp4>
# Env:
#   ASPECT=16:9|9:16   target canvas (default 16:9 → 1920x1080)
#
# Prints on success:  still-segment\t<out-path>

set -euo pipefail

err() { printf 'still-segment: %s\n' "$*" >&2; }

command -v ffmpeg >/dev/null 2>&1 \
  || { err "ffmpeg not found (requires the sl8-animation template)"; exit 2; }

if [[ $# -ne 3 ]]; then
  err "usage: still-segment.sh <still.png> <duration-seconds> <out-path.mp4>"
  exit 2
fi

STILL=$1
DURATION=$2
OUT=$3

[[ -s "$STILL" ]] || { err "still not found or empty: $STILL"; exit 2; }
[[ "$DURATION" =~ ^[0-9]+$ ]] && (( DURATION >= 1 && DURATION <= 15 )) \
  || { err "duration must be an integer 1..15 seconds: $DURATION"; exit 2; }

ASPECT=${ASPECT:-16:9}
case "$ASPECT" in
  16:9) W=1920 H=1080 ;;
  9:16) W=1080 H=1920 ;;
  *) err "unsupported ASPECT '$ASPECT' (use 16:9 or 9:16)"; exit 2 ;;
esac

FPS=24
FRAMES=$(( FPS * DURATION ))
# zoom step per output frame so the push lands on ~1.05x at the final frame
ZSTEP=$(awk "BEGIN { printf \"%.8f\", 0.05 / $FRAMES }")

mkdir -p "$(dirname "$OUT")"

# 1) fit + pad the still onto the target canvas (white = the paper look)
# 2) 2x supersample before zoompan — avoids integer-rounding jitter on slow zooms
# 3) linear push-in to ~1.05x over the full duration, centered
ffmpeg -y -hide_banner -loglevel error -i "$STILL" -vf "\
scale=${W}:${H}:force_original_aspect_ratio=decrease,\
pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=white,\
scale=$(( W * 2 )):$(( H * 2 )),\
zoompan=z='min(1+${ZSTEP}*on,1.05)':d=${FRAMES}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},\
format=yuv420p" \
  -c:v libx264 -preset medium -crf 20 -r "$FPS" -an -movflags +faststart "$OUT" \
  || { err "ffmpeg failed building the still-segment"; exit 1; }

[[ -s "$OUT" ]] || { err "ffmpeg exited 0 but wrote no output: $OUT"; exit 1; }

err "wrote still-segment (${DURATION}s, ${W}x${H}) — FLAG this beat as a still-segment fallback in 05-summary.md"
printf 'still-segment\t%s\n' "$OUT"
