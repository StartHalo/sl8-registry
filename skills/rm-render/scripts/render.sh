#!/usr/bin/env bash
# rm-render — deterministic, keyless, local Remotion render + ffprobe verify + frame extraction.
#
# Adapted from BOT-014's battle-tested render.sh, GENERALIZED off the fixed `News-*` id:
# it reads the composition prefix + output basename from props.json (default prefix `Studio`,
# the BOT-032 starter's Root.tsx contract) instead of hard-coding a style id.
#
# Run from INSIDE the per-project Remotion app dir (artifacts/<project>/remotion-project/), which
# contains src/index.ts and (optionally) props.json.
#
#   bash render.sh <comp-dir> <exports-dir> [name] [ARs] [verify-at-csv] [quality]
#   e.g. bash render.sh . ../exports api-rate-limit-teaser "16:9" "1,6,11" draft
#        bash render.sh . ../exports teaser "16:9 16:9-4k 9:16" "" standard
#
# Reads ./props.json for { name, compositionPrefix, durationSeconds, ... }.
# Writes <exports>/<name>-<ar>.mp4  +  <exports>/frames/<name>-<ar>-at-<t>s.png
# Exit 0 ONLY if EVERY requested AR produced an ffprobe-verified MP4.
#
# Keyless + local: headless Chrome Headless Shell + FFmpeg. NO AI model in the render path.
# bash 3.2 compatible — no `timeout`, no GNU-only flags, no `mapfile`/assoc arrays.
set -uo pipefail

COMP_DIR="${1:-.}"
EXPORTS="${2:-../exports}"
NAME_ARG="${3:-}"
ARS_RAW="${4:-16:9}"
VERIFY_AT="${5:-}"
QUALITY="${6:-draft}"

cd "$COMP_DIR" || { echo "!! cannot cd to $COMP_DIR"; exit 1; }
[ -f src/index.ts ] || { echo "!! no src/index.ts here — run from the remotion-project dir"; exit 1; }
mkdir -p "$EXPORTS" "$EXPORTS/frames" public

# ----- 1. Pin EVERY remotion/@remotion-* dep to ONE version (skew is the #1 render break). -----
# Ground truth = the GLOBAL `remotion` binary the sandbox ships (the actual render engine);
# fall back to the installed package, then `npm view remotion version` (host), then the starter pin.
RV="$(remotion --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
[ -z "$RV" ] && RV="$(node -e 'try{process.stdout.write(require("remotion/package.json").version)}catch(e){}' 2>/dev/null)"
[ -z "$RV" ] && RV="$(npm view remotion version 2>/dev/null)"
[ -z "$RV" ] && RV="4.0.473"
echo ">> Target Remotion version (RV): $RV"

INSTALLED="$(node -e 'try{process.stdout.write(require("remotion/package.json").version)}catch(e){}' 2>/dev/null)"
if [ ! -d node_modules/remotion ] || [ "$INSTALLED" != "$RV" ]; then
  echo ">> Re-pinning all remotion/@remotion-* deps to $RV and installing ..."
  node -e '
    const fs=require("fs"); const rv=process.argv[1];
    const p=JSON.parse(fs.readFileSync("package.json","utf8"));
    for (const sec of ["dependencies","devDependencies"]) {
      const d=p[sec]||{};
      for (const k of Object.keys(d)) if (k==="remotion" || k.indexOf("@remotion/")===0) d[k]=rv;
    }
    fs.writeFileSync("package.json", JSON.stringify(p,null,2)+"\n");
  ' "$RV" || { echo "!! could not re-pin package.json"; exit 1; }
  npm install --no-audit --no-fund || { echo "!! npm install failed"; exit 1; }
fi

# ----- 2. Resolve the render binary: GLOBAL `remotion` (~25x faster), NEVER `npx --yes`. -----
if command -v remotion >/dev/null 2>&1; then
  REMOTION="remotion"
else
  REMOTION="npx remotion"   # local install on host; NOT --yes (which re-downloads)
fi
echo ">> Render binary: $REMOTION"

# ----- 3. Chrome Headless Shell — keyless, pinned, self-healing. -----
CHROME_SHELL="${CHROME_HEADLESS_SHELL:-/opt/remotion/chrome-headless-shell}"
BROWSER_FLAG=""
if [ -x "$CHROME_SHELL" ]; then
  echo ">> Using pinned Chrome Headless Shell: $CHROME_SHELL"
  BROWSER_FLAG="--browser-executable=$CHROME_SHELL"
