// <Backdrop> — the soft premium stage for Blur Carousel. A pale brand-tinted gradient with
// ONE faint diagonal sheen that drifts slowly across the whole clip, plus a barely-there
// accent wash in a corner and a gentle vignette to focus the eye. No grain (the look is
// clean studio paper, not film). Fully frame-driven + deterministic — the sheen position is
// a pure interpolate over the clip, the seed only nudges its phase so two clips differ.

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { noise } from "../../engine/rng";

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
  const at = (a: number, b: number): number =>
    interpolate(frame, [0, Math.max(1, durationInFrames)], [a, b], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // Seed only shifts the STARTING phase of the sheen so different clips aren't identical,
  // but the motion is still a clean monotonic drift (deterministic, no per-frame noise read).
  const phase = noise(seed, 0, 41) * 18; // 0..18deg phase offset
  const angle = at(112 + phase, 150 + phase); // very slow angle drift
  const sheenX = at(18, 84); // diagonal sheen sweeps left → right across the clip
  const sheenY = at(26, 70);
  const washX = at(80, 64); // faint accent wash breathes in the corner

  const sheen = withAlpha("#FFFFFF", 0.5);
  const washSoft = withAlpha(accentAlt, 0.1);
  const accentSoft = withAlpha(accent, 0.07);

  return (
    <AbsoluteFill>
      {/* base premium gradient */}
      <AbsoluteFill style={{ background: `linear-gradient(${angle}deg, ${top} 0%, ${bottom} 100%)` }} />
      {/* faint brand wash in a drifting corner */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 55% at ${washX}% 22%, ${washSoft} 0%, rgba(0,0,0,0) 70%)`,
          filter: "blur(48px)",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 60% at 18% 88%, ${accentSoft} 0%, rgba(0,0,0,0) 72%)`,
          filter: "blur(48px)",
        }}
      />
      {/* moving sheen — a soft elongated highlight that drifts diagonally */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(38% 120% at ${sheenX}% ${sheenY}%, ${sheen} 0%, rgba(255,255,255,0) 60%)`,
          mixBlendMode: "soft-light",
          opacity: 0.7,
        }}
      />
      {/* gentle vignette to settle the edges */}
      <AbsoluteFill
        style={{ background: "radial-gradient(125% 115% at 50% 46%, rgba(0,0,0,0) 60%, rgba(28,26,23,0.1) 100%)" }}
      />
    </AbsoluteFill>
  );
};
