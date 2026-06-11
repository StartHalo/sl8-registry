#!/usr/bin/env bash
# Install Remotion deps and render the requested aspect ratios. Run from INSIDE the copied
# Remotion project dir (which must contain props.json).
#
#   bash render.sh "<space-separated ARs>" "<exports-dir>"
#   e.g. bash render.sh "16x9 9x16 1x1" ../exports
#
# Reads ./props.json for { style }. Outputs <exports>/<style>-<ar>.mp4.
# Exit 0 only if every requested AR rendered a non-empty file.
#
# Chrome strategy (the key cross-template bit):
#   * On sl8-animation the template SHIPS Remotion's Chrome Headless Shell, pre-downloaded at
#     /opt/remotion/chrome-headless-shell (also $CHROME_HEADLESS_SHELL). Remotion has NO env var
#     for the browser path AND E2B `commands.run` does not inherit image ENV — so we MUST pass it
#     explicitly with --browser-executable, or Remotion re-downloads Chrome into node_modules/.remotion.
#   * Elsewhere (sl8-base / local dev) there's no pre-installed shell → install the apt libs and
#     `npx remotion browser ensure` (the ~300-400MB one-time download).

set -uo pipefail
ARS="${1:-9x16}"
EXPORTS="${2:-../exports}"
mkdir -p "$EXPORTS"

# 0. Locate a pre-installed Chrome Headless Shell (sl8-animation ships one).
CHROME_SHELL="${CHROME_HEADLESS_SHELL:-/opt/remotion/chrome-headless-shell}"
BROWSER_FLAG=""
if [ -x "$CHROME_SHELL" ]; then
  echo ">> Using pre-installed Chrome Headless Shell: $CHROME_SHELL"
  BROWSER_FLAG="--browser-executable=$CHROME_SHELL"
else
  echo ">> No pre-installed Chrome shell; will install libs + ensure the shell."
  # System libraries a headless Chrome links against (best-effort; harmless if already present).
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq 2>/dev/null || true
    sudo apt-get install -y -qq \
      libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 \
      libxrandr2 libxkbcommon-dev libxfixes3 libxcomposite1 \
      libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 2>/dev/null || true
  fi
fi

# 1. Install deps — pin ALL remotion packages to ONE real, resolved version (skew is the #1 break).
if [ ! -d node_modules/remotion ]; then
  RV="$(npm view remotion version 2>/dev/null || echo 4.0.474)"
  echo ">> Installing Remotion $RV + deps ..."
  npm install --no-audit --no-fund \
    "remotion@${RV}" "@remotion/cli@${RV}" "@remotion/google-fonts@${RV}" "@remotion/transitions@${RV}" \
    "react@^19" "react-dom@^19" "roughjs@^4.6.0" || { echo "!! npm install failed"; exit 1; }
  npm install --no-audit --no-fund -D \
    "@types/react@^19" "@types/react-dom@^19" "typescript@^5" 2>/dev/null || true
fi

# 2. If there is NO pre-installed shell, ensure one (one-time download).
if [ -z "$BROWSER_FLAG" ]; then
  echo ">> Ensuring Chrome Headless Shell (one-time ~300-400MB) ..."
  npx remotion browser ensure || echo "!! browser ensure reported an issue (continuing)"
fi

# 3. Read the chosen style from props.json (for the output filename).
STYLE="$(node -e 'try{const p=require("./props.json");process.stdout.write(String(p.style||"minimal-editorial"))}catch(e){process.stdout.write("minimal-editorial")}')"

render_one () { # ar out [extra-flag]
  npx remotion render src/index.ts "News-$1" "$2" \
    --props=./props.json --codec=h264 --image-format=jpeg --gl=angle --log=info ${3:-}
}

# 4. Render each requested aspect ratio. If the pre-installed shell is incompatible with our
#    project-local Remotion, self-heal: ensure a matching shell and retry without --browser-executable.
FAIL=0
for AR in $ARS; do
  OUT="${EXPORTS}/${STYLE}-${AR}.mp4"
  echo ">> Rendering News-${AR} -> ${OUT}"
  if render_one "$AR" "$OUT" "$BROWSER_FLAG" && [ -s "$OUT" ]; then
    echo "   OK  ${OUT} ($(wc -c < "$OUT") bytes)"
  elif [ -n "$BROWSER_FLAG" ]; then
    echo "   !! render with pre-installed shell failed — ensuring a matching shell and retrying ..."
    npx remotion browser ensure || true
    if render_one "$AR" "$OUT" "" && [ -s "$OUT" ]; then
      echo "   OK (after ensure)  ${OUT} ($(wc -c < "$OUT") bytes)"
    else
      echo "   !! RENDER FAILED for News-${AR}"; FAIL=1
    fi
  else
    echo "   !! RENDER FAILED for News-${AR}"; FAIL=1
  fi
done

# 5. Best-effort verification with ffprobe (native on sl8-animation; absent on sl8-base).
if command -v ffprobe >/dev/null 2>&1; then
  echo ">> ffprobe verification:"
  for AR in $ARS; do
    OUT="${EXPORTS}/${STYLE}-${AR}.mp4"
    [ -s "$OUT" ] && ffprobe -v error -select_streams v:0 \
      -show_entries stream=width,height,codec_name,nb_frames \
      -show_entries format=duration -of default=noprint_wrappers=1 "$OUT" || true
  done
else
  echo ">> (ffprobe not present; relying on non-empty output + the in-session vision grade)"
fi

[ "$FAIL" -eq 0 ] && echo ">> All renders OK." || echo ">> One or more renders failed."
exit $FAIL
