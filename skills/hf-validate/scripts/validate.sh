#!/usr/bin/env bash
# validate.sh — pre-render gate for a HyperFrames composition.
#
#   bash validate.sh <composition-dir> <project-artifacts-dir> [at-seconds-csv]
#   e.g. bash validate.sh artifacts/my-teaser/composition artifacts/my-teaser "2,9,15"
#
# Runs, in order:
#   1. `hyperframes lint`            — human-readable findings.
#   2. `hyperframes lint --json`     — the STRICT gate: fail (exit 2) if errorCount > 0.
#   3. `hyperframes snapshot`        — capture key frames as PNGs (headless seek) for vision grading.
# Writes a report to <project-artifacts-dir>/05-validation.md and copies the key frames next to it
# under <project-artifacts-dir>/snapshots/. Exit 0 only if lint is clean AND snapshots were written.
#
# Chrome: hyperframes auto-detects a browser for snapshot. On sl8-animation pass the pinned Chrome via
# the env the runtime already exports; on host/dev it finds the system Chrome. We do NOT download Chrome.
set -uo pipefail

COMP="${1:?usage: validate.sh <composition-dir> <project-artifacts-dir> [at-seconds-csv]}"
PROJ="${2:?usage: validate.sh <composition-dir> <project-artifacts-dir> [at-seconds-csv]}"
AT="${3:-}"
HF="npx --yes hyperframes@0.6.112"
REPORT="$PROJ/05-validation.md"
SNAPS="$PROJ/snapshots"
mkdir -p "$PROJ" "$SNAPS"

if [ ! -f "$COMP/index.html" ]; then
  echo "!! no composition at $COMP/index.html — run hf-build first." >&2
  exit 1
fi

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
{
  echo "# 05 — Validation"
  echo
  echo "- composition: \`$COMP\`"
  echo "- validated (UTC): $TS"
  echo
} > "$REPORT"

# ---- 1 + 2. Lint (human) then strict JSON gate ----
echo ">> lint:"
( cd "$COMP" && $HF lint ) 2>&1 | tee /tmp/hf-lint-human.txt || true

LINT_JSON="$( cd "$COMP" && $HF lint --json 2>/dev/null )"
ERRS="$(printf '%s' "$LINT_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).errorCount))}catch(e){process.stdout.write("NaN")}})' 2>/dev/null)"
WARNS="$(printf '%s' "$LINT_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).warningCount))}catch(e){process.stdout.write("NaN")}})' 2>/dev/null)"

{
  echo "## Lint"
  echo
  echo "- errors: \`${ERRS}\`  warnings: \`${WARNS}\`"
  echo
  echo '```'
  cat /tmp/hf-lint-human.txt 2>/dev/null
  echo '```'
  echo
} >> "$REPORT"

if [ "$ERRS" != "0" ]; then
  echo "!! STRICT lint gate FAILED: errorCount=$ERRS (must be 0). Not snapshotting." >&2
  {
    echo "## Result"
    echo
    echo "**BLOCKED** — lint reported $ERRS error(s). Fix them in hf-build before rendering."
  } >> "$REPORT"
  exit 2
fi
echo ">> lint strict gate PASSED (0 errors)."

# ---- 3. Snapshot key frames (headless seek) ----
echo ">> snapshot:"
# Run from INSIDE the composition dir and target "." — passing $COMP while cd'd into it would
# double the path (vtest/composition/vtest/composition).
SNAP_ARGS=( . --describe false )
if [ -n "$AT" ]; then
  SNAP_ARGS+=( --at "$AT" )
else
  SNAP_ARGS+=( --frames 5 )
fi
( cd "$COMP" && $HF snapshot "${SNAP_ARGS[@]}" ) 2>&1 | tee /tmp/hf-snap.txt || true

# hyperframes writes to <composition>/snapshots/ — copy them next to the report for grading.
COUNT=0
if [ -d "$COMP/snapshots" ]; then
  cp -f "$COMP/snapshots/"*.png "$SNAPS/" 2>/dev/null || true
  cp -f "$COMP/snapshots/contact-sheet.jpg" "$SNAPS/" 2>/dev/null || true
  COUNT="$(ls "$SNAPS"/*.png 2>/dev/null | wc -l | tr -d ' ')"
fi

{
  echo "## Snapshots"
  echo
  if [ "${COUNT:-0}" -ge 1 ]; then
    echo "- $COUNT key frame(s) captured to \`$PROJ/snapshots/\` (and a contact-sheet.jpg if present)."
    echo "- VISION-GRADE these frames: legible? safe-zone correct? on-brand palette/fonts? composed (not centered single-element)?"
    echo
    for f in "$SNAPS"/*.png; do [ -e "$f" ] && echo "  - \`${f}\`"; done
  else
    echo "- **WARNING:** no snapshot PNGs were produced. Investigate (Chrome/runtime) before rendering."
  fi
  echo
  echo "## Result"
  echo
  if [ "${COUNT:-0}" -ge 1 ]; then
    echo "**PASS** — lint clean (0 errors, ${WARNS} warning(s)); ${COUNT} key frame(s) captured. Ready for hf-render."
  else
    echo "**BLOCKED** — lint clean but no frames captured; render would risk blank output."
  fi
} >> "$REPORT"

echo ">> wrote $REPORT"
[ "${COUNT:-0}" -ge 1 ] && exit 0 || exit 3
