---
name: rm-render
description: "Render a validated Remotion composition to one or more aspect ratios as deterministic, keyless, local MP4s, then verify them. Runs the GLOBAL remotion binary with the pinned Chrome Headless Shell (self-healing on host/dev), pins every @remotion/* to ONE version, renders --concurrency=1 --codec=h264 --gl=angle --image-format=jpeg; ffprobe-verifies codec/dimensions/fps/duration (+ audio when a VO track exists); and extracts key frames for a vision grade. Use during the RENDER phase (phase 7), after rm-validate passes, or to RE-RENDER / RESIZE an existing project. 100% local and keyless — no AI model in the render path, no cloud, no auth. NOT for authoring or fixing the composition (that is rm-build) and NOT for linting/stills (that is rm-validate)."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [rm-build, rm-validate, rm-voiceover]
  inputs:
    - name: remotion-project
      type: code
      required: true
      description: "artifacts/[project]/remotion-project/ — the validated per-project Remotion app (src/index.ts + Root.tsx + props.json). Must have passed rm-validate (version-skew clean, tsc 0 errors, stills render)."
    - name: aspect-ratios
      type: text
      required: false
      description: "Any of 16:9, 9:16, 1:1 (and -4k variants), space or comma separated. Default 16:9. Each AR is a SEPARATE [Composition] (Studio-[ar]) — a non-registered orientation routes back to rm-build, never a render flag."
    - name: name
      type: text
      required: false
      description: "Output file stem (exports/[name]-[ar].mp4). Default = props.json .name, else the [project] slug."
    - name: quality
      type: text
      required: false
      description: "draft | standard | high (h264 CRF 28 | 18 | 14). Default draft (fast preview); use standard for finals."
    - name: verify-at
      type: text
      required: false
      description: "Comma-separated seconds at which to extract vision-grade frames. Default 1s / mid / end-1 derived from props.json durationSeconds."
  outputs:
    - name: videos
      type: video
      path: artifacts/<project>/exports/<name>-<ar>.mp4
      description: "One ffprobe-verified H.264 MP4 per requested aspect ratio at the correct dimensions/fps/duration."
    - name: frames
      type: png
      path: artifacts/<project>/exports/frames/<name>-<ar>-at-<t>s.png
      description: "Key frames extracted from each rendered MP4 for the vision (media-judge) grade."
---

# rm-render — deterministic, keyless, local MP4 render + verify

## Purpose
Turn a validated `remotion-project/` into the finished MP4(s). Renders locally with the GLOBAL `remotion`
binary + the pinned Chrome Headless Shell + FFmpeg — **no AI model, no cloud, no auth, no credits** — then
ffprobe-verifies the output is a real H.264 video at the right dimensions and extracts frames so you can
grade the pixels. Separate from `rm-build` so a resize / re-voice / re-render never re-authors the
composition, and separate from `rm-validate` so the gate runs first.

`$SKILL` = this skill's directory. Full mechanics + gotchas: `references/render-runtime.md`.

## When to run
- **Render** (phase 7): after `rm-validate` reports PASS (version-skew clean, `tsc --noEmit` 0, contract
  lint clean, stills render + vision-grade OK). The terminal deliverable phase for every JTBD.
- **Re-render / resize / re-quality** (JTBD-4): produce another AR or quality from an existing project. A
  base AR whose `<Composition>` is already registered renders natively; a 4k token upsamples the SAME
  orientation via `--scale=2`; a **different orientation** (16:9 → 9:16) is a re-authored composition in
  `rm-build` first — `render.sh` says so and fails that AR cleanly.
- Do NOT use to author/fix the composition (`rm-build`) or to lint/snapshot (`rm-validate`).

## Inputs (read before write)
- `artifacts/<project>/remotion-project/` (required) — the validated app. **Missing or unvalidated** →
  record the block in `state.md` + `dashboard.md` and stop (run `rm-build` → `rm-validate` first).
