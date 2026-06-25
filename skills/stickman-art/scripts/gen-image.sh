#!/usr/bin/env bash
# gen-image.sh — generate ONE image by walking a pinned model fallback chain.
#
# Usage:
#   gen-image.sh <prompt-file> <out-dir> <stable-name> \
#       [--seed N] [--chain stills|text] [--size SIZE] [--aspect-ratio AR] \
#       [--ref <path|url> ...] [--max-cost CREDITS]
#
# Composes NOTHING: the prompt arrives fully assembled in <prompt-file> (the 5-block
# prompt is the caller's job). Walks the requested chain IN ORDER — never improvises
# out-of-chain models. On success prints exactly one line to stdout:
#
#   model<TAB>local-path<TAB>hosted-url
#
# and exits 0. All diagnostics go to stderr. Exits 1 when every model in the chain
# has failed (the caller records the failure and moves on / skips the beat).
#
# Chains (pinned 2026-06-15 for ai-gen v2.1.0 — keep in sync with SKILL.md):
#   stills: fal-ai/nano-banana-pro -> fal-ai/flux-dev -> fal-ai/stable-diffusion-v35-large
#   text:   fal-ai/nano-banana-pro -> fal-ai/ideogram/v3
#
# CHARACTER LOCK (the #1 prior quality miss — identity drift):
#   --ref <path|url> carries the source figure into every later generation (the PDF's
#   "show me THIS stickman" method). Refs are passed ONLY to the ref-capable model
#   (nano-banana-pro, ≤14 image refs); diffusion fallbacks ignore them. Pass the
#   source.png on the turnaround and on every beat still.
#
# ai-gen v2.1.0 mechanics handled here:
#   - JSON contract: files[] are OBJECTS ({local_path,url,...}); hosted_urls[0] is the
#     fixed hosted-URL field regardless of model. We read both; never regex the raw blob.
#   - nano-banana-pro takes aspect_ratio (--aspect-ratio), NOT -s size presets; the
#     diffusion fallbacks take -s presets. We shape args per-model.
#   - --max-cost is in CREDITS (1 cr ~= $0.004). A failed generation is not charged.
#   - A success response can (rarely) lack a hosted URL (the i2v contract needs it) —
#     retried once on the same model, then the chain walks on.
#   - .webp safety net: convert to the requested extension via ffmpeg if a model emits it.

set -euo pipefail

die()  { echo "gen-image.sh: ERROR: $*" >&2; exit 1; }
note() { echo "gen-image.sh: $*" >&2; }

command -v ai-gen >/dev/null 2>&1 || die "ai-gen CLI not found on PATH (expected pre-installed in the sandbox)"
command -v python3 >/dev/null 2>&1 || die "python3 not found on PATH (needed for JSON parsing — jq is NOT available in the sandbox)"

[ $# -ge 3 ] || die "usage: gen-image.sh <prompt-file> <out-dir> <stable-name> [--seed N] [--chain stills|text] [--size SIZE] [--aspect-ratio AR] [--ref P ...] [--max-cost CREDITS]"

PROMPT_FILE=$1; OUT_DIR=$2; STABLE_NAME=$3; shift 3
SEED=""; CHAIN="stills"; SIZE="landscape_16_9"; ASPECT=""; MAXCOST=""
REFS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --seed)          SEED=${2:?--seed requires a value};          shift 2 ;;
    --chain)         CHAIN=${2:?--chain requires a value};        shift 2 ;;
    --size)          SIZE=${2:?--size requires a value};          shift 2 ;;
    --aspect-ratio)  ASPECT=${2:?--aspect-ratio requires a value};shift 2 ;;
    --max-cost)      MAXCOST=${2:?--max-cost requires a value};   shift 2 ;;
    --ref)           REFS+=("${2:?--ref requires a value}");      shift 2 ;;
    *) die "unknown argument: $1" ;;
  esac
done

