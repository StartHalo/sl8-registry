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

// Mood voices + a MELODIC ARPEGGIO. The energy is deliberately MID-FORWARD (250-900 Hz) so
// the bed is audible on the laptop/phone speakers where short-form video is actually watched —
// a bass-heavy pad measures "loud" but disappears on small speakers. Each mood pairs a thinned
// pad (`voices`, `padMix`) with a rhythmic `arp` (re-triggered pluck notes, the part you HEAR).
// `arp.steps` must divide N (the loop) and `arp.notes.length` must divide `arp.steps` so the
// melody completes whole cycles per loop (seamless). Pluck env zeroes at each step boundary.
const MOODS = {
  // G-major pad + a gentle descending arp. Open, calm, unhurried.
  calm: {
    gain: 0.86, padMix: 0.62, tremHz: 0.25, tremDepth: 0.08,
    voices: [p(98.0, 0.22), p(196.0, 0.42), p(293.66, 0.5), p(392.0, 0.46), p(493.88, 0.38), p(587.33, 0.3)],
    arp: { notes: [587.33, 493.88, 392.0, 493.88], steps: 16, decay: 0.3, amp: 0.55 },
  },
  // A-minor pad + a slow, weighty arp. Tension without being grim.
  dramatic: {
    gain: 0.88, padMix: 0.6, tremHz: 0.125, tremDepth: 0.14,
    voices: [p(110.0, 0.3), p(220.0, 0.48), p(261.63, 0.46), p(329.63, 0.44), p(392.0, 0.36)],
    arp: { notes: [440.0, 392.0, 329.63, 261.63], steps: 8, decay: 0.62, amp: 0.6 },
  },
  // C-major pad + a bright, bouncy 16th arp. Forward, energetic.
  upbeat: {
    gain: 0.88, padMix: 0.55, tremHz: 0.5, tremDepth: 0.05,
    voices: [p(196.0, 0.36), p(392.0, 0.5), p(523.25, 0.42), p(659.25, 0.32)],
    arp: { notes: [523.25, 659.25, 783.99, 659.25, 523.25, 392.0], steps: 24, decay: 0.2, amp: 0.62 },
  },
  // D Dorian retro synth + a fast, syncopated arp. Clean/techy.
  tech: {
    gain: 0.86, padMix: 0.5, tremHz: 0.375, tremDepth: 0.05,
    voices: [...saw(146.83, 0.28, 3), p(293.66, 0.4), p(440.0, 0.36), p(587.33, 0.28)],
    arp: { notes: [587.33, 880.0, 440.0, 698.46], steps: 32, decay: 0.13, amp: 0.58 },
  },
};

// A bright pluck oscillator for the arp (fundamental + 2 harmonics) so it cuts through on
// small speakers. Pure function of (freq, localTime).
const pluckOsc = (f, lt) =>
  Math.sin(2 * Math.PI * f * lt) + 0.45 * Math.sin(4 * Math.PI * f * lt) + 0.22 * Math.sin(6 * Math.PI * f * lt);

function synth(mood) {
  const cfg = MOODS[mood];
  const data = new Float64Array(N);
  const arp = cfg.arp;
  const stepLen = arp ? Math.round(N / arp.steps) : 0; // samples per arp step (divides N)
  const stepDur = stepLen / SR;
  const padMix = cfg.padMix ?? 0.7;
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    // --- pad ---
    let pad = 0;
    for (const v of cfg.voices) pad += v.a * Math.sin(2 * Math.PI * v.f * t + v.phase);
    // Periodic tremolo (starts/ends at the same value → seamless).
    const trem = 1 - cfg.tremDepth + cfg.tremDepth * 0.5 * (1 + Math.sin(2 * Math.PI * (cfg.tremHz ?? 0) * t - Math.PI / 2));
    pad *= trem;
    // --- arp (the audible melodic layer) — re-triggered pluck per step ---
    let voice = 0;
    if (arp) {
      const stepIdx = Math.floor(i / stepLen);
      const localT = (i - stepIdx * stepLen) / SR;
      const f = arp.notes[stepIdx % arp.notes.length];
      const x = localT / stepDur; // 0..1 within the step
      const attack = Math.min(1, localT / 0.006); // tiny attack to avoid a click
      const env = x < 1 ? Math.pow(1 - x, 1.5) * attack : 0; // decays to 0 by the step end
      voice = arp.amp * env * pluckOsc(f, localT);
    }
    const s = padMix * pad + voice;
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
  // Cut inaudible sub-bass (frees headroom), boost the 1.5-5 kHz "presence" band where small
  // speakers live, and limit so the EQ boosts can't clip. This is what makes the bed audible
  // on a phone/laptop instead of a "loud" measurement that vanishes on small drivers.
  const filter =
    "highpass=f=95,equalizer=f=1800:width_type=q:w=1.4:g=3.5,equalizer=f=4200:width_type=q:w=2:g=2.5,alimiter=limit=0.95,lowpass=f=15000";
  // Try libmp3lame first, then ffmpeg's native mp3 encoder as a fallback.
  const base = ["-hide_banner", "-loglevel", "error", "-y", "-f", "s16le", "-ar", String(SR), "-ac", "1", "-i", "pipe:0",
    "-af", filter];
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
