#!/usr/bin/env bash
# check-script.sh — structural self-check for 02-script.md (rm-script output).
#
# Verifies the written script has the required sections (Assumptions, Arc, Beats
# table, Provenance table), the beats-table contract columns, at least one beat
# row, and a stated total — BEFORE handing off to rm-storyboard. Pure text/shape
# check: no rendering, no network, no model. This does NOT judge fidelity (no
# invented facts) — that is the author's job per references/fidelity-rule.md.
#
# Usage: scripts/check-script.sh artifacts/<project>/02-script.md
# Exit:  0 = structurally valid; 1 = bad/missing arg or file; 2 = failed checks.
#
# bash 3.2 safe: no associative arrays, no `timeout`, no GNU-only flags.

set -u

SCRIPT_MD="${1:-}"
if [ -z "$SCRIPT_MD" ]; then
  echo "usage: check-script.sh <path-to-02-script.md>" >&2
  exit 1
fi
if [ ! -f "$SCRIPT_MD" ]; then
  echo "FAIL: file not found: $SCRIPT_MD" >&2
  exit 1
fi
if [ ! -s "$SCRIPT_MD" ]; then
  echo "FAIL: file is empty: $SCRIPT_MD" >&2
  exit 1
fi

fail=0

check_heading() {
  # $1 = ERE pattern, $2 = human label
  if grep -Eqi "$1" "$SCRIPT_MD"; then
    echo "ok   : $2"
  else
    echo "FAIL : missing $2" >&2
    fail=1
  fi
}

check_heading '^##[[:space:]]+Assumptions' 'Assumptions block'
check_heading '^##[[:space:]]+Arc'          'Arc (named narrative arc)'
check_heading '^##[[:space:]]+Beats'        'Beats section'
check_heading '^##[[:space:]]+Provenance'   'Provenance table'

# Beats-table header must carry the contract columns the downstream phases read:
#   | # | sec | VO line (narration) | On-screen text | Focal token |
if grep -Eqi '\|[[:space:]]*#[[:space:]]*\|.*VO.*\|.*[Oo]n-screen.*\|.*[Ff]ocal' "$SCRIPT_MD"; then
  echo "ok   : beats table has the contract columns (# / VO / on-screen / focal)"
else
  echo "FAIL : beats table missing a contract column (# | sec | VO line | On-screen text | Focal token)" >&2
  fail=1
fi

# At least one beat data row: a markdown table row whose first cell is a number.
beat_rows=$(grep -Ec '^\|[[:space:]]*[0-9]+[[:space:]]*\|' "$SCRIPT_MD")
if [ "${beat_rows:-0}" -ge 1 ]; then
  echo "ok   : ${beat_rows} beat row(s) found"
else
  echo "FAIL : no numbered beat rows found in the Beats table" >&2
  fail=1
fi

# A stated total duration line (e.g. "**Total: ~15.0 s**").
if grep -Eqi 'total[^0-9]{0,12}[0-9]' "$SCRIPT_MD"; then
  echo "ok   : total duration stated"
else
  echo "WARN : no 'Total: ~N s' line found — state the summed beat seconds" >&2
fi

if [ "$fail" -ne 0 ]; then
  echo "RESULT: 02-script.md is structurally INCOMPLETE — fix the items above before rm-storyboard." >&2
  exit 2
fi
echo "RESULT: 02-script.md is structurally valid."
exit 0
