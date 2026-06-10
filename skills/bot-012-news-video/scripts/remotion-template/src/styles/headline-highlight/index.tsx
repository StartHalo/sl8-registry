// Headline Highlight — a clean editorial article card (headline + optional dek + a few
// body beats) on a light, near-white surface. A subtle 3D perspective zoom/rotate runs
// over the whole clip; a blur-in reveal sharpens the card over the first ~1s; then a
// seeded rough.js highlighter marker sweeps left→right BEHIND each phrase in
// doc.keyPhrases.
//
// Marker placement is done INLINE: each keyphrase occurrence is wrapped in a <HiSpan>
// that measures ITS OWN box (offsetWidth/Height — local + transform-independent) and
// renders the rough.js marker absolutely inside itself, behind the text. Because the
// marker lives inside the phrase span, it inherits the phrase's exact position and
// rotates/scales WITH the card — no global coordinate mapping, no drift under Article3D.
//
// Engine contract: sizes come from useStyleConfig().size() / shortEdge and useVideoConfig;
// layout branches on orientation; the whole timeline stays inside durationInFrames; all
// motion is frame-driven; optional doc fields (dek/dateline/source/quote) are guarded.

import React from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { StyleRootProps } from "../../engine/types";
import { StyleProvider, useStyleConfig } from "../../engine/StyleConfig";
import { SafeZone } from "../../engine/SafeZone";
import { hashStr } from "../../engine/rng";
import { beatsThatFit } from "../../engine/pacing";
import { buildPalette, HIGHLIGHTER_INK } from "./palette";
import { Article3D } from "./Article3D";
import { Highlighter } from "./Highlighter";

// ---------------------------------------------------------------------------
// HiSpan — an inline keyphrase that draws its own seeded highlighter behind itself.
// Self-measuring (local offsets), so it needs no global rect mapping.
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
// Phrase spec + span splitting. We split each text block on its keyphrase matches
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

// ---------------------------------------------------------------------------
// Blur-in reveal over the first ~1s, applied OUTSIDE the 3D transform.
// ---------------------------------------------------------------------------

const useBlurReveal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const blurPx = interpolate(frame, [0, Math.round(1.0 * fps)], [22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [0, Math.round(0.4 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { filter: `blur(${blurPx}px)`, opacity };
};

// ---------------------------------------------------------------------------
// Inner — runs under <StyleProvider>, so useStyleConfig() is available.
// ---------------------------------------------------------------------------

const Inner: React.FC<{ doc: StyleRootProps["doc"]; brand: StyleRootProps["brand"]; seed: number }> = ({
  doc,
  brand,
  seed,
}) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const { fps, durationInFrames, width } = useVideoConfig();
  const blur = useBlurReveal();

  // --- how many beats fit (drops trailing beats, keeps the lede) ---
  const maxBeatsByAR = orientation === "portrait" ? 4 : 3;
  const fittedBeats = beatsThatFit(doc.bodyBeats, durationInFrames, maxBeatsByAR);
  const bodyText = fittedBeats.join(" ");

  // --- phrase specs: seeded + ordered for the sweep ---
  const phrases: PhraseSpec[] = React.useMemo(
    () =>
      doc.keyPhrases.map((text, i) => ({
        text,
        order: i,
        seed: ((seed * 2654435761) ^ hashStr(text)) >>> 0,
      })),
    [doc.keyPhrases, seed],
  );

  // --- type scale (derived from the engine, never hardcoded px) ---
  const heroPx = size("hero");
  const headlinePx =
    orientation === "portrait"
      ? Math.round(heroPx * 0.86)
      : orientation === "square"
        ? Math.round(heroPx * 0.92)
        : heroPx;
  const dekPx = size("dek");
  const beatPx = size("beat");
  const kickerPx = size("kicker");
  const metaPx = size("meta");

  // --- card geometry, content-driven, derived off the short edge ---
  const pad = Math.round(shortEdge * 0.075);
  const cardW =
    orientation === "portrait"
      ? Math.round(width * 0.88)
      : orientation === "square"
        ? Math.round(width * 0.84)
        : Math.round(width * 0.66);

  // --- sweep timing: start after the blur, stagger, and FIT inside durationInFrames ---
  const blurDone = Math.round(1.0 * fps);
  const sweep = Math.round(0.7 * fps);
  const nPhrases = Math.max(1, doc.keyPhrases.length);
  const tailGuard = Math.round(0.3 * fps);
  const room = Math.max(0, durationInFrames - tailGuard - blurDone - sweep);
  const idealStagger = Math.round(0.5 * fps);
  const stagger = nPhrases > 1 ? Math.min(idealStagger, Math.floor(room / (nPhrases - 1))) : 0;
  const startForOrder = (order: number) => blurDone + order * stagger;

  const renderHi: RenderHi = (matched, spec, uid) => (
    <HiSpan
      key={uid}
      uid={uid}
      text={matched}
      seed={spec.seed}
      startFrame={startForOrder(spec.order)}
      sweepFrames={sweep}
    />
  );

  const hasCredit = Boolean(doc.source.name);
  const kicker = (brand.label ?? doc.category ?? "News").toString();
  const datelineBits = [doc.dateline.location, doc.dateline.dateDisplay].filter(
    (s): s is string => Boolean(s),
  );

  return (
    <AbsoluteFill style={{ ...blur }}>
      <Article3D>
        <SafeZone justify="center" align="center">
          <div
            style={{
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
            {/* Kicker / eyebrow */}
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

            {/* Headline — serif display face */}
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
              {renderWithSpans(doc.headline, "hl", phrases, renderHi)}
            </h1>

            {/* Dek — optional italic standfirst */}
            {doc.dek ? (
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
                {renderWithSpans(doc.dek, "dek", phrases, renderHi)}
              </p>
            ) : null}

            {/* Hairline rule */}
            <div
              style={{
                height: 1,
                backgroundColor: palette.accentAlt,
                margin: `${Math.round(pad * 0.5)}px 0`,
              }}
            />

            {/* Body — fitted beats as one editorial paragraph */}
            {bodyText ? (
              <p
                style={{
                  fontFamily: font.body,
                  fontSize: beatPx,
                  lineHeight: 1.55,
                  color: palette.text,
                  margin: 0,
                }}
              >
                {renderWithSpans(bodyText, "body", phrases, renderHi)}
              </p>
            ) : null}

            {/* Credit + dateline */}
            {hasCredit || datelineBits.length ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: Math.round(metaPx * 0.5),
                  marginTop: Math.round(pad * 0.5),
                  fontFamily: font.body,
                  fontSize: metaPx,
                  color: palette.textMuted,
                }}
              >
                {hasCredit ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(metaPx * 0.4) }}>
                    <span
                      style={{
                        width: Math.round(metaPx * 0.36),
                        height: Math.round(metaPx * 0.36),
                        borderRadius: "50%",
                        backgroundColor: palette.accent,
                        display: "inline-block",
                      }}
                    />
                    <span style={{ fontWeight: 600, color: palette.text }}>{doc.source.name}</span>
                  </span>
                ) : null}
                {datelineBits.length ? <span>{datelineBits.join(" · ")}</span> : null}
                {doc.source.byline ? <span>{doc.source.byline}</span> : null}
              </div>
            ) : null}
          </div>
        </SafeZone>
      </Article3D>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Root — renders with ONLY the required RenderDoc fields; optionals guarded in Inner.
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
