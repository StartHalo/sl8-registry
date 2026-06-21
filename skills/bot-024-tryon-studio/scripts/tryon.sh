#!/usr/bin/env bash
#
# tryon.sh — run the FASHN v1.6 virtual try-on call and download the result.
#
# FASHN takes TWO REQUIRED NAMED image args — garment_image + model_image — NOT the
# singular image_url that --image sends. So the call goes through `ai-gen run` with
# POSITIONAL key=value params (verified ai-gen 2.1.0 contract), never `--image`:
#
#   ai-gen run fal-ai/fashn/tryon/v1.6 \
#     garment_image=<garment-url-or-local> model_image=<model-url-or-local> \
#     category=auto mode=quality output_format=png -o <work> --format json
#
# On Leffa fallback the two named args are human_image_url + garment_image_url and the
# category param is garment_type {upper_body,lower_body,dresses}.
#
# This script ONLY generates + delivers the local file. It does NOT decide fidelity:
# the BLOCKING tryon-qc.py vision compare (SKILL.md Step 3) is the CALLER's step. The
# fal *.fal.media URL EXPIRES, so we always use files[0].local_path immediately.
#
# Usage:
#   tryon.sh <garment (jpg|png|url)> <model (jpg|png|url)> <out.png> [<category>] [<mode>]
#     <category>  tops | bottoms | one-pieces | auto   (FASHN; default auto)
#     <mode>      performance | balanced | quality      (FASHN; default quality)
#
# Env knobs (all optional):
#   TRYON_MODEL         primary slug          (default fal-ai/fashn/tryon/v1.6)
#   TRYON_FALLBACK      fallback slug         (default fal-ai/leffa/virtual-tryon)
#   GARMENT_PHOTO_TYPE  auto | model | flat-lay (FASHN; default flat-lay)
#   MODERATION_LEVEL    none | permissive | conservative (FASHN; default permissive)
#   NUM_SAMPLES         FASHN num_samples     (default 1)
#   WORK_DIR            scratch dir           (default ./work/tryon)
#   MAX_COST            per-call credit cap   (default 60)
#
# Writes:
#   <out.png>                      the downloaded try-on image (from files[0].local_path)
#   <out.png>.meta.json            { model, category, mode, src_garment, src_model, ok }
#
# Exit:
#   0  primary or fallback succeeded and a local file was delivered to <out.png>
#   1  BOTH the primary and the fallback failed (caller FLAGS + skips this variant)
#   2  usage / missing dependency

set -euo pipefail

err() { printf 'tryon: %s\n' "$*" >&2; }

for dep in ai-gen python3; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

