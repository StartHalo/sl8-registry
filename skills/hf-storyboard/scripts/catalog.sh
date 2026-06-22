#!/usr/bin/env bash
# catalog.sh — list the HyperFrames registry blocks/components available to the storyboard.
#
#   bash "$SKILL/scripts/catalog.sh"
#
# Runs `hyperframes catalog` so you can see the real block/component ids before assigning them to
# beats in 03-storyboard.md. The registry is a public GitHub URL declared in the project's
# hyperframes.json; the catalog is fetched at *build* time, not render time, so this is a
# storyboard-time convenience only.
#
# Run from inside artifacts/<project>/composition/ if it exists (picks up that project's registry);
# otherwise it runs in the current dir and lists the default registry. Either way, a failure NEVER
# blocks the storyboard — if the registry is unreachable (offline sandbox), fall back to the
# category -> id table in ../hf-build/references/registry-blocks.md (the ids hf-build hand-authors
# from anyway). Exits 0 on a clean list, prints a clear note + exits 0 on an unreachable registry.
set -uo pipefail

HF="$(command -v hyperframes || echo 'npx --yes hyperframes@0.6.112')"

echo ">> hyperframes catalog (available registry blocks/components):"
echo "   cwd: $(pwd)"
echo

# Capture output so we can give an actionable message on failure without aborting the caller.
if OUT="$($HF catalog 2>&1)"; then
  printf '%s\n' "$OUT"
  echo
  echo ">> Pick block/component ids for each beat. Reuse-first: prefer a block over hand-authoring."
  echo "   Mapping (category -> id) and how to wire them: ../hf-build/references/registry-blocks.md"
  exit 0
else
  printf '%s\n' "$OUT" >&2
  echo >&2
  echo "!! hyperframes catalog failed (registry likely unreachable — offline sandbox?)." >&2
  echo "   This does NOT block the storyboard. Use the category -> id table in" >&2
  echo "   ../hf-build/references/registry-blocks.md — those are the ids hf-build hand-authors from." >&2
  echo "   The bundled template already ships title-card + stat reveal + liquid-wipe (no 'add' needed)." >&2
  exit 0
fi
