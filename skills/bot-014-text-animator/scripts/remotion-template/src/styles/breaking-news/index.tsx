// Breaking News Broadcast — Root.
//
// UPGRADE: this style used to HOLD a single headline. It now WALKS the whole message
// through a shared <SceneSeries> (headline → body beats → hero stat → soundbite quote →
// sign-off credit) while the signature broadcast CHROME stays PERSISTENT on the global
// frame, exactly the way a live channel keeps its furniture up across camera cuts:
//
//   PERSISTENT (global frame, outside the SceneSeries):
//     z5 Bug + clock        (top-right: brand/source label + running clock)
//     z4 BREAKING flag      (top-left: red slab, "BREAKING NEWS")
//     z2 Ticker             (bottom strip, seamless marquee scrolling the body beats)
//     z1 Scrim gradient     (darkens the band behind the lower-third + ticker)
//     z0 Background plate    (flat charcoal-navy — no external images)
//
//   CUTS BETWEEN SCENES (the "main content area"):
//     headline / beat  → two-tier LowerThird (reused), driven by the scene text
//     stat             → over-the-shoulder bold number panel (Counter + parseStat)
//     quote            → "soundbite" LowerThird (speaker in the red slab)
//     credit           → source + dateline sign-off endcard
//   …joined by a horizontal wipe/slide so each cut reads like a live switch.
//
// Hard rules honored:
//  - Exactly `export const Root: React.FC<StyleRootProps>` + default.
//  - 100% frame-driven; no CSS transition/animation, no timers, no runtime randomness.
//  - Deterministic (clock + flag pulse derive from frame + a seeded reproducible start).
//  - All three ARs (layout branches on orientation; sizes off the short edge).
//  - SceneSeries total == durationInFrames automatically (planScenes guarantees it).
//  - Every optional RenderDoc field is guarded.

import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { RenderDoc, StyleRootProps } from "../../engine/types";
import { StyleProvider, useStyleConfig } from "../../engine/StyleConfig";
import { planScenes, type Scene } from "../../engine/sequence";
import { SceneSeries, slide, wipe, type Presentation } from "../../engine/SceneSeries";
import { buildPalette } from "./palette";
import { BreakingFlag } from "./BreakingFlag";
import { Bug } from "./Bug";
import { LowerThird } from "./LowerThird";
import { Ticker } from "./Ticker";
import { StatScene, CreditScene } from "./Scenes";

const TRANS = 8; // cross-scene transition length (frames) — a fast "live switch"

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

// The kicker/source line for a lower-third: category (up-cased) + a mandatory source
// credit when the doc carries a source name. Dateline location is folded in when present.
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

// The kicker line for a soundbite (quote) scene: SOUNDBITE + speaker (+ title).
const buildSoundbiteKicker = (speaker: string | null, title: string | null): string => {
  const parts: string[] = ["SOUNDBITE"];
  const sp = (speaker ?? "").trim();
  const ti = (title ?? "").trim();
  if (sp) parts.push(ti ? `${sp}, ${ti}` : sp);
  return parts.join("  ·  ");
};

// ---- Scene content anchored to the lower-third band (reuses LowerThird) ---------------
// A LowerThird sits in the SceneSeries main area; it reveals in and HOLDS — the SceneSeries
// transition does the exit so it reads like a live cut, not a self-wipe.
const BandScene: React.FC<{
  headline: string;
  kicker: string;
  durationInFrames: number;
}> = ({ headline, kicker, durationInFrames }) => {
  const { width, height } = useVideoConfig();
  const { orientation } = useStyleConfig();
  const isPortrait = orientation === "portrait";
  const safeX = Math.round(width * 0.05);
  const safeY = Math.round(height * 0.05);
  // Pin the banner above the ticker band (or lifted off phone UI on portrait).
  const ltBottom = isPortrait
    ? Math.round(height * 0.34)
    : safeY + Math.round(height * (orientation === "square" ? 0.13 : 0.11));
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "flex-start",
        paddingLeft: safeX,
        paddingRight: safeX,
        paddingBottom: ltBottom,
      }}
    >
      <LowerThird headline={headline} kicker={kicker} durationInFrames={durationInFrames} hold />
    </AbsoluteFill>
  );
};

