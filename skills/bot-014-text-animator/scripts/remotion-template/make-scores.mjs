#!/usr/bin/env node
// make-scores.mjs — generate the four license-clean background-score beds used by
// engine/BackgroundScore.tsx. Pure offline synthesis (no network, no samples, no
// copyrighted material): a chord pad built from summed sine partials, with a periodic
// tremolo + (for the energetic moods) a rhythmic pulse gate. PCM is piped to ffmpeg and
// encoded to public/music/<mood>.mp3.
//
// We run this from render.sh (cwd = the Remotion project root) BEFORE rendering, so the
// beds are produced fresh in the sandbox — this sidesteps the test harness' utf-8 file
// upload (which would corrupt a bundled binary mp3). It is idempotent: existing beds are
// kept unless --force is passed.
//
//   node make-scores.mjs            # generate any missing beds
//   node make-scores.mjs --force    # regenerate all
//
// Seamless looping: every partial / tremolo / pulse frequency is snapped to a whole
// number of cycles per LOOP, so the waveform value + slope match at the loop boundary and
// Remotion's <Audio loop> repeats it without a click. Fully deterministic.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "public", "music");
const SR = 44100;
const LOOP = 8; // seconds per seamless loop
const N = SR * LOOP;
const FORCE = process.argv.includes("--force");

// Snap a frequency to a whole number of cycles across the loop (>= 1 cycle).
const grid = (f) => Math.max(1, Math.round(f * LOOP)) / LOOP;

// A partial: { f: Hz, a: amplitude, phase?: radians }.
const p = (f, a, phase = 0) => ({ f: grid(f), a, phase });

// Saw-ish stack: fundamental + a few decaying harmonics (warmer than a pure sine).
const saw = (f, a, harmonics = 4) =>
  Array.from({ length: harmonics }, (_, k) => p(f * (k + 1), a / (k + 1)));

// Mood voices. Frequencies are musical (equal-temperament); amplitudes hand-balanced so
// the pad sits low and warm. All snapped to the loop grid by grid().
const MOODS = {
  // Cmaj9 pad — open, gentle, unhurried. (Fuller/louder: shallower tremolo, more headroom.)
  calm: {
    gain: 0.9,
    tremHz: 0.25,
    tremDepth: 0.1,
    voices: [p(65.41, 0.5), p(130.81, 0.9), p(196.0, 0.55), p(329.63, 0.5), p(493.88, 0.32), p(587.33, 0.28)],
  },
  // A-minor with a low drone + a slow swell — tension without being grim.
  dramatic: {
    gain: 0.92,
    tremHz: 0.125,
    tremDepth: 0.16,
    voices: [p(55.0, 0.55), p(110.0, 0.9), p(164.81, 0.6), p(220.0, 0.5), p(261.63, 0.4), p(349.23, 0.34), p(220.0 * 1.004, 0.18)],
  },
  // C-major triad over a bass, with an eighth-note pulse — bright and forward.
  upbeat: {
    gain: 0.9,
    tremHz: 0.5,
    tremDepth: 0.06,
    pulseHz: 2,
    pulseDepth: 0.4,
    pulseSharp: 5,
    voices: [p(130.81, 0.7), p(261.63, 0.85), p(329.63, 0.6), p(392.0, 0.55), p(523.25, 0.4)],
  },
  // D Dorian-ish retro synth: a saw stack + a bright high + a fast pulse — clean/techy.
  tech: {
    gain: 0.88,
    tremHz: 0.375,
    tremDepth: 0.06,
    pulseHz: 4,
    pulseDepth: 0.44,
    pulseSharp: 6,
    voices: [...saw(146.83, 0.6, 4), p(220.0, 0.4), p(349.23, 0.3), p(220.0 * 1.005, 0.16), p(1046.5, 0.1)],
  },
};

function synth(mood) {
  const cfg = MOODS[mood];
  const data = new Float64Array(N);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let s = 0;
    for (const v of cfg.voices) s += v.a * Math.sin(2 * Math.PI * v.f * t + v.phase);
    // Periodic tremolo (starts/ends at the same value → seamless).
    const trem = 1 - cfg.tremDepth + cfg.tremDepth * 0.5 * (1 + Math.sin(2 * Math.PI * (cfg.tremHz ?? 0) * t - Math.PI / 2));
    s *= trem;
    // Optional rhythmic pulse gate for the energetic moods.
    if (cfg.pulseHz) {
      const ph = 0.5 * (1 + Math.sin(2 * Math.PI * cfg.pulseHz * t - Math.PI / 2));
      s *= 1 - cfg.pulseDepth + cfg.pulseDepth * Math.pow(ph, cfg.pulseSharp);
    }
    data[i] = s;
    const abs = Math.abs(s);
    if (abs > peak) peak = abs;
  }
  // Normalize to the mood gain and pack to s16le mono.
  const norm = peak > 0 ? cfg.gain / peak : 1;
  const buf = Buffer.allocUnsafe(N * 2);
  for (let i = 0; i < N; i++) {
    let v = data[i] * norm;
    v = v > 1 ? 1 : v < -1 ? -1 : v;
    buf.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  return buf;
}

function encode(pcm, outPath) {
  // Try libmp3lame first, then ffmpeg's native mp3 encoder as a fallback.
  const base = ["-hide_banner", "-loglevel", "error", "-y", "-f", "s16le", "-ar", String(SR), "-ac", "1", "-i", "pipe:0",
    "-af", "highpass=f=35,lowpass=f=11000"];
  for (const codec of ["libmp3lame", "mp3"]) {
    const r = spawnSync("ffmpeg", [...base, "-c:a", codec, "-b:a", "128k", outPath], {
      input: pcm,
      stdio: ["pipe", "ignore", "inherit"],
    });
    if (r.status === 0 && existsSync(outPath)) return true;
  }
  return false;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  let ok = 0;
  const moods = Object.keys(MOODS);
  for (const mood of moods) {
    const outPath = join(OUT_DIR, `${mood}.mp3`);
    if (!FORCE && existsSync(outPath)) {
      console.log(`>> ${mood}.mp3 exists — skipping (use --force to regenerate)`);
      ok++;
      continue;
    }
    process.stdout.write(`>> synth ${mood} ... `);
    const pcm = synth(mood);
    if (encode(pcm, outPath)) {
      console.log(`OK -> ${outPath}`);
      ok++;
    } else {
      console.error(`FAILED to encode ${mood}.mp3 (ffmpeg/libmp3lame unavailable?)`);
    }
  }
  if (ok < moods.length) {
    console.error(`!! make-scores: ${ok}/${moods.length} beds ready`);
    process.exit(1);
  }
  console.log(`>> all ${moods.length} score beds ready in public/music/`);
}

main();
