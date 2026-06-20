#!/usr/bin/env bash
#
# title-card.sh — render a branded intro/outro card (address / price / beds-baths /
# agent + CTA) as a silent video segment matching the slideshow canvas. Pure ffmpeg
# drawtext (deterministic, KEYLESS). Lines are stacked, centered; line 1 is the
# largest (title), the rest step down. Up to 5 lines.
#
# Usage:
#   title-card.sh <out.mp4> "<line1>" ["<line2>" ... up to 5]
# Env:
#   ASPECT=16:9|9:16|1:1   (default 16:9)
#   DURATION=<secs>        card length (default 2)
#   BG=<hex>               background (default 0x101418 — deep slate)
#   FG=<hex>               text colour (default white)
#   ACCENT=<hex>           line-1 (title) colour (default 0xC9A34E — warm gold)
#
# Prints on success:  title-card\t<out-path>

set -euo pipefail
err() { printf 'title-card: %s\n' "$*" >&2; }
command -v ffmpeg >/dev/null 2>&1 || { err "ffmpeg not found"; exit 2; }

[[ $# -ge 2 ]] || { err 'usage: title-card.sh <out.mp4> "<line1>" ["<line2>"...]'; exit 2; }
OUT=$1; shift
LINES=("$@")
(( ${#LINES[@]} <= 5 )) || { err "max 5 lines"; exit 2; }

ASPECT=${ASPECT:-16:9}
case "$ASPECT" in
  16:9) W=1920 H=1080 ;;
  9:16) W=1080 H=1920 ;;
  1:1)  W=1080 H=1080 ;;
  *) err "unsupported ASPECT '$ASPECT'"; exit 2 ;;
esac
DURATION=${DURATION:-2}
BG=${BG:-0x101418}
FG=${FG:-white}
ACCENT=${ACCENT:-0xC9A34E}
FPS=24

FONTFILE=""
for f in /System/Library/Fonts/Supplemental/Arial.ttf /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf \
         /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf \
         /usr/share/fonts/dejavu/DejaVuSans.ttf /usr/share/fonts/TTF/DejaVuSans.ttf; do
  [[ -f "$f" ]] && { FONTFILE=$f; break; }
done
[[ -n "$FONTFILE" ]] || { err "no DejaVu font found — cannot render the card"; exit 3; }

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
SHORT=$(( W < H ? W : H ))
N=${#LINES[@]}
# vertical layout: total block centered; line sizes step down from the title.
declare -a SIZES
SIZES[0]=$(( SHORT / 14 ))   # title
for ((i=1;i<N;i++)); do SIZES[$i]=$(( SHORT / 22 )); done
# total block height (approx) to center
BLOCK=0; for ((i=0;i<N;i++)); do BLOCK=$(( BLOCK + SIZES[i] + 24 )); done
Y0=$(( (H - BLOCK) / 2 ))

FILTER=""
ACC=$Y0
for ((i=0;i<N;i++)); do
  printf '%s' "${LINES[$i]}" >"$TMP/l$i.txt"
  COLOR=$FG; (( i == 0 )) && COLOR=$ACCENT
  [[ -n "$FILTER" ]] && FILTER+=","
  FILTER+="drawtext=textfile=${TMP}/l$i.txt:fontfile=${FONTFILE}:fontcolor=${COLOR}:fontsize=${SIZES[$i]}:x=(w-text_w)/2:y=${ACC}"
  ACC=$(( ACC + SIZES[i] + 24 ))
done
FILTER+=",format=yuv420p"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=${BG}:s=${W}x${H}:d=${DURATION}:r=${FPS}" \
  -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
  -vf "$FILTER" -map 0:v -map 1:a \
  -c:v libx264 -preset medium -crf 20 -c:a aac -shortest -movflags +faststart "$OUT" \
  || { err "ffmpeg failed rendering the title card"; exit 1; }

[[ -s "$OUT" ]] || { err "no output written"; exit 1; }
err "wrote title card (${DURATION}s, ${W}x${H}, ${N} lines)"
printf 'title-card\t%s\n' "$OUT"
