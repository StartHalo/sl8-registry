// Kinetic Typography — bold word-by-word news video that PROGRESSES through the story:
// headline → key facts → the hero stat → an end credit, with smooth cross-scene
// transitions (slide / fade / wipe via @remotion/transitions) over a continuously
// evolving backdrop. Persistent kicker chip + progress bar frame it like a broadcast cut.
//
// Hard rules honored:
//  - Exactly `export const Root: React.FC<StyleRootProps>`.
//  - Sizes from useStyleConfig()/useVideoConfig(); layout branches on orientation.
//  - The <TransitionSeries> total equals durationInFrames (scene durations padded by the
//    transition overlap), so trimming drops trailing beats, never the lede (headline = scene 0).
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
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import type { TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { RenderDoc, StyleRootProps } from "../../engine/types";
import { StyleProvider, useStyleConfig } from "../../engine/StyleConfig";
import { SafeZone } from "../../engine/SafeZone";
import { Counter, parseStat } from "../../engine/primitives";
import { beatsThatFit } from "../../engine/pacing";
import { FPS } from "../../engine/tokens";
import { buildPalette, STAGE } from "./palette";
import { buildEmphasisSet, KineticLine } from "./KineticLine";
import { Backdrop } from "./Backdrop";

const TRANS = 9; // cross-scene transition length (frames)

type Scene =
  | { kind: "headline"; text: string }
  | { kind: "beat"; text: string }
  | { kind: "stat"; value: string; label: string }
  | { kind: "credit" };

const words = (s: string): string[] => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);

// The headline scene already carries the lede, so drop a leading body beat that mostly
// repeats the headline — the scenes should show DISTINCT elements, not the same line twice.
// Measure how much of the HEADLINE the beat restates (a lede usually contains the whole hed).
function distinctBeats(headline: string, beats: string[]): string[] {
  if (beats.length <= 1) return beats;
  const hwords = words(headline);
  if (!hwords.length) return beats;
  const bset = new Set(words(beats[0]));
  const coverage = hwords.filter((w) => bset.has(w)).length / hwords.length;
  return coverage >= 0.6 ? beats.slice(1) : beats;
}

// Build the ordered scene list + per-scene durations so the TransitionSeries total
// equals durationInFrames exactly (sceneDurations sum to D + (n-1)*TRANS).
function planScenes(doc: RenderDoc, durationInFrames: number): { scenes: Scene[]; durs: number[] } {
  const hasStat = doc.primaryStat !== null && Boolean(doc.primaryStat?.value);
  const beats = beatsThatFit(distinctBeats(doc.headline || "", doc.bodyBeats), durationInFrames, 4);

  const scenes: Scene[] = [{ kind: "headline", text: doc.headline || "" }];
  for (const b of beats) scenes.push({ kind: "beat", text: b });
  if (hasStat && doc.primaryStat) scenes.push({ kind: "stat", value: doc.primaryStat.value, label: doc.primaryStat.label });
  scenes.push({ kind: "credit" });

  const weightOf = (s: Scene): number =>
    s.kind === "headline" ? 2.0
    : s.kind === "beat" ? Math.max(1.5, s.text.split(/\s+/).filter(Boolean).length / 2.5)
    : s.kind === "stat" ? 2.3
    : 1.5;

  const weights = scenes.map(weightOf);
  const n = scenes.length;
  const target = durationInFrames + (n - 1) * TRANS; // so series total == durationInFrames
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const MIN = Math.round(1.1 * FPS);
  const durs = weights.map((w) => Math.max(MIN, Math.round((w / sum) * target)));
  // Absorb rounding into the longest scene so the total is exact.
  const diff = target - durs.reduce((a, b) => a + b, 0);
  const maxi = durs.indexOf(Math.max(...durs));
  durs[maxi] = Math.max(MIN, durs[maxi] + diff);

  return { scenes, durs };
}

// ---- Scenes (each renders inside a TransitionSeries.Sequence with a LOCAL frame) -------

