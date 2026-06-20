#!/usr/bin/env bash
#
# multi-channel-lint.sh — the single "will this get rejected/suppressed anywhere?"
# verdict. Reads the Step-1 Amazon-spec verdict + the Step-2 C2PA result + the
# dated rule-pack and emits one PASS/FIX row per requested channel, plus the FTC
# 16 CFR Part 465 fake-review gate (Claude judge when copy is supplied), plus the
# dated EU/CA/NY jurisdiction note. NO model dependency (the FTC judge uses the
# in-sandbox `claude` CLI; degrades to FLAG if absent). Never an upload.
#
# Usage:
#   multi-channel-lint.sh --spec <spec.json> [--c2pa <c2pa.json>]
#       [--channels amazon,etsy,meta,tiktok,shopify] [--jurisdictions us,eu,ca,ny]
#       [--copy-file <copy.txt>] [--ai-person yes|no|unknown] [--out <preflight.json>]
#
# <spec.json>  = the JSON printed by amazon-spec-check.py (bg_pass/fill/res_ok/...).
# <c2pa.json>  = the JSON written by disclosure-stamp.sh (c2pa_ai/signed/...).
#
# Exit 0 always (read overall_verdict in the output: PASS | FIX | BLOCK); exit 2
# on usage / unreadable spec. The verdict is NEVER an instruction to publish.

set -euo pipefail

err() { printf 'multi-channel-lint: %s\n' "$*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RULES="$SKILL_DIR/references/marketplace-rules.md"

SPEC=""; C2PA=""; CHANNELS="amazon"; JURIS="us"; COPY_FILE=""; AI_PERSON="unknown"; OUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --spec)          SPEC="$2"; shift 2 ;;
    --c2pa)          C2PA="$2"; shift 2 ;;
    --channels)      CHANNELS="$2"; shift 2 ;;
    --jurisdictions) JURIS="$2"; shift 2 ;;
    --copy-file)     COPY_FILE="$2"; shift 2 ;;
    --ai-person)     AI_PERSON="$2"; shift 2 ;;
    --out)           OUT="$2"; shift 2 ;;
    -h|--help)       sed -n '2,24p' "$0"; exit 0 ;;
    -*)              err "unknown flag: $1"; exit 2 ;;
    *)               err "unexpected arg: $1"; exit 2 ;;
  esac
done

[[ -n "$SPEC" && -s "$SPEC" ]] || { err "--spec <spec.json> required (run amazon-spec-check.py first)"; exit 2; }
command -v python3 >/dev/null 2>&1 || { err "missing dependency: python3"; exit 2; }
[[ -n "$OUT" ]] || OUT="$(dirname "$SPEC")/preflight.json"

# ---- FTC fake-review / AI-washing judge (Claude) -------------------------
# Default to FLAG when uncertain; NEVER PASS an AI-generated testimonial.
FTC_JSON='{"verdict":"no_copy_supplied","hits":[],"note":"no ad copy / review text supplied — FTC gate ran on image-origin only; this is not a PASS for the copy"}'
if [[ -n "$COPY_FILE" && -s "$COPY_FILE" ]]; then
  JUDGE_PROMPT="$(cat <<'P'
You are an FTC 16 CFR Part 465 + Section 5 compliance reviewer for ecommerce creative.
Given the AD COPY / REVIEW / TESTIMONIAL text below and a note on whether any person
shown is AI-generated, flag (and BLOCK) anything that:
 (1) presents a review/testimonial by a reviewer who does not exist (incl. AI-generated
     reviews), or who did not actually use the product, or misrepresents their experience [§465.2];
 (2) is a synthetic/AI "spokesperson" or "customer" presented as a real person without disclosure;
 (3) makes an unsubstantiated or "AI washing" claim (a capability/benefit you cannot substantiate).
Return ONLY JSON: {"verdict":"BLOCK|FLAG|PASS","hits":[{"text":"...","rule":"465.2|AI-washing|unsubstantiated","why":"..."}]}
Default to FLAG if uncertain. Never PASS an AI-generated testimonial.
P
)"
  COPY_TEXT="$(cat "$COPY_FILE")"
  FULL_PROMPT="${JUDGE_PROMPT}

AI-person-shown: ${AI_PERSON}

AD COPY / REVIEW / TESTIMONIAL:
${COPY_TEXT}"
  if command -v claude >/dev/null 2>&1; then
    RAW="$(printf '%s' "$FULL_PROMPT" | claude -p 2>/dev/null || true)"
    # extract the first {...} JSON object from the model output
    PARSED="$(python3 - <<PY 2>/dev/null || true
import re, sys, json
raw = """$RAW"""
m = re.search(r'\{.*\}', raw, re.S)
if m:
    try:
        json.loads(m.group(0)); print(m.group(0))
    except Exception:
        pass
PY
)"
    if [[ -n "$PARSED" ]]; then
      FTC_JSON="$PARSED"
    else
      FTC_JSON='{"verdict":"FLAG","hits":[{"text":"<copy supplied>","rule":"465.2","why":"FTC judge output unparseable — defaulting to FLAG for human review (never auto-PASS testimonial copy)"}]}'
    fi
  else
    FTC_JSON='{"verdict":"FLAG","hits":[{"text":"<copy supplied>","rule":"465.2","why":"claude CLI unavailable — cannot run the FTC judge; defaulting to FLAG for human review"}]}'
  fi
fi

# ---- assemble the per-channel verdict -------------------------------------
python3 - "$SPEC" "${C2PA:-}" "$CHANNELS" "$JURIS" "$FTC_JSON" "$AI_PERSON" "$OUT" <<'PY'
import json, sys, datetime