- `aspect-ratios` (optional) — default `16:9`. Resolve from the user request, else the onboarding/context
  default, else `16:9` (JTBD-3 defaults to `9:16`).
- `name` (optional) — default `props.json` `.name`, else the `<project>` slug.
- `quality` (optional) — default `draft` for previews; `standard` for the final deliverable.
- `verify-at` (optional) — default `1,mid,end-1` from `props.json` `durationSeconds`.

## Instructions

### 1. Render + verify (one command)
```bash
cd artifacts/<project>/remotion-project
bash "$SKILL/scripts/render.sh" . ../exports <name> "16:9" "1,6,11" draft
#                                 ^proj ^exports ^name ^ARs   ^verify-at ^quality
```
`render.sh`, in order (cheap → expensive), per AR:
1. **Pins** every `remotion`/`@remotion/*` dep to ONE resolved version (RV) — the GLOBAL `remotion`
   binary's version (the actual engine) on `sl8-animation`, else `npm view remotion version` on host,
   else the starter pin `4.0.473`. Re-pins `package.json` + `npm install` only on a mismatch. **Version
   skew is the #1 render break.**
2. Resolves the render binary to the **GLOBAL `remotion`** (~25× faster than `npx --yes`, which
   re-downloads); falls back to the local `npx remotion` (no `--yes`).
3. Picks Chrome: the pinned **Chrome Headless Shell** (`$CHROME_HEADLESS_SHELL`, default
   `/opt/remotion/chrome-headless-shell`) via `--browser-executable`; **self-heals** to
   `remotion browser ensure` if the sandbox shell is missing; **omits** the flag on host (var empty →
   Remotion auto-resolves Chrome). Never re-downloads in-sandbox.
4. Reads the **composition prefix** (`compositionPrefix`, default `Studio`) and **output basename**
   (`name`) from `props.json`; enumerates the registered compositions (`remotion compositions`). A
   requested AR whose `<Composition>` isn't registered **fails cleanly** with a route to `rm-build`.
5. Runs the mandated invocation per AR: `remotion render src/index.ts Studio-<ar> <out> --props=./props.json
   --codec=h264 --image-format=jpeg --gl=angle --concurrency=1 --crf=<q> [--scale=2 for 4k]
   [--browser-executable=<shell>]`. `--concurrency=1` is mandatory — the ~1.9 GB template **OOMs (Exit-137)**
   above 1.9 GB at higher concurrency.
6. **ffprobe-verifies** each MP4: `codec_name==h264`, `width×height`==the expected dims for the AR/scale,
   a frame rate, and `duration>0`. When `assets/vo/*.wav` exists, also confirms an **audio stream**.
7. Extracts a frame per `verify-at` timestamp into `../exports/frames/` for the vision grade.

It exits 0 only when **every** requested AR produced a verified MP4. Multiple same-or-different
orientations in one call: `"16:9 16:9-4k 9:16"` (a 9:16 needs its `<Composition>` registered, else it
fails that AR cleanly and routes to `rm-build`).

### 2. Vision-grade the frames (the real gate — JTBD acceptance)
**Read** the PNGs in `artifacts/<project>/exports/frames/` and judge the pixels — not the filename or size:
- **Legible** — headline + key facts present, readable, high contrast.
- **Composition** — hierarchy + density per `03-storyboard.md`; content inside the `<SafeZone>` for the AR
  (no clipping); edge-anchored, not a centered single element.
- **Motion quality** — across frames around a transition, motion shows varied easing + a real transition
  (a wipe/flash/slide), not flat cross-fades. (Read 2–3 frames around a cut to confirm.)
- **Brand application** — the `01-concept.md` palette (hex) + fonts are applied, not generic defaults.
- **Figures (JTBD-2)** — numbers shown == the input data exactly; digits don't jitter (tabular-nums).
If a frame is wrong (clipped, blank, off-brand, wrong font, fabricated figure), diagnose: a composition
fault → route to `rm-build` and re-validate; a quality bump → re-render at `standard`.

