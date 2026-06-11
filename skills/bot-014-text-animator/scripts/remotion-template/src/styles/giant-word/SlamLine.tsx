// <SlamLine> — the heart of the Giant Word style. A scene's text is laid out as ONE
// enormous condensed-caps block that fills ~88-92% of the content width (wrapped into at
// most 2-3 balanced lines). Each WORD SLAMS in from the center: scale from ~0.2 with a
// springy overshoot (damping ~12), a short blur(8px → 0) via filter, and a quick opacity
// fade — staggered ~4-6 frames word-to-word. keyPhrase words land in the accent with a
// soft glow; the rest in the base text color.
//
// Fully frame-driven + deterministic: every value derives from useCurrentFrame(); the only
// jitter (a tiny per-word settle wobble + a hair of rotation) is seeded via noise(). NO
// Math.random, NO CSS transition/keyframes, NO timers.

import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise } from "../../engine/rng";

const normalize = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "");

// Build a Set of normalized emphasis terms from keyPhrases. Multi-word phrases are also
// split into their component words so a single token inside a phrase still pops. (Kept
// local — styles must not import from each other.)
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

// Greedy line-balancer: pack `tokens` into at most `maxLines` rows of at most
// `perLine` words, preferring the FEWEST rows that fit. Deterministic, layout-only.
function packLines(tokens: string[], perLine: number, maxLines: number): string[][] {
  const total = tokens.length;
  if (total === 0) return [];
  // Choose a row count: enough rows so no row exceeds perLine, capped at maxLines.
  const rows = Math.min(maxLines, Math.max(1, Math.ceil(total / perLine)));
  const per = Math.ceil(total / rows);
  const lines: string[][] = [];
  for (let i = 0; i < total; i += per) lines.push(tokens.slice(i, i + per));
  return lines;
}

export interface SlamLineProps {
  text: string;
  emphasisSet: Set<string>;
  color: string; // base text color
  accent: string; // emphasis + glow color
  fontFamily: string;
  contentW: number; // px — available content width (already inside SafeZone)
  shortEdge: number; // px — for size flooring
  wordsPerLine: number; // AR-driven target words per row (2 portrait, 3-4 wide)
  maxLines: number; // 2 or 3
  capFontSize: number; // px hard ceiling for the giant type
  seed: number;
  stagger?: number; // frames between word slams
  startDelay?: number; // frames before the first word
}

export const SlamLine: React.FC<SlamLineProps> = ({
  text,
  emphasisSet,
  color,
  accent,
  fontFamily,
  contentW,
  shortEdge,
  wordsPerLine,
  maxLines,
  capFontSize,
  seed,
  stagger = 5,
  startDelay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tokens = text.split(/\s+/).filter(Boolean);
  const lines = packLines(tokens, wordsPerLine, maxLines);

  // Auto-fit: pick the font size so the WIDEST packed row fills ~90% of contentW, and so
  // the LONGEST single word can never overflow (clamp by longest word length). Oswald
  // (condensed) averages ~0.50 of its em per glyph; add the inter-word gaps.
  const CHAR_W = 0.5; // avg condensed glyph advance as a fraction of font size
  const GAP = 0.26; // inter-word gap as a fraction of font size
  const widestRowUnits = Math.max(
    1,
    ...lines.map((row) => {
      const chars = row.reduce((a, w) => a + w.length, 0);
      const gaps = Math.max(0, row.length - 1);
      return chars * CHAR_W + gaps * GAP;
    }),
  );
  const longestWordUnits = Math.max(1, ...tokens.map((w) => w.length)) * CHAR_W;

  const target = contentW * 0.9; // we want the widest row to span ~90% of content
  const fitByRow = Math.floor(target / widestRowUnits);
  const fitByWord = Math.floor(contentW / longestWordUnits); // a single word must fit too
  const floor = Math.round(shortEdge * 0.06);
  const fontSize = Math.max(floor, Math.min(capFontSize, fitByRow, fitByWord));

  let wordIndex = -1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: `${fontSize * 0.02}px`,
        width: "100%",
      }}
    >
      {lines.map((row, li) => (
        <div
          key={li}
          style={{
            display: "flex",
            flexWrap: "nowrap",
            justifyContent: "center",
            alignItems: "baseline",
            gap: `${fontSize * GAP}px`,
            fontFamily,
            fontWeight: 700,
            lineHeight: 0.96,
            textTransform: "uppercase",
            letterSpacing: "-0.015em",
          }}
        >
          {row.map((tok, ti) => {
            wordIndex += 1;
            const i = wordIndex;
            const delay = startDelay + i * stagger;
            const isEmph = emphasisSet.has(normalize(tok));

            // The slam: a bouncy spring drives scale from 0.2 → ~1 with overshoot.
            const enter = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.7, stiffness: 170 },
            });
            // A separate clamped ramp drives blur + opacity so they finish crisply even as
            // the spring keeps settling.
            const sharp = interpolate(frame - delay, [0, 9], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            const scale = interpolate(enter, [0, 1], [0.2, 1], {
              extrapolateLeft: "clamp",
              // allow the spring's natural overshoot past 1 (no right clamp)
              extrapolateRight: "extend",
            });
            const opacity = interpolate(sharp, [0, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const blur = interpolate(sharp, [0, 1], [8, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            // A whisper of seeded rotation on the slam that settles to 0 — adds punch
            // without looking sloppy. ±1.4deg, scaled by how un-settled the word still is.
            const wobble = (noise(seed, i, 5) - 0.5) * 2.8;
            const rot = wobble * (1 - Math.min(1, enter));

            const glow = isEmph
              ? `0 0 ${Math.round(fontSize * 0.42)}px ${accent}88, 0 6px 30px rgba(0,0,0,0.55)`
              : "0 8px 34px rgba(0,0,0,0.5)";

            return (
              <span
                key={`${li}-${ti}`}
                style={{
                  display: "inline-block",
                  transform: `translateZ(0) scale(${scale}) rotate(${rot}deg)`,
                  transformOrigin: "center center",
                  opacity,
                  filter: blur > 0.05 ? `blur(${blur}px)` : "none",
                  color: isEmph ? accent : color,
                  fontSize,
                  fontWeight: isEmph ? 700 : 700,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  textShadow: glow,
                  willChange: "transform, filter, opacity",
                }}
              >
                {tok}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
