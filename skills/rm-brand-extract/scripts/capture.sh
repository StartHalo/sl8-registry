#!/usr/bin/env bash
# capture.sh — capture a brand site's screenshot + design tokens (colors/fonts/label) with the
# runtime's headless Chrome Headless Shell + ffmpeg, then normalize to a stable brand-capture.json
# the brand block is derived from.
#
#   bash capture.sh <brand-url> <captures-dir>
#   e.g. bash capture.sh https://acme.com artifacts/acme/assets/captures
#
# This is the rm-* re-target of hf-brand-extract's capture (which used `hyperframes capture`). The
# sl8-animation runtime ships Remotion's Chrome Headless Shell at /opt/remotion/chrome-headless-shell
# (also $CHROME_HEADLESS_SHELL) + ffmpeg/ffprobe — both LOCAL, no auth, no extra download. We:
#   1. --screenshot the page (full window) -> brand-shot.png            (Chrome, local)
#   2. --dump-dom the page -> brand-dom.html                            (Chrome, local)
#   3. normalize colors/fonts/label from the DOM + same-origin CSS      (Node global fetch)
#   4. if NO colors found, lift accent/accentAlt from the screenshot    (ffmpeg pixel reduction)
# into <captures-dir>/brand-capture.json with a fixed shape:
#   { source, colors:[hex...], fonts:[family...], screenshots:[path...], label, via }
#
# Reachability gate: if Chrome is missing or the URL is unreachable (no screenshot AND no DOM AND no
# fetched HTML), we write a brand-capture.json carrying an "error" and EXIT NON-ZERO so the skill
# records a clean failure (the brand kit falls back to the neutral default; no fabricated colors).
# NEVER prompts. bash 3.2 compatible — no `timeout`, no GNU-only flags.
set -uo pipefail

URL="${1:?usage: capture.sh <brand-url> <captures-dir>}"
DEST="${2:?usage: capture.sh <brand-url> <captures-dir>}"
OUT="$DEST/brand-capture.json"
SHOT="$DEST/brand-shot.png"
DOM="$DEST/brand-dom.html"
mkdir -p "$DEST"

# Locate a Chrome binary: the runtime's pre-installed Chrome Headless Shell first, then any chromium.
CHROME=""
for cand in "${CHROME_HEADLESS_SHELL:-/opt/remotion/chrome-headless-shell}" \
            "$(command -v chromium 2>/dev/null)" \
            "$(command -v chromium-browser 2>/dev/null)" \
            "$(command -v google-chrome 2>/dev/null)" \
            "$(command -v chrome 2>/dev/null)"; do
  if [ -n "$cand" ] && [ -x "$cand" ]; then CHROME="$cand"; break; fi
done

write_error () { # $1 = message
  node -e '
    const fs=require("fs");
    fs.writeFileSync(process.argv[1], JSON.stringify({
      source: process.argv[2], error: process.argv[3],
      colors: [], fonts: [], screenshots: [], label: "", via: "none"
    }, null, 2));
  ' "$OUT" "$URL" "$1" 2>/dev/null \
    || printf '{"source":"%s","error":"%s","colors":[],"fonts":[],"screenshots":[],"label":"","via":"none"}\n' "$URL" "$1" > "$OUT"
  echo "!! capture failed: $1 (wrote $OUT with error; brand kit should fall back to the neutral default)" >&2
}

if [ -z "$CHROME" ]; then
  write_error "no Chrome Headless Shell / chromium on PATH (expected \$CHROME_HEADLESS_SHELL or /opt/remotion/chrome-headless-shell)"
  exit 2
fi
echo ">> Chrome: $CHROME"

# Common Chrome flags (chrome-headless-shell is headless by default; do NOT pass --headless).
CFLAGS="--no-sandbox --disable-gpu --disable-dev-shm-usage --hide-scrollbars --window-size=1440,900 --virtual-time-budget=10000 --timeout=20000"

# ---- 1. Screenshot (best-effort) ----
echo ">> screenshot $URL -> $SHOT"
$CHROME $CFLAGS --screenshot="$SHOT" "$URL" > "$DEST/.chrome.log" 2>&1 || true

# ---- 2. DOM dump (best-effort; primary token source) ----
echo ">> dump-dom $URL -> $DOM"
$CHROME $CFLAGS --dump-dom "$URL" > "$DOM" 2>>"$DEST/.chrome.log" || true

# Hard reachability gate: if we got NOTHING usable, fail clean.
if [ ! -s "$SHOT" ] && [ ! -s "$DOM" ]; then
  echo "---- chrome log (tail) ----" >&2; tail -n 20 "$DEST/.chrome.log" >&2 2>/dev/null || true
  write_error "Chrome produced neither a screenshot nor a DOM (URL unreachable or Chrome error)"
  exit 3
fi

# ---- 3. Normalize colors/fonts/label (DOM + same-origin CSS), with an ffmpeg pixel fallback ----
node - "$DEST" "$URL" "$OUT" "$SHOT" "$DOM" <<'NODE'
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const [dir, url, out, shot, dom] = process.argv.slice(2);

const HEX = /#[0-9a-fA-F]{6}\b/g;
const toHex = (n) => n.toString(16).padStart(2, "0");
const isNeutral = (h) => {
  const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const sat = max === 0 ? 0 : (max - min) / max;     // crude saturation
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  return sat < 0.18 || lum > 0.93 || lum < 0.06;     // grey / near-white / near-black
};
const satOf = (h) => {
  const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  return max === 0 ? 0 : (max - min) / max;
};

