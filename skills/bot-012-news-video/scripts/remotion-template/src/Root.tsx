// Registers ONE composition per aspect ratio (16:9 / 9:16 / 1:1), all rendering the
// same <NewsVideo> dispatcher. Duration is derived from props.durationSeconds via
// calculateMetadata. Style + story arrive as props (props.json at render time).
// research/model-evaluation.md §2.

import React from "react";
import { Composition } from "remotion";
import { NewsVideo } from "./NewsVideo";
import { FPS, durationFrames } from "./engine/tokens";
import { DEFAULT_BRAND, type NewsVideoProps } from "./engine/types";

const ASPECTS = [
  { id: "News-16x9", width: 1920, height: 1080 },
  { id: "News-9x16", width: 1080, height: 1920 },
  { id: "News-1x1", width: 1080, height: 1080 },
] as const;

// Placeholder story so the project renders in Studio without props. The render skill
// always overrides via --props=./props.json.
const defaultProps: NewsVideoProps = {
  style: "minimal-editorial",
  seed: 1,
  durationSeconds: 12,
  brand: DEFAULT_BRAND,
  doc: {
    headline: "Acme raises $40M Series B to scale its robotics platform",
    dek: "Round led by Foundry Capital; company now valued at $300M.",
    dateline: { location: "SAN FRANCISCO", date: "2026-06-09", date_display: "June 9, 2026" },
    source: { name: "Acme Press Release", url: null, byline: null },
    body_beats: [
      { text: "Acme raises $40M Series B", role: "lede" },
      { text: "Round led by Foundry Capital", role: "detail" },
      { text: "Company now valued at $300M", role: "detail" },
    ],
    key_phrases: ["$40M", "Series B"],
    primary_stat: { value: "$40M", label: "Series B raised" },
    quote: null,
    category: "funding",
    tone: "neutral",
    recommended_style: "minimal-editorial",
  },
};

export const Root: React.FC = () => (
  <>
    {ASPECTS.map(({ id, width, height }) => (
      <Composition
        key={id}
        id={id}
        component={NewsVideo}
        width={width}
        height={height}
        fps={FPS}
        durationInFrames={durationFrames(defaultProps.durationSeconds)}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: durationFrames(props.durationSeconds ?? 12),
        })}
      />
    ))}
  </>
);
