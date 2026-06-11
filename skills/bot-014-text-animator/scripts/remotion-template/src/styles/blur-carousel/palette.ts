// Blur Carousel palette — an elegant, premium light-leaning canvas (think editorial cover
// page / luxury brand) so the soft blur-swaps read as "out of focus → into focus" rather
// than as fades on black. The brand accent drives the active-item highlight and the hero
// stat; everything else is a refined warm-neutral paper with generous negative space.
//
// `buildPalette` is PURE — no randomness, no frame access. The gradient stops below are
// composed at render time in index.tsx; this stays a plain token bag.

import type { Palette } from "../../engine/StyleConfig";

export interface BlurBrand {
  accent: string;
  accentAlt?: string | null;
}

// Soft "studio paper" stage. A faint brand tint is layered over these at render time so the
// canvas feels owned by the brand without ever fighting the type for contrast.
export const STAGE = {
  bg: "#F4F1EC", // master backdrop (matches AbsoluteFill bg) — warm off-white
  gradientTop: "#FBFAF7", // top of the premium gradient (lifted highlight)
  gradientBottom: "#E7E2D9", // bottom of the premium gradient (soft shadow)
  surface: "#FFFFFF", // list-card surface
  text: "#1C1A17", // near-black ink
  textMuted: "#8A857C", // muted stone for labels/credits
} as const;

// Relative luminance of an #rrggbb hex (sRGB-ish), used to decide if an accent is light
// enough that it needs darkening before it sits on the pale paper. Pure + deterministic.
const luminance = (hex: string): number => {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

// Darken a hex toward black by `amt` (0..1). Pure.
export const darken = (hex: string, amt: number): string => {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amt));
  const g = Math.round(((n >> 8) & 255) * (1 - amt));
  const b = Math.round((n & 255) * (1 - amt));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

export function buildPalette(brand: BlurBrand): Palette {
  const raw = brand.accent || "#B4532A";
  // On pale paper a very light accent (e.g. pale yellow) would vanish — clamp it darker so
  // emphasis + the hero stat always carry weight.
  const accent = luminance(raw) > 0.62 ? darken(raw, 0.32) : raw;
  const altRaw = brand.accentAlt || accent;
  const accentAlt = luminance(altRaw) > 0.62 ? darken(altRaw, 0.28) : altRaw;
  return {
    bg: STAGE.bg,
    surface: STAGE.surface,
    text: STAGE.text,
    textMuted: STAGE.textMuted,
    accent,
    accentAlt,
  };
}
