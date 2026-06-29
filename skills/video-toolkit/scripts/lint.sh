#!/usr/bin/env bash
#
# lint.sh — the shared plan-lint HARNESS. Part of the `video-toolkit` skill.
#
# A recipe's plan (shotlist / keyframe-plan / beat-sheet) must pass a gate BEFORE any
# paid generation: the frozen seed tokens are pasted verbatim, the "no on-screen text"
# stack is present, counts/durations are in range, etc. The RULES are recipe-specific and
# stay bot-local; this harness is the shared runner + verdict formatter so every bot's
# `plan` stage gates the same way and prints the same JSON.
#
# Contract with the bot-local rules script:
#   - You provide a rules script. lint.sh runs:  bash <rules-script> <plan-file> [extra args...]
#   - The rules script prints ZERO OR MORE findings, one per line, to STDOUT
#     (each line = one problem with the plan; no lines = the plan passes).
#   - The rules script should exit 0 even when it finds problems (findings are data,
#     not a crash). A non-zero exit from the rules script is treated as a lint ERROR.
#
# lint.sh prints ONE JSON line:
#   {"plan":"…","rules":"…","findings":["…","…"],"count":N,"verdict":"PASS|FAIL"}
# Exit 0 when verdict=PASS (no findings); exit 1 when verdict=FAIL (>=1 finding);
# exit 2 on a usage/harness error (missing files, rules script crashed).
#
# Portability: bash 3.2, no jq.

set -euo pipefail
err() { printf 'lint: %s\n' "$*" >&2; }

[ $# -ge 2 ] || { err "usage: lint.sh <plan-file> <rules-script> [extra args...]"; exit 2; }
PLAN=$1; RULES=$2; shift 2
[ -f "$PLAN" ]  || { err "plan file not found: $PLAN"; exit 2; }
[ -f "$RULES" ] || { err "rules script not found: $RULES"; exit 2; }

# Run the bot-local rules; capture stdout (findings) and the exit code separately.
set +e
FINDINGS_RAW=$(bash "$RULES" "$PLAN" "$@" 2>/tmp/lint-rules.err)
RC=$?
set -e
if [ "$RC" -ne 0 ]; then
  err "rules script exited non-zero ($RC) — this is a harness error, not a plan verdict. stderr:"
  cat /tmp/lint-rules.err >&2 || true
  exit 2
fi

# Build findings array (one JSON string per non-empty line) and count.
COUNT=0; FINDINGS_JSON=""
while IFS= read -r line; do
  [ -n "$line" ] || continue
  COUNT=$(( COUNT + 1 ))
  esc=$(printf '%s' "$line" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().rstrip("\n")))')
  FINDINGS_JSON+="${esc},"
  err "  - $line"
done <<EOF
$FINDINGS_RAW
EOF
FINDINGS_JSON=${FINDINGS_JSON%,}

VERDICT=PASS; EXIT=0
[ "$COUNT" -eq 0 ] || { VERDICT=FAIL; EXIT=1; }

printf '{"plan":"%s","rules":"%s","findings":[%s],"count":%s,"verdict":"%s"}\n' \
  "$PLAN" "$RULES" "$FINDINGS_JSON" "$COUNT" "$VERDICT"

[ "$VERDICT" = PASS ] \
  && err "plan PASSED — safe to proceed to paid generation" \
  || err "plan FAILED with $COUNT finding(s) — FIX the plan before spending; do not generate"
exit "$EXIT"
