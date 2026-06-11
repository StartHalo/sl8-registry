// Pixel Reveal palette — a dark "tech stage": near-black with a cool slate cast, a
// faint phosphor-green-adjacent neutral for the grid/scanlines, and the brand accent
// driving the pixel-block cover color, the hand-drawn underline, and the hero stat.
// `buildPalette` is pure — no randomness, no frame access. The actual scanline/grid
// texture is composed at render time in index.tsx from these tokens + the accent.

import type { Palette } from "../../engine/StyleConfig";

export interface PixelBrand {
  accent: string;
  accentAlt?: string | null;
}

// Fixed stage tokens. Kept as a plain bag so the palette stays deterministic; index.tsx
// reads STAGE for the grid/scanline texture and the backdrop gradient stops.
export const STAGE = {
  bg: "#07090D", // master backdrop (matches AbsoluteFill bg) — cool near-black
  panelTop: "#10141C", // top of the subtle stage gradient
  panelBottom: "#05060A", // bottom of the stage gradient
  surface: "#161C26", // raised chip / lower-third surface
  text: "#F2F5FA", // bright off-white for max legibility on dark
  textMuted: "#7E8AA0", // slate-muted for meta/dateline
  grid: "#222C3A", // faint static grid line color
  scan: "#000000", // scanline darkening color (alpha applied at render time)
} as const;

export function buildPalette(brand: PixelBrand): Palette {
  const accent = brand.accent || "#39E6B5"; // retro-terminal teal-green default
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
