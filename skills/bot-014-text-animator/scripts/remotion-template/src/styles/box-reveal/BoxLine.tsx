// <BoxLine> — the heart of the Box Reveal style.
// Splits a line into word tokens. Each token sits inside an overflow:hidden mask. A solid
// colored block sweeps left→right across the word's box on a staggered delay: it wipes IN
// (covering the word), then wipes OUT (exposing the word underneath). The word is itself
// clip-revealed by the block's trailing edge via a clipPath inset, so the letters appear to
// be "uncovered" by the passing block — a crisp, editorial mask-reveal.
//
// Emphasis tokens (whose normalized form appears in doc.keyPhrases) are revealed by an
// ACCENT block (and the word stays in the accent ink for a beat before settling to text).
// Normal tokens are revealed by a neutral light block.
//
// Fully frame-driven: every value is a pure function of useCurrentFrame(). The only "jitter"
// is seeded via engine noise(seed, ...) so two renders are byte-identical — NO Math.random,
// NO CSS transitions/keyframes, NO timers.

import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise } from "../../engine/rng";

const normalize = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "");

// Build a Set of normalized emphasis terms from keyPhrases. Multi-word phrases are also
// split into their component words so single tokens inside a phrase still pop. (Replicated
// locally — styles stay independent and never import from one another.)
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

export interface BoxLineProps {
  text: string;
  emphasisSet: Set<string>;
  textColor: string; // settled word color (off-white)
  inkOnBlock: string; // word ink WHILE under a neutral light block (dark)
  accent: string; // emphasis block + emphasis word ink
  neutralBlock: string; // block color for normal words
  fontFamily: string;
  fontSize: number; // px — caller derives from size()/shortEdge
  seed: number; // deterministic jitter seed
  stagger?: number; // frames between tokens
  startDelay?: number; // frames before the first token reveals
  align?: "center" | "flex-start";
  sweep?: number; // frames for one word's full IN→OUT block sweep
}

export const BoxLine: React.FC<BoxLineProps> = ({
  text,
  emphasisSet,
  textColor,
  inkOnBlock,
  accent,
  neutralBlock,
  fontFamily,
  fontSize,
  seed,
  stagger = 6,
  startDelay = 0,
  align = "center",
  sweep = 18,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tokens = text.split(/\s+/).filter(Boolean);

  // Vertical breathing room for the block (it's slightly taller than the cap height).
  const padY = fontSize * 0.14;
  const padX = fontSize * 0.1;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: `${fontSize * 0.16}px ${fontSize * 0.28}px`,
        justifyContent: align,
        alignItems: "flex-start",
        alignContent: "center",
        fontFamily,
        fontWeight: 700,
        lineHeight: 1.0,
        textAlign: align === "center" ? "center" : "left",
        textTransform: "uppercase",
        letterSpacing: "-0.005em",
        maxWidth: "100%",
      }}
    >
      {tokens.map((tok, i) => {
        const isEmph = emphasisSet.has(normalize(tok));
        const delay = startDelay + i * stagger;
        // Local 0..1 progress of THIS word's block sweep, clamped.
        const local = frame - delay;
        const p = interpolate(local, [0, sweep], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // The block is a slab the width of the word's box (110%). It enters from the LEFT,
        // covers the word at the midpoint, then exits to the RIGHT.
        //   p 0.0 → fully left of the box (hidden)
        //   p 0.5 → fully covering the box
        //   p 1.0 → fully right of the box (gone)
        // We drive the LEFT edge of the block from -110% to +110% of the box width.
        const blockX = interpolate(p, [0, 0.5, 1], [-112, 0, 112], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // The word is clip-revealed by the block's TRAILING (left) edge: as the block moves
        // right past the box, it uncovers the word from left to right. Reveal tracks the
        // back half of the sweep (0.5..1.0). Before that the word is hidden under the block.
        const reveal = interpolate(p, [0.46, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        // clip from the RIGHT side inward; as reveal→1 the inset shrinks to 0 (fully shown).
        const clipRight = interpolate(reveal, [0, 1], [100, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // A gentle settle pop once the word has fully landed (after the block clears), so the
        // line feels alive without ever overflowing the flex gap (scale stays <= 1).
        const settle = spring({
          frame: local - sweep,
          fps,
          config: { damping: isEmph ? 14 : 200 },
        });
        const settleScale = interpolate(settle, [0, 1], [0.985, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Deterministic ±0.6px vertical micro-jitter while the block is mid-sweep, settling
        // to 0 — keeps the wall of words from feeling perfectly mechanical.
        const jitter = (noise(seed, i, 11) - 0.5) * 1.2 * (1 - reveal);

        // The word ink: while the block still overlaps (reveal < ~0.65) and it's a normal
        // word, paint the freshly-exposed letters dark so they read as just-uncovered; then
        // blend to the off-white text color. Emphasis words flash accent before settling.
        const inkBlend = interpolate(reveal, [0.55, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const restColor = isEmph
          ? inkBlend >= 1
            ? textColor
            : accent
          : textColor;
        const freshColor = isEmph ? accent : inkOnBlock;
        const wordColor = inkBlend >= 0.5 ? restColor : freshColor;

        const blockColor = isEmph ? accent : neutralBlock;
        // The block fully hides while crossing (opacity 1) then is irrelevant once gone.
        const blockOpacity = interpolate(p, [0, 0.04, 0.96, 1], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Emphasis tokens leave behind a thin accent baseline bar that draws in once landed.
        const baseline = isEmph
          ? interpolate(reveal, [0.7, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : 0;

        return (
          <span
            key={i}
            style={{
              position: "relative",
              display: "inline-block",
              padding: `${padY}px ${padX}px`,
              transform: `translateY(${jitter}px) scale(${settleScale})`,
              transformOrigin: "center bottom",
              overflow: "hidden",
            }}
          >
            {/* The word, clip-revealed by the block's trailing edge. */}
            <span
              style={{
                position: "relative",
                display: "inline-block",
                color: wordColor,
                fontSize,
                fontWeight: isEmph ? 700 : 600,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
                clipPath: `inset(0 ${clipRight}% 0 0)`,
                WebkitClipPath: `inset(0 ${clipRight}% 0 0)`,
              }}
            >
              {tok}
            </span>

            {/* Emphasis baseline bar (draws in left→right once the word lands). */}
            {isEmph ? (
              <span
                style={{
                  position: "absolute",
                  left: padX,
                  right: padX,
                  bottom: padY * 0.5,
                  height: Math.max(2, fontSize * 0.05),
                  borderRadius: 2,
                  background: accent,
                  transform: `scaleX(${baseline})`,
                  transformOrigin: "left center",
                }}
              />
            ) : null}

            {/* The sweeping solid block (sits ON TOP, covering then exposing the word). */}
            <span
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: "112%",
                background: blockColor,
                opacity: blockOpacity,
                transform: `translateX(${blockX}%)`,
                pointerEvents: "none",
              }}
            />
          </span>
        );
      })}
    </div>
  );
};
