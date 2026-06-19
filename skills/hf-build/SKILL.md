---
name: hf-build
description: Author a HyperFrames HTML/CSS/GSAP video composition from a storyboard and timing data. Copies a bundled, contract-compliant, lint-clean starter project (vendored GSAP + system fonts), then writes the scene HTML/CSS and the master GSAP timeline per 03-storyboard.md and 04-timing.json. Use during the BUILD phase (phase 5) of a motion-graphics project, or on a RESTYLE (re-author the composition from unchanged facts). Produces the composition/ directory that hf-validate and hf-render consume. Offline-safe and deterministic; no HeyGen cloud.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [hf-concept, hf-script, hf-storyboard, hf-voiceover, hf-assets]
  inputs:
    - name: storyboard
      type: markdown
      required: true
      description: artifacts/<project-name>/03-storyboard.md — per-beat blocks, transitions, track layout, frame ranges, on-screen text.
    - name: concept
      type: markdown
      required: true
      description: artifacts/<project-name>/01-concept.md — the 6-dimension base concept (palette + hex, typography, composition, mood) the composition is themed to.
    - name: timing
      type: json
      required: false
      description: artifacts/<project-name>/04-timing.json — word-level timestamps for caption sync and beat timing. Optional (silent / no-caption videos omit it).
    - name: assets
      type: x-dir
      required: false
      description: artifacts/<project-name>/assets/ — voiceover wavs, cutouts, captures referenced by clips. Optional.
  outputs:
    - name: composition
      type: html
      path: artifacts/<project-name>/composition/
      description: A complete HyperFrames project (index.html + compositions/ + vendored gsap + system-font CSS) that lints with 0 errors and obeys the composition contract.
---

# hf-build — author the HyperFrames composition

## Purpose
Turn the frozen plan (`03-storyboard.md` + `04-timing.json`, themed to `01-concept.md`) into a real
HyperFrames project under `artifacts/<project-name>/composition/`: scene HTML/CSS plus one master GSAP
timeline. You do NOT start from a blank page — you copy a **bundled, contract-compliant, lint-clean
starter** (`scripts/hf-template/`, with **vendored GSAP** and **system fonts** already wired) and author
the scenes into it. The output is the directory `hf-validate` lints and `hf-render` renders.

`$SKILL` below = this skill's directory.

## When to use
- **Build** (phase 5): after the storyboard + timing exist, before validate/render.
- **Restyle** (JTBD-4): re-author the composition from the SAME `02-script.md`/`03-storyboard.md` facts —
  change palette/fonts/motion, never the facts. Re-scaffold with `--force` or edit in place.
- Do NOT use to render (that is `hf-render`) or to write the script/storyboard (those are upstream skills).

## Inputs
- `artifacts/<project-name>/03-storyboard.md` (required) — the beat → block/transition/track plan.
- `artifacts/<project-name>/01-concept.md` (required) — palette (hex), typography, composition, mood.
- `artifacts/<project-name>/04-timing.json` (optional) — word timings; absent for silent/no-caption cuts.
- `artifacts/<project-name>/assets/` (optional) — media referenced by clips.
- **Missing required input** (no storyboard or concept): record the failure in `state.md` and stop —
  do not invent a storyboard. **Missing optional**: proceed (no captions / no media), and note it.

## Instructions

### 1. Read the plan
Read `01-concept.md` (palette + hex, display/text fonts, composition system, mood) and `03-storyboard.md`
(each beat: block category, transition, track index, frame/second range, exact on-screen text). If
present, read `04-timing.json` for word timings. Pull on-screen text verbatim from the storyboard/script
— never invent or restate the narration as on-screen copy.

### 2. Scaffold from the bundled template
```bash
bash "$SKILL/scripts/init.sh" artifacts/<project-name>/composition
# (re-author / restyle in place: add --force)
```
This copies `hf-template/` (vendored `assets/gsap.min.js`, `assets/fonts.css`, a lint-clean example
`index.html`) into the composition dir and lints it (expect **0 errors**, 1 benign
`gsap_studio_edit_blocked` warning). You now have a known-good baseline.

### 3. Author the scenes (honor the contract)
Edit `index.html` (and add `compositions/<name>.html` sub-compositions if a track gets dense). Replace
the example scenes with your storyboard beats. **Follow `references/composition-contract.md` exactly** —
the load-bearing rules:
- One explicitly-sized root `<div data-composition-id data-width data-height data-duration>` in `<body>`;
  `data-duration` = the longest clip's end.
- Every timed element: `class="clip"` + `data-start` + `data-duration` + `data-track-index`. Same track =
  **no time overlap, and no shared boundary** — author durations a hair short (e.g. `5.97` for a 6 s slot)
  so adjacent clips don't touch. Overlays (captions, lower-thirds, transitions) go on their own track index.
