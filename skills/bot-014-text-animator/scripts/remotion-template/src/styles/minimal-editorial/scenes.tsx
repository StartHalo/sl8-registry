// Minimal Editorial — per-scene components.
// Each renders inside a <TransitionSeries.Sequence> with a LOCAL frame starting at 0.
// The motion register is the CALMEST of the styles: slow eased fades + gentle lifts,
// a red hairline that wipes in, an understated counter. NO springs/bounce, NO css
// transitions, NO timers, NO runtime randomness. Everything derives from
// useStyleConfig()/useVideoConfig() and branches on orientation — nothing hardcoded.
//
// Visual identity preserved: warm-paper page, serif (Fraunces) display + italic
// pull-quotes, the single restrained accent used for the rule/kicker, left axis on
// wide/square, centered on portrait. The EditorialCard sub-component is reused for the
// closing credit scene.

import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderDoc } from "../../engine/types";
import { useStyleConfig } from "../../engine/StyleConfig";
import { SafeZone } from "../../engine/SafeZone";
import { FadeIn, DividerWipe, Counter, parseStat } from "../../engine/primitives";
import { EditorialCard } from "./EditorialCard";

const FADE = 22; // ~0.73s eased fade — the editorial entrance length

// Eased 0..1 ramp (no bounce). Shared helper for opacity/lift math.
const ease = (frame: number, from: number, to: number): number =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

// ---- HEADLINE ----------------------------------------------------------------
// Serif Fraunces hero with the red divider wiping in beneath it.
export const HeadlineScene: React.FC<{ doc: RenderDoc; accent: string }> = ({ doc, accent }) => {
  const { palette, font, orientation, size, shortEdge } = useStyleConfig();
  const isPortrait = orientation === "portrait";
  const isSquare = orientation === "square";

  // Clamp the hero so the longest single word fits the content measure (avoids overflow
  // for long compound words at full size on the narrow ARs).
  const headlineScale = isPortrait ? 0.82 : isSquare ? 0.92 : 1.04;
  const base = Math.round(size("hero") * headlineScale);
  const longest = Math.max(1, ...(doc.headline || "").split(/\s+/).filter(Boolean).map((w) => w.length));
  const contentW = shortEdge * (isPortrait ? 0.82 : isSquare ? 0.88 : 0.78);
  const fitByWord = Math.floor(contentW / (longest * 0.5)); // serif avg char width
  const floor = Math.round(shortEdge * 0.05);
  const headlineSize = Math.max(floor, Math.min(base, fitByWord));

  const lift = Math.round(shortEdge * 0.018);
  const ruleWidth = isPortrait ? Math.round(shortEdge * 0.36) : Math.round(shortEdge * 0.3);
  const ruleHeight = Math.max(3, Math.round(shortEdge * 0.0028));
  const align = isPortrait ? "center" : "flex-start";

  return (
    <SafeZone justify="center" align={align}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: align,
          textAlign: isPortrait ? "center" : "left",
          width: "100%",
          maxWidth: isPortrait ? "100%" : isSquare ? "94%" : "84%",
        }}
      >
        <FadeIn delay={4} durationInFrames={FADE} y={lift}>
          <h1
            style={{
              margin: 0,
              fontFamily: font.display,
              fontSize: headlineSize,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: Math.round(headlineSize * -0.012),
              color: palette.text,
              textWrap: "balance",
            }}
          >
            {doc.headline}
          </h1>
        </FadeIn>
        <DividerWipe
          delay={20}
          width={ruleWidth}
          height={ruleHeight}
          color={accent}
          origin={isPortrait ? "center" : "left"}
          durationInFrames={Math.round(0.7 * 30)}
          style={{ marginTop: Math.round(shortEdge * 0.035) }}
        />
      </div>
    </SafeZone>
  );
};

