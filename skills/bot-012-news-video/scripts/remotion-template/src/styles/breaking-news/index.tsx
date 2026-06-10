// Breaking News Broadcast — Root.
//
// A stack of z-ordered, time-windowed overlay layers (NOT a scene sequence), every
// layer driven by useCurrentFrame():
//   z5 Bug + clock        (top-right: brand/source label + running clock)
//   z4 BREAKING flag      (top-left: red slab, "BREAKING NEWS")
//   z3 Lower-third        (two-tier banner: white headline + red kicker/source slab)
//   z2 Ticker             (bottom strip, seamless marquee + red LIVE tab)
//   z1 Scrim gradient     (darkens the band behind the lower-third + ticker)
//   z0 Background plate    (flat charcoal-navy — no external images)
//
// Determinism: no Math.random / Date.now; the clock and flag pulse derive from frame
// (+ a seeded, reproducible start time). The whole timeline fits durationInFrames.

import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { StyleRootProps } from "../../engine/types";
import { StyleProvider, useStyleConfig } from "../../engine/StyleConfig";
import { buildPalette } from "./palette";
import { BreakingFlag } from "./BreakingFlag";
import { Bug } from "./Bug";
import { LowerThird } from "./LowerThird";
import { Ticker } from "./Ticker";

// Build the ticker item list from the doc: body beats first (inverted-pyramid order),
// then the dek as a tail item, then a couple of key phrases as short "FLASH" items.
// Always returns at least one item so the crawl is never empty.
const buildTickerItems = (
  beats: string[],
  dek: string | null,
  keyPhrases: string[],
  headline: string,
  isNarrow: boolean,
): string[] => {
  const out: string[] = [];
  const push = (s: string | null | undefined) => {
    const v = (s ?? "").trim();
    if (v) out.push(v);
  };
  beats.forEach(push);
  push(dek);
  // Narrow (portrait/square) crawls show fewer chars at once — keep the budget lean
  // by not padding with key phrases there.
  if (!isNarrow) keyPhrases.slice(0, 3).forEach(push);
  if (out.length === 0) push(headline); // last-resort: the headline always exists
  return out;
};

// The kicker/source line: category (up-cased) + a mandatory source credit when the
// doc carries a source name. Dateline location is folded in when present.
const buildKicker = (
  category: string,
  sourceName: string | null,
  location: string | null,
): string => {
  const parts: string[] = [];
  const cat = (category ?? "").trim();
  parts.push(cat && cat.toLowerCase() !== "other" ? cat.toUpperCase() : "BREAKING NEWS");
  if (location && location.trim()) parts.push(location.trim().toUpperCase());
  if (sourceName && sourceName.trim()) parts.push(sourceName.trim().toUpperCase());
  return parts.join("  ·  ");
};

const Scene: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const { width, height, durationInFrames } = useVideoConfig();
  const { orientation } = useStyleConfig();

  const isPortrait = orientation === "portrait";
  const isNarrow = orientation !== "landscape";

  // 5% all-sides graphics-safe inset (EBU R95), derived from the frame size — no
  // hardcoded 1080/1920. The lower-third + corner elements sit inside this band.
  const safeX = Math.round(width * 0.05);
  const safeY = Math.round(height * 0.05);

  // ---- frame windows, all derived from durationInFrames so the timeline always fits ----
  const flagDelay = 0;
  const bugDelay = 6;
  const tickerStart = Math.min(30, Math.round(durationInFrames * 0.12));
  // Lower-third enters after the ticker has begun rising; holds; then wipes out before
  // the very end. Clamp so even a very short clip still shows a sane banner.
  const ltStart = Math.min(Math.round(durationInFrames * 0.1) + 18, Math.round(durationInFrames * 0.3));
  const ltTail = Math.min(30, Math.round(durationInFrames * 0.12)); // tail for the wipe-out
  const ltDuration = Math.max(36, durationInFrames - ltStart - ltTail);

  const ticker = buildTickerItems(doc.bodyBeats, doc.dek, doc.keyPhrases, doc.headline, isNarrow);

  const kicker = buildKicker(doc.category, doc.source.name, doc.dateline.location);

  const flagLabel = "BREAKING NEWS";
  const liveLabel = "LIVE";
  // Corner-bug label: brand.label → source name → dateline location → generic.
  const bugLabel =
    (brand.label && brand.label.trim()) ||
    (doc.source.name && doc.source.name.trim()) ||
    (doc.dateline.location && doc.dateline.location.trim()) ||
    "NEWS";

  // Lower-third vertical anchor: on portrait, lift it off the very bottom (phone UI /
  // thumb zone) to ~62% of height; otherwise pin it just above the ticker band.
  const ltBottom = isPortrait
    ? Math.round(height * 0.34)
    : safeY + Math.round(height * (orientation === "square" ? 0.13 : 0.11));

  return (
    <>
      {/* z1 — scrim: darken top + bottom bands so white text always passes contrast. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.0) 22%," +
            " rgba(0,0,0,0.0) 48%, rgba(0,0,0,0.82) 100%)",
        }}
      />

      {/* z2 — Ticker */}
      <Sequence from={tickerStart} name="ticker">
        <Ticker items={ticker} liveLabel={liveLabel} />
      </Sequence>

      {/* z3 — Lower-third (anchored inside the safe band) */}
      <Sequence from={ltStart} durationInFrames={ltDuration} name="lower-third">
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "flex-start",
            paddingLeft: safeX,
            paddingRight: safeX,
            paddingBottom: ltBottom,
          }}
        >
          <LowerThird headline={doc.headline} kicker={kicker} durationInFrames={ltDuration} />
        </AbsoluteFill>
      </Sequence>

      {/* z4 — BREAKING flag (top-left, inside the safe band) */}
      <Sequence from={flagDelay} name="breaking-flag">
        <AbsoluteFill style={{ paddingTop: safeY, paddingLeft: safeX, alignItems: "flex-start" }}>
          <BreakingFlag label={flagLabel} />
        </AbsoluteFill>
      </Sequence>

      {/* z5 — Bug + clock (top-right, inside the safe band) */}
      <Sequence from={bugDelay} name="bug">
        <AbsoluteFill
          style={{
            paddingTop: safeY,
            paddingRight: safeX,
            alignItems: "flex-end",
          }}
        >
          <Bug label={bugLabel} seed={seed} />
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

export const Root: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const palette = buildPalette({ accent: brand.accent, accentAlt: brand.accentAlt });
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <StyleProvider palette={palette}>
        <Scene doc={doc} brand={brand} seed={seed} />
      </StyleProvider>
    </AbsoluteFill>
  );
};

export default Root;