- **One** `gsap.timeline({paused:true})`, built synchronously, registered `window.__timelines["<id>"]`.
- **Deterministic:** no `Math.random`/`Date.now`/`performance.now` (seeded PRNG only); no `repeat:-1`.
- Animate **opacity + transforms only**; never `display`/`visibility`/layout props. Initial hidden = CSS
  `opacity:0`. Counters animate a proxy → `tabular-nums` DOM write in `onUpdate`.
- Fonts: literal family names in `font-family` (e.g. `"Inter", system-ui, sans-serif`) — **never a
  `var()` in font-family** (lint can't resolve it). `assets/fonts.css` already declares the `@font-face`s.
- **No tag-like tokens inside HTML comments** (a `<body>` or `<div ...>` in a comment breaks the linter's
  root detection).

### 4. Theme + motion + transitions
- **Theme to `01-concept.md`:** override the template's `:root` palette tokens to the concept hex; set
  the display/text faces to the concept's typography (literal family names from the wired set: Inter,
  Outfit, Anton, Fraunces, Space Grotesk). Prefer **radial** gradients on dark backgrounds (linear bands
  under H.264).
- **Reuse-first:** for captions / data-viz / lower-thirds / social overlays, prefer a registry block over
  hand-writing (`references/registry-blocks.md`: `hyperframes add <id>`, then retheme). Hand-author from
  `references/motion-rules.md` only when no block fits, or if the registry is unreachable (a failed `add`
  never blocks the render — GSAP/fonts are local).
- **Motion (`references/motion-rules.md`):** layout-before-animation, offset the first tween 0.1–0.3 s,
  vary ≥3 eases per scene, entrances on every element, exits only on the final scene; put each scene
  transition on its own track index (e.g. the bundled `liquid-wipe`).

### 5. Lint until clean (the gate)
```bash
cd artifacts/<project-name>/composition && npx --yes hyperframes@0.6.112 lint
```
Fix every error to **0**. Common ones and fixes are in `references/composition-contract.md`
(`timed_element_missing_clip_class` → add `class="clip"`; `overlapping_clips_same_track` → gap the
boundary or change track; `font_family_without_font_face` → use a literal family, not `var()`;
`root_missing_*` with a `<body>` snippet → a tag token is hiding in an HTML comment). The
`gsap_studio_edit_blocked` warning is expected and fine. Leave the project at 0 errors for hf-validate.

## Outputs
- `artifacts/<project-name>/composition/` — the complete HyperFrames project: `index.html`, any
  `compositions/*.html` sub-compositions, `assets/gsap.min.js` (vendored), `assets/fonts.css`,
  `hyperframes.json`, `package.json`. Lints with **0 errors**; obeys the composition contract.

## Examples

### Example 1: 15 s API-feature teaser (JTBD-1)
Storyboard: title card → 2 benefit beats → stat (latency drop) → CTA, liquid-wipe between scenes.
Actions: `init.sh` → edit `index.html` to 5 scene clips on track 0 (durations gapped) + a wipe on track 1
→ theme to the concept's electric-blue palette + Anton display → counter for the stat with `expo.out` →
lint to 0 → hand off to hf-validate.

### Example 2: revenue data-viz (JTBD-2)
`hyperframes add bar-racer` (or hand-author bars), bind the 4 quarterly figures from the storyboard to
bar widths via `scaleX` + counters with `tabular-nums`; the displayed numbers MUST equal the input data.

### Example 3: restyle to bold + 9:16 (JTBD-4)
Re-scaffold with `--force` (or edit in place), keep the on-screen text byte-identical, swap the palette to
the bolder concept + heavier fonts, set the root to `1080×1920`, re-lint. Facts unchanged.

## Troubleshooting
- **`hyperframes lint` shows `root_missing_composition_id` with snippet `<body>`** → a comment contains a
  tag-like token (e.g. `<!-- ... in <body> -->`). Rephrase the comment without `<...>` tags.
- **`overlapping_clips_same_track` on adjacent clips** → shared boundaries count as overlap; shorten the
  earlier clip's `data-duration` (e.g. 6 → 5.97) or move one to another track index.
- **Text invisible / wrong font** → you used `var(--font-x)` in `font-family`; use the literal family
  name with a generic fallback. Confirm `assets/fonts.css` is linked.
- **Registry `add` fails (no network)** → hand-author the block from `motion-rules.md`; the render is
  still fine (GSAP + fonts are local).

## Quality Criteria
- [ ] `composition/` lints with **0 errors** (the `gsap_studio_edit_blocked` warning is acceptable).
- [ ] One root with explicit `data-width`/`data-height`/`data-duration`; one paused, registered timeline.
- [ ] Every timed element has `class="clip"` + start/duration/track; no same-track time/boundary overlap.
- [ ] Deterministic (no `Math.random`/`Date.now`; no `repeat:-1`); animates opacity/transforms only.
- [ ] Themed to `01-concept.md` (palette hex + typography); on-screen text taken verbatim from the storyboard.
- [ ] ≥3 eases per scene; entrances on every element; a real scene transition (not just a fade).
