#!/usr/bin/env bash
# gen-image.sh — generate ONE image by walking a pinned model fallback chain.
#
# Usage:
#   gen-image.sh <prompt-file> <out-dir> <stable-name> [--seed N] [--chain stills|text] [--size SIZE]
#
# Composes NOTHING: the prompt arrives fully assembled in <prompt-file> (the 5-block
# prompt is the caller's job). Walks the requested chain IN ORDER — never improvises
# out-of-chain models. On success prints exactly one line to stdout:
#
#   model<TAB>local-path<TAB>fal.media-url
#
# and exits 0. All diagnostics go to stderr. Exits 1 when every model in the chain
# has failed (the caller records the failure and moves on / skips the beat).
#
# Chains (pinned 2026-06-09 — keep in sync with SKILL.md):
#   stills: fal-ai/flux-dev -> fal-ai/flux-pro -> fal-ai/recraft-v3 -> fal-ai/stable-diffusion-v35-large
#   text:   fal-ai/ideogram/v3 -> fal-ai/stable-diffusion-v35-large
#
# Quirks handled here:
#   - recraft-v3 has a hard 1,000-char prompt limit and charges credits even on
#     failure. Truncating would amputate the negatives block (it sits at the end of
#     the 5-block prompt), so for prompts >950 chars recraft is SKIPPED, not trimmed.
#   - recraft-v3 outputs .webp — converted to the requested extension via ffmpeg.
#   - A success response can lack the hosted fal.media URL (the i2v contract needs
#     it) — retried once on the same model, then the chain walks on.

set -euo pipefail

die()  { echo "gen-image.sh: ERROR: $*" >&2; exit 1; }
note() { echo "gen-image.sh: $*" >&2; }

command -v ai-gen >/dev/null 2>&1 || die "ai-gen CLI not found on PATH (expected pre-installed in the sl8-animation sandbox)"
command -v python3 >/dev/null 2>&1 || die "python3 not found on PATH (needed for JSON parsing — jq is NOT available in the sl8-animation sandbox)"

[ $# -ge 3 ] || die "usage: gen-image.sh <prompt-file> <out-dir> <stable-name> [--seed N] [--chain stills|text] [--size SIZE]"

PROMPT_FILE=$1; OUT_DIR=$2; STABLE_NAME=$3; shift 3
SEED=""; CHAIN="stills"; SIZE="landscape_16_9"

while [ $# -gt 0 ]; do
  case "$1" in
    --seed)  SEED=${2:?--seed requires a value};  shift 2 ;;
    --chain) CHAIN=${2:?--chain requires a value}; shift 2 ;;
    --size)  SIZE=${2:?--size requires a value};  shift 2 ;;
    *) die "unknown argument: $1" ;;
  esac
done

[ -f "$PROMPT_FILE" ] || die "prompt file not found: $PROMPT_FILE"
PROMPT=$(cat "$PROMPT_FILE")
[ -n "$PROMPT" ] || die "prompt file is empty: $PROMPT_FILE"
mkdir -p "$OUT_DIR"

case "$CHAIN" in
  stills) MODELS=("fal-ai/flux-dev" "fal-ai/flux-pro" "fal-ai/recraft-v3" "fal-ai/stable-diffusion-v35-large") ;;
  text)   MODELS=("fal-ai/ideogram/v3" "fal-ai/stable-diffusion-v35-large") ;;
  *) die "unknown chain '$CHAIN' (expected: stills | text)" ;;
esac

