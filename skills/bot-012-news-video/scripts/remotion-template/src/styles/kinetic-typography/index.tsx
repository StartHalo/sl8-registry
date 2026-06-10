// Kinetic Typography — bold word-by-word animated text on a deterministic per-beat
// gradient. Social-first; shines at 9:16. The headline and each body beat are split
// into word tokens that spring in on a staggered delay; emphasis tokens (those in
// doc.keyPhrases) color-pop. If doc.primaryStat exists it gets a hero <Counter> moment.
// A credit line (doc.source.name) holds at the end.
//
// Hard rules honored:
//  - Exactly `export const Root: React.FC<StyleRootProps>`.
//  - All sizes from useStyleConfig()/useVideoConfig(); layout branches on orientation.
//  - Whole timeline fits within durationInFrames; trimming drops trailing beats, never
//    the lede (headline is always scene 0).
//  - 100% frame-driven; no CSS transition/animation, no timers, no Math.random.
//  - Every optional RenderDoc field is guarded.

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { StyleRootProps } from "../../engine/types";
import { StyleProvider, useStyleConfig } from "../../engine/StyleConfig";
import { SafeZone } from "../../engine/SafeZone";
import { Counter, parseStat } from "../../engine/primitives";
import { beatsThatFit, layoutBeats } from "../../engine/pacing";
import { FPS, STAGGER } from "../../engine/tokens";
import { buildPalette, STAGE } from "./palette";
import { buildEmphasisSet, KineticLine } from "./KineticLine";
import { GradientBg } from "./GradientBg";

// ---- Timeline planning ---------------------------------------------------------------

interface PlannedBeat {
  from: number;
  durationInFrames: number;
  text: string;
  beatIndex: number; // stable index for the gradient (0 = headline)
}

interface Plan {
  beats: PlannedBeat[];
  stat: { from: number; durationInFrames: number; beatIndex: number } | null;
}

const MIN_DWELL = Math.round(1.4 * FPS); // per-beat pacing floor (~42 frames)
const HEADLINE_DWELL = Math.round(2.0 * FPS); // headline gets a touch more

// Build a single plan that always fits inside `total` frames. The headline is scene 0
// and is never dropped; body beats are fitted by reading time; the stat (if any) claims
// a dedicated tail block. Trimming pressure removes trailing body beats first.
function buildPlan(
  total: number,
  headline: string,
  bodyBeats: string[],
  hasStat: boolean,
  maxBodyBeats: number,
): Plan {
  // Reserve a stat block at the end if a stat exists.
  const statDur = hasStat ? Math.min(Math.round(2.4 * FPS), Math.max(MIN_DWELL, Math.floor(total * 0.28))) : 0;

  // Headline claims the front; clamp so the rest of the timeline survives.
  const headlineDur = Math.min(
    Math.max(MIN_DWELL, HEADLINE_DWELL),
    Math.max(MIN_DWELL, total - statDur - (bodyBeats.length ? MIN_DWELL : 0)),
  );

  let cursor = 0;
  const beats: PlannedBeat[] = [
    { from: cursor, durationInFrames: headlineDur, text: headline, beatIndex: 0 },
  ];
  cursor += headlineDur;

  // Frames left for body beats (everything before the stat block).
  const bodyAvail = Math.max(0, total - cursor - statDur);

  if (bodyBeats.length > 0 && bodyAvail >= MIN_DWELL) {
    // How many leading beats fit, then lay them out proportionally to reading time.
    const fitted = beatsThatFit(bodyBeats, bodyAvail, maxBodyBeats).slice(0, maxBodyBeats);
    const segs = layoutBeats(fitted, bodyAvail, { lead: 0, tail: 0 });
    for (const s of segs) {
      // Enforce the dwell floor; if a segment can't fit at the floor, stop (drop trailing).
      const remaining = total - statDur - cursor;
      if (remaining < MIN_DWELL) break;
      const dur = Math.max(MIN_DWELL, Math.min(s.durationInFrames, remaining));
      beats.push({ from: cursor, durationInFrames: dur, text: s.text, beatIndex: beats.length });
      cursor += dur;
    }
  }

  let stat: Plan["stat"] = null;
  if (hasStat) {
    const statFrom = cursor;
    const statLen = Math.max(MIN_DWELL, total - statFrom);
    if (statLen >= Math.round(0.8 * FPS)) {
      stat = { from: statFrom, durationInFrames: statLen, beatIndex: beats.length };
    }
  }

  return { beats, stat };
}

