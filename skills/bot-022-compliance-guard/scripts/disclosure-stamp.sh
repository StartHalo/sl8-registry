#!/usr/bin/env bash
#
# disclosure-stamp.sh — read C2PA provenance, SIGN a Content Credentials manifest
# onto the image, and WRITE the correct per-channel AI-disclosure text + a dated
# EU/CA/NY jurisdiction note. NO model dependency (c2patool + Pillow + bundled
# rule-pack). Never uploads anywhere.
#
# Usage:
#   disclosure-stamp.sh <image> [--channels a,b,c] [--jurisdictions us,eu,ca,ny]
#       [--out-dir <dir>] [--ai-origin auto|yes|no] [--manifest <manifest.json>]
#       [--watermark "<text>"]
#
# Defaults: --channels amazon  --jurisdictions us  --out-dir <dir of image>
#           --ai-origin auto    (read the C2PA digitalSourceType marker)
#
# Writes, into <out-dir>:
#   <name>-cc.jpg   the image with a signed Content Credentials manifest
#   c2pa.json       { c2patool_present, c2pa_ai, signed, cert, manifest_path }
#   disclosure.md   ready-to-paste per-channel strings + dated jurisdiction note
#
# c2patool presence: smoke-tested first. If absent it tries to VENDOR the prebuilt
# binary into work/bin/ (network-guarded); if that fails it still writes the
# disclosure text and records c2pa_signed:false (the disclosure half ships).
#
# IGNORE ai-gen entirely here — this skill has no model hop. (The optional Bria
# background-repair path lives in the white-bg-enforce skill, not here.)

set -euo pipefail

err()  { printf 'disclosure-stamp: %s\n' "$*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES="$SKILL_DIR/references/disclosure-templates.md"

# ---- args ----------------------------------------------------------------
IMAGE=""
CHANNELS="amazon"
JURIS="us"
OUT_DIR=""
AI_ORIGIN="auto"
MANIFEST=""
WATERMARK=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channels)       CHANNELS="$2"; shift 2 ;;
    --jurisdictions)  JURIS="$2"; shift 2 ;;
    --out-dir)        OUT_DIR="$2"; shift 2 ;;
    --ai-origin)      AI_ORIGIN="$2"; shift 2 ;;
    --manifest)       MANIFEST="$2"; shift 2 ;;
    --watermark)      WATERMARK="$2"; shift 2 ;;
    -h|--help)        sed -n '2,30p' "$0"; exit 0 ;;
    -*)               err "unknown flag: $1"; exit 2 ;;
    *)                IMAGE="$1"; shift ;;
  esac
done

[[ -n "$IMAGE" && -s "$IMAGE" ]] || { err "image missing or empty: ${IMAGE:-<none>}"; exit 2; }
command -v python3 >/dev/null 2>&1 || { err "missing dependency: python3"; exit 2; }

[[ -n "$OUT_DIR" ]] || OUT_DIR="$(dirname "$IMAGE")"
mkdir -p "$OUT_DIR"
NAME="$(basename "${IMAGE%.*}")"
CC_OUT="$OUT_DIR/${NAME}-cc.jpg"
C2PA_JSON="$OUT_DIR/c2pa.json"
DISCLOSURE="$OUT_DIR/disclosure.md"
AI_MARKER="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"

# ---- locate / vendor c2patool -------------------------------------------
C2PATOOL=""
if command -v c2patool >/dev/null 2>&1; then
  C2PATOOL="c2patool"
elif [[ -x "$SKILL_DIR/../../work/bin/c2patool" ]]; then
  C2PATOOL="$SKILL_DIR/../../work/bin/c2patool"
else
  err "c2patool not on PATH — attempting to vendor the prebuilt binary into work/bin/"
  VENDOR_DIR="$SKILL_DIR/../../work/bin"; mkdir -p "$VENDOR_DIR" 2>/dev/null || true
  # Best-effort vendor: prebuilt release from the official contentauth repo.
  # Network-guarded — if curl/unzip/network are unavailable we continue without it.
  ARCH="$(uname -m)"; OS="$(uname -s)"
  ASSET=""
  case "$OS/$ARCH" in
    Linux/x86_64)  ASSET="c2patool-x86_64-unknown-linux-gnu.tar.gz" ;;
    Linux/aarch64) ASSET="c2patool-aarch64-unknown-linux-gnu.tar.gz" ;;
    Darwin/arm64)  ASSET="c2patool-aarch64-apple-darwin.tar.gz" ;;
    Darwin/x86_64) ASSET="c2patool-x86_64-apple-darwin.tar.gz" ;;
  esac
  if [[ -n "$ASSET" ]] && command -v curl >/dev/null 2>&1; then
    URL="https://github.com/contentauth/c2patool/releases/latest/download/$ASSET"
    if curl -fsSL "$URL" -o "$VENDOR_DIR/c2patool.tar.gz" 2>/dev/null \
       && tar -xzf "$VENDOR_DIR/c2patool.tar.gz" -C "$VENDOR_DIR" 2>/dev/null; then
      FOUND="$(find "$VENDOR_DIR" -name c2patool -type f 2>/dev/null | head -1 || true)"
      if [[ -n "$FOUND" ]]; then chmod +x "$FOUND"; C2PATOOL="$FOUND"; err "vendored c2patool -> $FOUND"; fi
    fi
  fi
