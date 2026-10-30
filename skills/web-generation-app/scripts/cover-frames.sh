#!/usr/bin/env bash
# Frames for reviewing a cover reveal (WF51-a1 step 24). SL8-written.
# Usage: bash cover-frames.sh <cover_anim.mp4> <approved cover png> <out dir>
# Writes last.png (0.1 s before the end), mid_25.png, mid_50.png, mid_75.png (a quarter, half and
# three quarters of the measured duration, so a 4 s and a 15 s clip are both sampled across their
# length), a 4 fps contact sheet of the middle seconds (sheet.png, one row per second, so the weakest
# one-second window can be judged rather than an average), side.png (approved cover beside the last
# frame) and probe.json. It prints the clip's and the cover's size and ratio side by side and exits 1
# when the ratios differ by more than 1 % (the "last frame equals the cover" claim cannot hold then),
# or on a missing tool or file. It measures; it never judges (HR14).
set -eu
VID="${1:?usage: cover-frames.sh <video> <cover> <out dir>}"; COVER="${2:?cover png}"; OUT="${3:?out dir}"
for t in ffmpeg ffprobe montage; do command -v "$t" >/dev/null || { echo "cover-frames: $t missing (HR21)"; exit 1; }; done
[ -f "$VID" ] && [ -f "$COVER" ] || { echo "cover-frames: missing input"; exit 1; }
mkdir -p "$OUT/sheet"
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of json "$VID" > "$OUT/probe.json"
DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VID")"
dims () { ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$1"; }
VD="$(dims "$VID")"; CD="$(dims "$COVER")"
RATIO_OK="$(awk -v a="$VD" -v b="$CD" 'BEGIN{split(a,x,"x");split(b,y,"x"); r=(x[1]/x[2])/(y[1]/y[2]); print (r>0.99 && r<1.01)?"yes":"no"}')"
echo "clip ${VD} (${DUR}s) | cover ${CD} | same ratio: ${RATIO_OK}"
ffmpeg -v error -y -sseof -0.1 -i "$VID" -frames:v 1 "$OUT/last.png"
for p in 25 50 75; do
  ffmpeg -v error -y -ss "$(awk -v d="$DUR" -v p="$p" 'BEGIN{printf "%.2f", d*p/100}')" -i "$VID" -frames:v 1 "$OUT/mid_$p.png"
done
ffmpeg -v error -y -ss 1 -t "$(awk -v d="$DUR" 'BEGIN{t=d-1.5; if(t<0.5)t=0.5; print t}')" -i "$VID" -vf fps=4,scale=320:-2 "$OUT/sheet/f_%03d.png"
montage "$OUT"/sheet/f_*.png -tile 4x -geometry +2+2 "$OUT/sheet.png"
montage "$COVER" "$OUT/last.png" -resize 640x -tile 2x1 -geometry +4+4 "$OUT/side.png"
echo "wrote $OUT/{last,mid_25,mid_50,mid_75,sheet,side}.png and probe.json (beats at 30 %, 70 % and 100 % of the clip)"
[ "$RATIO_OK" = yes ] || { echo "cover-frames: ratio mismatch: the clip cannot land on the cover exactly (step 23: declare the ratio first)"; exit 1; }
