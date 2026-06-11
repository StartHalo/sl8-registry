// Minimal Editorial — premium, calm editorial that now WALKS the whole message instead of
// holding a single headline. The arc:
//   headline (serif, red divider wipes in) → body beats (clean serif lines, numbered) →
//   QUOTE (a real pull-quote with speaker + title) → stat (understated counter + hairline) →
//   credit (dateline + source, reuses EditorialCard).
// It is the CALMEST of the styles: slow eased cross-scene fades (no slide/wipe/bounce),
// lots of whitespace, the single restrained accent for rules/kickers, serif (Fraunces)
// display identity preserved throughout.
//
// Signature chrome (top folio rule + kicker, bottom hairline progress, page frame) stays
// PERSISTENT outside the SceneSeries — the page furniture stays put while the content area
// cross-fades between scenes (like kinetic's KickerChip + ProgressBar).
//
// HARD-RULE compliance:
//  - Exports exactly `export const Root: React.FC<StyleRootProps>` (+ default).
//  - The <TransitionSeries> total equals durationInFrames (planScenes guarantees it).
//  - 100% frame-driven; no css transitions/keyframes/animation, no timers, no runtime
//    randomness. Sizes from useStyleConfig()/useVideoConfig(); layout branches on orientation.
//  - Every optional RenderDoc field is guarded. No <Audio> (dispatcher adds the score).

import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderDoc, StyleRootProps } from "../../engine/types";
import { StyleProvider, useStyleConfig } from "../../engine/StyleConfig";
import { planScenes, type Scene } from "../../engine/sequence";
import { SceneSeries, fade, type Presentation } from "../../engine/SceneSeries";
import { editorialPalette, DEFAULT_ACCENT } from "./palette";
import { HeadlineScene, BeatScene, QuoteScene, StatScene, CreditScene } from "./scenes";

const TRANS = 14; // slow, calm cross-scene fade (frames) — the longest/softest of the styles

// Calmest motion language: EVERY cut is a gentle fade. Editorial never slides or wipes
// between scenes — it breathes. (Overrides SceneSeries' default slide/wipe presentations.)
const editorialPresentation = (): Presentation => fade() as Presentation;

// ---- Persistent chrome (GLOBAL frame; outside the TransitionSeries) ---------------------

// Top folio: a thin accent rule + an uppercase kicker (category) on the left, the source/
// brand label on the right — the running head of an editorial page.
const FolioHead: React.FC<{ doc: RenderDoc; label: string | null }> = ({ doc, label }) => {
  const { palette, font, orientation, size, shortEdge } = useStyleConfig();
  const frame = useCurrentFrame();
  const o = interpolate(frame, [6, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const isPortrait = orientation === "portrait";
  const topPad = isPortrait ? 150 : orientation === "square" ? 70 : 56;
  const sidePad = isPortrait ? 64 : 84;
  const kicker = doc.category && doc.category !== "other" ? doc.category.toUpperCase() : "EDITORIAL";
  const right = label ? label.toUpperCase() : null;
  const ruleH = Math.max(2, Math.round(shortEdge * 0.0022));

  return (
    <AbsoluteFill style={{ alignItems: "stretch", justifyContent: "flex-start", paddingTop: topPad, paddingLeft: sidePad, paddingRight: sidePad, opacity: o, pointerEvents: "none" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: Math.round(size("kicker") * 0.5) }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
          <span
            style={{
              fontFamily: font.body,
              fontSize: size("kicker"),
              fontWeight: 700,
              letterSpacing: Math.round(size("kicker") * 0.2),
              textTransform: "uppercase",
              color: palette.accent,
            }}
          >
            {kicker}
          </span>
          {right ? (
            <span
              style={{
                fontFamily: font.body,
                fontSize: size("kicker"),
                fontWeight: 600,
                letterSpacing: Math.round(size("kicker") * 0.14),
                textTransform: "uppercase",
                color: palette.textMuted,
              }}
            >
              {right}
            </span>
          ) : null}
        </div>
        <div style={{ width: "100%", height: ruleH, background: palette.text, opacity: 0.16 }} />
      </div>
    </AbsoluteFill>
  );
};

// Bottom hairline progress — a single thin accent line that fills across the clip. The
// quietest possible progress indicator (no scrim, no track), in keeping with the register.
const ProgressHairline: React.FC = () => {
  const { palette, orientation, shortEdge } = useStyleConfig();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const isPortrait = orientation === "portrait";
  const bottomPad = isPortrait ? 200 : orientation === "square" ? 64 : 52;
  const sidePad = isPortrait ? 64 : 84;
  const h = Math.max(2, Math.round(shortEdge * 0.0024));
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "stretch", paddingBottom: bottomPad, paddingLeft: sidePad, paddingRight: sidePad, pointerEvents: "none" }}>
      <div style={{ width: "100%", height: h, background: palette.text, opacity: 0.08 }}>
        <div style={{ width: `${p * 100}%`, height: "100%", background: palette.accent }} />
      </div>
    </AbsoluteFill>
  );
};