fi

C2PA_PRESENT=false; C2PA_AI="unknown"; SIGNED=false; CERT="none"
if [[ -n "$C2PATOOL" ]]; then
  C2PA_PRESENT=true
  err "c2patool: $("$C2PATOOL" --version 2>/dev/null | head -1)"

  # READ provenance — look for the AI-origin digitalSourceType marker.
  READ_OUT="$($C2PATOOL "$IMAGE" -d 2>/dev/null || true)"
  if [[ -n "$READ_OUT" ]] && grep -qF "$AI_MARKER" <<<"$READ_OUT"; then
    DETECTED_AI="yes"
  elif [[ -n "$READ_OUT" ]]; then
    DETECTED_AI="manifest-present-no-ai-marker"
  else
    DETECTED_AI="no-manifest"
  fi

  case "$AI_ORIGIN" in
    yes) C2PA_AI="yes (declared via context.md)";;
    no)  C2PA_AI="no (declared via context.md)";;
    *)   C2PA_AI="$DETECTED_AI";;
  esac

  # SIGN a Content Credentials manifest onto the output.
  if [[ -z "$MANIFEST" ]]; then
    MANIFEST="$OUT_DIR/.cc-manifest.json"
    cat >"$MANIFEST" <<JSON
{
  "claim_generator": "sl8-bot-022-compliance-guard/1.0.0",
  "title": "${NAME}",
  "assertions": [
    {
      "label": "c2pa.actions",
      "data": {
        "actions": [
          { "action": "c2pa.created", "digitalSourceType": "${AI_MARKER}" },
          { "action": "c2pa.published" }
        ]
      }
    }
  ]
}
JSON
    CERT="c2patool dev test-cert (NOT a production credential — pass --manifest with private_key/sign_cert for production)"
  else
    CERT="caller-supplied manifest ($MANIFEST)"
  fi

  if "$C2PATOOL" "$IMAGE" -m "$MANIFEST" -f -o "$CC_OUT" >/dev/null 2>&1; then
    SIGNED=true; err "signed Content Credentials -> $CC_OUT"
  else
    err "c2patool sign failed — copying the image unsigned to $CC_OUT"
    cp -f "$IMAGE" "$CC_OUT" 2>/dev/null || true
  fi
else
  err "c2patool unavailable — writing disclosure text + unsigned copy; record c2pa_signed:false (vendor at build)"
  cp -f "$IMAGE" "$CC_OUT" 2>/dev/null || true
  case "$AI_ORIGIN" in
    yes) C2PA_AI="yes (declared; manifest NOT written — c2patool absent)";;
    no)  C2PA_AI="no (declared; manifest NOT written — c2patool absent)";;
    *)   C2PA_AI="unknown (c2patool absent — cannot read provenance)";;
  esac
fi

# Optional Pillow visible watermark (advisory caption burned onto a copy).
if [[ -n "$WATERMARK" ]]; then
  python3 - "$CC_OUT" "$WATERMARK" <<'PY' || err "watermark step skipped (Pillow/font unavailable)"
