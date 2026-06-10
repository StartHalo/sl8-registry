// Subtle 3D perspective zoom + rotate over the whole clip. One perspective layer +
// one transformed full-frame layer, both frame-driven (no CSS transition/animation).
// ~15deg/axis total in landscape; the recipe dials rotateY down in the narrow portrait
// frame where perspective skew is exaggerated.
//
// Both layers are full-frame AbsoluteFills so the transformed layer keeps the frame's
// dimensions — children (the centered SafeZone + card) then size against the real frame.
// (A shrink-to-fit transformed box collapses to 0 around an absolutely-positioned child,
// which would clamp the card's maxWidth:100% to 0 and force one-word-per-line wrapping.)

import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useOrientation } from "../../engine/StyleConfig";

export const Article3D: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const orientation = useOrientation();
  const end = Math.max(1, durationInFrames - 1); // animate across the whole clip

  const ease = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.55, 1),
  } as const;

  // Narrow portrait frames exaggerate Y-skew; square is in between.
  const yMag = orientation === "portrait" ? 4.5 : orientation === "square" ? 6 : 7.5;
  const xMag = orientation === "portrait" ? 4 : 6;
  const pushTo = orientation === "square" ? 1.045 : 1.06;

  const rotY = interpolate(frame, [0, end], [-yMag, yMag], ease);
  const rotX = interpolate(frame, [0, end], [xMag, -xMag], ease);
  const scale = interpolate(frame, [0, end], [1.0, pushTo], ease);

  return (
    <AbsoluteFill style={{ perspective: 2400 }}>
      <AbsoluteFill
        style={{
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
