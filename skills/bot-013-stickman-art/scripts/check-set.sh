#!/usr/bin/env bash
# check-set.sh — structural gate for the phase-3 still set.
#
# Usage: check-set.sh <project-dir>      (e.g. check-set.sh artifacts/my-episode)
#
# Verifies, against 01-episode-plan.md and 03-stills/stills-log.md:
#   1. every plan beat has either a kept still file or a recorded skip in the log
#   2. every kept still has a fal.media URL in its log block (the i2v contract)
#   3. >=80% of beats are kept (the episode threshold from requirements)
#
# Expects the per-beat log block shape SKILL.md prescribes:
#   ## Beat NN — <beat-slug>
#   - status: kept | skipped
#   - url: https://fal.media/...
#
# Exits 0 with a PASS verdict, or 1 listing every problem found.

set -euo pipefail

die() { echo "check-set.sh: FAIL: $*" >&2; exit 1; }

[ $# -eq 1 ] || die "usage: check-set.sh <project-dir>"
P=$1
PLAN="$P/01-episode-plan.md"
STILLS_DIR="$P/03-stills"
LOG="$STILLS_DIR/stills-log.md"

[ -d "$P" ]    || die "project dir not found: $P"
[ -f "$PLAN" ] || die "missing $PLAN"
[ -f "$LOG" ]  || die "missing $LOG"

# Beat count = highest "### Beat N:" heading number. Anchored to headings on
# purpose: prose mentions like "beat 7 felt slow" in ## Notes must not inflate it.
BEATS=$(awk '/^### Beat [0-9]+:/ { n = $3 + 0; if (n > max) max = n } END { if (max > 0) print max }' "$PLAN")
if [ -z "${BEATS:-}" ] || [ "$BEATS" -le 0 ]; then
  die "could not detect any '### Beat N:' heading in $PLAN — is the plan structurally valid?"
fi

kept=0
skipped=0
problems=()

for n in $(seq 1 "$BEATS"); do
  nn=$(printf '%02d' "$n")
  # The beat's log block: from its "## Beat NN" heading to the next "## " heading.
  block=$(awk -v pat="^## Beat ${nn}" '$0 ~ pat {f=1; print; next} f && /^## / {f=0} f {print}' "$LOG")
  still=$(find "$STILLS_DIR" -maxdepth 1 -name "$nn-*.png" -print 2>/dev/null | head -1)

  if [ -n "$still" ]; then
    kept=$((kept + 1))
    if [ -z "$block" ]; then
      problems+=("beat $nn: still file exists but no '## Beat $nn' block in stills-log.md")
      continue
    fi
    if ! grep -q 'https://fal\.media' <<<"$block"; then
      problems+=("beat $nn: kept still has no fal.media URL in its log block (phase 4 cannot animate it)")
    fi
  else
    if [ -n "$block" ] && grep -Eiq '^-[[:space:]]*status:[[:space:]]*skipped' <<<"$block"; then
      skipped=$((skipped + 1))
    else
      problems+=("beat $nn: no still file and no recorded skip in stills-log.md")
    fi
  fi
done

pct=$((kept * 100 / BEATS))
echo "check-set: $kept/$BEATS beats kept, $skipped skipped (${pct}% kept)"

if [ "${#problems[@]}" -gt 0 ]; then
  printf 'check-set: FAIL: %s\n' "${problems[@]}" >&2
  exit 1
fi

if [ "$pct" -lt 80 ]; then
  die "kept ratio ${pct}% is below the 80% episode threshold — mark the phase failed in state.md"
fi

echo "check-set: PASS"
