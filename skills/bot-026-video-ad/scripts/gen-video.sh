#!/usr/bin/env bash
#
# gen-video.sh — turn an approved packshot/hero STILL into a short 9:16 product
# video ad via image-to-video, holding the product identity stable. NO geometry
# lock exists on the reachable i2v models, so identity is held by (a) the
# strict-product motion prompt (motion-prompt.py), (b) ONE slow safe camera move
# only, and (c) the BLOCKING video-qc the BOT runs afterward (this script does
# NOT certify the output — it emits a manifest for that gate).
#
# Engines (verified ai-gen 2.1.0 syntax — see references/seedance-dialect.md):
#   seedance (PRIMARY) — bytedance/seedance-2.0/image-to-video
#       multi-shot + in-pass dual-channel audio; the START FRAME maps from --image
#       (→ the model's image_url).
#   seedance-fast — bytedance/seedance-2.0/fast/image-to-video (cheaper tier;
#       'fast' here is the CHEAP tier slug, NOT a fast camera move — moves stay slow).
#   kling (ALT, logo-stays-sharp) — fal-ai/kling-video/v3/standard/image-to-video
#       schema requires START_IMAGE_URL (NOT image_url), so --image may not attach;
#       this script passes the frame as the POSITIONAL key=value start_image_url=<frame>
#       AND --image, and the manifest flags kling so the QC gate confirms the real
#       product actually shows (a mis-forwarded frame → the model invents a product).
#
# Usage:
#   gen-video.sh <hero-still (jpg|png|url)> <out.mp4> [<variant-label>]
#
# Env knobs (all optional):
#   ENGINE        seedance | seedance-fast | kling   (default seedance)
#   PRODUCT       product name/description for the prompt (default "the product")
#   MOVE          one SAFE camera move (default push-in; aggressive → substituted)
#   SURFACE / LIGHTING / STYLE / STABLE / FORMAT  forwarded to motion-prompt.py
#   ASPECT        aspect ratio (default 9:16)
#   DURATION      seconds (default 5; seedance 4-15, kling 3-15)
#   MULTISHOT     any non-empty value → time-coded multi-shot hero arc
#   AUDIO         1 (default) → request in-pass audio (kling: generate_audio=true)
#   WORK_DIR      scratch (default ./work/video)
#   MAX_COST      per-call credit cap passed to ai-gen --max-cost (default 200)
#   MODEL         override the model slug entirely (advanced)
#
# Writes:
#   <out.mp4>                         the downloaded clip (copied from files[0].local_path)
#   <out.mp4>.prompt.txt              the exact motion prompt used
#   <out.mp4>.note.json               motion-prompt note (chosen move, substitution, etc.)
#   <out.dir>/video-manifest.json     [{out, engine, model, prompt_file, note_file,
#                                       gen_ok, has_audio, variant, needs_qc:true}]
#                                     (appended to if it already exists this run)
#
# Exit:
#   0  clip generated + downloaded (still UNVERIFIED — the bot MUST run video-qc)
#   3  generation ran but produced no file on disk (caller FLAGS + records, no spend fan-out)
#   1  generation call failed / engine unreachable (caller records blocked + FLAG)
#   2  usage / missing dependency

set -euo pipefail

err() { printf 'gen-video: %s\n' "$*" >&2; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for dep in ai-gen python3; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

if [[ $# -lt 2 ]]; then
  err "usage: gen-video.sh <hero-still (jpg|png|url)> <out.mp4> [<variant-label>]"
  exit 2
fi

HERO=$1
OUT=$2
VARIANT=${3:-base}

ENGINE=${ENGINE:-seedance}
PRODUCT=${PRODUCT:-the product}
MOVE=${MOVE:-push-in}
SURFACE=${SURFACE:-a clean studio surface}
LIGHTING=${LIGHTING:-soft diffused studio lighting}
STYLE=${STYLE:-premium commercial ecommerce style}
STABLE=${STABLE:-the logo, label and product shape}
FORMAT=${FORMAT:-9:16 vertical product video}
ASPECT=${ASPECT:-9:16}
DURATION=${DURATION:-5}
MULTISHOT=${MULTISHOT:-}
AUDIO=${AUDIO:-1}
WORK_DIR=${WORK_DIR:-work/video}
MAX_COST=${MAX_COST:-200}

# The start frame must be a readable local file OR an https URL (v2.1.0 uploads locals).
case "$HERO" in
  https://*) : ;;
  *) [[ -s "$HERO" ]] || { err "hero still must be an https URL or an existing local file: $HERO"; exit 2; } ;;
esac

# Resolve the engine → model slug (override with MODEL).
case "$ENGINE" in
  seedance)      MODEL=${MODEL:-bytedance/seedance-2.0/image-to-video} ;;
  seedance-fast) MODEL=${MODEL:-bytedance/seedance-2.0/fast/image-to-video} ;;
  kling)         MODEL=${MODEL:-fal-ai/kling-video/v3/standard/image-to-video} ;;
  *)             MODEL=${MODEL:-$ENGINE} ; err "unknown ENGINE '$ENGINE' — treating it as a raw model slug" ;;
esac

mkdir -p "$WORK_DIR" "$(dirname "$OUT")"

PROMPT_FILE="${OUT}.prompt.txt"
NOTE_FILE="${OUT}.note.json"

# --- Build the strict-product motion prompt (one safe slow move) ---
# (Empty-array expansion is "unbound" under set -u on bash 3.2 — pass --multishot
#  inline only when requested rather than via an array.)
if [[ -n "$MULTISHOT" ]]; then
  python3 "$HERE/motion-prompt.py" \
    --product "$PRODUCT" --move "$MOVE" --surface "$SURFACE" \
    --lighting "$LIGHTING" --style "$STYLE" --stable "$STABLE" \
    --format "$FORMAT" --aspect "$ASPECT" --duration "$DURATION" \
    --multishot --out "$PROMPT_FILE" --note "$NOTE_FILE" >/dev/null