const TextScene: React.FC<{ text: string; emphasisSet: Set<string>; seed: number; isHeadline?: boolean }> = ({
  text,
  emphasisSet,
  seed,
  isHeadline = false,
}) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const heroPx = size("hero");
  const arScale = orientation === "portrait" ? 1.7 : orientation === "square" ? 1.45 : 1.25;
  const cap = Math.round(shortEdge * (orientation === "landscape" ? 0.11 : 0.155));
  // Clamp so the LONGEST single (non-wrapping) word fits the content width — long compound
  // words like "WAREHOUSE-AUTOMATION" otherwise overflow the safe zone at full size.
  const longest = Math.max(1, ...text.split(/\s+/).filter(Boolean).map((w) => w.length));
  const contentW = shortEdge * (orientation === "landscape" ? 0.78 : 0.86);
  const fitByWord = Math.floor(contentW / (longest * 0.52)); // ~condensed avg char width
  const floor = Math.round(shortEdge * 0.05);
  const fontSize = Math.max(floor, Math.min(cap, fitByWord, Math.round(heroPx * arScale * (isHeadline ? 1.1 : 1))));
  const stagger = orientation === "portrait" ? 6 : 7;
  return (
    <SafeZone justify="center" align="center">
      <KineticLine
        text={text}
        emphasisSet={emphasisSet}
        color={palette.text}
        accent={palette.accent}
        fontFamily={font.condensed}
        fontSize={fontSize}
        seed={seed}
        stagger={stagger}
        startDelay={isHeadline ? 2 : 0}
        align="center"
      />
    </SafeZone>
  );
};

