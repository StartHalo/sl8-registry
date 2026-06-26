# Beat → block mapping (the storyboard decision menu)

> How to turn each kind of script beat into a Remotion storyboard row. This is the storyboard-specific
> *choosing* layer; the full block vocabulary (signatures, packages, rule files) lives in
> `remotion-blocks.md`, and the contract the layout must obey is `rm-build`'s
> (`../rm-build/references/composition-contract.md`). Read those for the exact APIs; use the tables
> below to *choose*. Every beat row names all four: **block(s)/component · structure + transition out ·
> layer layout · frame range.**

## Beat type → block(s)

| script beat carries… | block / component (reuse-first) | layer | notes |
|---|---|---|---|
| opening hook / section header (kicker + headline) | `RiseIn` (+ `DividerWipe` underline) | base scene | one big idea; `useStyleConfig().size("hero"/"headline")` |
| a benefit / message line | `FadeIn` or `RiseIn` text scene | base scene | on-screen text = the headline, NOT the VO line |
| a single number / metric | `Counter{to}` (+ `parseStat` for the affix) | base scene | `tabular-nums` (built into `Counter`); exact figure from script |
| a percentage / progress | `Counter{to}` + `Bar` (or a ring via `@remotion/paths`) | base scene | bar grows via spring; figure verbatim |
| a series (e.g. quarterly figures) | `BarChart` or repeated `Bar` (one per value) | base scene | one element per series value; values = exact script figures |
| a trend over time | `LineChart` (`@remotion/paths` `evolvePath`) | base scene | line draws on; axis labels from script |
| a quote | `Card` (large text) + `meta` attribution | base scene | attribution from script; never invent the source |
| a source / brand credit | a lower-third (`RiseIn` + `DividerWipe`) | **overlay** | own nested `<Sequence>`; sits over the scene (z-index) |
| spoken-word captions (JTBD-3) | `CaptionOverlay` (`@remotion/captions`) | **overlay** | reads `04-timing.json`; group by clause; own `<Sequence>` |
| social framing (JTBD-3) | handle-chip / watermark (`Card`/`Img`) | **overlay** | vertical; keep clear of platform UI |
| audio-reactive backdrop | `Spectrum` / `Waveform` (`@remotion/media-utils`) | base or overlay | reads the VO/music asset |
| a CTA | `Card` (+ button) | base scene | usually the final beat (no transition out) |
| a photo/still scene | `KenBurns` wrapping `<Img>` | base scene | slow drift; `staticFile()` asset |

If no block fits, **author-fresh** the scene and name the motion approach: `interpolate(frame, […], […],
{extrapolateLeft:"clamp", extrapolateRight:"clamp", easing: Easing.bezier(0.16,1,0.3,1)})`, or a named
`spring({config:{damping:<n>}})` only when the motion is physically bouncy. Default to `interpolate`.

## Structure + transition (out) per beat

Pick the **structure** primitive first (how this beat sits in the timeline), then the **transition out**
into the next beat:

- **Structure**: `<Series.Sequence durationInFrames>` for a hard back-to-back cut; `<TransitionSeries.
  Sequence>` when the cut into the next beat is an animated transition; nested `<Sequence from
  durationInFrames layout="none" premountFor>` for overlay layers.
- **Transition out** — only inside a `<TransitionSeries>`. Every non-final beat that animates its cut
  names a preset; the final beat is `— (final)`:

| feel wanted | preset (`@remotion/transitions`) | when |
|---|---|---|
| smooth, premium (default) | `fade()` | most scene-to-scene swaps |
| directional momentum | `slide({direction:"from-right"})` | sequential / left→right reading |
| graphic / editorial | `wipe()` | grid/editorial styles, chart reveals |
| punchy hard turn | `flip()` | into a stat or a hard cut |
| cinematic radial | `clockWipe()` | a hero reveal / open |

Timing: `linearTiming({durationInFrames: 15})` (constant) or `springTiming({config:{damping:200}})`
(organic). **A transition shortens the total** by its `durationInFrames` — keep transitions ~12–24f and
subtract them from the composition total. **Vary** transitions across a video — don't `fade()` every cut.

## Layer layout (the "track" replacement)

Remotion has **no `data-track-index`**. Express layering as Sequences + `z-index`:

- **Scene content is the beat's base `<Sequence>`/`<Series.Sequence>`** — one timed scene per beat.
- **Each overlay is its own nested `<Sequence from={start} durationInFrames={len} layout="none"
  premountFor={…}>`** stacked above the scene with `<AbsoluteFill>` + `z-index`. A caption rail, a
  lower-third, and a handle-chip are three separate overlay Sequences (z1, z2, z3), each independent of
  the scene's own timing.
- State each layer and its z-order, e.g. `base: StatScene · overlay z1: source-credit (Sequence from
  60, dur 90) · overlay z2: watermark (from 0, dur 360)`.
- `z-index` is plain CSS (stacking); the `from`/`durationInFrames` is the timing — note both when an
  overlay must sit above the scene for a sub-range.

## Frame ranges

- 30 fps. `frame = round(seconds × 30)`. Report **both** in every row: `start_f–end_f (start_s–end_s)`.
- With `04-timing.json`: a beat's range = first-word-start → last-word-end of that beat's VO line (so
  the visual beat and the spoken line align; captions then sync naturally).
- Without timing: `seconds ≈ max(0.9, words / 2.5)` per beat, scaled to the target duration; ~3–4
  beats / 5 s. State that you paced by word count.
- Composition `durationSeconds` = the last beat's end second; `durationInFrames = round(durationSeconds
  × 30)`. **Subtract every transition's `durationInFrames`** from the scene-budget sum so the stated
  `durationInFrames` is the *rendered* length (contract: timeline ends exactly at `durationInFrames`).

## Aspect ratio = Composition = layout

A different orientation is a **separate `<Composition>`** in rm-build (`--scale` only upscales the same
orientation; it cannot rotate). So when more than one AR is requested, write **one composition header +
layer layout per orientation**, each with its own SafeZone notes:

| AR | `<Composition>` id | root (px) | SafeZone caution |
|---|---|---|---|
| 16:9 | `Studio-16x9` | 1920×1080 | keep text off the outer band; straps in the bottom safe band |
| 9:16 | `Studio-9x16` | 1080×1920 | captions in the lower third, clear of platform UI; bigger type |
| 1:1 | `Studio-1x1` | 1080×1080 | center-weighted; shorter headlines (less horizontal room) |
