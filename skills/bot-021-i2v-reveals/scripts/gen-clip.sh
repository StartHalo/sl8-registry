#!/usr/bin/env bash
#
# gen-clip.sh — generate ONE optional cinematic i2v reveal FROM a real listing photo
# (the photo is the start frame; only the virtual camera moves). Motion-only prompt +
# a hard anti-warp guard. If the model fails / is unreachable / over budget, it FALLS
# BACK to the deterministic Ken-Burns still-segment (and FLAGS it) — a generated clip
# that altered the property is never silently shipped.
#
# Usage:
#   gen-clip.sh "<motion-only prompt>" <photo> <out.mp4> \
#     [--model bytedance/seedance-2.0/fast/image-to-video] [--fallback fal-ai/kling-video/v3/pro/image-to-video] \
#     [--duration 5|10] [--aspect 16:9|9:16] [--resolution 720p] [--max-cost 400] [--work work/clip] [--still-fallback]
#
# Prints on success:  <model-id>\t<out-path>   (or  still-segment\t<out-path>  on the deterministic fallback)
# Exit 0 = a clip exists (generated or still-fallback). Exit 1 = nothing produced. Exit 2 = usage/deps.

set -euo pipefail
err() { printf 'gen-clip: %s\n' "$*" >&2; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for dep in ai-gen python3; do command -v "$dep" >/dev/null 2>&1 || { err "missing: $dep"; exit 2; }; done

[[ $# -ge 3 ]] || { err 'usage: gen-clip.sh "<prompt>" <photo> <out.mp4> [opts]'; exit 2; }
PROMPT=$1; PHOTO=$2; OUT=$3; shift 3
MODEL="bytedance/seedance-2.0/fast/image-to-video"
FALLBACK="fal-ai/kling-video/v3/pro/image-to-video"
DURATION=5; ASPECT="16:9"; RESOLUTION="720p"; MAX_COST="400"; WORK="work/clip"; STILL_FB=no
while [[ $# -gt 0 ]]; do case "$1" in
  --model) MODEL=$2; shift 2 ;; --fallback) FALLBACK=$2; shift 2 ;;
  --duration) DURATION=$2; shift 2 ;; --aspect) ASPECT=$2; shift 2 ;;
  --resolution) RESOLUTION=$2; shift 2 ;; --max-cost) MAX_COST=$2; shift 2 ;;
  --work) WORK=$2; shift 2 ;; --still-fallback) STILL_FB=yes; shift ;;
  *) err "unknown arg: $1"; exit 2 ;;
esac; done

case "$PHOTO" in https://*) : ;; *) [[ -s "$PHOTO" ]] || { err "photo missing: $PHOTO"; exit 2; } ;; esac
[[ "$DURATION" =~ ^(5|10)$ ]] || { err "duration must be 5 or 10 (i2v models snap to these)"; DURATION=5; }
mkdir -p "$WORK" "$(dirname "$OUT")"

# Hard anti-warp guard appended to every motion prompt (the §4 negative-prompt discipline,
# inlined because --negative is unverified on the proxy). Motion-only keeps geometry rigid.
GUARD="Keep ALL architecture perfectly rigid and straight — do not warp, bend, ripple, or distort walls, windows, doorframes, floors, or ceilings; no morphing, no floating furniture, no melting lines; the building geometry is fixed, only the camera moves."
FULL="${PROMPT}. ${GUARD}"

first_local_path() { python3 -c '
import json,sys
try: doc=json.load(sys.stdin)
except Exception: sys.exit(0)
files=doc.get("files") if isinstance(doc,dict) else None
if not (isinstance(files,list) and files): sys.exit(0)
f0=files[0]
if isinstance(f0,dict):
    p=f0.get("local_path") or ""
    if p: print(p)
elif isinstance(f0,str): print(f0)
'; }

attempt() {
  local model=$1 slug; slug="$(printf '%s' "$model" | tr -c 'a-zA-Z0-9' '-')"
  local j="$WORK/${slug}.json" log="$WORK/${slug}.log"
  # seedance has native audio (--audio on); kling is silent (no --audio). duration is a positional token.
  local args=(video "$FULL" --image "$PHOTO" -m "$model" --aspect-ratio "$ASPECT" --resolution "$RESOLUTION"
              --max-cost "$MAX_COST" -o "$WORK" --format json --timeout 900000 "duration=${DURATION}")
  case "$model" in *seedance*) args+=(--audio on) ;; esac
  err "attempt: ai-gen video -m $model --image <photo> duration=${DURATION} (${ASPECT}, ${RESOLUTION})"
  if ! ai-gen "${args[@]}" >"$j" 2>"$log"; then
    err "model $model failed — tail:"; tail -n 5 "$log" >&2 2>/dev/null || true; return 1
  fi
  local raw; raw="$(first_local_path <"$j" || true)"
  [[ -n "$raw" && -s "$raw" ]] || { err "$model: success but no file on disk"; return 1; }
  cp -f "$raw" "$OUT"; printf '%s' "$model"; return 0
}

ai-gen balance >"$WORK/balance-before.txt" 2>/dev/null || true
USED=""
if USED="$(attempt "$MODEL")"; then :
elif [[ -n "$FALLBACK" && "$FALLBACK" != "$MODEL" ]] && USED="$(attempt "$FALLBACK")"; then :
else
  if [[ "$STILL_FB" == yes ]]; then
    err "all i2v models failed — falling back to the DETERMINISTIC Ken-Burns still-segment (FLAG: not a generated reveal)"
    ASPECT="$ASPECT" "$HERE/still-segment.sh" "$PHOTO" "$DURATION" "$OUT" && exit 0 || { err "still-segment fallback also failed"; exit 1; }
  fi
  err "i2v failed and no --still-fallback — record blocked + FLAG"; exit 1
fi
[[ -s "$OUT" ]] || { err "internal: no output after success"; exit 1; }
err "i2v clip written: $OUT (model $USED) — vision-grade for warp/melt before shipping"
printf '%s\t%s\n' "$USED" "$OUT"
