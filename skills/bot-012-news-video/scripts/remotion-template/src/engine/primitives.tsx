// Frame-driven animation primitives reused by every style. Rules baked in:
// drive from useCurrentFrame(); interpolate is always clamped; springs use
// config.damping=200 for smooth (lower for bounce). research/model-evaluation.md §7.5.

import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/** Normalized spring progress 0..1, optionally delayed. */
export const useSpringProgress = (delay = 0, damping = 200): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
};

/** Opacity in/out for a scene of known length (local Sequence frame). */
export const useInOut = (sequenceDuration: number, fade = 8): number => {
  const f = useCurrentFrame();
  return interpolate(f, [0, fade, sequenceDuration - fade, sequenceDuration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

/** Spring rise + fade (the workhorse entrance). */
export const RiseIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  damping?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, distance = 40, damping = 200, style }) => {
  const p = useSpringProgress(delay, damping);
  const translateY = interpolate(p, [0, 1], [distance, 0]);
  const opacity = interpolate(p, [0, 1], [0, 1]);
  return <div style={{ transform: `translateY(${translateY}px)`, opacity, ...style }}>{children}</div>;
};

/** Eased fade (no bounce) — for the calm/editorial register. */
export const FadeIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  durationInFrames?: number;
  y?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, durationInFrames = 20, y = 0, style }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [delay, delay + durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const translateY = interpolate(t, [0, 1], [y, 0]);
  return <div style={{ opacity: t, transform: `translateY(${translateY}px)`, ...style }}>{children}</div>;
};

/** Parse a stat string like "$40M" / "1,200" / "37%" into prefix + number + suffix. */
export const parseStat = (raw: string): { prefix: string; num: number | null; suffix: string } => {
  const m = raw.match(/^(\D*)([\d,.]+)(.*)$/s);
  if (!m) return { prefix: "", num: null, suffix: raw };
  const num = parseFloat(m[2].replace(/,/g, ""));
  return { prefix: m[1], num: Number.isNaN(num) ? null : num, suffix: m[3] };
};

/** Animated number 0..to, tabular figures. */
export const Counter: React.FC<{
  to: number;
  from?: number;
  delay?: number;
  durationInFrames?: number;
  format?: (n: number) => string;
  style?: React.CSSProperties;
}> = ({ to, from = 0, delay = 0, durationInFrames, format, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = durationInFrames ?? fps;
  const t = interpolate(frame, [delay, delay + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const v = from + (to - from) * t;
  const text = format ? format(v) : Math.round(v).toLocaleString();
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{text}</span>;
};

/** Spring-grown bar (data viz). */
export const Bar: React.FC<{
  widthPx: number;
  height: number;
  color: string;
  delay?: number;
  radius?: number;
  style?: React.CSSProperties;
}> = ({ widthPx, height, color, delay = 0, radius = 8, style }) => {
  const p = useSpringProgress(delay);
  const w = interpolate(p, [0, 1], [0, widthPx]);
  return <div style={{ width: w, height, backgroundColor: color, borderRadius: radius, ...style }} />;
};

/** Scale+fade card. */
export const Card: React.FC<{
  children: React.ReactNode;
  delay?: number;
  bg: string;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, bg, style }) => {
  const p = useSpringProgress(delay);
  const scale = interpolate(p, [0, 1], [0.92, 1]);
  const opacity = interpolate(p, [0, 1], [0, 1]);
  return <div style={{ transform: `scale(${scale})`, opacity, backgroundColor: bg, ...style }}>{children}</div>;
};

/** A rule/divider that wipes in horizontally (scaleX). */
export const DividerWipe: React.FC<{
  width: number | string;
  color: string;
  delay?: number;
  height?: number;
  durationInFrames?: number;
  origin?: "left" | "center" | "right";
  style?: React.CSSProperties;
}> = ({ width, color, delay = 0, height = 3, durationInFrames, origin = "left", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = durationInFrames ?? Math.round(0.6 * fps);
  const sx = interpolate(frame, [delay, delay + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: color,
        transform: `scaleX(${sx})`,
        transformOrigin: `${origin} center`,
        ...style,
      }}
    />
  );
};

/** Very slow scale drift (Ken Burns) across the whole clip length. */
export const KenBurns: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  from?: number;
  to?: number;
  style?: React.CSSProperties;
}> = ({ children, durationInFrames, from = 1.0, to = 1.08, style }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [from, to], { extrapolateRight: "clamp" });
  return (
    <div style={{ width: "100%", height: "100%", transform: `scale(${scale})`, transformOrigin: "center", ...style }}>
      {children}
    </div>
  );
};
