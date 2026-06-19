#!/usr/bin/env bash
# capture.sh — capture a brand site's design tokens/fonts/colors/screenshots, then normalize to a
# stable brand-capture.json the brand block is derived from.
#
#   bash capture.sh <brand-url> <captures-dir>
#   e.g. bash capture.sh https://acme.com artifacts/acme/assets/captures
#
# Runs `hyperframes capture <url>` (LOCAL, headless Chrome — no auth, no download beyond Chrome which
# the sl8-animation runtime pins). HyperFrames writes tokens/fonts/screenshots into the cwd's capture
# output; we run it inside <captures-dir> and then NORMALIZE whatever it produced (a design.json /
# tokens.json / screenshots) into <captures-dir>/brand-capture.json with a fixed shape:
#   { source, colors:[hex...], fonts:[family...], screenshots:[path...], label }
#
# Reachability gate: if `hyperframes capture` is missing or the URL is unreachable, we write a
# brand-capture.json carrying an "error" and EXIT NON-ZERO so the skill records a clean failure
# (the brand kit falls back to neutral; no fabricated colors/fonts). NEVER prompts.
set -uo pipefail

URL="${1:?usage: capture.sh <brand-url> <captures-dir>}"
DEST="${2:?usage: capture.sh <brand-url> <captures-dir>}"
HF="npx --yes hyperframes@0.6.112"
OUT="$DEST/brand-capture.json"
mkdir -p "$DEST"

write_error () {
  # $1 = message
  node -e '
    const fs=require("fs");
    fs.writeFileSync(process.argv[1], JSON.stringify({
      source: process.argv[2], error: process.argv[3],
      colors: [], fonts: [], screenshots: [], label: ""
    }, null, 2));
  ' "$OUT" "$URL" "$1" 2>/dev/null || printf '{"source":"%s","error":"%s","colors":[],"fonts":[],"screenshots":[],"label":""}\n' "$URL" "$1" > "$OUT"
  echo "!! capture failed: $1 (wrote $OUT with error; brand kit should fall back to neutral)" >&2
}

# ---- 1. Run hyperframes capture (local) ----
echo ">> hyperframes capture $URL  -> $DEST"
CAP_LOG="$DEST/.capture.log"
( cd "$DEST" && $HF capture "$URL" ) > "$CAP_LOG" 2>&1
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "---- capture log (tail) ----" >&2; tail -n 20 "$CAP_LOG" >&2 || true
  write_error "hyperframes capture exited $RC (unavailable or URL unreachable)"
  exit 2
fi

# ---- 2. Normalize whatever capture produced into brand-capture.json ----
# hyperframes capture output varies by version; harvest colors/fonts from any JSON it wrote
# (design.json / tokens.json / capture.json / *.json) and list the screenshots it saved.
node - "$DEST" "$URL" "$OUT" <<'NODE'
const fs = require("fs"), path = require("path");
const [dir, url, out] = process.argv.slice(2);

const files = (function walk(d, acc=[]) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
})(dir);

const hex = new Set(), fonts = new Set(), screenshots = [];
let label = "";

const HEX = /#[0-9a-fA-F]{6}\b/g;
const isNeutral = (h) => {
  const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  const sat = max===0?0:(max-min)/max;       // crude saturation
  const lum = (0.299*r+0.587*g+0.114*b)/255;
  return sat < 0.18 || lum > 0.93 || lum < 0.06; // grey / near-white / near-black
};

for (const f of files) {
  const lower = f.toLowerCase();
  if (/\.(png|jpe?g|webp)$/.test(lower)) { screenshots.push(path.relative(process.cwd(), f)); continue; }
  if (!/\.(json|css|txt|md|html?)$/.test(lower)) continue;
  let txt = "";
  try { txt = fs.readFileSync(f, "utf8"); } catch { continue; }
  // colors
  (txt.match(HEX) || []).forEach(h => hex.add(h.toLowerCase()));
  // fonts: font-family declarations + a "fonts" array in JSON
  const fam = txt.match(/font-family\s*[:=]\s*["']?([^;"'\n]+)/gi) || [];
  fam.forEach(m => { (m.split(/[:=]/)[1]||"").split(",").forEach(x => { const v=x.replace(/["';]/g,"").trim(); if (v && !/^var\(/.test(v) && v.length<40) fonts.add(v); }); });
  try {
    const j = JSON.parse(txt);
    (j.fonts || j.typography?.families || []).forEach?.(x => typeof x==="string" && fonts.add(x));
    if (!label && typeof j.name === "string") label = j.name;
    if (!label && typeof j.title === "string") label = j.title;
  } catch {}
  // a <title> if present
  if (!label) { const t = txt.match(/<title>\s*([^<|–-]+)/i); if (t) label = t[1].trim(); }
}

// rank colors: brand-defining (saturated) first, neutrals after, dedup, cap 6
const colors = [...hex];
colors.sort((a,b) => (isNeutral(a)?1:0) - (isNeutral(b)?1:0));
const result = {
  source: url,
  colors: colors.slice(0, 6),
  fonts: [...fonts].slice(0, 6),
  screenshots: screenshots.slice(0, 8),
  label: (label || "").slice(0, 24)
};
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.error(`>> normalized: ${result.colors.length} colors, ${result.fonts.length} fonts, ${result.screenshots.length} screenshots, label="${result.label}"`);
NODE
NRC=$?

if [ "$NRC" -ne 0 ] || [ ! -s "$OUT" ]; then
  write_error "normalization failed (capture produced no usable tokens)"
  exit 3
fi

# If capture ran but harvested nothing usable, treat as a soft failure (no colors AND no screenshots).
COLORS="$(node -e 'try{const j=require(process.argv[1]);process.stdout.write(String((j.colors||[]).length))}catch(e){process.stdout.write("0")}' "$OUT" 2>/dev/null)"
SHOTS="$(node -e 'try{const j=require(process.argv[1]);process.stdout.write(String((j.screenshots||[]).length))}catch(e){process.stdout.write("0")}' "$OUT" 2>/dev/null)"
if [ "${COLORS:-0}" = "0" ] && [ "${SHOTS:-0}" = "0" ]; then
  echo "!! capture ran but found no colors or screenshots — treat as soft failure (neutral kit)." >&2
  exit 4
fi

echo ">> wrote $OUT  (colors=$COLORS, screenshots=$SHOTS)"
echo "   NEXT: pick accent/accentAlt/fontPack/label from it, then bg-remove.sh on the logo screenshot."
exit 0