// ---- BEAT --------------------------------------------------------------------
// A single body line set in serif, with a small accent index marker. Clean lines,
// staggered eased fades word-group by word-group (split on clause for rhythm).
export const BeatScene: React.FC<{ text: string; index: number; accent: string }> = ({ text, index, accent }) => {
  const { palette, font, orientation, size, shortEdge } = useStyleConfig();
  const frame = useCurrentFrame();
  const isPortrait = orientation === "portrait";
  const isSquare = orientation === "square";

  const beatScale = isPortrait ? 1.18 : isSquare ? 1.32 : 1.42;
  const beatSize = Math.min(size("headline"), Math.round(size("beat") * beatScale));
  const lift = Math.round(shortEdge * 0.016);
  const align = isPortrait ? "center" : "flex-start";

  // Stagger the line in two soft halves so it reads as it arrives (no bounce).
  const tickGap = Math.round(shortEdge * 0.018);
  const markO = ease(frame, 4, 18);

  return (
    <SafeZone justify="center" align={align}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: align,
          textAlign: isPortrait ? "center" : "left",
          width: "100%",
          maxWidth: isPortrait ? "100%" : isSquare ? "92%" : "80%",
          gap: tickGap,
        }}
      >
        {/* Small accent folio marker — keeps the editorial "numbered point" feel. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: Math.round(tickGap * 0.7),
            opacity: markO,
            justifyContent: isPortrait ? "center" : "flex-start",
            width: "100%",
          }}
        >
          <span style={{ width: Math.round(shortEdge * 0.04), height: Math.max(2, Math.round(shortEdge * 0.0022)), background: accent }} />
          <span
            style={{
              fontFamily: font.body,
              fontSize: size("kicker"),
              fontWeight: 700,
              letterSpacing: Math.round(size("kicker") * 0.14),
              textTransform: "uppercase",
              color: accent,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <FadeIn delay={10} durationInFrames={FADE} y={lift}>
          <p
            style={{
              margin: 0,
              fontFamily: font.display,
              fontSize: beatSize,
              fontWeight: 400,
              lineHeight: 1.22,
              letterSpacing: Math.round(beatSize * -0.006),
              color: palette.text,
            }}
          >
            {text}
          </p>
        </FadeIn>
      </div>
    </SafeZone>
  );
};

// ---- QUOTE -------------------------------------------------------------------
// The featured pull-quote scene: large serif italic, an oversized accent quotation
// mark, an accent left-bar, and the speaker + title beneath. The editorial centerpiece.
export const QuoteScene: React.FC<{
  text: string;
  speaker: string | null;
  speakerTitle: string | null;
  accent: string;
  accentAlt: string;
}> = ({ text, speaker, speakerTitle, accent, accentAlt }) => {
  const { palette, font, orientation, size, shortEdge } = useStyleConfig();
  const frame = useCurrentFrame();
  const isPortrait = orientation === "portrait";
  const isSquare = orientation === "square";

  // Quote scales down with length so long quotes still fit the measure.
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lengthScale = wordCount > 26 ? 0.78 : wordCount > 16 ? 0.9 : 1;
  const arScale = isPortrait ? 0.78 : isSquare ? 0.92 : 1;
  const quoteSize = Math.round(size("headline") * arScale * lengthScale);
  const markSize = Math.round(quoteSize * 2.1);
  const lift = Math.round(shortEdge * 0.018);

  const markO = ease(frame, 2, 16);
  const barH = interpolate(ease(frame, 6, 26), [0, 1], [0, 1]); // grows the left bar

  return (
    <SafeZone justify="center" align="center">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isPortrait ? "center" : "flex-start",
          textAlign: isPortrait ? "center" : "left",
          width: "100%",
          maxWidth: isPortrait ? "100%" : isSquare ? "92%" : "82%",
          position: "relative",
        }}
      >
        {/* Oversized opening quotation mark in the accent — editorial flourish. */}
        <span
          aria-hidden
          style={{
            fontFamily: font.display,
            fontSize: markSize,
            fontWeight: 900,
            lineHeight: 0.7,
            color: accent,
            opacity: markO * 0.9,
            marginBottom: -Math.round(markSize * 0.28),
            alignSelf: isPortrait ? "center" : "flex-start",
            userSelect: "none",
          }}
        >
          “
        </span>

        <div style={{ display: "flex", gap: Math.round(shortEdge * 0.024), alignItems: "stretch", width: "100%" }}>
          {/* Accent left bar (grows in) — only on the left-axis ARs. */}
          {!isPortrait && (
            <span
              style={{
                width: Math.max(3, Math.round(shortEdge * 0.0036)),
                background: accentAlt,
                borderRadius: 2,
                transform: `scaleY(${barH})`,
                transformOrigin: "top",
                flex: "0 0 auto",
              }}
            />
          )}
          <FadeIn delay={8} durationInFrames={FADE + 4} y={lift}>
            <blockquote
              style={{
                margin: 0,
                fontFamily: font.display,
                fontStyle: "italic",
                fontSize: quoteSize,
                fontWeight: 400,
                lineHeight: 1.28,
                letterSpacing: Math.round(quoteSize * -0.004),
                color: palette.text,
              }}
            >
              {text}”
            </blockquote>
          </FadeIn>
        </div>

        {(speaker || speakerTitle) && (
          <FadeIn delay={24} durationInFrames={FADE} y={Math.round(lift * 0.7)} style={{ marginTop: Math.round(shortEdge * 0.03) }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: Math.round(shortEdge * 0.014),
                justifyContent: isPortrait ? "center" : "flex-start",
              }}
            >
              <span style={{ width: Math.round(shortEdge * 0.03), height: Math.max(2, Math.round(shortEdge * 0.0022)), background: accent }} />
              <span
                style={{
                  fontFamily: font.body,
                  fontSize: size("meta"),
                  fontWeight: 700,
                  letterSpacing: Math.round(size("meta") * 0.04),
                  color: palette.text,
                }}
              >
                {speaker || ""}
                {speaker && speakerTitle ? <span style={{ color: palette.textMuted, fontWeight: 600 }}>{`, ${speakerTitle}`}</span> : null}
                {!speaker && speakerTitle ? <span style={{ color: palette.textMuted, fontWeight: 600 }}>{speakerTitle}</span> : null}
              </span>
            </div>
          </FadeIn>
        )}
      </div>
    </SafeZone>
  );
};

