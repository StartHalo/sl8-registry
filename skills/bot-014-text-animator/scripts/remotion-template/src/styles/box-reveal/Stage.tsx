// <Stage> — the clean, minimal backdrop for Box Reveal. A flat near-black canvas with a
// barely-there static grain and a very soft accent wash anchored to a corner, plus a
// subtle focus vignette. Deliberately understated so the solid block reveals pop against
// it. Sits BEHIND the <TransitionSeries>. Fully frame-driven + deterministic (grain seeded;
// the accent wash drifts only a few percent across the clip — no randomness, no timers).

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    .toString(16)
    .padStart(2, "0");
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${a}` : hex;
};

export const Stage: React.FC<{
  bg: string;
  panel: string;
  accent: string;
  seed: number;
}> = ({ bg, panel, accent, seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const at = (a: number, b: number) =>
    interpolate(frame, [0, Math.max(1, durationInFrames)], [a, b], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const washX = at(12, 26); // accent wash drifts only slightly — stays minimal
  const washY = at(8, 18);
  const washSoft = withAlpha(accent, 0.1);

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {/* faint vertical panel gradient for depth */}
      <AbsoluteFill
        style={{ background: `linear-gradient(180deg, ${panel} 0%, ${bg} 60%, ${bg} 100%)` }}
      />
      {/* soft accent wash anchored top-left, drifting a few percent */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 55% at ${washX}% ${washY}%, ${washSoft} 0%, rgba(0,0,0,0) 70%)`,
        }}
      />
      {/* focus vignette to push the edges down */}
      <AbsoluteFill
        style={{ background: "radial-gradient(130% 120% at 50% 46%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.55) 100%)" }}
      />
      {/* static film grain — deterministic via seed; very subtle overlay */}
      <AbsoluteFill style={{ opacity: 0.04, mixBlendMode: "overlay", pointerEvents: "none" }}>
        <svg width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <filter id={`brgrain-${seed}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="2"
                seed={seed}
                stitchTiles="stitch"
              />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter={`url(#brgrain-${seed})`} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
