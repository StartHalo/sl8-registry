// Headline Highlight palette — a clean editorial article card on a light, near-white
// surface. Near-black ink, the brand accent for the kicker/credit rule, and a warm
// translucent highlighter ink (NOT the brand red) for the rough.js marker.
//
// The accent is injected from brand.accent at runtime (see index.tsx → buildPalette).

import type { Palette } from "../../engine/StyleConfig";

// Warm translucent yellow that reads like a real highlighter pen under ink.
// Kept here (not in the engine Palette) so the marker color is a style constant.
export const HIGHLIGHTER_INK = "rgba(255, 214, 64, 0.62)";

// Page tint sitting just under the card — a hair cooler than the card so the card lifts.
export const PAGE_BG = "#f0eee8";

export const buildPalette = (accent: string): Palette => ({
  bg: PAGE_BG, // the FHD page behind the card
  surface: "#faf9f6", // the article card — light / near-white
  text: "#15130f", // near-black editorial ink
  textMuted: "#5b554b", // dek / body / credits
  accent, // brand accent — kicker, rule, credit dot
  accentAlt: "#cfc8ba", // hairline borders / dividers
});
