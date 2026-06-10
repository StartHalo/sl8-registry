// EditorialCard — the calm, left-aligned editorial block.
// Vertical rhythm top -> bottom: kicker -> headline -> dek/pull-quote -> hairline rule -> dateline -> credit.
// Motion is gentle eased fades (<FadeIn>) + a thin rule that wipes in (<DividerWipe>).
// The whole card sits inside a very slow <KenBurns> drift (applied by index.tsx).
// Everything is frame-driven via the engine primitives — NO springs, NO css transitions,
// NO runtime randomness. All sizes derive from useStyleConfig().size()/shortEdge and
// branch on orientation; nothing is hardcoded to 1080/1920.

import React from "react";
import { useVideoConfig } from "remotion";
import type { RenderDoc } from "../../engine/types";
import { useStyleConfig } from "../../engine/StyleConfig";
import { SafeZone } from "../../engine/SafeZone";
import { FadeIn, DividerWipe } from "../../engine/primitives";

interface EditorialCardProps {
  doc: RenderDoc;
  // Resolved accent (always a hex) — used for the kicker + hairline rule.
  accent: string;
  // Secondary accent for the pull-quote bar (falls back to accent upstream).
  accentAlt: string;
}

// Compose the dateline string from the (optional) parts:
//   "JUNE 9, 2026 — NEW YORK" | "JUNE 9, 2026" | "NEW YORK" | null
const composeDateline = (dateDisplay: string | null, location: string | null): string | null => {
  if (dateDisplay && location) return `${dateDisplay} — ${location}`;
  return dateDisplay ?? location ?? null;
};

// Compose the source credit line from name/byline. Returns null if neither exists.
const composeCredit = (name: string | null, byline: string | null): string | null => {
  if (name && byline) return `${name} · ${byline}`;
  return name ?? byline ?? null;
};

