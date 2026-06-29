#!/usr/bin/env bash
#
# assemble.sh — normalize per-clip videos to a uniform layout, concat them in
# order, mix an optional room-tone bed, optionally append a caption card, then
# verify with verify.sh and write the final episode.mp4.
#
# Part of the shared `video-toolkit` skill. This is the ONE assembler for every
# concat-style video bot (per-beat i2v, first-last keyframe, per-shot fallback).
# It replaces the per-bot copies that had drifted (BOT-013 padded white + AUTO
# room-tone + 15-60s gate; BOT-029 padded black + ALWAYS room-tone + summed±2s) —
# every difference is now a flag. Zero-concat recipes (e.g. BOT-030 Veo extend)
# do NOT call this; they verify their passthrough file with verify.sh directly.
#
# Usage:
#   assemble.sh <project-dir> [options]
#
#   <project-dir>            artifacts/<project-name>; episode written to <project-dir>/episode.mp4
#   --clips-dir DIR          where the clips live          (default <project-dir>/clips)
#   --pattern GLOB           clip glob within --clips-dir   (default '*.mp4'; clips concat in sorted = lexicographic order — zero-pad NN)
#   --out FILE               output path                    (default <project-dir>/episode.mp4)
#   --aspect 16:9|9:16|1:1   target canvas aspect           (default 16:9)
#   --res 720|1080           canvas resolution              (default 720)
#   --pad-color COLOR        letterbox pad colour           (default black; pass 'white' for pencil-on-paper)
#   --roomtone auto|always|never   brown-noise bed policy   (default auto)
#                              auto   = add the bed ONLY if NO clip carried native audio (avoids doubling)
#                              always = add it regardless (use when the model is always silent, e.g. Hailuo)
#                              never  = never add it (use when the model has native audio, e.g. Seedance/Veo)
#   --roomtone-db DB         bed level in dB                (default -38)
#   --caption "TEXT"         append a 2s caption card with TEXT (omit for none)
#   --verify summed|range    verification mode passed to verify.sh (default summed)
#   --min S --max S          bounds for --verify range
#   --tol S                  tolerance for --verify summed   (default 2)
#   --route NAME             label recorded in the verdict JSON
#
# Prints verify.sh's ONE JSON verdict line on stdout. A FLAG verdict still exits 0
# (deliver + flag). Non-zero exit = assembly itself failed.
#
# Portability: bash 3.2, no GNU `timeout`, no `jq`.

set -euo pipefail

err() { printf 'assemble: %s\n' "$*" >&2; }
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

for dep in ffmpeg ffprobe; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (requires the sl8-video / sl8-animation template)"; exit 2; }
done

[ $# -ge 1 ] || { err "usage: assemble.sh <project-dir> [options] (see header)"; exit 2; }
PROJECT_DIR=${1%/}; shift

CLIPS_DIR=""; PATTERN='*.mp4'; OUT=""
ASPECT="16:9"; RES=720; PAD_COLOR=black
ROOMTONE=auto; ROOMTONE_DB=-38; CAPTION=""
VERIFY=summed; MIN=""; MAX=""; TOL=2; ROUTE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --clips-dir)   CLIPS_DIR=${2:?--clips-dir needs a value};  shift 2 ;;
    --pattern)     PATTERN=${2:?--pattern needs a value};      shift 2 ;;
    --out)         OUT=${2:?--out needs a value};              shift 2 ;;
    --aspect)      ASPECT=${2:?--aspect needs a value};        shift 2 ;;
    --res)         RES=${2:?--res needs a value};              shift 2 ;;
    --pad-color)   PAD_COLOR=${2:?--pad-color needs a value};  shift 2 ;;
    --roomtone)    ROOMTONE=${2:?--roomtone needs a value};    shift 2 ;;
    --roomtone-db) ROOMTONE_DB=${2:?--roomtone-db needs a value}; shift 2 ;;
    --caption)     CAPTION=${2:?--caption needs text};         shift 2 ;;
    --verify)      VERIFY=${2:?--verify needs a value};        shift 2 ;;
    --min)         MIN=${2:?--min needs a value};              shift 2 ;;
    --max)         MAX=${2:?--max needs a value};              shift 2 ;;
    --tol)         TOL=${2:?--tol needs a value};              shift 2 ;;
    --route)       ROUTE=${2:?--route needs a value};          shift 2 ;;
    *) err "unknown option: $1"; exit 2 ;;
  esac
