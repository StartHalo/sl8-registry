# Composition contract — the non-negotiables every HyperFrames composition must honor

> Shared reference for the `hf-*` skill library. `hf-build` encodes this; `hf-validate` enforces it
> via `hyperframes lint`. Confirmed against `hyperframes@0.6.112` (2026-06-18). The contract is what
> makes a render deterministic and seekable — break it and you get blank frames, clipped glyphs, or
> a lint failure that blocks the render.

## 1. The root composition

- One root element: `<div data-composition-id="..." data-width data-height data-duration>`, placed
  **directly in `<body>`** (a standalone root — NOT wrapped in `<template>`).
- It MUST be **explicitly sized** in CSS: `html, body { width: 1920px; height: 1080px; }` and the root
  fills it. An unsized root collapses to 0 and clips/positions glyphs wrong.
- `data-duration` (seconds) is the composition length. **The timeline length does NOT define duration**
  — `data-duration` does. Set it to the longest clip's end.
- A **sub-composition** root is wrapped in `<template data-composition-id="...">` and mounted from the
  host via `data-composition-src="compositions/<name>.html"`. Use sub-compositions only when a track gets
  dense (lint warns `timeline_track_too_dense` past ~5 timed elements on one track in one file).

## 2. Clips and tracks

- Every **timed element** carries `data-start`, `data-duration`, and `data-track-index`, **and the
  `class="clip"`** — the runtime uses `.clip` to show/hide it by its time range. A timed element WITHOUT
  `class="clip"` lints `timed_element_missing_clip_class` and stays on-screen the whole video.
- `data-start` is seconds (or a ref like `"intro + 2"`). Same `data-track-index` = clips **must not
  overlap in time** (lint `overlapping_clips_same_track`). **Shared boundaries count as overlap** — a
  clip `[0,6)` and a clip starting at `6` are flagged. Author durations a hair short (e.g.
  `data-duration="5.97"` for a 6 s slot at 30 fps) so adjacent clips don't touch; the timeline + a
  transition overlay cover the seam. Put overlays (wipes, lower-thirds) on a **separate track index**.
- z-index is plain CSS, independent of track index.
- `<video>` clips must be `muted`; `<audio>` and `<video>` used for sound must be **direct children of
  the root** — nested media never decodes.

## 3. The timeline (exactly one, paused, synchronous)

```html
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true, defaults: { duration: 0.9 } });
  // ... build tweens synchronously ...
  window.__timelines["<composition-id>"] = tl;   // key == data-composition-id
</script>
```

- **One** `gsap.timeline({ paused: true })` per composition, registered on `window.__timelines` under the
  composition id. Built **synchronously at load** — never inside `setTimeout`/`Promise`/`requestAnimationFrame`.
- The renderer seeks this timeline frame-by-frame. Anything not on the timeline (or not in static CSS)
  will not appear at the seeked frame.
- `hyperframes lint` raises an informational `gsap_studio_edit_blocked` **warning** when a manual
  `window.__timelines` script controls elements — this is **expected and benign** for our render-only
  workflow (it only means the Studio GUI can't drag-edit those elements). Do not remove the manual
  timeline to silence it.

## 4. Determinism (hard rules)

- **No** `Math.random()`, `Date.now()`, `performance.now()`. If you need pseudo-randomness, use a seeded
  PRNG (a small mulberry32 with a fixed seed) so every render is identical.
- **No** `repeat: -1` (infinite). Compute a finite repeat count that fits the clip duration.
- Animate **`opacity` and transforms only** (`x/y/scale/rotation`, `scaleX/scaleY`). **Never** animate
  `display`, `visibility`, or layout props (`width/height/top/left/margin`) — they don't interpolate
  cleanly and cause layout thrash / blank seeks. For initial hidden state use CSS `opacity: 0` (or a
  `tl.set(..., {opacity:0})` at the clip start), not `display:none`.
- Counting numbers: animate a **proxy object** and write the rounded value into the DOM in `onUpdate`;
  give the number element `font-variant-numeric: tabular-nums;` so digits don't jitter.

## 5. Fonts (offline-safe)

- Vendor GSAP locally (`./assets/gsap.min.js`) — **no CDN** at render time.
- Use the runtime's fontconfig families by **literal name** in `font-family` (e.g.
  `font-family: "Inter", system-ui, sans-serif;`). Declare each via `@font-face { src: local(...) }` in
  `assets/fonts.css` (bundled). **Do NOT** put a `var(--font-x)` in `font-family` — `hyperframes lint`
  resolves the family statically and cannot follow CSS variables, so it raises
  `font_family_without_font_face`. Variables are fine for color/spacing, just not for `font-family`.
- Always append a generic fallback (`sans-serif`/`serif`/`monospace`) so a missing family degrades to a
  legible face instead of an invisible one.

## 6. HTML comments

- **Never** put a tag-like token inside an HTML comment (e.g. `<!-- root sits in <body> -->`). The
  linter's root-finder matches `<body>`/`<div ...>` tokens textually and a token inside a comment makes
  it mis-resolve the root (`root_missing_composition_id` / `root_missing_dimensions`). Phrase comments
  without angle-bracket tag names.

## 7. Variables (optional, for batch/restyle)

- Declare `data-composition-variables='[{"id","type","label","default","options"}]'` on the root; read
  them in-composition via `window.__hyperframes.getVariables()`. Override per render with
  `--variables '{"title":"..."}'` or a `--batch` JSON array. Use for one composition → many cuts.
