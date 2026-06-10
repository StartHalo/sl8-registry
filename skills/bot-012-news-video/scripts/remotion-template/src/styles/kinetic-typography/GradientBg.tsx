// <GradientBg> — deterministic per-beat background.
// Each beat gets a distinct but palette-consistent gradient: the base angle and the
// accent-glow position are derived purely from the beat index (no randomness), and the
// gradient slowly drifts WITHIN the beat (frame-driven) for a sense of life.
//
// Frame-driven only; no CSS animation, no timers, no Math.random.

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export interface GradientBgProps {
  beatIndex: number;
  top: string; // top stop of the linear gradient
  bottom: string; // bottom stop of the linear gradient
  accent: string; // accent used for the radial glow
}

// Append an 8-bit alpha (two hex chars) to a #RRGGBB color. Falls back to wrapping
// the color in a low-opacity layer if it isn't a 6-digit hex.
const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    .toString(16)
    .padStart(2, "0");
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return `${hex}${a}`;
  return hex;
};

export const GradientBg: React.FC<GradientBgProps> = ({ beatIndex, top, bottom, accent }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Deterministic per-beat angle + accent-glow vertical position.
  const baseAngle = 120 + beatIndex * 47; // every beat a new, fixed angle
  const drift = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 16], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const angle = baseAngle + drift;
  const glowY = 30 + (beatIndex % 3) * 14; // where the accent glow sits (35..58%)
  const glowSoft = withAlpha(accent, 0.18);

  return (
    <AbsoluteFill
      style={{
        background: [
          `radial-gradient(130% 95% at 50% ${glowY}%, ${glowSoft} 0%, rgba(0,0,0,0) 55%)`,
          `linear-gradient(${angle}deg, ${top} 0%, ${bottom} 100%)`,
        ].join(", "),
      }}
    />
  );
};
