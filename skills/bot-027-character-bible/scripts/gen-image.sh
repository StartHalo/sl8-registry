#!/usr/bin/env bash
# gen-image.sh — generate ONE bible image by walking the pinned image-model chain.
#
# Usage:
#   gen-image.sh <prompt-file> <out-dir> <stable-name> \
#       [--seed N] [--size SIZE] [--aspect-ratio AR] [--resolution 1K|2K|4K] \
#       [--ref <path|url> ...] [--max-cost CREDITS]
#
# Composes NOTHING: the prompt arrives fully assembled in <prompt-file> (the
# STYLE_STACK + CHARACTER_BLOCK + view instruction + "no text" stack is the caller's
# job). Walks the pinned image chain IN ORDER — never improvises out-of-chain models.
# On success prints exactly one line to stdout:
#
#   model<TAB>local-path<TAB>hosted-url
#
# and exits 0. All diagnostics go to stderr. Exits 1 when every model in the chain
# has failed (the caller records the failure in bible-log.md / state.md and stops).
#
# (Copied + adapted from BOT-016 bot-016-reference-sheet/scripts/gen-image.sh — the
# --resolution-removed fix is already in place; see attempt_model below. BOT-027 uses
# the SAME bible chain because the bible IS the cross-shot identity anchor the Seedance
# reference-to-video call reads as @Image1/@Image2.)
#
# PINNED CHAIN (2026-06-18 for ai-gen v2.1.0 — keep in sync with SKILL.md, Step-0 PoC):
#   fal-ai/nano-banana-pro -> openai/gpt-image-2 -> fal-ai/nano-banana-2
# Unlike BOT-013's chain (where the diffusion fallbacks are ref-blind), ALL THREE models
# here accept reference images AND an aspect ratio — so the character lock survives a
# fallback. We therefore pass --aspect-ratio + --ref to every model in the chain.
#
# CHARACTER LOCK (the consistency mechanism — identity drift is the #1 failure):
#   --ref <path|url> carries the user's reference image (from character-spec.md's
#   "Reference image" field, when present) into the generation. nano-banana-pro accepts
#   up to 14 image refs; gpt-image-2 up to 16; nano-banana-2 supports refs too. The
#   FROZEN BLOCKS (STYLE_STACK + CHARACTER_BLOCK, pasted verbatim by the caller) plus the
#   fixed --seed are the language-level lock that holds even when no --ref is supplied.
#
# RUNTIME-CONFIRM (open item carried from Design/Author):
#   The exact CLI flag for passing a reference image to openai/gpt-image-2 (and whether
#   nano-banana-2 names it identically) is a runtime-confirm item — see
#   references/nbp-dialect.md. We pass the SAME flags (--aspect-ratio, --ref) to all three
#   models; if a model REJECTS an argument, ai-gen exits non-zero and the chain simply
#   FALLS THROUGH to the next model (an availability/arg failure, recorded, not improvised
#   around). Confirm flag names at Test via `ai-gen --help` + `ai-gen info <slug>`.
#
# ai-gen v2.1.0 mechanics handled here:
#   - JSON contract: files[] are OBJECTS ({local_path,url,...}); hosted_urls[0] is the
#     fixed hosted-URL field regardless of model. We read both; never regex the raw blob.
#   - all three models take aspect_ratio (--aspect-ratio); nano-banana-pro additionally
#     HAS a resolution param (1K/2K/4K) — but the ai-gen CLI does NOT expose a
#     --resolution flag for it (it exits non-zero and the chain skips the primary). We
#     therefore accept --resolution for forward-compat but DO NOT forward it.
#   - --max-cost is in CREDITS (1 cr ~= $0.004). A failed generation is not charged.
#   - A success response can (rarely) lack a hosted URL (the downstream contract wants
#     it) — retried once on the same model, then the chain walks on.
#   - .webp safety net: convert to the requested extension via ffmpeg if a model emits it.

set -euo pipefail

die()  { echo "gen-image.sh: ERROR: $*" >&2; exit 1; }
note() { echo "gen-image.sh: $*" >&2; }

command -v ai-gen >/dev/null 2>&1 || die "ai-gen CLI not found on PATH (expected pre-installed in the sl8-video sandbox)"
command -v python3 >/dev/null 2>&1 || die "python3 not found on PATH (needed for JSON parsing — we parse files[0].local_path with python3)"

