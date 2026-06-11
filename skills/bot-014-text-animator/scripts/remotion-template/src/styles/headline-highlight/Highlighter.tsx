// Seeded rough.js highlighter marker drawn BEHIND a phrase.
//
// We use the bare `rough.generator()` (no canvas / DOM) → `toPaths()` and emit the
// returned <path d=...> ourselves. The generator is seeded with a FIXED integer so the
// hand-drawn rectangle has byte-identical geometry across every frame and every render —
// the recipe's hard determinism guarantee. Only the left→right reveal (an SVG clipPath
// width) is frame-driven; the marker geometry never changes per frame.

import React from "react";
import rough from "roughjs";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { PathInfo } from "roughjs/bin/core";

// One generator for the whole app — server/worker-safe, needs no DOM or canvas.
const gen = rough.generator();

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HighlighterProps {
  rect: Rect; // target phrase rect, in card-local px
  color: string; // highlighter ink (warm translucent yellow)
  seed: number; // FIXED integer → deterministic, no jitter between renders
  startFrame: number; // when this phrase's sweep begins
  sweepFrames: number; // how long the sweep takes
  padX?: number; // horizontal bleed so the ink overshoots the words
  padY?: number; // vertical bleed
  uid?: string; // unique clipPath id (avoids collisions when a phrase repeats)
}

// Pure, memoizable path generation. Deterministic because `seed` is fixed.
const buildPaths = (
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  seed: number,
): PathInfo[] => {
  const drawable = gen.rectangle(x, y, w, h, {
    seed,
    roughness: 1.5, // hand-drawn wobble; >1 = looser
    bowing: 1.1, // line bow
    fill: color,
    fillStyle: "zigzag", // marker-like ink strokes
    fillWeight: Math.max(5, Math.round(h * 0.16)), // ink thickness scales with phrase height
    hachureAngle: -8, // slight tilt of the strokes
    hachureGap: Math.max(4, Math.round(h * 0.12)), // stroke density scales with height
    stroke: "none", // no outline — pure highlighter fill
    disableMultiStroke: true,
  });
  return gen.toPaths(drawable);
};

export const Highlighter: React.FC<HighlighterProps> = ({
  rect,
  color,
  seed,
  startFrame,
  sweepFrames,
  padX = 8,
  padY = 5,
  uid,
}) => {
  const frame = useCurrentFrame();

  // Inflate the rect a touch so the marker reads like a real highlighter (overshoot).
  const x = rect.x - padX;
  const y = rect.y - padY;
  const w = rect.width + padX * 2;
  const h = rect.height + padY * 2;

  const paths = React.useMemo(
    () => buildPaths(x, y, w, h, color, seed),
    [x, y, w, h, color, seed],
  );

  // Left→right reveal: animate the width of a clip rect from 0 to full.
  const revealW = interpolate(frame, [startFrame, startFrame + sweepFrames], [0, w], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

  // Stable id (NEVER Math.random) so SSR/headless ids match; uid keeps repeats unique.
  const clipId = `hl-${uid ?? `${seed}-${Math.round(x)}-${Math.round(y)}`}`;

  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={revealW} height={h} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={p.fill ?? "none"}
            stroke={p.stroke === "none" ? "none" : p.stroke}
            strokeWidth={p.strokeWidth}
          />
        ))}
      </g>
    </svg>
  );
};