const StatScene: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const { palette, font, shortEdge, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const parsed = parseStat(value);

  const numPx = Math.round(shortEdge * 0.26);
  const ringR = Math.round(shortEdge * 0.3);
  const stroke = Math.max(5, Math.round(shortEdge * 0.007));
  const box = ringR * 2 + stroke * 2 + 12;
  const circ = 2 * Math.PI * ringR;
  const draw = interpolate(frame, [6, 6 + Math.round(1.1 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const pop = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const scale = interpolate(pop, [0, 1], [0.72, 1]);
  const labelO = interpolate(frame, [16, 30], [0, 0.92], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: numPx * 0.12, transform: `scale(${scale})` }}>
        <div style={{ position: "relative", width: box, height: box, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} style={{ position: "absolute", inset: 0 }}>
            <circle cx={box / 2} cy={box / 2} r={ringR} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} />
            <circle
              cx={box / 2}
              cy={box / 2}
              r={ringR}
              fill="none"
              stroke={palette.accent}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - draw)}
              transform={`rotate(-90 ${box / 2} ${box / 2})`}
            />
          </svg>
          <span
            style={{
              fontFamily: font.condensed,
              fontWeight: 700,
              fontSize: numPx,
              color: palette.accent,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              textShadow: `0 0 ${numPx * 0.35}px ${palette.accent}66`,
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
        </div>
        {label ? (
          <span
            style={{
              fontFamily: font.body,
              fontWeight: 700,
              fontSize: size("meta"),
              color: palette.text,
              opacity: labelO,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              textAlign: "center",
              maxWidth: "85%",
            }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const CreditScene: React.FC<{ doc: RenderDoc }> = ({ doc }) => {
  const { palette, font, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const t = interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const name = doc.source.name || doc.headline;
  const dateline = [doc.dateline.location, doc.dateline.dateDisplay].filter((s): s is string => Boolean(s)).join(" · ");
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          opacity: t,
          transform: `translateY(${interpolate(t, [0, 1], [22, 0])}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: size("meta") * 0.55,
          textAlign: "center",
          padding: "0 8%",
        }}
      >
        <span
          style={{
            width: size("meta") * 0.95,
            height: size("meta") * 0.95,
            borderRadius: 999,
            background: palette.accent,
            boxShadow: `0 0 ${size("meta") * 1.2}px ${palette.accent}99`,
          }}
        />
        <span
          style={{
            fontFamily: font.condensed,
            fontWeight: 700,
            fontSize: size("headline"),
            color: palette.text,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            lineHeight: 1.05,
          }}
        >
          {name}
        </span>
        {dateline ? (
          <span
            style={{
              fontFamily: font.body,
              fontWeight: 600,
              fontSize: size("meta"),
              color: palette.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
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

const KickerChip: React.FC<{ label: string }> = ({ label }) => {
  const { palette, font, size, orientation } = useStyleConfig();
  const frame = useCurrentFrame();
  const o = interpolate(frame, [6, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const topPad = orientation === "portrait" ? 150 : orientation === "square" ? 84 : 70;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: topPad, opacity: o, pointerEvents: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: size("kicker") * 0.5,
          padding: `${size("kicker") * 0.42}px ${size("kicker") * 0.85}px`,
          border: `2px solid ${palette.accent}`,
          borderRadius: 999,
          background: "rgba(0,0,0,0.28)",
        }}
      >
        <span style={{ width: size("kicker") * 0.5, height: size("kicker") * 0.5, borderRadius: 999, background: palette.accent }} />
        <span style={{ fontFamily: font.body, fontWeight: 800, fontSize: size("kicker"), color: palette.text, textTransform: "uppercase", letterSpacing: "0.2em" }}>
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
  const p = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bottomPad = orientation === "portrait" ? 180 : orientation === "square" ? 72 : 64;
  const sidePad = orientation === "portrait" ? 64 : 84;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bottomPad, pointerEvents: "none" }}>
      <div style={{ width: `calc(100% - ${sidePad * 2}px)`, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
        <div style={{ width: `${p * 100}%`, height: "100%", background: palette.accent, boxShadow: `0 0 12px ${palette.accent}`, borderRadius: 999 }} />
      </div>
    </AbsoluteFill>
  );
};

// ---- Inner + Root ---------------------------------------------------------------------

const renderScene = (s: Scene, emphasisSet: Set<string>, seed: number, doc: RenderDoc): React.ReactNode => {
  if (s.kind === "headline") return <TextScene text={s.text} emphasisSet={emphasisSet} seed={seed} isHeadline />;
  if (s.kind === "beat") return <TextScene text={s.text} emphasisSet={emphasisSet} seed={seed} />;
  if (s.kind === "stat") return <StatScene value={s.value} label={s.label} />;
  return <CreditScene doc={doc} />;
};

const KineticInner: React.FC<StyleRootProps> = ({ doc, seed }) => {
  const { durationInFrames } = useVideoConfig();
  const { palette } = useStyleConfig();
  const emphasisSet = React.useMemo(() => buildEmphasisSet(doc.keyPhrases), [doc.keyPhrases]);
  const { scenes, durs } = React.useMemo(() => planScenes(doc, durationInFrames), [doc, durationInFrames]);

  const seq: React.ReactNode[] = [];
  scenes.forEach((s, i) => {
    seq.push(
      <TransitionSeries.Sequence key={`s-${i}`} durationInFrames={durs[i]}>
        {renderScene(s, emphasisSet, seed, doc)}
      </TransitionSeries.Sequence>,
    );
    if (i < scenes.length - 1) {
      const next = scenes[i + 1];
      const presentation = (
        next.kind === "stat"
          ? wipe({ direction: "from-left" })
          : next.kind === "credit"
            ? fade()
            : i % 2 === 0
              ? slide({ direction: "from-bottom" })
              : fade()
      ) as TransitionPresentation<Record<string, unknown>>;
      seq.push(
        <TransitionSeries.Transition key={`t-${i}`} presentation={presentation} timing={linearTiming({ durationInFrames: TRANS })} />,
      );
    }
  });

  const kicker = doc.category && doc.category !== "other" ? doc.category : "News";

  return (
    <>
      <Backdrop top={STAGE.gradientTop} bottom={STAGE.gradientBottom} accent={palette.accent} accentAlt={palette.accentAlt} seed={seed} />
      <TransitionSeries>{seq}</TransitionSeries>
      <KickerChip label={kicker} />
      <ProgressBar />
    </>
  );
};

export const Root: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const palette = buildPalette({ accent: brand.accent, accentAlt: brand.accentAlt ?? null });
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <StyleProvider palette={palette}>
        <KineticInner doc={doc} brand={brand} seed={seed} />
      </StyleProvider>
    </AbsoluteFill>
  );
};

export default Root;
