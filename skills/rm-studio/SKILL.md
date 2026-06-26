---
name: rm-studio
description: "The all-in-one orchestrator for Remotion Studio — take a plain-language brief (or data, or an existing clip, or a freeform motion idea) and produce a finished, on-brand MP4 by walking the full production chain (concept then script then storyboard then voiceover then build then validate then render then preview). It routes the request to its JTBD front-end, runs each granular rm-* skill's scripts in order, reads their numbered artifacts, advances state.md, and writes 06-summary.md; it does NOT re-implement them. Use as the DEFAULT entry point for \"make me a video / explainer / data video / social cut / animate this idea\" and for re-entry on a finished project (restyle, resize, re-voice, re-render) on frozen upstream facts. The render is KEYLESS and local (Remotion → Chrome Headless Shell + FFmpeg, no cloud, no Lambda, no auth); ai-gen supplies only voiceover/ASR/matte."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [onboarding, rm-brand-extract, rm-concept, rm-script, rm-storyboard, rm-voiceover, rm-assets, rm-build, rm-captions, rm-dataviz, rm-audioviz, rm-validate, rm-render, rm-preview]
  inputs:
    - name: brief
      type: text
      required: true
      description: "The video request — a plain-language brief/script/topic, a source URL, a data file (CSV/JSON), an existing media clip path, or a freeform \"animate X\" idea. Its shape picks which JTBD front-end the chain starts with."
    - name: aspect-ratios
      type: text
      required: false
      description: "Any of 16:9, 9:16, 1:1 (space/comma separated). Default = the onboarding/context default, else 16:9 (9:16 for a JTBD-3 social cut)."
    - name: voice
      type: text
      required: false
      description: "A Kokoro voice id (e.g. am_michael, af_nova) for the voiceover. Default = the context default voice, else am_michael."
    - name: music
      type: text
      required: false
      description: "on or off — whether to add a background music bed. Default = the context default, else off."
    - name: quality
      type: text
      required: false
      description: "draft | standard | high — the render quality. Default draft for previews; standard for the final deliverable."
    - name: name
      type: text
      required: false
      description: "Output file stem for the MP4s (exports/[name]-[ar].mp4). Default = the project slug."
  outputs:
    - name: concept
      type: markdown
      path: artifacts/<project>/01-concept.md
      description: "The 6-dimension base concept (subject, composition, style, palette+hex, typography, mood) produced by rm-concept."
    - name: script
      type: markdown
      path: artifacts/<project>/02-script.md
      description: "The beat-structured VO + on-screen text (provenance-faithful) produced by rm-script — the only phase that sets facts."
    - name: storyboard
      type: markdown
      path: artifacts/<project>/03-storyboard.md
      description: "Per-beat Remotion-block plan (primitives / library presets / [TransitionSeries] / @remotion/* / track + frame ranges) produced by rm-storyboard."
    - name: timing
      type: json
      path: artifacts/<project>/04-timing.json
      description: "Word-level voiceover timestamps (@remotion/captions-shaped) produced by rm-voiceover (alongside assets/vo/*.wav)."
    - name: project
      type: directory
      path: artifacts/<project>/remotion-project/
      description: "The per-project Remotion (React) app authored by rm-build (bundled starter + harvested engine + official skills + generated src/ + props.json), conforming to the frozen composition contract."
    - name: validation
      type: markdown
      path: artifacts/<project>/05-validation.md
      description: "The version-skew + tsc + contract-lint + still-render + vision verdict produced by rm-validate (plus key stills in snapshots/)."
    - name: videos
      type: video
      path: artifacts/<project>/exports/<name>-<ar>.mp4
      description: "One verified, on-brand H.264 MP4 per requested aspect ratio — the finished deliverable, rendered keyless+local by rm-render (frames in exports/frames/)."
    - name: preview
      type: html
      path: artifacts/<project>/preview.html
      description: "An @remotion/player live scrubbable preview produced by rm-preview (Remotion-unique; lets the look be checked before/without a full render)."
    - name: summary
      type: markdown
      path: artifacts/<project>/06-summary.md
      description: "The run summary rm-studio writes — resolved parameters (voice, style, palette, ARs, quality, music), per-phase artifact paths, the per-frame vision verdict, and any fallback taken."
