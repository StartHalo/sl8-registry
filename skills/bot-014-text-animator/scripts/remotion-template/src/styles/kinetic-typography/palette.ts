// Kinetic Typography palette: dark, high-contrast canvas for huge word-by-word type.
// The brand accent (and optional accentAlt) drive the emphasis color-pop and the
// per-beat gradient. Everything else is a fixed near-black stage so light text and
// the accent stay legible. `buildPalette` is pure — no randomness, no frame access.

import type { Palette } from "../../engine/StyleConfig";

export interface KineticBrand {
  accent: string;
  accentAlt?: string | null;
}

// Solid stage colors. The gradient itself is composed at render time in index.tsx
// from these stops plus the accent, so the palette stays a plain token bag.
export const STAGE = {
  bg: "#0A0A0F", // master backdrop (matches AbsoluteFill bg)
  gradientTop: "#16161F", // top of the per-beat linear gradient
  gradientBottom: "#070709", // bottom of the per-beat linear gradient
  surface: "#1B1B24",
  text: "#FFFFFF",
  textMuted: "#A6A6B4",
} as const;

export function buildPalette(brand: KineticBrand): Palette {
  const accent = brand.accent || "#FACC15";
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
