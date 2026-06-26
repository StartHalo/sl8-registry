---
name: rm-build
description: "Generatively author a Remotion (React) video composition from a storyboard, concept, and timing data. Copies a bundled, tsc-clean, render-proven Remotion starter (the harvested BOT-014 engine + the official remotion-best-practices Agent Skill), then authors FRESH React per 03-storyboard.md against a frozen composition contract + a Zod props schema, composing the engine primitives and capability components. Writes the remotion-project/ app + props.json. Use during the BUILD phase (phase 5) of any video project, on a RESTYLE/refine (re-author from unchanged facts), and as the JTBD-5 generative engine (\"describe ANY video\"). Authors only — it does NOT render or validate (rm-validate gates the build with tsc + contract lint + a still-render; rm-render produces the MP4). Keyless and deterministic (fixed seed)."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: []
  inputs:
    - name: storyboard
      type: markdown
      required: true
      description: "artifacts/[project]/03-storyboard.md — beats mapped to Remotion blocks (primitive, frame budget, transition, easing, per-beat @remotion/* packages, on-screen text)."
    - name: script
      type: markdown
      required: true
      description: "artifacts/[project]/02-script.md — the FACTS (on-screen text + VO lines). Pasted verbatim into props.json; never paraphrased or rounded."
    - name: concept
      type: markdown
      required: true
      description: "artifacts/[project]/01-concept.md — the visual contract: palette (hex), font pack, mood, aspect ratio(s) the composition is themed to."
    - name: timing
      type: json
      required: false
      description: "artifacts/[project]/04-timing.json — word-level timestamps (@remotion/captions-shaped) for caption sync and beat timing. Absent for silent / no-caption cuts."
    - name: assets
      type: x-dir
      required: false
      description: "artifacts/[project]/assets/ — voiceover wavs, cutouts, captures referenced by the composition; staged into remotion-project/public/ for staticFile(). Optional."
  outputs:
    - name: remotion-project
      type: x-dir
      path: artifacts/<project>/remotion-project/
      description: "A complete per-project Remotion app (src/ public/ package.json tsconfig.json .agents/skills/) that typechecks (tsc --noEmit = 0) and obeys the composition contract — what rm-validate gates and rm-render renders."
    - name: props
      type: json
      path: artifacts/<project>/remotion-project/props.json
      description: "The frozen render props (facts from 02-script.md + palette + durationSeconds + seed) that satisfy the composition's Zod schema. rm-render passes it with --props."
---

# rm-build — generatively author the Remotion composition

## Purpose
Turn the frozen plan (`03-storyboard.md` themed to `01-concept.md`, with the facts from `02-script.md`
and optional `04-timing.json`) into a real Remotion app under `artifacts/<project>/remotion-project/`:
freshly-authored React scenes built on the harvested engine, plus a `props.json` of frozen facts. You do
**not** start from a blank page and you do **not** `npx create-video` — you copy a **bundled, tsc-clean,
render-proven starter** (`scripts/remotion-template/`, with the BOT-014 engine, the per-AR contract, and
the official `remotion-best-practices` skill already wired) and author the composition into it. The output
is the app `rm-validate` gates and `rm-render` renders.

This is the **hybrid generative engine**: bundled starter (frozen contract + harvested engine) + the
official Remotion rules (loaded by `use remotion best practices`) + Claude authoring fresh React + a strict
validate gate before any full render. It powers all 5 JTBDs — JTBD-5 ("describe any video") is the
open-ended case; JTBD-1/2/3/4 are the same engine with a narrower prompt (`references/authoring-method.md` §11).

`$SKILL` below = this skill's directory.

## When to run
- **Build** (phase 5): after `01-concept.md`/`02-script.md`/`03-storyboard.md` (and, for narrated/captioned
  work, `04-timing.json` + `assets/`) exist — before validate/render.
- **Restyle / resize / re-voice** (JTBD-4): re-author from the SAME `02-script.md`/`03-storyboard.md`
  facts — change palette / fonts / AR / motion, never the facts. Edit `remotion-project/` **in place**
  (do not re-init); a different aspect ratio is a **new `<Composition>`** in `Root.tsx`, not a flag.