---

# rm-studio — brief to finished MP4 (the orchestrator)

## Purpose
The default entry point. Given a plain-language brief (or data, or an existing clip, or a freeform motion
idea), produce a finished, on-brand MP4 by **routing the request to its JTBD front-end** and walking the
**production chain**, handing each phase to the granular skill that owns it. rm-studio is a **conductor, not
a re-implementation**: it runs each `rm-*` skill's bundled scripts in order, reads the numbered artifact each
phase writes, and advances `state.md` — it never re-derives a concept, re-authors the React, or re-implements
the render. The phase chain it walks:

```
[onboard] -> concept -> script -> storyboard -> voiceover+timing -> build -> validate -> render -> preview
   (0)         (1)        (2)        (3)              (4)             (5)      (6)        (7)       (7b)
```

`$SKILL` below = this skill's directory. References: `references/phase-chain.md` (the spine), `references/routing.md` (the JTBD router).

## When to use
- **Default / full run** (JTBD-1/2/3/5): the user describes a video, hands over data, drops in a clip, or
  asks to "animate" a freeform idea and wants the finished MP4 — "make a 15 s teaser", "turn this CSV into a
  data video", "caption this clip", "make confetti burst into our logo".
- **Re-entry on a finished project** (JTBD-4): "make it 9:16", "different voice", "bolder style",
  "re-render at standard" — re-enter the chain at the right phase on **frozen facts** (see "Re-entry").
- Do NOT use when the user wants only one granular phase in isolation (e.g. "just re-render at standard") —
  call the owning skill (`rm-render`) directly. rm-studio is for the end-to-end walk.

## Inputs
- `brief` (required) — the request. Its shape picks the front-end (see `references/routing.md`): a
  brief/script/URL → start at concept (JTBD-1); tabular data → concept with a data narrative + `rm-dataviz`
  storyboard blocks (JTBD-2); an existing media clip → start at ASR→storyboard, skipping narration, weave
  `rm-captions` (JTBD-3); a freeform motion idea → generative authoring in `rm-build` (JTBD-5).
- `aspect-ratios`, `voice`, `music`, `quality`, `name` (optional) — resolve each to its documented default
  (16:9, context voice/`am_michael`, music off, draft, project slug). **Headless: never prompt** — apply the
  default and record it in `06-summary.md`. **Missing the required brief** → record the failure in `state.md`
  and stop.

## Instructions

### 0. Onboard / detect the project, freeze the parameters
- If no `artifacts/<project>/state.md` exists, run the registry **`onboarding`** skill (PROJECT mode) to
  write `context.md` (brand kit + AR + voice + music defaults) and seed `state.md` with the phase table.
  Optionally run **`rm-brand-extract`** first if the brief names a brand URL (it writes the brand block into
  `context.md`).
- Resolve every parameter once, up front (ARs, voice, music, quality, name) and write them into
  `06-summary.md` so the rest of the run — and the user — knows exactly what was used.
- Route the brief to its JTBD via `references/routing.md`, which names the front-end phase and the capability
  skill(s) the build phase weaves in.

### 1. Walk the phases — run each skill's scripts, read its artifact, advance state
For each phase in order, **READ the artifacts the phase consumes first**, run the owning skill, then mark
the phase done in `state.md` (and refresh `artifacts/dashboard.md`). The granular skills hold the real
instructions and bundled scripts; do NOT inline their logic — open the named skill's `SKILL.md` and follow
it. The contract for each phase:

| # | phase | skill(s) | reads | writes | how rm-studio drives it |
|---|---|---|---|---|---|
| 1 | concept | `rm-concept` | `context.md` | `01-concept.md` | run the skill; it writes the 6-dimension base concept (skip for a pure JTBD-3 clip) |
| 2 | script | `rm-script` | `context.md`, `01-concept.md` | `02-script.md` | run the skill; beats stay faithful to the brief (no invented facts) |
| 3 | storyboard | `rm-storyboard` (+ `rm-dataviz` vocab for JTBD-2) | `01-concept.md`, `02-script.md` | `03-storyboard.md` | run the skill; per-beat Remotion blocks + frame ranges |
| 4 | voiceover | `rm-voiceover` (+ `rm-assets`) | `02-script.md` / input clip | `assets/vo/*.wav`, `04-timing.json` | run its `tts.sh`/`words.sh` (ai-gen Kokoro+Wizper); for JTBD-3 the ASR path transcribes the clip; `rm-assets` `bg-remove.sh`/`capture.sh` for cutouts/captures |
| 5 | build | `rm-build` (+ `rm-captions`/`rm-dataviz`/`rm-audioviz`) | `03-storyboard.md`, `01-concept.md`, `04-timing.json`, `assets/` | `remotion-project/`, `props.json` | `bash "$RM_BUILD/scripts/init.sh" artifacts/<project>/remotion-project` then author fresh React per the skill against the composition contract; compose the capability components the JTBD needs |
| 6 | validate | `rm-validate` | `remotion-project/` | `05-validation.md` + `snapshots/` | `bash "$RM_VALIDATE/scripts/validate.sh" artifacts/<project>/remotion-project artifacts/<project> "<verify-at-csv>"` |
| 7 | render | `rm-render` | `remotion-project/`, `props.json`, `04-timing.json` | `exports/<name>-<ar>.mp4` | `cd artifacts/<project>/remotion-project && bash "$RM_RENDER/scripts/render.sh" . ../exports <name> "<ARs>" <quality> "<verify-at-csv>"` |
| 7b | preview | `rm-preview` | `remotion-project/`, `props.json` | `preview.html` | `bash "$RM_PREVIEW/scripts/preview.sh" artifacts/<project>/remotion-project artifacts/<project>` (Remotion-unique; optional, non-gating) |

(`$RM_BUILD`/`$RM_VALIDATE`/`$RM_RENDER`/`$RM_PREVIEW` = those skills' directories — under
`.claude/skills/<name>/` at runtime. `references-skills` records this read-graph; it is **documentation-only**,
not a runtime call. The capability skills — `rm-captions`/`rm-dataviz`/`rm-audioviz` — own NO phase or
artifact; they ship vetted starter components that the build phase composes. See `references/routing.md`.)

The convenience driver bundled here runs the deterministic spine (scaffold → validate → render → preview)
once the authored phases (1–5 build) are present:
```bash
bash "$SKILL/scripts/run.sh" artifacts/<project> <name> "16:9" draft "2,5,9"
#                            ^project-artifacts-dir  ^name ^ARs   ^q   ^verify-at-seconds
```
`run.sh` is a **thin driver** — it scaffolds `remotion-project/` (if absent) via rm-build's `init.sh`, runs
rm-validate's strict gate, on PASS runs rm-render, then best-effort runs rm-preview. It does NOT author the
concept/script/storyboard or the React (those are reasoning phases you do by reading each skill); it just
chains the deterministic steps so you never fat-finger the paths/cwd. If validate BLOCKS, fix in `rm-build`
and re-run.

### 2. Gate before you render
Never render an unvalidated composition. `rm-validate` must report **PASS** — all `@remotion/*` resolve to
ONE version, `tsc --noEmit` is clean, the contract lint is clean (no `Math.random`, CSS `transition`/
`@keyframes`, `setTimeout`/`Date.now`, native `<img>`/`<video>`, unclamped `interpolate`, Tailwind
`animate-*`), and key stills rendered non-blank — **before** phase 7. If it BLOCKS, route the fix to
`rm-build`, re-validate, then render. (`run.sh` enforces this — it will not call render if validate exits
non-zero.)

