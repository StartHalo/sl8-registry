#!/usr/bin/env bash
# crop-views.sh — OPTIONAL: slice per-angle crops out of a horizontal turnaround sheet.
#
# Usage:  crop-views.sh <reference-sheet.png> <out-dir> [N]
#   <reference-sheet.png>  the turnaround sheet produced by gen-image.sh
#   <out-dir>              where to write view-1.png .. view-N.png
#   N                      number of evenly-spaced columns to slice (default 4:
#                          front / three-quarter / side / back)
#
# This is a BEST-EFFORT convenience for downstream bots that want a single-angle crop
# (e.g. a clean side view) rather than the whole sheet. It is purely geometric: it
# assumes the views are laid out left-to-right in N equal columns on a neutral
# background, which is how the A1 turnaround prompt asks for them. It does NOT detect
# view boundaries — a sheet with uneven spacing will crop imperfectly.
#
# NON-FATAL BY DESIGN. The bible does not depend on crops: reference-sheet.png +
# hero.png are the contract. If ImageMagick is missing, the geometry can't be read, or
# a crop fails, this script prints a note to stderr and exits 0 (so a caller that always
# runs it never fails the phase on a missing crop). The skill treats crops as optional.

set -uo pipefail   # NOTE: no -e — we want to soft-fail, never abort the phase.

note() { echo "crop-views.sh: $*" >&2; }
soft_exit() { note "$*"; exit 0; }

[ $# -ge 2 ] || soft_exit "usage: crop-views.sh <reference-sheet.png> <out-dir> [N] — skipping (crops are optional)"

SHEET=$1
OUT_DIR=$2
N=${3:-4}

# ImageMagick presents as either `magick` (v7) or `convert`+`identify` (v6). Pick one.
if command -v magick >/dev/null 2>&1; then
  IM_CONVERT=(magick); IM_IDENTIFY=(magick identify)
elif command -v convert >/dev/null 2>&1 && command -v identify >/dev/null 2>&1; then
  IM_CONVERT=(convert); IM_IDENTIFY=(identify)
else
  soft_exit "ImageMagick not found (no 'magick' or 'convert'/'identify') — skipping optional crops"
fi

[ -f "$SHEET" ] || soft_exit "sheet not found: $SHEET — skipping optional crops"
case "$N" in (*[!0-9]*|"") soft_exit "N must be a positive integer (got '$N') — skipping";; esac
[ "$N" -ge 1 ] || soft_exit "N must be >= 1 (got '$N') — skipping"

mkdir -p "$OUT_DIR" || soft_exit "could not create out-dir: $OUT_DIR — skipping"

# Read the sheet width/height. `identify -format "%w %h"` is stable across IM versions.
if ! DIM=$("${IM_IDENTIFY[@]}" -format "%w %h" "$SHEET" 2>/dev/null); then
  soft_exit "could not read image dimensions of $SHEET — skipping"
fi
W=${DIM%% *}; H=${DIM##* }
case "$W$H" in (*[!0-9]*) soft_exit "unexpected dimensions '$DIM' for $SHEET — skipping";; esac
[ "$W" -gt 0 ] && [ "$H" -gt 0 ] || soft_exit "non-positive dimensions for $SHEET — skipping"

COL_W=$(( W / N ))
[ "$COL_W" -gt 0 ] || soft_exit "computed column width is 0 (sheet too narrow for $N columns) — skipping"

made=0
for i in $(seq 1 "$N"); do
  x=$(( (i - 1) * COL_W ))
  out="$OUT_DIR/view-$i.png"
  if "${IM_CONVERT[@]}" "$SHEET" -crop "${COL_W}x${H}+${x}+0" +repage "$out" 2>/dev/null; then
    made=$(( made + 1 ))
    note "wrote $out (${COL_W}x${H}+${x}+0)"
  else
    note "crop $i failed (non-fatal) — continuing"
  fi
done

note "done — $made/$N crop(s) written to $OUT_DIR (optional, geometric, best-effort)"
exit 0
