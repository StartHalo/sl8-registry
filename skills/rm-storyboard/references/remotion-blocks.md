# Remotion-block catalog — the vocabulary the storyboard assigns to beats

> This is the **Remotion** rewrite of the old HyperFrames "registry blocks" catalog. There is **no
> registry to fetch** — every block here is **bundled** in the starter (the harvested BOT-014 engine)
> or comes from an `@remotion/*` package **already installed at one pinned version (4.0.473) — so there
> is NO `npx remotion add`** in v1. `rm-storyboard` names blocks from this catalog; `rm-build` authors
> the React from the same names. The contract these obey (frame-driven, clamped `interpolate`,
> `staticFile()`, Zod props, one `<Composition>` per AR, timeline ends exactly at `durationInFrames`)
> is `rm-build`'s authority (`../rm-build/references/composition-contract.md`); the official rule files
> are bundled at `<project>/.agents/skills/remotion-best-practices/rules/` (cited per row below).

The four things a storyboard beat names (see `beat-to-block.md` for the per-beat-type chooser):
**(1) block(s)/component · (2) structure + transition out · (3) layer layout · (4) frame range.**

---

## 1. Engine primitives (bundled — `src/engine/primitives.tsx`)

The frame-driven workhorses every beat reaches for first. All are seeded/clamped already — reuse them
instead of authoring fresh motion. Props are real (verified against the starter):

| Primitive | Signature (key props) | Use for | Rule file |
|---|---|---|---|
| `RiseIn` | `{children, delay?, distance=40, damping=200}` | the workhorse entrance — spring rise + fade | `timing.md` |
| `FadeIn` | `{children, delay?, durationInFrames=20, y=0}` | calm/editorial eased fade (no bounce) | `timing.md` |
| `Counter` | `{to, from=0, delay?, durationInFrames?, format?}` | an animated number (renders `tabular-nums`) | `timing.md` |
| `Bar` | `{widthPx, height, color, delay?, radius=8}` | a spring-grown data bar (`scaleX` feel) | `timing.md` |
| `Card` | `{children, delay?, bg}` | a scale+fade card (CTA / outro / quote panel) | `timing.md` |
| `DividerWipe` | `{width, color, delay?, height=3, origin}` | a rule/underline that wipes in (`scaleX`) | `timing.md` |
| `KenBurns` | `{children, durationInFrames, from=1.0, to=1.08}` | a slow scale drift over a still/photo scene | `effects.md` |
| `parseStat` | `(raw) → {prefix,num,suffix}` | split `"$40M"`/`"37%"` into a `Counter` value + affix | — |
| `useSpringProgress` / `useInOut` | hooks (delay/damping; in-out for a scene length) | hand-rolled entrances/exits when composing | `timing.md` |

Context the primitives read (set once at the composition root by `rm-build`): `useStyleConfig()` →
`{palette, font, orientation, shortEdge, size(TypeKey)}`. `Palette` = `{bg, surface, text, textMuted,
accent, accentAlt}`. `TypeKey` = `hero | headline | dek | beat | meta | kicker | stat` (legibility
floors baked in — headline ≥56px, body ≥36px). Wrap scene content in **`<SafeZone justify align>`**
(AR-aware margins) so text clears platform UI.

## 2. Library presets (bundled — `src/library/`, backlog in v1)

The 9 BOT-014 styles (`kinetic-typography`, `breaking-news`, `giant-word`, `headline-highlight`,
`box-reveal`, `blur-carousel`, `minimal-editorial`, `perspective-3d`, `pixel-reveal`) are a **backlog
harvest** — `src/library/` ships empty in v1. **Do not name a library preset in a v1 storyboard.**
Compose the engine primitives (§1) instead; when the component-library iteration lands, these become
named presets a beat can reference directly.

## 3. Capability components (dropped in by sibling skills, composed by `rm-build`)

These are **not bundled by default** — `rm-build` drops the relevant starter into `src/` only when the
JTBD needs it (progressive disclosure). Name them in the storyboard when the beat calls for them:

| Component | From skill | Use for (JTBD) | Backing package(s) | Rule file(s) |
|---|---|---|---|---|
| `CaptionOverlay` | `rm-captions` | TikTok word-pop captions over a clip (JTBD-3) | `@remotion/captions` (`createTikTokStyleCaptions`) | `display-captions.md`, `subtitles.md` |
| `BarChart` | `rm-dataviz` | a bar series, exact figures (JTBD-2) | `@remotion/shapes`, `@remotion/layout-utils` | `timing.md` (+ `paths.md` concept) |
| `LineChart` | `rm-dataviz` | a trend line that draws on (JTBD-2) | `@remotion/paths` (`evolvePath`) | `timing.md` |
| `Counter` (chart) | `rm-dataviz` | a hero figure / metric grid (JTBD-2) | engine `Counter` + `layout-utils` | `timing.md` |
| `Spectrum` / `Waveform` | `rm-audioviz` | audio-reactive bars / waveform | `@remotion/media-utils` (`visualizeAudio`) | `audio-visualization.md` |

Data figures in §3 components are **bound from `02-script.md` verbatim** (no rounding) — they arrive as
Zod props (contract C8) so JTBD-4 restyle/resize can't mutate them.

## 4. Media + audio (clips, images, voiceover)

| Need | Component (canonical) | NEVER | Asset path | Rule file |
|---|---|---|---|---|
| an image | `<Img>` (`remotion`) | `<img>` (blank frame — no load-block) | `staticFile("logo.png")` | `images.md` |
| a video clip | `<OffthreadVideo>` (standardized) | `<video>` | `staticFile("clip.mp4")` | `videos.md` |
| audio / voiceover | `<Audio>` | `<audio>` | `staticFile("vo/intro.wav")` | `audio.md`, `voiceover.md` |
| a slow push on a still | `KenBurns` wrapping `<Img>` | — | `staticFile(...)` | `effects.md` |