else
  python3 "$HERE/motion-prompt.py" \
    --product "$PRODUCT" --move "$MOVE" --surface "$SURFACE" \
    --lighting "$LIGHTING" --style "$STYLE" --stable "$STABLE" \
    --format "$FORMAT" --aspect "$ASPECT" --duration "$DURATION" \
    --out "$PROMPT_FILE" --note "$NOTE_FILE" >/dev/null
fi
PROMPT="$(<"$PROMPT_FILE")"
err "engine=$ENGINE model=$MODEL move=$MOVE aspect=$ASPECT dur=${DURATION}s audio=$AUDIO variant=$VARIANT"

# Print files[0].local_path from an ai-gen --format json blob on stdin (objects in v2.1.0).
first_local_path() {
  python3 -c '
import json, sys
try:
    doc = json.load(sys.stdin)
except Exception:
    sys.exit(0)
files = doc.get("files") if isinstance(doc, dict) else None
if not (isinstance(files, list) and files):
    sys.exit(0)
f0 = files[0]
if isinstance(f0, dict):
    p = f0.get("local_path") or ""
    if p: print(p)
elif isinstance(f0, str):
    print(f0)
'
}

GEN_JSON="$WORK_DIR/$(basename "$OUT").gen.json"
GEN_LOG="$WORK_DIR/$(basename "$OUT").gen.log"

# --- Assemble the ai-gen video command per engine ---
# Seedance: the start frame is the model's image_url → pass via --image.
# Kling:    the schema REQUIRES start_image_url → pass the POSITIONAL key=value
#           start_image_url=<frame> (and --image too, belt-and-braces); duration +
#           generate_audio are positional key=value model params.
GEN_RC=0
if [[ "$ENGINE" == "kling" ]]; then
  KV=( "start_image_url=$HERO" "duration=$DURATION" )
  [[ "$AUDIO" == "1" ]] && KV+=( "generate_audio=true" )
  ai-gen video "$PROMPT" -m "$MODEL" --image "$HERO" --aspect-ratio "$ASPECT" \
      "${KV[@]}" -o "$WORK_DIR" --format json --max-cost "$MAX_COST" \
      >"$GEN_JSON" 2>"$GEN_LOG" || GEN_RC=$?
else
  # Seedance family — --image is the start frame (→ image_url). duration is a
  # positional model param; in-pass audio is native (no flag needed).
  ai-gen video "$PROMPT" -m "$MODEL" --image "$HERO" --aspect-ratio "$ASPECT" \
      "duration=$DURATION" -o "$WORK_DIR" --format json --max-cost "$MAX_COST" \
      >"$GEN_JSON" 2>"$GEN_LOG" || GEN_RC=$?
fi

GEN_OK=false
HAS_AUDIO="unknown"
if [[ $GEN_RC -ne 0 ]]; then
  err "generation call failed (rc=$GEN_RC) — see $GEN_LOG"
  err "do NOT fan out variants or spend on a failed engine; record blocked + FLAG."
  RAW_OUT=""
else
  RAW_OUT="$(first_local_path <"$GEN_JSON" || true)"
  if [[ -n "$RAW_OUT" && -s "$RAW_OUT" ]]; then
    # fal URLs expire — copy the LOCAL file to the stable output path immediately.
    cp -f "$RAW_OUT" "$OUT"
    GEN_OK=true
    err "clip downloaded: $OUT (from files[0].local_path=$RAW_OUT)"
    # Probe for an audio stream if ffprobe is around (advisory only).
    if command -v ffprobe >/dev/null 2>&1; then
      if ffprobe -v error -select_streams a -show_entries stream=codec_type \
           -of csv=p=0 "$OUT" 2>/dev/null | grep -q audio; then
        HAS_AUDIO="true"
      else
        HAS_AUDIO="false"
      fi
    fi
  else
    err "generation reported success but no file on disk (files[0].local_path empty) — FLAG."
  fi
fi

# --- Append to the manifest the bot consumes for the BLOCKING video-qc step ---
MANIFEST="$(dirname "$OUT")/video-manifest.json"
python3 - "$MANIFEST" "$OUT" "$ENGINE" "$MODEL" "$PROMPT_FILE" "$NOTE_FILE" \
                      "$GEN_OK" "$HAS_AUDIO" "$VARIANT" <<'PY'
import json, os, sys
(manifest, out, engine, model, prompt_file, note_file,
 gen_ok, has_audio, variant) = sys.argv[1:10]
entry = {
    "out": out if gen_ok == "true" else None,
    "engine": engine,
    "model": model,
    "prompt_file": prompt_file,
    "note_file": note_file,
    "gen_ok": gen_ok == "true",
    "has_audio": has_audio,          # true/false/unknown (ffprobe advisory)
    "variant": variant,
    "needs_qc": True,                # ALWAYS — the bot must run the blocking video-qc
}
data = []
if os.path.exists(manifest):
    try:
        with open(manifest) as f:
            data = json.load(f)
        if not isinstance(data, list):
            data = []
    except Exception:
        data = []
data.append(entry)
with open(manifest, "w") as f:
    f.write(json.dumps(data, indent=2) + "\n")
PY
err "manifest: $MANIFEST"
err "NEXT (the bot, not this script): run the BLOCKING video-qc (video-qc.md) — confirm the"
err "clip shows the REAL input product with a stable logo BEFORE any variant fan-out or paid spend."

if [[ $GEN_RC -ne 0 ]]; then
  exit 1
fi
if [[ "$GEN_OK" != "true" ]]; then
  exit 3
fi
exit 0
