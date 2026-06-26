import { z } from "zod";

// The default/example composition props. The generative author (rm-build) edits this
// schema + StudioVideo.tsx per project, OR replaces them with a freshly-authored
// composition (JTBD-5). Keep the top-level a z.object (Remotion requires it) and keep
// every field JSON-serializable so props.json round-trips.

export const fontPack = z.enum(["modern", "editorial", "bold", "tech"]);

export const studioSchema = z.object({
  // Brand kit — drives the palette.
  brand: z.object({
    bg: z.string(),
    accent: z.string(),
    accentAlt: z.string(),
  }),
  fontPack,
  // Content (the example StudioVideo draws a title -> optional stat -> outro card).
  label: z.string(),
  title: z.string(),
  stat: z
    .object({ value: z.number(), suffix: z.string(), label: z.string() })
    .nullable(),
  outro: z.string(),
  // Duration is data-driven (calculateMetadata derives durationInFrames from this).
  durationSeconds: z.number(),
  // Determinism: every render pins the same seed unless explicitly varied.
  seed: z.number(),
});

export type StudioProps = z.infer<typeof studioSchema>;

export const defaultStudioProps: StudioProps = {
  brand: { bg: "#06141b", accent: "#22d3ee", accentAlt: "#3b82f6" },
  fontPack: "bold",
  label: "ACME CLOUD",
  title: "Introducing the Pulse API",
  stat: { value: 47, suffix: "%", label: "faster p99 latency" },
  outro: "Ship realtime. Today.",
  durationSeconds: 12,
  seed: 1,
};
