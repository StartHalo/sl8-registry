// CaptionOverlay — TikTok-style word-pop captions over <OffthreadVideo>/<Audio> or any scene.
//
// OWNED by the rm-captions skill (the source of truth lives in the bundled starter; init.sh copies
// the starter into artifacts/<project>/remotion-project/, so at runtime this file is at
// remotion-project/src/components/CaptionOverlay.tsx). rm-build composes <CaptionOverlay …/> as the
// TOP layer of a captioned composition for JTBD-3 (clip -> captions) and optionally for JTBD-1.
//
// Self-contained by design: it does NOT require <StyleProvider>/<FontProvider>, so it drops in over a
// raw <OffthreadVideo> without an engine wrapper. It obeys the composition contract that rm-validate
// enforces: frame-driven only (useCurrentFrame), NO CSS transition/@keyframes/animate-*, NO
// setTimeout/Date.now/Math.random, every interpolate() is clamped, content sits inside the lower
// safe-zone band, deterministic. Fonts are NOT loaded here (C5): the caller passes an already-loaded
// family name via `fontFamily` (e.g. the engine's font.body).
//
// Captions arrive as a prop (deterministic; rm-build inlines the Caption[] from props.json — produced
// by scripts/timing-to-captions.mjs out of 04-timing.json). The official staticFile()+fetch variant
// is documented in rm-captions/references/captions.md for teams that prefer a public/ file.

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  createTikTokStyleCaptions,
  type Caption,
  type TikTokPage,
} from "@remotion/captions";

const SWITCH_DEFAULT_MS = 1200; // page-switch window; lower => more word-by-word, higher => more words/page

type Band = { bottom: number; side: number };

export type CaptionOverlayProps = {
  /** Caption[] from timing-to-captions.mjs (absolute ms; leading-space tokens). */
  captions: Caption[];
  /** createTikTokStyleCaptions grouping window (ms). Lower = fewer words per page. */
  combineTokensWithinMilliseconds?: number;
  /** An already-loaded family name (e.g. engine font.body). NOT loaded here. */
  fontFamily?: string;
  fontWeight?: number | string;
  /** Explicit caption size in px; defaults to an AR-derived size. */
  fontSizePx?: number;
  /** Inactive (not-yet-spoken / past) word color. */
  color?: string;
  /** Active (currently spoken) word color. */
  highlightColor?: string;
  /** "bottom" sits in the lower safe-zone band; "center" centers the line. */
  position?: "bottom" | "center";
  /** Stroke + shadow for legibility over busy video. */
  outline?: boolean;
  uppercase?: boolean;
};

export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({
  captions,
  combineTokensWithinMilliseconds = SWITCH_DEFAULT_MS,
  fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  fontWeight = 800,
  fontSizePx,
  color = "#ffffff",
  highlightColor = "#39E508",
  position = "bottom",
  outline = true,
  uppercase = false,
}) => {
  const { fps, width, height } = useVideoConfig();
  const ar = width / height;
  const orientation = ar > 1.2 ? "landscape" : ar < 0.85 ? "portrait" : "square";
  const shortEdge = Math.min(width, height);
  const resolvedSize =
    fontSizePx ?? Math.max(40, Math.round(shortEdge * (orientation === "portrait" ? 0.062 : 0.05)));

  // Lower safe-zone band — mirrors engine/SafeZone margins so captions never collide with the
  // platform UI (Reels caption rail / IG crop / YT scrubber).
  const band: Band =
    orientation === "portrait"
      ? { bottom: 280, side: 64 }
      : orientation === "square"
        ? { bottom: 120, side: 80 }
        : { bottom: 130, side: 120 };

  const { pages } = React.useMemo(
    () => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds }),
    [captions, combineTokensWithinMilliseconds],
  );

  return (
    <AbsoluteFill>
      {pages.map((page, index) => {
        const nextPage = pages[index + 1] ?? null;
        const startFrame = (page.startMs / 1000) * fps;
        // End at the next page (or this page's own end), capped so a long trailing page can't linger.
        const endMs = Math.min(
          nextPage ? nextPage.startMs : page.startMs + page.durationMs,
          page.startMs + page.durationMs + combineTokensWithinMilliseconds,
        );
        const endFrame = (endMs / 1000) * fps;
        const durationInFrames = Math.max(1, Math.round(endFrame - startFrame));

        return (
          <Sequence
            key={index}
            from={Math.round(startFrame)}
            durationInFrames={durationInFrames}
            premountFor={30}
          >
            <CaptionPage
              page={page}
              fps={fps}
              band={band}
              position={position}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
              fontSizePx={resolvedSize}
              color={color}
              highlightColor={highlightColor}
              outline={outline}
              uppercase={uppercase}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const CaptionPage: React.FC<{
  page: TikTokPage;
  fps: number;
  band: Band;
  position: "bottom" | "center";
  fontFamily: string;
  fontWeight: number | string;
  fontSizePx: number;
  color: string;
  highlightColor: string;
  outline: boolean;
  uppercase: boolean;
}> = ({
  page,
  fps,
  band,
  position,
  fontFamily,
  fontWeight,
  fontSizePx,
  color,
  highlightColor,
  outline,
  uppercase,
}) => {
  const frame = useCurrentFrame(); // LOCAL to this Sequence: 0 == page.startMs
  const absoluteTimeMs = page.startMs + (frame / fps) * 1000;

  const textShadow = outline ? "0 2px 10px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.9)" : undefined;
  const WebkitTextStroke = outline ? "2px rgba(0,0,0,0.35)" : undefined;

  return (
    <AbsoluteFill
      style={{
        justifyContent: position === "center" ? "center" : "flex-end",
        alignItems: "center",
        paddingLeft: band.side,
        paddingRight: band.side,
        paddingBottom: position === "center" ? 0 : band.bottom,
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight,
          fontSize: fontSizePx,
          lineHeight: 1.12,
          textAlign: "center",
          whiteSpace: "pre-wrap", // preserve the leading spaces in each token, but still wrap long pages
          textTransform: uppercase ? "uppercase" : "none",
          maxWidth: "100%",
        }}
      >
        {page.tokens.map((token, i) => {
          const isActive = token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs;
          // Frame-driven "pop": the active word scales 0.82 -> 1 over its first ~4 frames (clamped, C4).
          const activeFromFrame = ((token.fromMs - page.startMs) / 1000) * fps;
          const scale = isActive
            ? interpolate(frame, [activeFromFrame, activeFromFrame + 4], [0.82, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 1;
          // Keep the leading space OUTSIDE the inline-block so spacing is preserved while the word pops.
          const raw = token.text;
          const lead = raw.startsWith(" ") ? " " : "";
          const word = lead ? raw.slice(1) : raw;
          return (
            <React.Fragment key={`${token.fromMs}-${i}`}>
              {lead}
              <span
                style={{
                  display: "inline-block",
                  transform: `scale(${scale})`,
                  transformOrigin: "center 90%",
                  color: isActive ? highlightColor : color,
                  textShadow,
                  WebkitTextStroke,
                }}
              >
                {word}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
