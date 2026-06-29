#!/usr/bin/env bash
# gen-image.sh — generate ONE still/keyframe by walking a pinned image-model chain.
#
# Part of the shared `video-toolkit` skill: the SINGLE nano-banana-pro driver every
# video bot uses for stills and keyframes. Consolidates the four per-bot copies and
# centralizes the sharp edges (the no-`--resolution` quirk, the hosted-URL contract,
# the .webp safety net) so a fix lands once.
#
# Usage:
#   gen-image.sh <prompt-file> <out-dir> <stable-name> \
#       [--chain "m1,m2,..."] [--seed N] [--size SIZE] [--aspect-ratio AR] \
#       [--resolution X] [--ref <path|url> ...] [--max-cost CREDITS]
#
# Composes NOTHING: the prompt arrives fully assembled in <prompt-file> (the frozen
# STYLE/CHARACTER blocks + scene/view instruction + "no text" stack is the caller's
# job — Layer 3, bot-local). On success prints exactly one line to stdout:
#
#   model<TAB>local-path<TAB>hosted-url
#
# and exits 0. All diagnostics -> stderr. Exits 1 when every model in the chain failed.
#
# --chain  comma-separated model ids, walked IN ORDER (never improvises out-of-chain).
#          default: fal-ai/nano-banana-pro,openai/gpt-image-2,fal-ai/nano-banana-2
#          (the bible chain — all three are reference- AND aspect-capable, so a fallback
#          keeps the character lock). A stills recipe may pass a diffusion fallback chain,
#          e.g. --chain "fal-ai/nano-banana-pro,fal-ai/flux-dev,fal-ai/stable-diffusion-v35-large".
#
# PER-MODEL ARG SHAPING (the BOT-013 lesson): nano-banana-* / gpt-image-* take
# --aspect-ratio AND --ref (reference images); diffusion models (flux/sd/ideogram) take
# the -s SIZE preset and are REF-BLIND. We shape args per model so a ref-blind fallback
# still works instead of rejecting --ref and falling through. A model that still rejects
# an arg makes ai-gen exit non-zero -> the chain falls through to the next (recorded, not
# improvised around).
#
# THE no-`--resolution` QUIRK: ai-gen does NOT expose a --resolution flag for nano-banana-pro
# (it exits non-zero and the chain skips the PRIMARY model). We accept --resolution for
# forward-compat but NEVER forward it. (Video models DO take --resolution — that stays in
# the bot-local recipe, not here.)
#
# CHARACTER LOCK: --ref carries reference image(s) to ref-capable models; the frozen blocks
# + fixed --seed are the language-level lock that holds even with no --ref. A missing LOCAL
# ref is dropped with a note (degrade to language+seed), never a hard fail.
#
# ai-gen v2.1.0 JSON: files[] are OBJECTS ({local_path,url,...}); hosted_urls[0] is the
# stable hosted URL. Parsed with python3 (no jq). bash 3.2 clean.

set -euo pipefail

die()  { echo "gen-image.sh: ERROR: $*" >&2; exit 1; }
note() { echo "gen-image.sh: $*" >&2; }

command -v ai-gen  >/dev/null 2>&1 || die "ai-gen not found on PATH (expected in the sl8-video / sl8-animation sandbox)"
command -v python3 >/dev/null 2>&1 || die "python3 not found on PATH (needed to parse ai-gen --format json)"

[ $# -ge 3 ] || die "usage: gen-image.sh <prompt-file> <out-dir> <stable-name> [--chain ...] [--seed N] [--size SIZE] [--aspect-ratio AR] [--resolution X] [--ref P ...] [--max-cost CR]"

PROMPT_FILE=$1; OUT_DIR=$2; STABLE_NAME=$3; shift 3
CHAIN="fal-ai/nano-banana-pro,openai/gpt-image-2,fal-ai/nano-banana-2"
SEED=""; SIZE="landscape_16_9"; ASPECT=""; RESOLUTION=""; MAXCOST=""
REFS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --chain)         CHAIN=${2:?--chain requires a value};          shift 2 ;;
    --seed)          SEED=${2:?--seed requires a value};            shift 2 ;;
    --size)          SIZE=${2:?--size requires a value};            shift 2 ;;
    --aspect-ratio)  ASPECT=${2:?--aspect-ratio requires a value};  shift 2 ;;
    --resolution)    RESOLUTION=${2:?--resolution requires a value};shift 2 ;;
    --max-cost)      MAXCOST=${2:?--max-cost requires a value};     shift 2 ;;
    --ref)           REFS+=("${2:?--ref requires a value}");        shift 2 ;;
    *) die "unknown argument: $1" ;;
  esac
done

[ -f "$PROMPT_FILE" ] || die "prompt file not found: $PROMPT_FILE"
PROMPT=$(cat "$PROMPT_FILE")
[ -n "$PROMPT" ] || die "prompt file is empty: $PROMPT_FILE"
mkdir -p "$OUT_DIR"

