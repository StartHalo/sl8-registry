---
name: rm-3d
description: "DEFERRED STUB (scaffolded, NOT active in v1). Documents how to author frame-driven 3D in Remotion with @remotion/three ([ThreeCanvas] animated by useCurrentFrame, NEVER useFrame from react-three-fiber) so the capability can be switched on once the runtime RAM tier (REQ-005) lands. In v1 this skill produces NOTHING and authors NO 3D — @remotion/three is H-RAM (Three.js per-frame WebGL) and OOMs the ~1.9 GB sandbox (Exit-137), so rm-build's composition-contract rule C9 forbids @remotion/three; a brief that implies 3D is instead rendered as a 2D approximation by rm-build with the deferral noted in state.md (the JTBD-5 RAM fallback). When activated it would drop frame-driven 3D scene components into rm-build's remotion-project/src/components/three/. Reads 03-storyboard.md; writes nothing in v1. Does not render."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [rm-build]
  inputs:
    - name: storyboard
      type: markdown
      required: false
      description: "artifacts/[project]/03-storyboard.md — read only to DETECT whether a beat implies 3D (product spin, ranked 3D bars, cinematic camera). In v1 this never triggers authoring; it triggers the 2D-approximation deferral note."
  outputs:
    - name: three-components
      type: x-dir
      path: artifacts/[project]/remotion-project/src/components/three/
      description: "Frame-driven [ThreeCanvas] scene components composed into rm-build's app. GATED on REQ-005 — in v1 this directory is NOT created and this skill writes nothing. The path is the activation target, not a v1 deliverable."
---

# rm-3d — frame-driven 3D in Remotion (DEFERRED / scaffolded, not active)

> STATUS: **DEFERRED**. Gated on **REQ-005** (the runtime RAM tier). This skill is **scaffolded
> documentation only** — it ships no active script, authors no React, and produces no output in v1.
> `@remotion/three` is **H-RAM** (Three.js renders WebGL every frame); the current `sl8-animation`
> sandbox has a **~1.9 GB ceiling** and renders run `--concurrency=1` — a 3D scene OOMs to **Exit-137**
> (BOT-015 hit the OOM ceiling six times). Until REQ-005 raises the RAM tier, 3D stays OFF.

`$SKILL` below = this skill's directory. Run `bash "$SKILL/scripts/check.sh"` to print the live gate.

## Purpose
Capture the **contract for frame-driven 3D** in Remotion so the capability is one flip away when the
RAM tier lands, while keeping it **out of the default generative output** today. The hard, easy-to-get-
wrong rules (wrap in `<ThreeCanvas width height>`, animate via `useCurrentFrame()` and **never**
`useFrame()`, `<Sequence layout="none">` inside the canvas, deterministic seeded motion) are written down
once in `references/3d.md` so a future activation does not rediscover them. This skill is a **capability
documentation stub** — like `rm-captions`/`rm-dataviz`/`rm-audioviz`, it would compose components into
**rm-build's** `remotion-project/`; it does not own a phase output and it does not render.

## When to run
- **In v1: effectively never as an author.** It loads under progressive disclosure only when a brief or
  `03-storyboard.md` beat implies 3D (a product spin, a 3D ranked chart, a cinematic camera move). When it
  loads, its job is to **say "deferred"**, not to author 3D — see Instructions.
- **JTBD-5 ("describe any video")** is the only JTBD that can reach for 3D. JTBD-1/2/3/4 never do.
- **After REQ-005 ships** (the RAM tier raises the per-render ceiling): this stub is **promoted to active**
  — `references/3d.md` becomes the authoring contract and `rm-build` is allowed to compose
  `<ThreeCanvas>` scenes (contract rule C9 relaxes for the new tier). That promotion is a Variation/Tune,
  not a v1 change.
- Do NOT use it to render (that is `rm-render`) or to write the storyboard (that is `rm-storyboard`).

## Inputs (read-before-write)
- `artifacts/<project>/03-storyboard.md` (optional) — read only to confirm a beat implies 3D. There is no
  required input because there is no v1 output.

## Instructions

### 1. Confirm the gate (always first)
```bash
bash "$SKILL/scripts/check.sh"
```
It prints the deferral banner, the REQ-005 gate condition, a best-effort read of the runtime's available
memory, and the activation checklist. In v1 it always reports **STATUS: DEFERRED** and exits 0.