- **Describe any video** (JTBD-5): author a brand-new composition for an open-ended brief.
- Do NOT use to render (that is `rm-render`) or to write the storyboard/script (upstream skills).

## Inputs (read-before-write)
- `artifacts/<project>/03-storyboard.md` (required) — the beat → Remotion-block plan.
- `artifacts/<project>/02-script.md` (required) — the **facts**; on-screen text + VO lines pasted verbatim.
- `artifacts/<project>/01-concept.md` (required) — palette (hex), font pack, mood, AR(s).
- `artifacts/<project>/04-timing.json` (optional) — word timings for captions / beat sync.
- `artifacts/<project>/assets/` (optional) — voiceover/cutouts/captures referenced by the composition.
- **Missing required input** (no storyboard, script, or concept): record the gap in `state.md` and stop —
  do not invent a storyboard or facts. **Missing optional**: proceed (no captions / no media) and note it.

## Instructions

### 1. Read the plan
Read `01-concept.md` (palette + hex, font pack, mood, AR), `02-script.md` (the **facts** — exact on-screen
text and VO lines), and `03-storyboard.md` (each beat: primitive, frame budget, transition, easing,
per-beat `@remotion/*`). If present, read `04-timing.json` (word timings) and list `assets/`. **On-screen
text and numbers are taken verbatim from the script — never invented, paraphrased, or rounded.**

