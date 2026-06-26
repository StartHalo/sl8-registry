#!/usr/bin/env bash
# rm-3d/scripts/check.sh — print the 3D deferral gate.
#
# rm-3d is a DEFERRED STUB: @remotion/three (Three.js per-frame WebGL) is H-RAM and OOMs the
# ~1.9 GB sandbox (Exit-137) at --concurrency=1. It is gated on REQ-005 (the runtime RAM tier).
# This script AUTHORS NOTHING. It prints the gate status, a best-effort read of available memory,
# and the activation checklist, then exits 0. bash 3.2 compatible: no `timeout`, no GNU-only flags.
set -u

# --- REQ-005 gate constants -------------------------------------------------
GATE="REQ-005 (runtime RAM tier)"
CEILING_GB="1.9"          # current sl8-animation per-render OOM ceiling
# A render headroom we'd want before even trying one low-poly 3D canvas at 1080p.
WANT_GB="4"

# --- best-effort total-memory probe (never fatal) ---------------------------
# darwin: sysctl hw.memsize (bytes); linux: /proc/meminfo MemTotal (kB). Anything
# else -> "unknown". All probes are guarded so the script always reaches the banner.
mem_gb="unknown"
os="$(uname -s 2>/dev/null || echo unknown)"
if [ "$os" = "Darwin" ]; then
  bytes="$(sysctl -n hw.memsize 2>/dev/null || echo "")"
  if [ -n "$bytes" ]; then
    mem_gb="$(awk -v b="$bytes" 'BEGIN { printf "%.1f", b/1073741824 }')"
  fi
elif [ -r /proc/meminfo ]; then
  kb="$(awk '/^MemTotal:/ { print $2; exit }' /proc/meminfo 2>/dev/null || echo "")"
  if [ -n "$kb" ]; then
    mem_gb="$(awk -v k="$kb" 'BEGIN { printf "%.1f", k/1048576 }')"
  fi
fi

# --- banner -----------------------------------------------------------------
echo "=================================================================="
echo " rm-3d — frame-driven 3D (@remotion/three)        STATUS: DEFERRED"
echo "=================================================================="
echo " This capability is SCAFFOLDED, NOT ACTIVE in v1."
echo " It authors no React and produces no output."
echo
echo " Gate          : ${GATE}"
echo " Why deferred  : @remotion/three is H-RAM (Three.js renders WebGL"
echo "                 every frame). The sandbox renders --concurrency=1"
echo "                 against a ~${CEILING_GB} GB ceiling -> a 3D scene OOMs"
echo "                 to Exit-137. (BOT-015 hit the OOM ceiling x6.)"
echo " Host total mem: ${mem_gb} GB   (informational; ceiling is per-render,"
echo "                 not host total -- this does NOT open the gate)"
echo " Want (>= )    : ${WANT_GB} GB render headroom before one low-poly 1080p canvas"
echo "------------------------------------------------------------------"
echo " v1 behavior when a brief implies 3D:"
echo "   * DO NOT install @remotion/three / write <ThreeCanvas> / add three."
echo "   * Hand back to rm-build for a 2D approximation (JTBD-5 RAM fallback):"
echo "       3D product spin   -> KenBurns / parallax over a flat cutout"
echo "       3D ranked chart   -> rm-dataviz 2D Bar / BarChart"
echo "       3D camera move    -> layered parallax + interpolate(scale)"
echo "   * Note the deferral in state.md (auditable decision)."
echo "   * rm-build contract C9 + rm-validate lint REJECT @remotion/three in v1."
echo "------------------------------------------------------------------"
echo " Activation checklist (ONLY after REQ-005 lands -- not in v1):"
echo "   1. Confirm the RAM tier; re-measure a Three.js render envelope."
echo "   2. Relax rm-build contract C9; allow <ThreeCanvas> in output."
echo "   3. Add @remotion/three (+ three, @react-three/fiber), version-pinned."
echo "   4. Lift the @remotion/three / ThreeCanvas / @react-three / useFrame("
echo "      forbidden-pattern entries in rm-validate for the new tier."
echo "   5. Replace evals/evals.json placeholder with graded 3D expectations."
echo "------------------------------------------------------------------"
echo " Contract reference: \$SKILL/references/3d.md"
echo "=================================================================="
echo "STATUS: DEFERRED -- do not author 3D in v1."

# Exit 0: this is an informational gate, not a failing test. The DEFERRED banner
# above is the signal; callers must not author @remotion/three regardless.
exit 0
