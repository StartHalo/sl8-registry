#!/usr/bin/env bash
# capture.sh — ingest a website (brand site / screen / product page) with `hyperframes capture`,
# then copy the useful pieces (screenshots + extracted design tokens + downloaded assets) into the
# project's assets/captures/<slug>/.
#
#   bash capture.sh <url> <project-artifacts-dir> [slug] [max-screenshots]
#   e.g. bash capture.sh https://acme.com artifacts/launch-teaser acme 6
#
# <url>                   : the page to capture (brand/site/screenshot ingestion source).
# <project-artifacts-dir> : artifacts/<project> — output lands under <dir>/assets/captures/<slug>/.
# [slug]                  : optional folder name (default = a slug derived from the URL host).
# [max-screenshots]       : optional cap on scroll screenshots (default 8; capture's own default is 24).
#
# It runs EXACTLY the spec-confirmed command (the URL is positional, JSON for programmatic use):
#   hyperframes capture "<url>" -o <tmp-capture-dir> --json --max-screenshots <n>
# capture writes a project dir and prints JSON:
#   { "ok": bool, "projectDir": "...", "title": "...", "screenshots": N, "assets": N,
#     "fonts": [...], "warnings": [...] }
# with this on-disk tree:
#   <projectDir>/screenshots/{scroll-NNN.png, contact-sheet.jpg}
#   <projectDir>/extracted/{design-styles.json, tokens.json, fonts-manifest.json, visible-text.txt, page.html}
#   <projectDir>/assets/{fonts,svgs}/...
# We capture into a TEMP dir, parse ok/projectDir with node, then copy the durable bits into
# assets/captures/<slug>/ (screenshots/, extracted tokens+styles+fonts+text, and any downloaded assets).
# Local + keyless (hyperframes uses the pinned/system Chrome). NO HeyGen cloud/auth.
set -uo pipefail

URL="${1:?usage: capture.sh <url> <project-artifacts-dir> [slug] [max-screenshots]}"
PROJ="${2:?missing project-artifacts-dir (artifacts/<project>)}"
SLUG="${3:-}"
MAXSS="${4:-8}"
HF="npx --yes hyperframes@0.6.112"

# Derive a slug from the URL host if none was given (acme.com/path -> acme-com).
if [ -z "$SLUG" ]; then
  host="$(printf '%s' "$URL" | sed -E 's#^[a-zA-Z]+://##; s#/.*$##; s#^www\.##')"
  SLUG="$(printf '%s' "$host" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed -E 's/-+/-/g; s/^-|-$//g')"
  [ -z "$SLUG" ] && SLUG="capture"
fi

DEST="$PROJ/assets/captures/$SLUG"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/hf-capture-XXXXXX")"
CAPDIR="$TMP/cap"
mkdir -p "$DEST"

echo ">> capture: hyperframes capture \"$URL\" -o $CAPDIR --json --max-screenshots $MAXSS"
JSON="$($HF capture "$URL" -o "$CAPDIR" --json --max-screenshots "$MAXSS" 2>/tmp/hf-capture-err.txt)" || {
  echo "!! hyperframes capture failed:" >&2; tail -10 /tmp/hf-capture-err.txt >&2; rm -rf "$TMP"; exit 1; }

# Parse ok + projectDir (+ a short summary line) from the JSON.
PROJECT_DIR="$(printf '%s' "$JSON" | node -e '
  let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
    let j; try{ j=JSON.parse(s); }catch(e){ console.error("!! capture did not return JSON"); process.exit(2); }
    if(j.ok===false){ console.error("!! capture reported ok:false: "+(j.error||JSON.stringify(j.warnings||j))); process.exit(3); }
    if(!j.projectDir){ console.error("!! no projectDir in capture output"); process.exit(4); }
    console.error("   captured: title="+JSON.stringify(j.title||"")+" screenshots="+(j.screenshots||0)+" assets="+(j.assets||0)+" fonts="+JSON.stringify(j.fonts||[]));
    process.stdout.write(j.projectDir);
  });
')" || { rm -rf "$TMP"; exit "$?"; }

[ -d "$PROJECT_DIR" ] || PROJECT_DIR="$CAPDIR"   # fall back to the dir we asked for

# Copy the durable, composition-useful pieces into assets/captures/<slug>/.
#  - screenshots/ (scroll-*.png + contact-sheet.jpg) — frames you can drop into the composition.
#  - extracted/   (design-styles.json, tokens.json, fonts-manifest.json, visible-text.txt) — the brand
#    palette/fonts/text for hf-build + hf-brand-extract; page.html for reference.
#  - assets/      (downloaded images/svgs/fonts) — real brand assets when the page exposes them.
copied=0
if [ -d "$PROJECT_DIR/screenshots" ]; then
  mkdir -p "$DEST/screenshots"; cp -R "$PROJECT_DIR/screenshots/." "$DEST/screenshots/" && copied=1
fi
if [ -d "$PROJECT_DIR/extracted" ]; then
  mkdir -p "$DEST/extracted"
  for f in design-styles.json tokens.json fonts-manifest.json visible-text.txt page.html animations.json; do
    [ -f "$PROJECT_DIR/extracted/$f" ] && cp -f "$PROJECT_DIR/extracted/$f" "$DEST/extracted/$f"
  done
  copied=1
fi
if [ -d "$PROJECT_DIR/assets" ] && [ -n "$(ls -A "$PROJECT_DIR/assets" 2>/dev/null)" ]; then
  mkdir -p "$DEST/assets"; cp -R "$PROJECT_DIR/assets/." "$DEST/assets/" && copied=1
fi
[ -f "$PROJECT_DIR/meta.json" ] && cp -f "$PROJECT_DIR/meta.json" "$DEST/meta.json"

rm -rf "$TMP"

if [ "$copied" -eq 0 ]; then
  echo "!! capture produced no screenshots/extracted/assets to copy (check the URL/Chrome)." >&2
  exit 1
fi

echo ">> capture saved under: $DEST"
[ -d "$DEST/screenshots" ] && echo "   screenshots: $(ls "$DEST/screenshots"/*.png 2>/dev/null | wc -l | tr -d ' ') frame(s) + contact-sheet"
[ -f "$DEST/extracted/tokens.json" ] && echo "   design tokens: $DEST/extracted/tokens.json (palette/type for hf-build)"
echo ">> DONE. Reference frames from the composition as assets/captures/$SLUG/screenshots/<file>.png"
