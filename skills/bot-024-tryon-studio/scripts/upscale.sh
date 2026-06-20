#!/usr/bin/env bash
#
# upscale.sh — lift a QC-PASSED on-model try-on from FASHN's native sub-2K resolution
# (FASHN v1.6 = 864x1296; Leffa = 768x1024) up to a marketplace spec (Amazon recommends
# >=2000px on the long side) using fal-ai/clarity-upscaler.
#
# ONLY run this AFTER tryon-qc.py returns `pass`. An upscaler can re-imagine fine detail,
# so a drifted/flattered image must NEVER be upscaled and shipped — upscaling a bad image
# just makes a high-res misrepresentation. (The caller enforces this ordering.)
#
# clarity-upscaler takes the image via --image (-> the model's image_url, the verified
# single-source path) plus a POSITIONAL scale_factor=N (there is NO --scale flag). The
# *.fal.media URL EXPIRES, so we always use files[0].local_path immediately.
#
# Usage:
#   upscale.sh <in.(png|jpg|url)> <out.(png|jpg)> [<min-long>] [<scale-factor>]
#     <min-long>      target long-side px before we bother upscaling (default 2000)
#     <scale-factor>  positional scale_factor for the upscaler (default 2)
#
# Env knobs (all optional):
#   UPSCALE_MODEL   override the upscaler slug (default fal-ai/clarity-upscaler)
#   WORK_DIR        scratch dir (default ./work/upscale)
#   MAX_COST        per-call credit cap passed to --max-cost (default 60)
#
# Exit:
#   0  out written (either upscaled, OR copied through because it already met min-long
#      and no upscale was needed — both are success)
#   3  out written by copy-through but the upscale itself FAILED (deliver the QC-passed
#      original at native res + the caller FLAGS the resolution shortfall) — never withhold
#   2  usage / missing dependency / unreadable input

set -euo pipefail

err() { printf 'upscale: %s\n' "$*" >&2; }

for dep in ai-gen python3; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

if [[ $# -lt 2 ]]; then
  err "usage: upscale.sh <in.(png|jpg|url)> <out.(png|jpg)> [<min-long>] [<scale-factor>]"
  exit 2
fi

IN=$1
OUT=$2
MIN_LONG=${3:-2000}
SCALE=${4:-2}

UPSCALE_MODEL=${UPSCALE_MODEL:-fal-ai/clarity-upscaler}
WORK_DIR=${WORK_DIR:-work/upscale}
MAX_COST=${MAX_COST:-60}

case "$IN" in
  https://*) IS_URL=1 ;;
  *) IS_URL=0; [[ -s "$IN" ]] || { err "input must be an https URL or an existing local file: $IN"; exit 2; } ;;
esac

mkdir -p "$WORK_DIR" "$(dirname "$OUT")"

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

# Read the long side of a local image (Pillow). Prints an int, or "0" if it cannot.
# Self-bootstraps Pillow (sl8-video ships none).
long_side() {
  python3 - "$1" <<'PY'
import sys
try:
    from PIL import Image
except Exception:
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "--quiet",
                    "--disable-pip-version-check", "--break-system-packages", "Pillow"],
                   check=False)
    try:
        from PIL import Image
    except Exception:
        print(0); sys.exit(0)
try:
    with Image.open(sys.argv[1]) as im:
        print(max(im.size))
except Exception:
    print(0)
PY
}

# If the input is a local file already at/over the target, just copy it through.
if [[ "$IS_URL" -eq 0 ]]; then
  CUR=$(long_side "$IN")
  if [[ "$CUR" -ge "$MIN_LONG" && "$CUR" -gt 0 ]]; then
    err "input long side ${CUR}px already >= ${MIN_LONG}px — copying through, no upscale needed."
    cp "$IN" "$OUT"
    exit 0
  fi
  err "input long side ${CUR:-unknown}px < ${MIN_LONG}px — upscaling x${SCALE} via $UPSCALE_MODEL."
fi

GEN_JSON="$WORK_DIR/upscale.json"
if ai-gen image "" -m "$UPSCALE_MODEL" --image "$IN" "scale_factor=$SCALE" \
      -o "$WORK_DIR" --format json --max-cost "$MAX_COST" \
      >"$GEN_JSON" 2>"$WORK_DIR/upscale.log"; then
  UP=$(first_local_path "$GEN_JSON" || true)
  if [[ -n "$UP" && -s "$UP" ]]; then
    cp "$UP" "$OUT"
    NEW=$(long_side "$OUT")
    err "upscaled: $OUT (long side ~${NEW:-?}px)"
    exit 0
  fi
  err "upscaler reported success but no file on disk."
else
  err "upscaler failed/unreachable — see $WORK_DIR/upscale.log"
fi

# Upscale failed: deliver the QC-passed original at native res + FLAG the shortfall.
if [[ "$IS_URL" -eq 0 ]]; then
  cp "$IN" "$OUT"
  err "delivered the native-resolution QC-passed image at $OUT — FLAG the <${MIN_LONG}px shortfall in qc-report.md."
  exit 3
fi
err "could not upscale a remote URL and have no local copy to fall back to — caller must download the try-on first."
exit 2
