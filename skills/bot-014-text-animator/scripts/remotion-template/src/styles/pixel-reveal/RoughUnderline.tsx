// <RoughUnderline> — a hand-drawn (roughjs) underline that "draws in" left→right.
//
// The Drawable is generated ONCE per (width/height/seed) at useMemo level with a FIXED
// `seed` option, so the squiggle geometry is byte-deterministic — roughjs never reads
// Math.random here because we pin its seed. We then animate ONLY a strokeDashoffset over
// frames (pathLength is normalized to 1) to reveal the stroke like an ink pen. No
// per-frame jitter, no CSS transitions/keyframes — purely useCurrentFrame()-driven.

import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import rough from "roughjs";
import { hashStr } from "../../engine/rng";

export interface RoughUnderlineProps {
  width: number; // px span to underline
  color: string;
  strokeWidth: number;
  seed: number; // deterministic jitter seed (combined with the phrase hash)
  phrase: string; // the underlined text — feeds the rough seed so each phrase differs
  startFrame: number; // when the draw begins (local frame)
  drawFrames: number; // how long the draw takes
  roughness?: number;
  height?: number; // SVG band height (room for the squiggle bow)
}

// Build a slightly-bowed two-stroke rough line as an SVG path string. Pinning rough's
// `seed` makes the output identical across renders for the same inputs.
function buildPath(width: number, height: number, roughSeed: number, roughness: number): string {
  const gen = rough.generator();
  const midY = height / 2;
  // A gentle bow on the baseline so it reads as a hand pen-stroke, not a ruler line.
  const drawable = gen.line(2, midY + height * 0.18, Math.max(4, width - 2), midY - height * 0.06, {
    roughness,
    bowing: 2.2,
    strokeWidth: 1, // geometry only; visual width comes from the rendered <path>
    seed: roughSeed,
    disableMultiStroke: false,
    preserveVertices: false,
  });
  const paths = gen.toPaths(drawable);
  return paths.map((p) => p.d).join(" ");
}

export const RoughUnderline: React.FC<RoughUnderlineProps> = ({
  width,
  color,
  strokeWidth,
  seed,
  phrase,
  startFrame,
  drawFrames,
  roughness = 1.4,
  height,
}) => {
  const frame = useCurrentFrame();
  const w = Math.max(8, Math.round(width));
  const band = Math.max(10, Math.round(height ?? strokeWidth * 4));
  // Deterministic rough seed from the global seed + the phrase, clamped to a 31-bit int.
  const roughSeed = ((seed ^ hashStr(phrase)) >>> 1) % 2147483647 || 1;

  const d = React.useMemo(
    () => buildPath(w, band, roughSeed, roughness),
    [w, band, roughSeed, roughness],
  );

  // Reveal: dashoffset 1→0 over the draw window (pathLength normalized to 1).
  const draw = interpolate(frame, [startFrame, startFrame + drawFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <svg
      width={w}
      height={band}
      viewBox={`0 0 ${w} ${band}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={draw}
        style={{ filter: `drop-shadow(0 0 ${Math.round(strokeWidth * 1.4)}px ${color}88)` }}
      />
    </svg>
  );
};
