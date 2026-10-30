#!/usr/bin/env bash
# scrub_encode.sh: encodes clips for scroll scrubbing (web-marketing-site, SL8-authored).
#
#   scrub_encode.sh desktop <raw.mp4> <out.mp4>      height min(1080, source) even width, H.264 yuv420p, CRF 20, keyframe every 8 frames, no scene-cut keys, luma sharpen 0.8, no audio, faststart
#   scrub_encode.sh mobile  <raw.mp4> <out.mp4>      height min(720, source), even width, CRF 23, keyframe every 4 frames, sharpen 0.6, no audio, faststart
#   scrub_encode.sh poster  <encoded.mp4> <out.png>  frame 1 of the ENCODED clip (run it after encoding)
#   scrub_encode.sh bounds  <clip.mp4> <prefix>      <prefix>-first.png and <prefix>-last.png (the last decoded frame, read with -sseof, no buffering)
#
# Exit: 0 written; 2 usage or missing input; 127 ffmpeg missing; anything else is ffmpeg's own code.
# CRF can be raised for a byte budget with SCRUB_CRF_DESKTOP / SCRUB_CRF_MOBILE (defaults 20 / 23).
set -euo pipefail

usage () { sed -n '4,7p' "$0" | sed 's/^# //' >&2; exit 2; }
[ "$#" -eq 3 ] || usage
command -v ffmpeg >/dev/null 2>&1 || { echo "scrub_encode: ffmpeg not found on this machine" >&2; exit 127; }
mode=$1; src=$2; dst=$3
[ -f "$src" ] || { echo "scrub_encode: input not found: $src" >&2; exit 2; }
mkdir -p "$(dirname "$dst")"
crf_d=${SCRUB_CRF_DESKTOP:-20}
crf_m=${SCRUB_CRF_MOBILE:-23}

case "$mode" in
  desktop)
    ffmpeg -hide_banner -v error -y -i "$src" -an \
      -vf "scale=-2:'min(1080,ih)',unsharp=5:5:0.8" \
      -c:v libx264 -preset slow -pix_fmt yuv420p -crf "$crf_d" \
      -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart "$dst"
    ;;
  mobile)
    ffmpeg -hide_banner -v error -y -i "$src" -an \
      -vf "scale=-2:'min(720,ih)',unsharp=5:5:0.6" \
      -c:v libx264 -preset slow -pix_fmt yuv420p -crf "$crf_m" \
      -g 4 -keyint_min 4 -sc_threshold 0 -movflags +faststart "$dst"
    ;;
  poster)
    ffmpeg -hide_banner -v error -y -ss 0 -i "$src" -frames:v 1 -update 1 "$dst"
    ;;
  bounds)
    ffmpeg -hide_banner -v error -y -i "$src" -frames:v 1 -update 1 "${dst}-first.png"
    ffmpeg -hide_banner -v error -y -sseof -0.2 -i "$src" -update 1 "${dst}-last.png"
    ;;
  *)
    usage
    ;;
esac
echo "scrub_encode: $mode -> $dst"
