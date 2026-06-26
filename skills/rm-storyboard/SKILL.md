---
name: rm-storyboard
description: "Turn a base concept and a beat-structured script into a per-beat build contract for a Remotion (React) motion-graphics video. For each beat it names the engine primitive(s)/component(s) to use (RiseIn/FadeIn/Counter/Bar/Card + capability components), the composition structure and transition out ([Series]/[TransitionSeries] with fade/slide/wipe/flip/clockWipe), the layer layout (scene base Sequence + each overlay as its own nested [Sequence from/durationInFrames]), and the frame/second ranges — the exact plan rm-build authors React from. Use during the STORYBOARD phase (phase 3), after rm-script wrote the script, before rm-build authors the composition. Maps narrative beats and data series onto the bundled Remotion engine + the installed @remotion/* packages; offline, deterministic, NO rendering."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [rm-concept, rm-script]
  inputs:
    - name: concept
      type: markdown
      required: true
      description: "artifacts/[project]/01-concept.md — the 6-dimension base concept (subject, composition, style, palette+hex, typography, mood) the storyboard themes to."
    - name: script
      type: markdown
      required: true
      description: "artifacts/[project]/02-script.md — the beat-structured script (VO line + on-screen text + any stat/quote/credit per beat). Facts here are frozen."
    - name: timing
      type: json
      required: false
      description: "artifacts/[project]/04-timing.json — word-level timestamps (@remotion/captions-shaped). Optional; when present, snap each beat's frame range to its spoken VO line so captions and beats align."
    - name: aspect-ratios
      type: text
      required: false
      description: "Any of 16:9, 9:16, 1:1 (space/comma separated). Default = onboarding/context default, else 16:9 (9:16 for a JTBD-3 caption cut). Selects the [Composition] id (Studio-16x9 / -9x16 / -1x1) and the per-orientation SafeZone notes."
  outputs:
    - name: storyboard
      type: markdown
      path: artifacts/[project]/03-storyboard.md
      description: "Per-beat build contract — for every beat the engine primitive(s)/component(s), the structure + transition out, the layer layout (base Sequence + overlay Sequences with z-order), the frame/second range, and the verbatim on-screen text, plus the composition header (Composition id + root size per AR, durationSeconds/durationInFrames, palette/fonts/seed from the concept)."
---

# rm-storyboard — beats → the per-beat Remotion build contract

## Purpose
Convert the frozen plan (`01-concept.md` + `02-script.md`) into `artifacts/<project>/03-storyboard.md`:
a **per-beat build contract** that tells `rm-build` exactly what React to author — for **every beat**,
which **engine primitive(s)/component(s)** to use, the **composition structure** that wraps the scene
and the **transition out** of it, the **layer layout** (the scene's base `<Sequence>` plus each overlay
as its own nested `<Sequence>`), and the **frame/second range** — themed to the base concept. This is
the "design before you build" step: **no React is written here and nothing renders**, but the storyboard
fixes every authoring decision so the composition is deterministic and reuse-first (an engine primitive
or installed `@remotion/*` block wherever one fits). `rm-build` reads this file 1:1 to assemble the
frame-budgeted authoring prompt.

`$SKILL` below = this skill's directory.

## When to use
- **Storyboard** (phase 3): after `rm-script` wrote `02-script.md`, before `rm-build`. Runs on **all**
  JTBDs.
- **Data video** (JTBD-2): the script carries a data narrative — map each series onto a data-viz
  component (`BarChart` / `LineChart` / `Counter`) and lay out the data scenes; copy the exact figures.
- **Caption/social cut** (JTBD-3): the script is transcript-derived — lay out a `CaptionOverlay` block
  (reads `04-timing.json`) as its own overlay `<Sequence>` over the `<OffthreadVideo>`, plus any social
  overlay (handle chip / lower-third).
- Do NOT use to write the script (that is `rm-script`), to author React (that is `rm-build`), or to
  render (that is `rm-render`). This skill writes **markdown only**.

## Inputs (read before write)
- `artifacts/<project>/01-concept.md` (required) — palette+hex, display/body fonts, composition system,
  mood. The storyboard's theming notes (and the composition-header palette/fonts/seed) come from here.
- `artifacts/<project>/02-script.md` (required) — the ordered beats with VO + on-screen text + any
  stat/quote/credit. The storyboard has **exactly one beat row per script beat**, in order.
- `artifacts/<project>/04-timing.json` (optional) — word timings; when present, snap each beat's frame
  range to when its VO line is spoken. Absent → distribute beats by the pacing rule below and say so.
