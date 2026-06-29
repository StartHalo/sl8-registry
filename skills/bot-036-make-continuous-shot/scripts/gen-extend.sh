#!/usr/bin/env bash
#
# gen-extend.sh — the BOT-LOCAL Veo 3.1 recipe (Layer 3) for BOT-036. Renders a
# validated continuous-plan into ONE continuous shot the EXTEND-CHAIN way, with
# ZERO concat: Veo's extend-video RETURNS THE FULL extended video (base + every
# extension so far), so each hop's output is the whole growing video and the FINAL
# hop's local file IS the finished continuous episode.
#
# This is the per-model clip recipe ONLY. It does NOT generate the base still — that
# is the SHARED video-toolkit gen-image.sh's job (the make skill's generate stage
# calls gen-image.sh first, then hands the resulting base frame to THIS script). One
# model, one recipe per bot: the Veo i2v base + extend chain stays bot-local; the
# nano-banana image driver, the assembler, and the verifier stay in video-toolkit.
#
# The pipeline (one continuous shot, native audio, NO stitching):
#   (1) Veo base i2v on the PROVIDED base frame:
#         ai-gen video "<base motion>" -m fal-ai/veo3.1/image-to-video \
#           --image <base.png> --duration 8s --resolution 720p \
#           --aspect-ratio <AR> --max-cost <cap> --format json
#       Native audio (generate_audio default true). Capture files[0].local_path AND
#       files[0].url (the HOSTED url) — the url is what the first extend hop consumes.
#   (2) For EACH hop, Veo extend on the PREVIOUS HOP'S HOSTED url:
#         ai-gen run fal-ai/veo3.1/extend-video \
#           video_url="<previous hosted url>" prompt="<hop prompt>" \
#           --duration 7s --max-cost <cap> --format json
#       extend-video RETURNS THE FULL extended video (base + all extensions so far),
#       NOT a 7s segment — so there is NEVER a concat. Capture the new
#       files[0].local_path AND files[0].url; the NEXT hop uses THIS url as video_url.
#       Every hop prompt repeats the FROZEN identity tokens >=80% verbatim
#       (consumption: text-repeat) so the subject does not drift across the seam.
#   (3) ffprobe-verify ONE file (duration > base, a video stream, an audio stream),
#       then mv it to <project-dir>/episode.mp4. NO assemble.sh — there is nothing to
#       concat. (The make skill's verify stage re-runs the SHARED verify.sh --mode
#       grew --base <base-dur> on this file as the toolkit-side gate.)
#
# Adapted from BOT-030 scripts/gen-extend-chain.sh — the proven Veo extend recipe —
# with the internal base-frame image chain REMOVED (the shared gen-image.sh now
# produces the base still) and made bash 3.2-safe (no mapfile).
#
# Usage:
#   gen-extend.sh <continuous-plan.md> <base-frame.png> <project-dir>
#     <continuous-plan.md>  the validated continuous plan (parsed for the frozen
#                           character tokens, the look header, the base motion prompt,
#                           the numbered hop prompts, the aspect ratio, the Audio line)
#     <base-frame.png>      the ONE opening still already produced by the SHARED
#                           video-toolkit gen-image.sh (the Base scene opening frame
#                           with the plan's frozen tokens). Must exist and be non-empty.
#     <project-dir>         artifacts/<project-name> — work/ + episode.mp4 live here
#
# Env knobs (all optional):
#   ASPECT          16:9 | 9:16   (default: read from the plan footer, else 16:9 — Veo
#                                  i2v/extend only support 16:9 and 9:16)
#   TIER            economy | quality   (default economy — a lower per-call cost cap)
#   BASE_DURATION   base i2v duration: 4s|6s|8s   (default 8s)
#   HOP_DURATION    each extend duration in seconds  (default 7 — the Veo extend default)
#   RESOLUTION      720p | 1080p   (default 720p)
#   VEO_MAX_COST    per Veo call credit cap (default 700)
#   VEO_I2V_MODEL   base i2v slug   (default fal-ai/veo3.1/image-to-video)
#   VEO_EXT_MODEL   extend slug     (default fal-ai/veo3.1/extend-video)
#
# Prints ONE machine-readable JSON line to stdout (the FINAL stdout line):
#   {"engine":"veo3.1-extend-chain","base_frame":"...","base_clip":"...",
#    "hops_planned":N,"hops_done":H,"episode":"...","base_dur_s":B,"final_dur_s":F,
#    "audio":"native","concat":"none","verdict":"PASS|FLAG"}
# Diagnostics go to stderr. Non-zero exit = the base render itself failed (no episode).
# A hop that fails is NOT fatal: the last good extended video is kept as episode.mp4 and
# the shortfall is reported (never fabricated).

