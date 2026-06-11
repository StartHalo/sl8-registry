// Box Reveal palette: a crisp, editorial, high-contrast stage where solid colored blocks
// sweep across each word to reveal it. The canvas is a clean near-black so the block
// reveals pop. The brand accent drives the emphasis-word blocks and the hero-stat block;
// normal words are revealed by a neutral light block. `buildPalette` is pure — no
// randomness, no frame access — so two renders are byte-identical.

import type { Palette } from "../../engine/StyleConfig";

export interface BoxRevealBrand {
  accent: string;
  accentAlt?: string | null;
}

// Solid stage tokens. Kept a plain bag; any gradient/grain is composed at render time.
export const STAGE = {
  bg: "#0B0B0D", // master backdrop (matches AbsoluteFill bg) — clean near-black
  panel: "#101013", // a hair lighter for the subtle textured panel
  text: "#F4F4F2", // off-white word color (revealed under the blocks)
  textMuted: "#8A8A93", // dateline / secondary meta
  // Neutral block that wipes across NORMAL words. A light slab on the dark stage so the
  // wipe reads as an editorial "redaction bar" sweeping off the word.
  neutralBlock: "#EDEDEB",
  // Ink the word is painted in WHILE still under a light neutral block (so it never
  // disappears against it before the block clears).
  inkOnLight: "#0B0B0D",
} as const;

export function buildPalette(brand: BoxRevealBrand): Palette {
  const accent = brand.accent || "#FF4D2E";
  const accentAlt = brand.accentAlt || accent;
  return {
    bg: STAGE.bg,
    surface: STAGE.panel,
    text: STAGE.text,
    textMuted: STAGE.textMuted,
    accent,
    accentAlt,
  };
}
