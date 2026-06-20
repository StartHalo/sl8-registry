#!/usr/bin/env bash
#
# compose-scene.sh — composite the approved product (cutout or hero) into ONE
# lifestyle scene, walking the pinned model fallback chain in order. GENERATIVE
# path: the model reinterprets the scene around the product, so the CALLER must
# run scripts/fidelity-qc.py on every output before it ships (this script does
# NOT decide fidelity — it only generates and delivers the local file).
#
# Two modes:
#
#   1) Make a clean cutout (pixel-faithful RMBG — the preferred --image source):
#        compose-scene.sh --make-cutout <hero.(jpg|png)> <out-cutout.png>
#
#   2) Compose a scene (the main mode):
#        compose-scene.sh <prompt-file> <image (cutout|hero local path | https url)> \
#            <aspect 4:3|9:16|1:1|16:9|3:2|...> <out-path.jpg> [--ref <path|url>]...
#
# Env knobs (compose mode, all optional):
#   SCENE_CHAIN       space-separated model ids overriding the default chain.
#   SCENE_RESOLUTION  1K | 2K | 4K   (default 2K; nano-banana-pro positional `resolution=`)
#   SCENE_MAX_COST    credit cap per call passed to --max-cost (default 120; 1 cr ~= $0.004)
#
# Default chain (pinned 2026-06-19 for ai-gen v2.1.0 — keep in sync with SKILL.md):
#   fal-ai/nano-banana-pro                              (PRIMARY — 14 refs, holds geometry+text)
#   fal-ai/bytedance/seedream/v4.5/text-to-image        (fallback — photoreal; no positional resolution=)
#
# VERIFIED ai-gen 2.1.0 syntax (live PoC 2026-06-19 — do NOT invent flags):
#   - `--image <path|url>` maps to the model's SINGULAR image_url (the exact-product
#     source). NOT image_urls='[...]'.
#   - `--ref <path|url>` (repeatable) is multi-reference (brand-look, logo).
#   - `--aspect-ratio <r>` sets the frame; model-specific params are POSITIONAL
#     key=value (e.g. `resolution=2K` for nano-banana-pro). There is NO --resolution flag.
#   - Outputs go to `-o <dir>`; `--format json` carries files[] as OBJECTS
#     ({local_path,url,...}). fal *.fal.media URLs EXPIRE — use the LOCAL file now.
#   - Ignore credits_used (over-reports); a failed generation is not charged.
#
# On success (compose mode) prints exactly ONE line to stdout:  <model-id>\t<out-path>
# Everything else goes to stderr. Non-zero exit = every model in the chain failed.

set -euo pipefail

err()  { printf 'compose-scene: %s\n' "$*" >&2; }

for dep in ai-gen python3; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

# ---- helpers -------------------------------------------------------------------

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

# Print files[0].local_path from the JSON file $1 (v2.1.0 entries are OBJECTS;
# accept a bare string too). Never a non-zero exit.
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

# ---- mode 1: make cutout (Bria RMBG — pixel-faithful) --------------------------

if [[ "${1:-}" == "--make-cutout" ]]; then
  HERO=${2:?usage: compose-scene.sh --make-cutout <hero> <out-cutout.png>}
  OUT=${3:?usage: compose-scene.sh --make-cutout <hero> <out-cutout.png>}
  [[ -s "$HERO" ]] || { err "hero not found: $HERO"; exit 2; }
  mkdir -p "$(dirname "$OUT")"
  WORKDIR=$(mktemp -d); trap 'rm -rf "$WORKDIR"' EXIT
  # Bria RMBG takes image_url via --image; prompt is unused but the CLI wants one.
  if ai-gen image "" -m fal-ai/bria/background/remove --image "$HERO" \
        -o "$WORKDIR" --format json >"$WORKDIR/result.json" 2>"$WORKDIR/log" \
     && json_success "$WORKDIR/result.json"; then
    f=$(json_first_file "$WORKDIR/result.json")
    if [[ -n "$f" && -s "$f" ]]; then
      mv "$f" "$OUT"
      err "cutout ready: $OUT (Bria RMBG, pixel-faithful)"
      printf 'fal-ai/bria/background/remove\t%s\n' "$OUT"
      exit 0
    fi
  fi
  err "RMBG cutout failed — caller should fall back to passing the hero directly as --image"
  cat "$WORKDIR/log" >&2 2>/dev/null || true
  exit 1
