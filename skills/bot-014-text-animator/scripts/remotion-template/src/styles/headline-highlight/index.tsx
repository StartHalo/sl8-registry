// Headline Highlight — a clean editorial article style where a seeded rough.js
// highlighter marker sweeps left→right behind the key phrases. UPGRADED to PROGRESS
// through the whole message (headline → body beats → hero stat → quote → credit) on the
// shared scene-sequencer, instead of holding one static headline.
//
// Each Scene renders inside a <TransitionSeries.Sequence> (local frame starting at 0),
// drawn as an editorial card. Every text scene reuses the <HiSpan>/<Highlighter> marker
// so the signature highlighter look re-fires per scene: the headline keyPhrases get
// swept, each beat highlights its own matched phrases, the hero stat gets an accent
// marker block + Counter, the quote underlines its speaker, and the credit closes the
// dateline. The Article3D perspective drift + a persistent kicker chip + progress bar are
// global chrome (outside the series) so the whole card-stage keeps its recognizable
// editorial framing while the content area cuts between scenes.
//
// Engine contract: sizes from useStyleConfig().size()/shortEdge + useVideoConfig; layout
// branches on orientation; SceneSeries makes the timeline total durationInFrames exactly;
// all motion is frame-driven (no CSS transition/keyframes/timers); determinism via
// engine/rng (hashStr) — never Math.random; optional doc fields are guarded.

import React from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RenderDoc, StyleRootProps } from "../../engine/types";
import { StyleProvider, useStyleConfig } from "../../engine/StyleConfig";
import { SafeZone } from "../../engine/SafeZone";
import { hashStr } from "../../engine/rng";
import { Counter, parseStat } from "../../engine/primitives";
import { planScenes, type Scene } from "../../engine/sequence";
import { SceneSeries, fade, slide, type Presentation } from "../../engine/SceneSeries";
import { buildPalette, HIGHLIGHTER_INK } from "./palette";
import { Article3D } from "./Article3D";
import { Highlighter } from "./Highlighter";

const TRANS = 9; // cross-scene transition length (frames)

// ---------------------------------------------------------------------------
// HiSpan — an inline keyphrase that draws its own seeded highlighter behind itself.
// Self-measuring (local offsets), so it needs no global rect mapping. Sweep timings are
// against the LOCAL sequence frame, so each scene re-fires its own marker from frame 0.
// ---------------------------------------------------------------------------

const HiSpan: React.FC<{
  text: string;
  uid: string;
  seed: number;
  startFrame: number;
  sweepFrames: number;
}> = ({ text, uid, seed, startFrame, sweepFrames }) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  const [handle] = React.useState(() => delayRender(`hl-${uid}`));

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight });
    continueRender(handle);
  }, [handle, text]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
      {size
        ? (() => {
            const padX = Math.max(6, Math.round(size.h * 0.16));
            const padY = Math.max(4, Math.round(size.h * 0.13));
            return (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: size.w,
                  height: size.h,
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              >
                <Highlighter
                  uid={uid}
                  rect={{ x: 0, y: 0, width: size.w, height: size.h }}
                  color={HIGHLIGHTER_INK}
                  seed={seed}
                  startFrame={startFrame}
                  sweepFrames={sweepFrames}
                  padX={padX}
                  padY={padY}
                />
              </span>
            );
          })()
        : null}
      <span style={{ position: "relative", zIndex: 1 }}>{text}</span>
    </span>
  );
};

// ---------------------------------------------------------------------------
// Phrase spec + span splitting. We split a text block on its keyphrase matches
// (longest-first, case-insensitive) and wrap matches in a <HiSpan>.
// ---------------------------------------------------------------------------

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface PhraseSpec {
  text: string;
  seed: number; // distinct-but-fixed per keyPhrase (drives marker geometry)
  order: number; // 0-based sweep order
}

type RenderHi = (matched: string, spec: PhraseSpec, uid: string) => React.ReactNode;

