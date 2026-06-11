// <PerspectiveLines> — lays a block of copy out as cinematic display lines on the tilted
// plane. Copy is greedily wrapped into balanced lines; each line RISES into place with a
// staggered fade + a slight scale and a tiny seeded settle jitter, so reading the message
// feels like a slow filmic crawl. Emphasis tokens (matched against keyPhrases) take the
// brand accent + a soft glow. Font is font.display (Fraunces) for the cinematic register.
//
// 100% frame-driven + deterministic: line entrances are springs of useCurrentFrame; the only
// jitter is noise(seed, …). No CSS transitions, no timers, no Math.random.

import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useStyleConfig } from "../../engine/StyleConfig";
import { noise } from "../../engine/rng";

const normalize = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "");

// Build a normalized emphasis set from keyPhrases (phrase + component words), exactly the
// kinetic approach but kept local so styles stay independent.
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

// Greedy wrap into lines no longer than maxChars, never splitting a word.
function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + " " + w).length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}

export interface PerspectiveLinesProps {
  text: string;
  emphasisSet: Set<string>;
  seed: number;
  isHeadline?: boolean;
  startDelay?: number;
}

export const PerspectiveLines: React.FC<PerspectiveLinesProps> = ({
  text,
  emphasisSet,
  seed,
  isHeadline = false,
  startDelay = 0,
}) => {
  const { palette, font, orientation, shortEdge } = useStyleConfig();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Chars-per-line by AR (landscape is widest, portrait narrowest). Headlines wrap a touch
  // tighter so each line lands bigger and more cinematic.
  const baseMax =
    orientation === "landscape" ? 30 : orientation === "portrait" ? 18 : 22;
  const maxChars = isHeadline ? baseMax : baseMax + 6;
  const lines = wrapLines(text, maxChars);

  // Size the type so the LONGEST line fits the plane's content width, then clamp to a cap and
  // a legibility floor. We size off the longest wrapped line, not the longest single word,
  // because Fraunces here is a normal (non-condensed) display face.
  const contentW =
    shortEdge * (orientation === "landscape" ? 1.06 : orientation === "portrait" ? 0.82 : 0.9);
  const longestLine = Math.max(1, ...lines.map((l) => l.length));
  // ~0.5 = avg glyph advance / fontSize for Fraunces display caps-ish; tuned conservative.
  const fitByLine = Math.floor(contentW / (longestLine * 0.5));
  const cap = Math.round(
    shortEdge * (orientation === "landscape" ? 0.095 : orientation === "portrait" ? 0.12 : 0.11),
  );
  const heroBump = isHeadline ? 1.0 : 0.82;
  const floor = Math.round(shortEdge * 0.045);
  const fontSize = Math.max(floor, Math.min(cap, fitByLine, Math.round(cap * heroBump)));

  const stagger = orientation === "portrait" ? 6 : 7;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: fontSize * 0.14,
        width: "100%",
      }}
    >
      {lines.map((line, li) => {
        const delay = startDelay + li * stagger;
        const enter = spring({ frame: frame - delay, fps, config: { damping: 200 } });
        // Lines rise from below and recede slightly (we keep it 2D-on-plane; the parent plane
        // supplies the 3D tilt). A small seeded jitter keeps it from feeling mechanical.
        const jitter = (noise(seed, li, 11) - 0.5) * 6;
        const translateY = interpolate(enter, [0, 1], [fontSize * 0.85, 0]) + (1 - enter) * jitter;
        const opacity = interpolate(enter, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(enter, [0, 1], [0.86, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const tokens = line.split(/\s+/).filter(Boolean);
        return (
          <div
            key={li}
            style={{
              opacity,
              transform: `translateY(${translateY}px) scale(${scale})`,
              transformOrigin: "center bottom",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "baseline",
              gap: `${fontSize * 0.08}px ${fontSize * 0.26}px`,
              fontFamily: font.display,
              fontWeight: 600,
              fontSize,
              lineHeight: 1.04,
              letterSpacing: "-0.01em",
              textAlign: "center",
              whiteSpace: "pre",
            }}
          >
            {tokens.map((tok, ti) => {
              const isEmph = emphasisSet.has(normalize(tok));
              const blend = interpolate(enter, [0.35, 1], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const color = isEmph ? (blend >= 0.5 ? palette.accent : palette.text) : palette.text;
              return (
                <span
                  key={ti}
                  style={{
                    color,
                    fontWeight: isEmph ? 900 : 600,
                    fontStyle: isEmph ? "italic" : "normal",
                    textShadow: isEmph
                      ? `0 0 ${Math.round(fontSize * 0.45)}px ${palette.accent}55, 0 6px 30px rgba(0,0,0,0.55)`
                      : "0 6px 30px rgba(0,0,0,0.5)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tok}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
