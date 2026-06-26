// The default/example studio composition — a title -> optional stat -> outro card,
// built ENTIRELY on the harvested engine (StyleProvider / FontProvider / SafeZone /
// primitives) so it is on-brand + AR-responsive + deterministic by construction.
//
// rm-build edits this per templated project, or replaces it with a freshly-authored
// composition for JTBD-5. Either way the composition contract holds: frame-driven only,
// no Math.random / Date.now / setTimeout, no CSS transitions, clamped interpolate,
// fonts via the engine, content inside <SafeZone>, timeline ends at durationInFrames.

import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { FontProvider, StyleProvider, useStyleConfig, type Palette } from "./engine/StyleConfig";
import { resolveFontPack } from "./engine/fonts";
import { SafeZone } from "./engine/SafeZone";
import { RiseIn, FadeIn, Counter } from "./engine/primitives";
import type { StudioProps } from "./schema";

const T = 15; // transition length in frames

const paletteFromBrand = (b: StudioProps["brand"]): Palette => ({
  bg: b.bg,
  surface: "rgba(255,255,255,0.05)",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.66)",
  accent: b.accent,
  accentAlt: b.accentAlt,
});

const Kicker: React.FC<{ text: string }> = ({ text }) => {
  const { palette, font, size } = useStyleConfig();
  return (
    <RiseIn delay={2}>
      <div
        style={{
          fontFamily: font.condensed,
          fontWeight: 700,
          letterSpacing: 6,
          textTransform: "uppercase",
          fontSize: size("kicker"),
          color: palette.accent,
        }}
      >
        {text}
      </div>
    </RiseIn>
  );
};

const TitleScene: React.FC<{ label: string; title: string }> = ({ label, title }) => {
  const { palette, font, size } = useStyleConfig();
  return (
    <SafeZone justify="center" align="flex-start">
      <Kicker text={label} />
      <RiseIn delay={8} distance={48}>
        <div
          style={{
            fontFamily: font.display,
            fontWeight: 800,
            fontSize: size("headline"),
            lineHeight: 1.03,
            color: palette.text,
            marginTop: 18,
          }}
        >
          {title}
        </div>
      </RiseIn>
      <FadeIn delay={20} style={{ marginTop: 22 }}>
        <div
          style={{
            height: 8,
            width: 240,
            borderRadius: 8,
            background: `linear-gradient(90deg, ${palette.accent}, ${palette.accentAlt})`,
          }}
        />
      </FadeIn>
    </SafeZone>
  );
};

const StatScene: React.FC<{ stat: NonNullable<StudioProps["stat"]> }> = ({ stat }) => {
  const { palette, font, size } = useStyleConfig();
  return (
    <SafeZone justify="center" align="flex-start">
      <div
        style={{
          fontFamily: font.display,
          fontWeight: 800,
          fontSize: size("stat"),
          lineHeight: 1,
          color: palette.accent,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <Counter to={stat.value} delay={6} />
        <span style={{ color: palette.text, fontSize: size("hero") }}>{stat.suffix}</span>
      </div>
      <RiseIn delay={22}>
        <div
          style={{
            fontFamily: font.body,
            fontWeight: 600,
            fontSize: size("beat"),
            color: palette.text,
            marginTop: 8,
          }}
        >
          {stat.label}
        </div>
      </RiseIn>
    </SafeZone>
  );
};

const OutroScene: React.FC<{ label: string; outro: string }> = ({ label, outro }) => {
  const { palette, font, size } = useStyleConfig();
  return (
    <SafeZone justify="center" align="flex-start">
      <Kicker text={label} />
      <RiseIn delay={6} distance={36}>
        <div
          style={{
            fontFamily: font.display,
            fontWeight: 800,
            fontSize: size("headline"),
            color: palette.text,
            marginTop: 16,
          }}
        >
          {outro}
        </div>
      </RiseIn>
    </SafeZone>
  );
};

const Backdrop: React.FC<{ palette: Palette }> = ({ palette }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(120% 120% at 20% 0%, ${palette.accentAlt}22 0%, ${palette.bg} 55%), ${palette.bg}`,
    }}
  >
    <AbsoluteFill
      style={{
        background: `radial-gradient(60% 60% at 85% 95%, ${palette.accent}1f 0%, transparent 70%)`,
      }}
    />
  </AbsoluteFill>
);

export const StudioVideo: React.FC<StudioProps> = (props) => {
  const { durationInFrames } = useVideoConfig();
  const palette = paletteFromBrand(props.brand);

  // Scene durations sum to (durationInFrames + transitions) so the series fills exactly.
  const transitions = props.stat ? 2 * T : 1 * T;
  const total = durationInFrames + transitions;
  const scenes = props.stat ? 3 : 2;
  const s1 = Math.round(total * (scenes === 3 ? 0.34 : 0.55));
  const sStat = props.stat ? Math.round(total * 0.36) : 0;
  const sLast = total - s1 - sStat;

  return (
    <FontProvider fonts={resolveFontPack(props.fontPack)}>
      <StyleProvider palette={palette}>
        <AbsoluteFill style={{ backgroundColor: palette.bg }}>
          <Backdrop palette={palette} />
          <TransitionSeries>
            <TransitionSeries.Sequence durationInFrames={s1}>
              <TitleScene label={props.label} title={props.title} />
            </TransitionSeries.Sequence>
            {props.stat ? (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: T })}
              />
            ) : null}
            {props.stat ? (
              <TransitionSeries.Sequence durationInFrames={sStat}>
                <StatScene stat={props.stat} />
              </TransitionSeries.Sequence>
            ) : null}
            <TransitionSeries.Transition
              presentation={slide({ direction: "from-right" })}
              timing={linearTiming({ durationInFrames: T })}
            />
            <TransitionSeries.Sequence durationInFrames={sLast}>
              <OutroScene label={props.label} outro={props.outro} />
            </TransitionSeries.Sequence>
          </TransitionSeries>
        </AbsoluteFill>
      </StyleProvider>
    </FontProvider>
  );
};
