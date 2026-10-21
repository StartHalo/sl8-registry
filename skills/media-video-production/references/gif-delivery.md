# GIF delivery

When the brief asks for a looping GIF of a clip or the cut, make it locally from the finished MP4 with ffmpeg, which is
already on the machine. Nothing is generated, so the step costs no credits and needs no gate. The recipe is the
two-pass palette conversion of MiniMax's gif-sticker-maker converter, whose workflow around it stays out of this skill.

**Default: 15 frames per second, 360 px wide**, the height following the source's shape, scaled with lanczos. A brief may name
another width or rate; use what it says and state it in the delivery.

1. Pass 1 builds a palette with `palettegen=stats_mode=diff`. The palette is scratch: it lives under `work/<project>/` and is
   removed after each file, whether the encode passed or failed.
2. Pass 2 applies it with `paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`.
3. Each file is converted on its own. A missing input is skipped and named. A failed encode is named with the end of
   ffmpeg's error message. The other files are still made.
4. The delivery record lists each GIF with its file size, so the person sees its weight before posting it.

```bash
# usage: bash to-gif.sh <work-dir> <out-dir> <input.mp4> [<input.mp4> ...]    (optional env: GIF_FPS=15 GIF_WIDTH=360)
work=$1; out=$2; shift 2; fps=${GIF_FPS:-15}; width=${GIF_WIDTH:-360}
mkdir -p "$work" "$out"
for in in "$@"; do
  name=$(basename "${in%.*}"); pal="$work/$name.palette.png"
  if [ ! -f "$in" ]; then echo "SKIPPED $in: no such file"; continue; fi
  if ffmpeg -y -v error -i "$in" -vf "fps=$fps,scale=$width:-1:flags=lanczos,palettegen=stats_mode=diff" "$pal" 2>"$work/$name.err" \
    && ffmpeg -y -v error -i "$in" -i "$pal" -lavfi "fps=$fps,scale=$width:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "$out/$name.gif" 2>>"$work/$name.err"
  then echo "GIF $out/$name.gif $(wc -c < "$out/$name.gif") bytes, ${width}px wide at ${fps} fps"
  else echo "FAILED $in: $(tail -n 2 "$work/$name.err" | tr '\n' ' ')"; rm -f "$out/$name.gif"; fi
  rm -f "$pal" "$work/$name.err"
done
```

Check a GIF with `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,r_frame_rate -of csv=p=0 <file>`
(`gif`, the width, `15/1`); `mediaqc.mjs` reads its format as `gif`.
