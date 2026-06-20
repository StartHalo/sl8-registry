#!/usr/bin/env bash
#
# gen-extend-chain.sh — render a continuous-plan into ONE continuous shot with the
# Veo 3.1 engine, the EXTEND-CHAIN way. There is NO concat here: Veo's extend-video
# RETURNS THE FULL extended video (base + every extension so far), so each hop's
# output is the whole growing video, and the FINAL hop's local file IS the finished
# continuous episode.
#
# The pipeline (one continuous shot, native audio, NO stitching):
#   (1) Generate ONE base start frame with nano-banana-pro (the Base scene's opening
#       image, with the plan's FROZEN character tokens). Capture files[0].local_path.
#   (2) Veo base i2v on that frame:
#         ai-gen video "<base motion>" -m fal-ai/veo3.1/image-to-video \
#           --image <base.png> --duration 8s --resolution 720p \
#           --aspect-ratio <AR> --max-cost <cap> --format json
#       Native audio (generate_audio default true). Capture files[0].local_path AND
#       files[0].url (the HOSTED url) — the url is what the first extend hop consumes.
#   (3) For EACH hop, Veo extend on the PREVIOUS HOP'S HOSTED url:
#         ai-gen run fal-ai/veo3.1/extend-video \
#           video_url="<previous hosted url>" prompt="<hop prompt>" \
#           --duration 7s --max-cost <cap> --format json
#       extend-video RETURNS THE FULL extended video (base + all extensions so far),
#       NOT a 7s segment — so there is NEVER a concat. Capture the new
#       files[0].local_path AND files[0].url; the NEXT hop uses THIS url as video_url.
#       The FINAL hop's local_path IS the finished continuous video.
#   (4) ffprobe-verify ONE file (duration > base, a video stream, an audio stream),
#       then mv it to <project-dir>/episode.mp4.
#
# This is a DIFFERENT architecture from the Seedance (single-pass reference-to-video)
# and Kling (per-shot i2v + ffmpeg concat) siblings: here it is ONE base i2v + N extend
# hops, each hop returning the WHOLE video, no stitching, native Veo audio throughout.
# The caller MUST disclose this in summary.md (one continuous shot, native audio, NO
# concat). Never silent, never fabricated.
#
# Donor lineage: BOT-027 character-bible scripts/gen-image.sh (the nano-banana-pro
# base-frame chain + the files[0].local_path/url JSON contract), BOT-028
# scripts/gen-kling-cinematic.sh (the per-hop walk, the params-retry, the ai-gen JSON
# helpers). The extend mechanic is proven by the 2026-06-20 Veo PoC (base i2v 4.1MB ->
# extend 6.9MB, the extend returning the FULL grown video).
#
# Usage:
#   gen-extend-chain.sh <continuous-plan.md> <project-dir>
#     <continuous-plan.md>  the validated continuous plan (parsed for the frozen
#                           character tokens, the look header, the Base scene opening
#                           image + base motion prompt, the numbered hop prompts, the
#                           aspect ratio, and the Audio line)
#     <project-dir>         artifacts/<project-name> — work/ + episode.mp4 live here
#
# Env knobs (all optional):
#   ASPECT          16:9 | 9:16   (default: read from the plan footer, else 16:9 — Veo
#                                  i2v/extend only support 16:9 and 9:16)
#   TIER            economy | quality   (default economy — a lower per-call cost cap)
#   BASE_DURATION   base i2v duration: 4s|6s|8s   (default 8s)
#   HOP_DURATION    each extend duration in seconds  (default 7 — the Veo extend default)
#   RESOLUTION      720p | 1080p   (default 720p)
#   NBP_MAX_COST    base-frame credit cap   (default 80)
#   VEO_MAX_COST    per Veo call credit cap (default 700)
#   VEO_I2V_MODEL   base i2v slug   (default fal-ai/veo3.1/image-to-video)
#   VEO_EXT_MODEL   extend slug     (default fal-ai/veo3.1/extend-video)
#   IMG_CHAIN       base-frame image chain  (default the bible chain)
#
# Prints ONE machine-readable JSON line to stdout (the FINAL stdout line):
#   {"engine":"veo3.1-extend-chain","base_frame":"...","base_clip":"...",
#    "hops_planned":N,"hops_done":H,"episode":"...","base_dur_s":B,"final_dur_s":F,
#    "audio":"native","concat":"none","verdict":"PASS|FLAG"}
# Diagnostics go to stderr. Non-zero exit = the base render itself failed (no episode).
# A hop that fails is NOT fatal: the last good extended video is kept as episode.mp4 and
# the shortfall is reported (never fabricated).