// ---- STAT --------------------------------------------------------------------
// Understated hero figure: a large serif counter on paper, a hairline rule, and the
// label in tracked uppercase. No rings/glow — calm, restrained, editorial.
export const StatScene: React.FC<{ value: string; label: string; accent: string }> = ({ value, label, accent }) => {
  const { palette, font, orientation, size, shortEdge } = useStyleConfig();
  const { fps } = useVideoConfig();
  const isPortrait = orientation === "portrait";
  const parsed = parseStat(value);

  const numScale = isPortrait ? 0.62 : orientation === "square" ? 0.78 : 0.9;
  const numPx = Math.round(size("stat") * numScale);
  const lift = Math.round(shortEdge * 0.02);
  const ruleWidth = Math.round(shortEdge * (isPortrait ? 0.42 : 0.34));
  const ruleHeight = Math.max(2, Math.round(shortEdge * 0.0026));

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: Math.round(shortEdge * 0.022),
          padding: "0 8%",
        }}
      >
        <FadeIn delay={4} durationInFrames={FADE} y={lift}>
          <span
            style={{
              fontFamily: font.display,
              fontWeight: 700,
              fontSize: numPx,
              color: palette.text,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {parsed.num !== null ? (
              <>
                {parsed.prefix}
                <Counter to={parsed.num} delay={10} durationInFrames={Math.round(1.0 * fps)} />
                {parsed.suffix}
              </>
            ) : (
              value
            )}
          </span>
        </FadeIn>

        <DividerWipe
          delay={20}
          width={ruleWidth}
          height={ruleHeight}
          color={accent}
          origin="center"
          durationInFrames={Math.round(0.7 * fps)}
        />

        {label ? (
          <FadeIn delay={30} durationInFrames={FADE} y={Math.round(lift * 0.6)}>
            <span
              style={{
                fontFamily: font.body,
                fontWeight: 600,
                fontSize: size("meta"),
                color: palette.textMuted,
                textTransform: "uppercase",
                letterSpacing: Math.round(size("meta") * 0.16),
                maxWidth: "100%",
                display: "inline-block",
              }}
            >
              {label}
            </span>
          </FadeIn>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ---- CREDIT ------------------------------------------------------------------
// Reuse the existing EditorialCard for the closing credit: kicker + (headline as
// fallback name) + dateline + source, all guarded. Keeps the signature paper block.
export const CreditScene: React.FC<{ doc: RenderDoc; accent: string; accentAlt: string }> = ({ doc, accent, accentAlt }) => {
  // EditorialCard composes dateline + source credit elegantly. For the closing card we
  // want the source as the focus, so synthesize a doc whose "headline" is the source
  // name (falling back to the real headline) and drop the quote/dek so it reads as a
  // clean colophon, not a repeat of the lede.
  const name = doc.source.name || doc.headline;
  const creditDoc: RenderDoc = {
    ...doc,
    headline: name,
    dek: null,
    quote: null,
  };
  return <EditorialCard doc={creditDoc} accent={accent} accentAlt={accentAlt} />;
};