export const EditorialCard: React.FC<EditorialCardProps> = ({ doc, accent, accentAlt }) => {
  const { durationInFrames } = useVideoConfig();
  const { palette, font, orientation, size, shortEdge } = useStyleConfig();

  const isPortrait = orientation === "portrait";
  const isSquare = orientation === "square";

  // --- Type sizes (all derived from the engine type scale; floors enforced in sizeFor) ---
  // Headline shrinks on the narrower aspect ratios (less horizontal room).
  const headlineScale = isPortrait ? 0.74 : isSquare ? 0.88 : 1;
  const headlineSize = Math.round(size("hero") * headlineScale);
  const dekSize = Math.round(size("dek") * (isPortrait ? 0.92 : 1));
  const metaSize = size("meta");
  const kickerSize = size("kicker");
  const quoteSize = Math.round(size("headline") * (isPortrait ? 0.72 : isSquare ? 0.82 : 0.9));

  // --- Spacing derived from the short edge so it scales with resolution ---
  const gapUnit = Math.round(shortEdge * 0.018); // ~19px @1080
  const kickerGap = Math.round(gapUnit * 1.4);
  const dekGap = Math.round(gapUnit * 1.6);
  const ruleGap = Math.round(gapUnit * 2.2);
  const datelineGap = Math.round(gapUnit * 1.1);

  // Cap measure for comfortable line length (left-aligned editorial axis).
  const maxTextWidth = isPortrait ? "100%" : isSquare ? "92%" : "82%";

  // Hairline rule length: shorter on portrait, derived from the short edge.
  const ruleWidth = isPortrait ? Math.round(shortEdge * 0.34) : Math.round(shortEdge * 0.3);
  const ruleHeight = Math.max(2, Math.round(shortEdge * 0.0022));

  // --- Reveal schedule (frames). Editorial = slow & sequential. ---
  // Clamp every delay so nothing starts after the clip ends on short durations.
  const clampDelay = (f: number) => Math.min(f, Math.max(0, durationInFrames - 6));
  const FADE = 22; // ~0.73s eased fade
  const lift = Math.round(shortEdge * 0.015); // gentle ~16px lift @1080
  const T = {
    kicker: clampDelay(6),
    headline: clampDelay(16),
    dek: clampDelay(38),
    rule: clampDelay(54),
    dateline: clampDelay(68),
    credit: clampDelay(80),
  };

  // --- Optional content (GUARD every nullable field) ---
  const kicker = doc.category && doc.category !== "other" ? doc.category.toUpperCase() : null;
  const dek = doc.dek;
  const quote = doc.quote; // verbatim pull-quote, if present
  const dateline = composeDateline(doc.dateline.dateDisplay, doc.dateline.location);
  const credit = composeCredit(doc.source.name, doc.source.byline);

  return (
    <SafeZone justify="center" align="flex-start">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          textAlign: "left",
          width: "100%",
        }}
      >
        {/* KICKER — small uppercase eyebrow in the accent color (optional) */}
        {kicker !== null && (
          <FadeIn delay={T.kicker} durationInFrames={FADE} y={lift} style={{ marginBottom: kickerGap }}>
            <div
              style={{
                fontFamily: font.body,
                fontSize: kickerSize,
                fontWeight: 600,
                letterSpacing: Math.round(kickerSize * 0.18),
                textTransform: "uppercase",
                color: accent,
              }}
            >
              {kicker}
            </div>
          </FadeIn>
        )}

        {/* HEADLINE — serif display, the hero beat (always present) */}
        <FadeIn delay={T.headline} durationInFrames={FADE} y={lift}>
          <h1
            style={{
              margin: 0,
              fontFamily: font.display,
              fontSize: headlineSize,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: Math.round(headlineSize * -0.012),
              color: palette.text,
              maxWidth: maxTextWidth,
              textWrap: "balance",
            }}
          >
            {doc.headline}
          </h1>
        </FadeIn>

        {/* PULL-QUOTE (verbatim) OR DEK — pull-quote wins when present */}
        {quote !== null ? (
          <FadeIn delay={T.dek} durationInFrames={FADE} y={lift} style={{ marginTop: dekGap, maxWidth: maxTextWidth }}>
            <blockquote
              style={{
                margin: 0,
                paddingLeft: Math.round(gapUnit * 1.2),
                borderLeft: `${Math.max(3, Math.round(shortEdge * 0.0032))}px solid ${accentAlt}`,
                fontFamily: font.display,
                fontStyle: "italic",
                fontSize: quoteSize,
                fontWeight: 400,
                lineHeight: 1.3,
                color: palette.textMuted,
              }}
            >
              <span>“{quote.text}”</span>
              {quote.speaker !== null && (
                <span
                  style={{
                    display: "block",
                    marginTop: Math.round(gapUnit * 0.8),
                    fontFamily: font.body,
                    fontStyle: "normal",
                    fontSize: metaSize,
                    fontWeight: 600,
                    letterSpacing: Math.round(metaSize * 0.04),
                    color: palette.text,
                  }}
                >
                  {quote.speaker}
                  {quote.speakerTitle !== null ? `, ${quote.speakerTitle}` : ""}
                </span>
              )}
            </blockquote>
          </FadeIn>
        ) : dek !== null ? (
          <FadeIn delay={T.dek} durationInFrames={FADE} y={lift} style={{ marginTop: dekGap, maxWidth: maxTextWidth }}>
            <p
              style={{
                margin: 0,
                fontFamily: font.body,
                fontSize: dekSize,
                fontWeight: 400,
                lineHeight: 1.45,
                color: palette.textMuted,
              }}
            >
              {dek}
            </p>
          </FadeIn>
        ) : null}

        {/* HAIRLINE RULE — wipes in left -> right via scaleX */}
        <DividerWipe
          delay={T.rule}
          width={ruleWidth}
          height={ruleHeight}
          color={accent}
          origin="left"
          style={{ marginTop: ruleGap }}
        />

        {/* DATELINE — date — location (optional) */}
        {dateline !== null && (
          <FadeIn delay={T.dateline} durationInFrames={FADE} y={lift} style={{ marginTop: datelineGap }}>
            <div
              style={{
                fontFamily: font.body,
                fontSize: metaSize,
                fontWeight: 600,
                letterSpacing: Math.round(metaSize * 0.08),
                textTransform: "uppercase",
                color: palette.textMuted,
              }}
            >
              {dateline}
            </div>
          </FadeIn>
        )}

        {/* SOURCE / BYLINE CREDIT — required when doc.source.name is non-null */}
        {credit !== null && (
          <FadeIn delay={T.credit} durationInFrames={FADE} y={lift} style={{ marginTop: Math.round(datelineGap * 0.6) }}>
            <div
              style={{
                fontFamily: font.body,
                fontSize: metaSize,
                fontWeight: 600,
                letterSpacing: Math.round(metaSize * 0.04),
                color: palette.text,
              }}
            >
              {credit}
            </div>
          </FadeIn>
        )}
      </div>
    </SafeZone>
  );
};