[ -f "$PROMPT_FILE" ] || die "prompt file not found: $PROMPT_FILE"
PROMPT=$(cat "$PROMPT_FILE")
[ -n "$PROMPT" ] || die "prompt file is empty: $PROMPT_FILE"
mkdir -p "$OUT_DIR"

# Derive an aspect ratio from the size preset when the caller didn't pass one
# (nano-banana-pro needs aspect_ratio, not the -s preset the diffusion models use).
if [ -z "$ASPECT" ]; then
  case "$SIZE" in
    landscape_16_9) ASPECT="16:9" ;;
    landscape_4_3)  ASPECT="4:3"  ;;
    portrait_16_9)  ASPECT="9:16" ;;
    portrait_4_3)   ASPECT="3:4"  ;;
    square_hd|square) ASPECT="1:1" ;;
    *) ASPECT="16:9" ;;
  esac
fi

case "$CHAIN" in
  stills) MODELS=("fal-ai/nano-banana-pro" "fal-ai/flux-dev" "fal-ai/stable-diffusion-v35-large") ;;
  text)   MODELS=("fal-ai/nano-banana-pro" "fal-ai/ideogram/v3") ;;
  *) die "unknown chain '$CHAIN' (expected: stills | text)" ;;
esac

# Local-file parse: prints files[0].local_path when the response is success=true with
# a non-empty files array. v2.1.0 files[] entries are OBJECTS ({local_path,url,...});
# we also accept a bare-string entry for forward/backward safety.
first_file_if_success() {
  python3 -c '
import json, sys
try:
    doc = json.load(sys.stdin)
except Exception:
    sys.exit(0)
if not (isinstance(doc, dict) and doc.get("success") is True):
    sys.exit(0)
files = doc.get("files")
if not (isinstance(files, list) and files):
    sys.exit(0)
f0 = files[0]
if isinstance(f0, dict):
    p = f0.get("local_path") or ""
    if p: print(p)
elif isinstance(f0, str):
    print(f0)
' <<<"$1"
}

# Hosted-URL extraction: prefer the stable hosted_urls[0] field; fall back to walking
# the whole response for the first *.fal.media string (any subdomain). Shape-proof.
extract_url() {
  python3 -c '
import json, re, sys
def walk(node):
    if isinstance(node, str):
        if re.match(r"https://([a-z0-9-]+\.)*fal\.media/", node):
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
hu = doc.get("hosted_urls") if isinstance(doc, dict) else None
if isinstance(hu, list) and hu and isinstance(hu[0], str):
    print(hu[0]); sys.exit(0)
for url in walk(doc):
    print(url); break
' <<<"$1"
}

# Attempt one generation. Prints "localfile<TAB>url" (url may be empty) on a
# generation that produced a file; returns 1 on outright failure.
attempt_model() {
  local model=$1 raw local_file url
  local args=(image "$PROMPT" -m "$model" -o "$OUT_DIR" --format json)
  # Size vs aspect_ratio differs by model family.
  case "$model" in
    *nano-banana-pro*) args+=(--aspect-ratio "$ASPECT") ;;
    *)                 args+=(-s "$SIZE") ;;
  esac
  # Reference images: only the ref-capable model consumes them (the character lock).
  case "$model" in
    *nano-banana-pro*) for r in "${REFS[@]:-}"; do [ -n "$r" ] && args+=(--ref "$r"); done ;;
  esac
  if [ -n "$SEED" ];    then args+=(--seed "$SEED"); fi
  if [ -n "$MAXCOST" ]; then args+=(--max-cost "$MAXCOST"); fi
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
# (a model may emit .webp but the path contract wants .png). Returns 1 (never dies)
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
  for try in 1 2; do
    note "attempting $model (try $try/2)"
    if result=$(attempt_model "$model"); then
      local_file=${result%%$'\t'*}
      url=${result#*$'\t'}
      if [ -z "$url" ]; then
        if [ "$try" -eq 1 ]; then
          note "  $model: generated but no hosted URL in response — regenerating once (URL is the i2v contract)"
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
