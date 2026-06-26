// Deterministic, headless-safe font loading + FONT PACKS. loadFont() is called at MODULE
// TOP LEVEL (never inside a component); Remotion's renderer blocks frame capture until every
// registered font is ready, so no fallback-face flicker. research/model-evaluation.md §3.
//
// Each style draws with three ROLES (read via useStyleConfig().font), never a hardcoded family:
//   body       a readable sans (UI/labels/credits)
//   display    a characterful headline face (serif or distinctive) — serif in the default pack
//   condensed  a tall/condensed caps face for big-impact lines (kinetic, breaking-news, box, giant)
//
// A FONT PACK is a {body, display, condensed} triple. The render picks a pack via props.fontPack
// (default "modern"); the developer can choose another pack or rely on the default. All packs'
// families are loaded here at module level so any pack is render-ready (deterministic).

import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadDMSerif } from "@remotion/google-fonts/DMSerifDisplay";

const inter = loadInter("normal", { weights: ["400", "700", "800"], subsets: ["latin"] });
const fraunces = loadFraunces("normal", { weights: ["400", "600", "900"], subsets: ["latin"] });
const oswald = loadOswald("normal", { weights: ["500", "700"], subsets: ["latin"] });
const manrope = loadManrope("normal", { weights: ["400", "700", "800"], subsets: ["latin"] });
const playfair = loadPlayfair("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const bebas = loadBebas("normal", { weights: ["400"], subsets: ["latin"] });
const spaceGrotesk = loadSpaceGrotesk("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
const dmSerif = loadDMSerif("normal", { weights: ["400"], subsets: ["latin"] });

export interface FontSet {
  body: string;
  display: string;
  condensed: string;
}

export type FontPackName = "modern" | "editorial" | "bold" | "tech";

// Curated pairings. Roles are kept consistent (body=sans, display=headline, condensed=caps)
// so every style reads well in any pack; only the personality changes.
export const FONT_PACKS: Record<FontPackName, FontSet> = {
  // Clean grotesque + premium serif + broadcast condensed. The default.
  modern: { body: inter.fontFamily, display: fraunces.fontFamily, condensed: oswald.fontFamily },
  // Refined magazine: geometric sans + high-contrast Playfair serif.
  editorial: { body: manrope.fontFamily, display: playfair.fontFamily, condensed: oswald.fontFamily },
  // High-impact: heavy Anton display + tall Bebas Neue caps.
  bold: { body: inter.fontFamily, display: anton.fontFamily, condensed: bebas.fontFamily },
  // Modern/techy: Space Grotesk + a dramatic DM Serif Display accent.
  tech: { body: spaceGrotesk.fontFamily, display: dmSerif.fontFamily, condensed: oswald.fontFamily },
};

export const DEFAULT_FONT_PACK: FontPackName = "modern";

export function resolveFontPack(name?: string | null): FontSet {
  const key = (name ?? "").toLowerCase().trim() as FontPackName;
  return FONT_PACKS[key] ?? FONT_PACKS[DEFAULT_FONT_PACK];
}

// Back-compat: the default pack as a flat object (older code imported `FONT`).
export const FONT: FontSet = FONT_PACKS[DEFAULT_FONT_PACK];

// Only needed to coordinate readiness OUTSIDE the normal render flow (e.g. a test harness).
// Inside `remotion render`, the engine already blocks on every registered font.
export const fontsReady = Promise.all([
  inter.waitUntilDone(),
  fraunces.waitUntilDone(),
  oswald.waitUntilDone(),
  manrope.waitUntilDone(),
  playfair.waitUntilDone(),
  anton.waitUntilDone(),
  bebas.waitUntilDone(),
  spaceGrotesk.waitUntilDone(),
  dmSerif.waitUntilDone(),
]);