# Resolve refs once: keep URLs and existing local files; drop missing local refs with a note.
RESOLVED_REFS=()
for r in "${REFS[@]:-}"; do
  [ -n "$r" ] || continue
  case "$r" in
    http://*|https://*) RESOLVED_REFS+=("$r") ;;
    *) if [ -f "$r" ]; then RESOLVED_REFS+=("$r")
       else note "reference image not found on disk — generating without it (language+seed lock holds): $r"; fi ;;
  esac
done

# Derive aspect from the size preset when not given (ref-capable models take aspect, not -s).
if [ -z "$ASPECT" ]; then
  case "$SIZE" in
    landscape_16_9) ASPECT="16:9" ;;
    landscape_4_3)  ASPECT="4:3"  ;;
    portrait_16_9)  ASPECT="9:16" ;;
    portrait_4_3)   ASPECT="3:4"  ;;
    square_hd|square) ASPECT="1:1" ;;
    *) ASPECT="16:9" ;;
  esac
fi

: "${RESOLUTION:-}"  # accepted-but-ignored — see the no-`--resolution` quirk in the header

# Split the comma-separated chain into an array (bash 3.2: IFS read).
IFS=',' read -r -a MODELS <<< "$CHAIN"

ref_capable() { case "$1" in *nano-banana*|*gpt-image*) return 0 ;; *) return 1 ;; esac; }

first_file_if_success() {
  python3 -c '
import json, sys
try:
    doc = json.load(sys.stdin)
except Exception:
    sys.exit(0)
if not (isinstance(doc, dict) and doc.get("success") is True):
    sys.exit(0)
files = doc.get("files")
if not (isinstance(files, list) and files):
    sys.exit(0)
f0 = files[0]
if isinstance(f0, dict):
    p = f0.get("local_path") or ""
    if p: print(p)
elif isinstance(f0, str):
    print(f0)
' <<<"$1"
}

extract_url() {
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
    doc = json.load(sys.stdin)
except Exception:
    sys.exit(0)
hu = doc.get("hosted_urls") if isinstance(doc, dict) else None
if isinstance(hu, list) and hu and isinstance(hu[0], str):
    print(hu[0]); sys.exit(0)
for url in walk(doc):
    print(url); break
' <<<"$1"
}

attempt_model() {
  local model=$1 raw local_file url
  local args=(image "$PROMPT" -m "$model" -o "$OUT_DIR" --format json)
  if ref_capable "$model"; then
    args+=(--aspect-ratio "$ASPECT")
    for r in "${RESOLVED_REFS[@]:-}"; do [ -n "$r" ] && args+=(--ref "$r"); done
  else
    args+=(-s "$SIZE")   # diffusion fallback: size preset, ref-blind
  fi
  [ -n "$SEED" ]    && args+=(--seed "$SEED")
  [ -n "$MAXCOST" ] && args+=(--max-cost "$MAXCOST")
  if ! raw=$(ai-gen "${args[@]}"); then
    note "  $model: ai-gen exited non-zero (unavailable, or rejected an arg — falling through)"
    return 1
  fi
  local_file=$(first_file_if_success "$raw")
  [ -n "$local_file" ] || { note "  $model: response not success=true with a local file"; return 1; }
  [ -f "$local_file" ] || { note "  $model: success=true but file missing on disk: $local_file"; return 1; }
  url=$(extract_url "$raw")
  printf '%s\t%s\n' "$local_file" "$url"
}

finalize() {
  local src=$1
  local src_ext="${src##*.}" dst_ext="${STABLE_NAME##*.}" dst="$OUT_DIR/$STABLE_NAME"
  if [ "$src_ext" != "$dst_ext" ] && command -v ffmpeg >/dev/null 2>&1; then
    note "converting .$src_ext -> .$dst_ext via ffmpeg"
    if ! ffmpeg -y -loglevel error -i "$src" "$dst"; then
      note "  ffmpeg conversion failed — discarding $src and walking to the next model"; rm -f "$src"; return 1
    fi
    rm -f "$src"
  else
    [ "$src_ext" = "$dst_ext" ] || note "WARNING: extension mismatch (.$src_ext -> .$dst_ext) and no ffmpeg — renaming as-is"
    [ "$src" != "$dst" ] && mv -f "$src" "$dst"
  fi
}

for model in "${MODELS[@]}"; do
  [ -n "$model" ] || continue
  for try in 1 2; do
    note "attempting $model (try $try/2)"
    if result=$(attempt_model "$model"); then
      local_file=${result%%$'\t'*}
      url=${result#*$'\t'}
      if [ -z "$url" ]; then
        if [ "$try" -eq 1 ]; then
          note "  $model: generated but no hosted URL — regenerating once (the URL is the i2v/provenance contract)"
          rm -f "$local_file"; continue
        fi
        note "  $model: still no hosted URL after retry — walking to next model"; rm -f "$local_file"; break
      fi
      finalize "$local_file" || break
      printf '%s\t%s\t%s\n' "$model" "$OUT_DIR/$STABLE_NAME" "$url"
      exit 0
    fi
    break   # outright failure / rejected arg -> next model (availability won't heal on retry)
  done
done

die "all models in the chain failed for $STABLE_NAME (tried: ${MODELS[*]}). Record it in the log/state.md — do not improvise out-of-chain models."
