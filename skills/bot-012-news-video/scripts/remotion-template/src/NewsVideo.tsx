// Dispatcher: a single component that every registered <Composition> renders.
// It normalizes the rich NewsDoc into a flat RenderDoc and hands it to the chosen
// style root. Style is a prop, so the same three AR compositions serve all four styles.

import React from "react";
import { Root as HeadlineHighlight } from "./styles/headline-highlight";
import { Root as BreakingNews } from "./styles/breaking-news";
import { Root as KineticTypography } from "./styles/kinetic-typography";
import { Root as MinimalEditorial } from "./styles/minimal-editorial";
import { DEFAULT_BRAND, normalizeDoc, type NewsVideoProps, type StyleName, type StyleRootProps } from "./engine/types";

const ROOTS: Record<StyleName, React.FC<StyleRootProps>> = {
  "headline-highlight": HeadlineHighlight,
  "breaking-news": BreakingNews,
  "kinetic-typography": KineticTypography,
  "minimal-editorial": MinimalEditorial,
};

export const NewsVideo: React.FC<NewsVideoProps> = ({ style, doc, brand, seed }) => {
  const StyleRoot = ROOTS[style] ?? ROOTS["minimal-editorial"];
  const renderDoc = normalizeDoc(doc);
  const resolvedBrand = {
    accent: brand?.accent ?? DEFAULT_BRAND.accent,
    accentAlt: brand?.accentAlt ?? DEFAULT_BRAND.accentAlt,
    label: brand?.label ?? null,
  };
  return <StyleRoot doc={renderDoc} brand={resolvedBrand} seed={seed ?? 1} />;
};
