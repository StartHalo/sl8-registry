#!/usr/bin/env bash
#
# gen-graphic.sh — generate ONE text-bearing creative surface with a TEXT-CAPABLE model.
#
# The load-bearing routing rule (see references/text-routing.md): any surface that
# carries readable on-image text (headlines, feature labels, comparison-chart cells,
# A+ callouts, price/badge copy) MUST be rendered by a text-specialist model:
#
#   ideogram/v4                       headline / benefit graphic / label text (best OCR)
#   fal-ai/recraft/v3/text-to-image   palette-locked raster (colors= + style=) — charts
#   fal-ai/recraft/v4/text-to-vector  editable SVG / vector (logos, icon callouts)
#   fal-ai/nano-banana-pro            text-in-RICH-scene + in-call localization (fallback)
#
# NEVER route text to FLUX or Seedream — they garble embedded text (KB §Known
# Limitations). This script refuses those slugs outright.
#
# Forms used (ai-gen 2.1.0, verified live — see references/text-routing.md):
#   ai-gen image "<prompt>" -m <slug> [-s <size>|--aspect-ratio <r>] \
#     [--image <hero>] [--ref <logo>] [key=value ...] -o <dir> --format json --max-cost <n>
#
# (model params are POSITIONAL key=value — e.g. rendering_speed=QUALITY,
#  style=digital_illustration, colors='[{"r":27,"g":127,"b":92}]', resolution=2K;
#  there is NO --rendering-speed / --style flag. --image -> image_url single source;
#  --ref -> multi-ref, e.g. the brand logo.)
#
# Usage:
#   gen-graphic.sh -m <slug> -o <out.png> -p <prompt-file> [opts]
#     -m <slug>          REQUIRED text-capable model slug (ideogram/v4, recraft v3/v4, nano-banana-pro)
#     -o <out.png>       REQUIRED output path (the kept master/surface)
#     -p <prompt-file>   prompt text file (OR -t "<inline prompt>")
#     -t "<prompt>"      inline prompt (alternative to -p)
#     -s <size>          ai-gen size preset (e.g. square_hd, portrait_4_3)
#     -a <ratio>         --aspect-ratio (e.g. 1:1, 4:5, 9:16, 16:9)
#     -i <hero>          --image start/source (drops the real hero into a scene; nano-banana-pro)
#     -r <logo>          --ref brand logo for identity (repeatable via comma-sep list)
#     -c <max-cost>      per-call credit cap (default 40)
#     KEY=VALUE ...      forwarded POSITIONAL model params (rendering_speed=QUALITY, style=..., colors=..., resolution=2K)
#
# Writes:
#   <out.png>                  the generated surface (from files[0].local_path)
#   <out.png>.gen.json         the raw ai-gen --format json blob
#   <out.png>.prompt.txt       the exact prompt used (provenance)
#
# Exit 0 = a real file landed on disk. Exit 3 = generation ran but no file (flag it).
# Exit 2 = usage / blocked slug (a FLUX/Seedream text route) / missing dep.

set -euo pipefail

err() { printf 'gen-graphic: %s\n' "$*" >&2; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for dep in ai-gen python3; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

MODEL=""
OUT=""
PROMPT_FILE=""
PROMPT_INLINE=""
SIZE=""
RATIO=""
IMAGE=""
REFS=""
# Default cap covers the text specialists' conservative pre-submit estimates: ideogram/v4 (V4.0q)
# estimates ~570cr (the proxy estimator is conservative; actual charge is far lower). Recraft/
# Nano-Banana are cheaper. Override per call with -c. (Raised from 40 after a 2026-06-21 live test
# where ideogram/v4 aborted at max-cost 40/200.)
MAX_COST=700
PARAMS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m) MODEL=$2; shift 2 ;;
    -o) OUT=$2; shift 2 ;;
    -p) PROMPT_FILE=$2; shift 2 ;;
    -t) PROMPT_INLINE=$2; shift 2 ;;
    -s) SIZE=$2; shift 2 ;;
    -a) RATIO=$2; shift 2 ;;
    -i) IMAGE=$2; shift 2 ;;
    -r) REFS=$2; shift 2 ;;
    -c) MAX_COST=$2; shift 2 ;;
    -h|--help) err "see header for usage"; exit 2 ;;
    *=*) PARAMS+=("$1"); shift ;;
    *) err "unknown arg: $1"; exit 2 ;;
  esac
done

[[ -n "$MODEL" ]] || { err "missing -m <slug>"; exit 2; }
[[ -n "$OUT" ]]   || { err "missing -o <out.png>"; exit 2; }

# HARD BLOCK: never let a text surface route to a text-garbling model.
case "$(printf '%s' "$MODEL" | tr '[:upper:]' '[:lower:]')" in
  *flux*|*seedream*)
    err "REFUSED: '$MODEL' garbles embedded text (KB §Known Limitations)."
    err "Route text-bearing surfaces to ideogram/v4, recraft v3/v4, or nano-banana-pro."
    exit 2 ;;
esac

# Resolve the prompt.
if [[ -n "$PROMPT_INLINE" ]]; then
  PROMPT="$PROMPT_INLINE"
elif [[ -n "$PROMPT_FILE" ]]; then
  [[ -s "$PROMPT_FILE" ]] || { err "prompt file missing/empty: $PROMPT_FILE"; exit 2; }
  PROMPT="$(<"$PROMPT_FILE")"
else
  err "missing prompt: pass -p <file> or -t \"<prompt>\""
  exit 2
fi

OUT_DIR="$(dirname "$OUT")"
WORK_DIR="${WORK_DIR:-work/graphics}"
mkdir -p "$OUT_DIR" "$WORK_DIR"
GEN_JSON="${OUT}.gen.json"
printf '%s\n' "$PROMPT" >"${OUT}.prompt.txt"

# Build the arg vector.
ARGS=(image "$PROMPT" -m "$MODEL")
[[ -n "$SIZE"  ]] && ARGS+=(-s "$SIZE")
[[ -n "$RATIO" ]] && ARGS+=(--aspect-ratio "$RATIO")
[[ -n "$IMAGE" ]] && ARGS+=(--image "$IMAGE")
if [[ -n "$REFS" ]]; then
  IFS=',' read -r -a REF_ARR <<< "$REFS"
  for rf in "${REF_ARR[@]}"; do
    rf="$(printf '%s' "$rf" | sed 's/^ *//; s/ *$//')"
    [[ -n "$rf" ]] && ARGS+=(--ref "$rf")
  done
fi
ARGS+=(-o "$WORK_DIR" --format json --max-cost "$MAX_COST")
# POSITIONAL key=value model params LAST.
for kv in "${PARAMS[@]:-}"; do
  [[ -n "$kv" ]] && ARGS+=("$kv")
done

err "model=$MODEL ${SIZE:+size=$SIZE }${RATIO:+ratio=$RATIO }${PARAMS[*]:-}"

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

if ai-gen "${ARGS[@]}" >"$GEN_JSON" 2>"$WORK_DIR/gen-graphic.log"; then
  RAW="$(first_local_path <"$GEN_JSON" || true)"
  if [[ -n "$RAW" && -s "$RAW" ]]; then
    cp "$RAW" "$OUT"
    err "wrote $OUT  (from $RAW)"
    exit 0
  fi
  err "generation reported success but no file on disk — flag this surface."
  exit 3
fi

err "generation FAILED — see $WORK_DIR/gen-graphic.log"
exit 3
