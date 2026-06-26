// Reading-time pacing shared by every style. research/domain-analysis.md §6:
// per-beat seconds ~ max(0.8, words / 2.5); 5s holds ~3-4 beats, 15s ~5-6 + credit.
// Trimming for time drops beats from the BOTTOM of the inverted pyramid (beats are
// ordered most-important-first), never the lede.

import { FPS } from "./tokens";

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const beatSeconds = (text: string) => Math.max(0.8, wordCount(text) / 2.5);

export interface Segment {
  index: number;
  from: number; // start frame
  durationInFrames: number;
  text: string;
}

// How many leading beats actually fit in `totalFrames` (after intro/outro slack).
export function beatsThatFit(beats: string[], totalFrames: number, max = 6): string[] {
  const lead = Math.round(0.3 * FPS);
  const tail = Math.round(0.6 * FPS);
  const avail = totalFrames - lead - tail;
  const out: string[] = [];
  let used = 0;
  for (const b of beats.slice(0, max)) {
    const f = Math.max(Math.round(0.8 * FPS), Math.round(beatSeconds(b) * FPS));
    if (used + f > avail && out.length >= 2) break;
    out.push(b);
    used += f;
  }
  return out.length ? out : beats.slice(0, 1);
}

// Lay the (already-fitted) beats out on the timeline, distributing available frames
// proportionally to reading time, with a hard per-beat floor.
export function layoutBeats(
  beats: string[],
  totalFrames: number,
  opts?: { lead?: number; tail?: number },
): Segment[] {
  const lead = opts?.lead ?? Math.round(0.3 * FPS);
  const tail = opts?.tail ?? Math.round(0.6 * FPS);
  const avail = Math.max(FPS, totalFrames - lead - tail);
  const weights = beats.map(beatSeconds);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const floor = Math.round(0.8 * FPS);
  let cursor = lead;
  return beats.map((text, index) => {
    const dur = Math.max(floor, Math.round((weights[index] / sum) * avail));
    const seg: Segment = { index, from: cursor, durationInFrames: dur, text };
    cursor += dur;
    return seg;
  });
}
