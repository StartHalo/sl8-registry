#!/usr/bin/env bash
#
# assemble.sh — normalize the per-beat clips, concat them in beat order, mix a
# room-tone bed under the episode, optionally append a punchline caption card,
# verify with ffprobe, and write episode.mp4 at the PROJECT ROOT.
#
# Usage:
#   assemble.sh <project-dir> [--no-roomtone] [--aspect 16:9|9:16] [--caption "TEXT"]
#
#   <project-dir>   artifacts/<project-name> — clips are read from
#                   <project-dir>/04-clips/*.mp4 in lexicographic (= beat) order;
#                   episode.mp4 is written to <project-dir>/episode.mp4.
#   --no-roomtone   skip the brown-noise bed (default: ON at -38dB — silent i2v
#                   clips read better with a faint bed than with digital silence)
#   --aspect        target canvas (default 16:9 → 1920x1080; 9:16 → 1080x1920)
#   --caption       punchline text → 2s paper-white hand-written-style card
#                   appended after the final beat (omit for no card)
#
# Prints ONE JSON verdict line on stdout, e.g.
#   {"file":"...","duration_s":31.9,"width":1920,"height":1080,"duration_ok":true,"aspect_ok":true,"verdict":"PASS","reasons":[]}
# A FLAG verdict still exits 0 — deliver + flag, never withhold the episode.
# Non-zero exit = assembly itself failed.

set -euo pipefail

err() { printf 'assemble: %s\n' "$*" >&2; }

for dep in ffmpeg ffprobe; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (requires the sl8-animation template)"; exit 2; }
done

[[ $# -ge 1 ]] || { err 'usage: assemble.sh <project-dir> [--no-roomtone] [--aspect 16:9|9:16] [--caption "TEXT"]'; exit 2; }
PROJECT_DIR=${1%/}
shift

ROOMTONE=yes
ASPECT="16:9"
CAPTION=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-roomtone) ROOMTONE=no; shift ;;
    --aspect)      ASPECT=${2:?--aspect needs a value}; shift 2 ;;
    --caption)     CAPTION=${2:?--caption needs text}; shift 2 ;;
    *) err "unknown option: $1"; exit 2 ;;
  esac
done

case "$ASPECT" in
  16:9) W=1920 H=1080 ;;
  9:16) W=1080 H=1920 ;;
  *) err "unsupported --aspect '$ASPECT' (use 16:9 or 9:16)"; exit 2 ;;
esac

CLIPS_DIR="$PROJECT_DIR/04-clips"
EPISODE="$PROJECT_DIR/episode.mp4"
[[ -d "$CLIPS_DIR" ]] || { err "clips directory not found: $CLIPS_DIR"; exit 2; }