[ $# -ge 3 ] || die "usage: gen-image.sh <prompt-file> <out-dir> <stable-name> [--seed N] [--size SIZE] [--aspect-ratio AR] [--resolution 1K|2K|4K] [--ref P ...] [--max-cost CREDITS]"

PROMPT_FILE=$1; OUT_DIR=$2; STABLE_NAME=$3; shift 3
SEED=""; SIZE="landscape_16_9"; ASPECT=""; RESOLUTION=""; MAXCOST=""
REFS=()

while [ $# -gt 0 ]; do
  case "$1" in
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

# Resolve reference images ONCE: keep URLs and existing local files; drop (with a single
# note) any cited LOCAL ref that is missing on disk. A missing ref must NOT fail every
# model — it degrades to the language+seed lock (frozen blocks + fixed seed, which the
# SKILL documents as the lock that holds without a --ref). Recorded, never silent.
RESOLVED_REFS=()
for r in "${REFS[@]:-}"; do
  [ -n "$r" ] || continue
  case "$r" in
    http://*|https://*) RESOLVED_REFS+=("$r") ;;
    *) if [ -f "$r" ]; then RESOLVED_REFS+=("$r")
       else note "reference image not found on disk — generating without it (language+seed lock holds): $r"; fi ;;
  esac
done

# Derive an aspect ratio from the size preset when the caller didn't pass one
# (all three models take aspect_ratio, not the -s preset BOT-013's diffusion models used).
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

# The pinned bible chain — all three are reference-capable and aspect-ratio-capable.
MODELS=("fal-ai/nano-banana-pro" "openai/gpt-image-2" "fal-ai/nano-banana-2")

# Local-file parse: prints files[0].local_path when the response is success=true with
# a non-empty files array. v2.1.0 files[] entries are OBJECTS ({local_path,url,...});
# we also accept a bare-string entry for forward/backward safety.
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

# Hosted-URL extraction: prefer the stable hosted_urls[0] field; fall back to walking
# the whole response for the first *.fal.media string (any subdomain). Shape-proof.
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

# Attempt one generation. Prints "localfile<TAB>url" (url may be empty) on a
# generation that produced a file; returns 1 on outright failure (incl. an arg a model
# rejects — that model falls through to the next).
attempt_model() {
  local model=$1 raw local_file url
  local args=(image "$PROMPT" -m "$model" -o "$OUT_DIR" --format json)
  # All three models take aspect_ratio (none of them want the -s size preset).
  args+=(--aspect-ratio "$ASPECT")
  # Resolution: the ai-gen CLI does NOT accept a --resolution flag for the bible-chain
  # models. Test 2026-06-19 (BOT-016) proved nano-banana-pro REJECTS `--resolution` as an
  # unknown option (exit non-zero) and the whole chain fell through to nano-banana-2 —
  # i.e. the PRIMARY model was skipped on every run by this one flag. So we do NOT forward
  # --resolution; every model renders at its own default (16:9 was crisp at default in the
  # Step-0 PoC, where nano-banana-pro ran with just --aspect-ratio). The arg is still
  # accepted for forward-compat but intentionally ignored.
  : "${RESOLUTION:-}"  # accepted-but-ignored (see note above)
  # Reference images: ALL THREE models in this chain consume them (the character lock
  # survives a fallback here, unlike BOT-013's ref-blind diffusion fallbacks). The exact
  # --ref flag name for gpt-image-2 is runtime-confirm; a model that rejects it falls
  # through to the next model rather than being worked around.
  for r in "${RESOLVED_REFS[@]:-}"; do [ -n "$r" ] && args+=(--ref "$r"); done
  if [ -n "$SEED" ];    then args+=(--seed "$SEED"); fi
  if [ -n "$MAXCOST" ]; then args+=(--max-cost "$MAXCOST"); fi
  if ! raw=$(ai-gen "${args[@]}"); then
    note "  $model: ai-gen exited non-zero (unavailable, or rejected an arg — falling through)"
    return 1
  fi
  local_file=$(first_file_if_success "$raw")
  if [ -z "$local_file" ]; then
    note "  $model: response is not success=true with a local file"
    return 1
  fi
  if [ ! -f "$local_file" ]; then
    note "  $model: success=true but reported file is missing on disk: $local_file"
    return 1
  fi
  url=$(extract_url "$raw")
  printf '%s\t%s\n' "$local_file" "$url"
}

# Move the generated file to its stable name; convert when the extension differs
# (a model may emit .webp but the path contract wants .png). Returns 1 (never dies)
# on a failed conversion so the caller can walk to the next model.
finalize() {
  local src=$1
  local src_ext="${src##*.}" dst_ext="${STABLE_NAME##*.}" dst="$OUT_DIR/$STABLE_NAME"
  if [ "$src_ext" != "$dst_ext" ] && command -v ffmpeg >/dev/null 2>&1; then
    note "converting .$src_ext -> .$dst_ext via ffmpeg"
    if ! ffmpeg -y -loglevel error -i "$src" "$dst"; then
      note "  ffmpeg conversion failed (.$src_ext -> .$dst_ext) — discarding $src and walking to the next model"
      rm -f "$src"
      return 1
    fi
    rm -f "$src"
  else
    [ "$src_ext" = "$dst_ext" ] || note "WARNING: extension mismatch (.$src_ext -> .$dst_ext) and no ffmpeg — renaming as-is"
    if [ "$src" != "$dst" ]; then mv -f "$src" "$dst"; fi
  fi
}

for model in "${MODELS[@]}"; do
  for try in 1 2; do
    note "attempting $model (try $try/2)"
    if result=$(attempt_model "$model"); then
      local_file=${result%%$'\t'*}
      url=${result#*$'\t'}
      if [ -z "$url" ]; then
        if [ "$try" -eq 1 ]; then
          note "  $model: generated but no hosted URL in response — regenerating once (the URL is the downstream/provenance contract)"
          rm -f "$local_file"
          continue
        fi
        note "  $model: still no hosted URL after retry — walking to next model"
        rm -f "$local_file"
        break
      fi
      if ! finalize "$local_file"; then
        break # conversion failure -> next model (same treatment as a missing URL)
      fi
      printf '%s\t%s\t%s\n' "$model" "$OUT_DIR/$STABLE_NAME" "$url"
      exit 0
    fi
    break # outright failure (or rejected arg) -> next model; availability failures don't heal on retry
  done
done

die "all models in the bible chain failed for $STABLE_NAME (tried in order: ${MODELS[*]}). Record this in bible-log.md / state.md — do not improvise out-of-chain models."