done

CLIPS_DIR=${CLIPS_DIR:-$PROJECT_DIR/clips}
OUT=${OUT:-$PROJECT_DIR/episode.mp4}

# canvas W x H from aspect + res
case "$ASPECT:$RES" in
  16:9:720)  W=1280 H=720 ;;
  16:9:1080) W=1920 H=1080 ;;
  9:16:720)  W=720  H=1280 ;;
  9:16:1080) W=1080 H=1920 ;;
  1:1:720)   W=720  H=720 ;;
  1:1:1080)  W=1080 H=1080 ;;
  *) err "unsupported --aspect/--res combo '$ASPECT'/'$RES' (aspect: 16:9|9:16|1:1, res: 720|1080)"; exit 2 ;;
esac

[ -d "$CLIPS_DIR" ] || { err "clips directory not found: $CLIPS_DIR"; exit 2; }
shopt -s nullglob
CLIPS=("$CLIPS_DIR"/$PATTERN)   # sorted glob = clip order (zero-padded NN)
shopt -u nullglob
[ ${#CLIPS[@]} -ge 1 ] || { err "no clips matching '$PATTERN' in $CLIPS_DIR"; exit 2; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/norm"

FPS=24
VNORM="fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR},setsar=1,format=yuv420p"

# --- 1. normalize every clip to a uniform format (uniform re-encode BEFORE concat) ---
# Mixed fps/size/SAR/codec params are the #1 concat-demuxer failure. Clips with native
# audio keep it; silent clips get a silent stereo track so the A/V layout is identical.
# NATIVE_AUDIO counts clips that arrived with real audio — it drives --roomtone auto.
i=0; NATIVE_AUDIO=0
for CLIP in "${CLIPS[@]}"; do
  i=$(( i + 1 ))
  NORM=$(printf '%s/norm/%03d.mp4' "$TMP" "$i")
  HAS_A=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$CLIP" | head -n1 || true)
  err "normalizing $(basename "$CLIP") (native audio: ${HAS_A:-none})"
  if [ -n "$HAS_A" ]; then
    NATIVE_AUDIO=$(( NATIVE_AUDIO + 1 ))
    ffmpeg -y -hide_banner -loglevel error -i "$CLIP" \
      -filter_complex "[0:v]${VNORM}[v]" -map "[v]" -map 0:a:0 \
      -c:v libx264 -preset medium -crf 20 -c:a aac -ar 48000 -ac 2 \
      -movflags +faststart "$NORM" || { err "normalize failed on $CLIP"; exit 1; }
  else
    ffmpeg -y -hide_banner -loglevel error -i "$CLIP" \
      -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
      -filter_complex "[0:v]${VNORM}[v]" -map "[v]" -map 1:a \
      -c:v libx264 -preset medium -crf 20 -c:a aac -shortest \
      -movflags +faststart "$NORM" || { err "normalize failed on $CLIP"; exit 1; }
  fi
done

# --- 2. optional caption card (appended after the final clip) ---
if [ -n "$CAPTION" ]; then
  FONTFILE=""
  for f in \
    /usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf \
    /usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf \
    /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf \
    /usr/share/fonts/dejavu/DejaVuSans.ttf \
    /usr/share/fonts/TTF/DejaVuSans.ttf; do
    [ -f "$f" ] && { FONTFILE=$f; break; }
  done
  if [ -z "$FONTFILE" ]; then
    err "WARNING: no usable font found — skipping the caption card (disclose in summary.md)"
  else
    printf '%s' "$CAPTION" >"$TMP/caption.txt"   # textfile= sidesteps drawtext escaping
    i=$(( i + 1 ))
    CARD=$(printf '%s/norm/%03d.mp4' "$TMP" "$i")
    err "rendering 2s caption card: \"$CAPTION\""
    ffmpeg -y -hide_banner -loglevel error \
      -f lavfi -i "color=c=0xFAF6EE:s=${W}x${H}:d=2:r=${FPS}" \
      -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
      -vf "drawtext=textfile=${TMP}/caption.txt:fontfile=${FONTFILE}:fontcolor=0x3A3A3A:fontsize=$(( W / 22 )):x=(w-text_w)/2:y=(h-text_h)/2,format=yuv420p" \
      -map 0:v -map 1:a -c:v libx264 -preset medium -crf 20 -c:a aac -shortest \
      -movflags +faststart "$CARD" \
      || { err "caption card render failed — continuing without it (disclose in summary.md)"; rm -f "$CARD"; }
  fi
fi

# --- 3. concat in order (demuxer; re-encode on edge-case failure) ---
LIST="$TMP/concat.txt"
for f in "$TMP"/norm/*.mp4; do printf "file '%s'\n" "$f" >>"$LIST"; done
CONCAT="$TMP/episode-concat.mp4"
if ! ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" -c copy "$CONCAT"; then
  err "stream-copy concat failed — re-encoding the concat (slower, always works)"
  ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -ar 48000 -ac 2 \
    -movflags +faststart "$CONCAT" || { err "concat failed even with re-encode"; exit 1; }
fi

# --- 4. resolve --roomtone auto, then mix the bed (or copy through) ---
if [ "$ROOMTONE" = auto ]; then
  if [ "$NATIVE_AUDIO" -eq 0 ]; then
    ROOMTONE=always; err "room-tone AUTO -> ON (no clip had native audio — avoiding dead silence)"
  else
    ROOMTONE=never;  err "room-tone AUTO -> OFF (${NATIVE_AUDIO}/${#CLIPS[@]} clips carry native audio)"
  fi
fi
if [ "$ROOMTONE" = always ]; then
  err "mixing brown-noise room tone at ${ROOMTONE_DB}dB under the episode (added ambient bed, NOT native audio — disclose in summary.md)"
  ffmpeg -y -hide_banner -loglevel error -i "$CONCAT" \
    -f lavfi -i "anoisesrc=colour=brown:r=48000:a=1.0" \
    -filter_complex "[1:a]volume=${ROOMTONE_DB}dB,pan=stereo|c0=c0|c1=c0[rt];[0:a][rt]amix=inputs=2:duration=first:normalize=0[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -ar 48000 -ac 2 \
    -movflags +faststart "$OUT" || { err "room-tone mix failed"; exit 1; }
else
  cp "$CONCAT" "$OUT"
fi

# --- 5. verify via the shared verifier ---
if [ "$VERIFY" = range ]; then
  [ -n "$MIN" ] && [ -n "$MAX" ] || { err "--verify range needs --min and --max"; exit 2; }
  bash "$SCRIPT_DIR/verify.sh" "$OUT" --mode range --min "$MIN" --max "$MAX" --require-audio yes --route "$ROUTE"
else
  SUM=$(python3 -c '
import subprocess, sys, glob, os
total = 0.0
for f in sorted(glob.glob(os.path.join(sys.argv[1], "*.mp4"))):
    out = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
                          "-of","default=noprint_wrappers=1:nokey=1", f],
                         capture_output=True, text=True).stdout.strip()
    try: total += float(out)
    except ValueError: pass
print(f"{total:.2f}")
' "$TMP/norm")
  bash "$SCRIPT_DIR/verify.sh" "$OUT" --mode summed --summed "$SUM" --tol "$TOL" --require-audio yes --route "$ROUTE"
fi