set -euo pipefail

err() { printf 'gen-extend-chain: %s\n' "$*" >&2; }

for dep in ai-gen python3 ffprobe; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

if [[ $# -ne 2 ]]; then
  err "usage: gen-extend-chain.sh <continuous-plan.md> <project-dir>"
  exit 2
fi

PLAN=$1
PROJECT_DIR=${2%/}

# --- validate inputs (headless: a bad input is a clean failure, never a guess) -------
[[ -s "$PLAN" ]] || { err "continuous-plan missing or empty: $PLAN"; exit 2; }

TIER=${TIER:-economy}
case "$TIER" in
  economy) DEFAULT_VEO_CAP=700 ;;
  quality) DEFAULT_VEO_CAP=700 ;;
  *) err "TIER must be economy|quality (got '$TIER')"; exit 2 ;;
esac
BASE_DURATION=${BASE_DURATION:-8s}
HOP_DURATION=${HOP_DURATION:-7}
RESOLUTION=${RESOLUTION:-720p}
NBP_MAX_COST=${NBP_MAX_COST:-80}
VEO_MAX_COST=${VEO_MAX_COST:-$DEFAULT_VEO_CAP}
VEO_I2V_MODEL=${VEO_I2V_MODEL:-fal-ai/veo3.1/image-to-video}
VEO_EXT_MODEL=${VEO_EXT_MODEL:-fal-ai/veo3.1/extend-video}
IMG_CHAIN=${IMG_CHAIN:-"fal-ai/nano-banana-pro openai/gpt-image-2 fal-ai/nano-banana-2"}

# --- aspect ratio: env override, else read the plan footer, else 16:9 ----------------
# Veo i2v + extend support ONLY 16:9 and 9:16 (auto is also valid but we pin a frame).
if [[ -z "${ASPECT:-}" ]]; then
  ASPECT=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
m = re.search(r"(?:Total|Aspect|aspect[- ]ratio)\D*?(\d+:\d+)", text)
print(m.group(1) if m else "16:9")
' "$PLAN")
fi
case "$ASPECT" in 16:9|9:16) : ;; *) err "ASPECT must be 16:9|9:16 for Veo (got '$ASPECT') — defaulting to 16:9"; ASPECT="16:9" ;; esac

