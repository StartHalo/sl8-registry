#!/usr/bin/env bash
# tts.sh — synthesize one beat's narration wav via ai-gen TTS (Kokoro), keyless SL8 proxy.
#
#   bash tts.sh "<text>"  <vo-dir> <beat-stem> [voice] [model]   # synth one beat
#   bash tts.sh concat    <vo-dir>                               # concat beat wavs -> narration.wav
#
# e.g. bash tts.sh "Ship faster." artifacts/teaser/assets/vo beat-01 am_michael fal-ai/kokoro/american-english
#      bash tts.sh concat artifacts/teaser/assets/vo
#
# GOTCHA (confirmed in-sandbox 2026-06-18): `ai-gen audio tts ... -o <X>` treats -o as a DIRECTORY; the wav
# lands at <X>/american-english-<ts>.wav. So we run TTS into a FRESH temp dir, grab the single wav it wrote
# (ls <tmp>/*.wav), and move it to <vo-dir>/<beat-stem>.wav. ai-gen v2 JSON is { success, files[].local_path,
# hosted_urls[] } — we trust the on-disk wav and check success when jq/node is available.
#
# Exit 0 only when a non-empty <vo-dir>/<beat-stem>.wav exists; non-zero on any TTS failure so the caller
# can take the documented SILENT fallback (never prompt the user).
set -uo pipefail

MODE_OR_TEXT="${1:?usage: tts.sh \"<text>\" <vo-dir> <beat-stem> [voice] [model]  |  tts.sh concat <vo-dir>}"

# ---------- concat mode ----------
if [ "$MODE_OR_TEXT" = "concat" ]; then
  VO_DIR="${2:?missing vo-dir}"
  OUT="$VO_DIR/narration.wav"
  shopt -s nullglob 2>/dev/null || true
  CLIPS=()
  # beat wavs in filename order; exclude the concatenated output itself
  for f in $(ls "$VO_DIR"/*.wav 2>/dev/null | sort); do
    case "$f" in */narration.wav) continue;; esac
    CLIPS+=( "$f" )
  done
  if [ "${#CLIPS[@]}" -eq 0 ]; then
    echo "!! no beat wavs in $VO_DIR to concat" >&2; exit 1
  fi
  if command -v ffmpeg >/dev/null 2>&1; then
    LIST="$(mktemp)"; : > "$LIST"
    for c in "${CLIPS[@]}"; do printf "file '%s'\n" "$(cd "$(dirname "$c")" && pwd)/$(basename "$c")" >> "$LIST"; done
    ffmpeg -v error -f concat -safe 0 -i "$LIST" -c copy "$OUT" -y 2>/dev/null \
      || ffmpeg -v error -f concat -safe 0 -i "$LIST" "$OUT" -y 2>/dev/null || true
    rm -f "$LIST"
  fi
  if [ ! -s "$OUT" ] && [ "${#CLIPS[@]}" -eq 1 ]; then cp "${CLIPS[0]}" "$OUT"; fi
  [ -s "$OUT" ] && { echo "$OUT"; exit 0; } || { echo "!! concat failed" >&2; exit 1; }
fi

# ---------- synth mode ----------
TEXT="$MODE_OR_TEXT"
VO_DIR="${2:?missing vo-dir}"
STEM="${3:?missing beat-stem}"
VOICE="${4:-am_michael}"
MODEL="${5:-fal-ai/kokoro/american-english}"

if [ -z "${TEXT// /}" ]; then echo "!! empty narration text for $STEM" >&2; exit 2; fi
mkdir -p "$VO_DIR"
TMP="$(mktemp -d)"
FINAL="$VO_DIR/$STEM.wav"

# Kokoro voice: ai-gen accepts a --voice arg on the audio tts subcommand; if the build of ai-gen rejects it,
# we retry without it (the model id already selects American-English; voice then falls to the model default).
# stderr+stdout captured so we can inspect the v2 JSON for success:false.
run_tts () {
  # $1 = extra args ("" or "--voice <id>")
  # shellcheck disable=SC2086
  ai-gen audio tts "$TEXT" -m "$MODEL" $1 -o "$TMP" 2>&1
}

OUT_JSON="$(run_tts "--voice $VOICE")"
RC=$?
if [ $RC -ne 0 ] || ls "$TMP"/*.wav >/dev/null 2>&1; then :; fi
if ! ls "$TMP"/*.wav >/dev/null 2>&1; then
  # retry without --voice (older ai-gen may not accept it)
  OUT_JSON="$(run_tts "")"
fi

# success check (best-effort): if jq/node present and JSON has success:false, treat as failure.
if printf '%s' "$OUT_JSON" | grep -q '"success"'; then
  SUCCESS="$(printf '%s' "$OUT_JSON" | (jq -r '.success' 2>/dev/null || node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const m=s.match(/\{[\s\S]*\}/);console.log(JSON.parse(m[0]).success)}catch(e){console.log("unknown")}})'))"
  if [ "$SUCCESS" = "false" ]; then
    echo "!! ai-gen TTS reported success:false for $STEM" >&2
    echo "$OUT_JSON" | tail -n 20 >&2
    rm -rf "$TMP"; exit 1
  fi
fi

# capture the wav ai-gen wrote into the temp DIR (the -o-is-a-dir gotcha)
WAV="$(ls "$TMP"/*.wav 2>/dev/null | head -n1 || true)"
if [ -z "$WAV" ] || [ ! -s "$WAV" ]; then
  echo "!! no wav produced by ai-gen TTS for $STEM (model=$MODEL voice=$VOICE)" >&2
  echo "$OUT_JSON" | tail -n 20 >&2
  rm -rf "$TMP"; exit 1
fi

mv -f "$WAV" "$FINAL"
rm -rf "$TMP"
echo "$FINAL"
exit 0
