// Dispatcher: a single component that every registered <Composition> renders.
// It normalizes the rich MessageDoc into a flat RenderDoc, lays the background score under
// the clip, and hands the doc to the chosen style root. Style is a prop, so the same three
// AR compositions serve all nine styles. ROOTS is a Partial map so new styles can be added
// incrementally — any style not yet registered falls back to minimal-editorial.

import React from "react";
import { AbsoluteFill } from "remotion";
import { Root as HeadlineHighlight } from "./styles/headline-highlight";
import { Root as BreakingNews } from "./styles/breaking-news";
import { Root as KineticTypography } from "./styles/kinetic-typography";
import { Root as MinimalEditorial } from "./styles/minimal-editorial";
import { Root as BoxReveal } from "./styles/box-reveal";
import { Root as GiantWord } from "./styles/giant-word";
import { Root as Perspective3D } from "./styles/perspective-3d";
import { Root as PixelReveal } from "./styles/pixel-reveal";
import { Root as BlurCarousel } from "./styles/blur-carousel";
import { BackgroundScore } from "./engine/BackgroundScore";
import { moodForStyle } from "./engine/moods";
import { DEFAULT_BRAND, normalizeDoc, type ClipProps, type StyleName, type StyleRootProps } from "./engine/types";

const ROOTS: Partial<Record<StyleName, React.FC<StyleRootProps>>> = {
  "headline-highlight": HeadlineHighlight,
  "breaking-news": BreakingNews,
  "kinetic-typography": KineticTypography,
  "minimal-editorial": MinimalEditorial,
  "box-reveal": BoxReveal,
  "giant-word": GiantWord,
  "perspective-3d": Perspective3D,
  "pixel-reveal": PixelReveal,
  "blur-carousel": BlurCarousel,
};

export const NewsVideo: React.FC<ClipProps> = ({ style, doc, brand, seed, music, mood }) => {
  const StyleRoot = ROOTS[style] ?? MinimalEditorial;
  const renderDoc = normalizeDoc(doc);
  const resolvedBrand = {
    accent: brand?.accent ?? DEFAULT_BRAND.accent,
    accentAlt: brand?.accentAlt ?? DEFAULT_BRAND.accentAlt,
    label: brand?.label ?? null,
  };
  const resolvedMood = mood ?? moodForStyle(style, renderDoc.tone);
  return (
    <AbsoluteFill>
      <StyleRoot doc={renderDoc} brand={resolvedBrand} seed={seed ?? 1} />
      {music === false ? null : <BackgroundScore mood={resolvedMood} />}
    </AbsoluteFill>
  );
};
