#!/usr/bin/env bash
#
# gen-clip.sh — generate ONE image-to-video beat clip, walking the documented
# fallback chain in order. Queue-aware (15-min timeout), retries once on
# timeout, retries once without the duration pass-through if a model rejects
# it. NEVER improvises outside the chain.
#
# Usage:
#   gen-clip.sh <prompt-file> <image-url> <duration 5|10> <out-path.mp4>
#
# Env:
#   CLIP_CHAIN  space-separated model ids overriding the default chain.
#               Prepend a discovered fal-ai/bytedance/seedance/* id to run the
#               Seedance dialect (see references/seedance-dialect.md).
#
# On success prints exactly ONE line to stdout:
#   <model-id>\t<out-path>
# Everything else goes to stderr. Non-zero exit = every model in the chain
# failed → caller falls back to still-segment.sh and FLAGS the beat.

set -euo pipefail

err() { printf 'gen-clip: %s\n' "$*" >&2; }

# jq is NOT available in the sl8-animation sandbox — JSON parsing uses python3.
for dep in ai-gen python3; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this the sl8-animation sandbox?)"; exit 2; }
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

# Print .files[0] from the JSON file $1, or nothing (never a non-zero exit).
json_first_file() {
  python3 -c '
import json, sys
try:
    doc = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
files = doc.get("files") if isinstance(doc, dict) else None
if isinstance(files, list) and files and isinstance(files[0], str):
    print(files[0])
' "$1"
}

if [[ $# -ne 4 ]]; then
  err "usage: gen-clip.sh <prompt-file> <image-url> <duration 5|10> <out-path.mp4>"
  exit 2
fi

PROMPT_FILE=$1
IMAGE_URL=$2
DURATION=$3
OUT_PATH=$4

[[ -s "$PROMPT_FILE" ]] || { err "prompt file missing or empty: $PROMPT_FILE"; exit 2; }
case "$IMAGE_URL" in
  https://*) : ;;
  *) err "image input must be a hosted https URL (i2v models reject local paths): $IMAGE_URL"; exit 2 ;;
esac
[[ "$DURATION" == "5" || "$DURATION" == "10" ]] \
  || { err "duration must be 5 or 10 (model granularity): $DURATION"; exit 2; }

# runway-gen3 is deprecated upstream but has been the ONLY i2v model the proxy
# actually routes (run 2026-06-10) — kept as documented LAST resort; its use is a
# disclosure item in 05-summary.md.
CHAIN=${CLIP_CHAIN:-"fal-ai/kling-i2v fal-ai/minimax-i2v fal-ai/wan-i2v fal-ai/runway-gen3"}
PROMPT=$(<"$PROMPT_FILE")
WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT
mkdir -p "$(dirname "$OUT_PATH")"

# One generation attempt. $1=model  $2=yes|no (pass duration= through).
# Leaves result.json + attempt.log in $WORKDIR; returns 0 only on JSON success.
attempt() {
  local model=$1 pass_duration=$2 rc=0
  local args=(video "$PROMPT" --image "$IMAGE_URL" -m "$model" -o "$WORKDIR" --format json --timeout 900000)
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
  err "trying $MODEL (duration=${DURATION}s, timeout 900s, queue-aware)"
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