### 2. Scaffold from the bundled starter
```bash
bash "$SKILL/scripts/init.sh" artifacts/<project>/remotion-project
# restyle/refine: re-author in place; re-init only to discard, with --force
```
This copies `remotion-template/` (engine in `src/engine/`, the `StudioVideo` contract, the per-AR
`Root.tsx`, the official `remotion-best-practices` skill at `.agents/skills/`), stages `assets/`
(`vo→public/voiceover`, `cutouts→public/cutouts`, `captures→public/captures`), **re-pins every
`@remotion/*` to one resolved version** (skew is the #1 render break), and installs. You now have a
tsc-clean, render-proven baseline.

### 3. Construct the authoring prompt (see `references/authoring-method.md`)
`rm-build` is a deterministic prompt assembler. Build ONE well-formed authoring prompt from the artifacts:
- **Open with the literal phrase `use remotion best practices`** (alias `use remotion skills`) — the
  canonical loader for the official rules. Every authoring turn opens with it; without it the model emits
  exactly what the contract forbids (CSS `@keyframes`, native `<img>`, deprecated imports).
- **Name the rule files the storyboard implies** so they load up front, not mid-author (task→rule index in
  `authoring-method.md` §2: `compositions.md`/`timing.md`/`sequencing.md`/`transitions.md`/`video-layout.md`
  always; `+ voiceover.md`/`audio.md`/`subtitles.md` for JTBD-1; `+ subtitles.md`/`display-captions.md`
  for JTBD-3; `+ @remotion/paths` for JTBD-2 charts).
- Inject: **resolution + fps** (`30fps`; `16:9→1920×1080`, `9:16→1080×1920`, `1:1→1080×1080`),
  **palette hex literals**, **font pack**, **frame-budgeted scenes whose budgets sum to durationInFrames**,
  **timestamped beats** (from the storyboard, unchanged), **on-screen text verbatim** (FACTS), **assets by
  local path** (become `staticFile()` after staging), and the **Zod props** to expose.
- State the **contract (C1–C12)** and end with: *author the files only; do NOT run a full render.*

### 4. Author fresh React (honor the contract)
Follow `references/composition-contract.md` exactly — it is enforced after the fact by `rm-validate`.
Two authoring shapes:
- **Templated (JTBD-1/2/3/4)** — the brief fits the title→stat→outro shape: edit `src/schema.ts` (extend
  the Zod schema for your fields) and `src/StudioVideo.tsx` (re-author the scenes), or add
  `src/components/<Name>.tsx` and compose them in. The per-AR `Root.tsx` already registers
  `Studio-16x9/-9x16/-1x1` with `schema` + `calculateMetadata`-derived duration — usually unchanged.
- **Open-ended (JTBD-5)** — write brand-new components under `src/components/`, a fresh composition
  `src/<Comp>.tsx`, its own Zod schema, and **register a `<Composition>` per requested AR** in `Root.tsx`
  (id `<Comp>-16x9` etc.; one composition per orientation — never a render flag).

Compose, do not hand-roll: the engine gives you `StyleProvider`/`FontProvider`/`SafeZone`,
`useStyleConfig()→{palette,font,orientation,shortEdge,size}`, the type scale (`size("hero"|"headline"|
"dek"|"beat"|"meta"|"kicker"|"stat")`), and primitives (`RiseIn`, `FadeIn`, `Counter`, `Bar`, `Card`,
`DividerWipe`, `KenBurns`, `parseStat`, seeded `noise`/`hashStr`). Capability skills drop in vetted
components (`CaptionOverlay`, `BarChart`/`LineChart`, `Spectrum`/`Waveform`) — `rm-build` composes them.
The engine API is documented in `references/bot014-style-authoring.md`.

The load-bearing contract rules (full list in `composition-contract.md`):
- **Frame-driven only**: `useCurrentFrame()` + `interpolate`/`spring`. No `setTimeout`/`setInterval`/
  `Date.now`/`performance.now`/`requestAnimationFrame`. No CSS `transition`/`animation`/`@keyframes`,
  no Tailwind `animate-*`.
- **Deterministic**: no `Math.random` — seeded `noise(seed,frame,salt)`/`random("<seed>")` only; pin the
  `seed` in props.
- **Clamped interpolate**: every frame-range `interpolate()` sets `extrapolateLeft:"clamp"` +
  `extrapolateRight:"clamp"`.
- **Fonts via the engine** (`engine/fonts.ts` `resolveFontPack`): never a bare web `@font-face`, never an
  unscoped `loadFont()` (it fires 63–126 network requests at render → flaky). Pass weight/subset options.
- **Media components only**: `<Img>` not `<img>`; `<OffthreadVideo>`/`<Audio>` (standardize on these), not
  native tags; no `useFrame()` from r3f.
- **Assets via `staticFile()`** from `public/`; content inside `<SafeZone>`.
- **Zod props**: facts arrive as props (frozen from `02-script.md`), not hard-coded strings — this is what
  makes JTBD-4 restyle/resize/re-voice safe.
- **Timeline ends exactly at `durationInFrames`**: scene budgets sum to it; no dead tail.
- **RAM-safe v1**: 2D only — no `@remotion/three`/Skia/`@react-three`; ≤30s; ≤1080p (the ~1.9 GB sandbox
  OOMs → Exit-137).
- **Version-locked**: all `@remotion/*` resolve to ONE version (`init.sh` + `render.sh` enforce; `zod@4`,
  not `@remotion/zod-types`; plain `z.string` for colors).

### 5. Stage assets + write `props.json`
Ensure every referenced asset is under `remotion-project/public/` (init.sh stages `assets/`; copy any
late-produced file manually) and addressed via `staticFile("voiceover/intro.wav")`. Then write
`remotion-project/props.json` — the **frozen facts** (on-screen text + numbers from `02-script.md`),
palette hex, `durationSeconds`, and `seed` — matching the composition's Zod schema exactly. `props.json`
is what `rm-render` passes with `--props`; the starter's `defaultProps` let it render even if you omit it,
but always write it so facts are explicit and JTBD-4 can re-render unchanged.

### 6. Self-check, then hand to the gate (do NOT full-render)
```bash
cd artifacts/<project>/remotion-project && npx tsc --noEmit          # must be 0
grep -REn "Math\.random|setTimeout|setInterval|Date\.now|@keyframes|transition:|animate-|<img |<video " src && echo "CONTRACT HIT" || echo "contract grep clean"
```
Fix every `tsc` error and every contract grep hit. Do **not** run a full render — `rm-validate` owns
rendering (version-skew → tsc → contract lint → still-render key frames → vision grade). Hand off the
project at `tsc=0` with a clean grep.

## Outputs
- `artifacts/<project>/remotion-project/` — the complete per-project Remotion app: `src/` (engine +
  authored composition + `Root.tsx` with a `<Composition>` per AR), `public/` (staged `staticFile()`
  assets), `package.json`/`tsconfig.json` (pinned deps), `.agents/skills/remotion-best-practices/`.
  Typechecks (`tsc --noEmit = 0`); obeys the composition contract.
- `artifacts/<project>/remotion-project/props.json` — the frozen render props (facts + palette +
  `durationSeconds` + `seed`) satisfying the composition's Zod schema.

## Examples

### Example 1: 15 s API-feature teaser (JTBD-1, narrated)
`init.sh` → author prompt opens `use remotion best practices`, loads `voiceover.md`/`audio.md`/
`subtitles.md` → edit `schema.ts` (title, stat, outro, vo) + `StudioVideo.tsx`: `TitleScene` → `StatScene`
(`Counter` to the latency figure, `tabular-nums`) → `OutroScene`, `<TransitionSeries>` fade/slide,
`<Audio src={staticFile("voiceover/intro.wav")}>` synced per scene → write `props.json` → `tsc=0` → hand to
`rm-validate`.

### Example 2: revenue data-viz (JTBD-2)
Load `timing.md` + `@remotion/paths`; drop in `BarChart.tsx`; bind the 4 quarterly figures from
`03-storyboard.md`/`02-script.md` to bar heights via spring + `Counter`/`tabular-nums`. The numbers in the
markup MUST equal the input figures (no rounding the user didn't ask for).

### Example 3: restyle to bold + 9:16 (JTBD-4)
Re-author `remotion-project/` in place: keep `props.json` facts byte-identical, swap `fontPack`→`"bold"`
and the palette hex toward darker/bolder, ensure a `<Composition>` `…-9x16` (1080×1920) is registered in
`Root.tsx`. `02-script.md`/`03-storyboard.md` unchanged.

### Example 4: describe any video (JTBD-5, open-ended)
Author a fresh `src/PulseLaunch.tsx` + components from the storyboard, its own Zod schema, register
`PulseLaunch-16x9`/`-9x16` in `Root.tsx`; compose engine primitives + whatever `@remotion/*` the idea
implies (per the §2 rule index). Refinement turns ("make the intro faster") edit the file and re-run the
gate — never rewrite from scratch.

## Troubleshooting
- **`tsc` prop/schema mismatch** → a scene reads a prop the Zod schema doesn't declare (or vice versa).
  Reconcile `schema.ts` ↔ component props ↔ `props.json`; all three must agree.
- **Blank / partial frame at validate** → native `<img>`/`<video>` (use `<Img>`/`<OffthreadVideo>`), or an
  asset not in `public/` (stage it + `staticFile()`), or an unscoped `loadFont()` (use the engine pack).
- **`interpolate` overshoot** (opacity > 1, off-screen drift) → missing `extrapolate*:"clamp"`. Clamp it.
- **Version-skew BLOCKED** (rm-validate) → a dep escaped the pin. Re-run `init.sh` or
  `npm install <pkg>@<RV>` so every `@remotion/*` matches `node_modules/remotion`'s version.
- **Exit-137 OOM at render** → 3D / Skia / >30 s / >1080p slipped in. Stay 2D, ≤30 s, ≤1080p; renders run
  `--concurrency=1`.
- **Different AR not appearing** → a different orientation is a separate `<Composition>` in `Root.tsx`, not
  a render flag. Register `<Comp>-9x16` (1080×1920).
- **Facts drifted** (JTBD-2/4) → on-screen numbers/text must equal `02-script.md`. Re-quote them into
  `props.json` verbatim; never let the model paraphrase or round.

## Quality Criteria
- [ ] `remotion-project/` scaffolded from the bundled starter; `tsc --noEmit = 0`.
- [ ] Contract holds (C1–C12): frame-driven, no CSS/JS time animation, no `Math.random`, clamped
      interpolate, engine fonts, `<Img>`/`<OffthreadVideo>`, `staticFile()` assets, Zod props, 2D-only.
- [ ] A `<Composition>` registered per requested AR with `schema` + `calculateMetadata` duration; timeline
      ends exactly at `durationInFrames`.
- [ ] `props.json` written; on-screen text + numbers byte-identical to `02-script.md` (facts frozen).
- [ ] Themed to `01-concept.md` (palette hex + font pack); content inside `<SafeZone>`; varied easing.
- [ ] No full render run here (that is `rm-validate`/`rm-render`); handed off at `tsc=0`, grep-clean.
