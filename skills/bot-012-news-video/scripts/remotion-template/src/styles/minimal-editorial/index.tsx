// Minimal Editorial Card — the SAFE DEFAULT style.
// Clean, premium, calm: a serif display headline on warm paper, a smaller dek, a thin
// rule that wipes in, an optional uppercase kicker + verbatim pull-quote, and a source
// credit. Motion language = gentle eased fades + a very slow whole-card Ken Burns drift.
//
// Renders gracefully from a MINIMAL doc (headline only): dek / dateline / source /
// category / quote are all GUARDED in EditorialCard. Layout & sizing branch on
// orientation and derive from useStyleConfig()/useVideoConfig() — nothing hardcoded.
//
// HARD-RULE compliance:
//  - Exports exactly `export const Root: React.FC<StyleRootProps>`.
//  - Root wrapped in <AbsoluteFill bg><StyleProvider palette={palette}>...</StyleProvider></AbsoluteFill>.
//  - All motion is frame-driven (FadeIn / DividerWipe / KenBurns); no css transitions,
//    no timers, no runtime randomness.
//  - Stays within durationInFrames (KenBurns drift spans the clip; reveal delays clamped).

import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { StyleRootProps } from "../../engine/types";
import { StyleProvider } from "../../engine/StyleConfig";
import { KenBurns } from "../../engine/primitives";
import { editorialPalette, DEFAULT_ACCENT } from "./palette";
import { EditorialCard } from "./EditorialCard";

export const Root: React.FC<StyleRootProps> = ({ doc, brand }) => {
  const { durationInFrames } = useVideoConfig();

  // Resolve accents — accent is required by the contract; accentAlt falls back to accent.
  const accent = brand.accent || DEFAULT_ACCENT;
  const accentAlt = brand.accentAlt ?? accent;
  const palette = editorialPalette(accent, accentAlt);

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <StyleProvider palette={palette}>
        {/* Very slow, near-subliminal push-in over the whole clip. Kept under ~1.5%
            so text edges never shimmer. KenBurns is pure frame math => deterministic. */}
        <KenBurns durationInFrames={durationInFrames} from={1.0} to={1.014}>
          <EditorialCard doc={doc} accent={accent} accentAlt={accentAlt} />
        </KenBurns>
      </StyleProvider>
    </AbsoluteFill>
  );
};
