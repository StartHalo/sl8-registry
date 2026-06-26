// Palette + font + orientation + type-scale context. A style sets its palette once
// (palette.ts) and wraps its root in <StyleProvider>; every scene reads useStyleConfig().

import React, { createContext, useContext } from "react";
import { useVideoConfig } from "remotion";
import { FONT_PACKS, type FontSet } from "./fonts";
import type { Orientation } from "./types";
import { sizeFor, type TypeKey } from "./tokens";

// Font context — NewsVideo resolves the chosen pack (props.fontPack) and provides it here, so
// every style's useStyleConfig().font reflects the developer's choice with zero style changes.
const FontCtx = createContext<FontSet>(FONT_PACKS.modern);
export const FontProvider: React.FC<{ fonts: FontSet; children: React.ReactNode }> = ({ fonts, children }) => (
  <FontCtx.Provider value={fonts}>{children}</FontCtx.Provider>
);
export const useFonts = (): FontSet => useContext(FontCtx);

export interface Palette {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentAlt: string;
}

export interface StyleConfigValue {
  palette: Palette;
  font: FontSet;
  orientation: Orientation;
  shortEdge: number; // min(width,height) — base for the type scale
  size: (k: TypeKey) => number;
}

const Ctx = createContext<StyleConfigValue | null>(null);

export const StyleProvider: React.FC<{ palette: Palette; children: React.ReactNode }> = ({
  palette,
  children,
}) => {
  const { width, height } = useVideoConfig();
  const font = useFonts();
  const ar = width / height;
  const orientation: Orientation = ar > 1.2 ? "landscape" : ar < 0.85 ? "portrait" : "square";
  const shortEdge = Math.min(width, height);
  const value: StyleConfigValue = {
    palette,
    font,
    orientation,
    shortEdge,
    size: (k) => sizeFor(shortEdge, k),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useStyleConfig = (): StyleConfigValue => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStyleConfig must be used inside <StyleProvider>");
  return c;
};

export const useOrientation = (): Orientation => useStyleConfig().orientation;
