#!/usr/bin/env bash
#
# gen-keyframe-clips.sh — render a PINNED-KEYFRAME journey with Hailuo 02 first-last-frame,
# the precise-control way. This is BOT-029 phase 2 (the RENDER engine); phase 1 wrote the
# keyframe-plan.md (K+1 pinned states + K motion prompts + the aspect ratio + an Audio line).
#
# The mechanic (DIFFERENT from BOT-027 Seedance single-pass and BOT-028 Kling per-shot i2v):
#   - Hailuo 02 image-to-video takes a START image AND an END image; it MORPHS start -> end.
#     So EVERY boundary of the journey is PINNED on BOTH sides. The character is locked by
#     generating each keyframe with nano-banana-pro carrying the FROZEN character tokens, and
#     by chaining --ref state[i-1] -> state[i] so the SAME character carries forward.
#   - We generate K+1 keyframes (state 0..K), then K clips (scene i morphs state[i] -> state[i+1]).
#   - This gives precise first-last-frame control: pinned START and END per scene. State that in
#     summary.md — never present it as equivalent to Seedance native audio or Kling per-shot i2v.
#
# For EACH state 0..K:
#   ai-gen image "<state[i] description + frozen CHARACTER tokens>" -m fal-ai/nano-banana-pro \
#     --aspect-ratio <AR> [--ref <state[i-1].png>] --max-cost 80 --format json
#   Capture BOTH files[0].local_path AND files[0].url (the HOSTED url — Hailuo needs it as end_image_url).
#   NO --resolution flag (NBP rejects it -> skips the primary). Chain fallback:
#     fal-ai/nano-banana-pro -> openai/gpt-image-2 -> fal-ai/nano-banana-2.
#
# For EACH scene i (0..K-1):
#   ai-gen video "<motion prompt i>" -m fal-ai/minimax/hailuo-02/standard/image-to-video \
#     --image "<state[i] local>" end_image_url="<state[i+1] HOSTED url>" duration=6 \
#     --resolution 768P --max-cost 200 --format json
#   --image uploads the START keyframe; end_image_url MUST be the HOSTED url of the END keyframe.
#   Parse files[0].local_path. A failed scene is SKIPPED with a still-segment fallback built from
#   the two keyframes via ffmpeg (so the journey stays K scenes long); exit non-zero ONLY if EVERY
#   scene fails (no still fallback could be built either) — a clean recorded failure, no fake MP4.
#
# Then assemble.sh: uniform-normalize -> concat -> ALWAYS add an ambient/room-tone bed (Hailuo is
# SILENT — derived from the plan Audio line) -> ffprobe verify -> episode.mp4.
#
# Donor lineage: BOT-027 character-bible scripts/gen-image.sh (NBP chain + hosted-url capture),
# BOT-028 kling-cinematic scripts/gen-kling-cinematic.sh (per-scene walk + parse) and
# scripts/assemble.sh (normalize -> concat -> room-tone -> ffprobe).
#
# Usage:
#   gen-keyframe-clips.sh <keyframe-plan.md> <project-dir>
#     <keyframe-plan.md>  the pinned-keyframe plan (parsed for the K+1 states, K motion prompts,
#                         the aspect ratio, and the Audio line). Absence is a clean failure.
#     <project-dir>       artifacts/<project-name> — keyframes/ + work-scenes/ + episode.mp4 live here
#
# Env knobs (all optional):
#   ASPECT          16:9 | 9:16 | 1:1  (default: read from the plan, else 16:9)
#   SCENE_DURATION  per-scene Hailuo seconds, 6 or 10  (default 6)
#   RESOLUTION      Hailuo resolution token, 512P | 768P  (default 768P)
#   KF_MAX_COST     per-keyframe credit cap   (default 80)
#   HAILUO_MAX_COST per-scene credit cap      (default 200)
#   HAILUO_MODEL    i2v slug  (default fal-ai/minimax/hailuo-02/standard/image-to-video)
#   IMG_CHAIN       keyframe image chain  (default the NBP bible chain)
#   NO_ASSEMBLE     if set to 1, stop after generating clips (do not call assemble.sh)
#
# On the clip-generation stage it prints ONE machine-readable JSON line to stdout:
#   {"stage":"clips","scenes":N,"generated":G,"stills":S,"clips_dir":"...","keyframes":K1}
# then (unless NO_ASSEMBLE=1) it execs assemble.sh, whose JSON verdict line is the FINAL stdout
# line. Diagnostics go to stderr. Non-zero exit = every scene failed (no episode, no fake MP4).

