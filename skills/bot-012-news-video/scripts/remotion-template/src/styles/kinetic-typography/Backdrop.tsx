// <Backdrop> — the shared, continuously-evolving stage for Kinetic Typography.
// Replaces the old per-beat gradient JUMPS with one gradient that smoothly drifts across
// the whole clip, plus a slow accent "aurora" blob, an accent glow, a focus vignette, and
// a static film grain. Lives BEHIND the <TransitionSeries> so scenes cross-fade over a
// continuous background. Fully frame-driven + deterministic (grain seeded; no randomness).

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    .toString(16)
    .padStart(2, "0");
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${a}` : hex;
};

export const Backdrop: React.FC<{
  top: string;
  bottom: string;
  accent: string;
  accentAlt: string;
  seed: number;
}> = ({ top, bottom, accent, accentAlt, seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const at = (a: number, b: number) =>
    interpolate(frame, [0, Math.max(1, durationInFrames)], [a, b], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const angle = at(118, 166); // slow smooth angle drift across the whole clip
  const glowX = at(40, 60);
  const glowY = at(36, 50);
  const auroraX = at(22, 76); // accent blob drifts corner-to-corner
  const auroraY = at(72, 30);

  const glowSoft = withAlpha(accent, 0.16);
  const auroraSoft = withAlpha(accentAlt, 0.22);

  return (
    <AbsoluteFill>
      {/* base gradient */}
      <AbsoluteFill style={{ background: `linear-gradient(${angle}deg, ${top} 0%, ${bottom} 100%)` }} />
      {/* drifting accent aurora */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(42% 40% at ${auroraX}% ${auroraY}%, ${auroraSoft} 0%, rgba(0,0,0,0) 70%)`,
          filter: "blur(38px)",
        }}
      />
      {/* accent glow */}
      <AbsoluteFill
        style={{ background: `radial-gradient(120% 90% at ${glowX}% ${glowY}%, ${glowSoft} 0%, rgba(0,0,0,0) 58%)` }}
      />
      {/* focus vignette */}
      <AbsoluteFill
        style={{ background: "radial-gradient(135% 120% at 50% 44%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.5) 100%)" }}
      />
      {/* static film grain — deterministic via seed; subtle overlay */}
      <AbsoluteFill style={{ opacity: 0.05, mixBlendMode: "overlay", pointerEvents: "none" }}>
        <svg width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <filter id={`grain-${seed}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} stitchTiles="stitch" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
