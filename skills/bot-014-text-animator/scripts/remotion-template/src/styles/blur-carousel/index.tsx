// Blur Carousel — an elegant, premium "cycling word carousel with blur" (adapted from the
// Skiper44 reference to time-based Remotion). A stable lead label sits beside/above ONE slot
// that CYCLES through a list of phrases drawn from the message; each swap blurs the old item
// out and blurs the new one in (plus a vertical slide), all frame-driven. The clip opens by
// establishing the headline, runs the carousel through the beats/keyPhrases, shows the hero
// stat with the same blur-swap, and ENDS on a tidy list card with the source/dateline credit.
//
// This is a CONTINUOUS style, so it uses its own <Series> timeline (allowed by the authoring
// contract) instead of per-scene cuts — but the timeline still walks the WHOLE message and
// ends EXACTLY at durationInFrames.
//
// Hard rules honored:
//  - Exactly `export const Root: React.FC<StyleRootProps>` (+ default).
//  - 100% frame-driven; no CSS transition/animation, no timers, no runtime randomness
//    (jitter via engine noise()/hashStr only).
//  - Sizes from useStyleConfig(); layout branches on orientation; fonts from font.*.
//  - interpolate always clamped; springs use config.damping.
//  - Every optional RenderDoc field is guarded.
//  - The <Series> durations sum EXACTLY to durationInFrames.

import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Series,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RenderDoc, StyleRootProps } from "../../engine/types";
import { StyleProvider, useStyleConfig } from "../../engine/StyleConfig";
import { SafeZone } from "../../engine/SafeZone";
import { Counter, parseStat } from "../../engine/primitives";
import { hashStr } from "../../engine/rng";
import { buildPalette, STAGE } from "./palette";
import { Backdrop } from "./Backdrop";
import { Carousel, type CarouselItem } from "./Carousel";

// ---- copy helpers (pure, deterministic) ------------------------------------------------

const normalize = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "");

// Build the normalized emphasis set from keyPhrases (phrase + component words), mirroring
// kinetic's buildEmphasisSet but kept LOCAL so this style stays independent.
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

const isEmph = (text: string, set: Set<string>): boolean =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .some((tok) => set.has(normalize(tok)));

// A short, stable lead label: the brand/category if meaningful, else a tasteful default.
const leadLabel = (doc: RenderDoc): string => {
  const cat = doc.category && doc.category !== "other" ? doc.category : "";
  if (cat) return cat;
  if (doc.dateline.location) return doc.dateline.location;
  return "Now";
};

const wordCount = (s: string): number => s.split(/\s+/).filter(Boolean).length;

const makePush = (emphasisSet: Set<string>) => {
  const seen = new Set<string>();
  const out: CarouselItem[] = [];
  const push = (text: string): void => {
    const t = text.trim();
    if (!t) return;
    const key = normalize(t);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ text: t, emph: isEmph(t, emphasisSet) });
  };
  return { out, push };
};

// CAROUSEL items must be SHORT so the blur-swap reads cleanly (long lines ghost when they
// swap). Cycle the keyPhrases (the hero words) plus only the short body beats; pad with the
// remaining beats only if we'd otherwise have too few to cycle. Always at least one item.
function buildCarouselItems(doc: RenderDoc, emphasisSet: Set<string>): CarouselItem[] {
  const { out, push } = makePush(emphasisSet);
  for (const kp of doc.keyPhrases) push(kp);
  for (const b of doc.bodyBeats) if (wordCount(b) <= 3) push(b);
  if (out.length < 3) for (const b of doc.bodyBeats) push(b);
  if (out.length === 0) push(doc.headline || "Update");
  return out.slice(0, 5);
}