### 3. Confirm audio (only if VO/music was requested)
If `assets/vo/*.wav` / `04-timing.json` exist, confirm the MP4 carries an audio stream (render.sh already
warns if not):
```bash
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 <out>.mp4
```
A silent render when audio was expected means the `<Audio>` element isn't a direct child of the
composition — fix in `rm-build` (contract). VO comes from `ai-gen` Kokoro upstream (`rm-voiceover`); the
render itself never calls a model.

### 4. Report + record
State the resolved render parameters (ARs, quality, name), the verified dims/fps/duration per MP4, and
your vision verdict per frame. Update `state.md` (phase 7 done) and `dashboard.md` (each AR rendered).
Note any fallback (e.g. "9:16 needs a re-authored composition — re-run rm-build", "VO requested but no
audio stream").

## Outputs
- `artifacts/<project>/exports/<name>-<ar>.mp4` — one ffprobe-verified H.264 MP4 per requested AR
  (`<ar>` = `16x9` | `9x16` | `1x1`, optional `-4k`).
- `artifacts/<project>/exports/frames/<name>-<ar>-at-<t>s.png` — frames for the vision grade.

## Examples

### Example 1: final 16:9 + 4k (JTBD-1)
`render.sh . ../exports teaser "16:9 16:9-4k" "" standard` → two MP4s (1920×1080 and 3840×2160 via
`--scale=2`), both ffprobe-verified, frames extracted → Read the frames, confirm legible + on-brand +
varied motion → done.

### Example 2: resize to vertical (JTBD-4)
User: "give me a 9:16". If the project registers only `Studio-16x9`, `render.sh` fails the 9:16 AR cleanly
with "Studio-9x16 is not registered — re-author at 1080×1920 in rm-build". Run `rm-build` to add the
portrait `<Composition>` (facts unchanged), re-validate, then `render.sh . ../exports teaser "9:16" "" draft`.

### Example 3: data-viz figures (JTBD-2)
`render.sh . ../exports q4-revenue "16:9" "2,8" standard` → verified `q4-revenue-16x9.mp4` → Read the
frames and confirm the on-screen figures match the input quarterly numbers exactly (no rounded-away or
fabricated values), and the counter/bars animate to the correct finals.

## Failure / fallback
- **Version skew** (`@remotion/* must have the same version`) → render.sh re-pins all deps to RV and
  reinstalls; if it persists, the GLOBAL binary differs from the project — re-pin to `remotion --version`.
- **Exit-137 / OOM** → confirm `--concurrency=1` (render.sh enforces it); the ~1.9 GB template ceiling is
  REQ-005. Render `draft` while iterating; reserve `standard`/`high`/4k for the final pass.
- **No MP4 / blank video** → confirm `rm-validate` passed; check Chrome (pinned in-sandbox, omitted on
  host). `remotion compositions` errors → fix the bundle in `rm-build`.
- **Wrong/stretched dims** → you asked for an AR whose orientation differs from the only registered
  composition; render.sh fails it and routes to `rm-build` (never a stretched/letterboxed file).
- **Silent render** → `<Audio>` not a child of the composition root; fix in `rm-build`.
- **Missing/unvalidated project** → record the block in `state.md` + `dashboard.md` and stop.

## Quality criteria
- [ ] One ffprobe-verified H.264 MP4 per requested AR at the correct dimensions, a frame rate, and a
      non-zero duration.
- [ ] Frames extracted to `exports/frames/`; vision grade confirms legible, composed, on-brand, varied
      motion (figures == input for JTBD-2).
- [ ] All `@remotion/*` resolve to ONE version; the GLOBAL binary is used, not `npx --yes`.
- [ ] Self-heal works: renders in-sandbox (pinned Chrome Headless Shell) AND on host/dev (auto-resolved
      Chrome), no in-sandbox re-download.
- [ ] No AI model / cloud / auth in the render path; render is local + keyless.
- [ ] A different-orientation AR is reported as a re-author (routed to `rm-build`), not silently
      mis-rendered or stretched.
