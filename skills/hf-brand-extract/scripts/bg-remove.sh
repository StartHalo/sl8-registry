#!/usr/bin/env bash
# bg-remove.sh — remove the background from a brand logo via ai-gen bria, then place the matte at <out>.
#
#   bash bg-remove.sh <logo-image> <out-png>
#   e.g. bash bg-remove.sh artifacts/acme/assets/captures/logo.png artifacts/acme/assets/cutouts/logo.png
#
# Runs:  ai-gen run fal-ai/bria/background/remove --image <logo-image>
# ai-gen v2 JSON: { "success": bool, "files": [{ "local_path": "..." }], "hosted_urls": [...] }
# (`ai-gen run` takes a POSITIONAL model id; the matte lands at ~/artifacts/remove-<ts>.png — we read
# files[0].local_path from the JSON, NOT a guessed path). Keyless via SL8_SESSION_TOKEN, ~1 credit.
#
# On success:false, an unreachable proxy, or a missing input, EXIT NON-ZERO so the skill omits the
# logo line (the brand block still has accent/fontPack/label). NEVER prompts. NO HeyGen.
set -uo pipefail

SRC="${1:?usage: bg-remove.sh <logo-image> <out-png>}"
OUT="${2:?usage: bg-remove.sh <logo-image> <out-png>}"
mkdir -p "$(dirname "$OUT")"

if [ ! -s "$SRC" ]; then
  echo "!! logo image not found / empty: $SRC — skipping cutout (brand block keeps accent+fontPack+label)." >&2
  exit 2
fi
if ! command -v ai-gen >/dev/null 2>&1; then
  echo "!! ai-gen CLI not on PATH — cannot remove background; skipping cutout." >&2
  exit 3
fi

echo ">> ai-gen run fal-ai/bria/background/remove --image $SRC"
RESP="$(ai-gen run fal-ai/bria/background/remove --image "$SRC" 2>/tmp/bria.err)"
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "---- ai-gen stderr (tail) ----" >&2; tail -n 15 /tmp/bria.err >&2 || true
  echo "!! ai-gen exited $RC (proxy unreachable / model error) — skipping cutout." >&2
  exit 4
fi

# Parse the v2 JSON: require success==true and a files[0].local_path.
LOCAL="$(printf '%s' "$RESP" | node -e '
  let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
    try {
      const j=JSON.parse(s);
      if (j.success===false) { process.exit(11); }
      const p=(j.files && j.files[0] && j.files[0].local_path) || "";
      if (!p) process.exit(12);
      process.stdout.write(p);
    } catch(e){ process.exit(13); }
  });' 2>/dev/null)"
PRC=$?

if [ "$PRC" -ne 0 ] || [ -z "${LOCAL:-}" ]; then
  echo "---- ai-gen response (raw) ----" >&2; printf '%s\n' "$RESP" | head -c 800 >&2; echo >&2
  echo "!! bria returned success:false or no files[].local_path (code $PRC) — skipping cutout." >&2
  exit 5
fi

if [ ! -s "$LOCAL" ]; then
  echo "!! reported matte does not exist: $LOCAL — skipping cutout." >&2
  exit 6
fi

cp -f "$LOCAL" "$OUT"
echo ">> logo cutout: $OUT  (from $LOCAL)"
exit 0