### 2. In v1 — do NOT author 3D; defer to a 2D approximation
If the storyboard or brief implies 3D, **do not** install `@remotion/three`, write `<ThreeCanvas>`, or add
`three`/`@react-three/fiber`. Instead:
- Hand back to **`rm-build`** to author a **2D approximation** of the same idea (the Frame's JTBD-5 RAM
  fallback): a 3D product spin → a `KenBurns` / parallax pan over a flat cutout; a "3D ranked chart" →
  the 2D `Bar`/`BarChart` capability; a cinematic 3D camera → layered parallax + `interpolate` on scale.
- Record the deferral in `artifacts/<project>/state.md` (one line: *"3D requested → authored 2D
  approximation; `@remotion/three` deferred to REQ-005 RAM tier (rm-3d)"*) so the decision is auditable.
- The render then passes `rm-build`'s contract rule **C9** (no `@remotion/three`/Skia/Rive; 2D only;
  ≤30 s; ≤1080p) and clears `rm-validate`'s forbidden-pattern lint, which **rejects** `@remotion/three`,
  `ThreeCanvas`, and `@react-three` in v1.

### 3. (Reference) what activation would look like — read `references/3d.md`
The full frame-driven-3D contract lives in `references/3d.md` (ported from the bundled official rule
`remotion-best-practices/rules/3d.md`). The load-bearing rules, summarized:
- **Add the package** per-project: `npx remotion add @remotion/three` (pulls `three` + `@react-three/fiber`,
  pinned to the one resolved Remotion version like every other `@remotion/*`).
- **Wrap all 3D in `<ThreeCanvas width={width} height={height}>`** (dimensions from `useVideoConfig()`);
  include real lighting (`<ambientLight>` + `<directionalLight position>`), or the mesh renders black.
- **Animate with `useCurrentFrame()` only.** Shaders/models/cameras **MUST NOT** self-animate;
  **`useFrame()` from `@react-three/fiber` is FORBIDDEN** — wall-clock motion flickers/freezes under the
  headless frame-stepping renderer. Drive rotation/position off the frame: `rotation={[0, frame*0.02, 0]}`.
- **`<Sequence>` inside `<ThreeCanvas>` MUST set `layout="none"`** (no DOM layout box inside the canvas).
- **Determinism** (rm-build contract C3): any randomness uses the engine's seeded `noise`/`random("<seed>")`,
  never `Math.random`; the same pinned `seed` makes the vision grade meaningful.
- **RAM**: keep it to ONE canvas, low poly, short duration, ≤1080p, `--concurrency=1` — even under the new
  tier, Three.js is the heaviest surface in the catalog.

## Outputs
- `artifacts/<project>/remotion-project/src/components/three/` — frame-driven `<ThreeCanvas>` scene
  components composed into `rm-build`'s app. **GATED on REQ-005: in v1 this directory is NOT created and
  this skill writes NOTHING.** The path is the activation target documented here so a future promotion
  knows exactly where the components land; it is **not** a v1 deliverable.
- v1 side effect (not a file): a one-line deferral note appended to `state.md` by the caller when a brief
  implied 3D and a 2D approximation was authored instead.

## Failure / fallback
- **A brief demands 3D and 2D won't satisfy it** → in v1 this is a **known capability gap**, not a bug.
  Author the closest 2D approximation (step 2), state the limitation plainly in `06-summary.md`/`state.md`,
  and flag REQ-005 as the unblocker. Never silently install `@remotion/three` to "make it work" — it will
  OOM (Exit-137) at full render and waste the run.
- **`@remotion/three` somehow reaches `remotion-project/`** → `rm-validate`'s contract lint blocks it
  (forbidden-pattern list includes `@remotion/three`/`ThreeCanvas`/`@react-three`/`useFrame(`). Remove it
  and re-author 2D; do not override the gate in v1.
- **`scripts/check.sh` can't read memory** → it degrades gracefully (prints `mem: unknown`) and still
  reports DEFERRED; the probe is informational only and never blocks.

## Activation checklist (when REQ-005 lands — do NOT do this in v1)
1. Confirm the runtime RAM tier raised the per-render ceiling and re-measure a Three.js render envelope.
2. Promote this skill: bump `metadata.version`, relax rm-build contract **C9** for the new tier, and let
   `rm-build` compose `<ThreeCanvas>` scenes from `references/3d.md`.
3. Add `@remotion/three` (+ `three`, `@react-three/fiber`) to the starter, pinned to the one Remotion
   version (`init.sh`/`render.sh` enforce the pin).
4. Replace `evals/evals.json`'s placeholder with graded, vision-judged 3D expectations (Charter owns this).
5. Lift the forbidden-pattern entries for `@remotion/three`/`ThreeCanvas`/`@react-three` in `rm-validate`
   for the activated tier only.
