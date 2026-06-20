#!/usr/bin/env bash
#
# gen-cinematic.sh — render the WHOLE multi-scene cinematic in ONE Seedance 2.0
# reference-to-video call, then normalize + verify the result. This is the PROVEN
# headline mechanic (Step-0 multi-shot PoC 2026-06-20, 8.8/10): the character bible
# images go in via --ref (the CLI maps them to image_urls, addressed in the prompt as
# @Image1/@Image2), the shot-list time-codes become the prompt body, native score +
# SFX + ambience are generated in the same pass — no per-shot generation, no stitching.
#
# Usage:
#   gen-cinematic.sh <prompt-file> <reference-sheet.png> <hero.png> <out.mp4>
#
# Env knobs (all optional):
#   DURATION    4..15   target cinematic length in seconds (default 15)
#   ASPECT      16:9 | 9:16 | 1:1   (default 16:9)
#   TIER        fast | standard     Seedance tier (default fast — proven + cheaper)
#   RESOLUTION  480p | 720p         (default 720p; reference-to-video has no 1080p on fast)
#   AUDIO       on | off            native in-pass audio (default on — generate_audio)
#   MAX_COST    credit cap passed to --max-cost (default 1200; standard tier raises it)
#
# On SUCCESS prints exactly ONE line to stdout:
#   <model-id>\t<out.mp4>\t<hosted-url-or-empty>
# Everything else (diagnostics, the ffprobe verdict) goes to stderr. Non-zero exit =
# the single call errored OR its output failed verification → the caller runs
# scripts/per-shot-fallback.sh and records the fallback in summary.md (never silent).
#
# Slug discipline: the v2 namespace is the BARE bytedance/seedance-2.0/... — NOT
# fal-ai/bytedance/seedance/* (that 404s). We always pass -m explicitly.

set -euo pipefail

err() { printf 'gen-cinematic: %s\n' "$*" >&2; }

# jq is NOT available in the sandbox — JSON parsing uses python3 (like the BOT-013 donor).
for dep in ai-gen python3 ffmpeg ffprobe; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

if [[ $# -ne 4 ]]; then
  err "usage: gen-cinematic.sh <prompt-file> <reference-sheet.png> <hero.png> <out.mp4>"
  exit 2
fi

PROMPT_FILE=$1
REF_SHEET=$2
REF_HERO=$3
OUT_PATH=$4

DURATION=${DURATION:-15}
ASPECT=${ASPECT:-16:9}
TIER=${TIER:-fast}
RESOLUTION=${RESOLUTION:-720p}
AUDIO=${AUDIO:-on}

# Tier → model slug + a sensible default cost cap (standard is pricier).
case "$TIER" in
  fast)     MODEL="bytedance/seedance-2.0/fast/reference-to-video"; DEFAULT_CAP=1200 ;;
  standard) MODEL="bytedance/seedance-2.0/reference-to-video";      DEFAULT_CAP=3000 ;;
  *) err "TIER must be fast|standard (got '$TIER')"; exit 2 ;;
esac
MAX_COST=${MAX_COST:-$DEFAULT_CAP}

# Validate inputs (headless: a bad input is a clean failure, never a guess).
[[ -s "$PROMPT_FILE" ]] || { err "prompt file missing or empty: $PROMPT_FILE"; exit 2; }
[[ -s "$REF_SHEET"   ]] || { err "reference sheet missing on disk: $REF_SHEET (run phase 1)"; exit 2; }
[[ -s "$REF_HERO"    ]] || { err "hero image missing on disk: $REF_HERO (run phase 1)"; exit 2; }
case "$DURATION" in
  ''|*[!0-9]*) err "DURATION must be an integer 4..15 (got '$DURATION')"; exit 2 ;;
  *) [[ "$DURATION" -ge 4 && "$DURATION" -le 15 ]] || { err "DURATION out of range 4..15: $DURATION"; exit 2; } ;;
esac
case "$ASPECT" in 16:9|9:16|1:1) : ;; *) err "ASPECT must be 16:9|9:16|1:1 (got '$ASPECT')"; exit 2 ;; esac

# Planned canvas for normalization (matches --aspect-ratio at 720p-class dims).
case "$ASPECT" in
  16:9) W=1280 H=720 ;;
  9:16) W=720  H=1280 ;;
  1:1)  W=720  H=720 ;;
esac

PROMPT=$(<"$PROMPT_FILE")

# Defensive: ensure the positive-constraint suffix is present (the prompt should carry
# it from the shot-list; append idempotently if the composer omitted it). No negative
# prompts — Seedance wants positive constraints appended once.
if ! grep -qi "identity drift" <<<"$PROMPT"; then
  PROMPT="${PROMPT}"$'\n'"Maintain character identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no flicker."
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT
mkdir -p "$(dirname "$OUT_PATH")"

# --- parse helpers (ai-gen v2.1.0 JSON contract; files[] entries are OBJECTS) --------
json_success() {
  python3 -c '
import json, sys
try:
    doc = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(1)
ok = (isinstance(doc, dict) and doc.get("success") is True
      and isinstance(doc.get("files"), list) and len(doc["files"]) > 0)
sys.exit(0 if ok else 1)
' "$1"
}
json_first_file() {
  python3 -c '
import json, sys
try:
    doc = json.load(open(sys.argv[1]))
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
' "$1"
}
json_hosted_url() {
  python3 -c '
import json, re, sys
def walk(node):
    if isinstance(node, str):
        if re.match(r"https://([a-z0-9-]+\.)*fal\.media/", node):
            yield node
    elif isinstance(node, dict):
        for v in node.values():
            yield from walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from walk(v)
try:
    doc = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
hu = doc.get("hosted_urls") if isinstance(doc, dict) else None
if isinstance(hu, list) and hu and isinstance(hu[0], str):
    print(hu[0]); sys.exit(0)
for url in walk(doc):
    print(url); break
' "$1"
}

