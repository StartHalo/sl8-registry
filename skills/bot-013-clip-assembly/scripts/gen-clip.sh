#!/usr/bin/env bash
#
# gen-clip.sh — generate ONE image-to-video beat clip, walking the documented
# fallback chain in order. Queue-aware (15-min timeout), retries once on
# timeout, retries once without the duration pass-through if a model rejects
# it. NEVER improvises outside the chain.
#
# Usage:
#   gen-clip.sh <prompt-file> <image (https URL | local path)> <duration 5|10> <out-path.mp4>
#
# Env knobs (all optional):
#   CLIP_CHAIN       space-separated model ids overriding the default chain.
#   CLIP_RESOLUTION  480p | 720p   (default 720p; seedance/fast has NO 1080p)
#   CLIP_AUDIO       on | off      (default on — seedance generates NATIVE audio)
#   CLIP_ASPECT      16:9 | 9:16 | 1:1 | auto (default 16:9)
#   CLIP_MAX_COST    credit cap per call passed to --max-cost (default 360;
#                    720p/5s estimates ~303 cr ≈ $1.21; 1 cr ≈ $0.004)
#
# Default chain (pinned 2026-06-15 for ai-gen v2.1.0 — keep in sync with SKILL.md):
#   bytedance/seedance-2.0/fast/image-to-video   (DEFAULT — animates + native audio)
#   fal-ai/kling-video/v3/pro/image-to-video     (fallback — unverified; no charge if 404)
# The old kling-i2v/minimax-i2v/wan-i2v/runway-gen3 chain is DEAD (all 404 upstream).
#
# On success prints exactly ONE line to stdout:
#   <model-id>\t<out-path>
# Everything else goes to stderr. Non-zero exit = every model in the chain
# failed → caller falls back to still-segment.sh and FLAGS the beat.

set -euo pipefail

err() { printf 'gen-clip: %s\n' "$*" >&2; }

# jq is NOT available in the sandbox — JSON parsing uses python3.
for dep in ai-gen python3; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8 video/animation sandbox?)"; exit 2; }
done

# Exit 0 iff $1 is valid JSON with success==true and a non-empty files array.
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

# Print files[0].local_path from the JSON file $1, or nothing (never a non-zero exit).
# v2.1.0 files[] entries are OBJECTS ({local_path,url,...}); also accept a bare string.
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

if [[ $# -ne 4 ]]; then
  err "usage: gen-clip.sh <prompt-file> <image (https URL | local path)> <duration 5|10> <out-path.mp4>"
  exit 2
fi

PROMPT_FILE=$1
IMAGE_INPUT=$2
DURATION=$3
OUT_PATH=$4

RESOLUTION=${CLIP_RESOLUTION:-720p}
AUDIO=${CLIP_AUDIO:-on}
ASPECT=${CLIP_ASPECT:-16:9}
MAX_COST=${CLIP_MAX_COST:-360}

[[ -s "$PROMPT_FILE" ]] || { err "prompt file missing or empty: $PROMPT_FILE"; exit 2; }
# v2.1.0 (FR-4) uploads local files transparently via fal storage — accept an https
# URL OR an existing local still path. Reject only if it is neither.
case "$IMAGE_INPUT" in
  https://*) : ;;
  *) [[ -s "$IMAGE_INPUT" ]] || { err "image input must be an https URL or an existing local file: $IMAGE_INPUT"; exit 2; } ;;
esac
[[ "$DURATION" == "5" || "$DURATION" == "10" ]] \
  || { err "duration must be 5 or 10 (beat granularity): $DURATION"; exit 2; }

CHAIN=${CLIP_CHAIN:-"bytedance/seedance-2.0/fast/image-to-video fal-ai/kling-video/v3/pro/image-to-video"}
PROMPT=$(<"$PROMPT_FILE")

# When native audio is ON, ensure the prompt steers it toward ambient SFX (not a
# music bed or VO). Idempotent — only appended if not already present.
if [[ "$AUDIO" == on ]] && ! grep -qi "AMBIENT SOUND" <<<"$PROMPT"; then
  PROMPT="${PROMPT} NO MUSIC, ONLY AMBIENT SOUND. NO TALKING."
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT
mkdir -p "$(dirname "$OUT_PATH")"

# One generation attempt. $1=model  $2=yes|no (pass duration= through).
# Leaves result.json + attempt.log in $WORKDIR; returns 0 only on JSON success.
attempt() {
  local model=$1 pass_duration=$2 rc=0
  local args=(video "$PROMPT" --image "$IMAGE_INPUT" -m "$model" -o "$WORKDIR" --format json --timeout 900000)
  args+=(--resolution "$RESOLUTION" --aspect-ratio "$ASPECT" --audio "$AUDIO" --max-cost "$MAX_COST")
  [[ "$pass_duration" == yes ]] && args+=("duration=${DURATION}")
  : >"$WORKDIR/result.json"
  : >"$WORKDIR/attempt.log"
  ai-gen "${args[@]}" >"$WORKDIR/result.json" 2>"$WORKDIR/attempt.log" || rc=$?
  if [[ $rc -ne 0 ]]; then
    # keep whatever the CLI printed so the failure classifier can read it
    cat "$WORKDIR/result.json" >>"$WORKDIR/attempt.log" 2>/dev/null || true
    return 1
  fi
  json_success "$WORKDIR/result.json"
}

# Move the generated file to its stable name and print the contract line.
deliver() {
  local model=$1 file
  file=$(json_first_file "$WORKDIR/result.json")
  if [[ -z "$file" || ! -s "$file" ]]; then
    err "$model: success reported but no output file on disk — treating as failure"
    return 1
  fi
  mv "$file" "$OUT_PATH"
  printf '%s\t%s\n' "$model" "$OUT_PATH"
  exit 0
}

failure_mentions() {
  grep -qiE "$1" "$WORKDIR/attempt.log" "$WORKDIR/result.json" 2>/dev/null
}

for MODEL in $CHAIN; do
  err "trying $MODEL (${RESOLUTION}/${DURATION}s, audio=${AUDIO}, max-cost ${MAX_COST}cr, timeout 900s, queue-aware)"
  if attempt "$MODEL" yes; then
    deliver "$MODEL" || true
  elif failure_mentions 'timed? ?out|timeout|ETIMEDOUT'; then
    err "$MODEL: timed out — queue congestion is transient, retrying this model once"
    if attempt "$MODEL" yes; then deliver "$MODEL" || true; fi
  elif failure_mentions 'duration|unprocessable|invalid|validation'; then
    err "$MODEL: rejected parameters — retrying WITHOUT duration pass-through"
    err "  (clip will run at the model's default length — disclose this in 05-summary.md)"
    if attempt "$MODEL" no; then deliver "$MODEL" || true; fi
  fi
  err "$MODEL failed — falling back to the next model in the chain (no out-of-chain improvisation)"
done

err "all models in the chain failed for this beat: $CHAIN"
err "fall back to scripts/still-segment.sh on the LOCAL still and FLAG the beat in 05-summary.md"
exit 1