# --- pull the look header, the frozen character tokens, the base scene, the hops -----
# HEADER  = the first non-blank, non-heading line (the global look line).
HEADER=$(python3 -c '
import sys
for line in open(sys.argv[1]):
    s = line.strip()
    if not s or s.startswith("#"):
        continue
    print(s); break
' "$PLAN")

# CHARACTER_TOKENS = the frozen identity tokens, extracted from the first @Image1 /
# Character / Identity line. We support two plan shapes (and degrade safely on others):
#   shape A  "Character (frozen tokens): <TOKENS> — maintain …"
#   shape B  "@Image1 … the hero reference for <TOKENS> — maintain …"
# Strategy: (1) strip the trailing "— maintain …" identity clause FIRST (so a stray "for"
# inside it can't be mistaken for the "for <TOKENS>" reference clause), then (2) try, in
# priority order, the "for <TOKENS>" clause and the after-last-colon text; (3) take the
# first SUBSTANTIAL candidate (>= 12 chars) so a bare label like "frozen tokens" loses.
CHARACTER_TOKENS=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
line = ""
for ln in text.splitlines():
    if re.search(r"@Image1|[Cc]haracter|[Ii]dentity", ln):
        line = ln.strip(); break

# (1) strip the maintain clause from the WHOLE line up front.
core = re.split(r"\s*(?:—|--|-)?\s*\bmaintain\b", line, maxsplit=1, flags=re.IGNORECASE)[0].strip().rstrip(".,;")

cands = []
# (2A) the "… reference for <TOKENS>" clause (shape B). Now safe — the maintain "for" is gone.
m = re.search(r"\breference for\s+(.+)", core, flags=re.IGNORECASE) or re.search(r"\bfor\s+(.+)", core)
if m: cands.append(m.group(1).strip().rstrip(".,;"))
# (2B) the text after the LAST colon (shape A — skips the "Character (label):" label colon).
if ":" in core:
    cands.append(core.rsplit(":", 1)[1].strip().rstrip(".,;"))
# (2C) a parenthetical long enough to be a real description, not a label.
m = re.search(r"\(([^)]{12,})\)", core)
if m: cands.append(m.group(1).strip())
# (2D) the core line as a last resort.
cands.append(core)
cands = [c for c in cands if c]
chosen = next((c for c in cands if len(c) >= 12), (cands[0] if cands else "the character"))
print(chosen)
' "$PLAN")
[[ -n "$CHARACTER_TOKENS" ]] || CHARACTER_TOKENS="the character"

# BASE_IMAGE_PROMPT = the Base scene's OPENING-IMAGE prompt. Prefer an explicit
# "Base image:" / "Opening image:" line; else the "Base:" scene line; else the header.
BASE_IMAGE_PROMPT=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
for pat in (r"(?:Base image|Opening image|Start frame)\s*:\s*(.+)",
            r"(?:Base scene|Base)\s*:\s*(.+)"):
    m = re.search(pat, text, re.IGNORECASE)
    if m:
        print(m.group(1).strip()); raise SystemExit
print("")
' "$PLAN")

# BASE_MOTION_PROMPT = the Base scene's MOTION prompt for the i2v call. Prefer an
# explicit "Base motion:" line; else fall back to the base image prompt; else header.
BASE_MOTION_PROMPT=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
m = re.search(r"(?:Base motion|Base shot|Base)\s*:\s*(.+)", text, re.IGNORECASE)
print(m.group(1).strip() if m else "")
' "$PLAN")
[[ -n "$BASE_MOTION_PROMPT" ]] || BASE_MOTION_PROMPT="$BASE_IMAGE_PROMPT"
[[ -n "$BASE_MOTION_PROMPT" ]] || BASE_MOTION_PROMPT="$HEADER"
[[ -n "$BASE_IMAGE_PROMPT"  ]] || BASE_IMAGE_PROMPT="$BASE_MOTION_PROMPT"

# HOPS = each extension prompt, one per line, IN ORDER. We accept several plan shapes:
#   "Hop 1: <prompt>" / "Extend 1: <prompt>" / "Extension 1: <prompt>"
#   or numbered "[8-15s]: <prompt>" style time-coded continuation beats (skip [0-...]
#   which is the base). The base beat is NOT a hop.
mapfile -t HOPS < <(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
hops = []
for line in text.splitlines():
    s = line.strip()
    m = re.match(r"(?:Hop|Extend|Extension)\s*\d+\s*:\s*(.+)", s, re.IGNORECASE)
    if m:
        hops.append(m.group(1).strip()); continue
for line in text.splitlines():
    s = line.strip()
    m = re.match(r"\[\s*(\d+)\s*s?\s*-\s*\d+\s*s\s*\]\s*:\s*(.+)", s)
    if m and int(m.group(1)) > 0 and not hops:
        # only use time-coded beats if no explicit Hop: lines were found; the [0-...]
        # beat is the base and is excluded by the int(start)>0 guard.
        hops.append(m.group(2).strip())
for h in hops:
    print(h)
' "$PLAN")

err "plan parsed: aspect=$ASPECT tier=$TIER hops_planned=${#HOPS[@]}"
err "character tokens: ${CHARACTER_TOKENS:0:80}"
err "base image prompt: ${BASE_IMAGE_PROMPT:0:80}"

WORK="$PROJECT_DIR/work"
mkdir -p "$WORK"

# --- JSON helpers (ai-gen v2.1.0; files[] entries are OBJECTS) ------------------------
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
# Hosted URL: prefer files[0].url, else hosted_urls[0], else walk for the first
# *.fal.media URL. The extend chain DEPENDS on this url — the next hop's video_url.
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
files = doc.get("files") if isinstance(doc, dict) else None
if isinstance(files, list) and files and isinstance(files[0], dict):
    u = files[0].get("url") or ""
    if u: print(u); sys.exit(0)
hu = doc.get("hosted_urls") if isinstance(doc, dict) else None
if isinstance(hu, list) and hu and isinstance(hu[0], str):
    print(hu[0]); sys.exit(0)
for url in walk(doc):
    print(url); break
' "$1"
}
probe_dur() {
  ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$1" 2>/dev/null || echo 0
}

# --- (1) generate ONE base start frame via the image chain (NO --resolution) ---------
# Prints "<path>\t<url>" on stdout, or nothing on total failure.
gen_base_frame() {
  local prompt=$1 out=$2 model raw url rc result
  for model in $IMG_CHAIN; do
    result="$WORK/base-frame.json"; : >"$result"; rc=0
    # nano-banana-pro REJECTS --resolution (skips the primary model) — never pass it.
    ai-gen image "$prompt" -m "$model" \
      --aspect-ratio "$ASPECT" --max-cost "$NBP_MAX_COST" \
      -o "$WORK" --format json >"$result" 2>"$WORK/base-frame.log" || rc=$?
    if [[ $rc -ne 0 ]] || ! json_success "$result"; then
      err "  base frame model $model failed (exit=$rc) — next in chain"
      continue
    fi
    raw=$(json_first_file "$result")
    if [[ -z "$raw" || ! -s "$raw" ]]; then
      err "  base frame model $model: success but no file on disk — next in chain"
      continue
    fi
    url=$(json_first_url "$result")
    # normalize extension to .png via ffmpeg if a model emitted .webp
    if [[ "${raw##*.}" != "png" ]] && command -v ffmpeg >/dev/null 2>&1; then
      if ffmpeg -y -loglevel error -i "$raw" "$out" 2>/dev/null; then rm -f "$raw"; else
        err "  base frame ext-convert failed for $raw — next in chain"; continue; fi
    else
      mv -f "$raw" "$out"
    fi
    printf '%s\t%s\n' "$out" "$url"; return 0
  done
  return 1
}

BASE_FRAME="$WORK/base-frame.png"
# Compose the base-frame prompt: the look header + the opening scene + the frozen tokens.
BASE_FRAME_PROMPT="${HEADER} A single cinematic opening frame: ${BASE_IMAGE_PROMPT} The subject is ${CHARACTER_TOKENS}, large in frame, clearly lit. No text, no watermark, no logo."
err "generating the ONE base start frame (nano-banana-pro chain)…"
if ! BF_OUT=$(gen_base_frame "$BASE_FRAME_PROMPT" "$BASE_FRAME"); then
  err "base start frame could not be generated (whole image chain failed) — no episode (clean recorded failure)"
  printf '{"engine":"veo3.1-extend-chain","stage":"base_frame","verdict":"FAIL","reason":"base_frame_failed"}\n'
  exit 1
fi
BASE_FRAME=${BF_OUT%%$'\t'*}
err "base frame: $BASE_FRAME"

# --- (2) Veo base i2v on the base frame (native audio, default-on) -------------------
err "Veo base i2v ($VEO_I2V_MODEL, ${BASE_DURATION}, ${RESOLUTION}, ${ASPECT})…"
BASE_CLIP="$WORK/base.mp4"
RESULT="$WORK/base-i2v.json"; LOG="$WORK/base-i2v.log"; rc=0
ai-gen video "$BASE_MOTION_PROMPT" --image "$BASE_FRAME" -m "$VEO_I2V_MODEL" \
  --duration "$BASE_DURATION" --resolution "$RESOLUTION" --aspect-ratio "$ASPECT" \
  --max-cost "$VEO_MAX_COST" -o "$WORK" --format json \
  >"$RESULT" 2>"$LOG" || rc=$?

if [[ $rc -ne 0 ]] || ! json_success "$RESULT"; then
  err "Veo base i2v failed (exit=$rc): $(tr '\n' ' ' <"$LOG" | head -c 240)"
  printf '{"engine":"veo3.1-extend-chain","stage":"base_i2v","verdict":"FAIL","reason":"base_i2v_failed"}\n'
  exit 1
fi
BASE_SRC=$(json_first_file "$RESULT")
PREV_URL=$(json_first_url "$RESULT")
if [[ -z "$BASE_SRC" || ! -s "$BASE_SRC" ]]; then
  err "Veo base i2v: success but no clip on disk — no episode"
  printf '{"engine":"veo3.1-extend-chain","stage":"base_i2v","verdict":"FAIL","reason":"base_clip_missing"}\n'
  exit 1
fi
cp -f "$BASE_SRC" "$BASE_CLIP"
[[ "$BASE_SRC" != "$BASE_CLIP" ]] && rm -f "$BASE_SRC"
BASE_DUR=$(probe_dur "$BASE_CLIP")
err "base clip: $BASE_CLIP (${BASE_DUR}s) | hosted url: ${PREV_URL:-<none>}"

# The last good FULL video so far (the base IS the full video before any hop).
LAST_GOOD="$BASE_CLIP"
LAST_DUR="$BASE_DUR"
HOPS_DONE=0
SHORTFALL=""

# A hop REQUIRES the previous hosted url. If the base i2v returned no url, we cannot
# extend (extend-video takes a video_url, not a local file) — keep the base as the
# episode and record the shortfall honestly.
if [[ -z "$PREV_URL" && ${#HOPS[@]} -ge 1 ]]; then
  SHORTFALL="base i2v returned no hosted url; cannot run extend-video (it requires video_url) — delivered the 8s base as the continuous shot"
  err "WARNING: $SHORTFALL"
fi

# --- (3) extend hops — each returns the FULL grown video; NO concat ------------------
i=0
for HOP in "${HOPS[@]}"; do
  i=$(( i + 1 ))
  IDX=$(printf '%02d' "$i")
  [[ -n "$PREV_URL" ]] || { err "hop $IDX: no previous hosted url — stopping the chain (last good kept)"; SHORTFALL=${SHORTFALL:-"hop $IDX had no upstream hosted url; stopped early"}; break; }

  # The hop prompt = the continuation beat + a continuity anchor (>=80% subject repeat,
  # one continuous take, no cut). Veo extend keeps the same scene/camera by default;
  # we restate the character so identity does not drift across the seam.
  HOP_PROMPT="Continue the SAME single continuous take, no cut, same character (${CHARACTER_TOKENS}) and same setting. ${HOP} Smooth continuous motion, consistent lighting and identity, one unbroken shot."

  err "hop $IDX (extend +${HOP_DURATION}s): ${HOP:0:70}…"
  RESULT="$WORK/hop-${IDX}.json"; LOG="$WORK/hop-${IDX}.log"; rc=0
  ai-gen run "$VEO_EXT_MODEL" \
    video_url="$PREV_URL" prompt="$HOP_PROMPT" \
    --duration "${HOP_DURATION}s" --max-cost "$VEO_MAX_COST" --format json \
    >"$RESULT" 2>"$LOG" || rc=$?

  # Retry once with a bare-second duration if the model rejected the "7s" form.
  if { [[ $rc -ne 0 ]] || ! json_success "$RESULT"; } \
     && grep -qiE 'duration|unprocessable|invalid|validation' "$LOG" "$RESULT" 2>/dev/null; then
    err "  hop $IDX: extend rejected the duration form — retrying with bare seconds"
    rc=0
    ai-gen run "$VEO_EXT_MODEL" \
      video_url="$PREV_URL" prompt="$HOP_PROMPT" \
      --duration "$HOP_DURATION" --max-cost "$VEO_MAX_COST" --format json \
      >"$RESULT" 2>"$LOG" || rc=$?
  fi

  if [[ $rc -ne 0 ]] || ! json_success "$RESULT"; then
    SHORTFALL="hop $IDX (extend) failed: $(tr '\n' ' ' <"$LOG" | head -c 160); kept the last good video (${LAST_DUR}s) as the continuous shot"
    err "  hop $IDX failed (exit=$rc) — stopping the chain, keeping last good. $SHORTFALL"
    break
  fi
  HOP_SRC=$(json_first_file "$RESULT")
  HOP_URL=$(json_first_url "$RESULT")
  if [[ -z "$HOP_SRC" || ! -s "$HOP_SRC" ]]; then
    SHORTFALL="hop $IDX (extend) reported success but no file on disk; kept the last good video (${LAST_DUR}s)"
    err "  hop $IDX: no extended file on disk — stopping, keeping last good"
    break
  fi

  # extend-video RETURNS THE FULL VIDEO (base + all extensions so far), NOT a segment.
  # So this file REPLACES the running episode — there is NO concat, ever.
  HOP_FULL="$WORK/full-after-hop-${IDX}.mp4"
  cp -f "$HOP_SRC" "$HOP_FULL"
  [[ "$HOP_SRC" != "$HOP_FULL" ]] && rm -f "$HOP_SRC"
  HOP_DUR=$(probe_dur "$HOP_FULL")

  # Sanity: the full video must GROW (extend returns base+extensions). If it didn't
  # grow, treat the hop as not-applied and keep the last good (do not regress).
  if awk "BEGIN { exit !($HOP_DUR > $LAST_DUR + 0.5) }"; then
    LAST_GOOD="$HOP_FULL"
    LAST_DUR="$HOP_DUR"
    PREV_URL=${HOP_URL:-$PREV_URL}
    HOPS_DONE=$(( HOPS_DONE + 1 ))
    err "  hop $IDX OK -> full video now ${HOP_DUR}s (was ${BASE_DUR}s base) | next url: ${HOP_URL:-<reuse prev>}"
    if [[ -z "$HOP_URL" && $i -lt ${#HOPS[@]} ]]; then
      SHORTFALL="hop $IDX returned no hosted url; cannot chain further — delivered the ${HOP_DUR}s video"
      err "  hop $IDX: no hosted url for the next hop — stopping the chain, keeping this as the episode"
      break
    fi
  else
    SHORTFALL="hop $IDX did not grow the video (got ${HOP_DUR}s vs ${LAST_DUR}s) — kept the last good video"
    err "  hop $IDX: extended video did not grow — keeping last good (${LAST_DUR}s), stopping"
    break
  fi
done

# --- (4) ffprobe-verify the ONE final file, then mv to episode.mp4 -------------------
EPISODE="$PROJECT_DIR/episode.mp4"
cp -f "$LAST_GOOD" "$EPISODE"
FINAL_DUR=$(probe_dur "$EPISODE")
HAS_VIDEO=$(ffprobe -v error -select_streams v -show_entries stream=codec_type -of csv=p=0 "$EPISODE" | head -n1 || true)
HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$EPISODE" | head -n1 || true)

VID_OK=false; AUD_OK=false; GREW_OK=false
[[ -n "$HAS_VIDEO" ]] && VID_OK=true
[[ -n "$HAS_AUDIO" ]] && AUD_OK=true
# "grew" = final >= base (if any hop landed it is strictly greater; if all hops failed
# we still delivered the base, which is a FLAG, not a PASS).
if [[ "$HOPS_DONE" -ge 1 ]]; then
  awk "BEGIN { exit !($FINAL_DUR > $BASE_DUR + 0.5) }" && GREW_OK=true
fi

VERDICT=PASS
{ [[ "$VID_OK" == true && "$AUD_OK" == true && "$GREW_OK" == true && -z "$SHORTFALL" ]]; } || VERDICT=FLAG

err "ffprobe: final=${FINAL_DUR}s (base ${BASE_DUR}s) video=${HAS_VIDEO:-none}(ok=$VID_OK) audio=${HAS_AUDIO:-none}(native, ok=$AUD_OK) hops=${HOPS_DONE}/${#HOPS[@]} verdict=$VERDICT"
[[ -n "$SHORTFALL" ]] && err "SHORTFALL (recorded, never fabricated): $SHORTFALL"

printf '{"engine":"veo3.1-extend-chain","base_frame":"%s","base_clip":"%s","hops_planned":%s,"hops_done":%s,"episode":"%s","base_dur_s":%.1f,"final_dur_s":%.1f,"audio":"native","concat":"none","verdict":"%s"}\n' \
  "$BASE_FRAME" "$BASE_CLIP" "${#HOPS[@]}" "$HOPS_DONE" "$EPISODE" "${BASE_DUR:-0}" "${FINAL_DUR:-0}" "$VERDICT"

[[ "$VERDICT" == PASS ]] \
  && err "episode verified: ONE continuous ${FINAL_DUR}s shot, native audio, NO concat (${HOPS_DONE} extend hops on an ${BASE_DUR}s base)" \
  || err "episode delivered with FLAG — report the shortfall prominently in summary.md and state.md"
exit 0
