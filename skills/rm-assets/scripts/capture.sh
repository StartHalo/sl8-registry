#!/usr/bin/env bash
# capture.sh — ingest a website (brand site / screen / product page) into the per-project Remotion app
# so its frames are usable as staticFile() backdrops. Two engines, in priority order:
#   1. `hyperframes capture` (present on the sl8-animation runtime) — screenshots + extracted design tokens.
#   2. fallback: the runtime's Chrome Headless Shell ($CHROME_HEADLESS_SHELL) — a single full-page PNG.
# Screenshots + any downloaded assets are RE-TARGETED into remotion-project/public/captures/<slug>/ (so
# staticFile("captures/<slug>/<file>.png") resolves at render). Extracted design tokens (palette/fonts/text)
# go to assets/captures/<slug>/extracted/ — they are design METADATA read by rm-build / rm-brand-extract,
# not render assets, so they stay out of public/.
#
#   bash capture.sh <url> <project-artifacts-dir> [slug] [max-screenshots]
#   e.g. bash capture.sh https://acme.com artifacts/api-teaser acme 6
#
# <url>                   : the page to capture.
# <project-artifacts-dir> : artifacts/<project>. Output lands under:
#                             <dir>/remotion-project/public/captures/<slug>/   (frames + assets, staticFile)
#                             <dir>/assets/captures/<slug>/extracted/           (design tokens, metadata)
# [slug]                  : optional folder name (default = a slug derived from the URL host).
# [max-screenshots]       : optional cap on scroll screenshots (default 8; hyperframes' own default is 24).
#
# hyperframes runs EXACTLY the spec-confirmed command (positional URL, JSON for programmatic use):
#   hyperframes capture "<url>" -o <tmp-capture-dir> --json --max-screenshots <n>
# and prints { "ok": bool, "projectDir": "...", "title": "...", "screenshots": N, "assets": N, "fonts": [...] }
# with a <projectDir>/{screenshots,extracted,assets}/ tree. We capture into a TEMP dir, parse ok/projectDir
# with node, then copy the durable bits to the two targets. Local + keyless (pinned/system Chrome). NO HeyGen.
set -uo pipefail

URL="${1:?usage: capture.sh <url> <project-artifacts-dir> [slug] [max-screenshots]}"
PROJ="${2:?missing project-artifacts-dir (artifacts/<project>)}"
SLUG="${3:-}"
MAXSS="${4:-8}"

# Derive a slug from the URL host if none was given (acme.com/path -> acme-com).
if [ -z "$SLUG" ]; then
  host="$(printf '%s' "$URL" | sed -E 's#^[a-zA-Z]+://##; s#/.*$##; s#^www\.##')"
  SLUG="$(printf '%s' "$host" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed -E 's/-+/-/g; s/^-|-$//g')"
  [ -z "$SLUG" ] && SLUG="capture"
fi

PUBLIC_DEST="$PROJ/remotion-project/public/captures/$SLUG"   # staticFile-reachable frames + assets
META_DEST="$PROJ/assets/captures/$SLUG"                      # design tokens (metadata)
mkdir -p "$PUBLIC_DEST"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/rm-capture-XXXXXX")"
CAPDIR="$TMP/cap"

copied=0

if command -v hyperframes >/dev/null 2>&1; then
  # ---- Engine 1: hyperframes capture (rich — screenshots + extracted design tokens) ----
  echo ">> capture (hyperframes): hyperframes capture \"$URL\" -o $CAPDIR --json --max-screenshots $MAXSS"
  JSON="$(hyperframes capture "$URL" -o "$CAPDIR" --json --max-screenshots "$MAXSS" 2>/tmp/rm-capture-err.txt)" || {
    echo "!! hyperframes capture failed:" >&2; tail -10 /tmp/rm-capture-err.txt >&2; rm -rf "$TMP"; exit 1; }

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

  # Frames -> public/ (staticFile); design tokens -> assets/ (metadata); downloaded assets -> public/.
  if [ -d "$PROJECT_DIR/screenshots" ]; then
    cp -R "$PROJECT_DIR/screenshots/." "$PUBLIC_DEST/" && copied=1
  fi
  if [ -d "$PROJECT_DIR/extracted" ]; then
    mkdir -p "$META_DEST/extracted"
    for f in design-styles.json tokens.json fonts-manifest.json visible-text.txt page.html animations.json; do
      [ -f "$PROJECT_DIR/extracted/$f" ] && cp -f "$PROJECT_DIR/extracted/$f" "$META_DEST/extracted/$f"
    done
    copied=1
  fi
  if [ -d "$PROJECT_DIR/assets" ] && [ -n "$(ls -A "$PROJECT_DIR/assets" 2>/dev/null)" ]; then
    mkdir -p "$PUBLIC_DEST/assets"; cp -R "$PROJECT_DIR/assets/." "$PUBLIC_DEST/assets/" && copied=1
  fi
  [ -f "$PROJECT_DIR/meta.json" ] && { mkdir -p "$META_DEST"; cp -f "$PROJECT_DIR/meta.json" "$META_DEST/meta.json"; }
else
  # ---- Engine 2: Chrome Headless Shell fallback (single full-page PNG; no design-token extraction) ----
  CHROME="${CHROME_HEADLESS_SHELL:-/opt/remotion/chrome-headless-shell}"
  if [ ! -x "$CHROME" ]; then
    echo "!! neither hyperframes nor a Chrome Headless Shell ($CHROME) is available to capture \"$URL\"." >&2
    echo "   Run the capture step in-sandbox (sl8-animation ships both); record the block in state.md." >&2
    rm -rf "$TMP"; exit 1
  fi
  echo ">> capture (chrome fallback): $CHROME --headless --screenshot \"$URL\""
  SHOT="$PUBLIC_DEST/scroll-000.png"
  "$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --virtual-time-budget=15000 --window-size=1280,1600 \
    --screenshot="$SHOT" "$URL" >/tmp/rm-capture-err.txt 2>&1 || {
      echo "!! chrome screenshot failed:" >&2; tail -10 /tmp/rm-capture-err.txt >&2; rm -rf "$TMP"; exit 1; }
  if [ -s "$SHOT" ]; then
    copied=1
    echo "   (fallback: one full-page screenshot only; no extracted design tokens — note this in state.md)"
  fi
fi

rm -rf "$TMP"

if [ "$copied" -eq 0 ]; then
  echo "!! capture produced no screenshots/extracted/assets to copy (check the URL/Chrome)." >&2
  exit 1
fi

echo ">> capture saved under: $PUBLIC_DEST"
echo "   screenshots: $(ls "$PUBLIC_DEST"/*.png 2>/dev/null | wc -l | tr -d ' ') frame(s) in public/ (staticFile-reachable)"
[ -f "$META_DEST/extracted/tokens.json" ] && echo "   design tokens: $META_DEST/extracted/tokens.json (palette/type for rm-build / rm-brand-extract)"
echo ">> DONE. Reference a frame as <Img src={staticFile(\"captures/$SLUG/contact-sheet.jpg\")} /> (or any scroll-NNN.png)."
