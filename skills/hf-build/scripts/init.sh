#!/usr/bin/env bash
# init.sh — scaffold a project's composition dir from the bundled hf-template, then lint it.
#
#   bash "$SKILL/scripts/init.sh" <composition-dir>
#   e.g. bash "$SKILL/scripts/init.sh" artifacts/my-launch-teaser/composition
#
# Copies hf-template/ (vendored GSAP + system-font @font-face + a contract-compliant, lint-clean
# multi-scene example) into <composition-dir>, then runs `hyperframes lint` so you start from a
# known-good baseline. After this, AUTHOR the scenes per 03-storyboard.md + 04-timing.json (edit
# index.html / add compositions/*.html), keeping the contract (references/composition-contract.md).
#
# Idempotent-ish: refuses to overwrite a non-empty dir unless --force is passed.
set -uo pipefail

DEST="${1:?usage: init.sh <composition-dir> [--force]}"
FORCE="${2:-}"
HF="$(command -v hyperframes || echo 'npx --yes hyperframes@0.6.112')"
# Resolve the template next to this script (works regardless of cwd).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/hf-template"

if [ ! -d "$TEMPLATE" ]; then
  echo "!! bundled template not found at $TEMPLATE" >&2
  exit 1
fi

if [ -d "$DEST" ] && [ -n "$(ls -A "$DEST" 2>/dev/null)" ] && [ "$FORCE" != "--force" ]; then
  echo "!! $DEST already exists and is non-empty. Pass --force to overwrite (a restyle re-authors in place)." >&2
  exit 1
fi

mkdir -p "$DEST"
# Copy template contents (including the vendored assets/) into DEST.
cp -R "$TEMPLATE"/. "$DEST"/
echo ">> scaffolded composition from hf-template -> $DEST"
echo "   (vendored GSAP at assets/gsap.min.js; fonts at assets/fonts.css; example index.html)"

echo ">> linting the fresh scaffold (should be 0 errors; one benign gsap_studio_edit_blocked warning is expected):"
( cd "$DEST" && $HF lint ) || true

cat <<'NEXT'

>> NEXT: author the real composition.
   - Edit index.html: replace the example scenes with your storyboard beats (03-storyboard.md),
     time them from 04-timing.json, theme to 01-concept.md (palette + literal font families).
   - Add registry blocks where one fits (references/registry-blocks.md): `hyperframes add <id>`.
   - Keep the contract (references/composition-contract.md). Re-run `hyperframes lint` until 0 errors.
   - Then hand off to hf-validate (lint --strict + snapshot) and hf-render.
NEXT
