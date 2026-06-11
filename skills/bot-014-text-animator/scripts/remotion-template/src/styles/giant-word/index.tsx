// Giant Word — ONE enormous word/phrase fills the frame at a time and SLAMS in from the
// center (scale from ~0.2 with a springy overshoot + a quick blur-to-sharp), then holds.
// Punchy, loud, social-first. Heavy condensed caps (font.condensed) auto-fit to nearly
// fill the safe width; keyPhrases pop in the brand accent with a soft glow; the hero stat
// is a GIANT slamming number. It PROGRESSES through the whole message:
// headline → 1-3 beats → stat → credit, with fast fade/slide cuts so each scene's own
// slam-in dominates, all over one continuous breathing-glow stage.
//
// Hard rules honored:
//  - Exactly `export const Root: React.FC<StyleRootProps>` (+ default).
//  - 100% frame-driven (useCurrentFrame + interpolate/spring); no CSS transition/keyframes,
//    no timers, no wall-clock reads.
//  - Deterministic: all jitter via noise(seed,...) — no Math.random. Same props → same frames.
//  - All three ARs: layout/words-per-line/sizes branch on orientation; auto-fit clamps by
//    the longest word vs content width so nothing overflows the SafeZone.
//  - Sizes from useStyleConfig()/useVideoConfig(); fonts only from font.*.
//  - The <TransitionSeries> total equals durationInFrames (planScenes + SceneSeries).
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
import { SceneSeries, fade, slide, type Presentation } from "../../engine/SceneSeries";
import { buildPalette, STAGE } from "./palette";
import { buildEmphasisSet, SlamLine } from "./SlamLine";
import { GiantStage } from "./GiantStage";

const TRANS = 6; // short cross-scene cut so each scene's own slam-in dominates

type Orient = "landscape" | "portrait" | "square";

// AR-driven layout knobs: portrait runs taller + fewer words/line; landscape is wider.
const layoutFor = (orientation: Orient, shortEdge: number) => {
  if (orientation === "portrait") {
    return { wordsPerLine: 2, maxLines: 3, cap: Math.round(shortEdge * 0.2) };
  }
  if (orientation === "square") {
    return { wordsPerLine: 3, maxLines: 3, cap: Math.round(shortEdge * 0.16) };
  }
  // landscape — wider rows, fewer lines
  return { wordsPerLine: 4, maxLines: 2, cap: Math.round(shortEdge * 0.135) };
};

// Drawable content width target inside the SafeZone. shortEdge === width at portrait/square
// but === height at landscape, so scale up by ~16:9 there. SlamLine clamps by longest word.
const contentWidth = (orientation: Orient, shortEdge: number): number =>
  orientation === "landscape"
    ? Math.round((16 / 9) * shortEdge * 0.78)
    : Math.round(shortEdge * 0.86);

// ---- Scenes (each renders inside a TransitionSeries.Sequence with a LOCAL frame) -------

const SlamScene: React.FC<{
  text: string;
  emphasisSet: Set<string>;
  seed: number;
  isHeadline?: boolean;
}> = ({ text, emphasisSet, seed, isHeadline = false }) => {
  const { palette, font, orientation, shortEdge } = useStyleConfig();
  const { wordsPerLine, maxLines, cap } = layoutFor(orientation, shortEdge);
  // Drawable inner width inside the SafeZone. shortEdge is the WIDTH at portrait/square and
  // the HEIGHT at landscape, so widen by the AR at landscape. SlamLine re-clamps by the
  // longest word, so this is a target, not a hard guarantee.
  const contentW = contentWidth(orientation, shortEdge);

  const stagger = orientation === "portrait" ? 5 : 6;
  return (
    <SafeZone justify="center" align="center">
      <SlamLine
        text={text}
        emphasisSet={emphasisSet}
        color={palette.text}
        accent={palette.accent}
        fontFamily={font.condensed}
        contentW={contentW}
        shortEdge={shortEdge}
        wordsPerLine={wordsPerLine}
        maxLines={maxLines}
        capFontSize={cap}
        seed={seed}
        stagger={stagger}
        startDelay={isHeadline ? 2 : 0}
      />
    </SafeZone>
  );
};