// ---- Scenes --------------------------------------------------------------------------

const useScrim = (): React.CSSProperties => ({
  // A soft bottom-up scrim keeps the credit + lower type legible on any gradient.
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 100%)",
  pointerEvents: "none",
});

const TextBeat: React.FC<{
  text: string;
  beatIndex: number;
  emphasisSet: Set<string>;
  seed: number;
  isHeadline: boolean;
}> = ({ text, beatIndex, emphasisSet, seed, isHeadline }) => {
  const { palette, font, orientation, size, shortEdge } = useStyleConfig();

  // Word size derives from the type scale, scaled up for the kinetic "huge type" look,
  // and reduced on landscape (wider, more wrap room) vs portrait (tall, big type).
  const heroPx = size("hero");
  const scale = orientation === "portrait" ? 1.7 : orientation === "square" ? 1.45 : 1.25;
  const headlineScale = isHeadline ? 1.12 : 1;
  let fontSize = Math.round(heroPx * scale * headlineScale);
  // Never let a single huge word overflow: cap by short-edge fraction.
  const cap = Math.round(shortEdge * (orientation === "landscape" ? 0.11 : 0.16));
  fontSize = Math.min(fontSize, cap);

  // Stagger tightens slightly on portrait so the rhythm reads as punchy.
  const stagger = orientation === "portrait" ? Math.max(4, STAGGER - 3) : Math.max(4, STAGGER - 2);

  return (
    <AbsoluteFill>
      <GradientBg beatIndex={beatIndex} top={STAGE.gradientTop} bottom={STAGE.gradientBottom} accent={palette.accent} />
      <div style={useScrim()} />
      <SafeZone justify="center" align={orientation === "landscape" ? "flex-start" : "center"}>
        <KineticLine
          text={text}
          emphasisSet={emphasisSet}
          color={palette.text}
          accent={palette.accent}
          fontFamily={font.condensed}
          fontSize={fontSize}
          seed={seed + beatIndex * 101}
          stagger={stagger}
          startDelay={isHeadline ? 2 : 0}
          align={orientation === "landscape" ? "flex-start" : "center"}
        />
      </SafeZone>
    </AbsoluteFill>
  );
};

