// <Stage> — the dark "tech stage" backdrop for Pixel Reveal: a cool near-black gradient
// + a faint STATIC grid (CSS repeating gradients, AR-scaled density) + horizontal
// scanlines + a soft accent glow that slowly drifts + a focus vignette + deterministic
// grain. Lives BEHIND the <TransitionSeries> so scenes cross-fade over one continuous
// background. Fully frame-driven + deterministic (grain seeded; only the glow drifts).

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const Stage: React.FC<{
  top: string;
  bottom: string;
  gridColor: string;
  accent: string;
  seed: number;
  cell: number; // grid cell size in px (AR-scaled by the caller)
}> = ({ top, bottom, gridColor, accent, seed, cell }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const at = (a: number, b: number) =>
    interpolate(frame, [0, Math.max(1, durationInFrames)], [a, b], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const glowX = at(34, 64); // accent glow drifts across the clip
  const glowY = at(30, 52);
  const scan = Math.max(3, Math.round(cell * 0.22)); // scanline period

  return (
    <AbsoluteFill>
      {/* base stage gradient */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)` }} />

      {/* static tech grid — two repeating linear gradients (vertical + horizontal lines) */}
      <AbsoluteFill
        style={{
          backgroundImage:
            `repeating-linear-gradient(90deg, ${gridColor} 0px, ${gridColor} 1px, transparent 1px, transparent ${cell}px),` +
            `repeating-linear-gradient(0deg, ${gridColor} 0px, ${gridColor} 1px, transparent 1px, transparent ${cell}px)`,
          opacity: 0.5,
          maskImage: "radial-gradient(120% 110% at 50% 46%, #000 38%, transparent 92%)",
          WebkitMaskImage: "radial-gradient(120% 110% at 50% 46%, #000 38%, transparent 92%)",
        }}
      />

      {/* CRT scanlines */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,0.32) 0px, rgba(0,0,0,0.32) 1px, transparent 1px, transparent ${scan}px)`,
          opacity: 0.5,
          mixBlendMode: "multiply",
        }}
      />

      {/* drifting accent glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 60% at ${glowX}% ${glowY}%, ${accent}26 0%, rgba(0,0,0,0) 60%)`,
          filter: "blur(36px)",
        }}
      />

      {/* focus vignette */}
      <AbsoluteFill
        style={{ background: "radial-gradient(135% 120% at 50% 46%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)" }}
      />

      {/* deterministic static grain (seeded feTurbulence) */}
      <AbsoluteFill style={{ opacity: 0.05, mixBlendMode: "overlay", pointerEvents: "none" }}>
        <svg width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <filter id={`px-grain-${seed}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter={`url(#px-grain-${seed})`} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
