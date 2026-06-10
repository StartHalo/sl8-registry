// Minimal Editorial — restrained "paper" palette.
// Off-white warm paper background, near-black ink headline, muted meta text.
// brand.accent is layered in at render time (the rule + kicker) — see index.tsx.
// Shape MUST match engine StyleConfig.Palette: { bg, surface, text, textMuted, accent, accentAlt }.

import type { Palette } from "../../engine/StyleConfig";

// Default accent fallback when a brand supplies none (burnt sienna — calm, editorial).
export const DEFAULT_ACCENT = "#9A3412";

// Warm off-white "paper" register (the SAFE default look).
export const editorialPalette = (accent: string, accentAlt: string): Palette => ({
  bg: "#FBFAF7", // warm off-white paper
  surface: "#F2EFE8", // very light raised tone (scrims/cards)
  text: "#16130E", // near-black ink — headline
  textMuted: "#4A453C", // dek / secondary copy
  accent, // single restrained accent (rule + kicker)
  accentAlt, // reserved second accent (pull-quote bar) — falls back to accent
});
