---
name: rm-preview
description: "Emit a self-contained, scrubbable artifacts/[project]/preview.html that embeds @remotion/player (the project's StudioVideo + props.json) so the user can SCRUB and play the composition in a browser BEFORE committing to a full MP4 render — the \"studio, not a black box\" deliverable HyperFrames can't match. Bundles the player (React + Remotion + the composition) with the project's OWN esbuild and inlines it (keyless, no CDN, no network); if that bundle can't be produced it falls back to a contact-sheet preview built from rm-validate's snapshots/ (or rm-render's exports/frames/), still self-contained and still scrubbable. Use during the PREVIEW phase (phase 7b), after rm-build (and ideally rm-validate). Does NOT render an MP4 (that is rm-render) and does NOT author or fix the composition (that is rm-build)."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: []
  inputs:
    - name: remotion-project
      type: x-dir
      required: true
      description: "artifacts/[project]/remotion-project/ — the built Remotion app (src/StudioVideo.tsx + src/schema.ts + node_modules with @remotion/player and esbuild). Should have passed rm-build; ideally rm-validate too."
    - name: props
      type: json
      required: true
      description: "artifacts/[project]/remotion-project/props.json — the inputProps fed to [Player] (facts + palette + durationSeconds + seed). rm-build always writes it."
    - name: aspect-ratio
      type: text
      required: false
      description: "16:9 | 9:16 | 1:1 — sets the Player's compositionWidth/Height (1920x1080 / 1080x1920 / 1080x1080). Default 16:9; match the composition's primary AR."
    - name: snapshots
      type: x-dir
      required: false
      description: "artifacts/[project]/snapshots/ — rm-validate's key-frame stills, used to build the contact-sheet fallback when a live player bundle can't be produced (exports/frames/* are used too if present)."
  outputs:
    - name: preview
      type: html
      path: artifacts/[project]/preview.html
      description: "A self-contained scrubbable preview — the @remotion/player bundle inlined (live, frame-accurate) OR, on fallback, a contact-sheet of inlined frames with a scrub slider. Opens with no build step and no network."
    - name: preview-assets
      type: x-dir
      path: artifacts/[project]/preview-assets/
      description: "A copy of remotion-project/public/ placed beside preview.html (player mode only) so staticFile() assets resolve when the page is served. Optional — absent when the project has no public assets or on the contact-sheet fallback."
---

# rm-preview — a live, scrubbable @remotion/player preview before the render

## Purpose
Produce `artifacts/<project>/preview.html`: a **self-contained, scrubbable** preview of the built
composition that opens in any browser with **no build step, no server, no network, and no key**. The live
mode embeds **`@remotion/player`** with the project's own `StudioVideo` + `props.json`, bundled by the
project's **own esbuild** and inlined into the HTML — so the user can scrub the timeline, play, and judge
motion/composition **before** paying for a full MP4 render. This is the studio-not-a-black-box deliverable
the HyperFrames pipeline (single-shot render) structurally cannot match.

If a live player bundle can't be produced (no esbuild, a bundle error, or `--fallback`), rm-preview emits a
**contact-sheet** preview instead — the `rm-validate` snapshots (or `rm-render` frames) inlined as base64
behind a scrub slider. Still one file, still scrubbable, still self-contained.

`$SKILL` below = this skill's directory. The Player contract + the bundle/fallback rationale + gotchas
live in `references/player.md`.

## When to run
- **Preview** (phase 7b): after `rm-build` wrote `remotion-project/` + `props.json` and ideally after
  `rm-validate` passed (so `snapshots/` exist for the fallback). Runs on **every JTBD path** that reaches a
  composition — it is the convergent last phase alongside `rm-render`.
- **Before render, or beside it**: preview is cheap and keyless; offer it to confirm the composition reads
  right before (or in parallel with) the heavier `rm-render` pass. On a **restyle/refine** turn (JTBD-4/5),
  re-run rm-preview to show the new look without re-rendering an MP4.
- Do NOT use to render an MP4 (that is `rm-render`) or to author/fix the composition (that is `rm-build`).

