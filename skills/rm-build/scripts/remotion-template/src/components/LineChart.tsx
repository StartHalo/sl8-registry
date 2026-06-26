// LineChart — exact-figure trend line that draws on (JTBD-2).
//
// Vetted starter shipped by the rm-dataviz skill and composed by rm-build. Contract-clean:
// frame-driven (spring + clamped interpolate), no Math.random / Date.now / setTimeout, no
// CSS transition/@keyframes, themed via the engine (useStyleConfig). The line draws on with
// @remotion/paths `evolvePath` (a stroke-dash reveal keyed to a spring) — NOT a CSS animation.
// EXACT-FIGURE RULE: each datum's `value` drives the line GEOMETRY only; `display` is the
// verbatim figure shown at each point (no rounding). Standalone — depends only on the engine
// + @remotion/paths, so rm-build can drop just this file into a per-project app.
// See ../../../references/dataviz-rules.md (rm-dataviz).

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath } from "@remotion/paths";
import { useStyleConfig } from "../engine/StyleConfig";

/** One bound data point. `value` = numeric magnitude (geometry); `display` = verbatim figure. */
export type Datum = { label: string; value: number; display: string };

/** AR-aware content margins — mirrors engine/SafeZone so the plot stays in the safe zone. */
const marginFor = (w: number, h: number): { top: number; bottom: number; left: number; right: number } => {
  const ar = w / h;
  if (ar < 0.85) return { top: 240, bottom: 300, left: 80, right: 80 }; // portrait
  if (ar <= 1.2) return { top: 120, bottom: 150, left: 96, right: 96 }; // square
  return { top: 120, bottom: 140, left: 130, right: 130 }; // landscape
};

export const LineChart: React.FC<{
  data: Datum[];
  /** Optional chart title (verbatim from the script/concept). */
  title?: string;
  /** Geometry domain. Defaults auto-fit the values with a little headroom. */
  domainMin?: number;
  domainMax?: number;
  /** Frames before the line starts drawing. */
  delay?: number;
  /** Show the exact `display` figure at each point (default true). */
  showValues?: boolean;
  /** Stroke width in px. */
  strokeWidth?: number;
}> = ({ data, title, domainMin, domainMax, delay = 6, showValues = true, strokeWidth = 6 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { palette, font, size } = useStyleConfig();

  const m = marginFor(width, height);
  const titleSpace = title ? size("dek") + 28 : 0;
  const labelSpace = size("meta") + 28;
  const plotLeft = m.left;
  const plotRight = width - m.right;
  const plotTop = m.top + titleSpace;
  const plotBottom = height - m.bottom - labelSpace;
  const plotW = Math.max(1, plotRight - plotLeft);
  const plotH = Math.max(1, plotBottom - plotTop);

  const values = data.map((d) => d.value);
  const rawMin = domainMin ?? Math.min(...values);
  const rawMax = domainMax ?? Math.max(...values);
  const pad = (rawMax - rawMin || 1) * 0.08;
  const min = domainMin ?? rawMin - pad;
  const max = domainMax ?? rawMax + pad;
  const range = max - min || 1;

  const n = data.length;
  const xAt = (i: number) => plotLeft + (n <= 1 ? 0.5 : i / (n - 1)) * plotW;
  const yAt = (v: number) => plotBottom - ((v - min) / range) * plotH;

  const points = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value), d }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  // Draw-on: a spring 0..1 mapped onto the stroke-dash via evolvePath (no CSS animation).
  const draw = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const progress = interpolate(draw, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const evolved = evolvePath(progress, path);

  return (
    <AbsoluteFill>
      {/* The line + baseline + point dots, in frame-pixel coordinates (1:1, no distortion). */}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute" }}>
        {/* Baseline axis. */}
        <line
          x1={plotLeft}
          y1={plotBottom}
          x2={plotRight}
          y2={plotBottom}
          stroke={palette.textMuted}
          strokeWidth={2}
          opacity={0.4}
        />
        {/* The trend line, drawing on. */}
        <path
          d={path}
          fill="none"
          stroke={palette.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={evolved.strokeDasharray}
          strokeDashoffset={evolved.strokeDashoffset}
        />
        {/* Point dots — appear as the line passes them. */}
        {points.map((p, i) => {
          const fi = n <= 1 ? 0 : i / (n - 1);
          const op = interpolate(progress, [Math.max(0, fi - 0.04), fi], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <circle
              key={`dot-${p.d.label}-${i}`}
              cx={p.x}
              cy={p.y}
              r={strokeWidth + 2}
              fill={palette.accentAlt}
              opacity={op}
            />
          );
        })}
      </svg>

      {/* Title (top-left, inside the margins). */}
      {title ? (
        <div
          style={{
            position: "absolute",
            top: m.top,
            left: m.left,
            fontFamily: font.display,
            fontWeight: 800,
            fontSize: size("dek"),
            color: palette.text,
          }}
        >
          {title}
        </div>
      ) : null}

      {/* Exact value figures at each point + x-axis labels (revealed with the draw). */}
      {points.map((p, i) => {
        const fi = n <= 1 ? 0 : i / (n - 1);
        const op = interpolate(progress, [Math.max(0, fi - 0.04), fi], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <React.Fragment key={`pt-${p.d.label}-${i}`}>
            {showValues ? (
              <div
                style={{
                  position: "absolute",
                  left: p.x - 90,
                  top: p.y - size("meta") - 22,
                  width: 180,
                  textAlign: "center",
                  fontFamily: font.display,
                  fontWeight: 700,
                  fontSize: size("meta"),
                  color: palette.text,
                  fontVariantNumeric: "tabular-nums",
                  opacity: op,
                }}
              >
                {p.d.display}
              </div>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: p.x - 90,
                top: plotBottom + 14,
                width: 180,
                textAlign: "center",
                fontFamily: font.body,
                fontWeight: 600,
                fontSize: size("meta"),
                color: palette.textMuted,
                opacity: op,
              }}
            >
              {p.d.label}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
