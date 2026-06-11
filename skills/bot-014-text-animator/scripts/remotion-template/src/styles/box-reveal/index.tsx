// Box Reveal — crisp, editorial word-by-word block reveals. Each word sits in a mask and a
// solid colored slab sweeps across it (covering, then uncovering the letters), staggered per
// word. The accent block reveals the key phrases and the hero stat; a neutral light block
// reveals everything else. Heavy condensed uppercase type on a clean near-black stage so the
// slabs pop. The clip PROGRESSES through the whole message: headline → beats → hero stat →
// end credit, with crisp wipe cuts between scenes. A thin top kicker (category) and a bottom
// progress bar frame it like a broadcast cut.
//
// Hard rules honored:
//  - Exactly `export const Root: React.FC<StyleRootProps>` (+ default).
//  - Sizes from useStyleConfig()/useVideoConfig(); layout branches on orientation; type is
//    clamped by the longest word vs content width so nothing clips the SafeZone.
//  - The <TransitionSeries> total equals durationInFrames (planScenes guarantees it).
//  - 100% frame-driven; no CSS transition/animation, no timers, no runtime randomness.
//  - Every optional RenderDoc field is guarded.

import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RenderDoc, StyleRootProps } from "../../engine/types";
import { StyleProvider, useStyleConfig } from "../../engine/StyleConfig";
import { SafeZone } from "../../engine/SafeZone";
import { Counter, parseStat } from "../../engine/primitives";
import { planScenes, type Scene } from "../../engine/sequence";
import { SceneSeries, wipe, fade, type Presentation } from "../../engine/SceneSeries";
import { buildPalette, STAGE } from "./palette";
import { buildEmphasisSet, BoxLine } from "./BoxLine";
import { Stage } from "./Stage";

const TRANS = 8; // cross-scene transition length (frames)

// Crisp editorial motion language: wipe between text scenes (matches the in-word block
// sweep), wipe hard INTO the hero stat, fade calmly into the end credit.
const boxPresentationFor = (next: Scene, i: number): Presentation =>
  next.kind === "credit"
    ? fade()
    : next.kind === "stat"
      ? wipe({ direction: "from-left" })
      : i % 2 === 0
        ? wipe({ direction: "from-left" })
        : wipe({ direction: "from-bottom" });

// ---- Scenes (each renders inside a TransitionSeries.Sequence with a LOCAL frame) -------

const TextScene: React.FC<{
  text: string;
  emphasisSet: Set<string>;
  seed: number;
  isHeadline?: boolean;
}> = ({ text, emphasisSet, seed, isHeadline = false }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const heroPx = size("hero");
  const arScale = orientation === "portrait" ? 1.65 : orientation === "square" ? 1.4 : 1.22;
  const cap = Math.round(shortEdge * (orientation === "landscape" ? 0.11 : 0.16));

  // Clamp so the LONGEST single (non-wrapping) word fits the content width — long compound
  // words otherwise overflow the safe zone at full size. ~condensed avg char width 0.52em.
  const longest = Math.max(1, ...text.split(/\s+/).filter(Boolean).map((w) => w.length));
  const contentW = shortEdge * (orientation === "landscape" ? 0.78 : 0.84);
  const fitByWord = Math.floor(contentW / (longest * 0.52));
  const floor = Math.round(shortEdge * 0.05);
  const fontSize = Math.max(
    floor,
    Math.min(cap, fitByWord, Math.round(heroPx * arScale * (isHeadline ? 1.08 : 0.92))),
  );

  const stagger = orientation === "portrait" ? 5 : 6;
  const sweep = orientation === "portrait" ? 16 : 18;

  return (
    <SafeZone justify="center" align="center">
      <BoxLine
        text={text}
        emphasisSet={emphasisSet}
        textColor={palette.text}
        inkOnBlock={STAGE.inkOnLight}
        accent={palette.accent}
        neutralBlock={STAGE.neutralBlock}
        fontFamily={font.condensed}
        fontSize={fontSize}
        seed={seed}
        stagger={stagger}
        startDelay={isHeadline ? 2 : 0}
        align="center"
        sweep={sweep}
      />
    </SafeZone>
  );
};

