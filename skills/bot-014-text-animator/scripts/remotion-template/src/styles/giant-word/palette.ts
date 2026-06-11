// Giant Word palette: a near-black social-first stage built for ONE enormous word at a
// time. The brand accent drives the radial glow behind the word, the emphasis (keyPhrase)
// color-pop, and the hero stat. Everything else is a fixed dark stage so the heavy
// condensed caps and the accent stay loud and legible. `buildPalette` is pure — no
// randomness, no frame access.

import type { Palette } from "../../engine/StyleConfig";

export interface GiantWordBrand {
  accent: string;
  accentAlt?: string | null;
}

// Solid stage tokens. The radial glow + vignette are composed at render time in index.tsx
// from these stops plus the accent, so the palette stays a plain token bag.
export const STAGE = {
  bg: "#060608", // master backdrop (matches AbsoluteFill bg) — near-black
  glowCore: "#0E0E14", // inner stage tint under the glow
  edge: "#020203", // vignette edge color
  surface: "#15151C",
  text: "#FFFFFF",
  textMuted: "#9A9AA8",
} as const;

export function buildPalette(brand: GiantWordBrand): Palette {
  const accent = brand.accent || "#FF3D5A";
  const accentAlt = brand.accentAlt || accent;
  return {
    bg: STAGE.bg,
    surface: STAGE.surface,
    text: STAGE.text,
    textMuted: STAGE.textMuted,
    accent,
    accentAlt,
  };
}