- aspect ratios (optional) — default to the onboarding/context default, else `16:9` (`9:16` for a pure
  JTBD-3 caption cut). State which you used.
- **Missing required input** (no concept or script): record the failure in `state.md` and stop — never
  invent beats or a concept. **Missing optional**: proceed (pace by word count; default AR) and note it.

## Reference material (cited, not auto-loaded)
- **Beat → block decision menu** (`references/beat-to-block.md`) — which Remotion building block each
  kind of script beat maps to, the transition-per-beat menu, the layer-layout rules, and the AR →
  Composition-id/root/SafeZone table. Read this to *choose*.
- **The Remotion-block catalog** (`references/remotion-blocks.md`) — the full vocabulary `rm-build`
  authors from: the bundled engine primitives (`RiseIn`/`FadeIn`/`Counter`/`Bar`/`Card`/`DividerWipe`/
  `KenBurns`), the capability components (`CaptionOverlay`/`BarChart`/`LineChart`/`Spectrum`), the
  structure primitives (`<Series>`/`<TransitionSeries>`/`<Sequence>`), the `@remotion/transitions`
  presets, and which `@remotion/*` packages back each (all are **pre-bundled at 4.0.473 — no `add`**).
- The **composition contract** the layout must obey is `rm-build`'s authority; if present, read
  `../rm-build/references/composition-contract.md` (frame-driven, clamped interpolate, `staticFile()`,
  one `<Composition>` per AR, timeline ends exactly at `durationInFrames`). The storyboard never
  violates it (e.g. a different AR is a separate composition, never a flag).

## Instructions

### 1. Read the plan + resolve parameters
Read `01-concept.md` (palette+hex, display/body fonts, composition system, mood) and `02-script.md`
(the ordered beats). If present, read `04-timing.json`. Resolve **aspect ratio(s)** (explicit → context
→ `16:9`) and map each to its bundled `<Composition>`:
`16:9 → Studio-16x9 (1920×1080)`, `9:16 → Studio-9x16 (1080×1920)`, `1:1 → Studio-1x1 (1080×1080)`.
A **different orientation is a different `<Composition>`**, never a render flag — write one
composition-header + layer-layout block per orientation (rm-build re-authors per orientation;
`--scale` only upscales the same orientation, it cannot rotate). FPS is **always 30**.

### 2. (optional) List the available building blocks
Unlike HyperFrames there is **no registry to fetch** — the vocabulary is the bundled starter's engine +
the installed `@remotion/*` packages, all already at 4.0.473. To print what's available before you
assign blocks:
```bash
bash "$SKILL/scripts/catalog.sh"                       # introspects the bundled starter (or the project)
bash "$SKILL/scripts/catalog.sh" artifacts/<project>/remotion-project   # explicit project path
```
`catalog.sh` lists the engine primitives (`grep` of `src/engine/primitives.tsx`), any library presets
(`src/library/`), the capability components already authored into `src/`, and the installed
`@remotion/*` packages + transition presets. It **never blocks** — on any error it points you at the
catalog in `references/remotion-blocks.md` (which is the authoritative list `rm-build` authors from
anyway) and exits 0.

### 3. Compute the beat timeline (frame ranges)
Lay the beats end-to-end across the target duration. **30 fps; `frame = round(seconds × 30)`.**
- **With `04-timing.json`:** set each beat's `[start, end)` from when its VO line is spoken (group the
  word timings by beat). A beat's range = first-word-start → last-word-end of that beat's line, so the
  visual beat and the spoken line align and captions sync naturally.
- **Without timing:** pace by `seconds ≈ max(0.9, words / 2.5)` per beat (a readable on-screen dwell),
  scaled proportionally to hit the target duration. Aim ~3–4 beats per 5 s. State this default.
- Give **both seconds and frames** in every row. The composition's `durationSeconds` = the last beat's
  end second; `durationInFrames = round(durationSeconds × 30)` (rm-build's `calculateMetadata` derives
  it). **Transitions shorten the timeline**: a `<TransitionSeries.Transition durationInFrames={T}>`
  overlaps its two neighbours by `T`, so the composition total = `Σ scene budgets − Σ transition T`.
  Account for this so the storyboard's stated `durationInFrames` is the *rendered* length (contract:
  timeline ends exactly at `durationInFrames`).

