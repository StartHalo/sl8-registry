#!/usr/bin/env bash
# catalog.sh — list the Remotion building blocks available to the storyboard.
#
#   bash "$SKILL/scripts/catalog.sh" [remotion-project-or-template-dir]
#
# Unlike HyperFrames there is NO registry to fetch over the network. The vocabulary the
# storyboard assigns to beats is entirely bundled: the engine primitives in the starter's
# src/engine/, any presets in src/library/, the capability components already authored into
# src/, and the installed @remotion/* packages (all pinned to one version, currently 4.0.473).
# This script INTROSPECTS that — it reads files, it never renders and never hits the network.
#
# Target resolution (first that exists wins):
#   1. $1 (an explicit project/template dir)
#   2. ./remotion-project              (run from inside artifacts/<project>/)
#   3. $SKILL/../rm-build/scripts/remotion-template   (the bundled starter — the default)
#
# A failure NEVER blocks the storyboard: on any problem it prints a clear note pointing at
# references/remotion-blocks.md (the authoritative list rm-build authors from anyway) and
# exits 0. bash 3.2 compatible — no `timeout`, no GNU-only flags.
set -uo pipefail

# Resolve this script's own dir (so we can find the sibling bundled starter).
SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." 2>/dev/null && pwd)"
TEMPLATE_DEFAULT="$SKILL_DIR/../rm-build/scripts/remotion-template"

PROJ=""
if [ "${1:-}" != "" ] && [ -d "${1:-}" ]; then
  PROJ="$1"
elif [ -d "./remotion-project" ]; then
  PROJ="./remotion-project"
elif [ -d "$TEMPLATE_DEFAULT" ]; then
  PROJ="$TEMPLATE_DEFAULT"
fi

echo ">> Remotion building blocks available to the storyboard"
if [ -z "$PROJ" ]; then
  echo "!! Could not locate a remotion-project/ or the bundled starter." >&2
  echo "   Use the catalog in $SKILL_DIR/references/remotion-blocks.md — those are the blocks" >&2
  echo "   rm-build authors from anyway. A failed catalog never blocks the storyboard." >&2
  exit 0
fi
echo "   source: $PROJ"
echo

SRC="$PROJ/src"

# --- Engine primitives (the frame-driven workhorses every beat reaches for first) ---
echo "== Engine primitives (src/engine/primitives.tsx) =="
if [ -f "$SRC/engine/primitives.tsx" ]; then
  grep -E '^export (const|function) ' "$SRC/engine/primitives.tsx" 2>/dev/null \
    | sed -E 's/^export (const|function) ([A-Za-z0-9_]+).*/  - \2/' \
    | sort -u
else
  echo "  (engine/primitives.tsx not found — see references/remotion-blocks.md)"
fi
echo "  Reuse-first: RiseIn/FadeIn (entrances), Counter (numbers, tabular-nums), Bar (data),"
echo "  Card (scale+fade), DividerWipe (rules), KenBurns (slow drift), parseStat (\$40M -> num)."
echo

# --- Library presets (BOT-014 style harvest — backlog; may be empty in v1) ---
echo "== Library presets (src/library/) =="
if [ -d "$SRC/library" ] && ls "$SRC/library"/*.tsx >/dev/null 2>&1; then
  for f in "$SRC/library"/*.tsx; do echo "  - $(basename "$f" .tsx)"; done
else
  echo "  (none in v1 — the style library is a backlog harvest; compose engine primitives)"
fi
echo

# --- Capability components already authored into src/ (caption / chart / audio-viz) ---
echo "== Capability components in src/ (authored by rm-captions/dataviz/audioviz) =="
# Strip the directory FIRST, then match on the basename — the absolute path can contain
# stray substrings (e.g. "sl8-pipeline" matches "line") that would false-positive otherwise.
# (Plain pipeline of find|grep|sed — no nested $() or case, for bash 3.2 robustness.)
CAP="$(find "$SRC" -maxdepth 2 -type f -name '*.tsx' 2>/dev/null \
  | grep -viE '/engine/|/library/' \
  | sed -E 's#.*/##; s#\.tsx$##' \
  | grep -iE 'caption|chart|bar|line|spectrum|waveform|counter|viz' \
  | sort -u)"
if [ -n "$CAP" ]; then
  echo "$CAP" | sed 's/^/  - /'
else
  echo "  (none yet — rm-build drops capability starters in when the JTBD needs them)"
fi
echo

# --- Installed @remotion/* packages (all one pinned version — NO 'add' needed) ---
echo "== Installed @remotion/* packages (package.json — all one version, NO 'add') =="
if [ -f "$PROJ/package.json" ]; then
  grep -Eo '"@remotion/[a-z-]+": *"[^"]+"' "$PROJ/package.json" 2>/dev/null \
    | sed -E 's/"(@remotion\/[a-z-]+)": *"([^"]+)"/  - \1@\2/' | sort -u
  echo "  - remotion@$(grep -Eo '"remotion": *"[^"]+"' "$PROJ/package.json" | sed -E 's/.*"([^"]+)"$/\1/')"
else
  echo "  (no package.json — expected @remotion/{transitions,captions,shapes,paths,layout-utils,"
  echo "   media-utils,motion-blur,player} + remotion, all pinned to 4.0.473)"
fi
echo

# --- Structure + transition vocabulary (static — the contract primitives) ---
echo "== Structure primitives (how beats compose) =="
echo "  - <Series> / <Series.Sequence durationInFrames offset>   back-to-back scenes"
echo "  - <TransitionSeries> + <TransitionSeries.Sequence> / .Transition / .Overlay"
echo "  - <Sequence from durationInFrames premountFor layout=\"none\">   overlay layers"
echo "== @remotion/transitions presets (the transition OUT of a beat) =="
echo "  - fade() | slide({direction:from-left|right|top|bottom}) | wipe() | flip() | clockWipe()"
echo "    timing: linearTiming({durationInFrames}) | springTiming({config:{damping}})"
echo "    NOTE: a Transition OVERLAPS its two scenes -> it SHORTENS the total durationInFrames."
echo
echo ">> Assign each beat a block + structure+transition + layer + frame range."
echo "   Decision menu: $SKILL_DIR/references/beat-to-block.md"
echo "   Full catalog : $SKILL_DIR/references/remotion-blocks.md"
exit 0