### 3. Vision-grade the result (the real acceptance gate)
After phase 7, **Read** the extracted frames in `artifacts/<project>/exports/frames/` (and/or the MP4) and
judge the pixels yourself — never the filename or size. Confirm: legible (headline + key facts present,
high contrast, inside `<SafeZone>`), composed (clear hierarchy, edge-anchored — not a centered single
element), on-brand (the `01-concept.md` palette + display/text fonts applied), motion shows varied easing +
a real transition; for JTBD-2 the shown figures equal the input data and digits don't jitter (tabular-nums).
If a frame is wrong, diagnose: a composition problem routes to `rm-build` → re-validate → re-render; a
quality bump is just a `standard`-quality re-render. Confirm an audio stream exists if VO/music was requested.

### 4. Summarize + advance
Write `artifacts/<project>/06-summary.md`: the resolved parameters (voice, style/concept name, palette hex,
fonts, ARs, quality, music), the path to each phase artifact and each MP4, your per-frame vision verdict, and
any fallback taken (e.g. "VO unavailable → rendered silent", "9:16 needed a re-authored composition"). Mark
phases 1–7(b) `done` in `state.md`, set `status: complete`, refresh `dashboard.md`, and remember.

## Re-entry (JTBD-4 — restyle / resize / re-voice / re-render on frozen facts)
A follow-up on a finished project re-enters the chain at the **earliest phase the change touches** and reads
the **unchanged** upstream artifacts:
- **Restyle** ("bolder", "darker palette", a different AR orientation) → re-enter at **phase 5 (build)**.
  Re-author `remotion-project/src/` from the SAME `02-script.md`/`03-storyboard.md` facts (re-theme; a new
  orientation is a **separate `<Composition>`** re-set to the new root dims — not a render flag), then
  re-validate + re-render. On-screen text/numbers stay byte-identical.
- **Re-voice** ("different voice", "re-narrate") → re-enter at **phase 4 (voiceover)**; rebuild only if the
  word timings shifted the caption beats.
- **Resize / re-render** (same orientation, a 4k pass, a quality bump) → re-enter at **phase 7 (render)**; no
  re-author. A **different orientation** is a re-author (phase 5) — `rm-render` reports this cleanly.
- A change that implies **new facts** ("say it costs $9 instead of $19") is NOT a restyle — re-run **phase 2
  (script)** and say so. Never silently invent or alter facts on a restyle.
New exports sit beside the originals (distinct `<name>-<ar>` stems); append a dated revision note to
`06-summary.md`.

## Outputs
rm-studio orchestrates the whole chain, so its outputs are the chain's artifacts plus its own run summary
(restated here as the anti-hallucination gate — these exact paths):
- `artifacts/<project>/01-concept.md` — base concept (rm-concept).
- `artifacts/<project>/02-script.md` — beat script (rm-script).
- `artifacts/<project>/03-storyboard.md` — storyboard (rm-storyboard).
- `artifacts/<project>/04-timing.json` (+ `assets/vo/*.wav`) — voiceover + word timings (rm-voiceover).
- `artifacts/<project>/remotion-project/` (+ `props.json`) — the per-project Remotion app (rm-build).
- `artifacts/<project>/05-validation.md` (+ `snapshots/`) — the validate report (rm-validate).
- `artifacts/<project>/exports/<name>-<ar>.mp4` (+ `exports/frames/`) — the finished MP4s (rm-render).
- `artifacts/<project>/preview.html` — the live scrubbable preview (rm-preview).
- `artifacts/<project>/06-summary.md` — the run summary rm-studio writes (resolved params + verdict).

## Examples