// LIST-CARD items are the narrative payoff: the full body beats (where long lines read fine
// because they're laid out together, not cross-fading). Fall back to keyPhrases / headline.
function buildListItems(doc: RenderDoc, emphasisSet: Set<string>): CarouselItem[] {
  const { out, push } = makePush(emphasisSet);
  for (const b of doc.bodyBeats) push(b);
  if (out.length === 0) for (const kp of doc.keyPhrases) push(kp);
  if (out.length === 0) push(doc.headline || "Update");
  return out.slice(0, 5);
}

// ---- Headline establishing scene -------------------------------------------------------

const HeadlineScene: React.FC<{ doc: RenderDoc; lead: string }> = ({ doc, lead }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const frame = useCurrentFrame();

  const cap = Math.round(shortEdge * (orientation === "landscape" ? 0.1 : 0.115));
  const floor = Math.round(shortEdge * 0.055);
  const longest = Math.max(1, ...(doc.headline || "").split(/\s+/).filter(Boolean).map((w) => w.length));
  const contentW = shortEdge * (orientation === "landscape" ? 0.74 : 0.86);
  const byWord = Math.floor(contentW / (longest * 0.6));
  const fontSize = Math.max(floor, Math.min(cap, byWord));

  // Whole headline blurs in once (out-of-focus → sharp), with a gentle rise.
  const t = interpolate(frame, [4, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const blurPx = interpolate(t, [0, 1], [16, 0]);
  const translateY = interpolate(t, [0, 1], [30, 0]);
  const leadO = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <SafeZone justify="center" align={orientation === "landscape" ? "flex-start" : "center"}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: orientation === "landscape" ? "flex-start" : "center",
          gap: size("dek") * 0.9,
          maxWidth: contentW,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: size("kicker") * 0.6, opacity: leadO }}>
          <span style={{ width: size("kicker") * 0.5, height: size("kicker") * 0.5, borderRadius: 999, background: palette.accent }} />
          <span
            style={{
              fontFamily: font.body,
              fontWeight: 700,
              fontSize: size("kicker"),
              color: palette.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.24em",
            }}
          >
            {lead}
          </span>
        </div>
        <span
          style={{
            fontFamily: font.display,
            fontWeight: 600,
            fontSize,
            lineHeight: 1.04,
            letterSpacing: "-0.018em",
            color: palette.text,
            textAlign: orientation === "landscape" ? "left" : "center",
            filter: `blur(${blurPx}px)`,
            transform: `translateY(${translateY}px)`,
            opacity: t,
          }}
        >
          {doc.headline || "Update"}
        </span>
      </div>
    </SafeZone>
  );
};

// ---- Carousel scene (the cycling slot) -------------------------------------------------

const CarouselScene: React.FC<{ doc: RenderDoc; items: CarouselItem[]; total: number; lead: string }> = ({
  items,
  total,
  lead,
}) => {
  const { palette } = useStyleConfig();
  return (
    <SafeZone justify="center" align="stretch">
      <Carousel lead={lead} items={items} total={total} accent={palette.accent} />
    </SafeZone>
  );
};

// ---- Stat scene (blur-swaps in, with an animated counter) ------------------------------

