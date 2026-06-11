// <TiltedPlane> — the signature of the Perspective-3D style. A CSS `perspective` container
// holds a panel rotated on the X axis (a tilted "floor"), whose contents drift slowly from
// below toward / over center across the LOCAL scene frame, like a gentle title-crawl. The top
// of the plane dissolves into a "horizon" fog gradient as it recedes.
//
// All motion is frame-driven (useCurrentFrame) and clamped. The plane itself is pure layout
// + transform; callers pass already-animated children (e.g. <PerspectiveLines>). AR controls
// tilt depth and drift distance: portrait → steeper tilt + more vertical drift; landscape →
// shallower tilt + wider plane.

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useStyleConfig } from "../../engine/StyleConfig";

export interface PlaneGeometry {
  tiltDeg: number; // rotateX applied to the panel
  driftFrom: number; // panel translateY at scene start (px, below center)
  driftTo: number; // panel translateY at scene end (px, drifted up / receding)
  perspective: number; // perspective depth on the container
  contentWidth: number; // px width budget for text inside the plane (pre-foreshorten)
  fogStart: number; // 0..1 — where the top horizon fog begins eating the plane
}

// AR-aware geometry. shortEdge = 1080 for all three ARs, so px scale off it.
export function planeGeometry(orientation: string, shortEdge: number): PlaneGeometry {
  if (orientation === "portrait") {
    return {
      tiltDeg: 26,
      driftFrom: shortEdge * 0.5,
      driftTo: -shortEdge * 0.16,
      perspective: shortEdge * 1.05,
      contentWidth: shortEdge * 0.86,
      fogStart: 0.16,
    };
  }
  if (orientation === "landscape") {
    return {
      tiltDeg: 17,
      driftFrom: shortEdge * 0.34,
      driftTo: -shortEdge * 0.1,
      perspective: shortEdge * 1.25,
      contentWidth: shortEdge * 1.18,
      fogStart: 0.2,
    };
  }
  // square
  return {
    tiltDeg: 22,
    driftFrom: shortEdge * 0.42,
    driftTo: -shortEdge * 0.13,
    perspective: shortEdge * 1.12,
    contentWidth: shortEdge * 0.92,
    fogStart: 0.18,
  };
}

export const TiltedPlane: React.FC<{
  children: React.ReactNode;
  // The cinematic backdrop top color — used to paint the horizon fog so the receding plane
  // dissolves into the same color the distance is rendered in.
  fogColor: string;
  // Optional override of where vertical drift starts so a scene can settle rather than crawl
  // forever (e.g. the stat scene parks the number near center).
  settle?: boolean;
}> = ({ children, fogColor, settle = false }) => {
  const { orientation, shortEdge } = useStyleConfig();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const g = planeGeometry(orientation, shortEdge);

  // Drift the panel upward across the whole local scene. A "settle" scene eases to a parked
  // position a little above center and holds, rather than crawling off the top.
  const driftTo = settle ? -shortEdge * 0.04 : g.driftTo;
  const driftY = interpolate(frame, [0, durationInFrames], [g.driftFrom, driftTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* perspective container — children live on a tilted plane */}
      <AbsoluteFill
        style={{
          perspective: g.perspective,
          perspectiveOrigin: "50% 38%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: g.contentWidth,
            transformStyle: "preserve-3d",
            transform: `rotateX(${g.tiltDeg}deg) translateY(${driftY}px)`,
            transformOrigin: "center center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </div>
      </AbsoluteFill>

      {/* horizon fog — the top of frame dissolves into the backdrop color, so the receding
          plane fades into distance instead of clipping a hard edge. Pure overlay, no motion. */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${fogColor} 0%, ${fogColor} ${Math.round(
            g.fogStart * 100,
          )}%, rgba(0,0,0,0) ${Math.round((g.fogStart + 0.28) * 100)}%)`,
        }}
      />
    </AbsoluteFill>
  );
};