const renderWithSpans = (
  text: string,
  block: string,
  phrases: PhraseSpec[],
  renderHi: RenderHi,
): React.ReactNode => {
  if (!phrases.length || !text) return text;
  const ordered = [...phrases].sort((a, b) => b.text.length - a.text.length);
  const re = new RegExp(`(${ordered.map((p) => escapeRe(p.text)).join("|")})`, "gi");
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const matched = m[0];
    const spec =
      phrases.find((p) => p.text.toLowerCase() === matched.toLowerCase()) ?? phrases[0];
    out.push(renderHi(matched, spec, `${block}-${n}`));
    last = m.index + matched.length;
    n += 1;
    if (m.index === re.lastIndex) re.lastIndex += 1; // guard zero-width loops
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

// Build seeded phrase specs once per keyPhrase list.
const usePhraseSpecs = (keyPhrases: string[], seed: number): PhraseSpec[] =>
  React.useMemo(
    () =>
      keyPhrases.map((text, i) => ({
        text,
        order: i,
        seed: ((seed * 2654435761) ^ hashStr(text)) >>> 0,
      })),
    [keyPhrases, seed],
  );

// A renderHi factory that staggers the sweeps for a scene, all within `sceneFrames`.
const makeRenderHi = (sceneFrames: number, fps: number, nPhrases: number): RenderHi => {
  const sweep = Math.round(0.55 * fps);
  const blurDone = Math.round(0.32 * fps); // let the card settle before the first sweep
  const tail = Math.round(0.25 * fps);
  const room = Math.max(0, sceneFrames - tail - blurDone - sweep);
  const ideal = Math.round(0.42 * fps);
  const stagger = nPhrases > 1 ? Math.min(ideal, Math.floor(room / (nPhrases - 1))) : 0;
  return (matched, spec, uid) => (
    <HiSpan
      key={uid}
      uid={uid}
      text={matched}
      seed={spec.seed}
      startFrame={blurDone + spec.order * stagger}
      sweepFrames={sweep}
    />
  );
};

// ---------------------------------------------------------------------------
// Shared editorial card chrome (per scene). A light near-white card that blurs/lifts in
// over the first ~0.5s of its OWN local frame, with a kicker eyebrow on top.
// ---------------------------------------------------------------------------

const useCardReveal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const blurPx = interpolate(frame, [0, Math.round(0.5 * fps)], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [0, Math.round(0.28 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lift = spring({ frame, fps, config: { damping: 200 } });
  const translateY = interpolate(lift, [0, 1], [18, 0]);
  return { filter: `blur(${blurPx}px)`, opacity, transform: `translateY(${translateY}px)` };
};

const cardWidthFor = (orientation: string, width: number): number =>
  orientation === "portrait"
    ? Math.round(width * 0.88)
    : orientation === "square"
      ? Math.round(width * 0.84)
      : Math.round(width * 0.66);

const EditorialCard: React.FC<{
  kicker?: string;
  children: React.ReactNode;
  padScale?: number;
}> = ({ kicker, children, padScale = 1 }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const { width } = useVideoConfig();
  const reveal = useCardReveal();
  const pad = Math.round(shortEdge * 0.075 * padScale);
  const cardW = cardWidthFor(orientation, width);
  const kickerPx = size("kicker");

  return (
    <SafeZone justify="center" align="center">
      <div
        style={{
          ...reveal,
          position: "relative",
          width: cardW,
          maxWidth: "100%",
          backgroundColor: palette.surface,
          padding: `${pad}px ${Math.round(pad * 1.05)}px`,
          borderRadius: Math.round(shortEdge * 0.008),
          border: `1px solid ${palette.accentAlt}`,
          boxShadow: "0 30px 80px rgba(20, 16, 8, 0.16)",
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: font.body,
              fontSize: kickerPx,
              fontWeight: 700,
              letterSpacing: kickerPx * 0.12,
              textTransform: "uppercase",
              color: palette.accent,
              marginBottom: Math.round(pad * 0.28),
            }}
          >
            {kicker}
          </div>
        ) : null}
        {children}
      </div>
    </SafeZone>
  );
};

// ---------------------------------------------------------------------------
// Scenes — each renders inside a TransitionSeries.Sequence with a LOCAL frame.
// ---------------------------------------------------------------------------

// Headline — serif display face, keyPhrases swept by the highlighter.
const HeadlineScene: React.FC<{
  text: string;
  dek: string | null;
  kicker: string;
  phrases: PhraseSpec[];
  sceneFrames: number;
}> = ({ text, dek, kicker, phrases, sceneFrames }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const { fps } = useVideoConfig();
  const heroPx = size("hero");
  const headlinePx =
    orientation === "portrait"
      ? Math.round(heroPx * 0.86)
      : orientation === "square"
        ? Math.round(heroPx * 0.92)
        : heroPx;
  const dekPx = size("dek");
  const pad = Math.round(shortEdge * 0.075);
  const renderHi = makeRenderHi(sceneFrames, fps, Math.max(1, phrases.length));

  return (
    <EditorialCard kicker={kicker}>
      <h1
        style={{
          fontFamily: font.display,
          fontSize: headlinePx,
          lineHeight: 1.12,
          fontWeight: 900,
          color: palette.text,
          margin: 0,
        }}
      >
        {renderWithSpans(text, "hl", phrases, renderHi)}
      </h1>
      {dek ? (
        <p
          style={{
            fontFamily: font.display,
            fontSize: dekPx,
            lineHeight: 1.34,
            fontStyle: "italic",
            color: palette.textMuted,
            margin: `${Math.round(pad * 0.34)}px 0 0`,
          }}
        >
          {renderWithSpans(dek, "dek", phrases, renderHi)}
        </p>
      ) : null}
    </EditorialCard>
  );
};

// Beat — one editorial paragraph, its own matched phrases highlighted. A hairline rule +
// a small ordinal pip keep the "advancing through the article" feel.
const BeatScene: React.FC<{
  text: string;
  index: number;
  total: number;
  kicker: string;
  phrases: PhraseSpec[];
  sceneFrames: number;
}> = ({ text, index, total, kicker, phrases, sceneFrames }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const { fps } = useVideoConfig();
  // Beats read larger than the body paragraph did, since each beat now stands alone.
  const beatPx =
    orientation === "portrait"
      ? Math.round(size("hero") * 0.6)
      : orientation === "square"
        ? Math.round(size("hero") * 0.58)
        : Math.round(size("hero") * 0.56);
  const pad = Math.round(shortEdge * 0.075);
  const metaPx = size("meta");
  const renderHi = makeRenderHi(sceneFrames, fps, Math.max(1, phrases.length));

  return (
    <EditorialCard kicker={kicker}>
      {/* ordinal pip — which beat of the article we're on */}
      <div
        style={{
          fontFamily: font.body,
          fontSize: metaPx,
          fontWeight: 700,
          color: palette.accent,
          letterSpacing: "0.16em",
          marginBottom: Math.round(pad * 0.22),
        }}
      >
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
      <p
        style={{
          fontFamily: font.body,
          fontSize: beatPx,
          lineHeight: 1.4,
          fontWeight: 600,
          color: palette.text,
          margin: 0,
        }}
      >
        {renderWithSpans(text, `beat-${index}`, phrases, renderHi)}
      </p>
      <div
        style={{
          height: 1,
          backgroundColor: palette.accentAlt,
          margin: `${Math.round(pad * 0.5)}px 0 0`,
        }}
      />
    </EditorialCard>
  );
};

// Stat — the big number gets its OWN marker sweep block (an accent highlighter behind the
// figure) plus a Counter; the label rides below.
const StatScene: React.FC<{ value: string; label: string; seed: number; sceneFrames: number }> = ({
  value,
  label,
  seed,
  sceneFrames,
}) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const { fps } = useVideoConfig();
  const parsed = parseStat(value);

  const numPx =
    orientation === "portrait"
      ? Math.round(shortEdge * 0.2)
      : orientation === "square"
        ? Math.round(shortEdge * 0.21)
        : Math.round(shortEdge * 0.23);
  const pad = Math.round(shortEdge * 0.075);

  // Self-measuring marker behind the figure (same machinery as HiSpan, dedicated geometry).
  const ref = React.useRef<HTMLSpanElement>(null);
  const [box, setBox] = React.useState<{ w: number; h: number } | null>(null);
  const [handle] = React.useState(() => delayRender(`stat-${seed}`));
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el) setBox({ w: el.offsetWidth, h: el.offsetHeight });
    continueRender(handle);
  }, [handle, value]);

  const sweepStart = Math.round(0.3 * fps);
  const sweep = Math.min(Math.round(0.7 * fps), Math.max(1, sceneFrames - sweepStart - 4));
  const labelO = interpolate(
    useCurrentFrame(),
    [Math.round(0.5 * fps), Math.round(0.9 * fps)],
    [0, 0.92],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <EditorialCard>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: Math.round(pad * 0.45),
          padding: `${Math.round(pad * 0.4)}px 0`,
        }}
      >
        <span
          ref={ref}
          style={{
            position: "relative",
            display: "inline-block",
            whiteSpace: "nowrap",
            fontFamily: font.display,
            fontWeight: 900,
            fontSize: numPx,
            color: palette.text,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {box ? (
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: box.w,
                height: box.h,
                zIndex: 0,
                pointerEvents: "none",
              }}
            >
              <Highlighter
                uid={`stat-${seed}`}
                rect={{ x: 0, y: 0, width: box.w, height: box.h }}
                color={HIGHLIGHTER_INK}
                seed={(seed ^ hashStr(value)) >>> 0}
                startFrame={sweepStart}
                sweepFrames={sweep}
                padX={Math.max(10, Math.round(box.h * 0.1))}
                padY={Math.max(8, Math.round(box.h * 0.08))}
              />
            </span>
          ) : null}
          <span style={{ position: "relative", zIndex: 1 }}>
            {parsed.num !== null ? (
              <>
                {parsed.prefix}
                <Counter to={parsed.num} delay={6} durationInFrames={Math.round(0.9 * fps)} />
                {parsed.suffix}
              </>
            ) : (
              value
            )}
          </span>
        </span>
        {label ? (
          <span
            style={{
              fontFamily: font.body,
              fontWeight: 700,
              fontSize: size("meta"),
              color: palette.textMuted,
              opacity: labelO,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              maxWidth: "90%",
            }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </EditorialCard>
  );
};

// Quote — a serif pull-quote. The big quote mark + speaker get the highlighter sweep so
// quotes get a real treatment (includeQuote: true).
const QuoteScene: React.FC<{
  text: string;
  speaker: string | null;
  speakerTitle: string | null;
  seed: number;
  sceneFrames: number;
}> = ({ text, speaker, speakerTitle, seed, sceneFrames }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const { fps } = useVideoConfig();
  const quotePx =
    orientation === "portrait"
      ? Math.round(size("hero") * 0.62)
      : orientation === "square"
        ? Math.round(size("hero") * 0.6)
        : Math.round(size("hero") * 0.58);
  const pad = Math.round(shortEdge * 0.075);
  const markPx = Math.round(quotePx * 2.1);

  // The speaker name is the one phrase we sweep here.
  const spec: PhraseSpec[] = speaker
    ? [{ text: speaker, order: 0, seed: ((seed * 40503) ^ hashStr(speaker)) >>> 0 }]
    : [];
  const renderHi = makeRenderHi(sceneFrames, fps, 1);
  const credit = [speaker, speakerTitle].filter((s): s is string => Boolean(s)).join(", ");

  return (
    <EditorialCard padScale={0.95}>
      <div
        style={{
          fontFamily: font.display,
          fontWeight: 900,
          fontSize: markPx,
          lineHeight: 0.6,
          color: palette.accent,
          height: Math.round(markPx * 0.42),
          overflow: "hidden",
          marginBottom: Math.round(pad * 0.1),
        }}
      >
        &ldquo;
      </div>
      <p
        style={{
          fontFamily: font.display,
          fontSize: quotePx,
          lineHeight: 1.28,
          fontStyle: "italic",
          fontWeight: 600,
          color: palette.text,
          margin: 0,
        }}
      >
        {text}
      </p>
      {credit ? (
        <div
          style={{
            fontFamily: font.body,
            fontSize: size("meta"),
            fontWeight: 700,
            color: palette.textMuted,
            marginTop: Math.round(pad * 0.42),
            letterSpacing: "0.04em",
          }}
        >
          {"— "}
          {renderWithSpans(credit, "quote-credit", spec, renderHi)}
        </div>
      ) : null}
    </EditorialCard>
  );
};

// Credit — source + dateline endplate.
const CreditScene: React.FC<{ doc: RenderDoc; kicker: string }> = ({ doc, kicker }) => {
  const { palette, font, shortEdge, size } = useStyleConfig();
  const pad = Math.round(shortEdge * 0.075);
  const name = doc.source.name || doc.headline;
  const dateline = [doc.dateline.location, doc.dateline.dateDisplay]
    .filter((s): s is string => Boolean(s))
    .join(" · ");

  return (
    <EditorialCard kicker={kicker}>
      <div style={{ display: "flex", flexDirection: "column", gap: Math.round(pad * 0.4) }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size("meta") * 0.5) }}>
          <span
            style={{
              width: Math.round(size("meta") * 0.5),
              height: Math.round(size("meta") * 0.5),
              borderRadius: "50%",
              backgroundColor: palette.accent,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontFamily: font.display,
              fontWeight: 900,
              fontSize: size("headline"),
              color: palette.text,
              lineHeight: 1.1,
            }}
          >
            {name}
          </span>
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
        {doc.source.byline ? (
          <span
            style={{
              fontFamily: font.body,
              fontSize: size("meta"),
              color: palette.textMuted,
            }}
          >
            {doc.source.byline}
          </span>
        ) : null}
      </div>
    </EditorialCard>
  );
};