// The hero stat: a GIANT condensed number that slams in (scale-from-small spring overshoot
// + blur-to-sharp), animated via Counter, in the accent, with an optional unit label below.
const StatScene: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const parsed = parseStat(value);

  // Auto-fit: a compact figure ("35%", "$40M") stays GIANT, but a long value the structurer
  // may emit ("2 million workers") must shrink to fit the frame instead of overflowing off-
  // screen (whiteSpace:nowrap). Clamp by the full display string's char count vs content width.
  const display = parsed.num !== null ? `${parsed.prefix}${parsed.num}${parsed.suffix}` : value;
  const charCount = Math.max(1, display.trim().length);
  const contentW = shortEdge * (orientation === "landscape" ? 0.8 : 0.9);
  const fitPx = Math.floor(contentW / (charCount * 0.52)); // condensed avg char width ~0.52em
  const numPxBase = Math.round(shortEdge * (orientation === "landscape" ? 0.34 : 0.42));
  const numPx = Math.max(Math.round(shortEdge * 0.06), Math.min(numPxBase, fitPx));

  // Slam-in for the whole number block.
  const enter = spring({ frame: frame - 2, fps, config: { damping: 12, mass: 0.7, stiffness: 170 } });
  const sharp = interpolate(frame - 2, [0, 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(enter, [0, 1], [0.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "extend" });
  const opacity = interpolate(sharp, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blur = interpolate(sharp, [0, 1], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const labelO = interpolate(frame, [16, 30], [0, 0.95], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelY = interpolate(frame, [16, 30], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: numPx * 0.08,
          padding: "0 6%",
          maxWidth: "100%",
        }}
      >
        <span
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            opacity,
            filter: blur > 0.05 ? `blur(${blur}px)` : "none",
            fontFamily: font.condensed,
            fontWeight: 700,
            fontSize: numPx,
            color: palette.accent,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.03em",
            lineHeight: 0.92,
            textShadow: `0 0 ${Math.round(numPx * 0.4)}px ${palette.accent}77, 0 8px 36px rgba(0,0,0,0.6)`,
            whiteSpace: "nowrap",
          }}
        >
          {parsed.num !== null ? (
            <>
              {parsed.prefix}
              <Counter to={parsed.num} delay={6} durationInFrames={Math.round(0.85 * fps)} />
              {parsed.suffix}
            </>
          ) : (
            value
          )}
        </span>
        {label ? (
          <span
            style={{
              fontFamily: font.body,
              fontWeight: 800,
              fontSize: size("meta"),
              color: palette.text,
              opacity: labelO,
              transform: `translateY(${labelY}px)`,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              textAlign: "center",
              maxWidth: "88%",
            }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// Credit: the source name (or headline fallback) as a giant slamming word, with a small
// accent dot and the dateline tracked out below.
const CreditScene: React.FC<{ doc: RenderDoc; emphasisSet: Set<string>; seed: number }> = ({
  doc,
  emphasisSet,
  seed,
}) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const { wordsPerLine, maxLines, cap } = layoutFor(orientation, shortEdge);
  const name = (doc.source.name || doc.headline || "").trim();
  const dateline = [doc.dateline.location, doc.dateline.dateDisplay]
    .filter((s): s is string => Boolean(s))
    .join(" · ");

  const usableW = contentWidth(orientation, shortEdge);

  // Accent dot + dateline ease in after the name has landed.
  const tail = interpolate(frame, [14, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <SafeZone justify="center" align="center">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size("meta") * 0.9, width: "100%" }}>
        {name ? (
          <SlamLine
            text={name}
            emphasisSet={emphasisSet}
            color={palette.text}
            accent={palette.accent}
            fontFamily={font.condensed}
            contentW={usableW}
            shortEdge={shortEdge}
            wordsPerLine={wordsPerLine}
            maxLines={maxLines}
            capFontSize={cap}
            seed={seed}
            stagger={4}
            startDelay={0}
          />
        ) : null}
        {dateline ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: size("meta") * 0.55,
              opacity: tail,
              transform: `translateY(${interpolate(tail, [0, 1], [16, 0])}px)`,
            }}
          >
            <span
              style={{
                width: size("meta") * 0.4,
                height: size("meta") * 0.4,
                borderRadius: 999,
                background: palette.accent,
                boxShadow: `0 0 ${size("meta") * 0.9}px ${palette.accent}aa`,
              }}
            />
            <span
              style={{
                fontFamily: font.body,
                fontWeight: 700,
                fontSize: size("meta"),
                color: palette.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
              }}
            >
              {dateline}
            </span>
          </div>
        ) : null}
      </div>
    </SafeZone>
  );
};

// ---- Cross-scene motion: fast, low-travel fade/slide so the per-scene SLAM dominates ----

const presentationFor = (next: Scene, i: number): Presentation =>
  (next.kind === "stat"
    ? slide({ direction: "from-bottom" })
    : i % 2 === 0
      ? fade()
      : slide({ direction: "from-right" })) as Presentation;

// ---- Inner + Root ---------------------------------------------------------------------

const renderScene = (
  s: Scene,
  emphasisSet: Set<string>,
  seed: number,
  doc: RenderDoc,
): React.ReactNode => {
  if (s.kind === "headline") return <SlamScene text={s.text} emphasisSet={emphasisSet} seed={seed} isHeadline />;
  if (s.kind === "beat") return <SlamScene text={s.text} emphasisSet={emphasisSet} seed={seed} />;
  if (s.kind === "stat") return <StatScene value={s.value} label={s.label} />;
  return <CreditScene doc={doc} emphasisSet={emphasisSet} seed={seed} />;
};

const GiantWordInner: React.FC<StyleRootProps> = ({ doc, seed }) => {
  const { durationInFrames } = useVideoConfig();
  const { palette } = useStyleConfig();
  const emphasisSet = React.useMemo(() => buildEmphasisSet(doc.keyPhrases), [doc.keyPhrases]);
  // Quotes don't read as a single GIANT word, so opt out — keep the punchy
  // headline → beats → stat → credit arc. (planScenes guarantees the series total === dur.)
  const { scenes, durs, trans } = React.useMemo(
    () => planScenes(doc, durationInFrames, { trans: TRANS, includeQuote: false, maxBeats: 3 }),
    [doc, durationInFrames],
  );

  return (
    <>
      <GiantStage bg={STAGE.bg} core={STAGE.glowCore} accent={palette.accent} accentAlt={palette.accentAlt} seed={seed} />
      <SceneSeries
        scenes={scenes}
        durs={durs}
        trans={trans}
        presentationFor={presentationFor}
        renderScene={(s) => renderScene(s, emphasisSet, seed, doc)}
      />
    </>
  );
};

export const Root: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const palette = buildPalette({ accent: brand.accent, accentAlt: brand.accentAlt ?? null });
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <StyleProvider palette={palette}>
        <GiantWordInner doc={doc} brand={brand} seed={seed} />
      </StyleProvider>
    </AbsoluteFill>
  );
};

export default Root;
