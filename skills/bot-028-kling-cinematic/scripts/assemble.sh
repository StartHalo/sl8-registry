#!/usr/bin/env bash
#
# assemble.sh — normalize the per-shot Kling clips to a uniform layout, concat them in
# shot order, ADD a subtle room-tone ambient bed (Kling clips are SILENT — the bed is
# ALWAYS added here, never native), verify with ffprobe, and write episode.mp4 at the
# project root.
#
# This is the Kling-side assembler. It differs from the Seedance fallback in ONE way: the
# room-tone bed is ALWAYS added (every Kling clip is silent, so there is no native audio to
# double up). The caller MUST state in summary.md that the audio is an added ambient bed,
# NOT native Kling audio.
#
# Donor lineage: BOT-013 clip-assembly scripts/assemble.sh (normalize -> concat ->
# room-tone -> ffprobe) + BOT-027 seedance-cinematic scripts/per-shot-fallback.sh.
#
# Usage:
#   assemble.sh <project-dir>
#     <project-dir>  artifacts/<project-name> — clips are read from <project-dir>/work-shots/
#                    *-shot.mp4 in lexicographic (= shot) order; episode.mp4 is written to
#                    <project-dir>/episode.mp4.
#
# Env knobs (all optional):
#   ASPECT       16:9 | 9:16 | 1:1   (default 16:9 — the normalize canvas)
#   AUDIO_DESC   the shot-list Audio: line (informational; recorded with the room tone)
#   ROOMTONE_DB  room-tone level in dB (default -38)
#
# Prints ONE JSON verdict line on stdout:
#   {"file":"...","route":"kling-per-shot","shots":N,"duration_s":S,"audio":"roomtone","verdict":"PASS|FLAG"}
# A FLAG verdict still exits 0 — deliver + flag, never withhold the episode. Non-zero exit =
# assembly itself failed (no clips, or ffmpeg errored unrecoverably).

set -euo pipefail

err() { printf 'assemble: %s\n' "$*" >&2; }

for dep in ffmpeg ffprobe; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

[[ $# -eq 1 ]] || { err "usage: assemble.sh <project-dir>"; exit 2; }
PROJECT_DIR=${1%/}

ASPECT=${ASPECT:-16:9}
AUDIO_DESC=${AUDIO_DESC:-}
ROOMTONE_DB=${ROOMTONE_DB:--38}

case "$ASPECT" in
  16:9) W=1280 H=720 ;;
  9:16) W=720  H=1280 ;;
  1:1)  W=720  H=720 ;;
  *) err "ASPECT must be 16:9|9:16|1:1 (got '$ASPECT')"; exit 2 ;;
esac

CLIPS_DIR="$PROJECT_DIR/work-shots"
EPISODE="$PROJECT_DIR/episode.mp4"
[[ -d "$CLIPS_DIR" ]] || { err "clips directory not found: $CLIPS_DIR (run gen-kling-cinematic.sh first)"; exit 2; }

shopt -s nullglob
CLIPS=("$CLIPS_DIR"/*-shot.mp4)   # zero-padded NN-shot.mp4 → glob is sorted = shot order
shopt -u nullglob
[[ ${#CLIPS[@]} -ge 1 ]] || { err "no *-shot.mp4 clips in $CLIPS_DIR — nothing to assemble"; exit 2; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/norm"

FPS=24
VNORM="fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p"

# --- 1. normalize every clip to a uniform layout (uniform re-encode BEFORE concat) ----
# Kling clips are silent; attach a silent stereo track so every segment has an identical
# A/V stream layout for the demuxer. (A clip carrying native audio is still handled, for
# robustness, but in this pipeline none do.)
i=0
for CLIP in "${CLIPS[@]}"; do
  i=$(( i + 1 ))
  NORM=$(printf '%s/norm/%03d.mp4' "$TMP" "$i")
  HAS_A=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$CLIP" | head -n1 || true)
  err "normalizing $(basename "$CLIP") (native audio: ${HAS_A:-none})"
  if [[ -n "$HAS_A" ]]; then
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

# --- 2. concat in shot order (demuxer; re-encode on edge-case failure) ----------------
LIST="$TMP/concat.txt"
for f in "$TMP"/norm/*.mp4; do printf "file '%s'\n" "$f" >>"$LIST"; done
CONCAT="$TMP/episode-concat.mp4"
if ! ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" -c copy "$CONCAT"; then
  err "stream-copy concat failed — re-encoding the concat (slower, always works)"
  ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -ar 48000 -ac 2 \
    -movflags +faststart "$CONCAT" || { err "concat failed even with re-encode"; exit 1; }
fi

# --- 3. room-tone bed — ALWAYS added (Kling clips are silent) --------------------------
# A quiet brown-noise room tone derived (in spirit) from the shot-list Audio: line. This
# is an ADDED ambient bed, NOT native Kling audio — disclose it in summary.md. The silent
# stereo track on each normalized clip is replaced/under-mixed with the bed.
[[ -n "$AUDIO_DESC" ]] && err "room-tone bed derived from Audio: ${AUDIO_DESC:0:80}"
err "mixing brown-noise room tone at ${ROOMTONE_DB}dB under the episode (added ambient bed, NOT native)"
ffmpeg -y -hide_banner -loglevel error -i "$CONCAT" \
  -f lavfi -i "anoisesrc=colour=brown:r=48000:a=1.0" \
  -filter_complex "[1:a]volume=${ROOMTONE_DB}dB,pan=stereo|c0=c0|c1=c0[rt];[0:a][rt]amix=inputs=2:duration=first:normalize=0[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -ar 48000 -ac 2 \
  -movflags +faststart "$EPISODE" || { err "room-tone mix failed"; exit 1; }

# --- 4. ffprobe verify -----------------------------------------------------------------
# Expected total = sum of the per-clip durations; tolerate ±1s. We compute it from the
# normalized clips so it tracks the snapped shot durations, not the shot-list nominal.
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

DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$EPISODE" 2>/dev/null || echo 0)
HAS_VIDEO=$(ffprobe -v error -select_streams v -show_entries stream=codec_type -of csv=p=0 "$EPISODE" | head -n1 || true)
HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$EPISODE" | head -n1 || true)

DUR_OK=false; VID_OK=false; AUD_OK=false
awk "BEGIN { d=$DUR; s=$SUM; exit !((d-s) <= 1.0 && (s-d) <= 1.0) }" && DUR_OK=true
[[ -n "$HAS_VIDEO" ]] && VID_OK=true
[[ -n "$HAS_AUDIO" ]] && AUD_OK=true

VERDICT=PASS
[[ "$VID_OK" == true && "$AUD_OK" == true && "$DUR_OK" == true ]] || VERDICT=FLAG

err "ffprobe: duration=${DUR}s (summed shots ${SUM}s, ±1s ok=$DUR_OK) video=${HAS_VIDEO:-none}(ok=$VID_OK) audio=${HAS_AUDIO:-none}(roomtone, ok=$AUD_OK) verdict=$VERDICT"

printf '{"file":"%s","route":"kling-per-shot","shots":%s,"duration_s":%.1f,"summed_s":%.1f,"audio":"roomtone","verdict":"%s"}\n' \
  "$EPISODE" "${#CLIPS[@]}" "$DUR" "$SUM" "$VERDICT"

[[ "$VERDICT" == PASS ]] \
  && err "episode verified: ${DUR}s, ${W}x${H}, ${#CLIPS[@]} shots, room-tone bed" \
  || err "episode delivered with FLAG verdict — report the reason prominently in summary.md and state.md"
exit 0