// ---------------------------------------------------------------------------
// Persistent overlays (GLOBAL frame; outside the TransitionSeries).
// ---------------------------------------------------------------------------

// A thin progress bar at the bottom, tinted to the brand accent.
const ProgressBar: React.FC = () => {
  const { palette, orientation } = useStyleConfig();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bottomPad = orientation === "portrait" ? 188 : orientation === "square" ? 72 : 64;
  const sidePad = orientation === "portrait" ? 64 : 96;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bottomPad, pointerEvents: "none" }}>
      <div
        style={{
          width: `calc(100% - ${sidePad * 2}px)`,
          height: 5,
          borderRadius: 999,
          background: "rgba(20,16,8,0.14)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${p * 100}%`, height: "100%", background: palette.accent, borderRadius: 999 }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Inner — runs under <StyleProvider>; sets up the scene plan + persistent chrome.
// ---------------------------------------------------------------------------

// Calm editorial motion: fade for the lede/quote/credit, gentle slide-up for beats/stat.
const presentationFor = (next: Scene): Presentation =>
  (next.kind === "beat" || next.kind === "stat"
    ? slide({ direction: "from-bottom" })
    : fade()) as Presentation;

const Inner: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const { durationInFrames } = useVideoConfig();
  const phrases = usePhraseSpecs(doc.keyPhrases, seed);

  const { scenes, durs, trans } = React.useMemo(
    () => planScenes(doc, durationInFrames, { trans: TRANS, includeQuote: true, maxBeats: 4 }),
    [doc, durationInFrames],
  );

  const kicker = (brand.label ?? (doc.category && doc.category !== "other" ? doc.category : "News")).toString();
  const beatCount = scenes.filter((s) => s.kind === "beat").length;

  const renderScene = (s: Scene, i: number): React.ReactNode => {
    const beatIndex = scenes.slice(0, i).filter((x) => x.kind === "beat").length;
    if (s.kind === "headline")
      return <HeadlineScene text={s.text} dek={doc.dek} kicker={kicker} phrases={phrases} sceneFrames={durs[i]} />;
    if (s.kind === "beat")
      return (
        <BeatScene
          text={s.text}
          index={beatIndex}
          total={beatCount}
          kicker={kicker}
          phrases={phrases}
          sceneFrames={durs[i]}
        />
      );
    if (s.kind === "stat")
      return <StatScene value={s.value} label={s.label} seed={seed} sceneFrames={durs[i]} />;
    if (s.kind === "quote")
      return (
        <QuoteScene
          text={s.text}
          speaker={s.speaker}
          speakerTitle={s.speakerTitle}
          seed={seed}
          sceneFrames={durs[i]}
        />
      );
    return <CreditScene doc={doc} kicker={kicker} />;
  };

  // Article3D wraps the whole stage so the editorial perspective drift persists across the
  // scene cuts (its signature look), while the content area inside cuts between scenes.
  return (
    <>
      <Article3D>
        <SceneSeries
          scenes={scenes}
          durs={durs}
          trans={trans}
          renderScene={renderScene}
          presentationFor={presentationFor}
        />
      </Article3D>
      <ProgressBar />
    </>
  );
};

// ---------------------------------------------------------------------------
// Root — required RenderDoc fields only; optionals guarded downstream.
// ---------------------------------------------------------------------------

export const Root: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const palette = buildPalette(brand.accent);
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <StyleProvider palette={palette}>
        <Inner doc={doc} brand={brand} seed={seed} />
      </StyleProvider>
    </AbsoluteFill>
  );
};

export default Root;
