// <KineticLine> — the heart of the Kinetic Typography style.
// Splits a line into word tokens; each token springs in (translateY + scale + opacity)
// on a staggered delay. Emphasis tokens (those whose normalized form appears in
// doc.keyPhrases) get a bouncier spring, a scale bump, and the accent color blended in.
//
// Fully frame-driven: every value is a pure function of useCurrentFrame(). The only
// "jitter" is seeded via engine noise(seed, ...) so two renders are byte-identical —
// NO Math.random, NO CSS transitions/keyframes, NO timers.

import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise } from "../../engine/rng";

const normalize = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "");

// Build a Set of normalized emphasis terms from keyPhrases. Multi-word phrases are
// also split into their component words so single tokens inside a phrase still pop.
export function buildEmphasisSet(keyPhrases: string[]): Set<string> {
  const set = new Set<string>();
  for (const phrase of keyPhrases) {
    const norm = normalize(phrase);
    if (norm) set.add(norm);
    for (const w of phrase.split(/\s+/)) {
      const nw = normalize(w);
      if (nw) set.add(nw);
    }
  }
  return set;
}

export interface KineticLineProps {
  text: string;
  emphasisSet: Set<string>;
  color: string; // base text color
  accent: string; // emphasis color-pop
  fontFamily: string;
  fontSize: number; // px — caller derives from size()/shortEdge
  seed: number; // deterministic jitter seed
  stagger?: number; // frames between tokens
  startDelay?: number; // frames before the first token reveals
  align?: "center" | "flex-start"; // wrap alignment
}

export const KineticLine: React.FC<KineticLineProps> = ({
  text,
  emphasisSet,
  color,
  accent,
  fontFamily,
  fontSize,
  seed,
  stagger = 6,
  startDelay = 0,
  align = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tokens = text.split(/\s+/).filter(Boolean);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: `${fontSize * 0.22}px ${fontSize * 0.34}px`,
        justifyContent: align,
        alignItems: "baseline",
        fontFamily,
        fontWeight: 700,
        lineHeight: 1.02,
        textAlign: align === "center" ? "center" : "left",
        textTransform: "uppercase",
        letterSpacing: "-0.01em",
      }}
    >
      {tokens.map((tok, i) => {
        const delay = startDelay + i * stagger;
        const isEmph = emphasisSet.has(normalize(tok));

        // Single normalized progress, then derive everything from it.
        const enter = spring({
          frame: frame - delay,
          fps,
          config: { damping: isEmph ? 13 : 200 }, // emphasis bounces; normal words settle clean
        });

        // Deterministic ±2px settle jitter so the line doesn't feel mechanical.
        const jitter = (noise(seed, i, 7) - 0.5) * 4;

        const translateY = interpolate(enter, [0, 1], [fontSize * 0.55, 0]) + (1 - enter) * jitter;
        const opacity = interpolate(enter, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const baseScale = interpolate(enter, [0, 1], [0.7, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        // Emphasis pops via color + weight + glow, NOT a permanent scale: a held 1.16x
        // transform scale overflowed the flex gap and made adjacent emphasis tokens collide.
        const scale = baseScale;

        // Emphasis color blends from base -> accent as the token lands.
        const blend = interpolate(enter, [0.2, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const tokenColor = isEmph ? (blend >= 0.5 ? accent : color) : color;

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${translateY}px) scale(${scale})`,
              transformOrigin: "center bottom",
              opacity,
              color: tokenColor,
              fontSize,
              fontWeight: isEmph ? 800 : 700,
              // Shadow = legibility insurance over lighter gradient regions; emphasis adds an accent glow.
              textShadow: isEmph
                ? `0 0 ${Math.round(fontSize * 0.5)}px ${accent}66, 0 4px 24px rgba(0,0,0,0.5)`
                : "0 4px 24px rgba(0,0,0,0.45)",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {tok}
          </span>
        );
      })}
    </div>
  );
};