### 4. Assign blocks, structure+transition, and layer layout (the contract — per beat)
For **every beat**, decide and record all four of these (a beat is incomplete without all four):
- **Block(s)/component(s)** — pick from `references/remotion-blocks.md`. Reuse-first: engine primitives
  for openers/benefits/lists (`RiseIn`/`FadeIn`/`DividerWipe`/`Card`); `Counter` (+`Bar`) for a single
  number; `BarChart`/`LineChart` for a series; `CaptionOverlay` for captions; a lower-third/handle-chip
  for straps; `Spectrum`/`Waveform` for audio-reactive. Author-fresh is allowed only when no block fits
  — say "author-fresh" and the motion approach (`interpolate`+`Easing.bezier`, or a named `spring`
  damping). Name the optional **easing/spring** hint (e.g. `spring damping 14` for a bouncy logo,
  `Easing.bezier(0.16,1,0.3,1)` for a calm reveal) — rm-build passes it into the prompt.
- **Structure + transition (out)** — which composition primitive wraps this beat (`<Series.Sequence>`
  for a back-to-back cut, `<TransitionSeries.Sequence>` when the cut into the next beat is animated) and
  the **transition out**: a `@remotion/transitions` preset — `fade()` / `slide({direction})` / `wipe()`
  / `flip()` / `clockWipe()` — with a `timing` (`linearTiming({durationInFrames})` or
  `springTiming({config:{damping}})`). The **final** beat has no transition out (`— (final)`). Vary
  transitions across the video; don't `fade()` every cut. Remember every transition shortens the total.
- **Layer layout** — the Remotion analog of "tracks". The **scene content is the beat's base
  `<Sequence>`/`<Series.Sequence>`**. **Each overlay** (caption, lower-third, source-credit, watermark)
  is **its own nested `<Sequence from={…} durationInFrames={…} layout="none" premountFor={…}>`** stacked
  above the scene via `<AbsoluteFill>`/`z-index`. State each layer + its z-order, e.g.
  `base: TitleCard · overlay z1: lower-third (Sequence from 0)`. (There is no track-index in Remotion —
  ordering/overlap is `from`+`durationInFrames`; stacking is plain CSS `z-index`.)
- **Frame range** — `[start_f–end_f] (start_s–end_s)` from step 3; note any transition overlap.

### 5. Pull the on-screen text verbatim
For each beat copy the **on-screen text from `02-script.md` exactly** — never the VO line, never invented
copy, never paraphrased. On-screen text is the headline/keyword, not the narration. For data beats, copy
the **exact figures** (and units) the script carries — these become the props rm-build binds and **must
match the input data** (no rounding the user didn't ask for; `tabular-nums` on every animated counter).
Mark emphasis phrases the build should highlight.

### 6. Write 03-storyboard.md
Write the contract to `artifacts/<project>/03-storyboard.md` with this shape:

```markdown
# Storyboard — <project>

## Composition
- Aspect ratio(s): 16:9 → <Composition id="Studio-16x9"> (root 1920×1080, 30 fps)   # one block per AR
- Duration: durationSeconds 12.0 → durationInFrames 360 (after −15f fade overlap = 345 rendered)
- Palette (from 01-concept.md): brand.bg #06141b · brand.accent #22d3ee · brand.accentAlt #3b82f6
  (engine Palette also derives text/surface; literal hex, no names)
- Fonts (from 01-concept.md): fontPack "bold"  (or @remotion/google-fonts "Inter", weights 400/700, subset latin)
- Seed: 1   (determinism — fixed unless varied)
- Defaults applied: AR defaulted to 16:9; paced from word counts (no 04-timing.json)

## Beats (16:9)
| # | beat (on-screen text, verbatim) | block(s)/component | structure + transition out | layer layout | frames (s) |
|---|---|---|---|---|---|
| 1 | "Ship faster." (kicker PRODUCT) | TitleCard = RiseIn + DividerWipe | TransitionSeries.Sequence → fade(), linearTiming 15f | base: TitleCard | 0–108 (0.0–3.6) |
| 2 | "47% fewer 429s" (stat) | Counter{to:47} + Bar | TransitionSeries.Sequence → slide(from-right), 18f | base: StatScene · overlay z1: source-credit (Sequence from 60) | 108–252 (3.6–8.4) |
| 3 | "Try it free" (CTA) | RiseIn (CTA) + Card | Series.Sequence — (final) | base: OutroCard | 252–360 (8.4–12.0) |

## Notes for rm-build
- Theme every block to the palette/fonts above (brand.* props + fontPack; literal hex, weights+subset).
- Easing: scene 1 spring damping 14 (bouncy headline); scenes 2–3 Easing.bezier(0.16,1,0.3,1) (calm).
- All @remotion/* are pre-bundled at 4.0.473 — NO `add`. Emphasis: "47%", "free".
- Author-fresh only where the table says so; otherwise compose the named engine primitives.
```
Keep on-screen text in the table **verbatim from the script**. Every beat row MUST have a non-empty
block, structure+transition (or "— (final)"), layer layout, and frame range — this is what rm-build and
the eval gate check.

### 7. Summarize + advance
State the resolved AR(s) + Composition id(s), the durationSeconds/durationInFrames, the blocks chosen,
and any defaults applied (AR, word-paced timing). Mark `state.md` phase 3 done and set phase 4/5 next;
update `dashboard.md`. Remember.

## Outputs
- `artifacts/<project>/03-storyboard.md` — the per-beat build contract: the composition header
  (Composition id + root size per AR, durationSeconds/durationInFrames, palette/fonts/seed from the
  concept) + a beat table where **every beat names its block(s)/component, structure + transition out,
  layer layout, and frame range**, with verbatim on-screen text, plus build notes (theming + easing +
  the "no `add`, all bundled" reminder). **No React, no render** — markdown only.

## Examples

### Example 1: 12 s API-feature teaser (JTBD-1)
Script beats: hook → stat (47%) → CTA. Storyboard: a `TitleCard` (`RiseIn`+`DividerWipe`) hook in a
`<TransitionSeries.Sequence>` with a `fade()` out; a stat beat (`Counter{to:47}`+`Bar`, `tabular-nums`)
with a `slide()` out and a `source-credit` overlay on its own nested `<Sequence from={60}>`; a `CTA`
`Card` final beat with no transition. Frames 0–360 @ 30 fps; on-screen text + the "47%" figure copied
verbatim. (This is the PoC shape.)

### Example 2: revenue data video (JTBD-2)
Four quarterly figures. Map Q1–Q4 onto a `BarChart` (one beat, bars spring-grown via `Bar`) plus a
`Counter` for the headline total; a `source-credit` overlay as its own `<Sequence>`. Each bar's value =
the exact figure from the script (verbatim, units kept). Transition `wipe()` between the setup scene and
the chart scene; `Series.Sequence` (no transition) into the final card.

### Example 3: 9:16 caption cut (JTBD-3)
Transcript-derived script + `04-timing.json`. Beats snap to spoken phrases. Layout: the clip on the base
`<OffthreadVideo>` layer, a `CaptionOverlay` (`@remotion/captions`, reads the word timings) on its OWN
nested `<Sequence>` above it, plus a `handle-chip` on a further overlay `<Sequence>`. Composition
`Studio-9x16` (1080×1920); note the vertical SafeZone (captions in the lower third, clear of platform
UI). Snap each beat's frames to its phrase from the timing.

## Troubleshooting
- **A beat is missing a block / structure+transition / layer / frames** → the row is incomplete; rm-build
  can't author it and the eval fails. Fill all four for every beat (the final beat's transition is
  "— (final)").