const StatBeat: React.FC<{
  value: string;
  label: string;
  beatIndex: number;
}> = ({ value, label, beatIndex }) => {
  const { palette, font, orientation, size, shortEdge } = useStyleConfig();
  const parsed = parseStat(value);

  // Big number scaled to the short edge; cap so multi-digit + prefix/suffix never overflow.
  const numScale = orientation === "portrait" ? 0.24 : orientation === "square" ? 0.22 : 0.2;
  const numPx = Math.min(size("stat"), Math.round(shortEdge * numScale));
  const labelPx = Math.max(size("meta"), Math.round(numPx * 0.18));

  // Spring pop on the whole stat block (frame-driven).
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const pop = interpolate(p, [0, 0.85, 1], [0.6, 1.06, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(p, [0, 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOpacity = interpolate(p, [0.45, 1], [0, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const numberNode =
    parsed.num !== null ? (
      <>
        {parsed.prefix}
        <Counter to={parsed.num} delay={8} durationInFrames={Math.round(0.9 * fps)} />
        {parsed.suffix}
      </>
    ) : (
      value
    );

  return (
    <AbsoluteFill>
      <GradientBg beatIndex={beatIndex} top={STAGE.gradientTop} bottom={STAGE.gradientBottom} accent={palette.accent} />
      <div style={useScrim()} />
      <SafeZone justify="center" align="center">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: Math.round(numPx * 0.08),
            transform: `scale(${pop})`,
            opacity,
          }}
        >
          <span
            style={{
              fontFamily: font.condensed,
              fontWeight: 700,
              fontSize: numPx,
              color: palette.accent,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              textShadow: "0 6px 30px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
            }}
          >
            {numberNode}
          </span>
          {label ? (
            <span
              style={{
                fontFamily: font.body,
                fontWeight: 700,
                fontSize: labelPx,
                color: palette.text,
                opacity: labelOpacity,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                textAlign: "center",
                maxWidth: "90%",
              }}
            >
              {label}
            </span>
          ) : null}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

// Persistent credit footer (only when source.name exists). Fades in near the end and holds.
const CreditLine: React.FC<{ name: string; byline: string | null; appearAt: number }> = ({
  name,
  byline,
  appearAt,
}) => {
  const { palette, font, orientation, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [appearAt, appearAt + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const px = size("meta");
  const pad = orientation === "portrait" ? { bottom: 200, x: 64 } : orientation === "square" ? { bottom: 64, x: 80 } : { bottom: 70, x: 120 };

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: pad.bottom,
        paddingLeft: pad.x,
        paddingRight: pad.x,
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: Math.round(px * 0.5),
          fontFamily: font.body,
          color: palette.textMuted,
          fontSize: px,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
        }}
      >
        <span
          style={{
            width: Math.round(px * 0.55),
            height: Math.round(px * 0.55),
            borderRadius: 999,
            backgroundColor: palette.accent,
            display: "inline-block",
          }}
        />
        <span style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
          {name}
          {byline ? ` · ${byline}` : ""}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ---- Inner (inside provider, so hooks can read orientation/size) ---------------------

const KineticInner: React.FC<StyleRootProps> = ({ doc, seed }) => {
  const { durationInFrames } = useVideoConfig();
  const { orientation } = useStyleConfig();

  const emphasisSet = React.useMemo(() => buildEmphasisSet(doc.keyPhrases), [doc.keyPhrases]);

  const hasStat = doc.primaryStat !== null && Boolean(doc.primaryStat?.value);
  // Fewer beats on landscape (wider lines, more wrap), more on portrait.
  const maxBodyBeats = orientation === "landscape" ? 4 : 5;

  const plan = React.useMemo(
    () => buildPlan(durationInFrames, doc.headline || "", doc.bodyBeats, hasStat, maxBodyBeats),
    [durationInFrames, doc.headline, doc.bodyBeats, hasStat, maxBodyBeats],
  );

  const sourceName = doc.source.name;
  // Credit appears once the last visual beat (stat or final text beat) has begun.
  const lastFrom = plan.stat
    ? plan.stat.from
    : plan.beats.length
      ? plan.beats[plan.beats.length - 1].from
      : 0;
  const creditAppearAt = Math.min(durationInFrames - 12, lastFrom + Math.round(0.6 * FPS));

  return (
    <>
      {plan.beats.map((b) => (
        <Sequence key={`b-${b.beatIndex}`} from={b.from} durationInFrames={b.durationInFrames}>
          <TextBeat
            text={b.text}
            beatIndex={b.beatIndex}
            emphasisSet={emphasisSet}
            seed={seed}
            isHeadline={b.beatIndex === 0}
          />
        </Sequence>
      ))}

      {plan.stat && doc.primaryStat ? (
        <Sequence from={plan.stat.from} durationInFrames={plan.stat.durationInFrames}>
          <StatBeat
            value={doc.primaryStat.value}
            label={doc.primaryStat.label}
            beatIndex={plan.stat.beatIndex}
          />
        </Sequence>
      ) : null}

      {sourceName ? (
        <Sequence from={0} durationInFrames={durationInFrames}>
          <CreditLine name={sourceName} byline={doc.source.byline} appearAt={creditAppearAt} />
        </Sequence>
      ) : null}
    </>
  );
};

// ---- Root ----------------------------------------------------------------------------

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
