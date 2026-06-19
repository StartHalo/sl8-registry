# Motion rules — the GSAP atomic-rule menu

> A reference menu of motion primitives for authoring scene timelines, seeded from the HyperFrames
> animation rules + the craft standards (`research/prompt-engineering.md` §3, `research/domain-analysis.md`).
> Pick rules per scene; combine; vary the easing. The goal is motion that reads as *designed* — entrances
> on every element, varied easing, transitions as exits — not "everything fades in".

## Authoring discipline (apply to every scene)

1. **Layout-before-animation.** Build the final on-screen layout with flex + padding first (the CSS
   end-state). Then add `gsap.from(...)` entrances that journey TO that position. The element's resting
   place is its CSS; the tween only describes how it arrives.
2. **Offset the first tween 0.1–0.3 s** into the clip (don't start at exactly 0 — a tiny beat reads better).
3. **Vary at least 3 different eases per scene.** Reaching for `power2.out` on everything is the #1 tell of
   auto-generated motion. Mix `power4.out`, `expo.out`, `back.out(1.6)`, `power3.inOut`, etc.
4. **Stagger element sequences** (`stagger: 0.08`) instead of moving a group as one block.
5. **Entrances on every element; exits only on the final scene** — between scenes, the transition IS the
   exit. A mid-video scene swaps via the next scene taking over the track + a transition overlay.

## Easing menu (what each feels like)

| ease | feel | use for |
|---|---|---|
| `power2.out` | gentle settle | labels, captions, supporting text |
| `power4.out` | fast-in, long settle | headlines, hero entrances |
| `expo.out` | snappy then float | big numbers, stat reveals, rules drawing |
| `back.out(1.6)` | slight overshoot | chips, buttons, badges (playful pop) |
| `power3.inOut` | smooth both ends | bar fills, progress, scaling panels |
| `power2.in` | accelerate away | exits (final scene only) |
| `elastic.out(1,0.5)` | bouncy | use sparingly — one accent element per video |

## Atomic rules (entrances & reveals)

- **kinetic-beat-slam** — `gsap.from(el, {scale: 0.6, opacity: 0, ease: "back.out(2)", duration: 0.5})`,
  one word/line at a time, staggered. For punchy headlines.
- **rise-in** — `gsap.from(el, {y: 50, opacity: 0, ease: "power4.out"})`. The default headline entrance.
- **counting / dynamic-scale** — animate a proxy `{v:0}` to the target with `expo.out`, write
  `Math.round(o.v)` into a `tabular-nums` element in `onUpdate`. Optionally `scale` the number 0.9→1.0
  alongside. For stat reveals.
- **stat-bars-and-fills** — `gsap.from(barFill, {scaleX: 0, transformOrigin: "left center", ease:
  "power3.inOut", duration: 1.2})`. Pair with a counter. Use `scaleX` (a transform), never animate width.
- **rule-draw** — `gsap.from(rule, {scaleX: 0, transformOrigin: "left center", ease: "expo.out"})` for an
  underline / divider that draws in.
- **svg-path-draw** — set `strokeDasharray`/`strokeDashoffset` to the path length, tween `strokeDashoffset`
  to 0 with `power2.inOut`. For rings, line charts, icon strokes.
- **stagger-list** — `gsap.from(".item", {opacity:0, x:-30, stagger:0.08, ease:"power2.out"})` for bullet
  lists / table rows.
- **chip-pop** — `gsap.from(chip, {opacity:0, scale:0.8, ease:"back.out(1.8)"})` for badges, CTAs, brand chips.

## Scene transitions (the exits between scenes)

Put the transition element on its **own track index** (not the scene track) so it can sit over the swap.

- **liquid-wipe** (used in the bundled template): a full-frame overlay, `transform-origin: top`,
  `scaleY 0→1` (`power3.in`) to cover, swap the underlying scenes' opacity at the midpoint with
  `tl.set(...)`, then `scaleY 1→0` from `transform-origin: bottom` (`power3.out`) to reveal. ~0.5 s each half.
- **flash-white / flash-accent** — a brief `opacity 0→1→0` color flash overlay at the cut.
- **iris / radial** — a circular `clip-path` opening or closing.
- **push / slide** — translate the outgoing scene off (`x: -100%`) while the incoming slides in
  (`x: 100% → 0`); both on transforms.
- **block-wipe** — a row of bars that scale in sequentially to cover, then out to reveal.

Keep transitions short (0.4–1.0 s total) and deterministic — no shader randomness, no infinite loops.

## Anti-patterns (the rubric penalizes these)

- A centered single element with one fade-in (generic).
- The same `power2.out` ease on everything (no variation).
- Animating `display`/`visibility`/`width`/`height`/`top`/`left` for motion.
- `Math.random`/`Date.now` in the timeline; `repeat: -1`.
- Linear gradients on a dark background (H.264 banding) — prefer radial.
- Narration pasted verbatim as the on-screen text (on-screen text is the *headline*, not the script).
