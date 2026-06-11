// Shared scene-sequencer — the piece that makes EVERY style "transition through the
// message" instead of holding a single headline. It turns a RenderDoc into an ordered
// list of scenes (headline → body beats → hero stat → quote → credit) with per-scene
// frame durations whose total exactly fills the composition (so trimming for time drops
// trailing scenes from the bottom of the inverted pyramid, never the lede).
//
// Lifted + generalized from the kinetic-typography style so all nine styles share one
// pacing brain. 100% deterministic (no randomness, no frame access here).

import { beatsThatFit } from "./pacing";
import { FPS } from "./tokens";
import type { RenderDoc } from "./types";

export type Scene =
  | { kind: "headline"; text: string }
  | { kind: "beat"; text: string }
  | { kind: "stat"; value: string; label: string }
  | { kind: "quote"; text: string; speaker: string | null; speakerTitle: string | null }
  | { kind: "credit" };

export type SceneKind = Scene["kind"];

const words = (s: string): string[] =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);

// The headline scene already carries the lede, so drop a leading body beat that mostly
// repeats the headline — scenes should show DISTINCT elements, not the same line twice.
// Measures how much of the HEADLINE the first beat restates (a lede usually contains the hed).
export function distinctBeats(headline: string, beats: string[]): string[] {
  if (beats.length <= 1) return beats;
  const hwords = words(headline);
  if (!hwords.length) return beats;
  const bset = new Set(words(beats[0]));
  const coverage = hwords.filter((w) => bset.has(w)).length / hwords.length;
  return coverage >= 0.6 ? beats.slice(1) : beats;
}

export interface PlanOptions {
  trans?: number; // cross-scene transition length (frames). Default 9.
  maxBeats?: number; // cap on body-beat scenes. Default 4.
  includeStat?: boolean; // show the hero-stat scene if present. Default true.
  includeQuote?: boolean; // show the quote scene if present. Default true.
  includeCredit?: boolean; // show the end-credit scene. Default true.
  minSceneFrames?: number; // hard per-scene floor. Default ~1.1s.
}

export interface ScenePlan {
  scenes: Scene[];
  durs: number[]; // per-scene frame counts; sum === durationInFrames + (n-1)*trans
  trans: number;
}

const weightOf = (s: Scene): number =>
  s.kind === "headline"
    ? 2.0
    : s.kind === "beat"
      ? Math.max(1.5, s.text.split(/\s+/).filter(Boolean).length / 2.5)
      : s.kind === "stat"
        ? 2.3
        : s.kind === "quote"
          ? Math.max(2.2, s.text.split(/\s+/).filter(Boolean).length / 2.5)
          : 1.5; // credit

// Build the ordered scene list + per-scene durations so a <TransitionSeries> wrapping them
// totals exactly `durationInFrames` (each of the n-1 transitions overlaps two scenes by
// `trans` frames, so the scene durations must sum to durationInFrames + (n-1)*trans).
export function planScenes(
  doc: RenderDoc,
  durationInFrames: number,
  opts: PlanOptions = {},
): ScenePlan {
  const trans = opts.trans ?? 9;
  const maxBeats = opts.maxBeats ?? 4;
  const includeStat = opts.includeStat ?? true;
  const includeQuote = opts.includeQuote ?? true;
  const includeCredit = opts.includeCredit ?? true;

  const hasStat = includeStat && doc.primaryStat !== null && Boolean(doc.primaryStat?.value);
  const hasQuote = includeQuote && doc.quote !== null && Boolean(doc.quote?.text);
  const beats = beatsThatFit(distinctBeats(doc.headline || "", doc.bodyBeats), durationInFrames, maxBeats);

  const scenes: Scene[] = [{ kind: "headline", text: doc.headline || "" }];
  for (const b of beats) scenes.push({ kind: "beat", text: b });
  if (hasStat && doc.primaryStat) {
    scenes.push({ kind: "stat", value: doc.primaryStat.value, label: doc.primaryStat.label });
  }
  if (hasQuote && doc.quote) {
    scenes.push({
      kind: "quote",
      text: doc.quote.text,
      speaker: doc.quote.speaker,
      speakerTitle: doc.quote.speakerTitle,
    });
  }
  if (includeCredit) scenes.push({ kind: "credit" });

  const weights = scenes.map(weightOf);
  const n = scenes.length;
  const target = durationInFrames + (n - 1) * trans;
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const MIN = opts.minSceneFrames ?? Math.round(1.1 * FPS);
  const durs = weights.map((w) => Math.max(MIN, Math.round((w / sum) * target)));
  // Absorb rounding into the longest scene so the total is exact.
  const diff = target - durs.reduce((a, b) => a + b, 0);
  const maxi = durs.indexOf(Math.max(...durs));
  durs[maxi] = Math.max(MIN, durs[maxi] + diff);

  return { scenes, durs, trans };
}

// Convenience for non-TransitionSeries styles (no transition overlap): the scene
// durations sum exactly to durationInFrames.
export function planScenesFlat(
  doc: RenderDoc,
  durationInFrames: number,
  opts: Omit<PlanOptions, "trans"> = {},
): ScenePlan {
  return planScenes(doc, durationInFrames, { ...opts, trans: 0 });
}
