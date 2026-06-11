// The carousel mechanic for Blur Carousel: a stable lead label beside/above ONE slot that
// cycles through a list of items. Each item HOLDS for a stretch, then the outgoing item
// blurs + slides + fades OUT while the incoming item blurs + slides + fades IN. Everything
// is a pure function of the LOCAL useCurrentFrame() (this renders inside a <Series.Sequence>
// whose frame starts at 0), so it is fully deterministic and frame-driven — no CSS
// transitions, no timers, no randomness.

import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { useStyleConfig } from "../../engine/StyleConfig";

export interface CarouselItem {
  text: string;
  emph: boolean; // active item rendered in accent (keyPhrase)
}

// Returns the per-item slot frame-budget so N items fill exactly `total` frames. Each item
// owns an equal slice; the swap (blur cross-fade) happens at the START of each slice after
// the first. Pure.
export const slotFrames = (n: number, total: number): number => Math.max(1, Math.floor(total / Math.max(1, n)));

// Clamp a single line's font size so its LONGEST word fits the content width — long compound
// words otherwise overflow the slot at full size. Pure (mirrors kinetic's TextScene pattern).
const fitFont = (text: string, contentW: number, cap: number, floor: number): number => {
  const longest = Math.max(1, ...text.split(/\s+/).filter(Boolean).map((w) => w.length));
  const byWord = Math.floor(contentW / (longest * 0.6)); // Fraunces avg char width ~0.6em
  return Math.max(floor, Math.min(cap, byWord));
};

export const Carousel: React.FC<{
  lead: string; // stable lead label (e.g. category / headline subject)
  items: CarouselItem[];
  total: number; // total frames this carousel region spans (LOCAL)
  accent: string;
}> = ({ lead, items, total, accent }) => {
  const { palette, font, orientation, shortEdge, size } = useStyleConfig();
  const frame = useCurrentFrame();

  const stacked = orientation !== "landscape"; // portrait + square stack lead over slot
  const per = slotFrames(items.length, total);
  const swap = Math.min(18, Math.round(per * 0.5)); // blur-swap window (frames)

  // Which item is active right now, and the local frame within that item's slice.
  const idx = Math.min(items.length - 1, Math.floor(frame / per));
  const local = frame - idx * per;

  // Sizing: the slot type is the hero of this style.
  const slotCap = Math.round(shortEdge * (orientation === "landscape" ? 0.12 : 0.135));
  const slotFloor = Math.round(shortEdge * 0.058);
  const contentW = shortEdge * (orientation === "landscape" ? 0.62 : 0.86);

  // Lead-label intro: fades up once at the very start, then holds (persistent feel).
  const leadO = interpolate(frame, [2, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Render the active item plus, during a swap, the OUTGOING (previous) item underneath so
  // the blur cross-dissolves between the two.
  const renderItem = (item: CarouselItem, phase: "in" | "out"): React.ReactNode => {
    const fontSize = fitFont(item.text, contentW, slotCap, slotFloor);
    // SEQUENTIAL swap (not a 50/50 cross-dissolve, which ghosts when two long lines overlap):
    // the OUTGOING item blurs+fades OUT over the first ~60% of the window, and the INCOMING
    // item only starts ~42% in — so two SHARP lines are never on screen together; the brief
    // overlap is between a heavily-blurred fading-out line and a blurred fading-in one.
    const inStart = swap * 0.42;
    const t =
      phase === "in"
        ? interpolate(local, [inStart, swap], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          })
        : interpolate(local, [0, swap * 0.6], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.cubic),
          });
    const blurPx = interpolate(t, [0, 1], [10, 0]);
    const translateY = interpolate(t, [0, 1], [phase === "in" ? 26 : -22, 0]);
    const scale = interpolate(t, [0, 1], [0.965, 1]);
    const opacity = interpolate(t, [0, 1], [0, 1]);

    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: stacked ? "center" : "flex-start",
          filter: `blur(${blurPx}px)`,
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
          willChange: "filter, transform, opacity",
        }}
      >
        <span
          style={{
            fontFamily: font.display,
            fontWeight: 600,
            fontSize,
            lineHeight: 1.0,
            letterSpacing: "-0.015em",
            color: item.emph ? accent : palette.text,
            textAlign: stacked ? "center" : "left",
            maxWidth: contentW,
            // soft tracking shadow keeps the in-focus item crisp against the sheen
            textShadow: item.emph ? `0 0 ${Math.round(fontSize * 0.18)}px ${accent}22` : "none",
          }}
        >
          {item.text}
        </span>
      </div>
    );
  };

  const active = items[idx];
  const prev = idx > 0 ? items[idx - 1] : null;
  const inSwap = idx > 0 && local < swap; // show outgoing ghost only during the swap window

  // Slot height reserves space for ~2 lines so cycling never reflows the layout.
  const slotH = Math.round(slotCap * 2.35);

  const Lead = (
    <div
      style={{
        opacity: leadO,
        transform: `translateY(${interpolate(leadO, [0, 1], [10, 0])}px)`,
        display: "flex",
        alignItems: "center",
        gap: size("kicker") * 0.6,
      }}
    >
      <span style={{ width: size("kicker") * 0.5, height: size("kicker") * 0.5, borderRadius: 999, background: accent }} />
      <span
        style={{
          fontFamily: font.body,
          fontWeight: 700,
          fontSize: size("kicker"),
          color: palette.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.24em",
          whiteSpace: "nowrap",
        }}
      >
        {lead}
      </span>
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: stacked ? "center" : "center",
        justifyContent: "center",
        gap: stacked ? size("dek") * 1.1 : 0,
      }}
    >
      {stacked ? Lead : <div style={{ flex: "0 0 26%", display: "flex", justifyContent: "flex-start" }}>{Lead}</div>}
      <div
        style={{
          position: "relative",
          flex: stacked ? "0 0 auto" : "1 1 auto",
          width: stacked ? "100%" : "auto",
          height: slotH,
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* outgoing ghost (only during a swap) */}
        {inSwap && prev ? renderItem(prev, "out") : null}
        {/* incoming / held active item */}
        {active ? renderItem(active, "in") : null}
      </div>
    </div>
  );
};
