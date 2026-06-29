#!/usr/bin/env bash
#
# per-shot-fallback.sh — the DOCUMENTED FALLBACK for gen-cinematic.sh, used ONLY when the
# single reference-to-video call errored or failed verification. It splits the shot-list
# into its numbered time-coded shots, generates one image-to-video clip per shot
# (start frame = hero.png), and concatenates them in shot order into episode.mp4.
#
# This trades the single-pass identity lock for per-clip i2v (cross-shot identity rests on
# the shared hero frame + the verbatim shot text) and stitched cuts instead of native ones.
# The caller MUST record in summary.md that this route shipped and why. Never silent.
#
# Donor lineage: BOT-013 clip-assembly scripts/gen-clip.sh (per-clip i2v walk) +
# scripts/assemble.sh (normalize → concat → room-tone-only-if-silent → ffprobe verify).
#
# Usage:
#   per-shot-fallback.sh <shotlist.md> <hero.png> <project-dir>
#     <shotlist.md>  the cinematic shot-list (parsed for `[Xs-Ys]:` time-coded shots)
#     <hero.png>     the bible hero portrait — the i2v start frame for every shot
#     <project-dir>  artifacts/<project-name> — episode.mp4 is written at its root
#
# Env knobs (all optional):
#   DURATION    target total length (informational; per-shot durations come from the timecodes)
#   ASPECT      16:9 | 9:16 | 1:1  (default 16:9)
#   RESOLUTION  480p | 720p        (default 720p)
#   MAX_COST    per-shot credit cap passed to --max-cost (default 400)
#   MODEL       i2v model slug (default bytedance/seedance-2.0/fast/image-to-video)
#
# Prints ONE JSON-ish verdict line on stdout:
#   {"file":"...","route":"per-shot-fallback","shots":N,"duration_s":S,"audio":"native|roomtone|mixed","verdict":"PASS|FLAG"}
# Non-zero exit = the fallback itself failed for every shot (no usable episode).

set -euo pipefail

err() { printf 'per-shot-fallback: %s\n' "$*" >&2; }

for dep in ai-gen python3 ffmpeg ffprobe; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

if [[ $# -ne 3 ]]; then
  err "usage: per-shot-fallback.sh <shotlist.md> <hero.png> <project-dir>"
  exit 2
fi

SHOTLIST=$1
HERO=$2
PROJECT_DIR=${3%/}

ASPECT=${ASPECT:-16:9}
RESOLUTION=${RESOLUTION:-720p}
MAX_COST=${MAX_COST:-400}
MODEL=${MODEL:-bytedance/seedance-2.0/fast/image-to-video}

[[ -s "$SHOTLIST" ]] || { err "shot-list missing or empty: $SHOTLIST"; exit 2; }
[[ -s "$HERO"     ]] || { err "hero image missing on disk: $HERO (run phase 1)"; exit 2; }
case "$ASPECT" in
  16:9) W=1280 H=720 ;;
  9:16) W=720  H=1280 ;;
  1:1)  W=720  H=720 ;;
  *) err "ASPECT must be 16:9|9:16|1:1 (got '$ASPECT')"; exit 2 ;;
esac

CLIPS_DIR="$PROJECT_DIR/work-shots"
EPISODE="$PROJECT_DIR/episode.mp4"
mkdir -p "$CLIPS_DIR"