const StatScene: React.FC<{ value: string; label: string; lead: string }> = ({ value, label, lead }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const parsed = parseStat(value);

  const numPx = Math.round(shortEdge * (orientation === "landscape" ? 0.2 : 0.24));

  // Blur-swap IN to match the carousel's motion language.
  const t = interpolate(frame, [2, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const blurPx = interpolate(t, [0, 1], [14, 0]);
  const pop = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const scale = interpolate(pop, [0, 1], [0.9, 1]);
  const labelO = interpolate(frame, [16, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const leadO = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <SafeZone justify="center" align="center">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size("dek") * 0.7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: size("kicker") * 0.6, opacity: leadO }}>
          <span style={{ width: size("kicker") * 0.5, height: size("kicker") * 0.5, borderRadius: 999, background: palette.accent }} />
          <span
            style={{
              fontFamily: font.body,
              fontWeight: 700,
              fontSize: size("kicker"),
              color: palette.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.24em",
            }}
          >
            {lead}
          </span>
        </div>
        <span
          style={{
            fontFamily: font.display,
            fontWeight: 600,
            fontSize: numPx,
            color: palette.accent,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            whiteSpace: "nowrap",
            filter: `blur(${blurPx}px)`,
            transform: `scale(${scale})`,
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
        {label ? (
          <span
            style={{
              fontFamily: font.body,
              fontWeight: 600,
              fontSize: size("meta"),
              color: palette.text,
              opacity: labelO,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              textAlign: "center",
              maxWidth: "80%",
            }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </SafeZone>
  );
};

// ---- List card / credit scene (the tidy end) -------------------------------------------

const ListCardScene: React.FC<{ doc: RenderDoc; items: CarouselItem[] }> = ({ doc, items }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The list = the same carousel items, now laid out together (the "tidy list" payoff).
  const rows = items.slice(0, orientation === "landscape" ? 4 : 5);
  const name = doc.source.name || doc.headline || "";
  const dateline = [doc.dateline.location, doc.dateline.dateDisplay].filter((s): s is string => Boolean(s)).join("  ·  ");

  const cardW = orientation === "landscape" ? shortEdge * 1.0 : shortEdge * 0.86;
  const card = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const cardO = interpolate(card, [0, 1], [0, 1]);
  const cardY = interpolate(card, [0, 1], [28, 0]);

  const rowPx = Math.max(size("beat"), Math.round(shortEdge * 0.04));

  return (
    <SafeZone justify="center" align="center">
      <div
        style={{
          width: "100%",
          maxWidth: cardW,
          background: palette.surface,
          borderRadius: Math.round(shortEdge * 0.03),
          padding: `${Math.round(shortEdge * 0.05)}px ${Math.round(shortEdge * 0.045)}px`,
          boxShadow: "0 40px 90px -30px rgba(28,26,23,0.28), 0 2px 0 rgba(255,255,255,0.6) inset",
          opacity: cardO,
          transform: `translateY(${cardY}px)`,
          display: "flex",
          flexDirection: "column",
          gap: size("dek") * 0.5,
        }}
      >
        {name ? (
          <span
            style={{
              fontFamily: font.body,
              fontWeight: 700,
              fontSize: size("kicker"),
              color: palette.accent,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
            }}
          >
            {name}
          </span>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: rowPx * 0.42 }}>
          {rows.map((it, i) => {
            // Each row staggers in (blur + rise), deterministic delay per row.
            const delay = 6 + i * 5;
            const t = interpolate(frame, [delay, delay + 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            const blurPx = interpolate(t, [0, 1], [8, 0]);
            const ry = interpolate(t, [0, 1], [14, 0]);
            const tick = hashStr(it.text) % 3; // tiny deterministic variety in the marker
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: rowPx * 0.5,
                  opacity: t,
                  filter: `blur(${blurPx}px)`,
                  transform: `translateY(${ry}px)`,
                }}
              >
                <span
                  style={{
                    flex: "0 0 auto",
                    width: rowPx * 0.36,
                    height: rowPx * 0.36,
                    marginTop: rowPx * 0.22,
                    borderRadius: tick === 0 ? 999 : 3,
                    background: it.emph ? palette.accent : palette.textMuted,
                    transform: tick === 2 ? "rotate(45deg)" : "none",
                  }}
                />
                <span
                  style={{
                    fontFamily: font.display,
                    fontWeight: it.emph ? 600 : 500,
                    fontSize: rowPx,
                    lineHeight: 1.08,
                    letterSpacing: "-0.01em",
                    color: it.emph ? palette.accent : palette.text,
                  }}
                >
                  {it.text}
                </span>
              </div>
            );
          })}
        </div>
        {dateline ? (
          <span
            style={{
              fontFamily: font.body,
              fontWeight: 600,
              fontSize: size("meta"),
              color: palette.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              opacity: interpolate(frame, [18, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            {dateline}
          </span>
        ) : null}
      </div>
    </SafeZone>
  );
};

// ---- timeline budgeting ----------------------------------------------------------------

// Split the clip into headline → carousel → (stat) → list-card so the durations sum EXACTLY
// to durationInFrames. Pure integer math; the carousel absorbs any rounding remainder.
interface Segment {
  key: "headline" | "carousel" | "stat" | "list";
  frames: number;
}

function planTimeline(total: number, itemCount: number, hasStat: boolean): Segment[] {
  // Weight the carousel so each item gets a comfortable hold (~26-34 frames @30fps).
  const headlineW = 2.0;
  const carouselW = Math.max(3.2, itemCount * 1.5);
  const statW = hasStat ? 1.8 : 0;
  const listW = 2.4;
  const sumW = headlineW + carouselW + statW + listW;

  const order: Segment[] = [
    { key: "headline", frames: 0 },
    { key: "carousel", frames: 0 },
    ...(hasStat ? [{ key: "stat" as const, frames: 0 }] : []),
    { key: "list", frames: 0 },
  ];
  const weights: Record<Segment["key"], number> = { headline: headlineW, carousel: carouselW, stat: statW, list: listW };

  const MIN = 24; // ~0.8s floor per segment
  let used = 0;
  for (const seg of order) {
    seg.frames = Math.max(MIN, Math.round((weights[seg.key] / sumW) * total));
    used += seg.frames;
  }
  // Absorb the rounding remainder into the carousel so the sum is exact.
  const carousel = order.find((s) => s.key === "carousel");
  if (carousel) carousel.frames = Math.max(MIN, carousel.frames + (total - used));
  return order;
}

// ---- Inner + Root ----------------------------------------------------------------------

const BlurInner: React.FC<StyleRootProps> = ({ doc, seed }) => {
  const { durationInFrames } = useVideoConfig();
  const { palette } = useStyleConfig();

  const emphasisSet = React.useMemo(() => buildEmphasisSet(doc.keyPhrases), [doc.keyPhrases]);
  const carouselItems = React.useMemo(() => buildCarouselItems(doc, emphasisSet), [doc, emphasisSet]);
  const listItems = React.useMemo(() => buildListItems(doc, emphasisSet), [doc, emphasisSet]);
  const lead = React.useMemo(() => leadLabel(doc), [doc]);
  const hasStat = doc.primaryStat !== null && Boolean(doc.primaryStat?.value);

  const segments = React.useMemo(
    () => planTimeline(durationInFrames, carouselItems.length, hasStat),
    [durationInFrames, carouselItems.length, hasStat],
  );

  return (
    <>
      <Backdrop top={STAGE.gradientTop} bottom={STAGE.gradientBottom} accent={palette.accent} accentAlt={palette.accentAlt} seed={seed} />
      <Series>
        {segments.map((seg) => (
          <Series.Sequence key={seg.key} durationInFrames={seg.frames}>
            {seg.key === "headline" ? (
              <HeadlineScene doc={doc} lead={lead} />
            ) : seg.key === "carousel" ? (
              <CarouselScene doc={doc} items={carouselItems} total={seg.frames} lead={lead} />
            ) : seg.key === "stat" && doc.primaryStat ? (
              <StatScene value={doc.primaryStat.value} label={doc.primaryStat.label} lead={lead} />
            ) : (
              <ListCardScene doc={doc} items={listItems} />
            )}
          </Series.Sequence>
        ))}
      </Series>
    </>
  );
};

export const Root: React.FC<StyleRootProps> = ({ doc, brand, seed }) => {
  const palette = buildPalette({ accent: brand.accent, accentAlt: brand.accentAlt ?? null });
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <StyleProvider palette={palette}>
        <BlurInner doc={doc} brand={brand} seed={seed} />
      </StyleProvider>
    </AbsoluteFill>
  );
};

export default Root;