// ---- Inner + Root -----------------------------------------------------------------------

const renderScene = (
  s: Scene,
  beatIndex: number,
  accent: string,
  accentAlt: string,
  doc: RenderDoc,
): React.ReactNode => {
  if (s.kind === "headline") return <HeadlineScene doc={doc} accent={accent} />;
  if (s.kind === "beat") return <BeatScene text={s.text} index={beatIndex} accent={accent} />;
  if (s.kind === "quote")
    return <QuoteScene text={s.text} speaker={s.speaker} speakerTitle={s.speakerTitle} accent={accent} accentAlt={accentAlt} />;
  if (s.kind === "stat") return <StatScene value={s.value} label={s.label} accent={accent} />;
  return <CreditScene doc={doc} accent={accent} accentAlt={accentAlt} />;
};

const EditorialInner: React.FC<{ doc: RenderDoc; accent: string; accentAlt: string; label: string | null }> = ({
  doc,
  accent,
  accentAlt,
  label,
}) => {
  const { durationInFrames } = useVideoConfig();

  // Minimal-editorial SHOULD feature quotes — includeQuote:true (the default, made explicit).
  // Slightly fewer beats than the noisier styles, to keep the whitespace and slow pacing.
  const { scenes, durs, trans } = React.useMemo(
    () => planScenes(doc, durationInFrames, { trans: TRANS, maxBeats: 3, includeQuote: true }),
    [doc, durationInFrames],
  );

  // beatIndexByPos: a running counter so each beat scene shows a "01/02/03" folio marker.
  // Keyed by scene POSITION (SceneSeries passes that index to renderScene) — keeps the
  // shared Scene union untouched.
  const beatIndexByPos = React.useMemo(() => {
    let bi = -1;
    return scenes.map((s) => (s.kind === "beat" ? (bi += 1) : bi));
  }, [scenes]);

  return (
    <>
      <SceneSeries
        scenes={scenes}
        durs={durs}
        trans={trans}
        renderScene={(s, i) => renderScene(s, Math.max(0, beatIndexByPos[i]), accent, accentAlt, doc)}
        presentationFor={editorialPresentation}
      />
      <FolioHead doc={doc} label={label} />
      <ProgressHairline />
    </>
  );
};

export const Root: React.FC<StyleRootProps> = ({ doc, brand }) => {
  const accent = brand.accent || DEFAULT_ACCENT;
  const accentAlt = brand.accentAlt ?? accent;
  const palette = editorialPalette(accent, accentAlt);
  const label = brand.label ?? doc.source.name ?? null;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <StyleProvider palette={palette}>
        <EditorialInner doc={doc} accent={accent} accentAlt={accentAlt} label={label} />
      </StyleProvider>
    </AbsoluteFill>
  );
};

export default Root;
