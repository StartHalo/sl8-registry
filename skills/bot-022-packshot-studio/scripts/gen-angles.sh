#!/usr/bin/env bash
#
# gen-angles.sh — generate up to 4 IDENTITY-LOCKED alternate angles off the APPROVED
# hero. Angles REQUIRE generation (you can't photograph a back you don't have), so
# they use the proven base-edit path:
#
#   ai-gen image "<directional line>; <preserve clause>" \
#     -m fal-ai/nano-banana-pro --image <approved-hero> --aspect-ratio 1:1 resolution=2K \
#     -o <work> --format json --max-cost <n>
#
# (--image → image_url, the proven base edit; resolution=2K is a POSITIONAL model param,
#  NOT a --resolution flag; --max-cost is in credits.)
#
# Each generated angle is then run through enforce-packshot.py (exact-255 + fill + res).
# fidelity-qc (the Claude vision compare vs the original snap/hero) is NOT done here —
# this script emits a per-angle MANIFEST that the bot reads to perform the BLOCKING
# fidelity-qc step (SKILL.md Step 3) and to drop/flag drift. The hard rules it DOES
# enforce mechanically: CAP at 4 angles, re-anchor EVERY angle off the approved hero
# (never off the snap or off another angle), preserve clause on every prompt.
#
# Usage:
#   gen-angles.sh <approved-hero.jpg> <out-dir> <angles-csv> [<product-name>]
#     <angles-csv>  e.g. "side,top,3/4"  (>4 entries are dropped + flagged)
#
# Env knobs:
#   ANGLE_MODEL   override (default fal-ai/nano-banana-pro)
#   WORK_DIR      scratch (default ./work/angles)
#   RESOLUTION    positional resolution= value (default 2K; one of 1K|2K|4K)
#   MAX_COST      per-call credit cap (default 60)
#   MIN_LONG / FILL_TARGET  forwarded to enforce-packshot.py (default 1600 / 0.85)
#
# Writes per kept angle:
#   <out-dir>/NN-<angle-slug>.jpg          (exact-255 enforced)
#   <out-dir>/NN-<angle-slug>.compliance.json
# And the manifest the bot consumes for the fidelity-qc gate:
#   <out-dir>/angles-manifest.json         ([{n, angle, file, compliance, prompt_file, gen_ok, enforce_rc}])
#
# Exit 0 if it ran (even with per-angle failures — those are recorded in the manifest
# and the bot decides drop/flag). Exit 2 = usage/deps.

set -euo pipefail

err() { printf 'gen-angles: %s\n' "$*" >&2; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for dep in ai-gen python3; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video/animation sandbox?)"; exit 2; }
done

if [[ $# -lt 3 ]]; then
  err "usage: gen-angles.sh <approved-hero.jpg> <out-dir> <angles-csv> [<product-name>]"
  exit 2
fi

HERO=$1
OUT_DIR=$2
ANGLES_CSV=$3
PRODUCT=${4:-the product}

ANGLE_MODEL=${ANGLE_MODEL:-fal-ai/nano-banana-pro}
WORK_DIR=${WORK_DIR:-work/angles}
RESOLUTION=${RESOLUTION:-2K}
MAX_COST=${MAX_COST:-60}
MIN_LONG=${MIN_LONG:-1600}
FILL_TARGET=${FILL_TARGET:-0.85}

[[ -s "$HERO" ]] || { err "approved hero missing or empty: $HERO (run packshot.sh first)"; exit 2; }
mkdir -p "$OUT_DIR" "$WORK_DIR"

# The verbatim preserve/anchor clause — identity is locked by language + re-attaching the
# hero as the reference (the reachable models have no hard geometry lock). See
# references/fidelity-discipline.md.
PRESERVE="the exact same ${PRODUCT} as the attached reference image, preserving its \
material, color, label text, proportions and surface detail; do not add, remove, or \
invent any detail not present in the reference; same pure white seamless studio \
background, same softbox lighting; no props, no text, no watermark; square 1:1."

# Directional line per known angle name; unknown names get a generic "rotate to" line.
directional_for() {
  case "$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -d ' ')" in
    side|left|right) echo "Show the product from a direct side profile view — rotate 90 degrees." ;;
    top|overhead|above|flatlay|flat-lay) echo "Show the product from directly above — a clean top-down overhead view." ;;
    3/4|threequarter|three-quarter|34|"45"|angle) echo "Show the product from a 3/4 front angle — rotate about 45 degrees to the left, slight downward tilt." ;;
    back|rear) echo "Show the product from the back — rotate 180 degrees." ;;
    bottom|underside) echo "Show the underside of the product — tilt to reveal the base." ;;
    detail|closeup|close-up|macro) echo "Zoom in tight on the product's key detail — keep texture and color balance sharp." ;;
    *) echo "Rotate the product to show its $1 view." ;;
  esac
}