- **Used "track index" / "data-track-index"** → that's HyperFrames vocabulary; Remotion has no tracks.
  Express overlays as nested `<Sequence from/durationInFrames layout="none">` layers with a `z-index`.
- **durationInFrames doesn't match the rendered length** → you forgot transitions shorten the timeline.
  Total = `Σ scene budgets − Σ transition durationInFrames`. Restate the rendered total.
- **`catalog.sh` can't find the project** → it falls back to the bundled starter and still lists the
  blocks; if even that fails, use `references/remotion-blocks.md` — a failed catalog never blocks the
  storyboard.
- **Two aspect ratios requested** → write one composition header + layer layout per orientation (a
  different orientation is a separate `<Composition>` rm-build re-authors; SafeZones differ).
- **A "restyle" implies new facts** → stop; facts are frozen (`02-script.md` owns them). Escalate to a
  fresh JTBD-1/2 run rather than inventing figures in the storyboard.

## Quality criteria
- [ ] Every beat from `02-script.md` has exactly one storyboard row, in order.
- [ ] Every beat names block(s)/component, a structure + transition out (or "— (final)"), a layer layout
      (base `<Sequence>` + overlays as their own nested `<Sequence>` with z-order), and a frame range in
      BOTH seconds and frames.
- [ ] On-screen text is copied verbatim from the script (no VO lines, no invented copy); data figures
      match the input exactly (units kept).
- [ ] Only the FINAL beat has no transition out; non-final beats each name a `@remotion/transitions`
      preset + timing. Transition overlaps are accounted for in the stated `durationInFrames`.
- [ ] The composition header records the `<Composition>` id + root size per AR, FPS 30,
      durationSeconds/durationInFrames, the palette hex + fonts + seed from `01-concept.md`.
- [ ] A different aspect ratio gets its OWN composition header + layer layout (separate `<Composition>`),
      with its own SafeZone notes. Defaults (AR, word-paced timing) are stated.
