// Pixel Reveal — a retro/tech style where every text scene is REVEALED through a seeded
// pixel-block dissolve (a mosaic/dither wipe) over a dark tech stage with a faint static
// grid + scanlines, and key phrases / the headline get a hand-drawn (roughjs) underline
// that "draws" itself in. It PROGRESSES through the whole message:
// headline → beats → hero stat (big counter) → credit, with clockWipe cross-scene cuts.
//
// Hard rules honored:
//  - Exactly `export const Root: React.FC<StyleRootProps>` (+ default).
//  - 100% frame-driven (useCurrentFrame + interpolate/spring). No CSS transition/keyframes,
//    no timers, no wall-clock reads.
//  - Deterministic: the dissolve thresholds come from noise(seed, cell, salt); the rough
//    underline pins roughjs's seed; emphasis jitter via noise/hashStr. No Math.random.
//  - All three ARs: sizes/positions branch on orientation; font clamped by longest word vs
//    content width; everything inside <SafeZone>; grid density scales with shortEdge.
//  - Fonts from font.* (Oswald condensed for the type, Inter for meta). interpolate clamped.
//  - The <TransitionSeries> total equals durationInFrames (SceneSeries + planScenes).
//  - Every optional RenderDoc field guarded (dek/stat/quote/source/dateline may be null).

import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import type { RenderDoc, StyleRootProps } from "../../engine/types";
import { StyleProvider, useStyleConfig } from "../../engine/StyleConfig";
import { SafeZone } from "../../engine/SafeZone";
import { Counter, parseStat } from "../../engine/primitives";
import { planScenes, type Scene } from "../../engine/sequence";
import { SceneSeries, fade, type Presentation } from "../../engine/SceneSeries";
import { noise } from "../../engine/rng";
import { buildPalette, STAGE } from "./palette";
import { Stage } from "./Stage";
import { PixelDissolve } from "./PixelDissolve";
import { RoughUnderline } from "./RoughUnderline";

const TRANS = 9; // cross-scene transition length (frames)

// ---- Emphasis matching (replicated locally; styles stay independent) -------------------

const normalize = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "");

