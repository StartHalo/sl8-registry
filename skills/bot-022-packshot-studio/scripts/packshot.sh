#!/usr/bin/env bash
#
# packshot.sh — produce the DETERMINISTIC, pixel-faithful compliant HERO image from
# the seller's REAL phone snap. Two steps, NO generative re-background:
#
#   1. Bria RMBG (fal-ai/bria/background/remove, --image) → a transparent-PNG cutout
#      that PRESERVES the real product pixels (proven pixel-faithful in the build PoC;
#      a generative re-background hallucinated a DIFFERENT product — see
#      references/fidelity-discipline.md).
#   2. enforce-packshot.py → flatten onto EXACT RGB(255,255,255), >=85% frame fill,
#      >=1600px long side, 1:1, metadata-stripped sRGB JPEG + the compliance.json verdict.
#
# Usage:
#   packshot.sh <snap (jpg|png|url)> <out-hero.jpg> [<compliance.json>]
#
# Env knobs (all optional):
#   RMBG_MODEL   override the RMBG slug (default fal-ai/bria/background/remove)
#   WORK_DIR     scratch dir for the cutout + ai-gen output (default ./work/hero)
#   MIN_LONG     min long side for the resolution gate (default 1600)
#   FILL_TARGET  min frame fill (default 0.85)
#   MAX_COST     credit cap passed to ai-gen --max-cost (default 30; RMBG is ~1 cr)
#
# Exit:
#   0  hero written AND passes all gates
#   3  hero written but a gate FAILED (deliver + the caller FLAGS it)  — never withhold
#   1  RMBG failed / unreachable — hero cannot be produced compliantly (do NOT substitute
#      a generative re-background); caller records `blocked` + FLAG
#   2  usage / missing dependency
#
# stdout (on success): the compliance.json contents (also written to the path if given).
# Everything else → stderr.

set -euo pipefail

err() { printf 'packshot: %s\n' "$*" >&2; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for dep in ai-gen python3; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video/animation sandbox?)"; exit 2; }
done

if [[ $# -lt 2 ]]; then
  err "usage: packshot.sh <snap (jpg|png|url)> <out-hero.jpg> [<compliance.json>]"
  exit 2
fi

SNAP=$1
OUT=$2
COMPLIANCE=${3:-}

RMBG_MODEL=${RMBG_MODEL:-fal-ai/bria/background/remove}
WORK_DIR=${WORK_DIR:-work/hero}
MIN_LONG=${MIN_LONG:-1600}
FILL_TARGET=${FILL_TARGET:-0.85}
MAX_COST=${MAX_COST:-30}

# The snap must be a readable local file OR an https URL (v2.1.0 uploads locals).
case "$SNAP" in
  https://*) : ;;
  *) [[ -s "$SNAP" ]] || { err "snap must be an https URL or an existing local file: $SNAP"; exit 2; } ;;
esac

mkdir -p "$WORK_DIR" "$(dirname "$OUT")"

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

# --- Step 1: Bria RMBG on the REAL snap (preserve real pixels — NOT a generative edit) ---
err "RMBG: $RMBG_MODEL --image <snap> (preserving the real product pixels; max-cost ${MAX_COST}cr)"
RMBG_JSON="$WORK_DIR/rmbg.json"
# Empty prompt: Bria RMBG takes only image_url (mapped from --image). -o lands the cutout
# locally; the *.fal.media URL expires so we use the local file immediately.
if ! ai-gen image "" -m "$RMBG_MODEL" --image "$SNAP" -o "$WORK_DIR" --format json --max-cost "$MAX_COST" \
      >"$RMBG_JSON" 2>"$WORK_DIR/rmbg.log"; then
  err "Bria RMBG failed or unreachable — see $WORK_DIR/rmbg.log"
  err "DO NOT substitute a generative re-background (it hallucinates a different product — PoC)."
  err "Record the hero phase as blocked + FLAG in fidelity-qc.md / state.md."
  exit 1
fi

CUTOUT="$(first_local_path <"$RMBG_JSON" || true)"
if [[ -z "$CUTOUT" || ! -s "$CUTOUT" ]]; then
  err "RMBG reported success but no transparent cutout on disk (files[0].local_path empty)."
  err "Treating as a hard failure — do not fall back to a generative re-background."
  exit 1
fi
err "RMBG cutout: $CUTOUT"

# --- Step 2: deterministic Pillow gate → exact-255 flatten + fill + resolution, square 1:1 ---
err "enforce: flatten to exact RGB(255,255,255), >=${FILL_TARGET} fill, >=${MIN_LONG}px, 1:1"
set +e
GATE_OUT="$(python3 "$HERE/enforce-packshot.py" "$CUTOUT" "$OUT" "${COMPLIANCE:-/dev/stdout}" \
              --min-long "$MIN_LONG" --fill-target "$FILL_TARGET" --square)"
GATE_RC=$?
set -e

# enforce-packshot prints the verdict JSON to stdout AND (if given) to the compliance path.
# Echo it through so the caller sees the verdict on stdout either way.
printf '%s\n' "$GATE_OUT"

if [[ $GATE_RC -eq 2 ]]; then
  err "enforce-packshot usage/read error on the cutout."
  exit 2
fi

if [[ $GATE_RC -eq 3 ]]; then
  err "hero written but a compliance gate FAILED — deliver it and FLAG in fidelity-qc.md"
  err "(common causes: product too small in the snap → re-shoot closer; long side <${MIN_LONG}px → higher-res snap)."
  exit 3
fi

err "hero compliant: $OUT (exact-255 white bg, >=${FILL_TARGET} fill, >=${MIN_LONG}px) — PIXEL-FAITHFUL"
exit 0
