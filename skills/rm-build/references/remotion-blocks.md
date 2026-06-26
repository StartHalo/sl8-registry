# Remotion blocks — vocabulary the authoring prompt speaks (pointer + cheat-sheet)

> **The canonical block catalog lives in `rm-storyboard`** (`rm-storyboard/references/remotion-blocks.md`):
> the storyboard phase maps each beat to a Remotion block (primitive, frame budget, transition, easing,
> per-beat `@remotion/*`). `rm-build` is the **consumer** — it reads those tags from `03-storyboard.md`
> and turns them into code. This file is the quick cheat-sheet so the author doesn't context-switch; for
> the authoritative catalog and any new block, defer to `rm-storyboard`.

If `rm-storyboard`'s catalog and this cheat-sheet ever disagree, the storyboard's tags win — they are the
plan; `rm-build` implements them.

## Structure (composition primitives)
| Tag | Code | When |
|---|---|---|
| `series` | `<Series><Series.Sequence durationInFrames={F}>…` | scenes back-to-back, no overlap |
| `transition-series` | `<TransitionSeries>` + `@remotion/transitions` (`fade`/`slide`/`wipe`/`flip`/`clockWipe`) | scenes cross-fade / wipe / slide |
| `sequence` | `<Sequence from={F} durationInFrames={F} premountFor={…}>` | a delayed / overlapping layer (e.g. caption over clip) |
| `overlap` | `<Series.Sequence offset={-N}>` | scenes overlap by N frames |

Local frame rule: inside any `<Sequence>` / `TransitionSeries.Sequence`, `useCurrentFrame()` starts at 0.

## Motion
- `useCurrentFrame()` + `interpolate(frame,[a,b],[x,y],{extrapolateLeft:"clamp",extrapolateRight:"clamp",
  easing:Easing.bezier(…)})` — the default. Always clamped (C4).
- `spring({frame,fps,config:{damping}})` — only when physical; name the damping (14 = bounce, 200 = settle).

## Engine primitives (compose these first — `src/engine/primitives.tsx`)
`RiseIn{delay,distance,damping}` · `FadeIn{delay,durationInFrames,y}` · `Counter{to,from,delay,format}`
(tabular figures) · `Bar{widthPx,height,color,delay}` · `Card{delay,bg}` · `DividerWipe{width,color,origin}`
· `KenBurns{durationInFrames,from,to}` · `parseStat("$40M")→{prefix,num,suffix}` ·
`useSpringProgress(delay,damping)` · `useInOut(sceneDuration,fade)`.

## Layout + type (`src/engine/`)
`<FontProvider fonts={resolveFontPack(props.fontPack)}>` → `<StyleProvider palette>` →
`useStyleConfig()→{palette,font,orientation,shortEdge,size}`. Wrap content in `<SafeZone justify align>`.
Read sizes via `size("hero"|"headline"|"dek"|"beat"|"meta"|"kicker"|"stat")` — never hardcode px.
`font.display | font.body | font.condensed`. Packs: `modern | editorial | bold | tech`.

## Media
`<Img src={staticFile("logo.png")}>` (never `<img>`) · `<OffthreadVideo src={staticFile("clip.mp4")} muted>`
· `<Audio src={staticFile("voiceover/intro.wav")}>` · GIF via `@remotion/gif`. All assets staged into
`public/` and addressed with `staticFile()`.

## Capability components (dropped in by the capability skills; `rm-build` composes them)
| Block | Component | Package | Skill |
|---|---|---|---|
| Word-pop captions (JTBD-3) | `CaptionOverlay` (`createTikTokStyleCaptions`) | `@remotion/captions` | `rm-captions` |
| Bars / lines / counters (JTBD-2) | `BarChart` / `LineChart` / `Counter` | `@remotion/shapes`, `@remotion/paths`, `@remotion/layout-utils` | `rm-dataviz` |
| Spectrum / waveform | `Spectrum` / `Waveform` (`visualizeAudio`) | `@remotion/media-utils` | `rm-audioviz` |

## Deferred (REQ-005 RAM — do NOT emit in v1)
3D (`@remotion/three`/`@react-three/fiber`), maps (`maplibre`, needs a Mapbox token), batch
`parametrize`. The contract C9 forbids them; `rm-3d`/`rm-parametrize` are scaffolded-but-gated.
