#!/usr/bin/env bash
#
# assemble-listing.sh — normalize the per-photo / per-clip segments, concat them in
# order, mix an optional music bed, burn the AB-723 FIRST-FRAME disclosure card, and
# ffprobe-verify. Pure ffmpeg (deterministic). The disclosure card is mandatory for
# any AI-touched listing video (AB-723 applies to video too).
#
# Usage:
#   assemble-listing.sh <clips-dir> <out.mp4> [--aspect 16:9|9:16|1:1]
#       [--music <track.mp3>] [--music-db <dB>] [--disclosure "<text>"]
#       [--min <secs>] [--max <secs>]
#
#   <clips-dir>   segments read as <clips-dir>/*.mp4 in lexicographic (= zero-padded NN) order.
#   --music       background track (looped + faded); omit for no music.
#   --music-db    music gain (default 0.18 linear ~ -15dB under the bed).
#   --disclosure  the first-frame AB-723 card text (default the disclosure-stamp VIDEO_CARD).
#                 Pass "none" to skip (NOT recommended — AB-723 needs it).
#   --min/--max   verify window (default 8..90s).
#
# Prints ONE JSON verdict line on stdout; a FLAG still exits 0 (deliver + flag).

set -euo pipefail
err() { printf 'assemble-listing: %s\n' "$*" >&2; }
for dep in ffmpeg ffprobe; do command -v "$dep" >/dev/null 2>&1 || { err "missing: $dep"; exit 2; }; done

[[ $# -ge 2 ]] || { err 'usage: assemble-listing.sh <clips-dir> <out.mp4> [--aspect R] [--music f] [--disclosure t]'; exit 2; }
CLIPS_DIR=${1%/}; OUT=$2; shift 2
ASPECT="16:9"; MUSIC=""; MUSIC_DB="0.18"; MINS=8; MAXS=90
DISCLOSURE="Video created from listing photos using AI motion technology"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --aspect)     ASPECT=${2:?}; shift 2 ;;
    --music)      MUSIC=${2:?}; shift 2 ;;
    --music-db)   MUSIC_DB=${2:?}; shift 2 ;;
    --disclosure) DISCLOSURE=${2:?}; shift 2 ;;
    --min)        MINS=${2:?}; shift 2 ;;
    --max)        MAXS=${2:?}; shift 2 ;;
    *) err "unknown option: $1"; exit 2 ;;
  esac
done
case "$ASPECT" in 16:9) W=1920 H=1080 ;; 9:16) W=1080 H=1920 ;; 1:1) W=1080 H=1080 ;; *) err "bad --aspect"; exit 2 ;; esac