if [[ $# -lt 3 ]]; then
  err "usage: tryon.sh <garment (jpg|png|url)> <model (jpg|png|url)> <out.png> [<category>] [<mode>]"
  exit 2
fi

GARMENT=$1
MODEL_IMG=$2
OUT=$3
CATEGORY=${4:-auto}
MODE=${5:-quality}

TRYON_MODEL=${TRYON_MODEL:-fal-ai/fashn/tryon/v1.6}
TRYON_FALLBACK=${TRYON_FALLBACK:-fal-ai/leffa/virtual-tryon}
GARMENT_PHOTO_TYPE=${GARMENT_PHOTO_TYPE:-flat-lay}
MODERATION_LEVEL=${MODERATION_LEVEL:-permissive}
NUM_SAMPLES=${NUM_SAMPLES:-1}
WORK_DIR=${WORK_DIR:-work/tryon}
MAX_COST=${MAX_COST:-60}

# Each image must be a readable local file OR an https URL.
for img in "$GARMENT" "$MODEL_IMG"; do
  case "$img" in
    https://*) : ;;
    *) [[ -s "$img" ]] || { err "image must be an https URL or an existing local file: $img"; exit 2; } ;;
  esac
done

mkdir -p "$WORK_DIR" "$(dirname "$OUT")"

# FASHN/Leffa take garment_image/model_image as a URL or base64. `ai-gen run` does NOT upload
# local files for named params (only --image does, and only for a single image_url slot), and
# base64 data-URIs are rejected (HTTP 413). So REHOST any LOCAL input to a hosted URL via a
# content-preserving pass: `ai-gen run <upscaler> --image <local> --url-only` uploads the local
# and returns a hosted fal URL. https inputs pass through unchanged. (Verified 2026-06-21.)
REHOST_MODEL=${REHOST_MODEL:-fal-ai/clarity-upscaler}
rehost() {
  local src=$1
  case "$src" in https://*) printf '%s' "$src"; return 0 ;; esac
  local url
  url=$(ai-gen run "$REHOST_MODEL" --image "$src" --url-only --max-cost 100 2>>"$WORK_DIR/rehost.log" \
        | grep -oE 'https://[^ ]+' | head -1)
  [[ -n "$url" ]] || { err "rehost failed for local file: $src (see $WORK_DIR/rehost.log)"; return 1; }
  printf '%s' "$url"
}
err "rehosting any local inputs to URLs (FASHN/Leffa require URL/base64)..."
GARMENT_URL=$(rehost "$GARMENT") || exit 1
MODEL_URL=$(rehost "$MODEL_IMG") || exit 1

# Print files[0].local_path from an ai-gen --format json blob (objects in v2.1.0).
first_local_path() {
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

# Try ONE try-on slug with its model-specific named params. Leaves <stem>.json +
# <stem>.log in WORK_DIR. Returns 0 only when a real local file landed; echoes the
# delivered model id on success.
attempt() {
  local model=$1 stem=$2
  local gen_json="$WORK_DIR/${stem}.json"
  local log="$WORK_DIR/${stem}.log"
  local args=(run "$model" -o "$WORK_DIR" --format json --max-cost "$MAX_COST")

  case "$model" in
    *fashn*)
      # FASHN v1.6: required garment_image + model_image; key optionals are positional.
      args+=("garment_image=$GARMENT_URL" "model_image=$MODEL_URL"
             "category=$CATEGORY" "mode=$MODE"
             "garment_photo_type=$GARMENT_PHOTO_TYPE"
             "moderation_level=$MODERATION_LEVEL"
             "num_samples=$NUM_SAMPLES" "output_format=png")
      ;;
    *leffa*)
      # Leffa: human_image_url + garment_image_url; category -> garment_type.
      local gtype
      case "$CATEGORY" in
        bottoms) gtype=lower_body ;;
        one-pieces|dresses) gtype=dresses ;;
        *) gtype=upper_body ;;
      esac
      args+=("human_image_url=$MODEL_URL" "garment_image_url=$GARMENT_URL"
             "garment_type=$gtype")
      ;;
    *)
      err "$model: unknown try-on slug — no named-arg mapping; skipping."
      return 1
      ;;
  esac

  : >"$gen_json"; : >"$log"
  if ! ai-gen "${args[@]}" >"$gen_json" 2>"$log"; then
    err "$model: ai-gen run failed — see $log"
    return 1
  fi
  local f
  f=$(first_local_path "$gen_json" || true)
  if [[ -z "$f" || ! -s "$f" ]]; then
    err "$model: success reported but no local file on disk (files[0].local_path empty)."
    return 1
  fi
  cp "$f" "$OUT"
  echo "$model"
  return 0
}

DELIVERED=""
err "primary: $TRYON_MODEL (garment_image + model_image, category=$CATEGORY mode=$MODE, max-cost ${MAX_COST}cr)"
if DELIVERED=$(attempt "$TRYON_MODEL" "primary"); then
  :
else
  err "primary failed — falling back to $TRYON_FALLBACK (named args human_image_url + garment_image_url)"
  if DELIVERED=$(attempt "$TRYON_FALLBACK" "fallback"); then
    :
  else
    DELIVERED=""
  fi
fi

python3 - "$OUT" "$DELIVERED" "$CATEGORY" "$MODE" "$GARMENT" "$MODEL_IMG" >"$OUT.meta.json" <<'PY'
import json, sys
out, model, cat, mode, garment, model_img = sys.argv[1:7]
print(json.dumps({
    "out": out, "model": model or None, "category": cat, "mode": mode,
    "src_garment": garment, "src_model": model_img, "ok": bool(model),
}, indent=2))
PY

if [[ -z "$DELIVERED" ]]; then
  err "BOTH the primary and the fallback failed — caller FLAGS this variant and skips it."
  err "Do NOT substitute a general-model re-imagining as the catalog shot without a passing tryon-qc."
  exit 1
fi

err "try-on delivered: $OUT (via $DELIVERED) — NEXT (the bot): run the BLOCKING tryon-qc.py vs the garment."
exit 0
