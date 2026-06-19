# Beat → block mapping (the storyboard decision menu)

> How to turn each kind of script beat into a storyboard row. This is the storyboard-specific layer; the
> full block-id catalog + how to wire blocks lives in `../../hf-build/references/registry-blocks.md`, and
> the transition catalog + track rules live in `../../hf-build/references/motion-rules.md` (Scene
> transitions) and `../../hf-build/references/composition-contract.md` (§2 clips & tracks). Read those for
> the exact ids and rules; use the table below to *choose*.

## Beat type → block(s)

| script beat carries… | block / component (reuse-first) | track | notes |
|---|---|---|---|
| opening hook / section header (kicker + headline) | `title-card` *(bundled)* / `section-header` | scene | one big idea; entrance on every element |
| a benefit / message line | `title-card` reused, or hand-author a text scene | scene | on-screen text = the headline, NOT the VO line |
| a single number / metric | `stat-counter` *(bundled stat reveal)* | scene | proxy-counter + `tabular-nums`; exact figure from script |
| a percentage / progress | `progress-ring` (+ `stat-counter`) | scene | ring draws via path-draw |
| a series (e.g. quarterly figures) | `bar-racer` or `metric-grid` | scene | one element per series value; bars via `scaleX` |
| a quote | hand-author a quote scene (large text + attribution) | scene | attribution from script; never invent the source |
| a source / brand credit | `source-credit` / `lower-third` | overlay | own track index; sits over the scene |
| spoken-word captions (JTBD-3) | `caption-rail` (or `caption-embed`) | overlay | reads `04-timing.json`; group by clause; own track |
| social framing (JTBD-3) | `social-frame` + `handle-chip` (+ `cta-button`) | overlay | vertical; keep clear of platform UI |
| a CTA | `cta-button` (+ `source-credit`) | scene | usually the final beat (no transition out) |

If no block fits, hand-author the scene and name the motion rule from
`../../hf-build/references/motion-rules.md` (e.g. `rise-in`, `kinetic-beat-slam`, `stagger-list`).

## Transition (out) per beat

Every non-final beat needs a transition out; the final beat has none ("— (final)"). Pick from the Scene
transitions section of `../../hf-build/references/motion-rules.md`:

| feel wanted | transition | when |
|---|---|---|
| smooth, premium (default) | `liquid-wipe` *(bundled)* | most scene-to-scene swaps |
| punchy beat / reveal | `flash-white` / `flash-accent` | into a stat or a hard cut |
| cinematic open/close | `iris` | a hero reveal |
| directional momentum | `push` / `slide` | sequential scenes (left→right reading) |
| graphic / editorial | `block-wipe` | grid/editorial styles |

Put the transition on its **own track index** (not the scene track) so it sits over the swap. Keep it
0.4–1.0 s. Vary transitions across a video — don't `liquid-wipe` every cut.

## Track layout rules (from the composition contract §2)

- **Scene content on the scene track** (e.g. track 0): one timed clip per beat; adjacent clips must not
  overlap **or share a boundary** — leave a small gap (6 s slot → `data-duration 5.97`).
- **Each overlay on its own track index**: a caption rail, a lower-third, and a transition are three
  separate tracks (track 1, 2, 3…) so none time-overlaps the scene clip on track 0.
- **z-index is plain CSS**, independent of `data-track-index` — the track index is about time-overlap, the
  z-index about stacking. Note both when an overlay must sit above the scene.

## Frame ranges

- 30 fps. `frame = round(seconds × 30)`. Report both in each beat row: `start_f–end_f (start_s–end_s)`.
- With `04-timing.json`: a beat's range = first-word-start → last-word-end of that beat's VO line (so the
  visual beat and the spoken line align; captions then sync naturally).
- Without timing: `seconds ≈ max(0.9, words / 2.5)` per beat, scaled to the target duration; ~3–4 beats / 5 s.
- Composition `data-duration` = the last beat's end second.

## Aspect ratio = orientation = layout

A different orientation is a **re-authored composition** in hf-build (`--resolution` only upscales the
same orientation; it cannot rotate). So when more than one AR is requested, write **one composition
header + track layout per orientation**, each with its own safe-zone notes:

| AR | root (px) | safe-zone caution |
|---|---|---|
| 16:9 | 1920×1080 | keep text off the outer ~5%; lower-thirds in the bottom safe band |
| 9:16 | 1080×1920 | captions in the lower third, clear of platform UI chrome; bigger type |
| 1:1 | 1080×1080 | center-weighted; shorter headlines (less horizontal room) |
