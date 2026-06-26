# Composition contract — the non-negotiables every Remotion composition must honor

> Shared reference for the `rm-*` skill library. `rm-build` authors against this; `rm-validate`
> **enforces** the machine-checkable rules (version-skew → `tsc --noEmit` → contract lint →
> still-render → vision grade). Confirmed against the bundled starter (host-verified 2026-06-25:
> `tsc=0`, keyless render `h264/1920×1080/360f`) and the Step-0 PoC. Break it and you get a blank
> frame, a clipped glyph, an OOM, or a lint block — never a render. This is what makes generative
> authoring **safe to render headless**.

The model is told these rules up front (in the authoring prompt) **and** they are enforced after the
fact, so a model that ignores one still cannot ship a broken render — `rm-validate` routes the exact
diagnostic back to `rm-build` (bounded retries).

## The hard rules (C1–C12)

| # | Rule | Why | How enforced |
|---|---|---|---|
| C1 | **Frame-driven only.** All animation reads `useCurrentFrame()`/`interpolate`/`spring`; nothing animates off wall-clock. | The renderer steps frames headless; wall-clock motion renders as one frozen frame. | lint: ban `setTimeout`, `setInterval`, `requestAnimationFrame`, `Date.now`, `new Date(`, `performance.now` |
| C2 | **No CSS time-based animation.** No `transition:`, `animation:`, `@keyframes`, no Tailwind `animate-*`. | Per the official `SKILL.md`: "CSS transitions or animations are FORBIDDEN — they will not render correctly." | lint: ban `transition:`/`animation:`/`@keyframes`/`animate-` in style/className |
| C3 | **Deterministic.** No `Math.random()`; any randomness uses seeded `noise(seed,frame,salt)`/`hashStr` (engine `rng.ts`) or `random("<seed>")` from `remotion`, seed fixed in props. | Reproducible renders; the vision grade is meaningless if frames vary run-to-run. | lint: ban `Math.random`; require a seed plumbed through props |
| C4 | **Clamped interpolation.** Every frame-range `interpolate()` sets `extrapolateLeft:"clamp"` + `extrapolateRight:"clamp"` (unless an unbounded ramp is intended). | Unclamped values overshoot → opacity > 1, off-screen drift, NaN sizes. | lint: flag `interpolate(` calls lacking both `extrapolate*` |
| C5 | **Fonts via the engine.** Load through `engine/fonts.ts` (`resolveFontPack` / `FONT_PACKS`) — `@remotion/google-fonts/<Family>` with explicit `weights`+`subsets`, at module top level. Never a bare web `@font-face`, a Google CSS `<link>`, or an **unscoped** `loadFont()`. | PoC gotcha: an unscoped `loadFont()` fired **63–126 network requests at render** — flaky in-sandbox. The engine loads all packs once, deterministically. | lint: require `loadFont(` options with `weights`; ban `<link href="fonts.googleapis` |
| C6 | **Media components only.** `<Img>` not `<img>`; `<OffthreadVideo>` (standardize on it) for video, `<Audio>` for sound — never native `<img>`/`<video>`/`<audio>`. No `useFrame()` from `@react-three/fiber`. | Native `<img>` doesn't block the render on load → blank/partial frames. | lint: ban `<img `, `<video `, `<audio `, `useFrame(` |
| C7 | **Assets via `staticFile()`** from `public/`; remote URLs only when explicitly allowed. Content wrapped in `<SafeZone>`. | Render runs from a bundle; relative/`fs` paths don't resolve; edge text collides with platform UI. | lint: ban string `src=` paths not wrapped in `staticFile(` or `http`; SafeZone usage reviewed |
| C8 | **Zod-parametrized props.** A top-level `z.object()` schema on the `<Composition>`; on-screen facts arrive as **props** (frozen from `02-script.md`), not hard-coded magic strings. | Enables JTBD-4 restyle/resize/re-voice without touching facts; enables `calculateMetadata`. | lint: require `schema=` on `<Composition>`; `tsc` proves prop/schema agreement |
| C9 | **RAM-safe (v1).** 2D only; no `@remotion/three`/`ThreeCanvas`/`@react-three`/Skia/Rive/`@remotion/gpu`; ≤30 s; ≤1080p. | ~1.9 GB sandbox; >1.9 GB → Exit-137 OOM (BOT-015 hit it ×6). Renders run `--concurrency=1`. | lint: ban `@remotion/three`/`@react-three`; design caps duration/dims |
| C10 | **Timeline ends exactly at `durationInFrames`.** Sum of scene / `Series.Sequence` / `TransitionSeries` budgets == `durationInFrames`; no content past the end, no dead tail. | Trailing blank frames / a clipped last scene fail the vision grade and the ffprobe duration check. | review: budgets summed in the prompt; vision-grade the last frame |
| C11 | **Version-locked.** All `@remotion/*` + `remotion` resolve to **one** version (`init.sh` re-pins to the runtime's; `render.sh` re-applies). | "Version skew is the #1 render break." | `node` cross-check of installed `@remotion/*` vs `remotion` (init.sh step 6 + rm-validate stage 1) |
| C12 | **Pixel legibility & safe zone.** Headline ≥ 56 px at 1080-short-edge (engine `sizeFor` floors enforce this); body ≥ 36 px; key text inside `<SafeZone>` (AR-aware margins); strong contrast. | Short-form is watched from the frame; small/edge text fails the gradable rubric. | partly lint (font-size floors via `size()`), mostly vision grade |

C1–C8 and C11 are **machine-checkable** (the contract lint, fast/deterministic). C9–C12 are partly
structural, partly graded by the vision pass. A violation of any C1–C8/C11 rule is a **hard block**.

## Divergences from the official rules (what `rm-build` overrides)

The bundled official `remotion-best-practices` rules are authoritative **except** these, where the SL8
runtime / studio contract wins. Inline these whenever the official rule says otherwise — sandbox Claude
has no KB at runtime.

| Official rule says | We override to | Why |
|---|---|---|
| `voiceover.md`: ElevenLabs TTS | **ai-gen Kokoro** (`fal-ai/kokoro/american-english`) via `rm-voiceover` | keyless SL8 proxy; no ElevenLabs key in the sandbox |
| `transcribe-captions.md`: `@remotion/install-whisper-cpp` / OpenAI Whisper | **ai-gen Wizper** (`fal-ai/wizper`) for word timings; keep the `@remotion/captions` + `createTikTokStyleCaptions` **render half** | keyless, no ML-weight bundling; whisper-cpp is a future fully-offline Variation |
| `SKILL.md` "New project setup": `npx create-video@latest … my-video` | **copy the bundled starter** (`init.sh`); never scaffold from zero | the starter owns `registerRoot` / the contract / determinism / the pinned deps |
| `parameters.md` uses `@remotion/zod-types` with zod v3 | **plain `zod@4`** (no `@remotion/zod-types`); use `z.string()` for colors | `@remotion/zod-types@4.x` peers on zod v4; zod@3 → ERESOLVE (PoC gotcha) |
| `google-fonts.md` `loadFont()` default | pass **weights + subsets** (the engine already does) | default `loadFont()` made 63–126 network requests at render → flaky in-sandbox |
| `<Video>`/`<Audio>` from `@remotion/media` (newer rule) | standardize on **`<OffthreadVideo>`/`<Audio>`** (BOT-014 proves them in prod) | one canonical clip/audio component across the library |
| `3d.md`, `maplibre.md`, parametrized batch | **deferred** (`rm-3d`/`rm-parametrize` gated on REQ-005 RAM; maps need a Mapbox token) | the ~1.9 GB OOM ceiling; v1 is CPU-2D only |

## The engine you compose against (don't hand-roll)

The starter ships the harvested BOT-014 engine in `src/engine/` — reuse it before writing anything by
hand. Full API in `references/bot014-style-authoring.md`. Quick map:

- **`StyleConfig.tsx`** — `<FontProvider fonts={resolveFontPack(props.fontPack)}>` then
  `<StyleProvider palette={...}>`; inside, `useStyleConfig() → { palette, font, orientation, shortEdge,
  size }`. Branch layout on `orientation` (`"landscape"|"portrait"|"square"`); never hardcode px — read
  `size(k)`.
- **`tokens.ts`** — `FPS = 30`, `durationFrames(sec)`, type scale `size("hero"|"headline"|"dek"|"beat"|
  "meta"|"kicker"|"stat")` (legibility floors baked in: headline/hero ≥ 56, beat ≥ 36, meta ≥ 28).
- **`fonts.ts`** — four packs (`modern`/`editorial`/`bold`/`tech`); each `{ body, display, condensed }`;
  every family loaded once at module top level. Use `font.display`/`font.body`/`font.condensed`.
- **`SafeZone.tsx`** — `<SafeZone justify align>` — AR-aware content margins (portrait leaves room for the
  caption rail + buttons). Wrap every scene's content.
- **`primitives.tsx`** — `RiseIn`, `FadeIn`, `Counter{to,delay}` (tabular-nums), `Bar`, `Card`,
  `DividerWipe`, `KenBurns`, `parseStat`, `useSpringProgress`, `useInOut`. All clamped + spring-damped
  per contract.
- **`rng.ts`** — `noise(seed,frame,salt)`, `hashStr(s)` for any deterministic jitter (NEVER `Math.random`).
- **`StudioVideo.tsx` / `Root.tsx` / `schema.ts`** — the editable example composition + the per-AR
  `<Composition>` contract + the Zod schema. Edit these for templated work; add new files + register a new
  per-AR `<Composition>` for JTBD-5.

## Aspect ratio = a separate `<Composition>` (not a flag)
`Root.tsx` registers one `<Composition>` per orientation (`Studio-16x9` 1920×1080, `Studio-9x16`
1080×1920, `Studio-1x1` 1080×1080), each with `schema` + `calculateMetadata` (duration from
`durationSeconds`). A resize/restyle to a new AR **adds/keeps** the matching composition — `rm-render`
selects the id per requested AR. Never resize via a render flag.

## Common failures → fixes (what `rm-validate` will route back)
- `tsc` prop/schema mismatch → reconcile `schema.ts` ↔ component props ↔ `props.json` (all three agree).
- Blank/partial frame → native `<img>`/`<video>` (C6), asset not in `public/` (C7), or unscoped
  `loadFont` (C5).
- `interpolate` overshoot → add `extrapolateLeft/Right:"clamp"` (C4).
- Version-skew BLOCKED → a dep escaped the pin; re-run `init.sh` / `npm install <pkg>@<RV>` (C11).
- Exit-137 OOM → 3D / >30 s / >1080p slipped in (C9); stay 2D/≤30 s/≤1080p.
- Dead tail / clipped last scene → re-sum scene budgets to `durationInFrames` (C10).
- Tiny / edge text → use `size()` floors + `<SafeZone>` (C12).
