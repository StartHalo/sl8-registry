// <Stage> — the deep cinematic backdrop for the Perspective-3D style. Sits BEHIND the
// <TransitionSeries> so every scene drifts over one continuous, slowly-evolving stage:
//   • a deep brand-tinted vertical gradient (dark "fog" at the top → near floor at the bottom)
//   • a soft accent "horizon" glow sitting LOW in frame (the floor catching light)
//   • a faint focus vignette
//   • a very subtle, deterministic, frame-driven film grain (seeded; no randomness)
//
// Fully frame-driven + deterministic. The horizon glow breathes almost imperceptibly across
// the clip via a single interpolate on the global frame; grain phase advances per frame but
// is a pure function of (seed, frame) so the render is byte-reproducible.

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useStyleConfig } from "../../engine/StyleConfig";

const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    .toString(16)
    .padStart(2, "0");
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${a}` : hex;
};

export const Stage: React.FC<{
  top: string;
  bottom: string;
  accent: string;
  accentAlt: string;
  seed: number;
}> = ({ top, bottom, accent, accentAlt, seed }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { orientation } = useStyleConfig();

  const at = (a: number, b: number): number =>
    interpolate(frame, [0, Math.max(1, durationInFrames)], [a, b], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // The horizon glow sits lower in portrait (more floor below the tilted plane) and a touch
  // higher / wider in landscape. It breathes very slightly over the clip.
  const horizonY = orientation === "portrait" ? 82 : orientation === "landscape" ? 74 : 78;
  const glowW = orientation === "landscape" ? 150 : 120;
  const glowO = at(0.26, 0.34); // gentle breathe
  const horizonSoft = withAlpha(accent, glowO);
  const auroraSoft = withAlpha(accentAlt, 0.14);
  const auroraX = at(38, 62); // very slow lateral drift of a faint upper accent haze

  // Grain phase advances each frame so it shimmers like real film, but is a pure function
  // of (seed, frame) — deterministic. baseFrequency stays fixed; we just re-seed per frame.
  const grainSeed = (seed * 2654435761 + frame * 40503) % 65536;

  return (
    <AbsoluteFill>
      {/* deep cinematic vertical gradient — dark fog at top, near floor at bottom */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)` }} />

      {/* faint upper accent haze (the receding distance catching a little color) */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 45% at ${auroraX}% 24%, ${auroraSoft} 0%, rgba(0,0,0,0) 70%)`,
          filter: "blur(50px)",
        }}
      />

      {/* low accent HORIZON glow — the floor catching light where the plane meets distance */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(${glowW}% 60% at 50% ${horizonY}%, ${horizonSoft} 0%, rgba(0,0,0,0) 60%)`,
          filter: "blur(28px)",
        }}
      />

      {/* a crisp thin horizon line of accent light, low in frame */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 2% at 50% ${horizonY - 2}%, ${withAlpha(accent, 0.5)} 0%, rgba(0,0,0,0) 70%)`,
          opacity: 0.5,
        }}
      />

      {/* focus vignette */}
      <AbsoluteFill
        style={{ background: "radial-gradient(130% 115% at 50% 46%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.62) 100%)" }}
      />

      {/* very subtle, frame-driven, deterministic film grain */}
      <AbsoluteFill style={{ opacity: 0.045, mixBlendMode: "overlay", pointerEvents: "none" }}>
        <svg width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <filter id={`p3d-grain-${seed}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="2"
                seed={grainSeed}
                stitchTiles="stitch"
              />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter={`url(#p3d-grain-${seed})`} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