PROMPT_LEN=${#PROMPT}

# Hosted-URL extraction (python3 — jq is NOT available in the sandbox): walk the
# WHOLE parsed response depth-first and print the first string anywhere in it that
# starts with https://fal.media. Shape-proof: works whether .data is an object, an
# array of {url}, or the URL lives somewhere else entirely.
extract_url() {
  python3 -c '
import json, sys

def walk(node):
    if isinstance(node, str):
        if node.startswith("https://fal.media"):
            yield node
    elif isinstance(node, dict):
        for v in node.values():
            yield from walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from walk(v)

try:
    doc = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for url in walk(doc):
    print(url)
    break
' <<<"$1"
}

# Success/local-file parse: prints .files[0] when the response is valid JSON with
# success == true and a non-empty files array; prints nothing otherwise.
first_file_if_success() {
  python3 -c '
import json, sys
try:
    doc = json.load(sys.stdin)
except Exception:
    sys.exit(0)
if isinstance(doc, dict) and doc.get("success") is True:
    files = doc.get("files")
    if isinstance(files, list) and files and isinstance(files[0], str):
        print(files[0])
' <<<"$1"
}

# Attempt one generation. Prints "localfile<TAB>url" (url may be empty) on a
# generation that produced a file; returns 1 on outright failure.
attempt_model() {
  local model=$1 raw local_file url
  local args=(image "$PROMPT" -m "$model" -s "$SIZE" -o "$OUT_DIR" --format json)
  if [ -n "$SEED" ]; then args+=(--seed "$SEED"); fi
  if ! raw=$(ai-gen "${args[@]}"); then
    note "  $model: ai-gen exited non-zero"
    return 1
  fi
  local_file=$(first_file_if_success "$raw")
  if [ -z "$local_file" ]; then
    note "  $model: response is not success=true with a local file"
    return 1
  fi
  if [ ! -f "$local_file" ]; then
    note "  $model: success=true but reported file is missing on disk: $local_file"
    return 1
  fi
  url=$(extract_url "$raw")
  printf '%s\t%s\n' "$local_file" "$url"
}

# Move the generated file to its stable name; convert when the extension differs
# (recraft-v3 emits .webp but the path contract wants .png). Returns 1 (never dies)
# on a failed conversion so the caller can walk to the next model.
finalize() {
  local src=$1
  local src_ext="${src##*.}" dst_ext="${STABLE_NAME##*.}" dst="$OUT_DIR/$STABLE_NAME"
  if [ "$src_ext" != "$dst_ext" ] && command -v ffmpeg >/dev/null 2>&1; then
    note "converting .$src_ext -> .$dst_ext via ffmpeg"
    if ! ffmpeg -y -loglevel error -i "$src" "$dst"; then
      note "  ffmpeg conversion failed (.$src_ext -> .$dst_ext) — discarding $src and walking to the next model"
      rm -f "$src"
      return 1
    fi
    rm -f "$src"
  else
    [ "$src_ext" = "$dst_ext" ] || note "WARNING: extension mismatch (.$src_ext -> .$dst_ext) and no ffmpeg — renaming as-is"
    if [ "$src" != "$dst" ]; then mv -f "$src" "$dst"; fi
  fi
}

for model in "${MODELS[@]}"; do
  if [ "$model" = "fal-ai/recraft-v3" ] && [ "$PROMPT_LEN" -gt 950 ]; then
    note "skipping fal-ai/recraft-v3: prompt is ${PROMPT_LEN} chars (>950 safety cap against the model's 1,000-char limit; truncating would amputate the negatives block) — note this skip in the log"
    continue
  fi
  for try in 1 2; do
    note "attempting $model (try $try/2)"
    if result=$(attempt_model "$model"); then
      local_file=${result%%$'\t'*}
      url=${result#*$'\t'}
      if [ -z "$url" ]; then
        if [ "$try" -eq 1 ]; then
          note "  $model: generated but no fal.media URL in response — regenerating once (URL is the i2v contract)"
          rm -f "$local_file"
          continue
        fi
        note "  $model: still no hosted URL after retry — walking to next model"
        rm -f "$local_file"
        break
      fi
      if ! finalize "$local_file"; then
        break # conversion failure -> next model (same treatment as a missing URL)
      fi
      printf '%s\t%s\t%s\n' "$model" "$OUT_DIR/$STABLE_NAME" "$url"
      exit 0
    fi
    break # outright failure -> next model (availability failures don't heal on retry)
  done
done

die "all models in the '$CHAIN' chain failed for $STABLE_NAME (tried in order: ${MODELS[*]}). Record this in the log / state.md — do not improvise out-of-chain models."
