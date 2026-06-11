// BreakingFlag — top-left red slab "BREAKING NEWS" that slides in from the left, with
// a pulsing white "live" dot. All motion is a pure function of useCurrentFrame();
// the pulse is a sine of frame (deterministic — never Math.random / wall-clock).

import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { useStyleConfig } from "../../engine/StyleConfig";
import { BEVEL } from "./palette";

export const BreakingFlag: React.FC<{
  label: string;
  /** Frame at which the flag begins to slide in (local to the parent AbsoluteFill). */
  delay?: number;
}> = ({ label, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { palette, font, size, orientation } = useStyleConfig();

  const t = frame - delay;
  const slideIn = interpolate(t, [0, 12], [-60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(t, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Deterministic pulse for the live dot — pure sine of the global frame.
  const pulse = 0.5 + 0.5 * Math.sin(frame / 5);

  // Kicker-class type, floored for legibility; a touch larger on portrait/square so it
  // still reads at small physical size.
  const fontSize = orientation === "landscape" ? size("kicker") : Math.round(size("kicker") * 1.15);
  const dot = Math.round(fontSize * 0.7);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.round(fontSize * 0.6),
        transform: `translateX(${slideIn}px)`,
        opacity,
        background: palette.accent,
        color: palette.text,
        padding: `${Math.round(fontSize * 0.55)}px ${Math.round(fontSize * 0.95)}px`,
        fontFamily: font.condensed,
        fontWeight: 700,
        fontSize,
        letterSpacing: Math.max(2, Math.round(fontSize * 0.14)),
        textTransform: "uppercase",
        lineHeight: 1,
        boxShadow: `0 6px 20px rgba(0,0,0,0.45), inset 0 -4px 0 ${BEVEL}`,
      }}
    >
      <span
        style={{
          width: dot,
          height: dot,
          borderRadius: "50%",
          background: palette.text,
          opacity: 0.4 + 0.6 * pulse,
          boxShadow: `0 0 ${Math.round(dot * pulse)}px ${palette.text}`,
          flex: "0 0 auto",
        }}
      />
      <span>{label}</span>
    </div>
  );
};