function harvest(text, hex, fonts, labelRef) {
  (text.match(HEX) || []).forEach((h) => hex.add(h.toLowerCase()));
  const fam = text.match(/font-family\s*[:=]\s*["']?([^;{}"'\n]+)/gi) || [];
  fam.forEach((m) => {
    (m.split(/[:=]/).slice(1).join(":") || "").split(",").forEach((x) => {
      const v = x.replace(/["';}]/g, "").trim();
      if (v && !/^var\(/.test(v) && !/^(inherit|initial|unset)$/i.test(v) && v.length < 40) fonts.add(v);
    });
  });
  if (!labelRef.v) {
    const og = text.match(/property=["']og:site_name["'][^>]*content=["']([^"']+)/i)
            || text.match(/content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
    if (og) labelRef.v = og[1].trim();
  }
  if (!labelRef.v) { const t = text.match(/<title[^>]*>\s*([^<|–—-]+)/i); if (t) labelRef.v = t[1].trim(); }
}

// ffmpeg pixel fallback: reduce the screenshot to a 6x6 RGB grid and pick a saturated accent + a
// dark contrast color. Pure-stdout raw bytes, no image library needed.
function ffmpegColors(file) {
  try {
    if (!file || !fs.existsSync(file)) return [];
    const buf = execFileSync("ffmpeg", [
      "-v", "error", "-i", file, "-vf", "scale=6:6:flags=area",
      "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ], { maxBuffer: 1 << 20 });
    const px = [];
    for (let i = 0; i + 2 < buf.length; i += 3) px.push("#" + toHex(buf[i]) + toHex(buf[i+1]) + toHex(buf[i+2]));
    return [...new Set(px)];
  } catch { return []; }
}

(async () => {
  const hex = new Set(), fonts = new Set(), labelRef = { v: "" };
  const texts = [];

  // a) the dumped DOM
  try { if (fs.existsSync(dom)) texts.push(fs.readFileSync(dom, "utf8")); } catch {}

  // b) a raw fetch of the URL (catches markup Chrome may have rewritten + the <title>)
  let originHtml = texts[0] || "";
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: "follow" });
    if (r.ok) { const t = await r.text(); originHtml = originHtml || t; texts.push(t); }
  } catch {}

  // c) same-origin stylesheets referenced by the page (capped: 6 files / 400 KB each)
  try {
    const origin = new URL(url).origin;
    const links = [...originHtml.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["']/gi)]
      .map((m) => m[1]).slice(0, 6);
    for (const href of links) {
      try {
        const abs = new URL(href, url).toString();
        if (new URL(abs).origin !== origin) continue;       // same-origin only
        const r = await fetch(abs, { signal: AbortSignal.timeout(8000) });
        if (r.ok) texts.push((await r.text()).slice(0, 400 * 1024));
      } catch {}
    }
  } catch {}

  texts.forEach((t) => harvest(t, hex, fonts, labelRef));

  // rank colors: brand-defining (saturated) first, neutrals after; dedup; cap 6
  let colors = [...hex].sort((a, b) => (isNeutral(a) ? 1 : 0) - (isNeutral(b) ? 1 : 0) || satOf(b) - satOf(a));
  let via = colors.length ? "dom" : "none";

  // ffmpeg fallback if the DOM/CSS gave us nothing
  if (colors.length === 0) {
    const ff = ffmpegColors(shot).sort((a, b) => (isNeutral(a) ? 1 : 0) - (isNeutral(b) ? 1 : 0) || satOf(b) - satOf(a));
    if (ff.length) { colors = ff.slice(0, 6); via = "ffmpeg"; }
  }

  // screenshots actually on disk
  const screenshots = [];
  try {
    for (const e of fs.readdirSync(dir)) {
      if (/\.(png|jpe?g|webp)$/i.test(e)) screenshots.push(path.relative(process.cwd(), path.join(dir, e)));
    }
  } catch {}

  // label fallback: bare domain
  let label = (labelRef.v || "").replace(/\s+/g, " ").trim().slice(0, 24);
  if (!label) { try { label = new URL(url).hostname.replace(/^www\./, "").split(".")[0]; } catch {} }

  const result = { source: url, colors: colors.slice(0, 6), fonts: [...fonts].slice(0, 6), screenshots: screenshots.slice(0, 8), label, via };
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.error(`>> normalized: ${result.colors.length} colors, ${result.fonts.length} fonts, ${result.screenshots.length} screenshots, label="${result.label}", via=${via}`);
})().catch((e) => { console.error("!! normalize error:", e && e.message); process.exit(7); });
NODE
NRC=$?

if [ "$NRC" -ne 0 ] || [ ! -s "$OUT" ]; then
  write_error "normalization failed (capture produced no usable tokens)"
  exit 4
fi

# Soft failure: ran, but found no colors AND no screenshot — let the kit fall back to neutral.
COLORS="$(node -e 'try{const j=require(process.argv[1]);process.stdout.write(String((j.colors||[]).length))}catch(e){process.stdout.write("0")}' "$OUT" 2>/dev/null)"
SHOTS="$(node -e 'try{const j=require(process.argv[1]);process.stdout.write(String((j.screenshots||[]).length))}catch(e){process.stdout.write("0")}' "$OUT" 2>/dev/null)"
if [ "${COLORS:-0}" = "0" ] && [ "${SHOTS:-0}" = "0" ]; then
  echo "!! capture ran but found no colors or screenshots — treat as soft failure (neutral kit)." >&2
  exit 5
fi

echo ">> wrote $OUT  (colors=$COLORS, screenshots=$SHOTS)"
echo "   NEXT: pick accent/accentAlt/fontPack/label from it, then bg-remove.sh on the logo region of $SHOT."
exit 0
