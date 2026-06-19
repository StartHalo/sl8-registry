---
name: hf-studio
description: The all-in-one orchestrator for Motion Studio — take a plain-language brief (or data, or an existing clip) and produce a finished, on-brand MP4 by walking the full 7-phase production chain (concept then script then storyboard then voiceover then build then validate then render). It runs each granular hf-* skill's scripts in order and reads their numbered artifacts; it does NOT re-implement them. Use this as the DEFAULT entry point for "make me a video / explainer / data video / social cut" requests, and for re-entry on a finished project (restyle, re-voice, re-render) on frozen upstream facts. Local and keyless — no HeyGen cloud, lambda, or auth.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [hf-brand-extract, hf-concept, hf-script, hf-storyboard, hf-voiceover, hf-assets, hf-build, hf-validate, hf-render]
  inputs:
    - name: brief
      type: text
      required: true
      description: The video request — a plain-language brief/script/topic, a source URL, a data file (CSV/JSON), or an existing media clip path. This sets which JTBD front-end the chain starts with.
    - name: aspect-ratios
      type: text
      required: false
      description: Any of 16:9, 9:16, 1:1 (space/comma separated). Default = the onboarding/context default, else 16:9.
    - name: voice
      type: text
      required: false
      description: A Kokoro voice id (e.g. am_michael, af_nova) for the voiceover. Default = the context default voice.
    - name: music
      type: text
      required: false
      description: on or off — whether to add a background music bed. Default = the context default, else off.
    - name: quality
      type: text
      required: false
      description: draft | standard | high — the render quality. Default draft for previews; standard for the final deliverable.
    - name: name
      type: text
      required: false
      description: Output file stem for the MP4s (exports/<name>-<ar>.mp4). Default = the project slug.
  outputs:
    - name: concept
      type: markdown
      path: artifacts/<project-name>/01-concept.md
      description: The 6-dimension base concept (subject, composition, style, palette+hex, typography, mood) produced by hf-concept.
    - name: script
      type: markdown
      path: artifacts/<project-name>/02-script.md
      description: The beat-structured VO + on-screen text (provenance-faithful) produced by hf-script.
    - name: storyboard
      type: markdown
      path: artifacts/<project-name>/03-storyboard.md
      description: Per-beat blocks / transitions / track layout + frame ranges produced by hf-storyboard.
    - name: timing
      type: json
      path: artifacts/<project-name>/04-timing.json
      description: Word-level voiceover timestamps produced by hf-voiceover (alongside assets/vo/*.wav).
    - name: composition
      type: html
      path: artifacts/<project-name>/composition/
      description: The lint-clean HyperFrames project authored by hf-build (vendored GSAP + system fonts + scenes).
    - name: validation
      type: markdown
      path: artifacts/<project-name>/05-validation.md
      description: The lint + snapshot pass/block report produced by hf-validate (plus key frames in snapshots/).
    - name: videos
      type: video
      path: artifacts/<project-name>/exports/<name>-<ar>.mp4
      description: One verified, on-brand H.264 MP4 per requested aspect ratio — the finished deliverable, rendered by hf-render.
    - name: summary
      type: markdown
      path: artifacts/<project-name>/06-summary.md
      description: The run summary hf-studio writes — the resolved parameters (voice, style, palette, ARs), per-phase artifact paths, and any fallback taken.
---

# hf-studio — brief to finished MP4 (the orchestrator)

## Purpose
The default entry point. Given a plain-language brief (or data, or an existing clip), produce a finished,
on-brand MP4 by walking the full **7-phase production chain** and handing each phase to the granular skill
that owns it. hf-studio is a **conductor, not a re-implementation**: it runs each `hf-*` skill's bundled
scripts in order, reads the numbered artifact each phase writes, and advances `state.md` — it never
re-derives a concept, re-authors HTML, or re-implements a render. The phase chain it walks:

```
[onboard] -> concept -> script -> storyboard -> voiceover+timing -> build -> validate -> render
   (0)         (1)        (2)        (3)              (4)             (5)      (6)       (7)
```

`$SKILL` below = this skill's directory. The phase-chain reference is `references/phase-chain.md`.

## When to use
- **Default / full run** (JTBD-1/2/3): the user describes a video, hands over data, or drops in a clip and
  wants the finished MP4 — "make me a 15 s teaser", "turn this CSV into a data video", "caption this clip".
- **Re-entry on a finished project** (JTBD-4): "make it 9:16", "different voice", "bolder style" — re-enter
  the chain at the right phase on **frozen facts** (see "Re-entry" below).
- Do NOT use when the user wants only one granular phase (e.g. "just re-render at standard quality") — call
  the owning skill (`hf-render`) directly. hf-studio is for the end-to-end walk.

## Inputs
- `brief` (required) — the request. Its shape picks the front-end: a brief/script/URL → start at concept
  (JTBD-1); tabular data → concept with a data narrative (JTBD-2); an existing media clip → start at
  transcribe→storyboard, skipping concept/script's narration (JTBD-3).
- `aspect-ratios`, `voice`, `music`, `quality`, `name` (optional) — resolve each to its documented default
  (16:9, context voice, music off, draft, project slug). **Headless: never prompt** — apply the default and
  record it in `06-summary.md`. **Missing the required brief** → record the failure in `state.md` and stop.

## Instructions

### 0. Onboard / detect the project, freeze the parameters
- If no `artifacts/<project-name>/state.md` exists, run the registry **`onboarding`** skill (PROJECT mode)
  to write `context.md` (brand kit + AR + voice + music defaults) and seed `state.md` with the phase table.
  Optionally run **`hf-brand-extract`** first if the brief names a brand URL (it writes the brand block into
  `context.md`).
- Resolve every parameter once, up front (ARs, voice, music, quality, name) and write them into
  `06-summary.md` so the rest of the run — and the user — knows exactly what was used.
- Route the brief to its JTBD (see `references/phase-chain.md` for the front-end each one uses).

### 1. Walk the phases — run each skill's scripts, read its artifact, advance state
For each phase in order, **READ the artifacts the phase consumes first**, run the owning skill, then mark
the phase done in `state.md`. The granular skills hold the real instructions and the bundled scripts; do
NOT inline their logic — open the named skill's `SKILL.md` and follow it. The contract for each phase:

| # | phase | skill | reads | writes | how hf-studio drives it |
|---|---|---|---|---|---|
| 1 | concept | `hf-concept` | `context.md` | `01-concept.md` | run the skill; it writes the 6-dimension base concept |
| 2 | script | `hf-script` | `context.md`, `01-concept.md` | `02-script.md` | run the skill; beats stay faithful to the brief (no invented facts) |
| 3 | storyboard | `hf-storyboard` | `01-concept.md`, `02-script.md` | `03-storyboard.md` | run the skill; per-beat blocks/transition/track + frame ranges |
| 4 | voiceover | `hf-voiceover` (+ `hf-assets`) | `02-script.md` | `assets/vo/*.wav`, `04-timing.json` | run its `tts.sh`/`words.sh` (ai-gen); `hf-assets` `bg-remove.sh`/`capture.sh` if the brief needs cutouts/captures |
| 5 | build | `hf-build` | `03-storyboard.md`, `04-timing.json`, `assets/` | `composition/` | `bash "$HF_BUILD/scripts/init.sh" artifacts/<project-name>/composition` then author scenes per the skill |
| 6 | validate | `hf-validate` | `composition/` | `05-validation.md` + snapshots | `bash "$HF_VALIDATE/scripts/validate.sh" artifacts/<project-name>/composition artifacts/<project-name> "<at-csv>"` |
| 7 | render | `hf-render` | `composition/`, `04-timing.json` | `exports/<name>-<ar>.mp4` | `cd artifacts/<project-name>/composition && bash "$HF_RENDER/scripts/render.sh" . ../exports <name> "<ARs>" <quality> "<at-csv>"` |

(`$HF_BUILD`/`$HF_VALIDATE`/`$HF_RENDER` = those skills' directories — under `.claude/skills/<name>/` at
runtime. `references-skills` records this read-graph; it is **documentation-only**, not a runtime call.)

The convenience driver bundled here runs the deterministic spine (scaffold → validate → render) once the
authored phases (1–6 build) are present:
```bash
bash "$SKILL/scripts/run.sh" artifacts/<project-name> <name> "16:9" draft "2,9,15"
#                            ^project-artifacts-dir   ^name ^ARs   ^q   ^verify-at
```
`run.sh` is a **thin driver** — it scaffolds `composition/` (if absent) via hf-build's `init.sh`, runs
hf-validate's strict gate, and on PASS runs hf-render. It does NOT author the concept/script/storyboard or
the scene HTML (those are reasoning phases you do by reading each skill); it just chains the three script
steps so you don't fat-finger the paths. If validate BLOCKS, fix in `hf-build` and re-run.

### 2. Gate before you render
Never render an unvalidated composition. `hf-validate` must report **PASS** (0 lint errors + key frames
captured) before phase 7. If it BLOCKS, route the fix to `hf-build`, re-validate, then render. (`run.sh`
enforces this — it will not call render if validate exits non-zero.)

### 3. Vision-grade the result (the real acceptance gate)
After phase 7, **Read** the extracted frames in `artifacts/<project-name>/exports/frames/` (and/or the MP4)
and judge the pixels yourself — never the filename or size. Confirm: legible (headline + key facts present,
high contrast, inside the safe zone), composed (clear hierarchy, edge-anchored — not a centered single
element), on-brand (the `01-concept.md` palette + fonts applied), and the motion shows varied easing + a
real transition. If a frame is wrong, diagnose: a composition problem routes to `hf-build` → re-validate →
re-render; a quality bump is just a `standard`-quality re-render. Confirm an audio stream exists if VO/music
was requested.

### 4. Summarize + advance
Write `artifacts/<project-name>/06-summary.md`: the resolved parameters (voice, style/concept name, palette
hex, fonts, ARs, quality, music), the path to each phase artifact and each MP4, your per-frame vision
verdict, and any fallback taken (e.g. "VO unavailable → rendered silent", "9:16 needed a re-authored
composition"). Mark phases 1–7 `done` in `state.md`, set `status: complete`, and remember.

## Re-entry (JTBD-4 — restyle / re-voice / re-render on frozen facts)
A follow-up on a finished project re-enters the chain at the **earliest phase the change touches** and
reads the **unchanged** upstream artifacts:
- **Restyle** ("bolder", "darker palette", a different AR/orientation) → re-enter at **phase 5 (build)**.
  Re-author `composition/` from the SAME `02-script.md`/`03-storyboard.md` facts (re-theme, change the root
  dims for a new orientation), then re-validate + re-render. On-screen text/numbers stay byte-identical.
- **Re-voice** ("different voice", "re-narrate") → re-enter at **phase 4 (voiceover)**; rebuild only if the
  word timings shifted the caption beats.
- **Resize / re-render** (same orientation, a 4k pass, a quality bump) → re-enter at **phase 7 (render)**;
  no re-author. A **different orientation** is a re-author (phase 5) — `hf-render` reports this cleanly.
- A change that implies **new facts** ("say it costs $9 instead of $19") is NOT a restyle — re-run **phase 2
  (script)** and say so. Never silently invent or alter facts on a restyle.
New exports sit beside the originals (distinct `<name>-<ar>` stems); append a dated revision note to
`06-summary.md`.

## Outputs
hf-studio orchestrates the whole chain, so its outputs are the chain's artifacts plus its own run summary:
- `artifacts/<project-name>/01-concept.md` — base concept (hf-concept).
- `artifacts/<project-name>/02-script.md` — beat script (hf-script).
- `artifacts/<project-name>/03-storyboard.md` — storyboard (hf-storyboard).
- `artifacts/<project-name>/04-timing.json` (+ `assets/vo/*.wav`) — voiceover + word timings (hf-voiceover).
- `artifacts/<project-name>/composition/` — the lint-clean HyperFrames project (hf-build).
- `artifacts/<project-name>/05-validation.md` (+ `snapshots/`) — the validate report (hf-validate).
- `artifacts/<project-name>/exports/<name>-<ar>.mp4` (+ `exports/frames/`) — the finished MP4s (hf-render).
- `artifacts/<project-name>/06-summary.md` — the run summary hf-studio writes (resolved params + verdict).

## Examples

### Example 1: brief → narrated 16:9 (JTBD-1, the default)
User: "Make a 15 s teaser for our API rate-limit feature, for developers." Onboard if needed → run
hf-concept (tech/dark, electric-blue) → hf-script (4 beats, faithful) → hf-storyboard (title → 2 benefits →
stat → CTA, liquid-wipe) → hf-voiceover (Kokoro VO + word timings) → hf-build (`init.sh`, author scenes,
lint 0) → `run.sh` validates + renders 16:9 draft → Read the frames, confirm legible/on-brand/varied
motion → write `06-summary.md`.

### Example 2: CSV → data video (JTBD-2)
User: "Turn this quarterly-revenue CSV into a data video." Same chain; the storyboard maps the 4 figures to
a counter + bar-racer block; hf-build binds the exact input values; the vision grade confirms the shown
numbers equal the CSV and digits don't jitter (tabular-nums).

### Example 3: restyle to 9:16, bolder (JTBD-4 re-entry)
User: "Now make it 9:16 and bolder." Re-enter at phase 5: re-author `composition/` to a 1080×1920 root with
the bolder concept fonts, keeping `02-script.md` facts byte-identical → re-validate → re-render `9:16` →
confirm the headline text/numbers are unchanged → append a dated note to `06-summary.md`.

## Troubleshooting
- **A phase artifact is missing when the next phase needs it** → run the owning skill for that phase first
  (the table above names it); never fabricate the upstream artifact.
- **`hf-validate` BLOCKS** → do not render; read the lint findings, fix in `hf-build`, re-validate.
- **`render.sh` rejects an AR** ("does not match the composition orientation") → that AR is a re-author;
  go back to `hf-build` (phase 5) with the target root dims, then re-render.
- **Silent MP4 when VO was requested** → the `<audio>` isn't a direct child of the root; fix in `hf-build`.
- **VO model unreachable** (`ai-gen` returns `success:false`) → per the reachability gate, do not silently
  substitute: render silent and say so in `06-summary.md`, or STOP and ask if the user required narration.
- **No project yet** → run `onboarding` first (phase 0); hf-studio resumes from `state.md` thereafter.

## Quality Criteria
- [ ] Every phase 1–7 artifact exists at its `artifacts/<project-name>/NN-<phase>` path (the structural gate).
- [ ] The composition passed `hf-validate` (0 lint errors) BEFORE render; no unvalidated render.
- [ ] One verified MP4 per requested AR; vision grade confirms legible, composed, on-brand, varied motion.
- [ ] `06-summary.md` records the resolved voice/style/palette/ARs and any fallback taken.
- [ ] Re-entry preserves upstream facts (restyle/resize never alters on-screen text/numbers); new exports
      sit beside the originals.
- [ ] 100% local + keyless — no HeyGen cloud/lambda/auth was used anywhere in the chain.
