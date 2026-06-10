// Bug + Clock — top-right corner identity chip (brand/source label) plus a running
// clock. The clock is derived ENTIRELY from useCurrentFrame() and a deterministic
// start-of-day seeded by `seed` — never new Date() / Date.now() / the wall clock.
// One video second = fps frames; the clock ticks one second per fps frames.

import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useStyleConfig } from "../../engine/StyleConfig";
import { mulberry32 } from "../../engine/rng";

const two = (n: number) => n.toString().padStart(2, "0");

// A deterministic "on-air" start time in seconds-since-midnight, chosen from the seed
// so different stories show different (but reproducible) clock readings.
const seededStartSeconds = (seed: number): number => {
  const r = mulberry32(seed >>> 0);
  const hour = 8 + Math.floor(r() * 12); // 08:00–19:59 — a plausible broadcast window
  const minute = Math.floor(r() * 60);
  const second = Math.floor(r() * 60);
  return hour * 3600 + minute * 60 + second;
};

export const Bug: React.FC<{
  label: string;
  seed: number;
  /** Frame at which the bug fades in (local to the parent AbsoluteFill). */
  delay?: number;
}> = ({ label, seed, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palette, font, size, orientation } = useStyleConfig();

  const opacity = interpolate(frame - delay, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Advance the clock by whole seconds elapsed since the seeded start.
  const elapsed = Math.floor(frame / fps);
  const total = (seededStartSeconds(seed) + elapsed) % 86400;
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;

  const labelSize = orientation === "landscape" ? size("meta") : Math.round(size("meta") * 1.1);
  const clockSize = Math.round(labelSize * 0.92);
  const accentBar = Math.max(3, Math.round(labelSize * 0.18));

  return (
    <div
      style={{
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: Math.round(labelSize * 0.32),
      }}
    >
      {/* identity chip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: Math.round(labelSize * 0.4),
          background: "rgba(10,14,20,0.78)",
          padding: `${Math.round(labelSize * 0.32)}px ${Math.round(labelSize * 0.55)}px`,
          borderRadius: 4,
          borderLeft: `${accentBar}px solid ${palette.accent}`,
        }}
      >
        <span
          style={{
            fontFamily: font.condensed,
            fontWeight: 700,
            color: palette.text,
            fontSize: labelSize,
            letterSpacing: Math.max(1.5, Math.round(labelSize * 0.07)),
            textTransform: "uppercase",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>
      {/* running clock */}
      <div
        style={{
          fontFamily: font.body,
          fontWeight: 700,
          color: palette.text,
          fontVariantNumeric: "tabular-nums",
          fontSize: clockSize,
          background: palette.accent,
          padding: `${Math.round(clockSize * 0.22)}px ${Math.round(clockSize * 0.5)}px`,
          borderRadius: 3,
          letterSpacing: 1,
          lineHeight: 1,
        }}
      >
        {two(hh)}:{two(mm)}:{two(ss)}
      </div>
    </div>
  );
};