[[ -d "$CLIPS_DIR" ]] || { err "clips dir not found: $CLIPS_DIR"; exit 2; }
shopt -s nullglob; CLIPS=("$CLIPS_DIR"/*.mp4); shopt -u nullglob
(( ${#CLIPS[@]} >= 1 )) || { err "no .mp4 segments in $CLIPS_DIR"; exit 2; }
mkdir -p "$(dirname "$OUT")"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; mkdir -p "$TMP/norm"
FPS=24
VNORM="fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p"

# 1) normalize (uniform re-encode = reliable concat); silent segments get a silent stereo track.
i=0
for CLIP in "${CLIPS[@]}"; do
  i=$(( i + 1 )); NORM=$(printf '%s/norm/%03d.mp4' "$TMP" "$i")
  HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$CLIP" | head -n1 || true)
  if [[ -n "$HAS_AUDIO" ]]; then
    ffmpeg -y -hide_banner -loglevel error -i "$CLIP" -filter_complex "[0:v]${VNORM}[v]" -map "[v]" -map 0:a:0 \
      -c:v libx264 -preset medium -crf 20 -c:a aac -ar 48000 -ac 2 -movflags +faststart "$NORM" || { err "normalize failed: $CLIP"; exit 1; }
  else
    ffmpeg -y -hide_banner -loglevel error -i "$CLIP" -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
      -filter_complex "[0:v]${VNORM}[v]" -map "[v]" -map 1:a -c:v libx264 -preset medium -crf 20 -c:a aac -shortest -movflags +faststart "$NORM" || { err "normalize failed: $CLIP"; exit 1; }
  fi
done

# 2) concat (stream-copy, re-encode triage on failure)
LIST="$TMP/concat.txt"; for f in "$TMP"/norm/*.mp4; do printf "file '%s'\n" "$f" >>"$LIST"; done
CONCAT="$TMP/concat.mp4"
if ! ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" -c copy "$CONCAT"; then
  err "stream-copy concat failed — re-encoding"
  ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -ar 48000 -ac 2 -movflags +faststart "$CONCAT" || { err "concat failed"; exit 1; }
fi
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$CONCAT")

# 3) final pass: optional music bed + first-frame AB-723 disclosure card
FONTFILE=""; for f in /System/Library/Fonts/Supplemental/Arial.ttf /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf /usr/share/fonts/dejavu/DejaVuSans.ttf /usr/share/fonts/TTF/DejaVuSans.ttf; do [[ -f "$f" ]] && { FONTFILE=$f; break; }; done
VF=""
if [[ "$DISCLOSURE" != "none" && -n "$FONTFILE" ]]; then
  printf '%s' "$DISCLOSURE" >"$TMP/disc.txt"
  VF="drawtext=textfile=${TMP}/disc.txt:fontfile=${FONTFILE}:fontcolor=white:fontsize=w/42:box=1:boxcolor=black@0.6:boxborderw=10:x=24:y=28:enable='lt(t,3)'"
elif [[ "$DISCLOSURE" != "none" ]]; then
  err "WARNING: no font for the first-frame disclosure card — disclose this gap (run disclosure-stamp on the output)"
fi

FADE_OUT=$(awk "BEGIN{printf \"%.2f\", ($DUR>1.4)?$DUR-1.2:0}")
if [[ -n "$MUSIC" && -s "$MUSIC" ]]; then
  err "mixing music bed ($MUSIC, gain $MUSIC_DB) + first-frame disclosure"
  FC="[1:a]volume=${MUSIC_DB},afade=t=in:st=0:d=1,afade=t=out:st=${FADE_OUT}:d=1.2[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]"
  [[ -n "$VF" ]] && FC="${FC};[0:v]${VF}[v]" && VMAP="[v]" || VMAP="0:v"
  ffmpeg -y -hide_banner -loglevel error -i "$CONCAT" -stream_loop -1 -i "$MUSIC" \
    -filter_complex "$FC" -map "$VMAP" -map "[a]" -c:v libx264 -preset medium -crf 20 -c:a aac -ar 48000 -ac 2 -shortest -movflags +faststart "$OUT" \
    || { err "music+disclosure pass failed"; exit 1; }
else
  if [[ -n "$VF" ]]; then
    ffmpeg -y -hide_banner -loglevel error -i "$CONCAT" -vf "$VF" -c:v libx264 -preset medium -crf 20 -c:a copy -movflags +faststart "$OUT" || { err "disclosure pass failed"; exit 1; }
  else
    cp "$CONCAT" "$OUT"
  fi
fi

# 4) verify
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
read -r OW OH < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUT" | tr ',' ' ')
HAS_A=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$OUT" | head -n1 || true)
DOK=false; AOK=false; SOK=false; REASONS=()
awk "BEGIN{exit !($DUR>=$MINS && $DUR<=$MAXS)}" && DOK=true || REASONS+=("duration ${DUR}s outside ${MINS}-${MAXS}s")
[[ "$OW" == "$W" && "$OH" == "$H" ]] && SOK=true || REASONS+=("got ${OW}x${OH}, planned ${W}x${H}")
[[ -n "$HAS_A" ]] && AOK=true || REASONS+=("no audio stream")
VERDICT=PASS; [[ "$DOK" == true && "$SOK" == true && "$AOK" == true ]] || VERDICT=FLAG
RJ=""; for r in ${REASONS[@]+"${REASONS[@]}"}; do RJ+="\"${r}\","; done; RJ=${RJ%,}
printf '{"file":"%s","duration_s":%.1f,"width":%s,"height":%s,"aspect":"%s","music":%s,"disclosure":%s,"verdict":"%s","reasons":[%s]}\n' \
  "$OUT" "$DUR" "$OW" "$OH" "$ASPECT" "$([[ -n $MUSIC ]] && echo true || echo false)" "$([[ $DISCLOSURE != none ]] && echo true || echo false)" "$VERDICT" "$RJ"
[[ "$VERDICT" == PASS ]] && err "listing video verified: ${DUR}s ${OW}x${OH}" || err "delivered with FLAG — report reasons in the log"
