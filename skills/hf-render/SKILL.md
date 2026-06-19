---
name: hf-render
description: Render a validated HyperFrames composition to one or more aspect ratios as deterministic local MP4s, then verify them. Runs hyperframes render with the pinned Chrome (self-healing to the system Chrome on host/dev), low-memory mode, and a chosen quality; ffprobe-verifies codec/dimensions/fps/duration; and extracts key frames for a vision grade. Use during the RENDER phase (phase 7), after hf-validate passes, or to RE-RENDER / RESIZE an existing project. 100% local and keyless — no HeyGen cloud, lambda, or auth.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [hf-build, hf-validate, hf-voiceover]
  inputs:
    - name: composition
      type: html
      required: true
      description: artifacts/<project-name>/composition/ — the validated HyperFrames project (lints 0 errors via hf-validate).
    - name: aspect-ratios
      type: text
      required: false
      description: Any of 16:9, 9:16, 1:1 (and -4k variants), space/comma separated. Default 16:9. A base AR must match the composition's native orientation (a different AR is re-authored in hf-build).
    - name: quality
      type: text
      required: false
      description: draft | standard | high. Default draft (fast preview); use standard for finals.
    - name: name
      type: text
      required: false
      description: Output file stem (artifacts/<project-name>/exports/<name>-<ar>.mp4). Default = the project slug.
  outputs:
    - name: videos
      type: video
      path: artifacts/<project-name>/exports/<name>-<ar>.mp4
      description: One verified H.264 MP4 per requested aspect ratio at the correct dimensions/fps/duration.
    - name: frames
      type: png
      path: artifacts/<project-name>/exports/frames/<name>-<ar>-at-<t>s.png
      description: Key frames extracted from each rendered MP4 for the vision (media-judge) grade.
---

# hf-render — deterministic local MP4 render + verify

## Purpose
Turn a validated composition into the finished MP4(s). Renders locally with the pinned Chrome + FFmpeg —
**no cloud, no lambda, no auth, no credits** — then verifies the output is a real H.264 video at the right
dimensions and extracts frames so you can grade the pixels. Separate from `hf-build` so a resize / re-voice
/ re-render never re-authors the composition.

`$SKILL` = this skill's directory. Full flag detail: `references/render-flags.md`.

## When to use
- **Render** (phase 7): after `hf-validate` reports PASS (0 lint errors, frames captured).
- **Re-render / resize** (JTBD-4): produce another AR or quality from an existing composition. A base AR
  whose orientation matches the composition renders natively; a **different orientation** (e.g. 16:9 → 9:16)
  means re-authoring the root dims in `hf-build` first — `render.sh` says so and fails that AR cleanly.
- Do NOT use to author or fix the composition (that is `hf-build`), or to lint/snapshot (that is `hf-validate`).

## Inputs
- `artifacts/<project-name>/composition/` (required) — the validated project.
- `aspect-ratios` (optional) — default `16:9`. Resolve from the user request, else the onboarding/context
  default, else `16:9`.
- `quality` (optional) — default `draft` for previews; `standard` for the final deliverable.
- `name` (optional) — default the project slug.
- **Missing composition** → record the failure in `state.md` and stop (run hf-build/hf-validate first).

## Instructions

### 1. Render + verify (one command)
```bash
cd artifacts/<project-name>/composition
bash "$SKILL/scripts/render.sh" . ../exports <name> "16:9" draft "2,9,15"
#                                 ^comp ^exports ^name ^ARs   ^q   ^verify-at (one per scene)
```
`render.sh`, per AR:
1. Picks Chrome — pinned `/etc/sl8/chrome-path` in-sandbox, or **self-heals** to the system Chrome on
   host/dev (omits `--chrome`). Never downloads Chrome.
2. Runs the mandated invocation: `hyperframes render . [--chrome <pinned>] --low-memory-mode --quality <q>
   [--resolution <orientation>-4k for 4k] --output <exports>/<name>-<ar>.mp4`.
