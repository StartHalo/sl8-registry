# @remotion/player — the live scrubbable preview contract

> Reference for `scripts/build-preview.mjs`. The official `remotion-best-practices` rule set has **no**
> dedicated player rule (the Player is a runtime React component, not a render command) — this doc is the
> durable contract for how rm-preview embeds it. Keyless and local: no model, no cloud, no auth.

## What the Player is (and isn't)

`@remotion/player` exports a React `<Player>` that renders a composition **live in a browser** — scrub,
play, loop, fullscreen — with **no render and no MP4**. It is the in-browser twin of `remotion render`:
same React component, same frame math (`useCurrentFrame`/`interpolate`/`spring`), but driven by the page's
clock instead of a headless Chrome render loop. That makes it the perfect **pre-render preview**: the user
sees the real motion before we spend the (CPU-bound, OOM-prone) render pass.

This is the "studio, not a black box" differentiator: BOT-015 / HyperFrames ship a single rendered MP4;
rm-preview ships a scrubbable composition the user can interrogate frame-by-frame first.

## The props the Player needs

`<Player>` does **not** read `Root.tsx`'s `<Composition>` registrations — you pass the component + metadata
directly. rm-preview's bundled entry mounts:

```tsx
import { Player } from "@remotion/player";
import { StudioVideo } from "./src/StudioVideo";

<Player
  component={StudioVideo}              // the project's main composition (stable contract export)
  inputProps={props}                   // props.json — the Zod-valid facts/palette/seed
  durationInFrames={Math.round(durationSeconds * 30)}
  fps={30}
  compositionWidth={width}             // from the AR: 1920 / 1080 / 1080
  compositionHeight={height}           // from the AR: 1080 / 1920 / 1080
  controls loop                        // scrub bar + transport
  acknowledgeRemotionLicense           // SL8 is on the free tier — see Licensing
  style={{ width: "100%", height: "100%" }}
/>;
```

- **`component` + `inputProps`** mirror a `<Composition>`'s `component` + `defaultProps`. The contract keeps
  `src/StudioVideo.tsx` exporting `StudioVideo` and `src/schema.ts` exporting `studioSchema` /
  `defaultStudioProps`, so the Player can import the same component the render uses. JTBD-5 may re-author the
  body of `StudioVideo`, but the **export name stays** — so rm-preview never needs editing per project.
- **`durationInFrames`/`fps`/`width`/`height`** must match what `Root.tsx` would compute: `fps = 30`,
  `durationInFrames = round(props.durationSeconds × 30)` (the same `calculateMetadata` formula), and the AR
  dims (a different orientation is a different `<Composition>`, never a flag — so rm-preview takes the AR as
  an argument and maps it to dims).

## Why bundle with the project's own esbuild (and inline)

A self-contained `preview.html` needs the composition + React + Remotion + the Player compiled to browser
JS in **one file**. rm-preview writes a tiny entry (`__rm-preview-entry.tsx`) and bundles it with the
**project's own** `node_modules/.bin/esbuild` (a transitive dep of `@remotion/cli` → `@remotion/bundler`, so
it is present after `rm-build`'s `npm ci`):

```
esbuild __rm-preview-entry.tsx --bundle --format=iife --platform=browser \
  --target=es2020 --jsx=automatic --minify --define:process.env.NODE_ENV="production"
```

- **Why esbuild directly, not `@remotion/bundler`'s `bundle()`** — `bundle()` produces a Remotion *render/
  studio* bundle (an entry that calls `registerRoot`), not a `<Player>` web page. We want a plain browser
  app that mounts the Player, so a direct esbuild pass of our own entry is the right tool.
- **`--format=iife --platform=browser`** → a single self-executing script, no module loader, no CDN. The
  output is read from stdout and inlined into `preview.html` via a **function replacer** (`String.replace(…,
  () => bundle)`) so any `$&`/`$1`/`${…}` inside the minified bundle is kept literal (a plain string
  replacement would corrupt it).
- **Inlining = self-contained**: the page has zero external `<script src>`. It opens from disk, in an E2B
  sandbox, or anywhere, with no network and no build step.

If anything in that chain is missing or fails (no esbuild, an esbuild error, a Remotion internal that doesn't
bundle cleanly under a bare esbuild pass), rm-preview does **not** error — it falls back to the contact sheet.

## staticFile() resolution in the Player

Remotion resolves `staticFile("x.png")` against the global **`window.remotion_staticBase`** (default `/`).
rm-preview sets `window.remotion_staticBase = "./preview-assets"` and copies `remotion-project/public/` →
`preview-assets/` beside `preview.html`, so image cutouts/captures resolve relative to the page.

Caveat: **video/audio** loaded via `<OffthreadVideo>`/`<Audio>` + `staticFile()` may not play when the page
is opened over a bare `file://` URL (browsers block some media fetches there); serve the folder
(`python3 -m http.server`) to play them. This is fine: the preview's job is to confirm **motion +
composition + brand**; heavy-media fidelity (codec/dims/fps/duration + the audio stream) is confirmed by
**`rm-render` + ffprobe** on the real MP4, which is the canonical deliverable.

## Version pin (the #1 player break)

`@remotion/player` **must** be the exact same version as the project's `remotion` (pinned to the
`sl8-animation` runtime — currently **4.0.473**). Version skew across `@remotion/*` breaks the Player the
same way it breaks render. The starter's `package.json` pins them together; if the Player renders blank or
throws a version error, re-pin in `rm-build` (or let `render.sh` re-pin to `npm view remotion version`) and
re-run rm-preview.

## Licensing

`@remotion/player` (like the Player generally) asks you to acknowledge the Remotion license; rm-preview
passes `acknowledgeRemotionLicense` to suppress the dev warning. Per Design, SL8 is a one-person company →
Remotion's free tier (≤3 employees = free, unlimited) applies, so no paid license is required. Re-check only
if headcount grows.

## The contact-sheet fallback

When the live bundle can't be produced, rm-preview builds a contact sheet from the key frames already on
disk — `snapshots/` (rm-validate's stills) first, then `exports/frames/` (rm-render's vision frames). Each
PNG/JPG is inlined as a base64 data URI behind a `<input type="range">` scrub (+ ←/→ keys), sorted by
filename (which encodes the timestamp, e.g. `…-at-02s.png`). It is a poorer preview than the live player —
discrete frames, no real playback — but it is **self-contained, scrubbable, and honest**, and it always
works as long as `rm-validate`/`rm-render` produced frames. Force it with `--fallback`.

## Quick reference

| Concern | rm-preview answer |
|---|---|
| Live frame-accurate scrub | `<Player>` bundled + inlined (mode `player`) |
| No esbuild / bundle fails | contact-sheet from `snapshots/`/`exports/frames/` (mode `contact-sheet`) |
| Composition export it imports | `StudioVideo` from `src/StudioVideo.tsx` (stable contract) |
| Dims source | AR arg → 1920×1080 / 1080×1920 / 1080×1080 (not a render flag) |
| Duration source | `round(props.durationSeconds × 30)`, fps 30 |
| Asset resolution | `window.remotion_staticBase="./preview-assets"` + copied `public/` |
| Version requirement | `@remotion/player` == project `remotion` (4.0.473) |
| Self-contained? | yes — no CDN `<script src>`, bundle/frames inlined, no network |
| Render? | no — preview only; the MP4 comes from `rm-render` |