import sys
from PIL import Image, ImageDraw, ImageFont
path, text = sys.argv[1], sys.argv[2]
img = Image.open(path).convert("RGB"); w, h = img.size
d = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype("DejaVuSans.ttf", max(14, w // 40))
except Exception:
    font = ImageFont.load_default()
d.text((w * 0.02, h * 0.94), text, fill=(120, 120, 120), font=font)
img.save(path, "JPEG", quality=95)
PY
fi

# ---- c2pa.json -----------------------------------------------------------
python3 - "$C2PA_JSON" "$C2PA_PRESENT" "$C2PA_AI" "$SIGNED" "$CERT" "$CC_OUT" <<'PY'
import json, sys
path, present, ai, signed, cert, cc = sys.argv[1:7]
json.dump({
    "c2patool_present": present == "true",
    "c2pa_ai": ai,
    "signed": signed == "true",
    "cert": cert,
    "stamped_image": cc,
    "ai_marker_iri": "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
    "caveat": "C2PA is strippable and not universal — absence of a manifest is NOT proof of human origin; this marks positive AI signals and adds a manifest only.",
}, open(path, "w"), indent=2)
PY

# ---- disclosure.md (per-channel + dated jurisdiction note) ---------------
{
  echo "# AI-Disclosure — ${NAME}"
  echo
  echo "_Generated by bot-022-compliance-guard. Ready-to-paste per-channel strings."
  echo "A HUMAN pastes these; the bot never posts. Advisory caveats are inline._"
  echo
  echo "- C2PA AI-origin: \`${C2PA_AI}\`  ·  signed: \`${SIGNED}\` (${CERT})"
  echo "- stamped image: \`$(basename "$CC_OUT")\`"
  echo
  echo "## Per-channel disclosure"
  IFS=',' read -ra CH <<<"$CHANNELS"
  for c in "${CH[@]}"; do
    c="$(echo "$c" | tr 'A-Z ' 'a-z' | tr -d '[:space:]')"
    case "$c" in
      amazon)
        echo "### Amazon"
        echo '> This image was created or substantially modified using AI; it accurately represents the physical product shipped to the customer.'
        echo
        echo "_ADVISORY: the gen-AI \"substantially modified\" threshold is VENDOR-SOURCED; the official Style Guide G1881 is login-gated — NOT machine-confirmed. Minimal AI retouching (background removal / color / lighting) may not require disclosure. Re-validate at build._"
        ;;
      meta)
        echo "### Meta (Facebook / Instagram ads)"
        echo '> AI-generated'
        echo
        echo "_Toggle Meta's \"AI Info\" label on the post/ad. Undisclosed AI in UGC-style ads = \"Deceptive Practice\" → ad rejection + account-health strike; Meta scans for C2PA. Use the Partnership Ads designation for UGC-style creative. [AuditSocials 2026]_"
        ;;
      tiktok)
        echo "### TikTok"
        echo '> AI-generated'
        echo
        echo "_Turn ON TikTok's AIGC label + the commercial-content toggle. Applies to content \"completely generated or significantly edited by AI\"; TikTok is moving to auto-apply a detected label. [TikTok newsroom]_"
        ;;
      etsy)
        echo "### Etsy"
        echo '> (no standard label) Listing images must accurately represent the actual item; AI mockups of products you cannot photograph are not allowed.'
        echo
        echo "_INTERPRETIVE rule (\"accurately represent the item\") — not an API contract. [Etsy policy via Rewarx 2026]_"
        ;;
      shopify)
        echo "### Shopify"
        echo '> (no platform-mandated AI label) Follow the destination marketplace + your own jurisdiction law (below).'
        ;;
      *) echo "### ${c} (no template — add to disclosure-templates.md)";;
    esac
    echo
  done
  echo "## Jurisdiction note (dated — re-validate at build)"
  IFS=',' read -ra JU <<<"$JURIS"
  for j in "${JU[@]}"; do
    j="$(echo "$j" | tr 'A-Z ' 'a-z' | tr -d '[:space:]')"
    case "$j" in
      eu) echo "- **EU — AI Act Art.50 (operative 2026-08-02):** synthetic image/audio/video output must be \"marked in a machine-readable format and detectable as artificially generated or manipulated\" — the C2PA stamp above satisfies the machine-readable mark; deep fakes must be disclosed \"in a clear and distinguishable manner\".";;
      ca) echo "- **California — SB 942 (as amended by AB 853, operative 2026-08-02):** a \"manifest disclosure\" (clear/conspicuous \"AI-generated\") + a \"latent disclosure\" (provider, system name+version, time/date, unique id, detectable by the provider's AI-detection tool).";;
      ny) echo "- **New York — SB-8420A (effective 2026-06-09):** ads using AI \"synthetic performers\" (media appearing as a real person) must \"conspicuously disclose\" it. Penalty \$1,000 first / \$5,000 subsequent.";;
      us) echo "- **US federal — FTC 16 CFR Part 465 (eff. 2024-10-21):** no fake/AI-generated reviews or synthetic spokespeople presented as real customers (civil penalty up to \$53,088/violation after the 2026 inflation adjustment). See the FTC gate in the linter.";;
      *)  echo "- **${j}: no dated rule in the pack — add to references/marketplace-rules.md.**";;
    esac
  done
  echo
  echo "_Caveat: C2PA is strippable (CDNs/optimizers drop metadata) and not universal — absence of a manifest is NOT proof of human origin._"
} >"$DISCLOSURE"

err "wrote $CC_OUT, $C2PA_JSON, $DISCLOSURE"
echo "$DISCLOSURE"
exit 0
