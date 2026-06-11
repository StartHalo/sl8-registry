// <SceneSeries> — the shared @remotion/transitions wrapper. A style hands it the scene
// list + per-scene durations from planScenes() plus a `renderScene` function, and gets a
// fully wired <TransitionSeries> with tasteful per-scene presentations. This is the second
// half of "every style transitions through the message": sequence.ts decides WHAT/HOW LONG,
// SceneSeries decides the cross-scene motion.
//
// Presentations come from @remotion/transitions (already a dep). A style may pass its own
// `presentationFor` to fully control the motion language (e.g. clockWipe for a tech look).

import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import type { TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { Scene } from "./sequence";

export type Presentation = TransitionPresentation<Record<string, unknown>>;

// Default motion language: wipe INTO the hero stat (feels like a reveal), fade into a
// quote or the end credit (calm), otherwise alternate slide-up / fade so consecutive
// beats don't all move the same way.
export const defaultPresentationFor = (next: Scene, i: number): Presentation =>
  (next.kind === "stat"
    ? wipe({ direction: "from-left" })
    : next.kind === "credit" || next.kind === "quote"
      ? fade()
      : i % 2 === 0
        ? slide({ direction: "from-bottom" })
        : fade()) as Presentation;

export const SceneSeries: React.FC<{
  scenes: Scene[];
  durs: number[];
  trans: number;
  renderScene: (s: Scene, i: number) => React.ReactNode;
  presentationFor?: (next: Scene, i: number) => Presentation;
}> = ({ scenes, durs, trans, renderScene, presentationFor = defaultPresentationFor }) => {
  const seq: React.ReactNode[] = [];
  scenes.forEach((s, i) => {
    seq.push(
      <TransitionSeries.Sequence key={`s-${i}`} durationInFrames={durs[i]}>
        {renderScene(s, i)}
      </TransitionSeries.Sequence>,
    );
    if (i < scenes.length - 1 && trans > 0) {
      seq.push(
        <TransitionSeries.Transition
          key={`t-${i}`}
          presentation={presentationFor(scenes[i + 1], i)}
          timing={linearTiming({ durationInFrames: trans })}
        />,
      );
    }
  });
  return <TransitionSeries>{seq}</TransitionSeries>;
};

// Re-export the raw presentations so styles can compose their own presentationFor without
// importing @remotion/transitions paths directly.
export { fade, slide, wipe };