// ---- Per-scene dispatch ---------------------------------------------------------------
const renderScene = (
  s: Scene,
  i: number,
  durs: number[],
  doc: RenderDoc,
  kicker: string,
): React.ReactNode => {
  if (s.kind === "headline") return <BandScene headline={s.text} kicker={kicker} durationInFrames={durs[i]} />;
  if (s.kind === "beat") return <BandScene headline={s.text} kicker={kicker} durationInFrames={durs[i]} />;
  if (s.kind === "stat") return <StatScene value={s.value} label={s.label} />;
  if (s.kind === "quote") {
    return (
      <BandScene
        headline={`“${s.text}”`}
        kicker={buildSoundbiteKicker(s.speaker, s.speakerTitle)}
        durationInFrames={durs[i]}
      />
    );
  }
  return <CreditScene doc={doc} />;
};

// Cross-scene motion = a "live switch": a hard horizontal WIPE into the over-the-shoulder
// stat panel (graphic reveal), and a left→right SLIDE for every other cut (headline / beat
// / soundbite / sign-off), so each lower-third swap reads like a banner being pushed in.
const presentationFor = (next: Scene): Presentation =>
  (next.kind === "stat" ? wipe({ direction: "from-left" }) : slide({ direction: "from-left" })) as Presentation;

// ---- Inner (inside StyleProvider) -----------------------------------------------------
const BreakingInner: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const { width, height, durationInFrames } = useVideoConfig();
  const { orientation } = useStyleConfig();

  const isNarrow = orientation !== "landscape";
  const safeX = Math.round(width * 0.05);
  const safeY = Math.round(height * 0.05);

  // Quotes get a real "soundbite" treatment here, so opt them into the scene walk.
  const { scenes, durs, trans } = React.useMemo(
    () => planScenes(doc, durationInFrames, { trans: TRANS, includeQuote: true }),
    [doc, durationInFrames],
  );

  const ticker = buildTickerItems(doc.bodyBeats, doc.dek, doc.keyPhrases, doc.headline, isNarrow);
  const kicker = buildKicker(doc.category, doc.source.name, doc.dateline.location);

  // Corner-bug label: brand.label → source name → dateline location → generic.
  const bugLabel =
    (brand.label && brand.label.trim()) ||
    (doc.source.name && doc.source.name.trim()) ||
    (doc.dateline.location && doc.dateline.location.trim()) ||
    "NEWS";

  // Persistent-chrome entrance windows derived from durationInFrames so they always fit.
  const tickerStart = Math.min(30, Math.round(durationInFrames * 0.12));

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

      {/* MAIN CONTENT AREA — cuts through the whole message via the shared sequencer. */}
      <SceneSeries
        scenes={scenes}
        durs={durs}
        trans={trans}
        presentationFor={presentationFor}
        renderScene={(s, i) => renderScene(s, i, durs, doc, kicker)}
      />

      {/* z2 — Ticker (persistent: scrolls the body beats throughout the whole clip). */}
      <Sequence from={tickerStart} name="ticker">
        <Ticker items={ticker} liveLabel="LIVE" />
      </Sequence>

      {/* z4 — BREAKING flag (persistent, top-left, inside the safe band). */}
      <AbsoluteFill style={{ paddingTop: safeY, paddingLeft: safeX, alignItems: "flex-start", pointerEvents: "none" }}>
        <BreakingFlag label="BREAKING NEWS" />
      </AbsoluteFill>

      {/* z5 — Bug + clock (persistent, top-right, inside the safe band). */}
      <AbsoluteFill style={{ paddingTop: safeY, paddingRight: safeX, alignItems: "flex-end", pointerEvents: "none" }}>
        <Bug label={bugLabel} seed={seed} delay={6} />
      </AbsoluteFill>
    </>
  );
};

export const Root: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const palette = buildPalette({ accent: brand.accent, accentAlt: brand.accentAlt });
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <StyleProvider palette={palette}>
        <BreakingInner doc={doc} brand={brand} seed={seed} />
      </StyleProvider>
    </AbsoluteFill>
  );
};

export default Root;