set -euo pipefail

err() { printf 'gen-keyframe-clips: %s\n' "$*" >&2; }

for dep in ai-gen python3 ffmpeg ffprobe; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

if [[ $# -ne 2 ]]; then
  err "usage: gen-keyframe-clips.sh <keyframe-plan.md> <project-dir>"
  exit 2
fi

PLAN=$1
PROJECT_DIR=${2%/}
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# --- validate inputs (headless: a bad input is a clean failure, never a guess) -----------
[[ -s "$PLAN" ]] || { err "keyframe-plan missing or empty: $PLAN — cannot render (clean recorded failure)"; exit 2; }

SCENE_DURATION=${SCENE_DURATION:-6}
case "$SCENE_DURATION" in 6|10) : ;; *) err "SCENE_DURATION must be 6 or 10 (got '$SCENE_DURATION')"; exit 2 ;; esac
RESOLUTION=${RESOLUTION:-768P}
case "$RESOLUTION" in 512P|768P) : ;; *) err "RESOLUTION must be 512P or 768P (got '$RESOLUTION')"; exit 2 ;; esac
KF_MAX_COST=${KF_MAX_COST:-80}
HAILUO_MAX_COST=${HAILUO_MAX_COST:-200}
HAILUO_MODEL=${HAILUO_MODEL:-fal-ai/minimax/hailuo-02/standard/image-to-video}
IMG_CHAIN=${IMG_CHAIN:-"fal-ai/nano-banana-pro openai/gpt-image-2 fal-ai/nano-banana-2"}

# --- aspect ratio: env override, else read the plan, else 16:9 ---------------------------
if [[ -z "${ASPECT:-}" ]]; then
  ASPECT=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
# Accept "Aspect ratio: 16:9", "AR: 9:16", or a bare "16:9" on an Aspect line.
m = re.search(r"(?:aspect[ -]?ratio|^\s*AR)\s*[:=]?\s*(\d+:\d+)", text, re.I | re.M)
if not m:
    m = re.search(r"\b(\d+:\d+)\b", text)
print(m.group(1) if m else "16:9")
' "$PLAN")
fi
case "$ASPECT" in 16:9|9:16|1:1) : ;; *) err "ASPECT must be 16:9|9:16|1:1 (got '$ASPECT')"; exit 2 ;; esac

# --- pull the frozen CHARACTER tokens (the identity lock pasted into every keyframe) -----
# Prefer an explicit "Character:" line; else the text inside the first (parentheses); else a
# generic placeholder. The plan author is expected to emit a CHARACTER line.
CHARACTER_TOKENS=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
m = re.search(r"^\s*Character\s*[:=]\s*(.+)$", text, re.I | re.M)
if m:
    print(m.group(1).strip()); raise SystemExit
m = re.search(r"\(([^)]{8,})\)", text)
print(m.group(1).strip() if m else "the same character throughout")
' "$PLAN")
[[ -n "$CHARACTER_TOKENS" ]] || CHARACTER_TOKENS="the same character throughout"