// The hero stat: a big number revealed by a single wide accent block sweep (mirrors the
// per-word reveal at scale), then the label fades up below.
const StatScene: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const parsed = parseStat(value);

  const numPx = Math.round(shortEdge * (orientation === "landscape" ? 0.22 : 0.28));
  const padY = numPx * 0.1;
  const padX = numPx * 0.08;
  const sweep = Math.round(0.8 * fps);

  // One wide block sweeps left→right across the number box, IN then OUT.
  const p = interpolate(frame, [4, 4 + sweep], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blockX = interpolate(p, [0, 0.5, 1], [-110, 0, 110], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blockOpacity = interpolate(p, [0, 0.04, 0.96, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const reveal = interpolate(p, [0.46, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const clipRight = interpolate(reveal, [0, 1], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Counter only starts ticking once the block has uncovered the digits.
  const counterDelay = Math.round(4 + sweep * 0.5);

  // Settle pop after the block clears.
  const settle = spring({ frame: frame - (4 + sweep), fps, config: { damping: 200 } });
  const settleScale = interpolate(settle, [0, 1], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelO = interpolate(frame, [4 + sweep, 4 + sweep + 14], [0, 0.95], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelW = interpolate(frame, [4 + sweep, 4 + sweep + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: numPx * 0.14,
          transform: `scale(${settleScale})`,
          padding: "0 6%",
        }}
      >
        <span
          style={{
            position: "relative",
            display: "inline-block",
            padding: `${padY}px ${padX}px`,
            overflow: "hidden",
            fontFamily: font.condensed,
            fontWeight: 700,
            fontSize: numPx,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          <span
            style={{
              display: "inline-block",
              color: palette.accent,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              clipPath: `inset(0 ${clipRight}% 0 0)`,
              WebkitClipPath: `inset(0 ${clipRight}% 0 0)`,
            }}
          >
            {parsed.num !== null ? (
              <>
                {parsed.prefix}
                <Counter to={parsed.num} delay={counterDelay} durationInFrames={Math.round(0.7 * fps)} />
                {parsed.suffix}
              </>
            ) : (
              value
            )}
          </span>
          {/* the wide accent reveal block */}
          <span
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "110%",
              background: palette.accent,
              opacity: blockOpacity,
              transform: `translateX(${blockX}%)`,
              pointerEvents: "none",
            }}
          />
        </span>

        {label ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size("meta") * 0.5 }}>
            <span
              style={{
                width: Math.round(numPx * 0.5),
                height: Math.max(3, Math.round(shortEdge * 0.006)),
                background: palette.accent,
                transform: `scaleX(${labelW})`,
                transformOrigin: "center",
                borderRadius: 2,
              }}
            />
            <span
              style={{
                fontFamily: font.body,
                fontWeight: 700,
                fontSize: size("meta"),
                color: palette.text,
                opacity: labelO,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                textAlign: "center",
                maxWidth: "85%",
              }}
            >
              {label}
            </span>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// End credit: source/dateline revealed by a simple block sweep, matching the look.
const CreditScene: React.FC<{ doc: RenderDoc }> = ({ doc }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const frame = useCurrentFrame();

  const name = doc.source.name || doc.headline;
  const dateline = [doc.dateline.location, doc.dateline.dateDisplay]
    .filter((s): s is string => Boolean(s))
    .join(" · ");

  const namePx = Math.min(size("headline"), Math.round(shortEdge * (orientation === "landscape" ? 0.062 : 0.08)));
  const padY = namePx * 0.12;
  const padX = namePx * 0.08;
  const sweep = 18;

  const p = interpolate(frame, [4, 4 + sweep], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blockX = interpolate(p, [0, 0.5, 1], [-110, 0, 110], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blockOpacity = interpolate(p, [0, 0.05, 0.95, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const reveal = interpolate(p, [0.46, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const clipRight = interpolate(reveal, [0, 1], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dateO = interpolate(frame, [4 + sweep, 4 + sweep + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: size("meta") * 0.7,
          textAlign: "center",
          padding: "0 8%",
        }}
      >
        <span
          style={{
            position: "relative",
            display: "inline-block",
            padding: `${padY}px ${padX}px`,
            overflow: "hidden",
            fontFamily: font.condensed,
            fontWeight: 700,
            fontSize: namePx,
            lineHeight: 1.04,
          }}
        >
          <span
            style={{
              display: "inline-block",
              color: palette.text,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              clipPath: `inset(0 ${clipRight}% 0 0)`,
              WebkitClipPath: `inset(0 ${clipRight}% 0 0)`,
            }}
          >
            {name}
          </span>
          <span
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "110%",
              background: palette.accent,
              opacity: blockOpacity,
              transform: `translateX(${blockX}%)`,
              pointerEvents: "none",
            }}
          />
        </span>

        {dateline ? (
          <span
            style={{
              fontFamily: font.body,
              fontWeight: 600,
              fontSize: size("meta"),
              color: palette.textMuted,
              opacity: dateO,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            {dateline}
          </span>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ---- Persistent overlays (GLOBAL frame; outside the TransitionSeries) ------------------

const Kicker: React.FC<{ label: string }> = ({ label }) => {
  const { palette, font, size, orientation } = useStyleConfig();
  const frame = useCurrentFrame();
  const o = interpolate(frame, [6, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const w = interpolate(frame, [6, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const topPad = orientation === "portrait" ? 150 : orientation === "square" ? 80 : 66;
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: topPad, opacity: o, pointerEvents: "none" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: size("kicker") * 0.55 }}>
        {/* a small solid accent slab — echoes the reveal blocks */}
        <span
          style={{
            width: size("kicker") * 0.9,
            height: size("kicker") * 0.9,
            background: palette.accent,
            transform: `scaleX(${w})`,
            transformOrigin: "left center",
          }}
        />
        <span
          style={{
            fontFamily: font.body,
            fontWeight: 800,
            fontSize: size("kicker"),
            color: palette.text,
            textTransform: "uppercase",
            letterSpacing: "0.26em",
            opacity: w,
          }}
        >
          {label}
        </span>
      </div>
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  const { palette, orientation } = useStyleConfig();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bottomPad = orientation === "portrait" ? 180 : orientation === "square" ? 72 : 60;
  const sidePad = orientation === "portrait" ? 64 : 84;
  return (
    <AbsoluteFill
      style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bottomPad, pointerEvents: "none" }}
    >
      <div
        style={{
          width: `calc(100% - ${sidePad * 2}px)`,
          height: 5,
          background: "rgba(255,255,255,0.12)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${p * 100}%`, height: "100%", background: palette.accent }} />
      </div>
    </AbsoluteFill>
  );
};

// ---- Inner + Root ---------------------------------------------------------------------

const renderScene = (s: Scene, emphasisSet: Set<string>, seed: number, doc: RenderDoc): React.ReactNode => {
  if (s.kind === "headline") return <TextScene text={s.text} emphasisSet={emphasisSet} seed={seed} isHeadline />;
  if (s.kind === "beat") return <TextScene text={s.text} emphasisSet={emphasisSet} seed={seed} />;
  if (s.kind === "stat") return <StatScene value={s.value} label={s.label} />;
  // No dedicated quote treatment in this style → planScenes opts out of quotes below.
  return <CreditScene doc={doc} />;
};

const BoxRevealInner: React.FC<StyleRootProps> = ({ doc, seed }) => {
  const { durationInFrames } = useVideoConfig();
  const { palette } = useStyleConfig();
  const emphasisSet = React.useMemo(() => buildEmphasisSet(doc.keyPhrases), [doc.keyPhrases]);

  const { scenes, durs, trans } = React.useMemo(
    () => planScenes(doc, durationInFrames, { trans: TRANS, includeQuote: false }),
    [doc, durationInFrames],
  );

  const kicker = doc.category && doc.category !== "other" ? doc.category : "News";

  return (
    <>
      <Stage bg={STAGE.bg} panel={STAGE.panel} accent={palette.accent} seed={seed} />
      <SceneSeries
        scenes={scenes}
        durs={durs}
        trans={trans}
        presentationFor={boxPresentationFor}
        renderScene={(s) => renderScene(s, emphasisSet, seed, doc)}
      />
      <Kicker label={kicker} />
      <ProgressBar />
    </>
  );
};

export const Root: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const palette = buildPalette({ accent: brand.accent, accentAlt: brand.accentAlt ?? null });
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <StyleProvider palette={palette}>
        <BoxRevealInner doc={doc} brand={brand} seed={seed} />
      </StyleProvider>
    </AbsoluteFill>
  );
};

export default Root;