## Inputs (read before write)
- `artifacts/<project>/remotion-project/` (required) — the built app. The live path needs
  `src/StudioVideo.tsx`, `src/schema.ts`, and `node_modules` containing `@remotion/player` **and** `esbuild`
  (both present after `rm-build`'s `init.sh` → `npm ci`).
- `artifacts/<project>/remotion-project/props.json` (required for live) — the `inputProps`. Read it to
  confirm it exists; `durationSeconds` drives `durationInFrames` (= `round(durationSeconds × 30)`).
- `aspect-ratio` (optional) — resolve from the request, else `01-concept.md`/`context.md`, else `16:9`.
  Sets `compositionWidth`/`compositionHeight`; it does **not** re-author the composition.
- `artifacts/<project>/snapshots/` (optional) — used only by the contact-sheet fallback.
- **Missing `remotion-project/` or `props.json`** → don't fabricate; record the gap in `state.md` and run
  `rm-build` first. If only the live bundle is impossible but `snapshots/` exist, the fallback still emits a
  useful preview.

## Procedure

### 1. Build the preview (one command)
```bash
node "$SKILL/scripts/build-preview.mjs" \
  "artifacts/<project>" \
  "artifacts/<project>/preview.html" \
  "16:9" "<name>"
#   ^project-root        ^out html                 ^AR   ^title
```
`build-preview.mjs`:
1. Reads `remotion-project/props.json` (the `inputProps`); derives `durationInFrames` from
   `durationSeconds × 30` and `compositionWidth/Height` from the AR (16:9→1920×1080, 9:16→1080×1920,
   1:1→1080×1080).
2. **Live path** — writes a tiny `__rm-preview-entry.tsx` that mounts `<Player component={StudioVideo} …>`,
   bundles it with the project's `node_modules/.bin/esbuild` (`--bundle --format=iife --platform=browser
   --minify`, React + Remotion + the composition all included), and **inlines** the bundle into
   `preview.html`. Injects `window.__PREVIEW_PROPS__` (props.json) + `window.__PREVIEW_META__` (dims/fps/
   duration) and `window.remotion_staticBase = "./preview-assets"`, then copies `remotion-project/public/`
   → `preview-assets/` so `staticFile()` assets resolve. Cleans up the entry file.
3. **Fallback path** — if esbuild is missing, the bundle fails, or `--fallback` is passed: gathers the PNG/
   JPG frames from `snapshots/` then `exports/frames/`, inlines them as base64 behind a `<input type=range>`
   scrub (+ ←/→ keys), and writes that as `preview.html`.
4. Prints a one-line JSON receipt: `{"ok":true,"mode":"player|contact-sheet","out":…,"ar":…,"width":…,"height":…}`.
   Exit 0 unless there was nothing to preview (no bundle **and** no frames) → exit 1.

Force the contact sheet (e.g. to show validate frames without bundling) with `--fallback` as the last arg.

### 2. Confirm the deliverable
- Read the JSON receipt. `mode: "player"` = the live, frame-accurate preview shipped; `mode: "contact-sheet"`
  = the fallback shipped (note it in the summary). `ok:false` / exit 1 = nothing to preview → run rm-build /
  rm-validate first.
- Sanity-check it is **self-contained**: `preview.html` exists and non-empty; it contains **no** `<script src=…>`
  to a CDN; the player JS (or the base64 frames) is inlined. Confirm the stage `aspect-ratio` matches the AR.

### 3. Report
State the resolved AR + dims, the duration, the mode (live player vs contact-sheet), and the path
`artifacts/<project>/preview.html`. Make clear this is a **preview**, not the deliverable: the canonical,
ffprobe-verified pixels come from `rm-render`'s MP4. Record any fallback in `06-summary.md` and the dashboard.

## Outputs
- `artifacts/<project>/preview.html` — the self-contained scrubbable preview (live `@remotion/player` bundle,
  or the contact-sheet fallback).
- `artifacts/<project>/preview-assets/` — a copy of `remotion-project/public/` (player mode only) so
  `staticFile()` assets resolve when the page is served. Optional.

## Failure / fallback
- **No esbuild / bundle error** → automatic contact-sheet fallback from `snapshots/` (or `exports/frames/`).
  No manual step; the receipt's `mode` tells you which path ran. To force it: append `--fallback`.
- **`props.json` missing** → the live bundle is skipped (it is the Player's `inputProps`); the script tries
  the contact sheet. Real fix: run `rm-build` so `props.json` exists.
- **No bundle and no frames** → a stub `preview.html` explaining what to run, and **exit 1**. Run `rm-build`
  (+ `rm-validate` to seed `snapshots/`), then re-run.
- **Heavy `staticFile()` media doesn't show** in the live preview opened over `file://` → it needs the
  served `preview-assets/` dir (serve the folder, or rely on the contact-sheet frames). The preview's job is
  motion + composition; media fidelity is confirmed by `rm-render` + ffprobe. (See `references/player.md`.)
- **Player blank / version error** → `@remotion/player` must be the **same** version as the project's
  `remotion` (pinned 4.0.473); version skew breaks the Player exactly like it breaks render. Re-pin in
  `rm-build` and re-run.

## Quality criteria
- [ ] `artifacts/<project>/preview.html` is written, non-empty, and **self-contained** (no CDN `<script src>`;
      the player bundle or the frames are inlined) — opens with no build step and no network.
- [ ] Live mode embeds `@remotion/player` with the project's `StudioVideo` + `props.json`; the stage AR/dims
      match the requested aspect ratio; `preview-assets/` is copied when `public/` has assets.
- [ ] Fallback mode produces a scrubbable contact sheet from `snapshots/`/`exports/frames/` when no live
      bundle is possible — never a broken/empty page when frames exist.
- [ ] Keyless and local — no model, no cloud, no auth; the bundle uses the project's own esbuild.
- [ ] Produces **no** MP4 and does **not** modify `remotion-project/src` — preview only.
