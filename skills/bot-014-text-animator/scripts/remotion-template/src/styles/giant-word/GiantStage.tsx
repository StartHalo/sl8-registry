// <GiantStage> — the shared near-black stage for the Giant Word style. A large soft
// RADIAL accent glow sits behind the word and PULSES subtly (seeded + frame-driven, never
// wall-clock), a faint accentAlt counter-glow drifts, and a vignette + static film grain
// frame the whole thing. Lives BEHIND the <TransitionSeries> so each scene's slam-in word
// reads over one continuous stage. Fully deterministic — pulse is a pure sine of the frame,
// grain is seeded; NO Math.random, NO CSS animation.

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { noise } from "../../engine/rng";

const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    .toString(16)
    .padStart(2, "0");
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${a}` : hex;
};

export const GiantStage: React.FC<{
  bg: string;
  core: string;
  accent: string;
  accentAlt: string;
  seed: number;
}> = ({ bg, core, accent, accentAlt, seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Two slow seeded phases so the breathing never lines up mechanically across renders.
  const phase = noise(seed, 0, 11) * Math.PI * 2;
  const phase2 = noise(seed, 0, 23) * Math.PI * 2;

  // Subtle breathing pulse: glow radius + intensity oscillate gently. Pure sine of frame.
  const pulse = (Math.sin((frame / 42) + phase) + 1) / 2; // 0..1
  const glowSize = interpolate(pulse, [0, 1], [92, 116]); // % of the radial extent
  const glowAlpha = interpolate(pulse, [0, 1], [0.26, 0.4]);

  // AccentAlt counter-glow drifts corner-to-corner across the whole clip.
  const at = (a: number, b: number) =>
    interpolate(frame, [0, Math.max(1, durationInFrames)], [a, b], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const altX = at(34, 64);
  const altY = at(62, 40);
  const altPulse = (Math.sin((frame / 57) + phase2) + 1) / 2;
  const altAlpha = interpolate(altPulse, [0, 1], [0.1, 0.2]);

  const glow = withAlpha(accent, glowAlpha);
  const altGlow = withAlpha(accentAlt, altAlpha);

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {/* faint inner stage tint so the dead-center isn't pure black under the word */}
      <AbsoluteFill
        style={{ background: `radial-gradient(120% 120% at 50% 50%, ${core} 0%, ${bg} 70%)` }}
      />
      {/* drifting accentAlt counter-glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 42% at ${altX}% ${altY}%, ${altGlow} 0%, rgba(0,0,0,0) 72%)`,
          filter: "blur(46px)",
        }}
      />
      {/* the big breathing accent glow dead-behind the word */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(${glowSize}% ${glowSize}% at 50% 47%, ${glow} 0%, rgba(0,0,0,0) 60%)`,
          filter: "blur(28px)",
        }}
      />
      {/* focus vignette — pulls the eye to the center word */}
      <AbsoluteFill
        style={{ background: "radial-gradient(130% 120% at 50% 48%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.62) 100%)" }}
      />
      {/* static film grain — deterministic via seed; very subtle */}
      <AbsoluteFill style={{ opacity: 0.045, mixBlendMode: "overlay", pointerEvents: "none" }}>
        <svg width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <filter id={`gw-grain-${seed}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter={`url(#gw-grain-${seed})`} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
