// Breaking-News scene content — the components rendered INSIDE the <SceneSeries>
// (each sees a LOCAL frame starting at 0). These cut behind the persistent broadcast
// chrome (BREAKING flag + bug/clock + ticker), so the "main content area" walks the
// whole message: headline → beats → stat → quote → credit.
//
// All motion is frame-driven (no CSS transition/keyframes, no timers, no wall-clock).
// The broadcast register is preserved: red slabs, condensed caps, hard-edged UI panels.

import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderDoc } from "../../engine/types";
import { useStyleConfig } from "../../engine/StyleConfig";
import { SafeZone } from "../../engine/SafeZone";
import { Counter, parseStat } from "../../engine/primitives";
import { BEVEL } from "./palette";

const REVEAL = Easing.bezier(0.16, 1, 0.3, 1); // crisp UI entrance (matches LowerThird)

// ---- StatScene — "over-the-shoulder" bold number panel -------------------------------
// A red OTS slab pinned to the upper area (where a news graphic sits beside an anchor),
// with a giant condensed counter + a tracked caps label. Reuses Counter + parseStat.
export const StatScene: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const { palette, font, size, shortEdge, orientation } = useStyleConfig();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const parsed = parseStat(value);

  const isPortrait = orientation === "portrait";

  // Panel reveals with the same left→right clip wipe as the lower-third, then holds.
  const reveal = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: REVEAL,
  });
  const clipR = (1 - reveal) * 100;
  const tx = (1 - reveal) * -28;

  // Pop the number a touch after the panel lands.
  const pop = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const numScale = interpolate(pop, [0, 1], [0.78, 1]);
  const labelO = interpolate(frame, [14, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const numPx = Math.round(shortEdge * (isPortrait ? 0.22 : orientation === "square" ? 0.2 : 0.2));
  const accentBar = Math.max(8, Math.round(numPx * 0.08));

  return (
    <SafeZone justify="center" align={isPortrait ? "center" : "flex-start"}>
      <div
        style={{
          transform: `translateX(${tx}px)`,
          display: "flex",
          alignItems: "stretch",
          filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))",
          clipPath: `inset(0% ${clipR}% 0% 0%)`,
          maxWidth: "100%",
        }}
      >
        {/* accent spine */}
        <div style={{ width: accentBar, background: palette.accent, flex: "0 0 auto" }} />
        <div
          style={{
            background: "rgba(10,14,20,0.92)",
            borderTop: `${Math.max(4, Math.round(numPx * 0.045))}px solid ${palette.accent}`,
            padding: `${Math.round(numPx * 0.14)}px ${Math.round(numPx * 0.28)}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: Math.round(numPx * 0.06),
          }}
        >
          <span
            style={{
              transform: `scale(${numScale})`,
              transformOrigin: "left center",
              fontFamily: font.condensed,
              fontWeight: 700,
              fontSize: numPx,
              color: palette.text,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {parsed.num !== null ? (
              <>
                {parsed.prefix}
                <Counter to={parsed.num} delay={8} durationInFrames={Math.round(0.9 * fps)} />
                {parsed.suffix}
              </>
            ) : (
              value
            )}
          </span>
          {label ? (
            <span
              style={{
                opacity: labelO,
                background: palette.accent,
                color: palette.text,
                padding: `${Math.round(size("kicker") * 0.4)}px ${Math.round(size("kicker") * 0.8)}px`,
                fontFamily: font.condensed,
                fontWeight: 700,
                fontSize: size("kicker"),
                textTransform: "uppercase",
                letterSpacing: Math.max(2, Math.round(size("kicker") * 0.12)),
                lineHeight: 1.1,
                boxShadow: `inset 0 -3px 0 ${BEVEL}`,
                maxWidth: Math.round(shortEdge * 1.0),
              }}
            >
              {label}
            </span>
          ) : null}
        </div>
      </div>
    </SafeZone>
  );
};

// ---- CreditScene — source + dateline endcard -----------------------------------------
// A centered "sign-off" card: a red rule, the source/headline, and the dateline. Keeps
// the broadcast condensed caps so it reads as the same channel.
export const CreditScene: React.FC<{ doc: RenderDoc }> = ({ doc }) => {
  const { palette, font, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const t = interpolate(frame, [4, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ruleW = interpolate(frame, [2, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: REVEAL,
  });
  const name = (doc.source.name && doc.source.name.trim()) || doc.headline;
  const dateline = [doc.dateline.location, doc.dateline.dateDisplay]
    .filter((s): s is string => Boolean(s && s.trim()))
    .map((s) => s.toUpperCase())
    .join("  ·  ");

  return (
    <SafeZone justify="center" align="center">
      <div
        style={{
          opacity: t,
          transform: `translateY(${interpolate(t, [0, 1], [20, 0])}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: size("meta") * 0.7,
          textAlign: "center",
          maxWidth: "92%",
        }}
      >
        <div style={{ width: Math.round(size("headline") * 2.4 * ruleW), height: Math.max(4, Math.round(size("headline") * 0.08)), background: palette.accent }} />
        <span
          style={{
            fontFamily: font.condensed,
            fontWeight: 700,
            fontSize: size("headline"),
            color: palette.text,
            textTransform: "uppercase",
            letterSpacing: Math.max(1.5, Math.round(size("headline") * 0.03)),
            lineHeight: 1.06,
          }}
        >
          {name}
        </span>
        {dateline ? (
          <span
            style={{
              fontFamily: font.body,
              fontWeight: 700,
              fontSize: size("meta"),
              color: palette.textMuted,
              textTransform: "uppercase",
              letterSpacing: Math.max(2, Math.round(size("meta") * 0.16)),
            }}
          >
            {dateline}
          </span>
        ) : null}
      </div>
    </SafeZone>
  );
};
