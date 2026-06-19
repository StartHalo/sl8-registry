# Registry blocks — categories, how to add them, how to wire them

> Reuse-first authoring. For common scene elements, prefer a tested block/component over a hand-written
> timeline — it's faster, consistent, and the main lever against authoring variance. Hand-author only
> when no block fits the storyboard. Categories below map to `03-storyboard.md`'s per-beat block names.

## The two kinds of registry items

- **Block** — a whole sub-composition (its own timed scene). Lives as a `.html` file under
  `compositions/` and is mounted from `index.html` via a clip element with
  `data-composition-src="compositions/<name>.html"`. Has its own root + its own timeline that the host
  composes in.
- **Component** — a snippet (markup + CSS + a GSAP helper). You **paste it into a scene** and **integrate
  its GSAP calls into the master timeline** at the right `data-start`. It is not a separate clip.

## Categories we use (storyboard → block name)

| category | what it is | typical track | example block/component ids |
|---|---|---|---|
| **title cards** | opening / section headers (kicker + headline + rule + brand chip) | scene track | `title-card`, `section-header` |
| **data-viz** | counters, bar races, rings, timelines, stat panels | scene track | `stat-counter`, `bar-racer`, `progress-ring`, `metric-grid` |
| **captions** | word-synced subtitle rail (reads `04-timing.json`) | overlay track | `caption-rail`, `caption-embed`, `karaoke-words` |
| **lower-thirds** | name/title strap, source credit | overlay track | `lower-third`, `source-credit` |
| **transitions** | wipes, flashes, iris, push between scenes | own overlay track | `liquid-wipe`, `flash-cut`, `iris`, `block-wipe` |
| **social overlays** | platform-style frame, handle chip, progress bar, CTA | overlay track | `social-frame`, `handle-chip`, `cta-button`, `progress-bar` |

## How to ADD a block (registry path)

```bash
# inside artifacts/<project-name>/composition/
npx --yes hyperframes@0.6.112 catalog                 # browse available blocks/components
npx --yes hyperframes@0.6.112 add <block-or-component-id>
```

- `catalog` lists what the registry (declared in `hyperframes.json`) offers. `add` writes a block to
  `compositions/<id>.html` (or a component under `compositions/components/`) and pulls any assets.
- **The registry is a public GitHub URL** (`hyperframes.json` → `registry`). It is fetched at *build*
  time, not render time. If the sandbox cannot reach it, `add` fails — fall back to **hand-authoring**
  the block from `motion-rules.md` (or pre-bundle it in the template). The render itself never needs the
  network (GSAP + fonts are local), so a failed `add` only affects authoring, never the render.

## How to WIRE a block into the master composition

**A block (sub-composition):** add a clip in `index.html` on the right track + time, pointing at it:

```html
<div class="clip" data-start="6" data-duration="5.97" data-track-index="0"
     data-composition-src="compositions/stat-counter.html"></div>
```

The block carries its own `<template data-composition-id>` root + timeline; the host seeks both.

**A component (snippet):** paste its markup into the scene, paste its CSS into the scene `<style>`, and
fold its GSAP into the master timeline at the scene's `data-start` (e.g. `tl.from(".ring", {...}, 6.4)`).

## Customize to the base concept

After adding any block, **retheme it** to `01-concept.md`:

- Swap colors to the concept palette (override the block's CSS custom properties or accent classes).
- Swap fonts to the concept's display/text faces (literal family names — see `composition-contract.md` §5).
- Set the copy from `02-script.md` / `03-storyboard.md` (never invent text).
- Re-time its tweens to the beat's `data-start`/`data-duration` and `04-timing.json`.

## Bundled starting point

The bundled template (`hf-build/scripts/hf-template/`) already ships a **title-card** scene, a
**data-viz stat reveal** (counter + bar fill), and a **liquid-wipe** transition, all contract-compliant
and lint-clean. Copy it, keep the scenes you need, and add blocks for the rest. It is the fastest path to
a clean first render.
