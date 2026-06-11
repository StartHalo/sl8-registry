// Perspective-3D — cinematic text laid on a tilted 3D floor plane. A CSS `perspective`
// parent holds a panel rotated on X; its contents drift slowly UPWARD and recede across each
// scene (a gentle title-crawl / floor-tilt), dissolving into a "horizon" fog at the top.
// Premium, filmic, calm. The clip PROGRESSES through the whole message:
//   headline → body beats → hero stat (large, on the plane, counted up) → quote (tilted
//   pull-quote w/ speaker, if present) → end credit.
//
// Hard rules honored:
//  - Exactly `export const Root: React.FC<StyleRootProps>` (+ default).
//  - 100% frame-driven (useCurrentFrame + interpolate/spring); no CSS transition/keyframes,
//    no timers, no wall-clock, no Math.random — jitter via engine noise(seed,…).
//  - Sizes/positions from useStyleConfig() and branch on orientation; type clamped to the
//    plane's content width + a floor so nothing clips the SafeZone or overflows.
//  - planScenes + <SceneSeries> guarantee the series total === durationInFrames; every
//    optional RenderDoc field (dek/stat/quote/source/dateline) is guarded.
//  - Self-contained: no imports from other styles/, no edits to engine/ or the dispatcher.

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
import { SceneSeries, fade, slide, type Presentation } from "../../engine/SceneSeries";
import { buildPalette, CINEMA } from "./palette";
import { Stage } from "./Stage";
import { TiltedPlane } from "./TiltedPlane";
import { buildEmphasisSet, PerspectiveLines } from "./PerspectiveLines";

const TRANS = 12; // cross-scene transition length (frames) — calm, filmic crossfades

// ---- Scenes (each renders inside a TransitionSeries.Sequence with a LOCAL frame) -------

const TextScene: React.FC<{
  text: string;
  emphasisSet: Set<string>;
  seed: number;
  isHeadline?: boolean;
}> = ({ text, emphasisSet, seed, isHeadline = false }) => (
  <SafeZone justify="center" align="center">
    <TiltedPlane fogColor={CINEMA.gradientTop}>
      <PerspectiveLines
        text={text}
        emphasisSet={emphasisSet}
        seed={seed}
        isHeadline={isHeadline}
        startDelay={isHeadline ? 3 : 1}
      />
    </TiltedPlane>
  </SafeZone>
);

// The hero stat parked on the tilted plane — a large counted number that catches the accent,
// with the label resting beneath it on the same floor.
const StatScene: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const { palette, font, orientation, shortEdge } = useStyleConfig();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const parsed = parseStat(value);

  const numPx = Math.round(shortEdge * (orientation === "landscape" ? 0.2 : 0.24));
  const labelPx = Math.round(shortEdge * (orientation === "portrait" ? 0.034 : 0.03));

  const pop = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const numScale = interpolate(pop, [0, 1], [0.8, 1]);
  const numO = interpolate(frame, [2, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelO = interpolate(frame, [18, 32], [0, 0.92], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <SafeZone justify="center" align="center">
      <TiltedPlane fogColor={CINEMA.gradientTop} settle>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: numPx * 0.1 }}>
          <span
            style={{
              opacity: numO,
              transform: `scale(${numScale})`,
              transformOrigin: "center bottom",
              fontFamily: font.display,
              fontWeight: 900,
              fontSize: numPx,
              color: palette.accent,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.03em",
              lineHeight: 0.95,
              textShadow: `0 0 ${numPx * 0.32}px ${palette.accent}55, 0 10px 40px rgba(0,0,0,0.6)`,
              whiteSpace: "nowrap",
            }}
          >
            {parsed.num !== null ? (
              <>
                {parsed.prefix}
                <Counter to={parsed.num} delay={8} durationInFrames={Math.round(1.0 * fps)} />
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
                fontFamily: font.condensed,
                fontWeight: 500,
                fontSize: labelPx,
                color: palette.text,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                textAlign: "center",
                maxWidth: shortEdge * 0.78,
                lineHeight: 1.3,
                textShadow: "0 6px 24px rgba(0,0,0,0.55)",
              }}
            >
              {label}
            </span>
          ) : null}
        </div>
      </TiltedPlane>
    </SafeZone>
  );
};

