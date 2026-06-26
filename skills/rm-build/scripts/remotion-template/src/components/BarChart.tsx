// BarChart — exact-figure animated bar / ranking chart (JTBD-2).
//
// Vetted starter shipped by the rm-dataviz skill and composed by rm-build. Contract-clean
// by construction: frame-driven (spring + clamped interpolate), no Math.random / Date.now /
// setTimeout, no CSS transition/@keyframes, themed via the engine (useStyleConfig), content
// inside <SafeZone>. THE EXACT-FIGURE RULE: each datum carries `value` (numeric, drives the
// bar GEOMETRY only) and `display` (the verbatim input string shown to the viewer). The value
// label resolves to `display` byte-for-byte at rest, so the figure on screen == the input
// figure with no rounding. See ../../../references/dataviz-rules.md (rm-dataviz).

import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useStyleConfig } from "../engine/StyleConfig";
import { SafeZone } from "../engine/SafeZone";
import { Counter } from "../engine/primitives";
import { STAGGER } from "../engine/tokens";

/** One bound data point. `value` = numeric magnitude (geometry); `display` = verbatim figure. */
export type Datum = { label: string; value: number; display: string };

/** Split "$2,634" / "47.3%" / "1,200" into prefix + digit-run + suffix (for the count-up). */
const splitNumeric = (s: string): { prefix: string; digits: string; suffix: string } => {
  const m = s.match(/^(\D*)([\d.,]+)(.*)$/s);
  if (!m) return { prefix: "", digits: s, suffix: "" };
  return { prefix: m[1], digits: m[2], suffix: m[3] };
};

/** Decimal places present in the input string (so the count-up keeps the input's precision). */
const decimalsOf = (digits: string): number => {
  const dot = digits.lastIndexOf(".");
  return dot === -1 ? 0 : digits.length - dot - 1;
};

/**
 * The figure label. Optionally counts up to `value` using the engine Counter, but ALWAYS
 * renders `display` verbatim once the reveal completes (frame >= delay+dur) — this is the
 * exact-figure guarantee: the resting frame the vision grade / ffprobe sees == the input.
 */
const ExactNumber: React.FC<{
  value: number;
  display: string;
  delay: number;
  dur: number;
  countUp: boolean;
  style?: React.CSSProperties;
}> = ({ value, display, delay, dur, countUp, style }) => {
  const frame = useCurrentFrame();
  const base: React.CSSProperties = { fontVariantNumeric: "tabular-nums", ...style };
  if (!countUp || frame >= delay + dur) {
    return <span style={base}>{display}</span>;
  }
  const { prefix, digits, suffix } = splitNumeric(display);
  const dec = decimalsOf(digits);
  // The Counter value already carries the sign — keep only a currency/symbol prefix.
  const symPrefix = prefix.replace(/[-+]\s*$/, "");
  return (
    <span style={base}>
      {symPrefix}
      <Counter
        to={value}
        delay={delay}
        durationInFrames={dur}
        format={(n) =>
          n.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })
        }
      />
      {suffix}
    </span>
  );
};

export const BarChart: React.FC<{
  data: Datum[];
  /** Optional chart title (verbatim from the script/concept). */
  title?: string;
  /** Geometry domain. Bars default to an HONEST zero baseline; override only if asked. */
  domainMin?: number;
  domainMax?: number;
  /** Count the figure up to its exact value (default true). false = reveal it statically. */
  countUp?: boolean;
  /** Frames before the first bar grows. */
  delay?: number;
  /** Index to emphasise with accentAlt (e.g. the winner of a ranking). */
  highlightIndex?: number;
  style?: React.CSSProperties;
}> = ({ data, title, domainMin, domainMax, countUp = true, delay = 6, highlightIndex, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palette, font, size } = useStyleConfig();

  const values = data.map((d) => d.value);
  const min = domainMin ?? 0;
  const max = domainMax ?? Math.max(...values, 0);
  const range = max - min || 1;
  const growFrames = Math.round(0.7 * fps);

  return (
    <SafeZone justify="flex-end" align="stretch">
      {title ? (
        <div
          style={{
            fontFamily: font.display,
            fontWeight: 800,
            fontSize: size("dek"),
            color: palette.text,
            marginBottom: 18,
          }}
        >
          {title}
        </div>
      ) : null}

      {/* Plot row: takes the remaining height; bars anchored to a 0 baseline. */}
      <div style={{ display: "flex", flex: 1, alignItems: "flex-end", gap: 24, ...style }}>
        {data.map((d, i) => {
          const dDelay = delay + i * STAGGER;
          const p = spring({ frame: frame - dDelay, fps, config: { damping: 200 } });
          const pct = interpolate(p, [0, 1], [0, ((d.value - min) / range) * 100], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const isHi = highlightIndex === i;
          return (
            <div
              key={`${d.label}-${i}`}
              style={{ position: "relative", flex: 1, height: "100%", minWidth: 0 }}
            >
              {/* Value figure — sits just above the bar top. */}
              <div
                style={{
                  position: "absolute",
                  bottom: `calc(${pct}% + 10px)`,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  fontFamily: font.display,
                  fontWeight: 700,
                  fontSize: size("beat"),
                  color: isHi ? palette.accent : palette.text,
                  opacity: p,
                }}
              >
                <ExactNumber
                  value={d.value}
                  display={d.display}
                  delay={dDelay}
                  dur={growFrames}
                  countUp={countUp}
                />
              </div>
              {/* The bar. */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${pct}%`,
                  backgroundColor: isHi ? palette.accentAlt : palette.accent,
                  borderRadius: "10px 10px 0 0",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Category labels (own row so they never eat plot height). */}
      <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
        {data.map((d, i) => (
          <div
            key={`lbl-${d.label}-${i}`}
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: font.body,
              fontWeight: 600,
              fontSize: size("meta"),
              color: palette.textMuted,
            }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </SafeZone>
  );
};
