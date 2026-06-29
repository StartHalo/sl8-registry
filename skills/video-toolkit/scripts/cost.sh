#!/usr/bin/env bash
#
# cost.sh — pre-flight cost estimate + balance snapshot for a paid generation.
# Part of the shared `video-toolkit` skill.
#
# WHY THIS EXISTS: ai-gen's per-call `credits_used` JSON field is unreliable (observed
# ~8x over-reported on Seedance i2v). The ONLY trustworthy cost signals are
#   (a) `ai-gen estimate`  — the pricing API, queried BEFORE you spend, and
#   (b) `ai-gen balance`   — deltas across a run (billing lags ~5 min).
# So a recipe should estimate before each paid stage and gate with the generators'
# own --max-cost. This wrapper standardizes both calls.
#
# Usage:
#   cost.sh estimate <model-id> [key=value ...]
#       e.g. cost.sh estimate bytedance/seedance-2.0/fast/reference-to-video duration=8 resolution=720p
#       Prints one JSON line: {"model":"…","credits":N,"usd":N.NN,"raw_ok":true}
#       (credits/usd are best-effort parsed from the estimate; raw_ok=false ->
#        consult stderr for the raw estimate output.)
#
#   cost.sh balance
#       Prints {"credits":N,"usd":N.NN} — snapshot before/after a run to measure the delta.
#
# Conversion: 1 credit ~= $0.004 (used only when the estimate doesn't carry a USD figure).
# Portability: bash 3.2, no jq (python3 parses the JSON).

set -euo pipefail

err() { printf 'cost: %s\n' "$*" >&2; }
USD_PER_CREDIT=0.004

command -v ai-gen  >/dev/null 2>&1 || { err "ai-gen not found on PATH"; exit 2; }
command -v python3 >/dev/null 2>&1 || { err "python3 not found on PATH"; exit 2; }

SUB=${1:-}
[ -n "$SUB" ] || { err "usage: cost.sh estimate <model-id> [k=v ...]  |  cost.sh balance"; exit 2; }
shift || true

parse_credits_usd() {
  # stdin: raw ai-gen JSON. args: $1 = USD_PER_CREDIT. Prints "credits<TAB>usd<TAB>ok".
  python3 -c '
import json, sys
upc = float(sys.argv[1])
try:
    doc = json.load(sys.stdin)
except Exception:
    print("\t\tfalse"); sys.exit(0)
def find(d, keys):
    if isinstance(d, dict):
        for k, v in d.items():
            if k.lower() in keys and isinstance(v, (int, float)):
                return float(v)
        for v in d.values():
            r = find(v, keys)
            if r is not None: return r
    elif isinstance(d, list):
        for v in d:
            r = find(v, keys)
            if r is not None: return r
    return None
credits = find(doc, {"credits","credit","estimated_credits","cost_credits"})
usd     = find(doc, {"usd","dollars","cost_usd","price_usd","amount_usd"})
if credits is None and usd is not None:
    credits = usd / upc
if usd is None and credits is not None:
    usd = credits * upc
if credits is None and usd is None:
    print("\t\tfalse"); sys.exit(0)
print(f"{credits:.1f}\t{usd:.2f}\ttrue")
' "$1"
}

case "$SUB" in
  estimate)
    MODEL=${1:-}; [ -n "$MODEL" ] || { err "estimate needs a <model-id>"; exit 2; }
    shift || true
    if ! RAW=$(ai-gen estimate "$MODEL" "$@" 2>/dev/null); then
      err "ai-gen estimate failed for $MODEL $* — falling back to no estimate (gate the call with --max-cost)"
      printf '{"model":"%s","credits":null,"usd":null,"raw_ok":false}\n' "$MODEL"
      exit 0
    fi
    IFS=$'\t' read -r CR USD OK <<EOF
$(printf '%s' "$RAW" | parse_credits_usd "$USD_PER_CREDIT")
EOF
    if [ "$OK" = true ]; then
      printf '{"model":"%s","credits":%s,"usd":%s,"raw_ok":true}\n' "$MODEL" "$CR" "$USD"
    else
      err "could not parse credits/usd from estimate — raw output follows:"; printf '%s\n' "$RAW" >&2
      printf '{"model":"%s","credits":null,"usd":null,"raw_ok":false}\n' "$MODEL"
    fi ;;
  balance)
    if ! RAW=$(ai-gen balance 2>/dev/null); then err "ai-gen balance failed"; exit 1; fi
    IFS=$'\t' read -r CR USD OK <<EOF
$(printf '%s' "$RAW" | parse_credits_usd "$USD_PER_CREDIT")
EOF
    if [ "$OK" = true ]; then printf '{"credits":%s,"usd":%s}\n' "$CR" "$USD"
    else err "could not parse balance — raw output:"; printf '%s\n' "$RAW" >&2; printf '{"credits":null,"usd":null}\n'; fi ;;
  *) err "unknown subcommand '$SUB' (estimate|balance)"; exit 2 ;;
esac