shopt -s nullglob
CLIPS=("$CLIPS_DIR"/*.mp4)   # glob expansion is sorted → zero-padded NN = beat order
shopt -u nullglob
[[ ${#CLIPS[@]} -ge 1 ]] || { err "no clips in $CLIPS_DIR — run gen-clip.sh / still-segment.sh first"; exit 2; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/norm"

FPS=24
VNORM="fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1,format=yuv420p"

# --- 1. Normalize every clip to a uniform format -----------------------------
# Uniform re-encode BEFORE concat is what makes the concat demuxer reliable:
# mixed fps/size/SAR/codec params are the #1 concat failure. Clips without an
# audio stream (all current i2v models are silent) get a silent stereo track so
# every segment has an identical stream layout.
i=0
for CLIP in "${CLIPS[@]}"; do
  i=$(( i + 1 ))
  NORM=$(printf '%s/norm/%03d.mp4' "$TMP" "$i")
  HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$CLIP" | head -n1 || true)
  err "normalizing $(basename "$CLIP") (audio: ${HAS_AUDIO:-none})"
  if [[ -n "$HAS_AUDIO" ]]; then
    ffmpeg -y -hide_banner -loglevel error -i "$CLIP" \
      -filter_complex "[0:v]${VNORM}[v]" -map "[v]" -map 0:a:0 \
      -c:v libx264 -preset medium -crf 20 -c:a aac -ar 48000 -ac 2 \
      -movflags +faststart "$NORM" \
      || { err "normalize failed on $CLIP"; exit 1; }
  else
    ffmpeg -y -hide_banner -loglevel error -i "$CLIP" \
      -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
      -filter_complex "[0:v]${VNORM}[v]" -map "[v]" -map 1:a \
      -c:v libx264 -preset medium -crf 20 -c:a aac -shortest \
      -movflags +faststart "$NORM" \
      || { err "normalize failed on $CLIP"; exit 1; }
  fi
done

# --- 2. Optional punchline caption card (appended after the final beat) ------
if [[ -n "$CAPTION" ]]; then
  FONTFILE=""
  for f in \
    /usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf \
    /usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf \
    /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf \
    /usr/share/fonts/dejavu/DejaVuSans.ttf \
    /usr/share/fonts/TTF/DejaVuSans.ttf; do
    [[ -f "$f" ]] && { FONTFILE=$f; break; }
  done
  if [[ -z "$FONTFILE" ]]; then
    err "WARNING: no usable font found — skipping the caption card (disclose in 05-summary.md)"
  else
    # textfile= sidesteps drawtext's escaping rules entirely
    printf '%s' "$CAPTION" >"$TMP/caption.txt"
    i=$(( i + 1 ))
    CARD=$(printf '%s/norm/%03d.mp4' "$TMP" "$i")
    err "rendering 2s caption card: \"$CAPTION\""
    ffmpeg -y -hide_banner -loglevel error \
      -f lavfi -i "color=c=0xFAF6EE:s=${W}x${H}:d=2:r=${FPS}" \
      -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
      -vf "drawtext=textfile=${TMP}/caption.txt:fontfile=${FONTFILE}:fontcolor=0x3A3A3A:fontsize=$(( W / 22 )):x=(w-text_w)/2:y=(h-text_h)/2,format=yuv420p" \
      -map 0:v -map 1:a -c:v libx264 -preset medium -crf 20 -c:a aac -shortest \
      -movflags +faststart "$CARD" \
      || { err "caption card render failed — continuing without it (disclose in 05-summary.md)"; rm -f "$CARD"; }
  fi
fi

# --- 3. Concat in beat order --------------------------------------------------
LIST="$TMP/concat.txt"
for f in "$TMP"/norm/*.mp4; do
  printf "file '%s'\n" "$f" >>"$LIST"
done
CONCAT="$TMP/episode-concat.mp4"
if ! ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" -c copy "$CONCAT"; then
  # Triage: stream-copy concat can still trip on edge-case params → one uniform
  # re-encode of the concatenation itself (see references/assembly.md).
  err "stream-copy concat failed — re-encoding the concat (slower, always works)"
  ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -ar 48000 -ac 2 \
    -movflags +faststart "$CONCAT" \
    || { err "concat failed even with re-encode — inspect the normalized clips in a kept tmp dir"; exit 1; }
fi

# --- 4. Room-tone bed ----------------------------------------------------------
if [[ "$ROOMTONE" == yes ]]; then
  err "mixing brown-noise room tone at -38dB under the episode"
  ffmpeg -y -hide_banner -loglevel error -i "$CONCAT" \
    -f lavfi -i "anoisesrc=colour=brown:r=48000:a=1.0" \
    -filter_complex "[1:a]volume=-38dB,pan=stereo|c0=c0|c1=c0[rt];[0:a][rt]amix=inputs=2:duration=first:normalize=0[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -ar 48000 -ac 2 \
    -movflags +faststart "$EPISODE" \
    || { err "room-tone mix failed"; exit 1; }
else
  cp "$CONCAT" "$EPISODE"
fi

# --- 5. ffprobe verification ---------------------------------------------------
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$EPISODE")
read -r OW OH < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$EPISODE" | tr ',' ' ')

DURATION_OK=false; ASPECT_OK=false; REASONS=()
awk "BEGIN { exit !($DUR >= 15 && $DUR <= 60) }" && DURATION_OK=true \
  || REASONS+=("duration ${DUR}s outside 15-60s")
[[ "$OW" == "$W" && "$OH" == "$H" ]] && ASPECT_OK=true \
  || REASONS+=("got ${OW}x${OH}, planned ${W}x${H}")

VERDICT=PASS
[[ "$DURATION_OK" == true && "$ASPECT_OK" == true ]] || VERDICT=FLAG

REASONS_JSON=""
for r in ${REASONS[@]+"${REASONS[@]}"}; do REASONS_JSON+="\"${r}\","; done
REASONS_JSON=${REASONS_JSON%,}

printf '{"file":"%s","duration_s":%.1f,"width":%s,"height":%s,"duration_ok":%s,"aspect_ok":%s,"roomtone":"%s","verdict":"%s","reasons":[%s]}\n' \
  "$EPISODE" "$DUR" "$OW" "$OH" "$DURATION_OK" "$ASPECT_OK" "$ROOMTONE" "$VERDICT" "$REASONS_JSON"

[[ "$VERDICT" == PASS ]] \
  && err "episode verified: ${DUR}s, ${OW}x${OH}" \
  || err "episode delivered with FLAG verdict — report the reasons prominently in 05-summary.md and state.md"