set -euo pipefail

err() { printf 'gen-extend: %s\n' "$*" >&2; }

for dep in ai-gen python3 ffprobe; do
  command -v "$dep" >/dev/null 2>&1 \
    || { err "missing dependency: $dep (is this an sl8-video sandbox?)"; exit 2; }
done

if [[ $# -ne 3 ]]; then
  err "usage: gen-extend.sh <continuous-plan.md> <base-frame.png> <project-dir>"
  exit 2
fi

PLAN=$1
BASE_FRAME=$2
PROJECT_DIR=${3%/}

# --- validate inputs (headless: a bad input is a clean failure, never a guess) -------
[[ -s "$PLAN" ]]       || { err "continuous-plan missing or empty: $PLAN"; exit 2; }
[[ -s "$BASE_FRAME" ]] || { err "base frame missing or empty: $BASE_FRAME (the make generate stage must run the SHARED gen-image.sh first)"; exit 2; }

TIER=${TIER:-economy}
case "$TIER" in
  economy) DEFAULT_VEO_CAP=700 ;;
  quality) DEFAULT_VEO_CAP=700 ;;
  *) err "TIER must be economy|quality (got '$TIER')"; exit 2 ;;
esac
BASE_DURATION=${BASE_DURATION:-8s}
HOP_DURATION=${HOP_DURATION:-7}
RESOLUTION=${RESOLUTION:-720p}
VEO_MAX_COST=${VEO_MAX_COST:-$DEFAULT_VEO_CAP}
VEO_I2V_MODEL=${VEO_I2V_MODEL:-fal-ai/veo3.1/image-to-video}
VEO_EXT_MODEL=${VEO_EXT_MODEL:-fal-ai/veo3.1/extend-video}

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

