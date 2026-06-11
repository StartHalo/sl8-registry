// Perspective-3D palette: a deep, brand-tinted cinematic stage for text laid on a
// tilted 3D floor. Filmic and calm — near-black background, restrained warm-white type,
// the brand accent reserved for the low "horizon" glow, key phrases, and the hero stat.
// `buildPalette` is pure — no randomness, no frame access.

import type { Palette } from "../../engine/StyleConfig";

export interface PerspectiveBrand {
  accent: string;
  accentAlt?: string | null;
}

// Fixed cinematic stage tokens. The actual background (gradient + horizon glow + vignette)
// is composed at render time in Stage.tsx from these plus the accent, so the palette stays
// a plain token bag.
export const CINEMA = {
  bg: "#070A10", // master backdrop (matches AbsoluteFill bg)
  gradientTop: "#0B0F18", // top of the deep vertical gradient (the receding "sky"/fog)
  gradientBottom: "#04060B", // bottom of the gradient (the near floor edge)
  surface: "#10141F",
  text: "#F4F1EA", // warm off-white — filmic, easier on the eye than pure white
  textMuted: "#8B93A6",
} as const;

export function buildPalette(brand: PerspectiveBrand): Palette {
  const accent = brand.accent || "#E8B04B";
  const accentAlt = brand.accentAlt || accent;
  return {
    bg: CINEMA.bg,
    surface: CINEMA.surface,
    text: CINEMA.text,
    textMuted: CINEMA.textMuted,
    accent,
    accentAlt,
  };
}
