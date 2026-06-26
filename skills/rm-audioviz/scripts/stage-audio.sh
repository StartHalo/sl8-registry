#!/usr/bin/env bash
# stage-audio.sh — prepare an audio track for the <Spectrum> audio-reactive visualizer.
#
#   bash "$SKILL/scripts/stage-audio.sh" <input-audio> <remotion-project-dir> [out-basename]
#   e.g. bash "$SKILL/scripts/stage-audio.sh" \
#          artifacts/launch/assets/vo/narration.wav artifacts/launch/remotion-project narration
#
# Why: @remotion/media-utils `useWindowedAudioData` (what <Spectrum> uses) is WAV-only and the loader
# is memory-efficient (windowed, not whole-file) — which matters under the ~1.9 GB sandbox ceiling
# (>1.9 GB → Exit-137 OOM). This script:
#   1. transcodes <input-audio> to a 44.1 kHz mono 16-bit WAV into <project>/public/audio/<base>.wav
#      (a no-op copy if it is already a WAV) so the author can load it via staticFile("audio/<base>.wav");
#   2. ffprobes the real duration and prints a suggested windowInSeconds (= ceil(duration), min 1);
#   3. asserts the bundled vetted component exists at src/components/Spectrum.tsx (init.sh copies it);
#   4. emits a one-line JSON the caller parses (staticFile path is relative to public/).
#
# bash 3.2 safe: no `timeout`, no GNU-only flags, no `mapfile`, no process substitution. Uses
# ffmpeg/ffprobe (present on sl8-animation). Never prompts; exits non-zero only on a hard failure
# (missing input / no ffmpeg) so the skill can take its documented fallback.
set -uo pipefail

IN="${1:?usage: stage-audio.sh <input-audio> <remotion-project-dir> [out-basename]}"
PROJ="${2:?usage: stage-audio.sh <input-audio> <remotion-project-dir> [out-basename]}"
BASE="${3:-}"

err() { echo "!! $*" >&2; }

if [ ! -f "$IN" ]; then
  err "input audio not found: $IN"
  exit 1
fi
if [ ! -d "$PROJ" ]; then
  err "remotion project dir not found: $PROJ"
  exit 1
fi

# Derive the output basename from the input filename if not given (strip dir + extension).
if [ -z "$BASE" ]; then
  BASE="$(basename "$IN")"
  BASE="${BASE%.*}"
fi
# Sanitize to a safe staticFile-friendly slug (alnum, dash, underscore).
BASE="$(printf '%s' "$BASE" | tr -c 'A-Za-z0-9_-' '-' | sed 's/--*/-/g; s/^-//; s/-$//')"
[ -n "$BASE" ] || BASE="audio"

OUT_DIR="$PROJ/public/audio"
OUT_WAV="$OUT_DIR/$BASE.wav"
STATIC_PATH="audio/$BASE.wav" # what staticFile() takes (relative to public/)
mkdir -p "$OUT_DIR"

# 1. Ensure a WAV in public/audio/. Transcode anything non-wav (mp3/m4a/aac/flac/ogg) to a clean
#    44.1 kHz mono 16-bit PCM WAV. If already a .wav, normalize it too (cheap, guarantees a format
#    useWindowedAudioData can decode) — unless it is already exactly at the destination.
LOWER_EXT="$(printf '%s' "${IN##*.}" | tr 'A-Z' 'a-z')"
if ! command -v ffmpeg >/dev/null 2>&1; then
  err "ffmpeg not found — cannot stage audio (need ffmpeg on PATH; present on sl8-animation)"
  exit 1
fi

if [ "$(cd "$(dirname "$IN")" && pwd)/$(basename "$IN")" = "$(cd "$OUT_DIR" && pwd)/$BASE.wav" ]; then
  echo ">> input is already the staged WAV ($OUT_WAV) — leaving in place" >&2
else
  echo ">> transcoding $IN ($LOWER_EXT) -> $OUT_WAV (44.1kHz mono 16-bit PCM)" >&2
  if ! ffmpeg -y -loglevel error -i "$IN" -ac 1 -ar 44100 -sample_fmt s16 "$OUT_WAV" >/dev/null 2>&1; then
    err "ffmpeg transcode failed for $IN"
    exit 1
  fi
fi

# 2. Probe duration (seconds, float). Fall back to 0 if ffprobe is unavailable.
DUR="0"
if command -v ffprobe >/dev/null 2>&1; then
  DUR="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT_WAV" 2>/dev/null)"
  [ -n "$DUR" ] || DUR="0"
fi
# Suggested windowInSeconds = ceil(duration), floor 1. Integer math in awk (no GNU `seq`/`bc`).
WINDOW="$(awk -v d="$DUR" 'BEGIN{w=int(d); if (w < d) w=w+1; if (w < 1) w=1; print w}')"

# 3. Assert the vetted component is present (init.sh copies the whole starter src/, including this).
COMP="$PROJ/src/components/Spectrum.tsx"
COMP_OK="true"
if [ ! -f "$COMP" ]; then
  COMP_OK="false"
  err "MISSING $COMP — re-run rm-build/scripts/init.sh (the bundled starter ships src/components/Spectrum.tsx)."
fi

# 4. Emit a one-line JSON result (no jq dependency).
printf '{"staged_wav":"%s","static_path":"%s","duration":%s,"window_in_seconds":%s,"spectrum_component":%s}\n' \
  "$OUT_WAV" "$STATIC_PATH" "${DUR:-0}" "$WINDOW" "$COMP_OK"
