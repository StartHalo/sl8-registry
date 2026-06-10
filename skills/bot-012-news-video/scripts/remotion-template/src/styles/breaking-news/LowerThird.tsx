// LowerThird — two-tier broadcast banner.
//   Tier 1 (headline): white slab, dark ink text, the news line.
//   Tier 2 (kicker/source): red slab, ALL-CAPS — category + source credit.
// Reveals with a left→right clip-path inset() wipe + a small translateX settle; the
// two tiers are staggered. It auto-exits by reversing the wipe near the end of its
// window. All timing is local-frame, so wrap this in a <Sequence> at the call site.

import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useStyleConfig } from "../../engine/StyleConfig";
import { BEVEL } from "./palette";

const REVEAL = Easing.bezier(0.16, 1, 0.3, 1); // crisp UI entrance

export const LowerThird: React.FC<{
  headline: string;
  kicker: string; // ALL-CAPS category line (already non-empty)
  durationInFrames: number; // length of this banner's Sequence
}> = ({ headline, kicker, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { palette, font, size, orientation } = useStyleConfig();

  const isPortrait = orientation === "portrait";

  // ---- timing windows (local frames) ----
  const IN_END = 18;
  const OUT_START = Math.max(IN_END + 6, durationInFrames - 18);
  const OUT_END = durationInFrames;

  // headline tier reveal: 0 hidden → 1 shown → 0 hidden
  const reveal = interpolate(frame, [0, IN_END, OUT_START, OUT_END], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: REVEAL,
  });
  // kicker tier lags ~6 frames for a stagger
  const kickerReveal = interpolate(frame, [6, IN_END + 6, OUT_START, OUT_END], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: REVEAL,
  });

  // clip-path inset(top right bottom left): RIGHT inset 100%→0% = wipe L→R.
  const clipR = (1 - reveal) * 100;
  const clipRK = (1 - kickerReveal) * 100;
  // horizontal settle so it isn't a flat curtain.
  const tx = (1 - reveal) * -24;

  // Type: headline at headline-class; bump on portrait so it reads small-physical.
  const headlineSize = isPortrait ? Math.round(size("headline") * 1.06) : size("headline");
  const kickerSize = size("kicker");
  const accentBar = Math.max(8, Math.round(headlineSize * 0.16));

  // Allow the headline to wrap to a few lines on portrait; keep tighter on landscape.
  const maxLines = isPortrait ? 3 : 2;

  return (
    <div
      style={{
        transform: `translateX(${tx}px)`,
        fontFamily: font.body,
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.45))",
        maxWidth: "100%",
      }}
    >
      {/* HEADLINE TIER (white slab) */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          clipPath: `inset(0% ${clipR}% 0% 0%)`,
        }}
      >
        <div style={{ width: accentBar, background: palette.accent, flex: "0 0 auto" }} />
        <div
          style={{
            background: palette.text,
            color: palette.bg,
            padding: `${Math.round(headlineSize * 0.34)}px ${Math.round(headlineSize * 0.6)}px`,
            fontFamily: font.condensed,
            fontWeight: 700,
            fontSize: headlineSize,
            letterSpacing: 0.2,
            lineHeight: 1.06,
            // cap the slab width so it never spills past the safe band; wrap instead.
            maxWidth: Math.round(width * (isPortrait ? 0.86 : 0.74)),
            display: "-webkit-box",
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {headline}
        </div>
      </div>

      {/* KICKER / SOURCE TIER (red slab, ALL-CAPS) */}
      <div
        style={{
          marginLeft: accentBar,
          display: "inline-block",
          maxWidth: Math.round(width * (isPortrait ? 0.86 : 0.74)),
          background: palette.accent,
          color: palette.text,
          padding: `${Math.round(kickerSize * 0.42)}px ${Math.round(kickerSize * 0.9)}px`,
          fontFamily: font.condensed,
          fontWeight: 700,
          fontSize: kickerSize,
          letterSpacing: Math.max(2, Math.round(kickerSize * 0.12)),
          textTransform: "uppercase",
          lineHeight: 1.15,
          boxShadow: `inset 0 -3px 0 ${BEVEL}`,
          clipPath: `inset(0% ${clipRK}% 0% 0%)`,
          whiteSpace: "normal",
          overflow: "hidden",
        }}
      >
        {kicker}
      </div>
    </div>
  );
};