3. `ffprobe`-verifies codec=h264 + correct width/height + fps + non-zero duration.
4. Extracts a frame per `verify-at` timestamp into `../exports/frames/` for the vision grade.

It exits 0 only when **every** requested AR produced a verified MP4. For multiple ARs:
`"16:9 16:9-4k"` (same orientation works in one call); a different orientation needs a re-authored comp.

### 2. Vision-grade the frames (the real gate — JTBD-1 acceptance)
**Read** the PNGs in `artifacts/<project-name>/exports/frames/` (one per scene) and judge the pixels —
not the filename or size:
- **Legible** — headline + key facts present, readable, high contrast.
- **Composition** — hierarchy + density per the storyboard; edge-anchored; not a centered single element;
  text inside the safe zone for the AR (no clipping).
- **Motion quality** — across the sampled frames, motion shows varied easing + a real transition (not flat
  fades). (Read 2–3 frames around a transition to confirm.)
- **Brand application** — the `01-concept.md` palette + fonts are applied (not generic defaults).
If a frame is wrong (clipped, blank, off-brand, wrong font), diagnose: if the composition is wrong, route
to `hf-build` and re-validate; if it's just a quality bump, re-render at `standard`.

### 3. Confirm audio (only if VO/music was requested)
If `assets/vo/*.wav` / `04-timing.json` exist, confirm the MP4 carries an audio stream:
```bash
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 <out>.mp4
```
A silent render when audio was expected means the audio element isn't a direct child of the root — fix in
`hf-build` (contract §2). Asset audio comes via `ai-gen` upstream; the render never calls a model.

### 4. Report
State the resolved render parameters (ARs, quality, name), the verified dims/fps/duration per MP4, and your
vision verdict per frame. Note any fallback (e.g. "9:16 needs a re-authored composition — re-run hf-build").

## Outputs
- `artifacts/<project-name>/exports/<name>-<ar>.mp4` — one verified H.264 MP4 per AR.
- `artifacts/<project-name>/exports/frames/<name>-<ar>-at-<t>s.png` — frames for the vision grade.

## Examples

### Example 1: final 16:9 + 4k (JTBD-1)
`render.sh . ../exports teaser "16:9 16:9-4k" standard "2,9,15"` → two MP4s (1920×1080 and 3840×2160), both
ffprobe-verified, frames extracted → Read the frames, confirm legible + on-brand + varied motion → done.

### Example 2: resize to vertical (JTBD-4)
User: "give me a 9:16". The composition is 16:9 → `render.sh` fails 9:16 cleanly with "re-author the root to
1080×1920 in hf-build". Run `hf-build` to produce a portrait composition (facts unchanged), re-validate,
then `render.sh . ../exports teaser "9:16" draft "9"`.

## Troubleshooting
- **`outputResolution portrait does not match the aspect ratio`** → you asked for an AR whose orientation
  differs from the composition. Re-author the root dims in `hf-build`; `--resolution` cannot rotate.
- **`CHROME_ARGS[@]: unbound variable`** (old bash) → fixed via the `${ARR[@]+...}` idiom; if you see it,
  you're on a stale render.sh.
- **No MP4 / blank video** → check `hf-validate` passed; confirm Chrome (pinned in-sandbox, system on host).
  `hyperframes doctor` false-negatives on Chrome — ignore it.
- **Silent render** → audio element not a direct child of root; fix in `hf-build`.

## Quality Criteria
- [ ] One verified H.264 MP4 per requested AR at the correct dimensions, fps, and non-zero duration.
- [ ] Frames extracted to `exports/frames/`; vision grade confirms legible, composed, on-brand, varied motion.
- [ ] Self-heal works: renders in-sandbox (pinned Chrome) AND on host/dev (auto-detected Chrome), no download.
- [ ] No HeyGen cloud/lambda/auth used; render is local + keyless.
- [ ] A different-orientation AR is reported as a re-author (routed to hf-build), not silently mis-rendered.