spec_path, c2pa_path, channels_s, juris_s, ftc_s, ai_person, out_path = sys.argv[1:8]
spec = json.load(open(spec_path))
c2pa = {}
if c2pa_path:
    try: c2pa = json.load(open(c2pa_path))
    except Exception: c2pa = {}
try: ftc = json.loads(ftc_s)
except Exception: ftc = {"verdict": "FLAG", "hits": [], "note": "FTC JSON unparseable -> FLAG"}

channels = [c.strip().lower() for c in channels_s.split(",") if c.strip()]
juris    = [j.strip().lower() for j in juris_s.split(",") if j.strip()]

bg   = spec.get("bg_pass")
fill = spec.get("fill_pass")
res  = spec.get("res_ok")
txt  = spec.get("text_flag")
spec_ok = bool(bg and fill and res and not txt)
c2pa_ai = c2pa.get("c2pa_ai", "unknown")

def amazon():
    reasons = []
    if not bg:  reasons.append("background not EXACT RGB(255,255,255) — silent suppression risk")
    if not fill:reasons.append("product fills <85%% of frame")
    if not res: reasons.append("longest side <%spx" % spec.get("min_long", 1600))
    if txt:     reasons.append("possible text/logo/watermark in margin (heuristic) — human review")
    return {
        "verdict": "PASS" if spec_ok else "FIX",
        "reasons": reasons,
        "disclosure": "Advisory gen-AI 'substantially modified' note (G1881 login-gated — NOT machine-confirmed)",
        "confirmed": False,   # Amazon Style Guide G1881 is login-gated
    }

def meta():
    r = []
    if c2pa_ai not in ("no", "no (declared via context.md)") and not c2pa.get("signed"):
        r.append("AI-touched but no C2PA manifest signed — Meta scans for C2PA; add the 'AI Info' label")
    return {"verdict": "FIX" if r else "PASS", "reasons": r,
            "disclosure": "Toggle 'AI Info'/AI-generated label; undisclosed AI UGC = Deceptive Practice (rejection + account-health strike)",
            "confirmed": False}

def tiktok():
    return {"verdict": "PASS", "reasons": [],
            "disclosure": "Turn ON the AIGC label + commercial-content toggle for AI-generated/significantly-edited content",
            "confirmed": False}

def etsy():
    return {"verdict": "FLAG", "reasons": ["interpretive rule: image must 'accurately represent the item'; no AI mockups of un-photographable products"],
            "disclosure": "(no standard label)", "confirmed": False}

def shopify():
    return {"verdict": "PASS", "reasons": ["no platform-mandated AI label — follow destination marketplace + jurisdiction law"],
            "confirmed": False}

CH = {"amazon": amazon, "meta": meta, "tiktok": tiktok, "etsy": etsy, "shopify": shopify}
per_channel = {}
for c in channels:
    per_channel[c] = CH[c]() if c in CH else {"verdict": "FLAG", "reasons": ["no rule for channel '%s'" % c], "confirmed": False}

JNOTES = {
    "us": "FTC 16 CFR Part 465 (eff. 2024-10-21): no fake/AI reviews or synthetic spokespeople presented as real customers; up to $53,088/violation.",
    "eu": "EU AI Act Art.50 (operative 2026-08-02): synthetic media must be machine-readable-marked (C2PA satisfies it) + deep fakes clearly disclosed.",
    "ca": "California SB 942 (as amended by AB 853, operative 2026-08-02): manifest + latent disclosure (provider/system/version/time/id).",
    "ny": "New York SB-8420A (effective 2026-06-09): AI 'synthetic performers' in ads must be conspicuously disclosed; $1,000/$5,000.",
}
jurisdiction_note = []
for j in juris:
    today = datetime.date(2026, 6, 19)
    note = JNOTES.get(j, "no dated rule for jurisdiction '%s'" % j)
    operative = None
    if j in ("eu", "ca"): operative = "2026-08-02"
    entry = {"jurisdiction": j, "note": note, "confirmed": False}
    if operative:
        entry["operative_date"] = operative
        entry["operative_now"] = (today >= datetime.date(2026, 8, 2))
    jurisdiction_note.append(entry)

ftc_verdict = ftc.get("verdict", "FLAG")
any_block   = ftc_verdict == "BLOCK"
any_fix     = any(v.get("verdict") in ("FIX", "FLAG") for v in per_channel.values())

if any_block:
    overall = "BLOCK"
elif any_fix or ftc_verdict in ("FLAG",):
    overall = "FIX"
else:
    overall = "PASS"

result = {
    "_schema": "bot-022-compliance-guard/preflight/1",
    "generated": "2026-06-19",
    "image": spec.get("image"),
    "spec": {k: spec.get(k) for k in
             ("bg_pass", "samples", "fill", "fill_pass", "res_ok", "longest_side", "text_flag", "overall_pass")},
    "c2pa": {"c2pa_ai": c2pa_ai, "signed": c2pa.get("signed"), "cert": c2pa.get("cert")},
    "per_channel": per_channel,
    "ftc": ftc,
    "jurisdiction_note": jurisdiction_note,
    "overall_verdict": overall,
    "never_auto_publish": True,
    "caveats": [
        "Amazon gen-AI threshold is advisory (G1881 login-gated, NOT machine-confirmed).",
        "C2PA is strippable — absence is not proof of human origin.",
        "EU/CA hinge on 2026-08-02; NY live 2026-06-09 — re-validate the rule-pack at build.",
        "This verdict is NEVER an instruction to publish; a human ships.",
    ],
}
json.dump(result, open(out_path, "w"), indent=2)
print("overall_verdict: %s -> %s" % (overall, out_path))
PY

err "wrote $OUT"
exit 0
