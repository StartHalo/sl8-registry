// Breaking News Broadcast palette. Deep charcoal/navy plate, broadcast RED accent,
// white text. The accent is overridden at runtime by brand.accent (see buildPalette);
// these are the fallbacks for a flat, self-contained, image-free plate.

import type { Palette } from "../../engine/StyleConfig";

// CNN "Russian Red" — the canonical breaking-news urgency red — is the default when
// brand.accent isn't supplied. The bg is a near-black charcoal with a navy lean.
export const BROADCAST_RED = "#C8102E";
export const BROADCAST_NAVY = "#0B1B33";

// A short hex (#RGB or #RRGGBB) sanity check so a malformed accent can't poison the
// whole plate; falls back to the broadcast red.
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const safeHex = (c: string | null | undefined, fallback: string): string =>
  c && HEX.test(c.trim()) ? c.trim() : fallback;

export interface BrandColors {
  accent: string;
  accentAlt?: string | null;
}

// The frozen base plate. Everything legible against `bg` / `surface`.
export const BASE_PALETTE: Palette = {
  bg: "#0A0E14", // deep charcoal-navy
  surface: "#101722", // slightly lighter plate for the ticker / bug chips
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.74)",
  accent: BROADCAST_RED,
  accentAlt: BROADCAST_NAVY,
};

// Fold the runtime brand colors onto the base plate. Only accent/accentAlt move;
// the dark plate + white text are fixed (that's what makes it read as broadcast).
export const buildPalette = (brand: BrandColors): Palette => ({
  ...BASE_PALETTE,
  accent: safeHex(brand.accent, BROADCAST_RED),
  accentAlt: safeHex(brand.accentAlt ?? null, BROADCAST_NAVY),
});

// A darker shade of the accent for the inset bevel under the red slabs. We can't do
// real color math on an arbitrary hex cheaply/deterministically without a parser, so
// we layer a translucent black over the accent instead (handled inline where needed).
export const BEVEL = "rgba(0,0,0,0.28)";