# --- parse the shot-list into shots: "<seconds>\t<shot text>" per line ---------------
# A shot line looks like  [0-3s]: wide establishing shot, gentle push-in, the robot ...
# or  [3s-6s]: ...  We capture the duration (end-start) and the action/camera text.
mapfile -t SHOTS < <(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
# match [<a>-<b>s]: or [<a>s-<b>s]: with optional spaces
pat = re.compile(r"\[\s*(\d+)\s*s?\s*-\s*(\d+)\s*s\s*\]\s*:\s*(.+)")
for line in text.splitlines():
    m = pat.search(line)
    if not m:
        continue
    a, b, body = int(m.group(1)), int(m.group(2)), m.group(3).strip()
    dur = max(1, b - a)
    # Seedance i2v takes 5 or 10s granularity reliably; snap to the nearer of {5,10}.
    snapped = 5 if dur <= 7 else 10
    print(f"{snapped}\t{body}")
' "$SHOTLIST")

[[ ${#SHOTS[@]} -ge 1 ]] || { err "no time-coded [Xs-Ys]: shots found in $SHOTLIST — cannot split"; exit 1; }
err "parsed ${#SHOTS[@]} shots from the shot-list"

# --- JSON helpers (ai-gen v2.1.0; files[] entries are OBJECTS) ------------------------
json_success() {
  python3 -c '
import json, sys
try:
    doc = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(1)
ok = (isinstance(doc, dict) and doc.get("success") is True
      and isinstance(doc.get("files"), list) and len(doc["files"]) > 0)
sys.exit(0 if ok else 1)
' "$1"
}
json_first_file() {
  python3 -c '
import json, sys
try:
    doc = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
files = doc.get("files") if isinstance(doc, dict) else None
if not (isinstance(files, list) and files):
    sys.exit(0)
f0 = files[0]
if isinstance(f0, dict):
    p = f0.get("local_path") or ""
    if p: print(p)
elif isinstance(f0, str):
    print(f0)
' "$1"
}

# --- generate one i2v clip per shot (start frame = hero) -----------------------------
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

NATIVE_AUDIO=0
GENERATED=0
i=0
for entry in "${SHOTS[@]}"; do
  i=$(( i + 1 ))
  DUR=${entry%%$'\t'*}
  BODY=${entry#*$'\t'}
  IDX=$(printf '%02d' "$i")
  OUT="$CLIPS_DIR/${IDX}-shot.mp4"
  # Per-shot prompt: the shot's action + camera, plus the positive-constraint suffix.
  PROMPT="${BODY} Maintain the same character identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no flicker."

  err "shot $IDX (${DUR}s): ${BODY:0:70}..."
  RESULT="$TMP/r${IDX}.json"; LOG="$TMP/r${IDX}.log"; rc=0
  ai-gen video "$PROMPT" --image "$HERO" -m "$MODEL" \
    --resolution "$RESOLUTION" --aspect-ratio "$ASPECT" --audio on \
    --max-cost "$MAX_COST" -o "$TMP" --format json "duration=${DUR}" \
    >"$RESULT" 2>"$LOG" || rc=$?

  if [[ $rc -ne 0 ]] || ! json_success "$RESULT"; then
    err "  shot $IDX failed (exit=$rc): $(tr '\n' ' ' <"$LOG" | head -c 240)"
    continue
  fi
  SRC=$(json_first_file "$RESULT")
  if [[ -z "$SRC" || ! -s "$SRC" ]]; then
    err "  shot $IDX: success but no file on disk — skipping"
    continue
  fi
  mv "$SRC" "$OUT"
  GENERATED=$(( GENERATED + 1 ))
  HAS_A=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$OUT" | head -n1 || true)
  [[ -n "$HAS_A" ]] && NATIVE_AUDIO=$(( NATIVE_AUDIO + 1 ))
  err "  shot $IDX OK (audio: ${HAS_A:-none})"
done

[[ "$GENERATED" -ge 1 ]] || { err "every shot failed to generate — fallback cannot produce an episode"; exit 1; }

# --- normalize every clip to a uniform layout (uniform re-encode BEFORE concat) ------
mkdir -p "$TMP/norm"
VNORM="fps=24,scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p"
n=0
shopt -s nullglob
for CLIP in "$CLIPS_DIR"/*-shot.mp4; do
  n=$(( n + 1 ))
  NORM=$(printf '%s/norm/%03d.mp4' "$TMP" "$n")
  HAS_A=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$CLIP" | head -n1 || true)
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
shopt -u nullglob

# --- concat in shot order (demuxer; re-encode on edge-case failure) ------------------
LIST="$TMP/concat.txt"
for f in "$TMP"/norm/*.mp4; do printf "file '%s'\n" "$f" >>"$LIST"; done
CONCAT="$TMP/episode-concat.mp4"
if ! ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" -c copy "$CONCAT"; then
  err "stream-copy concat failed — re-encoding the concat (slower, always works)"
  ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -ar 48000 -ac 2 \
    -movflags +faststart "$CONCAT" || { err "concat failed even with re-encode"; exit 1; }
fi

# --- room tone ONLY if a shot lacked native audio (never double up) ------------------
AUDIO_TREATMENT="native"
if [[ "$NATIVE_AUDIO" -eq 0 ]]; then
  err "no shot carried native audio — mixing a quiet brown-noise room-tone bed (avoid dead silence)"
  ffmpeg -y -hide_banner -loglevel error -i "$CONCAT" \
    -f lavfi -i "anoisesrc=colour=brown:r=48000:a=1.0" \
    -filter_complex "[1:a]volume=-38dB,pan=stereo|c0=c0|c1=c0[rt];[0:a][rt]amix=inputs=2:duration=first:normalize=0[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -ar 48000 -ac 2 \
    -movflags +faststart "$EPISODE" || { err "room-tone mix failed"; exit 1; }
  AUDIO_TREATMENT="roomtone"
else
  if [[ "$NATIVE_AUDIO" -lt "$n" ]]; then AUDIO_TREATMENT="mixed"; fi
  cp "$CONCAT" "$EPISODE"
fi

# --- ffprobe verify -------------------------------------------------------------------
DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$EPISODE" 2>/dev/null || echo 0)
HAS_VIDEO=$(ffprobe -v error -select_streams v -show_entries stream=codec_type -of csv=p=0 "$EPISODE" | head -n1 || true)
HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$EPISODE" | head -n1 || true)
VERDICT=PASS
[[ -n "$HAS_VIDEO" && -n "$HAS_AUDIO" && "$GENERATED" -eq "${#SHOTS[@]}" ]] || VERDICT=FLAG

printf '{"file":"%s","route":"per-shot-fallback","shots":%s,"generated":%s,"duration_s":%.1f,"audio":"%s","verdict":"%s"}\n' \
  "$EPISODE" "${#SHOTS[@]}" "$GENERATED" "$DUR" "$AUDIO_TREATMENT" "$VERDICT"
err "fallback episode delivered: $EPISODE (${DUR}s, ${GENERATED}/${#SHOTS[@]} shots, audio=${AUDIO_TREATMENT}, verdict=$VERDICT)"
exit 0