# --- pull the look header, the frozen character tokens, the base motion, the hops ----
# HEADER  = the first non-blank, non-heading line (the global look line).
HEADER=$(python3 -c '
import sys
for line in open(sys.argv[1]):
    s = line.strip()
    if not s or s.startswith("#"):
        continue
    print(s); break
' "$PLAN")

# CHARACTER_TOKENS = the frozen identity tokens. For BOT-036 the plan carries an explicit
# "CHARACTER:" token block (token kit, consumption text-repeat), so we read that first;
# we fall back to the @Image1/Identity-line shapes the donor recipe supported.
CHARACTER_TOKENS=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
# (0) the canonical BOT-036 shape: a "CHARACTER: tokA; tokB; ..." block.
m = re.search(r"^\s*CHARACTER\s*:\s*(.+)$", text, flags=re.IGNORECASE | re.MULTILINE)
if m:
    body = re.sub(r"\([^)]*\)\s*$", "", m.group(1)).strip().rstrip(".,;")
    if len(body) >= 12:
        print(body); raise SystemExit

line = ""
for ln in text.splitlines():
    if re.search(r"@Image1|[Cc]haracter|[Ii]dentity", ln):
        line = ln.strip(); break
# strip a trailing "— maintain …" identity clause first.
core = re.split(r"\s*(?:—|--|-)?\s*\bmaintain\b", line, maxsplit=1, flags=re.IGNORECASE)[0].strip().rstrip(".,;")
cands = []
m = re.search(r"\breference for\s+(.+)", core, flags=re.IGNORECASE) or re.search(r"\bfor\s+(.+)", core)
if m: cands.append(m.group(1).strip().rstrip(".,;"))
if ":" in core:
    cands.append(core.rsplit(":", 1)[1].strip().rstrip(".,;"))
m = re.search(r"\(([^)]{12,})\)", core)
if m: cands.append(m.group(1).strip())
cands.append(core)
cands = [c for c in cands if c]
chosen = next((c for c in cands if len(c) >= 12), (cands[0] if cands else "the character"))
print(chosen)
' "$PLAN")
[[ -n "$CHARACTER_TOKENS" ]] || CHARACTER_TOKENS="the character"

# BASE_MOTION_PROMPT = the Base scene's MOTION prompt for the i2v call. Prefer an
# explicit "Base motion:" line; else the "Base:" scene line; else the header.
BASE_MOTION_PROMPT=$(python3 -c '
import re, sys
text = open(sys.argv[1]).read()
m = re.search(r"(?:Base motion|Base shot|Base)\s*:\s*(.+)", text, re.IGNORECASE)
print(m.group(1).strip() if m else "")
' "$PLAN")
[[ -n "$BASE_MOTION_PROMPT" ]] || BASE_MOTION_PROMPT="$HEADER"

# HOPS = each extension prompt, one per line, IN ORDER. We accept several plan shapes:
#   "Hop 1: <prompt>" / "Extend 1: <prompt>" / "Extension 1: <prompt>"
#   or numbered "[8-15s]: <prompt>" style time-coded continuation beats (skip [0-...]
#   which is the base). The base beat is NOT a hop. (bash 3.2-safe: no mapfile.)
HOPS=()
while IFS= read -r _hopline; do
  [[ -n "$_hopline" ]] && HOPS+=("$_hopline")
done < <(python3 -c '
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
        hops.append(m.group(2).strip())
for h in hops:
    print(h)
' "$PLAN")

err "plan parsed: aspect=$ASPECT tier=$TIER hops_planned=${#HOPS[@]}"
err "character tokens: ${CHARACTER_TOKENS:0:80}"
err "base frame: $BASE_FRAME"

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

# --- (1) Veo base i2v on the PROVIDED base frame (native audio, default-on) -----------
err "Veo base i2v ($VEO_I2V_MODEL, ${BASE_DURATION}, ${RESOLUTION}, ${ASPECT}) on the shared-driver base frame…"
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
  SHORTFALL="base i2v returned no hosted url; cannot run extend-video (it requires video_url) — delivered the ${BASE_DUR}s base as the continuous shot"
  err "WARNING: $SHORTFALL"
fi

# --- (2) extend hops — each returns the FULL grown video; NO concat ------------------
i=0
for HOP in ${HOPS[@]+"${HOPS[@]}"}; do
  i=$(( i + 1 ))
  IDX=$(printf '%02d' "$i")
  [[ -n "$PREV_URL" ]] || { err "hop $IDX: no previous hosted url — stopping the chain (last good kept)"; SHORTFALL=${SHORTFALL:-"hop $IDX had no upstream hosted url; stopped early"}; break; }

  # The hop prompt = the continuation beat + the FROZEN identity tokens repeated >=80%
  # verbatim (consumption: text-repeat) + a one-continuous-take anchor. Veo extend keeps
  # the same scene/camera by default; restating the character holds identity at the seam.
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

# --- (3) ffprobe-verify the ONE final file, then mv to episode.mp4 -------------------
EPISODE="$PROJECT_DIR/episode.mp4"
cp -f "$LAST_GOOD" "$EPISODE"
FINAL_DUR=$(probe_dur "$EPISODE")
HAS_VIDEO=$(ffprobe -v error -select_streams v -show_entries stream=codec_type -of csv=p=0 "$EPISODE" | head -n1 || true)
HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$EPISODE" | head -n1 || true)

VID_OK=false; AUD_OK=false; GREW_OK=false
[[ -n "$HAS_VIDEO" ]] && VID_OK=true
[[ -n "$HAS_AUDIO" ]] && AUD_OK=true
# "grew" = final > base (if any hop landed it is strictly greater; if all hops failed
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
  && err "episode rendered: ONE continuous ${FINAL_DUR}s shot, native audio, NO concat (${HOPS_DONE} extend hops on an ${BASE_DUR}s base)" \
  || err "episode delivered with FLAG — report the shortfall prominently in summary.md and state.md"
exit 0