elif [ -n "${CHROME_HEADLESS_SHELL:-}" ] || [ -d /opt/remotion ]; then
  echo ">> Chrome shell expected but missing — self-healing via 'remotion browser ensure' ..."
  $REMOTION browser ensure || echo "!! browser ensure reported an issue (continuing)"
  [ -x "$CHROME_SHELL" ] && BROWSER_FLAG="--browser-executable=$CHROME_SHELL"
else
  echo ">> Host mode: omitting --browser-executable (Remotion auto-resolves Chrome)."
fi

# ----- 4. Resolve output basename + composition prefix from props.json. -----
META_NAME="$(node -e 'try{process.stdout.write(String(require("./props.json").name||""))}catch(e){}' 2>/dev/null)"
COMP_PREFIX="$(node -e 'try{process.stdout.write(String(require("./props.json").compositionPrefix||"Studio"))}catch(e){process.stdout.write("Studio")}' 2>/dev/null)"
[ -z "$COMP_PREFIX" ] && COMP_PREFIX="Studio"
NAME="$NAME_ARG"
[ -z "$NAME" ] && NAME="$META_NAME"
[ -z "$NAME" ] && NAME="$(basename "$(dirname "$PWD")")"   # = the <project> slug
[ -z "$NAME" ] && NAME="studio"
echo ">> Output basename: $NAME   composition prefix: $COMP_PREFIX"

PROPS_FLAG=""
[ -f props.json ] && PROPS_FLAG="--props=./props.json"

DUR_S="$(node -e 'try{process.stdout.write(String(require("./props.json").durationSeconds||0))}catch(e){process.stdout.write("0")}' 2>/dev/null)"
[ -z "$DUR_S" ] && DUR_S="0"

# quality -> h264 CRF (lower = better quality). draft is the fast default.
case "$QUALITY" in
  standard) CRF="--crf=18" ;;
  high)     CRF="--crf=14" ;;
  *)        CRF="--crf=28" ;;   # draft
esac

# ----- 5. Enumerate REGISTERED compositions (the Remotion analog of the orientation check). -----
COMPS="$($REMOTION compositions src/index.ts 2>/dev/null || true)"

# ----- helpers -----
ar_slug () { printf '%s' "$1" | tr ':' 'x'; }   # 16:9 -> 16x9 ; 16:9-4k -> 16x9-4k

plan_ar () { # token -> sets G_COMP G_SCALE G_W G_H
  local tok="$1" base scale bslug
  case "$tok" in
    *-4k) scale=2; base="${tok%-4k}" ;;
    *)    scale=1; base="$tok" ;;
  esac
  bslug="$(ar_slug "$base")"
  G_COMP="${COMP_PREFIX}-${bslug}"
  G_SCALE="$scale"
  case "$bslug" in
    16x9) G_W=$((1920*scale)); G_H=$((1080*scale)) ;;
    9x16) G_W=$((1080*scale)); G_H=$((1920*scale)) ;;
    1x1)  G_W=$((1080*scale)); G_H=$((1080*scale)) ;;
    *)    G_W=0; G_H=0 ;;
  esac
}

ARS="$(printf '%s' "$ARS_RAW" | tr ',' ' ')"   # accept comma OR space separated

