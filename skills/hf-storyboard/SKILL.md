---
name: hf-storyboard
description: Turn a base concept and a beat-structured script into a per-beat build contract for a HyperFrames motion-graphics video. For each beat it names the registry block(s)/component(s) to use, the scene transition out of it, the track layout (which track index each element sits on), and the frame/second ranges — the exact plan hf-build authors from. Use during the STORYBOARD phase (phase 3) of a motion-graphics project, after hf-script wrote the script, before hf-build authors the composition. Maps narrative beats and data series onto the contract-compliant block library; offline, deterministic, no HeyGen.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [hf-concept, hf-script]
  inputs:
    - name: concept
      type: markdown
      required: true
      description: artifacts/<project-name>/01-concept.md — the 6-dimension base concept (subject, composition, style, palette+hex, typography, mood) the storyboard themes to.
    - name: script
      type: markdown
      required: true
      description: artifacts/<project-name>/02-script.md — the beat-structured script (VO line + on-screen text + any stat/quote/credit per beat).
    - name: timing
      type: json
      required: false
      description: artifacts/<project-name>/04-timing.json — word-level timestamps. Optional; when present, snap beat frame ranges to the VO so captions and beats align.
    - name: aspect-ratios
      type: text
      required: false
      description: Any of 16:9, 9:16, 1:1 (space/comma separated). Default = onboarding/context default, else 16:9. Drives safe-zone + track-layout notes per orientation.
  outputs:
    - name: storyboard
      type: markdown
      path: artifacts/<project-name>/03-storyboard.md
      description: Per-beat build contract — for every beat the block/component ids, the transition out, the track layout, the frame/second range, and the verbatim on-screen text, plus the composition header (root size per AR, duration, palette/type from the concept).
---

# hf-storyboard — beats → the per-beat build contract

## Purpose
Convert the frozen plan (`01-concept.md` + `02-script.md`) into `artifacts/<project-name>/03-storyboard.md`:
a **per-beat build contract** that tells `hf-build` exactly what to author — for **every beat**, which
**registry block(s)/component(s)** to use, the **transition** out of the scene, the **track layout**
(which `data-track-index` each element occupies), and the **frame/second range** — themed to the base
concept. This is the "design before you build" step: no HTML is written here, but the storyboard fixes
every authoring decision so the composition is deterministic and reuse-first (a block per element wherever
one fits). `hf-build` reads this file 1:1.

`$SKILL` below = this skill's directory.

## When to use
- **Storyboard** (phase 3): after `hf-script` wrote `02-script.md`, before `hf-build`.
- **Data video** (JTBD-2): the script carries a data narrative — map each series onto a data-viz block
  (counter / bar-racer / ring / metric-grid) and lay out the data scenes.
- **Caption/social cut** (JTBD-3): the script is transcript-derived — lay out a captions block (rail/embed)
  on its own overlay track over the media, plus any social-overlay block.
- Do NOT use to write the script (that is `hf-script`) or to author HTML (that is `hf-build`).

## Inputs
- `artifacts/<project-name>/01-concept.md` (required) — palette+hex, display/text fonts, composition
  system, mood. The storyboard's theming notes come from here.
- `artifacts/<project-name>/02-script.md` (required) — the ordered beats with VO + on-screen text + any
  stat/quote/credit. The storyboard has **exactly one row per beat**, in order.
- `artifacts/<project-name>/04-timing.json` (optional) — word timings; when present, snap beat boundaries
  to the VO so a beat's frame range matches when its line is spoken. Absent → distribute beats by the
  pacing rule below.
- aspect ratios (optional) — default to the onboarding/context default, else `16:9`. State which you used.
- **Missing required input** (no concept or script): record the failure in `state.md` and stop — never
  invent beats or a concept. **Missing optional**: proceed (pace by word count; default AR) and note it.