fi

# ---- mode 2: compose a scene ---------------------------------------------------

if [[ $# -lt 4 ]]; then
  err "usage: compose-scene.sh <prompt-file> <image> <aspect> <out-path.jpg> [--ref <path|url>]..."
  exit 2
fi

PROMPT_FILE=$1; IMAGE_INPUT=$2; ASPECT=$3; OUT_PATH=$4; shift 4
REFS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref) REFS+=("${2:?--ref requires a value}"); shift 2 ;;
    *) err "unknown argument: $1"; exit 2 ;;
  esac
done

RESOLUTION=${SCENE_RESOLUTION:-2K}
MAX_COST=${SCENE_MAX_COST:-120}
CHAIN=${SCENE_CHAIN:-"fal-ai/nano-banana-pro fal-ai/bytedance/seedream/v4.5/text-to-image"}

[[ -s "$PROMPT_FILE" ]] || { err "prompt file missing or empty: $PROMPT_FILE"; exit 2; }
case "$IMAGE_INPUT" in
  https://*) : ;;
  *) [[ -s "$IMAGE_INPUT" ]] || { err "image must be an https URL or an existing local file: $IMAGE_INPUT"; exit 2; } ;;
esac
PROMPT=$(<"$PROMPT_FILE")
mkdir -p "$(dirname "$OUT_PATH")"
WORKDIR=$(mktemp -d); trap 'rm -rf "$WORKDIR"' EXIT

# One generation attempt for $1=model. Leaves result.json + attempt.log in $WORKDIR;
# returns 0 only on JSON success. Args are shaped per model family.
attempt() {
  local model=$1
  local args=(image "$PROMPT" -m "$model" --image "$IMAGE_INPUT" -o "$WORKDIR" \
              --format json --aspect-ratio "$ASPECT" --max-cost "$MAX_COST")
  # nano-banana-pro takes a positional `resolution=` (1K/2K/4K) and consumes refs.
  case "$model" in
    *nano-banana-pro*)
      args+=("resolution=${RESOLUTION}")
      for r in "${REFS[@]:-}"; do [[ -n "$r" ]] && args+=(--ref "$r"); done
      ;;
    # Seedream v4.5 t2i has no positional resolution=; aspect-ratio is honored. Refs
    # are dropped (this fallback family does not take multi-ref) — note it in stderr.
    *)
      if [[ ${#REFS[@]} -gt 0 ]]; then
        err "$model: does not consume --ref (brand-look/logo dropped on the fallback path)"
      fi
      ;;
  esac
  : >"$WORKDIR/result.json"; : >"$WORKDIR/attempt.log"
  if ! ai-gen "${args[@]}" >"$WORKDIR/result.json" 2>"$WORKDIR/attempt.log"; then
    cat "$WORKDIR/result.json" >>"$WORKDIR/attempt.log" 2>/dev/null || true
    return 1
  fi
  json_success "$WORKDIR/result.json"
}

# Move the generated LOCAL file to its stable name and print the contract line.
# (Always use the local file — fal URLs expire.)
deliver() {
  local model=$1 file
  file=$(json_first_file "$WORKDIR/result.json")
  if [[ -z "$file" || ! -s "$file" ]]; then
    err "$model: success reported but no local output file on disk — treating as failure"
    return 1
  fi
  mv "$file" "$OUT_PATH"
  printf '%s\t%s\n' "$model" "$OUT_PATH"
  exit 0
}

for MODEL in $CHAIN; do
  err "trying $MODEL (aspect ${ASPECT}, res ${RESOLUTION}, max-cost ${MAX_COST}cr, ${#REFS[@]} ref(s))"
  if attempt "$MODEL"; then
    deliver "$MODEL" || true
  fi
  err "$MODEL failed — falling back to the next model in the chain (no out-of-chain improvisation)"
done

err "all models in the chain failed for this scene: $CHAIN"
err "caller: skip this (scene x aspect) and FLAG it in scenes-log.md"
exit 1
