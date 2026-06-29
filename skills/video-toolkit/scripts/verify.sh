#!/usr/bin/env bash
#
# verify.sh — ffprobe the final episode and emit ONE JSON verdict line.
# Part of the shared `video-toolkit` skill. The single place every video bot's
# `verify` stage runs, so the gate logic lives once (the four bots used to each
# carry their own copy with a slightly different tolerance/mode — that is what
# this consolidates).
#
# Usage:
#   verify.sh <file> [--mode range|summed|grew] \
#                    [--min S] [--max S] [--summed S] [--tol S] [--base S] \
#                    [--require-audio yes|no] [--route NAME]
#
# Modes (pick the one the recipe needs):
#   range   PASS if  --min <= duration <= --max     (e.g. BOT-013 stickman: 15..60s)
#   summed  PASS if  |duration - --summed| <= --tol (e.g. concat bots: ±2s vs summed clips)
#   grew    PASS if  duration > --base              (e.g. BOT-030 Veo extend: grew past base)
#
# Always asserts a video stream is present. Asserts an audio stream too unless
# --require-audio no. A failing assertion yields verdict FLAG (deliver + flag,
# never withhold) — exit stays 0. Exit 2 only if <file> is missing/unreadable.
#
# Portability: bash 3.2, no GNU `timeout`, no `jq`. Duration math uses awk.
#
# Prints, e.g.:
#   {"file":"…/episode.mp4","route":"hailuo-first-last","duration_s":24.1,"width":1280,"height":720,"has_video":true,"has_audio":true,"verdict":"PASS","reasons":[]}

set -euo pipefail

err() { printf 'verify: %s\n' "$*" >&2; }

command -v ffprobe >/dev/null 2>&1 || { err "missing dependency: ffprobe"; exit 2; }

[ $# -ge 1 ] || { err "usage: verify.sh <file> [--mode range|summed|grew] [--min S] [--max S] [--summed S] [--tol S] [--base S] [--require-audio yes|no] [--route NAME]"; exit 2; }
FILE=$1; shift
[ -f "$FILE" ] || { err "file not found: $FILE"; exit 2; }

MODE=summed
MIN=""; MAX=""; SUMMED=""; TOL=2; BASE=""
REQUIRE_AUDIO=yes
ROUTE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --mode)          MODE=${2:?--mode needs a value};            shift 2 ;;
    --min)           MIN=${2:?--min needs a value};              shift 2 ;;
    --max)           MAX=${2:?--max needs a value};              shift 2 ;;
    --summed)        SUMMED=${2:?--summed needs a value};        shift 2 ;;
    --tol)           TOL=${2:?--tol needs a value};              shift 2 ;;
    --base)          BASE=${2:?--base needs a value};            shift 2 ;;
    --require-audio) REQUIRE_AUDIO=${2:?--require-audio needs a value}; shift 2 ;;
    --route)         ROUTE=${2:?--route needs a value};          shift 2 ;;
    *) err "unknown option: $1"; exit 2 ;;
  esac
done

DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$FILE" 2>/dev/null || echo 0)
read -r OW OH < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$FILE" 2>/dev/null | tr ',' ' ')
OW=${OW:-0}; OH=${OH:-0}
HAS_VIDEO=$(ffprobe -v error -select_streams v -show_entries stream=codec_type -of csv=p=0 "$FILE" 2>/dev/null | head -n1 || true)
HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$FILE" 2>/dev/null | head -n1 || true)

REASONS=()

# duration check by mode
DUR_OK=true
case "$MODE" in
  range)
    [ -n "$MIN" ] && [ -n "$MAX" ] || { err "range mode needs --min and --max"; exit 2; }
    awk "BEGIN { exit !($DUR >= $MIN && $DUR <= $MAX) }" || { DUR_OK=false; REASONS+=("duration ${DUR}s outside ${MIN}-${MAX}s"); } ;;
  summed)
    [ -n "$SUMMED" ] || { err "summed mode needs --summed"; exit 2; }
    awk "BEGIN { d=$DUR; s=$SUMMED; t=$TOL; exit !((d-s) <= t && (s-d) <= t) }" || { DUR_OK=false; REASONS+=("duration ${DUR}s off summed ${SUMMED}s by > ${TOL}s"); } ;;
  grew)
    [ -n "$BASE" ] || { err "grew mode needs --base"; exit 2; }
    awk "BEGIN { exit !($DUR > $BASE) }" || { DUR_OK=false; REASONS+=("duration ${DUR}s did not grow past base ${BASE}s"); } ;;
  *) err "unknown --mode '$MODE' (range|summed|grew)"; exit 2 ;;
esac

VID_OK=true
[ -n "$HAS_VIDEO" ] || { VID_OK=false; REASONS+=("no video stream"); }

AUD_OK=true
if [ "$REQUIRE_AUDIO" = yes ]; then
  [ -n "$HAS_AUDIO" ] || { AUD_OK=false; REASONS+=("no audio stream"); }
fi

VERDICT=PASS
[ "$DUR_OK" = true ] && [ "$VID_OK" = true ] && [ "$AUD_OK" = true ] || VERDICT=FLAG

HV=false; [ -n "$HAS_VIDEO" ] && HV=true
HA=false; [ -n "$HAS_AUDIO" ] && HA=true

REASONS_JSON=""
for r in ${REASONS[@]+"${REASONS[@]}"}; do REASONS_JSON+="\"${r}\","; done
REASONS_JSON=${REASONS_JSON%,}

printf '{"file":"%s","route":"%s","duration_s":%.1f,"width":%s,"height":%s,"has_video":%s,"has_audio":%s,"verdict":"%s","reasons":[%s]}\n' \
  "$FILE" "$ROUTE" "$DUR" "$OW" "$OH" "$HV" "$HA" "$VERDICT" "$REASONS_JSON"

[ "$VERDICT" = PASS ] \
  && err "verified: ${DUR}s, ${OW}x${OH} (mode=$MODE)" \
  || err "FLAG verdict — report the reasons prominently in summary.md and state.md"
exit 0
