// Ticker — bottom strip, continuous seamless deterministic marquee.
//
// The content string is rendered TWICE back-to-back inside a flex track. The track is
// translated by  x = -((speed * frame) % stripWidth)  so when the first copy scrolls
// fully off, the modulo snaps x back and the second copy is already in the identical
// position — no visible jump. `stripWidth` is a FIXED deterministic estimate from a
// per-glyph advance (NOT a measured/DOM-timing value), so the render is byte-identical
// across --scale stills and full renders. speed is px/frame, never wall-clock.

import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useStyleConfig } from "../../engine/StyleConfig";
import { FPS } from "../../engine/tokens";

// Readable crawl ceiling is ~90–100 px/s (News-ticker conventions). Keep at 90.
const PX_PER_SECOND = 90;
// Oswald (condensed) mean glyph advance ≈ 0.52em. Fixed so the modulo wrap is stable.
const GLYPH_ADVANCE_EM = 0.52;

export const Ticker: React.FC<{
  items: string[]; // already non-empty, up-cased at the call site is fine either way
  liveLabel: string; // fixed red tab on the left, e.g. "LIVE"
  /** Frame at which the bar slides up into view (local to the parent AbsoluteFill). */
  delay?: number;
}> = ({ items, liveLabel, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const { palette, font, size, orientation } = useStyleConfig();

  // Bar height + type scale off the short edge via meta-class type.
  const fontPx =
    orientation === "landscape" ? Math.round(size("meta") * 1.05) : Math.round(size("meta") * 1.15);
  const barH = Math.round(fontPx * 2.0);

  const SEP = "   ■   "; // ■ red-square-class separator, padded with spaces
  // Up-case for broadcast convention; join into one crawl with a trailing sep so the
  // last item is separated from the first when the loop wraps.
  const text = items.map((s) => s.toUpperCase()).join(SEP) + SEP;

  // Deterministic cycle width: char count × glyph advance × font size, floored to the
  // viewport width so a very short ticker still fills the bar before it repeats.
  const stripWidth = Math.max(width, Math.round(text.length * fontPx * GLYPH_ADVANCE_EM));

  const speedPerFrame = PX_PER_SECOND / (fps || FPS);
  // modulo => seamless loop. The track itself starts after the LIVE tab (paddingLeft).
  const x = -((speedPerFrame * frame) % stripWidth);

  // entrance: slide the whole bar up from below.
  const slideUp = interpolate(frame - delay, [0, 14], [barH, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tabPadX = Math.round(fontPx * 0.9);
  const liveTabWidth = liveLabel.length * fontPx * GLYPH_ADVANCE_EM + tabPadX * 2;
  const trackPadLeft = Math.round(liveTabWidth + fontPx * 0.8);

  const Strip: React.FC = () => (
    <div
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
        width: stripWidth,
        fontFamily: font.condensed,
        fontWeight: 500,
        fontSize: fontPx,
        letterSpacing: 0.6,
        color: palette.text,
        lineHeight: `${barH}px`,
        flex: "0 0 auto",
      }}
    >
      {text}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: barH,
        background: palette.surface,
        transform: `translateY(${slideUp}px)`,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        borderTop: `3px solid ${palette.accent}`,
      }}
    >
      {/* the moving track: two identical strips, translated by the modulo loop. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          display: "flex",
          transform: `translateX(${x}px)`,
          paddingLeft: trackPadLeft, // start clear of the LIVE tab
          alignItems: "center",
          zIndex: 1,
        }}
      >
        <Strip />
        <Strip />
      </div>

      {/* fixed red LIVE/source tab on the left; the crawl runs behind it. */}
      <div
        style={{
          position: "relative",
          flex: "0 0 auto",
          height: "100%",
          zIndex: 2,
          background: palette.accent,
          color: palette.text,
          fontFamily: font.condensed,
          fontWeight: 700,
          fontSize: fontPx,
          letterSpacing: 2,
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          padding: `0 ${tabPadX}px`,
          boxShadow: "8px 0 16px rgba(0,0,0,0.4)",
        }}
      >
        {liveLabel}
      </div>
    </div>
  );
};
