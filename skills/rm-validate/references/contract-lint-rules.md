# Contract lint rules — what `validate.sh` forbids, and the fix for each

> Reference for the **rm-validate** gate. The full composition contract (C1–C12) lives in
> `rm-build/references/composition-contract.md` and `research/prompt-engineering.md §6`. This file is
> the **machine-checkable subset** the gate enforces with a static scan, plus the fix to route back to
> **rm-build** for each finding. The gate only *reports*; it never edits `src/` — fixes happen in
> rm-build (re-author in place; do NOT re-init).

## The gate ladder (cheap → expensive; first failure BLOCKS)

`validate.sh <remotion-project-dir> <out-snapshots-dir> [at-csv]` runs four checks in order and exits
`0` only if **all** pass. The first failing gate writes a **BLOCKED** verdict to `05-validation.md` and
stops — there is no point typechecking a version-skewed install, and no point rendering a still that
won't compile.

| # | gate | what it proves | block on |
|---|---|---|---|
| 1 | **version skew** (C11) | every `@remotion/*` + `remotion` resolve to ONE installed version | any mismatch, or `node_modules/remotion` missing |
| 2 | **`tsc --noEmit`** (C8 + general) | the authored React typechecks (the #1 LLM-authoring failure) | exit ≠ 0 |
| 3 | **contract lint** (C1–C9) | no forbidden runtime patterns in `src/` | any BLOCK-tier hit (below) |
| 4 | **still render** | the composition mounts, fonts load, frames are non-blank | a still fails / 0 captured |

Exit codes: `0` PASS · `2` BLOCKED (any gate) · `1` usage / missing project.

## How the scan reads the code (not the comments)

`scripts/strip-comments.mjs` blanks every `//` and `/* */` comment (keeping line numbers and **string
literals**) before grep runs. This matters: the engine documents the forbidden patterns in its **own
comments** (`// no Math.random / no CSS transition …`) — linting raw text would falsely BLOCK the
clean, render-proven starter. Strings are preserved, so a real CSS-in-JS string like
`style={{ transition: "all .3s" }}` is still caught. Findings print as `src/<file>:<line>: <code>`.

## BLOCK tier — any hit fails the gate

| code | contract | pattern (ERE, case-sensitive) | why it breaks the render | fix in rm-build |
|---|---|---|---|---|
| **C1-wall-clock** | C1 frame-driven | `setTimeout` · `setInterval` · `requestAnimationFrame` · `Date.now` · `performance.now` · `new Date(` | the renderer steps frames headless; wall-clock motion renders as one frozen frame | drive every animation off `useCurrentFrame()` + `interpolate`/`spring`; delays = a `<Sequence from={…}>` or a frame offset |
| **C2-css-anim** | C2 no CSS time anim | `@keyframes` · `animate-<x>` (Tailwind) · `transition:`/`animation:` (incl. `transitionDuration`, `animationName`, …) | "CSS transitions or animations are FORBIDDEN — they will not render correctly" (official SKILL.md) | replace with frame-driven `interpolate()`/`spring()`; for cross-scene motion use `<TransitionSeries>` + `@remotion/transitions` |
| **C3-random** | C3 deterministic | `Math.random` | non-deterministic — frames differ run-to-run, so the vision grade is meaningless | use `random("<seed>")` from `remotion` (or the engine `rng.ts`) with a fixed `seed` prop |
| **C5-font-link** | C5 fonts via engine | `fonts.googleapis` | a bare Google Fonts `<link>`/CSS is a network dependency that flakes in-sandbox | `@remotion/google-fonts/<Family>` `loadFont({ weights, subsets })`, or bundled local fonts via `loadFont`+`staticFile` (the engine `fonts.ts` already does this) |
| **C6-native-tag** | C6 media components | `<img …` · `<video …` · `<audio …` (lowercase) | native tags don't block the render on load → blank/partial frames | `<Img>` / `<OffthreadVideo>` / `<Audio>` (capitalized Remotion components) |
| **C7-asset-path** | C7 staticFile | string-literal `src="…"` / `src='…'` that is **not** `staticFile(` and **not** `http(s):` | a relative/fs path doesn't resolve inside the render bundle | stage the asset into `public/` and address it `src={staticFile("name.ext")}`; remote URLs only when explicitly allowed |
| **C9-3d-gpu** | C9 RAM-safe v1 | `@remotion/three` · `@react-three` · `ThreeCanvas` | 3D/GPU blows the ~1.9 GB sandbox ceiling → Exit-137 OOM; deferred to REQ-005 | keep v1 2D (CSS/SVG/`@remotion/{shapes,paths}`); a 3D-implying idea gets a 2D approximation |

> C7 false-positive note: a literal `src="https://…"` is **allowed** (filtered out by the `http` guard),
> as is any `src={staticFile(…)}` expression (the char after `=` is `{`, not a quote, so it never
> matches). Only a quoted relative/bare path trips it.

## WARN tier — advisory; recorded in the report, never blocks

| code | contract | signal | action |
|---|---|---|---|
| **C5-loadfont** | C5 | `loadFont()` with **no** options object | the default `loadFont()` fired 63–126 network requests at render in the PoC (flaky). Pass `{ weights, subsets }`. |
| **C4-interpolate** | C4 clamped | a file uses `interpolate(` but never names `extrapolate`/`clamp` anywhere | likely an unclamped ramp (overshoot → off-screen / negative opacity / NaN size). Set `extrapolateLeft:"clamp"`, `extrapolateRight:"clamp"` unless an unbounded ramp is intended. |

C4 is advisory because per-call clamp detection needs an AST (a call can span lines); the still + vision
grade catch the visible overshoot. C10 (timeline ends exactly at `durationInFrames`) and C12 (pixel
legibility / safe zone) are **not** grep-checkable — they are judged by the **vision grade** on the
stills (see `05-validation.md`'s "Vision grade" block).

## Still render — the non-blank proof

After the cheap gates pass, `validate.sh` renders ONE frame per requested timestamp at `--scale=0.25`
(`remotion still <CompId> --frame=<t*30>`), with the pinned `--browser-executable=$CHROME_HEADLESS_SHELL`
and `--gl=angle`. It uses the **global** `remotion` binary (or the project-local `.bin`) — never
`npx --yes`, which would re-download (~25× slower). The composition id comes from `props.json`
`compositionId`, else the first `<Composition id="…">` in `src/` (preferring a `16x9` id). A still that
fails to render, or 0 stills captured, is a hard BLOCK; a <3 KB "thin" PNG is flagged for the vision
grade (likely a near-blank/solid frame). The PNGs land in the snapshots dir for the session to read.

## After a BLOCK

The report names the gate and the exact findings. Route to **rm-build**, fix `src/` in place
(`tsc` errors → types/imports/props; lint hits → the fix column above; still failures → mount/Chrome),
then re-run `validate.sh`. Never run **rm-render** on a BLOCKED composition.
