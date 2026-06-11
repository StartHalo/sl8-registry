// <PixelDissolve> — the signature of this style. An overlay grid of small square-ish
// blocks covers the text underneath; as local scene progress p runs 0→1 over the FIRST
// ~40% of the scene, each cell flips from opaque (covering the text) to transparent in a
// SEEDED pseudo-random order, dissolving like a mosaic/dither wipe to reveal the text.
//
// 100% frame-driven + deterministic: each cell's reveal threshold comes from
// noise(seed, cellIndex, salt) (engine/rng), so two renders are byte-identical. No CSS
// transitions/keyframes, no timers, no Math.random. The text sits beneath at full layout.

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { noise } from "../../engine/rng";

export interface PixelDissolveProps {
  cols: number; // grid columns
  rows: number; // grid rows
  color: string; // block fill (covers the text)
  edgeColor: string; // accent tint flashed on the trailing edge of a clearing block
  seed: number; // deterministic threshold seed
  salt?: number; // per-scene salt so different scenes scatter differently
  duration: number; // scene length in frames (drives local progress p)
  clearAt?: number; // fraction of the scene by which ALL blocks are gone (default 0.4)
  fadeFrames?: number; // per-block soft fade window (in p units, fraction of scene)
  radius?: number; // block corner radius (px)
}

export const PixelDissolve: React.FC<PixelDissolveProps> = ({
  cols,
  rows,
  color,
  edgeColor,
  seed,
  salt = 0,
  duration,
  clearAt = 0.4,
  fadeFrames = 0.06,
  radius = 0,
}) => {
  const frame = useCurrentFrame();
  // Local scene progress 0→1; blocks must all clear by `clearAt` of the scene.
  const p = interpolate(frame, [0, Math.max(1, duration)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Remap so the dissolve completes by `clearAt` (the rest of the scene is clean text).
  const reveal = interpolate(p, [0, Math.max(0.05, clearAt)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cells: React.ReactNode[] = [];
  const w = 100 / cols;
  const h = 100 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      // Threshold in [0,1): the moment (in `reveal` units) this block disappears.
      const threshold = noise(seed, idx, salt + 101);
      // Opacity 1 while reveal < threshold; soft-fades to 0 across `fadeFrames`.
      const a = interpolate(reveal, [threshold, threshold + fadeFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      if (a <= 0.001) continue; // block fully cleared — skip (and let text show)
      // Trailing-edge accent flash: the block tints toward the accent right as it clears.
      const edge = interpolate(a, [0, 0.4], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      cells.push(
        <div
          key={idx}
          style={{
            position: "absolute",
            left: `${c * w}%`,
            top: `${r * h}%`,
            width: `${w}%`,
            height: `${h}%`,
            backgroundColor: edge > 0.02 ? edgeColor : color,
            opacity: a,
            borderRadius: radius,
          }}
        />,
      );
    }
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>{cells}</AbsoluteFill>
  );
};
