// AR-aware content margins. Wrap every scene's content so text never collides with
// platform UI (Reels caption rail, IG feed crop, YouTube scrubber).
// research/domain-analysis.md §6 (safe zones per aspect ratio).

import React from "react";
import { AbsoluteFill } from "remotion";
import { useStyleConfig } from "./StyleConfig";

export const SafeZone: React.FC<{
  children: React.ReactNode;
  justify?: React.CSSProperties["justifyContent"];
  align?: React.CSSProperties["alignItems"];
}> = ({ children, justify = "center", align = "stretch" }) => {
  const { orientation } = useStyleConfig();
  const m =
    orientation === "portrait"
      ? { top: 220, bottom: 280, left: 64, right: 64 } // room for caption + buttons
      : orientation === "square"
        ? { top: 96, bottom: 120, left: 80, right: 80 }
        : { top: 90, bottom: 110, left: 120, right: 120 }; // landscape
  return (
    <AbsoluteFill
      style={{
        paddingTop: m.top,
        paddingBottom: m.bottom,
        paddingLeft: m.left,
        paddingRight: m.right,
        display: "flex",
        flexDirection: "column",
        justifyContent: justify,
        alignItems: align,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