# --- pull the global look header (first non-blank, non-heading line) ----------------------
HEADER=$(python3 -c '
import re, sys
for line in open(sys.argv[1]):
    s = line.strip()
    if not s or s.startswith("#"):
        continue
    # skip a leading Character:/Aspect:/Audio:/State:/Motion: line as the look header
    if re.match(r"(?i)^(character|aspect|ar|audio|state|keyframe|frame|motion|scene|transition|morph)\b", s):
        continue
    print(s); break
' "$PLAN" 2>/dev/null || true)
[[ -n "$HEADER" ]] || HEADER="A cinematic sequence."

# --- parse the K+1 STATE descriptions (state 0..K) ---------------------------------------
# A state line looks like one of:
#   State 0: <description>      |  Keyframe 0: <description>  |  [State 0]: <description>
# Emitted one description per line in numeric order (0,1,2,...).
mapfile -t STATES < <(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
pat = re.compile(r"^\s*\[?\s*(?:state|keyframe|frame)\s*\]?\s*#?\s*(\d+)\s*\]?\s*[:.\-)]\s*(.+)$", re.I)
found = {}
for line in text.splitlines():
    m = pat.match(line)
    if not m:
        continue
    idx = int(m.group(1)); body = m.group(2).strip()
    if body:
        found[idx] = body
for k in sorted(found):
    print(found[k])
' "$PLAN")

# --- parse the K MOTION prompts (scene/motion 0..K-1) ------------------------------------
# A motion line looks like one of:
#   Motion 0: <prompt>  |  Scene 0: <prompt>  |  Transition 0->1: <prompt>  |  Motion 0->1: <prompt>
mapfile -t MOTIONS < <(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
# label + START index, then an OPTIONAL ->N / -N / "to N" range, then the :/. delimiter + body.
# Consuming the range FIRST stops the "-" in "->1" from being read as the body delimiter.
pat = re.compile(r"^\s*\[?\s*(?:motion|scene|transition|morph)\s*\]?\s*#?\s*(\d+)\s*\]?\s*(?:(?:->|–>|-|to)\s*\d+\s*)?[:.\-)]\s*(.+)$", re.I)
found = {}
for line in text.splitlines():
    m = pat.match(line)
    if not m:
        continue
    idx = int(m.group(1)); body = m.group(2).strip()
    if body:
        found[idx] = body
for k in sorted(found):
    print(found[k])
' "$PLAN")

NSTATES=${#STATES[@]}
NMOTIONS=${#MOTIONS[@]}

if [[ "$NSTATES" -lt 2 ]]; then
  err "plan parse: found $NSTATES state(s) — need at least 2 pinned states (state 0 and state 1) to render one scene. Is the plan malformed?"
  exit 1
fi
# K scenes from K+1 states. If motion prompts are short, the missing ones default to a plain morph.
K=$(( NSTATES - 1 ))
if [[ "$NMOTIONS" -lt "$K" ]]; then
  err "plan parse: $NMOTIONS motion prompt(s) for $K scene(s) — missing ones default to a smooth morph between the pinned keyframes (disclosed in summary.md)"
fi

err "parsed $NSTATES states (K=$K scenes), $NMOTIONS motion prompts; aspect=$ASPECT scene-dur=${SCENE_DURATION}s res=$RESOLUTION"
err "character tokens: ${CHARACTER_TOKENS:0:90}"

KEYS_DIR="$PROJECT_DIR/keyframes"
CLIPS_DIR="$PROJECT_DIR/work-scenes"
mkdir -p "$KEYS_DIR" "$CLIPS_DIR"

# --- JSON helpers (ai-gen v2.1.0; files[] entries are OBJECTS) ----------------------------
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
# Hosted URL: prefer files[0].url, then hosted_urls[0], then walk for the first *.fal.media.
json_first_url() {
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
if isinstance(doc, dict):
    files = doc.get("files")
    if isinstance(files, list) and files and isinstance(files[0], dict):
        u = files[0].get("url")
        if isinstance(u, str) and u:
            print(u); sys.exit(0)
    hu = doc.get("hosted_urls")
    if isinstance(hu, list) and hu and isinstance(hu[0], str):
        print(hu[0]); sys.exit(0)
for u in walk(doc):
    print(u); break
' "$1"
}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# --- generate ONE keyframe via the NBP chain. ----------------------------------------------
# Args: <prompt> <out.png> [<ref.png> ...].  Prints "<localpath>\t<hosted-url>" on stdout, or
# nothing on failure.  NO --resolution (NBP rejects it -> skips the primary).
gen_keyframe() {
  local prompt=$1 out=$2; shift 2
  local refs=("$@")
  local model raw rc result url localf args
  for model in $IMG_CHAIN; do
    result="$TMP/kf.json"; : >"$result"; rc=0
    args=(image "$prompt" -m "$model" --aspect-ratio "$ASPECT" --max-cost "$KF_MAX_COST" -o "$TMP" --format json)
    local r
    for r in "${refs[@]:-}"; do [[ -n "$r" && -f "$r" ]] && args+=(--ref "$r"); done
    ai-gen "${args[@]}" >"$result" 2>"$TMP/kf.log" || rc=$?
    if [[ $rc -ne 0 ]] || ! json_success "$result"; then
      err "    keyframe model $model failed (exit=$rc) — next in chain"
      continue
    fi
    raw=$(json_first_file "$result")
    if [[ -z "$raw" || ! -s "$raw" ]]; then
      err "    keyframe model $model: success but no file on disk — next in chain"
      continue
    fi
    url=$(json_first_url "$result")
    # normalize extension to .png via ffmpeg if a model emitted .webp/.jpeg
    if [[ "${raw##*.}" != "png" ]]; then
      if ffmpeg -y -loglevel error -i "$raw" "$out" 2>/dev/null; then
        rm -f "$raw"
      else
        err "    keyframe ext-convert failed for $raw — next in chain"; continue
      fi
    else
      mv -f "$raw" "$out"
    fi
    # The hosted URL is the END-FRAME contract for Hailuo. A state that ends up WITHOUT a
    # hosted url can still be the START of a scene (uploaded via --image), but cannot be an
    # END frame. We record it and let the per-scene logic decide.
    [[ -n "$url" ]] || err "    keyframe model $model: produced a file but NO hosted url (cannot be a Hailuo end-frame; ok as a start)"
    printf '%s\t%s\n' "$out" "${url:-}"
    return 0
  done
  return 1
}

# --- 1. generate the K+1 keyframes, chaining --ref state[i-1] -> state[i] -----------------
KF_LOCAL=()   # KF_LOCAL[i] = local png for state i
KF_URL=()     # KF_URL[i]   = hosted url for state i (may be empty)
KF_OK=0
i=0
for state in "${STATES[@]}"; do
  IDX=$(printf '%02d' "$i")
  KEYFRAME="$KEYS_DIR/state-${IDX}.png"
  # Prompt = look header + the state description + the FROZEN character tokens + a no-text tail.
  KF_PROMPT="${HEADER} A single still keyframe: ${state} The subject is ${CHARACTER_TOKENS}, the SAME character throughout this sequence, large in frame, clearly lit (avoid very dark lighting). No text, no watermark, no logo."
  REFS=()
  # Chain identity: pass the PREVIOUS state's local png as --ref so the SAME character carries.
  if [[ "$i" -gt 0 && -n "${KF_LOCAL[$((i-1))]:-}" && -f "${KF_LOCAL[$((i-1))]}" ]]; then
    REFS+=("${KF_LOCAL[$((i-1))]}")
  fi
  err "state $IDX: ${state:0:70}..."
  if KFOUT=$(gen_keyframe "$KF_PROMPT" "$KEYFRAME" "${REFS[@]:-}"); then
    KF_LOCAL[$i]=${KFOUT%%$'\t'*}
    KF_URL[$i]=${KFOUT#*$'\t'}
    KF_OK=$(( KF_OK + 1 ))
    err "  state $IDX keyframe: ${KF_LOCAL[$i]} (url: ${KF_URL[$i]:-NONE})"
  else
    KF_LOCAL[$i]=""
    KF_URL[$i]=""
    err "  state $IDX: keyframe could not be generated (whole image chain failed) — this pins one scene boundary; affected scenes will fall back to a still segment"
  fi
  i=$(( i + 1 ))
done

err "keyframes: $KF_OK/$NSTATES generated"

# --- still-segment fallback: a freeze/cross-fade segment from the two boundary keyframes ---
# Used when a scene's Hailuo morph fails (or a boundary keyframe is missing but at least one
# end exists). Builds a SCENE_DURATION-second silent clip; cross-fades the two stills if both
# exist, else holds the single available still. Returns 0 on success.
make_still_segment() {
  local a=$1 b=$2 out=$3 dur=$4
  local vf="scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p"
  if [[ -n "$a" && -f "$a" && -n "$b" && -f "$b" ]]; then
    local half; half=$(awk "BEGIN{printf \"%.2f\", $dur/2}")
    # First half holds A, second half holds B, with a short xfade across the seam.
    if ffmpeg -y -hide_banner -loglevel error \
      -loop 1 -t "$dur" -i "$a" -loop 1 -t "$dur" -i "$b" \
      -filter_complex "[0:v]${vf}[va];[1:v]${vf}[vb];[va][vb]xfade=transition=fade:duration=1:offset=${half}[v]" \
      -map "[v]" -t "$dur" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
      -movflags +faststart "$out" 2>/dev/null; then
      return 0
    fi
  fi
  local single=""
  [[ -n "$a" && -f "$a" ]] && single="$a"
  [[ -z "$single" && -n "$b" && -f "$b" ]] && single="$b"
  [[ -n "$single" ]] || return 1
  ffmpeg -y -hide_banner -loglevel error -loop 1 -t "$dur" -i "$single" \
    -filter_complex "[0:v]${vf}[v]" -map "[v]" -t "$dur" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart "$out" 2>/dev/null
}

# canvas dims for the still fallback (mirrors assemble.sh)
case "$ASPECT" in
  16:9) W=1280 H=720 ;;
  9:16) W=720  H=1280 ;;
  1:1)  W=720  H=720 ;;
esac

# --- 2. for each scene i (0..K-1): Hailuo first-last morph state[i] -> state[i+1] ----------
GENERATED=0
STILLS=0
for (( s=0; s<K; s++ )); do
  IDX=$(printf '%02d' "$s")
  CLIP="$CLIPS_DIR/scene-${IDX}.mp4"
  START_LOCAL=${KF_LOCAL[$s]:-}
  END_URL=${KF_URL[$((s+1))]:-}
  MOTION=${MOTIONS[$s]:-}
  [[ -n "$MOTION" ]] || MOTION="A smooth, natural transition; ${CHARACTER_TOKENS%%,*} stays the same character, large in frame, stable picture, no flicker, no identity drift."

  err "scene $IDX (${SCENE_DURATION}s): ${MOTION:0:70}..."

  # Hailuo needs BOTH a start (uploaded via --image, a local file is fine) AND a hosted end url.
  if [[ -z "$START_LOCAL" || ! -f "$START_LOCAL" || -z "$END_URL" ]]; then
    err "  scene $IDX: cannot run Hailuo first-last — start-local='${START_LOCAL:-MISSING}', end-url='${END_URL:-MISSING}'. Building a still-segment fallback from the available keyframes."
    if make_still_segment "${KF_LOCAL[$s]:-}" "${KF_LOCAL[$((s+1))]:-}" "$CLIP" "$SCENE_DURATION"; then
      STILLS=$(( STILLS + 1 ))
      err "  scene $IDX: still-segment fallback written (disclose in summary.md)"
    else
      err "  scene $IDX: no keyframe at either boundary — scene dropped"
    fi
    continue
  fi

  RESULT="$TMP/s${IDX}.json"; LOG="$TMP/s${IDX}.log"; rc=0
  # --image = START keyframe (uploaded); end_image_url = HOSTED url of the END keyframe.
  ai-gen video "$MOTION" -m "$HAILUO_MODEL" \
    --image "$START_LOCAL" "end_image_url=${END_URL}" \
    "duration=${SCENE_DURATION}" --resolution "$RESOLUTION" \
    --max-cost "$HAILUO_MAX_COST" -o "$TMP" --format json \
    >"$RESULT" 2>"$LOG" || rc=$?

  # Retry once without the duration pass-through if the model rejected a param.
  if { [[ $rc -ne 0 ]] || ! json_success "$RESULT"; } \
     && grep -qiE 'duration|unprocessable|invalid|validation|end_image' "$LOG" "$RESULT" 2>/dev/null; then
    err "  scene $IDX: Hailuo rejected a param — retrying WITHOUT the duration pass-through (clip runs at the model default; disclose in summary.md)"
    rc=0
    ai-gen video "$MOTION" -m "$HAILUO_MODEL" \
      --image "$START_LOCAL" "end_image_url=${END_URL}" \
      --resolution "$RESOLUTION" --max-cost "$HAILUO_MAX_COST" \
      -o "$TMP" --format json >"$RESULT" 2>"$LOG" || rc=$?
  fi

  if [[ $rc -ne 0 ]] || ! json_success "$RESULT"; then
    err "  scene $IDX: Hailuo i2v failed (exit=$rc): $(tr '\n' ' ' <"$LOG" | head -c 240)"
    err "  scene $IDX: building a still-segment fallback from the two pinned keyframes (disclose in summary.md)"
    if make_still_segment "${KF_LOCAL[$s]:-}" "${KF_LOCAL[$((s+1))]:-}" "$CLIP" "$SCENE_DURATION"; then
      STILLS=$(( STILLS + 1 ))
      err "  scene $IDX: still-segment fallback written"
    else
      err "  scene $IDX: still fallback also failed — scene dropped"
    fi
    continue
  fi
  SRC=$(json_first_file "$RESULT")
  if [[ -z "$SRC" || ! -s "$SRC" ]]; then
    err "  scene $IDX: success but no clip on disk — trying still-segment fallback"
    if make_still_segment "${KF_LOCAL[$s]:-}" "${KF_LOCAL[$((s+1))]:-}" "$CLIP" "$SCENE_DURATION"; then
      STILLS=$(( STILLS + 1 )); err "  scene $IDX: still-segment fallback written"
    else
      err "  scene $IDX: still fallback also failed — scene dropped"
    fi
    continue
  fi
  mv -f "$SRC" "$CLIP"
  GENERATED=$(( GENERATED + 1 ))
  err "  scene $IDX OK -> $CLIP (Hailuo morph, silent — ambient bed added at assembly)"
done

PRODUCED=$(( GENERATED + STILLS ))
if [[ "$PRODUCED" -lt 1 ]]; then
  err "every scene failed (no Hailuo clip and no still fallback) — no usable episode (clean recorded failure)"
  printf '{"stage":"clips","scenes":%s,"generated":0,"stills":0,"clips_dir":"%s","keyframes":%s}\n' \
    "$K" "$CLIPS_DIR" "$KF_OK"
  exit 1
fi

printf '{"stage":"clips","scenes":%s,"generated":%s,"stills":%s,"clips_dir":"%s","keyframes":%s}\n' \
  "$K" "$GENERATED" "$STILLS" "$CLIPS_DIR" "$KF_OK"
err "produced $PRODUCED/$K scene segments ($GENERATED Hailuo morphs, $STILLS still fallbacks) under $CLIPS_DIR"

# --- 3. assemble (unless asked to stop after clips) --------------------------------------
if [[ "${NO_ASSEMBLE:-0}" == "1" ]]; then
  err "NO_ASSEMBLE=1 — stopping after clip generation (run scripts/assemble.sh yourself)"
  exit 0
fi

# Pull the plan Audio: line so the ambient bed can be derived from it.
AUDIO_DESC=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
m = re.search(r"Audio\s*[:=]\s*(.+)", text, re.I)
print(m.group(1).strip() if m else "")
' "$PLAN")

err "assembling: normalize -> concat -> ambient bed -> ffprobe verify"
ASPECT="$ASPECT" AUDIO_DESC="$AUDIO_DESC" bash "$SCRIPT_DIR/assemble.sh" "$PROJECT_DIR"
