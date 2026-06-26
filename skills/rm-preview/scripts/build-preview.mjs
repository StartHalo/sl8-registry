#!/usr/bin/env node
// build-preview.mjs — emit a SELF-CONTAINED, scrubbable artifacts/<project>/preview.html that
// embeds @remotion/player (the project's StudioVideo + props.json) for a live, frame-accurate
// preview BEFORE a full MP4 render. This is the "studio, not a black box" deliverable.
//
// Keyless, no CDN, no network: the player (React + Remotion + the composition) is bundled with the
// PROJECT'S OWN esbuild (node_modules/.bin/esbuild) and inlined into the HTML. If that bundle can't
// be produced (no esbuild, bundle error, or --fallback), it falls back to a CONTACT-SHEET preview
// built from rm-validate's snapshots/ (or rm-render's exports/frames/), inlined as base64 + a scrub
// slider — still self-contained, still scrubbable.
//
// Usage:
//   node build-preview.mjs <project-root> [out-html] [aspect-ratio] [name] [--fallback]
//     <project-root>  artifacts/<project>           (preview.html + preview-assets/ land here;
//                                                     remotion-project/ + snapshots/ live under it)
//     out-html        default <project-root>/preview.html
//     aspect-ratio    16:9 | 9:16 | 1:1             (default 16:9 — sets compositionWidth/Height)
//     name            preview title                 (default the project-root folder name)
//     --fallback      skip the player bundle; force the contact-sheet preview
//
// Prints a one-line JSON receipt to stdout: {ok, mode, out, ar, width, height}. Exit 0 unless there
// was nothing to preview (no bundle AND no frames) → exit 1.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const FPS = 30;
const AR_DIMS = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080] };

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const pos = argv.filter((a) => !a.startsWith("--"));

const projectRoot = path.resolve(pos[0] || ".");
const outHtml = path.resolve(pos[1] || path.join(projectRoot, "preview.html"));
const ar = (pos[2] || "16:9").replace(/x/i, ":");
const name = pos[3] || path.basename(projectRoot);
const forceFallback = flags.has("--fallback");

const remDir = path.join(projectRoot, "remotion-project");
const propsPath = path.join(remDir, "props.json");
const [width, height] = AR_DIMS[ar] || AR_DIMS["16:9"];

const log = (m) => process.stderr.write(m + "\n");
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ------------------------------------------------------------------------------------------------
// HTML templates. Placeholders are filled with FUNCTION replacers so any `$` in the bundle / JSON
// is not treated as a String.replace special pattern.
// ------------------------------------------------------------------------------------------------
const SHELL_CSS = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #07090d; color: #e7ecf3;
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif; }
header { padding: 18px 22px 8px; }
header h1 { margin: 0; font-size: 16px; font-weight: 700; letter-spacing: .2px; }
header p { margin: 4px 0 0; color: #8b97a8; font-size: 12px; font-variant-numeric: tabular-nums; }
main { display: flex; justify-content: center; padding: 14px 22px 6px; }
#stage { width: min(100%, 980px); aspect-ratio: __W__ / __H__; background: #000;
  border: 1px solid #1b212b; border-radius: 12px; overflow: hidden;
  box-shadow: 0 18px 60px rgba(0,0,0,.55); }