## Reference material (cited, not auto-loaded)
- **Beat → block decision menu** (this skill's own): `references/beat-to-block.md` — which block each kind
  of script beat maps to, the transition-per-beat menu, the track-layout rules, and the AR → root/safe-zone
  table. Read this to *choose*; read the shared references below for the exact ids + rules.

The block catalog and the contract facts live in the shared `hf-build` references — read them when you
need the exact block ids / track rules:
- **Registry blocks + how to wire them**: `../hf-build/references/registry-blocks.md` (the category →
  block-id table: title cards, data-viz, captions, lower-thirds, transitions, social overlays).
- **Scene transitions** (the exits between scenes): the "Scene transitions" section of
  `../hf-build/references/motion-rules.md` (`liquid-wipe`, `flash-white`, `iris`, `push`, `block-wipe`).
- **Track/clip + safe-zone rules** the layout must obey: `../hf-build/references/composition-contract.md`
  (§2 clips & tracks — same track = no time/boundary overlap; overlays on their own track index).

## Instructions

### 1. Read the plan + resolve parameters
Read `01-concept.md` (palette+hex, display/text fonts, composition system, mood) and `02-script.md` (the
ordered beats). If present, read `04-timing.json`. Resolve **aspect ratio(s)** (explicit → context →
`16:9`) and map names to root sizes: `16:9 → 1920×1080`, `9:16 → 1080×1920`, `1:1 → 1080×1080`. A
**different orientation is a different composition** — note one track-layout/safe-zone plan per orientation
(hf-build re-authors per orientation; `--resolution` only upscales the same orientation, it cannot rotate).

### 2. (optional) Browse the live registry
The bundled template already ships a title-card, a data-viz stat reveal, and a `liquid-wipe` — those need
no `add`. To check what else the registry offers before you pick block ids:
```bash
cd artifacts/<project-name>/composition 2>/dev/null && bash "$SKILL/scripts/catalog.sh"
# or, before the composition dir exists, from anywhere:
bash "$SKILL/scripts/catalog.sh"
```
`catalog.sh` runs `hyperframes catalog` and prints the available block/component ids. If the registry is
unreachable (offline sandbox), it says so and exits cleanly — fall back to the category → id table in
`../hf-build/references/registry-blocks.md` (those are the ids hf-build hand-authors from anyway, so a
failed catalog never blocks the storyboard).

### 3. Compute the beat timeline (frame ranges)
Lay the beats end-to-end across the target duration.
- **With `04-timing.json`:** set each beat's `[start, end)` from when its VO line is spoken (group the
  word timings by beat). The beat range = first word start → last word end of that beat's line.
- **Without timing:** pace by `seconds ≈ max(0.9, words / 2.5)` per beat (a readable on-screen dwell);
  scale all beats proportionally to hit the target duration. Aim ~3–4 beats per 5 s.
- Give **both seconds and frames** (30 fps: `frame = round(seconds × 30)`). Leave a small gap so adjacent
  same-track clips never share a boundary — author the slot duration a hair short (e.g. a 6 s slot →
  `data-duration 5.97`); the transition overlay covers the seam. Composition `data-duration` = the last
  beat's end.

### 4. Assign blocks, transitions, and track layout (the contract — per beat)
For **every beat**, decide and record all four of these (a beat is incomplete without all four):
- **Block(s)/component(s)** — pick from the category table (`../hf-build/references/registry-blocks.md`).
  Reuse-first: a `title-card` for the opener, `stat-counter`/`bar-racer`/`progress-ring`/`metric-grid` for
  numbers, `caption-rail`/`caption-embed` for captions, `lower-third`/`source-credit` for straps, a
  social-overlay block for social cuts. Hand-authored is allowed only when no block fits — say "hand-author"
  and which motion rule (`../hf-build/references/motion-rules.md`).
- **Transition (out)** — the exit into the next beat (`liquid-wipe` is the bundled default; or `flash-white`
  / `iris` / `push` / `block-wipe`). The **final** beat has no transition out (it ends the video). Entrances
  belong to the scene; only the final scene gets explicit exits.
- **Track layout** — which `data-track-index` each element sits on. **Scene content on the scene track**
  (e.g. track 0). **Overlays (captions, lower-thirds, the transition) each on their own track index** so
  they never time-overlap the scene clip (`../hf-build/references/composition-contract.md` §2). State a
  track per element, e.g. `track 0: title-card · track 1: lower-third · track 2: liquid-wipe`.
- **Frame range** — `[start_s–end_s] / [start_f–end_f]` from step 3.

### 5. Pull the on-screen text verbatim
For each beat copy the **on-screen text from `02-script.md` exactly** — never the VO line, never invented
copy, never paraphrased. On-screen text is the headline/keyword, not the narration. For data beats, copy
the **exact figures** (and units) the script carries; these are the numbers hf-build binds — they must
match the input data. Mark emphasis phrases the build should highlight.

### 6. Write 03-storyboard.md
Write the contract to `artifacts/<project-name>/03-storyboard.md` with this shape:

```markdown
# Storyboard — <project>

## Composition
- Aspect ratio(s): 16:9 (root 1920×1080)        # one line per AR; a different orientation = a separate layout below
- Duration: 15.0 s (450 frames @ 30 fps)
- Palette (from 01-concept.md): bg #0B1F3A · accent #4F8BFF · neutral #E8EEF5
- Type (from 01-concept.md): display "Anton", text "Inter"
- Defaults applied: AR defaulted to 16:9; paced from word counts (no 04-timing.json)

## Beats
| # | beat (on-screen text, verbatim) | block(s)/component | transition out | track layout | frames (s) |
|---|---|---|---|---|---|
| 1 | "Ship faster." (kicker: PRODUCT) | title-card | liquid-wipe | t0 title-card · t1 wipe | 0–90 (0.0–3.0) |
| 2 | "47% fewer 429s" (stat) | stat-counter + progress-ring | flash-white | t0 stat · t1 ring · t2 flash | 90–270 (3.0–9.0) |
| 3 | "Try it free" (CTA) | cta-button + source-credit | — (final) | t0 cta · t1 credit | 270–450 (9.0–15.0) |

## Notes for hf-build
- Theme every block to the palette/type above (override block CSS custom props; literal font families).
- Emphasis phrases to highlight: "47%", "free".
- Reuse the bundled title-card + stat reveal + liquid-wipe; `hyperframes add progress-ring cta-button`.
```
Keep on-screen text in the table **verbatim from the script**. Every beat row MUST have a non-empty
block, transition (or "— (final)"), track layout, and frame range — this is what hf-build and the eval
gate check.

### 7. Summarize + advance
State the resolved AR(s), duration, the blocks chosen, and any defaults applied. Mark `state.md` phase 3
done and set phase 4/5 next. If you defaulted the AR or paced without timing, say so. Remember.

## Outputs
- `artifacts/<project-name>/03-storyboard.md` — the per-beat build contract: composition header (root
  size per AR, duration, palette/type from the concept) + a beat table where **every beat names its
  block(s)/component, transition out, track layout, and frame range**, with verbatim on-screen text, plus
  build notes (theming + which blocks to `add`).

## Examples

### Example 1: 15 s API-feature teaser (JTBD-1)
Script beats: hook → benefit → benefit → stat (429s) → CTA. Storyboard: title-card (t0) + liquid-wipe (t1)
for the hook; two text scenes; a `stat-counter` + `progress-ring` data beat (t0/t1) with a `flash-white`;
a `cta-button` + `source-credit` final beat with no transition. Frames paced 0–450 @ 30 fps; on-screen
text + the "47%" figure copied verbatim from the script.

### Example 2: revenue data video (JTBD-2)
Four quarterly figures. Map Q1–Q4 onto a `bar-racer` (one beat, bars staggered) plus a `stat-counter`
for the headline total; lower-third source credit on its own track. Each bar's value = the exact figure
from the script. Transition `push` between the setup scene and the bar scene.

### Example 3: 9:16 caption cut (JTBD-3)
Transcript-derived script + `04-timing.json`. Beats snap to spoken phrases. Layout: media on t0, a
`caption-rail` reading the word timings on t1 (overlay), a `social-frame` + `handle-chip` on t2. Root
1080×1920; note the vertical safe zone (captions in the lower third, clear of platform UI).

## Troubleshooting
- **A beat is missing a block/transition/track/frames** → the row is incomplete; hf-build can't author it
  and the eval fails. Fill all four for every beat (the final beat's transition is "— (final)").
- **Two same-track clips share a boundary** → that lints as overlap in hf-build. Gap the slot duration
  (6 s → 5.97) or move one element to its own track index.
- **Caption/overlay on the scene track** → overlays must each have their own `data-track-index` so they
  don't time-overlap the scene clip. Put captions/lower-thirds/transitions on separate tracks.
- **`catalog.sh` fails (offline)** → use the id table in `../hf-build/references/registry-blocks.md`; a
  failed catalog never blocks the storyboard.
- **Two aspect ratios requested** → write one composition header + layout per orientation (a different
  orientation is a re-authored composition in hf-build; safe zones differ).

## Quality criteria
- [ ] Every beat from `02-script.md` has exactly one storyboard row, in order.
- [ ] Every beat names block(s)/component, a transition out (or "— (final)"), a track layout, and a
      frame range (seconds AND frames).
- [ ] On-screen text is copied verbatim from the script (no VO lines, no invented copy); data figures match.
- [ ] Overlays (captions/lower-thirds/transitions) sit on their own track indices; no same-track
      boundary touching.
- [ ] Composition header records root size per AR, duration, and the palette/type from `01-concept.md`.
- [ ] Defaults (AR, pacing without timing) are stated.
