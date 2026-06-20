#!/usr/bin/env bash
#
# gen-kling-cinematic.sh — render a cinematic shot-list with the Kling 3.0 engine, the
# PER-SHOT way (this IS the primary path for Kling, NOT a fallback). For EACH numbered
# time-coded [Xs-Ys]: shot it (1) generates a per-shot START KEYFRAME with nano-banana-pro
# (the shot scene composed with the bible's verbatim character tokens, the reference-sheet +
# hero passed as --ref so the SAME character appears), then (2) animates that keyframe with a
# Kling image-to-video call. The per-shot clips are written under <project-dir>/work-shots/,
# then scripts/assemble.sh normalizes + concats them and adds a room-tone bed → episode.mp4.
#
# This is a DIFFERENT architecture from BOT-027's Seedance director: Seedance carries the
# WHOLE shot-list across cuts in ONE reference-to-video pass with native audio; Kling here
# renders each shot separately and stitches, with cross-shot identity resting on the shared
# bible keyframes + verbatim tokens, and a room-tone bed instead of native audio. The caller
# MUST disclose this in summary.md. Never silent, never equivalent.
#
# Donor lineage: BOT-027 character-bible scripts/gen-image.sh (nano-banana-pro keyframe),
# BOT-013 clip-assembly scripts/gen-clip.sh (the Kling i2v slug + duration pass-through),
# BOT-027 seedance-cinematic scripts/per-shot-fallback.sh (per-shot walk + parse).
#
# Usage:
#   gen-kling-cinematic.sh <shotlist.md> <reference-sheet.png> <hero.png> <project-dir>
#     <shotlist.md>         the validated cinematic shot-list (parsed for [Xs-Ys]: shots)
#     <reference-sheet.png> the bible turnaround sheet (a --ref for every keyframe)
#     <hero.png>            the bible hero portrait (a --ref for every keyframe)
#     <project-dir>         artifacts/<project-name> — work-shots/ + episode.mp4 live here
#
# Env knobs (all optional):
#   ASPECT       16:9 | 9:16 | 1:1   (default: read from the shot-list Total footer, else 16:9)
#   DURATION     informational total (per-shot durations come from the time-codes)
#   TIER         economy | quality   (default economy — a lower per-call cost cap)
#   KF_MAX_COST  per-keyframe credit cap   (default 120)
#   KLING_MAX_COST per-clip credit cap     (default economy 360, quality 700)
#   KLING_MODEL  i2v slug  (default fal-ai/kling-video/v3/pro/image-to-video)
#   IMG_CHAIN    keyframe image chain  (default the bible chain)
#   NO_ASSEMBLE  if set to 1, stop after generating clips (do not call assemble.sh)
#
# On the clip-generation stage it prints ONE machine-readable JSON line to stdout:
#   {"stage":"clips","shots":N,"generated":G,"clips_dir":"...","keyframes":G}
# then (unless NO_ASSEMBLE=1) it execs assemble.sh, whose JSON verdict line is the FINAL
# stdout line. Diagnostics go to stderr. Non-zero exit = every shot failed (no episode).

set -euo pipefail

err() { printf 'gen-kling-cinematic: %s\n' "$*" >&2; }

for dep in ai-gen python3 ffmpeg ffprobe; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

if [[ $# -ne 4 ]]; then
  err "usage: gen-kling-cinematic.sh <shotlist.md> <reference-sheet.png> <hero.png> <project-dir>"
  exit 2
fi

SHOTLIST=$1
REF_SHEET=$2
REF_HERO=$3
PROJECT_DIR=${4%/}

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# --- validate inputs (headless: a bad input is a clean failure, never a guess) -------
[[ -s "$SHOTLIST"  ]] || { err "shot-list missing or empty: $SHOTLIST"; exit 2; }
[[ -s "$REF_SHEET" ]] || { err "reference sheet missing on disk: $REF_SHEET (run phase 1)"; exit 2; }
[[ -s "$REF_HERO"  ]] || { err "hero image missing on disk: $REF_HERO (run phase 1)"; exit 2; }

TIER=${TIER:-economy}
case "$TIER" in
  economy) DEFAULT_KLING_CAP=360 ;;
  quality) DEFAULT_KLING_CAP=700 ;;
  *) err "TIER must be economy|quality (got '$TIER')"; exit 2 ;;
esac
KF_MAX_COST=${KF_MAX_COST:-120}
KLING_MAX_COST=${KLING_MAX_COST:-$DEFAULT_KLING_CAP}
KLING_MODEL=${KLING_MODEL:-fal-ai/kling-video/v3/pro/image-to-video}
IMG_CHAIN=${IMG_CHAIN:-"fal-ai/nano-banana-pro openai/gpt-image-2 fal-ai/nano-banana-2"}