#player, #frame-wrap { width: 100%; height: 100%; }
#frame-wrap { display: flex; align-items: center; justify-content: center; background: #000; }
#frame { max-width: 100%; max-height: 100%; display: block; }
footer { padding: 8px 22px 22px; color: #6f7b8c; font-size: 12px; }
.scrub { width: min(100%, 980px); margin: 12px auto 0; display: flex; gap: 12px; align-items: center; }
.scrub input[type=range] { flex: 1; accent-color: #22d3ee; }
.scrub .lbl { min-width: 132px; color: #b7c2d2; font-variant-numeric: tabular-nums; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #11202a;
  color: #22d3ee; font-size: 11px; font-weight: 600; }
`;

const PLAYER_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
__HEAD__
<style>${SHELL_CSS}</style>
</head>
<body>
<header>
  <h1>Remotion Studio preview <span class="badge">LIVE</span></h1>
  <p>__SUBTITLE__</p>
</header>
<main><div id="stage"><div id="player"></div></div></main>
<footer>Scrub / play above to review motion + composition before the full render. The canonical, ffprobe-verified pixels still come from rm-render's MP4.</footer>
<script>
  window.remotion_staticBase = "./preview-assets";
  window.__PREVIEW_META__ = __META_JSON__;
  window.__PREVIEW_PROPS__ = __PROPS_JSON__;
</script>
<script>__BUNDLE__</script>
</body>
</html>
`;

const CONTACT_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
__HEAD__
<style>${SHELL_CSS}</style>
</head>
<body>
<header>
  <h1>Remotion Studio preview <span class="badge">CONTACT SHEET</span></h1>
  <p>__SUBTITLE__</p>
</header>
<main><div id="stage"><div id="frame-wrap"><img id="frame" alt="key frame"></div></div></main>
<div class="scrub">
  <input id="range" type="range" min="0" max="0" value="0" step="1">
  <span class="lbl" id="lbl"></span>
</div>
<footer>A live player bundle was unavailable, so this is a scrub through the validate / render key frames. Use the slider or arrow keys. For a frame-accurate live player, ensure remotion-project/node_modules has esbuild + @remotion/player and re-run.</footer>
<script>
  var FRAMES = __FRAMES_JSON__;
  var img = document.getElementById("frame");
  var range = document.getElementById("range");
  var lbl = document.getElementById("lbl");
  function show(i) {
    i = Math.max(0, Math.min(FRAMES.length - 1, i));
    range.value = i;
    img.src = FRAMES[i].uri;
    lbl.textContent = (i + 1) + " / " + FRAMES.length + " — " + FRAMES[i].name;
  }
  range.max = Math.max(0, FRAMES.length - 1);
  range.addEventListener("input", function () { show(parseInt(range.value, 10)); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") show(parseInt(range.value, 10) + 1);
    if (e.key === "ArrowLeft") show(parseInt(range.value, 10) - 1);
  });
  if (FRAMES.length) show(0);
</script>
</body>
</html>
`;

const STUB_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
__HEAD__
<style>body{margin:0;background:#07090d;color:#e7ecf3;font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:40px}</style>
</head>
<body>
<h1>__NAME__ — nothing to preview yet</h1>
<p>No live player bundle could be built and no key frames were found in <code>snapshots/</code> or <code>exports/frames/</code>.</p>
<p>Run <strong>rm-build</strong> (to produce <code>remotion-project/</code> + <code>props.json</code>) and <strong>rm-validate</strong> (to seed <code>snapshots/</code>), then re-run rm-preview.</p>
</body>
</html>
`;

// The Player entry esbuild bundles. Imports the project's StudioVideo + reads the injected globals.
const ENTRY_SRC = `import React from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { StudioVideo } from "./src/StudioVideo";

const meta = window.__PREVIEW_META__;
const props = window.__PREVIEW_PROPS__;

function App() {
  return React.createElement(Player, {
    component: StudioVideo,
    inputProps: props,
    durationInFrames: meta.durationInFrames,
    fps: meta.fps,
    compositionWidth: meta.width,
    compositionHeight: meta.height,
    controls: true,
    loop: true,
    autoPlay: false,
    showVolumeControls: true,
    clickToPlay: true,
    doubleClickToFullscreen: true,
    acknowledgeRemotionLicense: true,
    style: { width: "100%", height: "100%" },
  });
}

createRoot(document.getElementById("player")).render(React.createElement(App));
`;

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------
function readProps() {
  try {
    return JSON.parse(fs.readFileSync(propsPath, "utf8"));
  } catch {
    return null;
  }
}

function headBlock(mode) {
  return `<title>${esc(name)} — Remotion Studio preview (${mode})</title>`;
}

function tryPlayerBundle() {
  const esbuild = path.join(remDir, "node_modules", ".bin", "esbuild");
  if (!fs.existsSync(esbuild)) {
    log("!! esbuild not found at remotion-project/node_modules/.bin/esbuild — falling back to contact sheet.");
    return null;
  }
  if (!fs.existsSync(path.join(remDir, "src", "StudioVideo.tsx"))) {
    log("!! remotion-project/src/StudioVideo.tsx missing — falling back to contact sheet.");
    return null;
  }
  const entry = path.join(remDir, "__rm-preview-entry.tsx");
  fs.writeFileSync(entry, ENTRY_SRC);
  const res = spawnSync(
    esbuild,
    [
      entry,
      "--bundle",
      "--format=iife",
      "--platform=browser",
      "--target=es2020",
      "--jsx=automatic",
      "--minify",
      "--legal-comments=none",
      '--define:process.env.NODE_ENV="production"',
      "--loader:.png=dataurl",
      "--loader:.jpg=dataurl",
      "--loader:.jpeg=dataurl",
      "--loader:.svg=dataurl",
    ],
    { cwd: remDir, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
  );
  try {
    fs.unlinkSync(entry);
  } catch {}
  if (res.status !== 0 || !res.stdout) {
    log("!! esbuild bundle failed — falling back to contact sheet. Last stderr:");
    log((res.stderr || "(no stderr)").slice(-2000));
    return null;
  }
  return res.stdout;
}

function copyPublic() {
  const src = path.join(remDir, "public");
  const dst = path.join(path.dirname(outHtml), "preview-assets");
  if (!fs.existsSync(src)) return false;
  try {
    fs.cpSync(src, dst, { recursive: true });
    return true;
  } catch (e) {
    log("!! could not copy public/ to preview-assets/: " + e.message);
    return false;
  }
}

function collectFrames() {
  const dirs = [
    path.join(projectRoot, "snapshots"),
    path.join(projectRoot, "exports", "frames"),
  ];
  const out = [];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).sort()) {
      if (!/\.(png|jpe?g)$/i.test(f)) continue;
      const buf = fs.readFileSync(path.join(d, f));
      const mime = /\.png$/i.test(f) ? "image/png" : "image/jpeg";
      out.push({ name: f, uri: `data:${mime};base64,${buf.toString("base64")}` });
    }
  }
  return out;
}

function playerHtml(bundle, props) {
  const durationInFrames = Math.max(1, Math.round((Number(props.durationSeconds) || 12) * FPS));
  const meta = { id: `Studio-${ar.replace(":", "x")}`, fps: FPS, width, height, durationInFrames };
  return PLAYER_TEMPLATE.replace("__HEAD__", () => headBlock("live"))
    .replace("__SUBTITLE__", () => esc(`${ar} · ${width}x${height} · ${(durationInFrames / FPS).toFixed(1)}s @ ${FPS}fps · @remotion/player`))
    .replaceAll("__W__", String(width))
    .replaceAll("__H__", String(height))
    .replace("__META_JSON__", () => JSON.stringify(meta))
    .replace("__PROPS_JSON__", () => JSON.stringify(props))
    .replace("__BUNDLE__", () => bundle);
}

function contactSheetHtml(frames) {
  return CONTACT_TEMPLATE.replace("__HEAD__", () => headBlock("contact-sheet"))
    .replace("__SUBTITLE__", () => esc(`${ar} · ${width}x${height} · ${frames.length} key frame(s) · contact-sheet fallback (no live player bundle)`))
    .replaceAll("__W__", String(width))
    .replaceAll("__H__", String(height))
    .replace("__FRAMES_JSON__", () => JSON.stringify(frames));
}

// ------------------------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------------------------
const props = readProps();
let html = null;
let mode = null;

if (!forceFallback) {
  if (!props) {
    log("!! props.json not found at " + propsPath + " — cannot bundle the player; trying contact sheet.");
  } else {
    const bundle = tryPlayerBundle();
    if (bundle) {
      html = playerHtml(bundle, props);
      mode = "player";
    }
  }
}

if (!html) {
  const frames = collectFrames();
  if (frames.length) {
    html = contactSheetHtml(frames);
    mode = "contact-sheet";
  }
}

if (!html) {
  html = STUB_TEMPLATE.replace("__HEAD__", () => headBlock("empty")).replace("__NAME__", () => esc(name));
  mode = "empty";
}

fs.mkdirSync(path.dirname(outHtml), { recursive: true });
fs.writeFileSync(outHtml, html);

let assetsCopied = false;
if (mode === "player") assetsCopied = copyPublic();

log(`>> preview mode: ${mode}`);
log(`>> wrote ${outHtml} (${(fs.statSync(outHtml).size / 1024).toFixed(0)} KB)${assetsCopied ? " + preview-assets/" : ""}`);
if (mode === "empty") {
  log("!! nothing to preview — no player bundle AND no frames. Run rm-build (+ rm-validate to seed snapshots/), then re-run.");
}
console.log(JSON.stringify({ ok: mode !== "empty", mode, out: outHtml, ar, width, height }));
process.exit(mode === "empty" ? 1 : 0);
