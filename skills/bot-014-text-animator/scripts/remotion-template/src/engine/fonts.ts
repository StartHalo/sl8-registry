// Deterministic, headless-safe font loading. loadFont() is called at MODULE TOP LEVEL
// (never inside a component); Remotion's renderer blocks frame capture until every
// registered font is ready, so no fallback-face flicker. research/model-evaluation.md §3.
//
// Three families cover all four styles:
//   body      Inter      — UI/body grotesque (all styles)
//   display   Fraunces   — premium serif (Minimal Editorial headline, pull-quotes)
//   condensed Oswald     — condensed broadcast caps (Breaking News lower-third/ticker, Kinetic)

import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";

const inter = loadInter("normal", { weights: ["400", "700", "800"], subsets: ["latin"] });
const fraunces = loadFraunces("normal", { weights: ["400", "600", "900"], subsets: ["latin"] });
const oswald = loadOswald("normal", { weights: ["500", "700"], subsets: ["latin"] });

export const FONT = {
  body: inter.fontFamily,
  display: fraunces.fontFamily,
  condensed: oswald.fontFamily,
} as const;

// Only needed to coordinate readiness OUTSIDE the normal render flow (e.g. a test
// harness). Inside `remotion render`, the engine already blocks on these.
export const fontsReady = Promise.all([
  inter.waitUntilDone(),
  fraunces.waitUntilDone(),
  oswald.waitUntilDone(),
]);