function buildEmphasisSet(keyPhrases: string[]): Set<string> {
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

// Pick the first contiguous run of emphasis tokens in the text → the phrase we underline.
// Returns the token index range [start,end) or null when nothing matches.
function emphasisRun(tokens: string[], emphasisSet: Set<string>): { start: number; end: number } | null {
  let start = -1;
  for (let i = 0; i < tokens.length; i++) {
    const hit = emphasisSet.has(normalize(tokens[i]));
    if (hit && start === -1) start = i;
    else if (!hit && start !== -1) return { start, end: i };
  }
  if (start !== -1) return { start, end: tokens.length };
  return null;
}

// Grid density for the dissolve: cols scale with content width; rows keep cells square-ish.
function gridDims(orientation: string, contentW: number, contentH: number): { cols: number; rows: number; cell: number } {
  const baseCols = orientation === "portrait" ? 18 : orientation === "square" ? 22 : 26;
  const cols = Math.max(12, Math.min(30, baseCols));
  const cell = contentW / cols;
  const rows = Math.max(6, Math.min(40, Math.round(contentH / Math.max(1, cell))));
  return { cols, rows, cell };
}

// ---- Shared text-scene shell: text underneath, pixel-dissolve overlay on top -----------

const TextScene: React.FC<{
  text: string;
  emphasisSet: Set<string>;
  seed: number;
  salt: number;
  duration: number;
  isHeadline?: boolean;
}> = ({ text, emphasisSet, seed, salt, duration, isHeadline = false }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const frame = useCurrentFrame();

  const tokens = text.split(/\s+/).filter(Boolean);

  // ---- Type sizing: clamp by the longest non-wrapping word vs the content width --------
  const heroPx = size("hero");
  const arScale = orientation === "portrait" ? 1.55 : orientation === "square" ? 1.32 : 1.18;
  const cap = Math.round(shortEdge * (orientation === "landscape" ? 0.105 : 0.145));
  const longest = Math.max(1, ...tokens.map((w) => w.length));
  const contentWFrac = orientation === "landscape" ? 0.78 : 0.86;
  const contentW = shortEdge * contentWFrac;
  const fitByWord = Math.floor(contentW / (longest * 0.52)); // condensed avg char width
  const floor = Math.round(shortEdge * 0.05);
  const fontSize = Math.max(
    floor,
    Math.min(cap, fitByWord, Math.round(heroPx * arScale * (isHeadline ? 1.08 : 1))),
  );

  // ---- Emphasis run → which words get the accent + the underline -----------------------
  const run = emphasisRun(tokens, emphasisSet);

  // Text fades UP slightly as the dissolve clears (it's revealed from behind the blocks).
  const textO = interpolate(frame, [0, Math.round(duration * 0.14), Math.round(duration * 0.34)], [0.55, 0.78, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The underline draws AFTER the dissolve has cleared the headline area.
  const ulStart = Math.round(duration * 0.42);
  const ulDraw = Math.round(Math.min(22, duration * 0.3));

  // ---- Dissolve grid sized to the safe-zone content box (square-ish cells) -------------
  const safe =
    orientation === "portrait"
      ? { top: 220, bottom: 280, side: 64 }
      : orientation === "square"
        ? { top: 96, bottom: 120, side: 80 }
        : { top: 90, bottom: 110, side: 120 };
  const { width: vw, height: vh } = useVideoConfig();
  const boxW = vw - safe.side * 2;
  const boxH = vh - safe.top - safe.bottom;
  const { cols, rows } = gridDims(orientation, boxW, boxH);

  // Render the underline only under the emphasis run (or the whole headline if none).
  const underlineWidthFrac = run
    ? Math.min(0.62, (run.end - run.start) / Math.max(1, tokens.length) + 0.12)
    : isHeadline
      ? 0.48
      : 0;
  const ulStrokeW = Math.max(4, Math.round(fontSize * 0.07));

  return (
    <AbsoluteFill>
      {/* TEXT (beneath the blocks) */}
      <SafeZone justify="center" align="center">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "baseline",
            gap: `${fontSize * 0.18}px ${fontSize * 0.32}px`,
            opacity: textO,
            fontFamily: font.condensed,
            fontWeight: 700,
            lineHeight: 1.02,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: orientation === "landscape" ? "0.005em" : "0.01em",
            width: "100%",
          }}
        >
          {tokens.map((tok, i) => {
            const isEmph = !!run && i >= run.start && i < run.end;
            // Tiny seeded baseline jitter so the mono grid feels hand-set, not mechanical.
            const jitter = (noise(seed, i, salt + 7) - 0.5) * (fontSize * 0.04);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  transform: `translateY(${jitter}px)`,
                  color: isEmph ? palette.accent : palette.text,
                  fontSize,
                  fontWeight: isEmph ? 700 : 600,
                  whiteSpace: "nowrap",
                  textShadow: isEmph
                    ? `0 0 ${Math.round(fontSize * 0.4)}px ${palette.accent}55, 0 2px 12px rgba(0,0,0,0.6)`
                    : "0 2px 12px rgba(0,0,0,0.55)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {tok}
              </span>
            );
          })}

          {/* hand-drawn rough underline under the key phrase (or the headline) */}
          {underlineWidthFrac > 0 ? (
            <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: fontSize * 0.12 }}>
              <RoughUnderline
                width={boxW * underlineWidthFrac}
                color={palette.accent}
                strokeWidth={ulStrokeW}
                seed={seed}
                phrase={run ? tokens.slice(run.start, run.end).join(" ") : text}
                startFrame={ulStart}
                drawFrames={ulDraw}
                height={ulStrokeW * 4}
              />
            </div>
          ) : null}
        </div>
      </SafeZone>

      {/* PIXEL-BLOCK DISSOLVE overlay (covers the content box, clears to reveal text) */}
      <AbsoluteFill
        style={{
          paddingTop: safe.top,
          paddingBottom: safe.bottom,
          paddingLeft: safe.side,
          paddingRight: safe.side,
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <PixelDissolve
            cols={cols}
            rows={rows}
            color={STAGE.bg}
            edgeColor={palette.accent}
            seed={seed}
            salt={salt}
            duration={duration}
            clearAt={0.4}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---- Stat scene: pixel-dissolve + a big condensed counter -----------------------------

const StatScene: React.FC<{ value: string; label: string; seed: number; salt: number; duration: number }> = ({
  value,
  label,
  seed,
  salt,
  duration,
}) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const { fps, width: vw, height: vh } = useVideoConfig();
  const parsed = parseStat(value);

  const numPx = Math.round(shortEdge * (orientation === "portrait" ? 0.28 : 0.3));
  const pop = spring({ frame: frame - Math.round(duration * 0.4), fps, config: { damping: 200 } });
  const scale = interpolate(pop, [0, 1], [0.86, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelO = interpolate(frame, [Math.round(duration * 0.5), Math.round(duration * 0.62)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const counterDelay = Math.round(duration * 0.42); // count up AFTER the dissolve clears

  const safe =
    orientation === "portrait"
      ? { top: 220, bottom: 280, side: 64 }
      : orientation === "square"
        ? { top: 96, bottom: 120, side: 80 }
        : { top: 90, bottom: 110, side: 120 };
  const boxW = vw - safe.side * 2;
  const boxH = vh - safe.top - safe.bottom;
  const { cols, rows } = gridDims(orientation, boxW, boxH);

  const ulStrokeW = Math.max(4, Math.round(numPx * 0.035));

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 8%" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: numPx * 0.1, transform: `scale(${scale})` }}>
          <span
            style={{
              fontFamily: font.condensed,
              fontWeight: 700,
              fontSize: numPx,
              color: palette.accent,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              textShadow: `0 0 ${numPx * 0.3}px ${palette.accent}55`,
              whiteSpace: "nowrap",
            }}
          >
            {parsed.num !== null ? (
              <>
                {parsed.prefix}
                <Counter to={parsed.num} delay={counterDelay} durationInFrames={Math.round(0.9 * fps)} />
                {parsed.suffix}
              </>
            ) : (
              value
            )}
          </span>
          <RoughUnderline
            width={Math.min(boxW * 0.7, numPx * 2.6)}
            color={palette.accent}
            strokeWidth={ulStrokeW}
            seed={seed}
            phrase={value}
            startFrame={Math.round(duration * 0.5)}
            drawFrames={Math.min(22, Math.round(duration * 0.28))}
            height={ulStrokeW * 4}
          />
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
                marginTop: numPx * 0.06,
              }}
            >
              {label}
            </span>
          ) : null}
        </div>
      </AbsoluteFill>

      {/* dissolve over the stat box too */}
      <AbsoluteFill
        style={{ paddingTop: safe.top, paddingBottom: safe.bottom, paddingLeft: safe.side, paddingRight: safe.side }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <PixelDissolve
            cols={cols}
            rows={rows}
            color={STAGE.bg}
            edgeColor={palette.accent}
            seed={seed}
            salt={salt}
            duration={duration}
            clearAt={0.4}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---- Credit scene ---------------------------------------------------------------------

const CreditScene: React.FC<{ doc: RenderDoc }> = ({ doc }) => {
  const { palette, font, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const t = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const name = doc.source.name || doc.headline;
  const dateline = [doc.dateline.location, doc.dateline.dateDisplay]
    .filter((s): s is string => Boolean(s))
    .join(" · ");
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
        {/* blinking-cursor-style accent block (frame-driven, deterministic) */}
        <span
          style={{
            width: size("meta") * 0.6,
            height: size("meta") * 0.95,
            background: palette.accent,
            boxShadow: `0 0 ${size("meta") * 1.1}px ${palette.accent}88`,
            opacity: 0.5 + 0.5 * (Math.round(frame / 12) % 2),
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

const TerminalChip: React.FC<{ label: string }> = ({ label }) => {
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
          gap: size("kicker") * 0.55,
          padding: `${size("kicker") * 0.42}px ${size("kicker") * 0.85}px`,
          border: `1.5px solid ${palette.accent}99`,
          borderRadius: 4,
          background: "rgba(7,9,13,0.55)",
          backdropFilter: "blur(2px)",
        }}
      >
        <span style={{ fontFamily: font.condensed, fontWeight: 700, fontSize: size("kicker"), color: palette.accent }}>{">"}</span>
        <span
          style={{
            fontFamily: font.body,
            fontWeight: 800,
            fontSize: size("kicker"),
            color: palette.text,
            textTransform: "uppercase",
            letterSpacing: "0.22em",
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
  const p = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bottomPad = orientation === "portrait" ? 180 : orientation === "square" ? 72 : 64;
  const sidePad = orientation === "portrait" ? 64 : 84;
  // Segmented (pixel) progress bar to keep the retro identity.
  const SEGMENTS = 24;
  const lit = p * SEGMENTS;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bottomPad, pointerEvents: "none" }}>
      <div style={{ display: "flex", gap: 4, width: `calc(100% - ${sidePad * 2}px)` }}>
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const on = interpolate(lit, [i, i + 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 1,
                background: on > 0.5 ? palette.accent : "rgba(255,255,255,0.12)",
                boxShadow: on > 0.5 ? `0 0 8px ${palette.accent}` : "none",
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---- Cross-scene motion: clockWipe (tech) into most cuts, fade into the credit ---------

const presentationFor = (next: Scene): Presentation =>
  (next.kind === "credit"
    ? fade()
    : clockWipe({ width: 1920, height: 1920 })) as Presentation;

// ---- renderScene + Root ---------------------------------------------------------------

const renderScene = (
  s: Scene,
  i: number,
  durs: number[],
  emphasisSet: Set<string>,
  seed: number,
  doc: RenderDoc,
): React.ReactNode => {
  const duration = durs[i] ?? 60;
  // Per-scene salt scatters the dissolve differently each scene (deterministic in i).
  const salt = (i + 1) * 37;
  if (s.kind === "headline")
    return <TextScene text={s.text} emphasisSet={emphasisSet} seed={seed} salt={salt} duration={duration} isHeadline />;
  if (s.kind === "beat")
    return <TextScene text={s.text} emphasisSet={emphasisSet} seed={seed} salt={salt} duration={duration} />;
  if (s.kind === "stat") return <StatScene value={s.value} label={s.label} seed={seed} salt={salt} duration={duration} />;
  return <CreditScene doc={doc} />;
};

const PixelInner: React.FC<StyleRootProps> = ({ doc, seed }) => {
  const { durationInFrames } = useVideoConfig();
  const { palette, orientation, shortEdge } = useStyleConfig();
  const emphasisSet = React.useMemo(() => buildEmphasisSet(doc.keyPhrases), [doc.keyPhrases]);
  const { scenes, durs, trans } = React.useMemo(
    () => planScenes(doc, durationInFrames, { trans: TRANS, includeQuote: false }),
    [doc, durationInFrames],
  );

  const kicker = doc.category && doc.category !== "other" ? doc.category : "Signal";
  // Background grid density scales with the short edge (AR-aware, square-ish cells).
  const gridCell = Math.round(shortEdge * (orientation === "portrait" ? 0.062 : orientation === "square" ? 0.055 : 0.05));

  return (
    <>
      <Stage
        top={STAGE.panelTop}
        bottom={STAGE.panelBottom}
        gridColor={STAGE.grid}
        accent={palette.accent}
        seed={seed}
        cell={gridCell}
      />
      <SceneSeries
        scenes={scenes}
        durs={durs}
        trans={trans}
        presentationFor={presentationFor}
        renderScene={(s, i) => renderScene(s, i, durs, emphasisSet, seed, doc)}
      />
      <TerminalChip label={kicker} />
      <ProgressBar />
    </>
  );
};

export const Root: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const palette = buildPalette({ accent: brand.accent, accentAlt: brand.accentAlt ?? null });
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <StyleProvider palette={palette}>
        <PixelInner doc={doc} brand={brand} seed={seed} />
      </StyleProvider>
    </AbsoluteFill>
  );
};

export default Root;