// A tilted pull-quote: large serif body on the plane, an accent quotation mark, and the
// speaker / title resting on the floor beneath. Guards a missing speaker.
const QuoteScene: React.FC<{
  text: string;
  speaker: string | null;
  speakerTitle: string | null;
  seed: number;
}> = ({ text, speaker, speakerTitle, seed }) => {
  const { palette, font, orientation, shortEdge } = useStyleConfig();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Size the quote so even a long line fits the plane; quotes get a slightly smaller cap than
  // headlines so longer passages don't overflow.
  const longest = Math.max(1, ...text.split(/\s+/).filter(Boolean).map((w) => w.length));
  const contentW = shortEdge * (orientation === "landscape" ? 1.0 : 0.84);
  const fitByWord = Math.floor(contentW / (longest * 0.52));
  const cap = Math.round(shortEdge * (orientation === "landscape" ? 0.07 : 0.085));
  const floor = Math.round(shortEdge * 0.04);
  const quotePx = Math.max(floor, Math.min(cap, fitByWord));
  const markPx = Math.round(quotePx * 1.9);
  const metaPx = Math.round(shortEdge * 0.026);

  const enter = spring({ frame: frame - 3, fps, config: { damping: 200 } });
  const bodyO = interpolate(enter, [0, 1], [0, 1]);
  const bodyY = interpolate(enter, [0, 1], [shortEdge * 0.06, 0]);
  const speakerO = interpolate(frame, [16, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const markO = interpolate(frame, [2, 14], [0, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const jitter = (noiseFree(seed) - 0.5) * 4;

  const credit = [speaker, speakerTitle].filter((s): s is string => Boolean(s)).join(" · ");

  return (
    <SafeZone justify="center" align="center">
      <TiltedPlane fogColor={CINEMA.gradientTop} settle>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: quotePx * 0.4,
            width: "100%",
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: font.display,
              fontWeight: 900,
              fontSize: markPx,
              lineHeight: 0.6,
              color: palette.accent,
              opacity: markO,
              height: markPx * 0.45,
            }}
          >
            &ldquo;
          </span>
          <span
            style={{
              opacity: bodyO,
              transform: `translateY(${bodyY + (1 - enter) * jitter}px)`,
              fontFamily: font.display,
              fontWeight: 500,
              fontStyle: "italic",
              fontSize: quotePx,
              color: palette.text,
              lineHeight: 1.18,
              maxWidth: contentW,
              letterSpacing: "-0.005em",
              textShadow: "0 6px 30px rgba(0,0,0,0.55)",
            }}
          >
            {text}
          </span>
          {credit ? (
            <span
              style={{
                opacity: speakerO,
                fontFamily: font.condensed,
                fontWeight: 500,
                fontSize: metaPx,
                color: palette.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                maxWidth: contentW,
                lineHeight: 1.3,
              }}
            >
              {credit}
            </span>
          ) : null}
        </div>
      </TiltedPlane>
    </SafeZone>
  );
};

const CreditScene: React.FC<{ doc: RenderDoc }> = ({ doc }) => {
  const { palette, font, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const t = interpolate(frame, [4, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const name = doc.source.name || doc.headline;
  const dateline = [doc.dateline.location, doc.dateline.dateDisplay]
    .filter((s): s is string => Boolean(s))
    .join(" · ");

  return (
    <SafeZone justify="center" align="center">
      <TiltedPlane fogColor={CINEMA.gradientTop} settle>
        <div
          style={{
            opacity: t,
            transform: `translateY(${interpolate(t, [0, 1], [26, 0])}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: size("meta") * 0.7,
            textAlign: "center",
            padding: "0 6%",
          }}
        >
          <span
            style={{
              width: size("meta") * 0.7,
              height: 2,
              background: palette.accent,
              boxShadow: `0 0 ${size("meta") * 0.8}px ${palette.accent}aa`,
              transform: `scaleX(${interpolate(t, [0, 1], [0, 1])})`,
            }}
          />
          <span
            style={{
              fontFamily: font.display,
              fontWeight: 600,
              fontSize: size("headline"),
              color: palette.text,
              letterSpacing: "-0.01em",
              lineHeight: 1.08,
              textShadow: "0 6px 30px rgba(0,0,0,0.55)",
            }}
          >
            {name}
          </span>
          {dateline ? (
            <span
              style={{
                fontFamily: font.condensed,
                fontWeight: 500,
                fontSize: size("meta"),
                color: palette.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
              }}
            >
              {dateline}
            </span>
          ) : null}
        </div>
      </TiltedPlane>
    </SafeZone>
  );
};

// ---- Persistent overlay: a faint, accent-tinted scene index / brand label, low corner -----

const Kicker: React.FC<{ label: string }> = ({ label }) => {
  const { palette, font, orientation } = useStyleConfig();
  const frame = useCurrentFrame();
  const o = interpolate(frame, [8, 24], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const top = orientation === "portrait" ? 150 : orientation === "square" ? 80 : 70;
  const px = Math.round(useStyleConfig().shortEdge * 0.02);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: top, opacity: o, pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: px * 0.7 }}>
        <span style={{ width: px * 0.4, height: px * 0.4, borderRadius: 999, background: palette.accent, boxShadow: `0 0 ${px}px ${palette.accent}` }} />
        <span
          style={{
            fontFamily: font.condensed,
            fontWeight: 500,
            fontSize: px,
            color: palette.text,
            textTransform: "uppercase",
            letterSpacing: "0.42em",
            paddingLeft: "0.42em",
          }}
        >
          {label}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ---- Cross-scene motion: calm filmic crossfade everywhere; slide-from-bottom into the
// stat so the number rises onto the floor like the rest of the crawl. -----------------------

const presentationFor = (next: Scene, _i: number): Presentation =>
  (next.kind === "stat" ? slide({ direction: "from-bottom" }) : fade()) as Presentation;

// noiseFree: a frame-independent deterministic value from a seed for one-off settle jitter.
function noiseFree(seed: number): number {
  const t = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return ((t ^ (t >>> 13)) >>> 0) / 4294967296;
}

// ---- Inner + Root ---------------------------------------------------------------------

const renderScene = (
  s: Scene,
  emphasisSet: Set<string>,
  seed: number,
  doc: RenderDoc,
): React.ReactNode => {
  if (s.kind === "headline") return <TextScene text={s.text} emphasisSet={emphasisSet} seed={seed} isHeadline />;
  if (s.kind === "beat") return <TextScene text={s.text} emphasisSet={emphasisSet} seed={seed} />;
  if (s.kind === "stat") return <StatScene value={s.value} label={s.label} />;
  if (s.kind === "quote")
    return <QuoteScene text={s.text} speaker={s.speaker} speakerTitle={s.speakerTitle} seed={seed} />;
  return <CreditScene doc={doc} />;
};

const PerspectiveInner: React.FC<StyleRootProps> = ({ doc, seed }) => {
  const { durationInFrames } = useVideoConfig();
  const { palette } = useStyleConfig();
  const emphasisSet = React.useMemo(() => buildEmphasisSet(doc.keyPhrases), [doc.keyPhrases]);

  const { scenes, durs, trans } = React.useMemo(
    () => planScenes(doc, durationInFrames, { trans: TRANS, includeQuote: true }),
    [doc, durationInFrames],
  );

  const kicker = doc.category && doc.category !== "other" ? doc.category : "Feature";

  return (
    <>
      <Stage
        top={CINEMA.gradientTop}
        bottom={CINEMA.gradientBottom}
        accent={palette.accent}
        accentAlt={palette.accentAlt}
        seed={seed}
      />
      <SceneSeries
        scenes={scenes}
        durs={durs}
        trans={trans}
        presentationFor={presentationFor}
        renderScene={(s) => renderScene(s, emphasisSet, seed, doc)}
      />
      <Kicker label={kicker} />
    </>
  );
};

export const Root: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const palette = buildPalette({ accent: brand.accent, accentAlt: brand.accentAlt ?? null });
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <StyleProvider palette={palette}>
        <PerspectiveInner doc={doc} brand={brand} seed={seed} />
      </StyleProvider>
    </AbsoluteFill>
  );
};

export default Root;