# --- aspect ratio: env override, else read the shot-list Total footer, else 16:9 -----
if [[ -z "${ASPECT:-}" ]]; then
  ASPECT=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
m = re.search(r"Total:.*?(\d+:\d+)", text)
print(m.group(1) if m else "16:9")
' "$SHOTLIST")
fi
case "$ASPECT" in 16:9|9:16|1:1) : ;; *) err "ASPECT must be 16:9|9:16|1:1 (got '$ASPECT')"; exit 2 ;; esac

# --- pull the identity-lock line + look header for the keyframe prompts ---------------
# The identity line carries the verbatim character tokens; the header carries genre/look.
HEADER=$(python3 -c '
import sys
for line in open(sys.argv[1]):
    s = line.strip()
    if not s or s.startswith("#"):
        continue
    print(s); break
' "$SHOTLIST")
IDENTITY=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
m = re.search(r"@Image1[^\n]*", text)
print(m.group(0) if m else "")
' "$SHOTLIST")
# The character description = the parenthetical / trailing tokens of the identity line.
CHARACTER_TOKENS=$(python3 -c '
import re, sys
line = sys.argv[1]
# Prefer the text inside the first parentheses; else strip the @Image scaffolding.
m = re.search(r"\(([^)]*)\)", line)
if m:
    print(m.group(1).strip()); raise SystemExit
m = re.search(r"for (.+?)(?: —| --| -| maintain)", line)
print(m.group(1).strip() if m else line)
' "$IDENTITY")
[[ -n "$CHARACTER_TOKENS" ]] || CHARACTER_TOKENS="the character"

# --- parse the shot-list into shots: "<snapped-dur>\t<shot text>" per line ------------
mapfile -t SHOTS < <(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
pat = re.compile(r"\[\s*(\d+)\s*s?\s*-\s*(\d+)\s*s\s*\]\s*:\s*(.+)")
for line in text.splitlines():
    m = pat.search(line)
    if not m:
        continue
    a, b, body = int(m.group(1)), int(m.group(2)), m.group(3).strip()
    span = max(1, b - a)
    snapped = 5 if span <= 7 else 10   # Kling i2v is reliable at 5 or 10s
    print(f"{snapped}\t{body}")
' "$SHOTLIST")

[[ ${#SHOTS[@]} -ge 1 ]] || { err "no time-coded [Xs-Ys]: shots found in $SHOTLIST — cannot render"; exit 1; }
err "parsed ${#SHOTS[@]} shots; aspect=$ASPECT tier=$TIER kling=$KLING_MODEL"
err "character tokens: ${CHARACTER_TOKENS:0:80}"

CLIPS_DIR="$PROJECT_DIR/work-shots"
KEYS_DIR="$CLIPS_DIR/keyframes"
mkdir -p "$CLIPS_DIR" "$KEYS_DIR"

# --- JSON helpers (ai-gen v2.1.0; files[] entries are OBJECTS -> files[0].local_path) -
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

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# --- generate ONE start keyframe for a shot via the image chain (NO --resolution) -----
# Args: <prompt> <out.png>.  Prints the produced path on stdout, or nothing on failure.
gen_keyframe() {
  local prompt=$1 out=$2 model raw rc result
  for model in $IMG_CHAIN; do
    result="$TMP/kf.json"; : >"$result"; rc=0
    ai-gen image "$prompt" -m "$model" \
      --ref "$REF_SHEET" --ref "$REF_HERO" \
      --aspect-ratio "$ASPECT" --max-cost "$KF_MAX_COST" \
      -o "$TMP" --format json >"$result" 2>"$TMP/kf.log" || rc=$?
    if [[ $rc -ne 0 ]] || ! json_success "$result"; then
      err "    keyframe model $model failed (exit=$rc) — next in chain"
      continue
    fi
    raw=$(json_first_file "$result")
    if [[ -z "$raw" || ! -s "$raw" ]]; then
      err "    keyframe model $model: success but no file on disk — next in chain"
      continue
    fi
    # normalize extension to .png via ffmpeg if a model emitted .webp
    if [[ "${raw##*.}" != "png" ]]; then
      ffmpeg -y -loglevel error -i "$raw" "$out" 2>/dev/null && { rm -f "$raw"; printf '%s\n' "$out"; return 0; }
      err "    keyframe ext-convert failed for $raw — next in chain"; continue
    fi
    mv -f "$raw" "$out"; printf '%s\n' "$out"; return 0
  done
  return 1
}

GENERATED=0
i=0
for entry in "${SHOTS[@]}"; do
  i=$(( i + 1 ))
  DUR=${entry%%$'\t'*}
  BODY=${entry#*$'\t'}
  IDX=$(printf '%02d' "$i")
  KEYFRAME="$KEYS_DIR/${IDX}-key.png"
  CLIP="$CLIPS_DIR/${IDX}-shot.mp4"

  err "shot $IDX (${DUR}s): ${BODY:0:70}..."

  # (1) keyframe prompt = shot scene/action + verbatim character tokens + look header.
  #     Character large in frame; no text/watermark; the bible refs carry the full look.
  KF_PROMPT="${HEADER} A single cinematic frame: ${BODY} The subject is ${CHARACTER_TOKENS}, the same character as in the reference images, large in frame, clearly lit (avoid very dark lighting). No text, no watermark, no logo."
  if ! KFOUT=$(gen_keyframe "$KF_PROMPT" "$KEYFRAME"); then
    err "  shot $IDX: keyframe could not be generated (whole image chain failed) — skipping shot"
    continue
  fi
  err "  shot $IDX keyframe: $KFOUT"

  # (2) Kling i2v on the keyframe. Lead with camera + action; Kling is SILENT (no --audio).
  MOTION="${BODY} The ${CHARACTER_TOKENS%%,*} stays the same character throughout, large in frame, smooth motion, stable picture, no flicker, no identity drift."
  RESULT="$TMP/r${IDX}.json"; LOG="$TMP/r${IDX}.log"; rc=0
  ai-gen video "$MOTION" --image "$KEYFRAME" -m "$KLING_MODEL" \
    --duration "$DUR" --aspect-ratio "$ASPECT" \
    --max-cost "$KLING_MAX_COST" -o "$TMP" --format json "duration=${DUR}" \
    >"$RESULT" 2>"$LOG" || rc=$?

  # Retry once without the duration pass-through if the model rejected params.
  if { [[ $rc -ne 0 ]] || ! json_success "$RESULT"; } \
     && grep -qiE 'duration|unprocessable|invalid|validation' "$LOG" "$RESULT" 2>/dev/null; then
    err "  shot $IDX: Kling rejected params — retrying WITHOUT the duration pass-through (clip runs at model default; disclose in summary.md)"
    rc=0
    ai-gen video "$MOTION" --image "$KEYFRAME" -m "$KLING_MODEL" \
      --duration "$DUR" --aspect-ratio "$ASPECT" \
      --max-cost "$KLING_MAX_COST" -o "$TMP" --format json \
      >"$RESULT" 2>"$LOG" || rc=$?
  fi

  if [[ $rc -ne 0 ]] || ! json_success "$RESULT"; then
    err "  shot $IDX: Kling i2v failed (exit=$rc): $(tr '\n' ' ' <"$LOG" | head -c 240)"
    continue
  fi
  SRC=$(json_first_file "$RESULT")
  if [[ -z "$SRC" || ! -s "$SRC" ]]; then
    err "  shot $IDX: success but no clip on disk — skipping"
    continue
  fi
  mv -f "$SRC" "$CLIP"
  GENERATED=$(( GENERATED + 1 ))
  err "  shot $IDX OK -> $CLIP (silent — room tone added at assembly)"
done

if [[ "$GENERATED" -lt 1 ]]; then
  err "every shot failed to generate — no usable episode (clean recorded failure)"
  printf '{"stage":"clips","shots":%s,"generated":0,"clips_dir":"%s","keyframes":0}\n' \
    "${#SHOTS[@]}" "$CLIPS_DIR"
  exit 1
fi

printf '{"stage":"clips","shots":%s,"generated":%s,"clips_dir":"%s","keyframes":%s}\n' \
  "${#SHOTS[@]}" "$GENERATED" "$CLIPS_DIR" "$GENERATED"
err "generated $GENERATED/${#SHOTS[@]} shot clips under $CLIPS_DIR"

# --- assemble (unless asked to stop after clips) -------------------------------------
if [[ "${NO_ASSEMBLE:-0}" == "1" ]]; then
  err "NO_ASSEMBLE=1 — stopping after clip generation (run scripts/assemble.sh yourself)"
  exit 0
fi

# Pull the shot-list Audio: line so the room-tone bed can be derived from it.
AUDIO_DESC=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
m = re.search(r"Audio:\s*(.+)", text)
print(m.group(1).strip() if m else "")
' "$SHOTLIST")

err "assembling: normalize -> concat -> room-tone bed -> ffprobe verify"
ASPECT="$ASPECT" AUDIO_DESC="$AUDIO_DESC" bash "$SCRIPT_DIR/assemble.sh" "$PROJECT_DIR"