### Example 1: brief → narrated 16:9 (JTBD-1, the default)
User: "Make a 15 s teaser for our API rate-limit feature, for developers." Onboard if needed → rm-concept
(tech/dark, electric-blue) → rm-script (4 beats, faithful) → rm-storyboard (title → 2 benefits → stat → CTA,
`<TransitionSeries>` wipe) → rm-voiceover (Kokoro VO + Wizper word timings) → rm-build (`init.sh`, author
fresh React, props.json) → `run.sh` validates (skew/tsc/lint/still PASS) + renders 16:9 draft → Read the
frames, confirm legible/on-brand/varied motion → write `06-summary.md`.

### Example 2: CSV → data video (JTBD-2)
User: "Turn this quarterly-revenue CSV into a data video." Same chain; the storyboard maps the 4 figures to a
counter + bar block (`rm-dataviz` vocab); rm-build composes the `rm-dataviz` chart components and binds the
EXACT input values via `props.json`; the vision grade confirms the shown numbers equal the CSV and digits
don't jitter (tabular-nums).

### Example 3: clip → caption cut (JTBD-3)
User: "Add TikTok captions to this clip in 9:16." Start at phase 4 ASR only (rm-voiceover transcribes the
clip → `04-timing.json`) → rm-storyboard (caption beats over `<OffthreadVideo>`) → rm-build composes the
`rm-captions` word-pop overlay (optional `rm-assets` subject matte) → validate → render 9:16 → confirm the
captions track the words and sit in the safe zone.

### Example 4: restyle to 9:16, bolder (JTBD-4 re-entry)
User: "Now make it 9:16 and bolder." Re-enter at phase 5: re-author `remotion-project/` with a 1080×1920
`<Composition>` and the bolder concept fonts, keeping `02-script.md` facts byte-identical → re-validate →
re-render `9:16` → confirm the headline text/numbers are unchanged → append a dated note to `06-summary.md`.

## Troubleshooting
- **A phase artifact is missing when the next phase needs it** → run the owning skill for that phase first
  (the table above names it); never fabricate the upstream artifact.
- **`rm-validate` BLOCKS** → do not render; read the verdict in `05-validation.md` (version skew? tsc error?
  forbidden pattern? blank still?), fix in `rm-build`, re-validate.
- **`render.sh` rejects an AR** ("does not match the composition orientation") → that AR is a re-author; go
  back to `rm-build` (phase 5) and add the `<Composition>` for the target root dims, then re-render.
- **Render Exit-137 (OOM)** → the ~1.9 GB template exceeded RAM; rm-render already pins `--concurrency=1` —
  do not raise it; if it persists, simplify the heaviest scene (fewer simultaneous layers) in `rm-build`.
- **Silent MP4 when VO was requested** → the `<Audio>` isn't mounted in the composition; fix in `rm-build`.
- **VO/ASR model unreachable** (`ai-gen` returns `success:false`) → per the reachability gate, do not
  silently substitute: render silent (or use estimated ~2.5 wps timing) and say so in `06-summary.md`, or
  STOP and ask if the user required narration.
- **No project yet** → run `onboarding` first (phase 0); rm-studio resumes from `state.md` thereafter.

## Quality Criteria
- [ ] Every phase 1–7 artifact exists at its `artifacts/<project>/NN-<phase>` path (the structural gate);
      `remotion-project/` + `06-summary.md` present.
- [ ] The composition passed `rm-validate` (one `@remotion/*` version, tsc clean, contract-lint clean,
      stills non-blank) BEFORE render; no unvalidated render.
- [ ] One verified MP4 per requested AR; vision grade confirms legible, composed, on-brand, varied motion
      (JTBD-2: shown figures == input data).
- [ ] `06-summary.md` records the resolved voice/style/palette/ARs and any fallback taken.
- [ ] Re-entry preserves upstream facts (restyle/resize/re-voice never alters on-screen text/numbers); new
      exports sit beside the originals.
- [ ] 100% keyless + local render — no cloud/Lambda/Cloud Run/auth anywhere; ai-gen supplied only VO/ASR/matte.
