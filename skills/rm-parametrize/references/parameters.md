# parameters.md — Zod props + calculateMetadata + batch-at-scale (rm-parametrize)

Ported + re-targeted from the official `remotion-best-practices` rules `parameters.md` and
`calculate-metadata.md` (bundled in the starter at
`rm-build/scripts/remotion-template/.agents/skills/remotion-best-practices/rules/`). This is the durable
contract for the **deferred** rm-parametrize capability. **BOT-032 divergences from the official rules are
called out inline** — where they conflict, the SL8 runtime / composition contract wins.

> rm-parametrize is **gated on REQ-005 RAM** and inactive in v1. This doc is what activates with the gate.
> The schema + `calculateMetadata` edits below are authored by **rm-build** (this skill verifies the
> composition is parametrizable, then emits the per-variant props + manifest that **rm-render** iterates).

---

## 1. Make a composition parametrizable — a Zod schema

A composition is parametrized by attaching a **Zod object schema** to its `<Composition>` and reading the
props in the component. The top-level type MUST be `z.object()` (a component's props are always an object).

```tsx title="src/StudioVideo.tsx"
import { z } from "zod";

export const studioSchema = z.object({
  title: z.string(),
  stat: z.number(),
  accent: z.string(),        // hex color — see §2 (NOT zColor)
  durationSeconds: z.number(),
  seed: z.string(),          // pins the deterministic RNG
});

export const StudioVideo: React.FC<z.infer<typeof studioSchema>> = ({ title, stat }) => {
  return <Title text={title} value={stat} />;
};
```

```tsx title="src/Root.tsx"
<Composition
  id="Studio-16x9"
  component={StudioVideo}
  durationInFrames={300}
  fps={30}
  width={1920}
  height={1080}
  schema={studioSchema}
  defaultProps={defaultStudioProps}   // renders with no props.json
  calculateMetadata={calculateStudioMetadata}
/>
```

All Zod types are supported. The user can edit props in the Studio sidebar; `rm-render`/`rm-parametrize`
pass them via `--props`.

### BOT-032 divergences (load-bearing)
- **Colors: plain `z.string()` for hex — NOT `@remotion/zod-types` `zColor()`.** This project pins
  **`zod@4`**; `@remotion/zod-types` peers on a different zod major and ERESOLVEs against the pinned set
  (the PoC gotcha). Validate hex with a `z.string()` (optionally `.regex(/^#([0-9a-fA-F]{6})$/)`), never
  `zColor()`. The official rule's "Color picker" section does not apply here.
- **`zod` is already installed + pinned** by the bundled starter at the runtime's resolved version. Do **not**
  run the official rule's `npm i zod` / `npx remotion add @remotion/zod-types` steps — re-resolving the dep
  breaks the single-version pin (`@remotion/*` skew is the #1 render break).
- **Facts arrive as props, frozen from `02-script.md`.** Schema fields are the seam that makes JTBD-4
  (restyle/resize/re-voice) and batch safe: the numbers/text live in props, never hard-coded in the markup.

---

## 2. calculateMetadata — derive duration / dimensions / props from props

Use `calculateMetadata` on a `<Composition>` to set duration, dimensions, and transform props **before
render**, driven by the props themselves. This is what makes one composition serve a whole dataset.

```tsx
import { CalculateMetadataFunction } from "remotion";

const FPS = 30;

export const calculateStudioMetadata: CalculateMetadataFunction<
  z.infer<typeof studioSchema>
> = async ({ props }) => {
  return {
    durationInFrames: Math.ceil(props.durationSeconds * FPS),
  };
};
```

Return value (all fields optional; each overrides the `<Composition>` prop):

- `durationInFrames` — number of frames (drive it from `props.durationSeconds * fps`, or from a measured
  asset, so each variant is exactly as long as its data needs).
- `width` / `height` — composition pixels. **BOT-032: do not flip aspect ratio here.** A different aspect
  ratio is a **separate `<Composition>`** (`Studio-9x16`, `Studio-1x1`), authored by `rm-build` — never a
  per-variant width/height swap or a render flag.
- `fps` — frames per second (the studio standardizes on **30**; leave it).
- `props` — transformed props passed to the component (see §3).
- `defaultOutName` — default output filename (`video-${props.id}`; `.mp4` is appended). Useful so each
  variant lands at a stable name; rm-parametrize sets `outName` per manifest entry explicitly.
- `defaultCodec` — leave unset; `rm-render` standardizes on `h264`.

### Duration from a measured asset
For narrated/clip variants, derive duration from the audio/video using the bundled
`get-audio-duration.md` / `get-video-duration.md` rules:

```tsx
import { getAudioDuration } from "./get-audio-duration";

const calc: CalculateMetadataFunction<Props> = async ({ props }) => {
  const seconds = await getAudioDuration(props.voiceoverSrc);
  return { durationInFrames: Math.ceil(seconds * 30) };
};
```

### Transforming / fetching props (the abortSignal)
`calculateMetadata` may fetch or reshape data before render. Pass the `abortSignal` to any fetch so stale
requests cancel when props change:

```tsx
const calc: CalculateMetadataFunction<Props> = async ({ props, abortSignal }) => {
  const res = await fetch(props.dataUrl, { signal: abortSignal });
  const data = await res.json();
  return { props: { ...props, fetchedData: data } };
};
```

**BOT-032 note:** in-sandbox renders are **keyless and offline-first** — prefer passing data **inline in
each variant's props.json** (rm-parametrize already materializes it) over a network fetch at render time.
Reserve `fetch` for the few cases data genuinely can't be pre-materialized, and always wire `abortSignal`.

### Determinism
`calculateMetadata` runs in the contract: **no `Math.random` / `Date.now`** to compute duration or props.
Drive everything from the (seeded) props. Each variant carries its own `seed` so its RNG is reproducible.

---

## 3. Batch-at-scale — one composition, N variants

The data-driven composition above becomes a batch when you feed it a **dataset with one record per
variant** (the GitHub-Unwrapped / Spotify-Wrapped pattern). rm-parametrize (when active) does the fan-out
*shaping*; `rm-render` does the rendering.

1. **Map each record onto the schema.** For dataset row `r`, build the props object the composition
   expects: `{ title: r.name, stat: r.minutes, accent: r.color, durationSeconds: ..., seed: r.id }`.
   Coerce types to the schema (numbers as numbers, hex as string).
2. **Validate before emit.** `studioSchema.safeParse(props)` each record. On failure, append
   `{ record, error }` to `batch/rejects.json` and skip it — **never render a variant whose props don't
   satisfy the schema**.
3. **Write per-variant props + the manifest.**
   - `batch/variant-0001.props.json` … one file per accepted record.
   - `batch/manifest.json`: an array of
     `{ "compositionId": "Studio-16x9", "props": "batch/variant-0001.props.json", "outName": "wrapped-<id>" }`.
4. **Hand the manifest to `rm-render`.** It iterates entries, calling
   `remotion render <compositionId> --props=<props> --output=exports/<outName>-<ar>.mp4` with the pinned
   Chrome Shell, `--concurrency=1`, ffprobe-verify per file. rm-parametrize **never** invokes the renderer.

### Why this is RAM-gated (REQ-005)
Each render already peaks near the ~1.9 GB single-render ceiling; a fan-out amplifies peak memory and
wall-clock and OOMs (`Exit-137`) on the v1 instance. Activation needs the REQ-005 RAM tier — render variants
**serially** (`--concurrency=1`, one composition at a time), and gate on the free-RAM probe in
`scripts/check.sh`. Until then, rm-parametrize stays deferred and variants are produced one at a time through
the normal `rm-build → rm-validate → rm-render` chain.

---

## 4. Manifest schema (when active)

```jsonc
// artifacts/<project>/remotion-project/batch/manifest.json
[
  {
    "compositionId": "Studio-16x9",            // a registered <Composition> id (per AR)
    "props": "batch/variant-0001.props.json",  // relative to remotion-project/
    "outName": "wrapped-u123"                  // exports/wrapped-u123-16x9.mp4
  }
]
```

Each `variant-NNNN.props.json` is a flat object that `studioSchema.parse()` accepts. `outName` is unique per
variant (collisions overwrite exports). Keep aspect ratio in the `compositionId`, never in the props.
