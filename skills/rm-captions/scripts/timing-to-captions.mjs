#!/usr/bin/env node
// timing-to-captions.mjs — convert rm-voiceover's 04-timing.json into the @remotion/captions
// Caption[] shape that CaptionOverlay.tsx + createTikTokStyleCaptions consume.
//
//   node timing-to-captions.mjs <04-timing.json> [out.json]
//     <04-timing.json>  the timing file written by rm-voiceover/words.sh
//     [out.json]        where to write the Caption[] (default: ./captions.json;
//                       rm-build passes artifacts/<project>/remotion-project/public/captions.json)
//
// It reads the FLAT, ABSOLUTE-time words[] track ([{text,start,end,beat}], seconds) and emits
//   Caption[] = [{ text, startMs, endMs, timestampMs, confidence }]  (milliseconds)
// with a LEADING SPACE on every word's text — the white-space-preservation rule from the official
// display-captions guide — so createTikTokStyleCaptions pages render with correct word spacing.
//
// It NEVER fabricates timings. If 04-timing.json has no word-level track (timing_method=estimated,
// e.g. TTS/ASR was unreachable), it writes an empty Caption[] and warns; the caller falls back to
// beat-level captions or skips captions (see SKILL.md "Failure / fallback"). No rendering, no network.
//
// Output is written to disk AND printed to stdout so rm-build can inline it into props.json.

import fs from "node:fs";
import path from "node:path";

const [, , inPath, outPathArg] = process.argv;
if (!inPath) {
  process.stderr.write("usage: node timing-to-captions.mjs <04-timing.json> [out.json]\n");
  process.exit(2);
}
const outPath = outPathArg || "captions.json";

// ---- read 04-timing.json -------------------------------------------------
let doc;
try {
  doc = JSON.parse(fs.readFileSync(inPath, "utf8"));
} catch (e) {
  process.stderr.write(`!! cannot read/parse ${inPath}: ${e.message}\n`);
  process.exit(1);
}

// The canonical source is the FLAT, absolute-time words[] track (text,start,end[,beat] in seconds).
const flat = Array.isArray(doc.words) ? doc.words : [];

const ms = (sec) => Math.round(Number(sec) * 1000);

const captions = [];
let prevEnd = -1;
for (const w of flat) {
  const text = String(w && w.text != null ? w.text : "").trim();
  if (!text) continue;
  let startMs = ms(w.start);
  let endMs = ms(w.end);
  if (!Number.isFinite(startMs)) continue;
  if (!Number.isFinite(endMs) || endMs <= startMs) endMs = startMs + 1; // guarantee a positive window
  // keep the track monotonic (Wizper is usually already monotonic; nudge any overlap forward)
  if (startMs < prevEnd) startMs = prevEnd;
  if (endMs <= startMs) endMs = startMs + 1;
  prevEnd = endMs;
  captions.push({
    text: " " + text, // leading space => correct spacing once tokens are concatenated on a page
    startMs,
    endMs,
    timestampMs: Math.round((startMs + endMs) / 2),
    confidence: null,
  });
}

// ---- write + report ------------------------------------------------------
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(captions, null, 2) + "\n");
process.stdout.write(JSON.stringify(captions) + "\n");

if (captions.length === 0) {
  process.stderr.write(
    `>> wrote ${outPath}: 0 captions — 04-timing.json had no word-level track ` +
      `(timing_method likely 'estimated'). Word-pop captions are NOT available; fall back to ` +
      `beat-level captions or skip captions (do NOT fabricate per-word timings).\n`,
  );
} else {
  const total = (captions[captions.length - 1].endMs / 1000).toFixed(2);
  process.stderr.write(
    `>> wrote ${outPath}: ${captions.length} captions, ${total}s, ` +
      `${captions[0].startMs}..${captions[captions.length - 1].endMs}ms (absolute timeline).\n`,
  );
}
