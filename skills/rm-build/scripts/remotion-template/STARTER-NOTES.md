# Bundled Remotion starter — BOT-032 Remotion Studio

`rm-build/scripts/init.sh` copies this to `artifacts/<project>/remotion-project/`, then authors above it.

## Verified (host, 2026-06-25)
- Harvested BOT-014 engine (`src/engine/`: fonts, tokens, pacing, rng, SafeZone, StyleConfig, primitives, types) + a general `StudioVideo` contract (`src/{schema,StudioVideo,Root,index}.ts(x)`).
- Pinned all `@remotion/*` to **4.0.473** (the sl8-animation runtime version); `zod@^4` (no `@remotion/zod-types` → avoids the zod-v4 peer ERESOLVE; schema uses plain `z.string` for colors).
- `npm install` clean (191 pkgs); `tsc --noEmit` = 0; `remotion still Studio-16x9` rendered on-brand/legible at frames 60 + 200.
- Official `remotion-best-practices` skill (37 rules + SKILL.md) bundled at `.agents/skills/` (init.sh installs into each project).

## Contract (the generated React must obey)
Frame-driven only; no CSS transition/keyframes; no setTimeout/Date.now/Math.random; clamped interpolate; fonts via `engine/fonts.ts`; content in `<SafeZone>`; `<Img>`/`<OffthreadVideo>` not native; `staticFile()` assets; Zod props; timeline ends at `durationInFrames`; one `<Composition>` per AR.

## v1 capability packages installed (ready for rm-captions/dataviz/audioviz/preview)
@remotion/{captions,shapes,paths,layout-utils,media-utils,motion-blur,player}. Deferred (REQ-005): three/@react-three/fiber/@remotion/three.

## Library harvest (backlog #3)
`src/library/` is scaffolded empty; the 9 BOT-014 styles (MessageDoc-coupled) are repackaged as presets in the component-library iteration, not v1 — the generative author composes the engine + capability components instead.
