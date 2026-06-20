#!/usr/bin/env bash
#
# gen-edit.sh — the single-source ai-gen base-edit wrapper for BOT-020 listing-photo-studio.
#
# Runs ONE listing-photo edit (stage / declutter / twilight / sky / enhance / restyle /
# renovation-concept) by passing the source photo to a reachable fal edit model and
# downloading the result LOCALLY (the *.fal.media URL expires, so we always read
# files[0].local_path immediately — files[] are OBJECTS in ai-gen v2.1.0).
#
# This is the proven base-edit path verified in the BOT-022 PoC (2026-06-19):
#   ai-gen image "<prompt>" -m <model> --image <src> -o <work> --format json \
#     --aspect-ratio <r> --max-cost <n> [resolution=2K]
# `--image` maps to the model's SINGULAR image_url (NOT image_urls[]). `resolution=2K` is a
# POSITIONAL model param (there is NO --resolution flag) and is appended ONLY for nano-banana
# (qwen-image-edit is geometry-preserving and carries the source resolution itself).
#
# Model routing (the locked set):
#   - staging / twilight / sky / enhance / restyle / renovation  -> fal-ai/nano-banana-pro
#   - declutter / object-removal                                 -> fal-ai/qwen-image-edit
#     (Nano Banana Pro is WEAK at removal — never route a removal through it.)
# The caller picks the model with --model; the fallback (--fallback) is tried on failure.
#
# Usage:
#   gen-edit.sh <prompt> <source-image (jpg|png|url)> <out.jpg> \
#     [--model fal-ai/nano-banana-pro] [--fallback fal-ai/qwen-image-edit] \
#     [--aspect landscape_4_3] [--max-cost 60] [--resolution 2K] [--work work/edit]
#
# Exit:
#   0  edit written to <out.jpg> (model id printed to stdout as "<model>\t<out>")
#   1  every model in the chain failed / unreachable (caller records blocked + FLAG;
#      NEVER substitute a worse out-of-chain model)
#   2  usage / missing dependency
#
# Everything except the final "<model>\t<out>" line goes to stderr.

set -euo pipefail

err() { printf 'gen-edit: %s\n' "$*" >&2; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for dep in ai-gen python3; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

if [[ $# -lt 3 ]]; then
  err "usage: gen-edit.sh <prompt> <source-image> <out.jpg> [--model M] [--fallback M2] [--aspect R] [--max-cost N] [--resolution 2K] [--work DIR]"
  exit 2
fi

PROMPT=$1; SRC=$2; OUT=$3; shift 3

MODEL="fal-ai/nano-banana-pro"
FALLBACK=""
ASPECT="landscape_4_3"
MAX_COST="60"
RESOLUTION="2K"
WORK="work/edit"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)      MODEL=$2; shift 2 ;;
    --fallback)   FALLBACK=$2; shift 2 ;;
    --aspect)     ASPECT=$2; shift 2 ;;
    --max-cost)   MAX_COST=$2; shift 2 ;;
    --resolution) RESOLUTION=$2; shift 2 ;;
    --work)       WORK=$2; shift 2 ;;
    *) err "unknown arg: $1"; exit 2 ;;
  esac
done

# Source must be a readable local file OR an https URL (v2.1.0 uploads locals).
case "$SRC" in
  https://*) : ;;
  *) [[ -s "$SRC" ]] || { err "source must be an https URL or an existing local file: $SRC"; exit 2; } ;;
esac

mkdir -p "$WORK" "$(dirname "$OUT")"

# Print files[0].local_path from an ai-gen --format json blob on stdin (objects in v2.1.0).
first_local_path() {
  python3 -c '
import json, sys
try:
    doc = json.load(sys.stdin)
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
'
}

# One attempt against a single model. Echoes the produced local path on success (stdout).
attempt() {
  local model=$1
  local slug; slug="$(printf '%s' "$model" | tr -c 'a-zA-Z0-9' '-')"
  local gen_json="$WORK/${slug}.json"
  local log="$WORK/${slug}.log"

  # Build the arg array. resolution=2K is POSITIONAL and only for nano-banana (qwen carries
  # the source resolution itself and may reject an unknown positional).
  local args=(image "$PROMPT" -m "$model" --image "$SRC" -o "$WORK"
              --format json --aspect-ratio "$ASPECT" --max-cost "$MAX_COST")
  case "$model" in
    *nano-banana*) args+=("resolution=${RESOLUTION}") ;;
  esac

  err "attempt: ai-gen ${args[*]}"
  if ! ai-gen "${args[@]}" >"$gen_json" 2>"$log"; then
    err "model $model failed/unreachable — see $log"
    return 1
  fi
  local raw; raw="$(first_local_path <"$gen_json" || true)"
  if [[ -z "$raw" || ! -s "$raw" ]]; then
    err "model $model reported success but no file on disk (files[0].local_path empty)"
    return 1
  fi
  # Copy the (expiring-URL-backed) local file to the stable output path.
  cp -f "$raw" "$OUT"
  printf '%s' "$model"
  return 0
}

ai-gen balance >"$WORK/balance-before.txt" 2>/dev/null || true

USED=""
if USED="$(attempt "$MODEL")"; then
  :
elif [[ -n "$FALLBACK" && "$FALLBACK" != "$MODEL" ]]; then
  err "primary $MODEL failed — trying fallback $FALLBACK"
  if USED="$(attempt "$FALLBACK")"; then
    :
  else
    err "fallback $FALLBACK also failed — edit could not be produced compliantly."
    err "DO NOT substitute an out-of-chain model. Record blocked + FLAG."
    exit 1
  fi
else
  err "edit could not be produced ($MODEL failed, no fallback set). Record blocked + FLAG."
  exit 1
fi

[[ -s "$OUT" ]] || { err "internal: output missing after a reported success"; exit 1; }
err "edit written: $OUT (model $USED)"
printf '%s\t%s\n' "$USED" "$OUT"
exit 0