# --- 1. the PROVEN reference-to-video call ------------------------------------------
# --ref maps to image_urls IN ORDER: first ref = @Image1 (turnaround), second = @Image2
# (hero). generate_audio is default-on for reference-to-video (no surcharge).
err "rendering ONE call: $MODEL  (${DURATION}s, ${ASPECT}, ${RESOLUTION}, audio=${AUDIO}, max-cost ${MAX_COST}cr)"
err "  @Image1=$(basename "$REF_SHEET")  @Image2=$(basename "$REF_HERO")"

RESULT="$WORKDIR/result.json"
LOG="$WORKDIR/attempt.log"
: >"$RESULT"; : >"$LOG"
rc=0
ai-gen video "$PROMPT" \
  -m "$MODEL" \
  --ref "$REF_SHEET" --ref "$REF_HERO" \
  --duration "$DURATION" --aspect-ratio "$ASPECT" --resolution "$RESOLUTION" \
  --audio "$AUDIO" --max-cost "$MAX_COST" \
  -o "$WORKDIR" --format json >"$RESULT" 2>"$LOG" || rc=$?

if [[ $rc -ne 0 ]] || ! json_success "$RESULT"; then
  err "single reference-to-video call did NOT succeed (exit=$rc) — caller should run per-shot-fallback.sh"
  err "  ai-gen said: $(tr '\n' ' ' <"$LOG" | head -c 500)"
  err "  raw: $(head -c 400 "$RESULT")"
  exit 1
fi

SRC=$(json_first_file "$RESULT")
URL=$(json_hosted_url "$RESULT")
if [[ -z "$SRC" || ! -s "$SRC" ]]; then
  err "success reported but no output file on disk — treating as failure (run the fallback)"
  exit 1
fi
err "generated: $SRC"

# --- 2. normalize (24fps, planned canvas, H.264/yuv420p + AAC, faststart) -----------
# A uniform re-encode makes the file player-safe and gives a deterministic stream
# layout for verification. The native audio stream is preserved + re-encoded to AAC.
NORM="$WORKDIR/episode-norm.mp4"
VNORM="fps=24,scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p"
HAS_AUDIO_SRC=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$SRC" | head -n1 || true)
if [[ -n "$HAS_AUDIO_SRC" ]]; then
  ffmpeg -y -hide_banner -loglevel error -i "$SRC" \
    -filter_complex "[0:v]${VNORM}[v]" -map "[v]" -map 0:a:0 \
    -c:v libx264 -preset medium -crf 20 -c:a aac -ar 48000 -ac 2 \
    -movflags +faststart "$NORM" \
    || { err "normalize failed"; exit 1; }
else
  # No native audio came back — keep going (verify will FLAG it). Attach a silent track
  # so the file always has a uniform A/V layout; the missing native audio is flagged.
  err "WARNING: the generated file has NO audio stream — adding a silent track (FLAG in summary.md)"
  ffmpeg -y -hide_banner -loglevel error -i "$SRC" \
    -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
    -filter_complex "[0:v]${VNORM}[v]" -map "[v]" -map 1:a \
    -c:v libx264 -preset medium -crf 20 -c:a aac -shortest \
    -movflags +faststart "$NORM" \
    || { err "normalize failed"; exit 1; }
fi

# --- 3. ffprobe verify: duration ±1s of target AND a video + an audio stream --------
DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$NORM" 2>/dev/null || echo 0)
HAS_VIDEO=$(ffprobe -v error -select_streams v -show_entries stream=codec_type -of csv=p=0 "$NORM" | head -n1 || true)
HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$NORM" | head -n1 || true)

DUR_OK=false; VID_OK=false; AUD_OK=false
awk "BEGIN { exit !(($DUR - $DURATION) <= 1 && ($DURATION - $DUR) <= 1) }" && DUR_OK=true
[[ -n "$HAS_VIDEO" ]] && VID_OK=true
[[ -n "$HAS_AUDIO" && -n "$HAS_AUDIO_SRC" ]] && AUD_OK=true   # native audio specifically

err "ffprobe: duration=${DUR}s (target ${DURATION}s, ±1s ok=$DUR_OK) video=${HAS_VIDEO:-none}(ok=$VID_OK) audio=${HAS_AUDIO:-none} native_audio_ok=$AUD_OK"

# Hard-fail (→ fallback) only when the file is structurally unusable: no video, or no
# NATIVE audio (the whole point of Seedance reference-to-video is in-pass audio), or the
# duration is wildly off. A small duration wobble inside ±1s passes.
if [[ "$VID_OK" != true || "$AUD_OK" != true ]]; then
  err "verification FAILED (video=$VID_OK native-audio=$AUD_OK) — caller should run per-shot-fallback.sh"
  exit 1
fi
if [[ "$DUR_OK" != true ]]; then
  # Duration off but a real A/V file — deliver it and let the caller FLAG it (don't
  # discard a usable cinematic over a sub-second/second wobble the model chose).
  err "NOTE: duration ${DUR}s is outside ±1s of ${DURATION}s — delivering, FLAG this in summary.md"
fi

mv "$NORM" "$OUT_PATH"
printf '%s\t%s\t%s\n' "$MODEL" "$OUT_PATH" "$URL"
err "episode delivered: $OUT_PATH (${DUR}s, ${W}x${H})"
exit 0