FAIL=0
for TOK in $ARS; do
  plan_ar "$TOK"
  SLUG="$(ar_slug "$TOK")"
  OUT="${EXPORTS}/${NAME}-${SLUG}.mp4"

  if [ "$G_W" -eq 0 ]; then
    echo "   !! Unknown AR token '$TOK' (expected 16:9 | 9:16 | 1:1, optional -4k). Skipping."; FAIL=1; continue
  fi

  # A composition MUST be registered. A different orientation is a SEPARATE <Composition>
  # re-authored in rm-build (not a --scale/flag rotation) — fail cleanly and route there.
  if [ -n "$COMPS" ] && ! printf '%s\n' "$COMPS" | grep -qF "$G_COMP"; then
    echo "   !! Composition '$G_COMP' is not registered for this project."
    echo "      A ${TOK} export is a SEPARATE <Composition> — re-author it in rm-build (add ${G_COMP}"
    echo "      at ${G_W}x${G_H} to src/Root.tsx, on-screen facts unchanged), then re-render."
    echo "      --scale upsamples the SAME orientation; it cannot rotate 16:9 into 9:16."
    FAIL=1; continue
  fi

  SCALE_FLAG=""
  [ "$G_SCALE" -gt 1 ] && SCALE_FLAG="--scale=$G_SCALE"

  echo ">> Rendering $G_COMP -> $OUT  (${G_W}x${G_H}, quality=$QUALITY)"
  render_one () { # $1 = browser flag (may be empty)
    $REMOTION render src/index.ts "$G_COMP" "$OUT" \
      $PROPS_FLAG --codec=h264 --image-format=jpeg --gl=angle --concurrency=1 \
      $CRF $SCALE_FLAG ${1:-} --log=info
  }

  if render_one "$BROWSER_FLAG" && [ -s "$OUT" ]; then
    echo "   OK  $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
  elif [ -n "$BROWSER_FLAG" ]; then
    echo "   !! render with pinned shell failed — ensuring a matching shell and retrying ..."
    $REMOTION browser ensure || true
    if render_one "" && [ -s "$OUT" ]; then
      echo "   OK (after ensure)  $OUT"
    else
      echo "   !! RENDER FAILED for $G_COMP (Exit-137 = OOM? confirm --concurrency=1)"; FAIL=1; continue
    fi
  else
    echo "   !! RENDER FAILED for $G_COMP (Exit-137 = OOM? confirm --concurrency=1)"; FAIL=1; continue
  fi

  # ----- 6. ffprobe verify: codec / dims / fps / duration (+ audio when a VO track exists). -----
  if command -v ffprobe >/dev/null 2>&1; then
    # Query each field SEPARATELY with `default=nokey=1:noprint_wrappers=1` — one bare value, no key,
    # no section wrapper. NOT `csv=p=0`: that ordering is unspecified for a multi-field request AND
    # some ffmpeg builds append a trailing comma to single-field csv output ("h264," breaks `= h264`).
    VCODEC="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=nokey=1:noprint_wrappers=1 "$OUT" 2>/dev/null)"
    VW="$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of default=nokey=1:noprint_wrappers=1 "$OUT" 2>/dev/null)"
    VH="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=nokey=1:noprint_wrappers=1 "$OUT" 2>/dev/null)"
    VFPS="$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=nokey=1:noprint_wrappers=1 "$OUT" 2>/dev/null)"
    VDUR="$(ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "$OUT" 2>/dev/null)"; [ -z "$VDUR" ] && VDUR="0"
    echo "   ffprobe: codec=$VCODEC dims=${VW}x${VH} fps=$VFPS dur=${VDUR}s"
    [ "$VCODEC" = "h264" ] || { echo "   !! codec is '$VCODEC', expected h264"; FAIL=1; }
    if [ "$VW" != "$G_W" ] || [ "$VH" != "$G_H" ]; then
      echo "   !! dims ${VW}x${VH} != expected ${G_W}x${G_H}"; FAIL=1
    fi
    awk "BEGIN{exit !($VDUR>0)}" 2>/dev/null || { echo "   !! non-positive duration"; FAIL=1; }
    if ls ../assets/vo/*.wav >/dev/null 2>&1; then
      ACODEC="$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=nokey=1:noprint_wrappers=1 "$OUT" 2>/dev/null)"
      if [ -n "$ACODEC" ]; then
        echo "   audio: $ACODEC (VO muxed OK)"
      else
        echo "   !! WARNING: a VO track exists but $OUT has NO audio stream — <Audio> isn't a child of the comp (fix in rm-build)."
      fi
    fi
  else
    echo "   (ffprobe absent — relying on non-empty output + the in-session vision grade)"
  fi

  # ----- 7. Extract key frames for the vision grade (read the PNGs, not the filename). -----
  if command -v ffmpeg >/dev/null 2>&1; then
    TS="$VERIFY_AT"
    if [ -z "$TS" ]; then
      if awk "BEGIN{exit !($DUR_S>2)}" 2>/dev/null; then
        MID="$(awk "BEGIN{printf \"%.0f\", $DUR_S/2}")"; ENDF="$(awk "BEGIN{printf \"%.0f\", $DUR_S-1}")"
        TS="1,${MID},${ENDF}"
      else
        TS="1"
      fi
    fi
    for T in $(printf '%s' "$TS" | tr ',' ' '); do
      FOUT="${EXPORTS}/frames/${NAME}-${SLUG}-at-${T}s.png"
      if ffmpeg -nostdin -loglevel error -ss "$T" -i "$OUT" -frames:v 1 -y "$FOUT" 2>/dev/null; then
        echo "   frame: $FOUT"
      else
        echo "   !! could not extract frame at ${T}s"
      fi
    done
  fi
done

if [ "$FAIL" -eq 0 ]; then
  echo ">> All renders verified OK."
else
  echo ">> One or more renders failed/blocked."
fi
exit $FAIL