slug() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed 's/--*/-/g; s/^-//; s/-$//'; }

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

# Split the CSV; CAP at 4 (the anti-drift SOP) and flag drops.
IFS=',' read -r -a REQ <<< "$ANGLES_CSV"
CAP=4
if (( ${#REQ[@]} > CAP )); then
  err "requested ${#REQ[@]} angles — CAPPING at $CAP (anti-drift SOP: AI drifts past 4)."
  err "dropped: ${REQ[*]:CAP}"
fi

MANIFEST="$OUT_DIR/angles-manifest.json"
printf '[\n' >"$MANIFEST"
first=1
n=0
for raw in "${REQ[@]:0:CAP}"; do
  angle="$(printf '%s' "$raw" | sed 's/^ *//; s/ *$//')"
  [[ -z "$angle" ]] && continue
  n=$((n+1))
  nn=$(printf '%02d' "$n")
  aslug="$(slug "$angle")"; [[ -z "$aslug" ]] && aslug="angle"
  base="$OUT_DIR/${nn}-${aslug}"
  prompt_file="$WORK_DIR/${nn}-${aslug}.prompt.txt"
  gen_json="$WORK_DIR/${nn}-${aslug}.json"

  DIR_LINE="$(directional_for "$angle")"
  printf '%s; %s\n' "$DIR_LINE" "$PRESERVE" >"$prompt_file"
  PROMPT="$(<"$prompt_file")"

  err "[$nn] angle '$angle' — $ANGLE_MODEL --image <approved-hero> resolution=$RESOLUTION (re-anchored off the hero)"
  gen_ok=false
  enforce_rc="skipped"
  out_jpg=""
  comp_json=""

  if ai-gen image "$PROMPT" -m "$ANGLE_MODEL" --image "$HERO" \
        --aspect-ratio 1:1 "resolution=$RESOLUTION" \
        -o "$WORK_DIR" --format json --max-cost "$MAX_COST" \
        >"$gen_json" 2>"$WORK_DIR/${nn}-${aslug}.log"; then
    raw_out="$(first_local_path <"$gen_json" || true)"
    if [[ -n "$raw_out" && -s "$raw_out" ]]; then
      gen_ok=true
      out_jpg="${base}.jpg"
      comp_json="${base}.compliance.json"
      set +e
      python3 "$HERE/enforce-packshot.py" "$raw_out" "$out_jpg" "$comp_json" \
        --min-long "$MIN_LONG" --fill-target "$FILL_TARGET" --square >/dev/null 2>&1
      enforce_rc=$?
      set -e
    else
      err "[$nn] generation reported success but no file on disk — will be flagged."
    fi
  else
    err "[$nn] generation failed — see $WORK_DIR/${nn}-${aslug}.log (angle will be flagged, set continues)."
  fi

  [[ $first -eq 1 ]] || printf ',\n' >>"$MANIFEST"
  first=0
  python3 - "$nn" "$angle" "$out_jpg" "$comp_json" "$prompt_file" "$gen_ok" "$enforce_rc" >>"$MANIFEST" <<'PY'
import json, sys
n, angle, out_jpg, comp, prompt, gen_ok, rc = sys.argv[1:8]
print(json.dumps({
    "n": int(n), "angle": angle,
    "file": out_jpg or None,
    "compliance": comp or None,
    "prompt_file": prompt,
    "gen_ok": gen_ok == "true",
    "enforce_rc": rc,  # 0 pass, 3 written-but-gate-failed, "skipped"/"2" otherwise
}), end="")
PY
done
printf '\n]\n' >>"$MANIFEST"

err "angle manifest: $MANIFEST"
err "NEXT (the bot, not this script): run the BLOCKING fidelity-qc vision compare on EACH"
err "generated angle vs the original snap + the approved hero — DROP drift, FLAG low-confidence."
exit 0