Voiceover is **ai-gen Kokoro** (`fal-ai/kokoro/american-english`), not ElevenLabs (the official
`voiceover.md` default is overridden — keyless SL8 proxy). Captions/timings are **ai-gen Wizper**
(`fal-ai/wizper`); the storyboard only consumes the resulting `04-timing.json`.

## 5. Structure primitives — how beats compose (the "track" replacement)

Remotion has **no track index**. A beat is placed by a structure primitive + frame budget; overlays are
nested `<Sequence>` layers stacked by `z-index`. Pick per the storyboard pattern:

| Storyboard pattern | Primitive | Note |
|---|---|---|
| scenes play **back-to-back, hard cut** | `<Series>` + `<Series.Sequence durationInFrames={F}>` | budgets sum to the total |
| scenes **cross-fade / wipe / slide** between | `<TransitionSeries>` + `<TransitionSeries.Sequence>` + `.Transition` | the transition **shortens** the total |
| scenes **overlap by N frames** (no presented transition) | `<Series.Sequence offset={-N}>` | manual overlap |
| an **overlay layer** within/over a scene | nested `<Sequence from={f} durationInFrames={d} layout="none" premountFor={…}>` | the layer layout; stack by `z-index` |

Rules: inside any `<Sequence>`, `useCurrentFrame()` is **local** (starts at 0) — animate relative to the
scene start. **Always `premountFor`** every `<Sequence>` (fonts/media ready before it plays).
Rule files: `sequencing.md`, `transitions.md`, `compositions.md`.

## 6. Transitions — the "transition out" of a beat (`@remotion/transitions`, bundled)

A `<TransitionSeries.Transition>` needs a `presentation` + a `timing`. Import each preset from its
module. **Every transition overlaps its two scenes → it SHORTENS the composition total** by its
`durationInFrames` (e.g. `60 + 60 − 15 = 105`); account for this in the storyboard's stated
`durationInFrames`.

| Preset | Import | Feel / when | Options |
|---|---|---|---|
| `fade()` | `@remotion/transitions/fade` | smooth, premium — most scene-to-scene swaps (default) | — |
| `slide()` | `@remotion/transitions/slide` | directional momentum (sequential scenes) | `{direction: from-left\|right\|top\|bottom}` |
| `wipe()` | `@remotion/transitions/wipe` | graphic/editorial reveal | — |
| `flip()` | `@remotion/transitions/flip` | a hard, punchy turn into a stat/reveal | — |
| `clockWipe()` | `@remotion/transitions/clock-wipe` | a radial/clock reveal (cinematic) | — |

Timing: `linearTiming({durationInFrames})` (constant) or `springTiming({config:{damping}})` (organic).
**Overlays** (a light leak over the cut without shortening the timeline) use `<TransitionSeries.Overlay
durationInFrames offset>` — but an overlay can't be adjacent to a transition or another overlay.
**Vary** transitions across a video — don't `fade()` every cut. The **final** beat has no transition
out. Rule file: `transitions.md`, light leaks: `light-leaks.md`.

## 7. Type, layout, params

| Need | Tool | Rule file |
|---|---|---|
| fonts (the PoC gotcha) | `@remotion/google-fonts/<Family>` `loadFont("normal",{weights,subsets})` — **scoped weights+subset** (bare `loadFont()` = 63–126 render-time network requests) — or the engine `fontPack` | `google-fonts.md`, `local-fonts.md` |
| measure/fit text | `@remotion/layout-utils` `measureText` / `fitText` | `measuring-text.md` |
| safe zone | engine `<SafeZone>` (AR-aware) | `video-layout.md` |
| Zod props + duration | `zod@4` `z.object()` schema on `<Composition>`; `calculateMetadata` derives `durationInFrames` from `durationSeconds` (colors are plain `z.string`, **not** `@remotion/zod-types`) | `parameters.md`, `calculate-metadata.md` |

## 8. Aspect ratio = Composition = layout

A different orientation is a **separate `<Composition>`** rm-build re-authors (`--scale` only upscales
the same orientation; it cannot rotate). When more than one AR is requested, write **one composition
header + layer layout per orientation**, each with its own SafeZone notes:

| AR | `<Composition>` id | root (px) | SafeZone (engine, px) | caution |
|---|---|---|---|---|
| 16:9 | `Studio-16x9` | 1920×1080 | top 90 / bottom 110 / sides 120 | keep text off the outer band; straps in the bottom safe band |
| 9:16 | `Studio-9x16` | 1080×1920 | top 220 / bottom 280 / sides 64 | captions in the lower third, clear of platform UI chrome; bigger type |
| 1:1 | `Studio-1x1` | 1080×1080 | top 96 / bottom 120 / sides 80 | center-weighted; shorter headlines (less horizontal room) |

FPS is always **30**. `durationInFrames = round(durationSeconds × 30)` (data-driven via
`calculateMetadata`).

## 9. Deferred (NOT in a v1 storyboard)

3D (`@remotion/three` / `@react-three/fiber`), maps (`maplibre`), and batch `parametrize` are
**scaffolded but RAM-gated (REQ-005)** — the ~1.9 GB OOM ceiling. Do **not** name them in a v1
storyboard; if an idea implies 3D, plan a 2D approximation and note the defer. Contract rule C9 forbids
them; `rm-validate` blocks them.
