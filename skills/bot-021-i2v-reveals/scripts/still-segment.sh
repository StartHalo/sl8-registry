#!/usr/bin/env bash
#
# still-segment.sh — turn ONE listing photo into a Ken-Burns video segment with a
# slow push-in. Pure ffmpeg (deterministic, KEYLESS, no model, no fal cost) — the
# MLS-safe spine: only the virtual camera moves, the real photo's geometry is
# untouched. Output matches assemble-listing.sh's normalize settings (24fps, target
# canvas, H.264, yuv420p, silent) so concat never special-cases it.
#
# Usage:
#   still-segment.sh <photo.(jpg|png)> <duration-seconds 1..15> <out.mp4>
# Env:
#   ASPECT=16:9|9:16|1:1   target canvas (default 16:9 -> 1920x1080)
#   PAD=white|black        pad colour for letterboxing (default black — cinematic)
#   DIR=in|out|left|right  push direction (default in = slow zoom-in)
#
# Prints on success:  still-segment\t<out-path>

set -euo pipefail
err() { printf 'still-segment: %s\n' "$*" >&2; }
command -v ffmpeg >/dev/null 2>&1 || { err "ffmpeg not found (needs sl8-video/animation)"; exit 2; }

[[ $# -eq 3 ]] || { err "usage: still-segment.sh <photo> <duration 1..15> <out.mp4>"; exit 2; }
STILL=$1; DURATION=$2; OUT=$3
[[ -s "$STILL" ]] || { err "photo not found or empty: $STILL"; exit 2; }
[[ "$DURATION" =~ ^[0-9]+$ ]] && (( DURATION >= 1 && DURATION <= 15 )) \
  || { err "duration must be an integer 1..15: $DURATION"; exit 2; }

ASPECT=${ASPECT:-16:9}
case "$ASPECT" in
  16:9) W=1920 H=1080 ;;
  9:16) W=1080 H=1920 ;;
  1:1)  W=1080 H=1080 ;;
  *) err "unsupported ASPECT '$ASPECT' (16:9|9:16|1:1)"; exit 2 ;;
esac
PAD=${PAD:-black}
DIR=${DIR:-in}

FPS=24
FRAMES=$(( FPS * DURATION ))
ZSTEP=$(awk "BEGIN { printf \"%.8f\", 0.05 / $FRAMES }")   # land on ~1.05x at the last frame
mkdir -p "$(dirname "$OUT")"

# zoompan x/y per push direction (slow, single-axis — multi-axis is what melts geometry).
case "$DIR" in
  in)    ZEXPR="z='min(1+${ZSTEP}*on,1.05)'"; XEXPR="x='iw/2-(iw/zoom/2)'"; YEXPR="y='ih/2-(ih/zoom/2)'" ;;
  out)   ZEXPR="z='if(eq(on,0),1.05,max(1.05-${ZSTEP}*on,1.0))'"; XEXPR="x='iw/2-(iw/zoom/2)'"; YEXPR="y='ih/2-(ih/zoom/2)'" ;;
  left)  ZEXPR="z='1.05'"; XEXPR="x='(iw-iw/zoom)*(1-on/${FRAMES})'"; YEXPR="y='ih/2-(ih/zoom/2)'" ;;
  right) ZEXPR="z='1.05'"; XEXPR="x='(iw-iw/zoom)*(on/${FRAMES})'"; YEXPR="y='ih/2-(ih/zoom/2)'" ;;
  *) err "unsupported DIR '$DIR'"; exit 2 ;;
esac

# 1) fit + pad onto the canvas; 2) 2x supersample before zoompan (avoids slow-zoom jitter);
# 3) the single-axis push; 4) yuv420p.
ffmpeg -y -hide_banner -loglevel error -i "$STILL" -vf "\
scale=${W}:${H}:force_original_aspect_ratio=decrease,\
pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${PAD},\
scale=$(( W * 2 )):$(( H * 2 )),\
zoompan=${ZEXPR}:${XEXPR}:${YEXPR}:d=${FRAMES}:s=${W}x${H}:fps=${FPS},\
format=yuv420p" \
  -c:v libx264 -preset medium -crf 20 -r "$FPS" -an -movflags +faststart "$OUT" \
  || { err "ffmpeg failed building the still-segment"; exit 1; }

[[ -s "$OUT" ]] || { err "ffmpeg exited 0 but wrote no output: $OUT"; exit 1; }
err "wrote Ken-Burns segment (${DURATION}s, ${W}x${H}, push=${DIR})"
printf 'still-segment\t%s\n' "$OUT"
