#!/usr/bin/env bash
# check.sh — rm-parametrize gate. This skill is DEFERRED (scaffolded-not-active), gated on
# REQ-005 (sandbox RAM). It ships NO render-producing logic. This script only prints the
# deferral status, the activation gate, and a best-effort RAM probe, then exits non-zero so
# the orchestrator does NOT route the phase chain through batch-at-scale in v1.
#
#   bash "$SKILL/scripts/check.sh"
#
# Exit codes:
#   3  = DEFERRED (the v1 default) — do not author/render; render variants one at a time.
#   0  = ACTIVE   — only after the REQ-005 RAM tier lands AND PARAMETRIZE_ACTIVE=1 is set.
#
# bash 3.2 safe: no `timeout`, no GNU-only flags, no /proc-only assumptions.
set -uo pipefail

# --- Activation gate (flip when REQ-005 ships) -------------------------------------------------
# Activation is opt-in and explicit: the RAM tier must exist AND the operator must set the env flag.
# Default (unset) => DEFERRED.
ACTIVE="${PARAMETRIZE_ACTIVE:-0}"

# Minimum free memory (MB) a batch fan-out needs above the ~1.9 GB single-render OOM ceiling.
REQ005_MIN_FREE_MB=3072

# --- Best-effort RAM probe (informational; portable across Linux sandbox + macOS host) ---------
free_mb="unknown"
if [ -r /proc/meminfo ]; then
  # Linux (the sl8-animation sandbox): MemAvailable is in kB.
  kb=$(awk '/^MemAvailable:/ { print $2; exit }' /proc/meminfo 2>/dev/null || true)
  if [ -n "${kb:-}" ]; then
    free_mb=$(( kb / 1024 ))
  fi
elif command -v sysctl >/dev/null 2>&1; then
  # macOS host fallback: report total physical RAM (no cheap "available" metric).
  bytes=$(sysctl -n hw.memsize 2>/dev/null || true)
  if [ -n "${bytes:-}" ]; then
    free_mb=$(( bytes / 1024 / 1024 ))
  fi
fi

echo "=================================================================="
echo "  rm-parametrize — DEFERRED (scaffolded-not-active)"
echo "=================================================================="
echo "  Capability : Zod + calculateMetadata data-driven / batch-at-scale"
echo "               variants (GitHub-Unwrapped / Spotify-Wrapped class)."
echo "  Gate       : REQ-005 (sandbox RAM). v1 is CPU-2D, ONE render at a"
echo "               time; the ~1.9 GB starter OOMs (Exit-137) above ~1.9 GB"
echo "               even at --concurrency=1, and a batch fan-out amplifies"
echo "               peak memory + wall-clock."
echo "  Activate   : REQ-005 RAM tier live  AND  PARAMETRIZE_ACTIVE=1."
echo "               Needs ~${REQ005_MIN_FREE_MB} MB free above the single-render ceiling."
echo "  Probe      : approx free/total memory = ${free_mb} MB (informational)"
echo "------------------------------------------------------------------"

if [ "$ACTIVE" != "1" ]; then
  echo "  RESULT     : DEFERRED. Do NOT route the phase chain here."
  echo "               Fallback: render variants one at a time via the"
  echo "               normal rm-build -> rm-validate -> rm-render chain"
  echo "               (re-run per record). Record 'rm-parametrize deferred"
  echo "               (REQ-005 RAM)' in state.md."
  echo "=================================================================="
  exit 3
fi

# --- ACTIVE path (only reached when explicitly opted in) ---------------------------------------
echo "  PARAMETRIZE_ACTIVE=1 set — checking the RAM headroom..."
if [ "$free_mb" = "unknown" ]; then
  echo "  RESULT     : CANNOT CONFIRM RAM headroom (probe unavailable)."
  echo "               Refusing to fan out a batch render blind. Treat as DEFERRED."
  echo "=================================================================="
  exit 3
fi
if [ "$free_mb" -lt "$REQ005_MIN_FREE_MB" ]; then
  echo "  RESULT     : INSUFFICIENT RAM (${free_mb} MB < ${REQ005_MIN_FREE_MB} MB). Stay single-render."
  echo "=================================================================="
  exit 3
fi
echo "  RESULT     : ACTIVE — RAM headroom OK. Proceed to the active procedure"
echo "               (read schema + dataset -> emit per-variant props + manifest"
echo "               -> hand the manifest to rm-render). See SKILL.md steps 1-4."
echo "=================================================================="
exit 0
