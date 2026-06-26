---
name: rm-validate
description: "THE pre-render gate for a per-project Remotion app — run four cheap→expensive checks IN ORDER (version-skew → tsc --noEmit → contract lint → still-render key frames) and pass only if all pass. Reads artifacts/[project]/remotion-project/ (the app rm-build authored) and writes 05-validation.md (the pass/BLOCK verdict + findings) plus key-frame PNGs to snapshots/ for the session to vision-grade. Renders STILLS ONLY (one frame each at quarter-scale) — never a full render; that is rm-render's job, and only on a PASS. Use during the VALIDATE phase (phase 6), after rm-build and before rm-render, so a skewed/broken/contract-violating composition never wastes a full render. Local, keyless, headless."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [rm-build]
  inputs:
    - name: remotion-project
      type: directory
      required: true
      description: "artifacts/[project]/remotion-project/ — the per-project Remotion app authored + deps-installed by rm-build (src/, props.json, package.json, node_modules). 05-validation.md is written to its parent (the project dir)."
    - name: at-seconds
      type: text
      required: false
      description: "Comma-separated timestamps in seconds to still-render (e.g. \"2,6,11\"), one per beat/scene. Default = 3 points (~15%/50%/85%) derived from props.durationSeconds."
  outputs:
    - name: validation
      type: markdown
      path: artifacts/<project>/05-validation.md
      description: "The gate report — per-check results (skew, tsc, contract lint, stills), the PASS/BLOCKED verdict (naming the failing gate + findings), the captured-still paths, and the vision-grade instructions for the session."
    - name: snapshots
      type: png
      path: artifacts/<project>/snapshots/
      description: "One still PNG per requested timestamp (quarter-scale), for the pre-render vision check (legible? safe-zone? on-brand? composed? facts == input?)."
---

# rm-validate — skew → tsc → contract-lint → still gate

## Purpose
The cheap, deterministic gate that stands between authoring and a full render. A Remotion render in the
~1.9 GB sandbox is the expensive step; before paying it, prove the composition is renderable and
on-contract. `rm-validate` runs four checks **in order, cheap → expensive**, and passes only if all
pass: (1) every `@remotion/*` resolves to ONE version, (2) `tsc --noEmit` is clean, (3) the authored
`src/` contains none of the contract's forbidden runtime patterns, (4) `remotion still` renders real,
non-blank key frames. A clean pass means `rm-render` will produce a real MP4, not a blank/broken/skewed
one. The gate only **reports + blocks** — it never edits `src/` (that is `rm-build`).

`$SKILL` = this skill's directory.

## When to run
- **Validate** (phase 6): after `rm-build` left `remotion-project/` authored + installed, before
  `rm-render`. Every JTBD path (1 brief→video, 2 data→chart, 3 clip→captions, 4 restyle/resize/re-voice,
  5 describe-any-video) converges on this gate before a full render.
- After **any** edit to `remotion-project/src/` (a restyle, a re-voice swap, a hand-fix) — re-validate
  before re-rendering.
- Do **not** use it to author or fix the composition (that is `rm-build`) — validate only gates.

## Inputs (read-before-write)
- `artifacts/<project>/remotion-project/` (required) — the app `rm-build` authored. Must already have
  `node_modules` installed (skew check + tsc + still all need it). If `node_modules/remotion` is
  missing, the gate BLOCKS with "run rm-build (init.sh) first."
- `at-seconds` (optional) — one timestamp per beat (mid-scene reads best) so the stills cover the whole
  story. Omit to let the script pick 3 points from `props.durationSeconds`.
- Read `01-concept.md` (palette/fonts/mood) and `03-storyboard.md` (beats/density) **before** the vision
  grade — they are the rubric you grade the stills against. For JTBD-2, read the source data file so you
  can confirm on-screen figures == input exactly.

## Procedure

### 1. Run the gate
```bash
bash "$SKILL/scripts/validate.sh" \
  artifacts/<project>/remotion-project \
  artifacts/<project>/snapshots \
  "2,6,11"
```
The script runs, in order (see `references/contract-lint-rules.md` for the full rule table):
1. **Version skew (C11)** — `node` cross-checks `node_modules/remotion` vs every `node_modules/@remotion/*`. Any mismatch (or a missing install) → **BLOCK**.
2. **`tsc --noEmit` (C8 + general)** — strict typecheck via the project-local `tsc`. Exit ≠ 0 → **BLOCK** (the report carries the first 60 error lines).
3. **Contract lint (C1–C9)** — `strip-comments.mjs` blanks comments (keeping strings), then grep scans for the forbidden patterns: `Math.random`, CSS `transition`/`@keyframes`/`animation`/Tailwind `animate-*`, `setTimeout`/`setInterval`/`Date.now`/`performance.now`/`new Date(`, native `<img>`/`<video>`/`<audio>`, non-`staticFile()` asset paths, `@remotion/three`/`@react-three`. Any BLOCK-tier hit → **BLOCK** (loadFont-without-options and unclamped-`interpolate` are advisory WARNs).
4. **Still render** — the **global** `remotion` binary renders one frame per timestamp at `--scale=0.25` with `--browser-executable=$CHROME_HEADLESS_SHELL --gl=angle`, into the snapshots dir. A failed still or 0 captured → **BLOCK**.

It writes the full report to `artifacts/<project>/05-validation.md` and exits `0` only when all four
pass (`2` = BLOCKED, naming the gate).

### 2. If BLOCKED, route back to rm-build
A non-zero exit + a **BLOCKED** verdict names the failing gate and the exact findings. Read them (and
the fix column in `references/contract-lint-rules.md`), then go back to **rm-build**, re-author `src/`
**in place** (do NOT re-init), and re-run validate. Never proceed to `rm-render` on a blocked
composition. Record the block + the fix in `state.md`.

### 3. On PASS, vision-grade the stills (the real check)
A PASS means the composition compiles, is on-contract, and mounts — but the machine can't see whether it
*looks right*. **Read** each PNG in `artifacts/<project>/snapshots/` and judge the pixels, not the
filename, against `01-concept.md` + `03-storyboard.md`:
- **Legible** — headline + key facts present and readable; strong contrast.
- **Safe-zone** — text not clipped at the edges; correct for the aspect ratio (C12).
- **On-brand** — the concept palette (hex) + fonts applied, not generic defaults.
- **Composed** — hierarchy + density per the storyboard; not a centered single element.
- **Facts (JTBD-2)** — every on-screen figure == the input data exactly (no rounding/invention).
- **Ends clean (C10)** — the last timestamp is real content, not a dead/black tail or a clipped scene.

If any frame looks wrong (blank, clipped, wrong font, off-brand, wrong number), note it in
`05-validation.md` and route the fix to **rm-build** before rendering. A <3 KB "thin" still is flagged by
the script as a likely near-blank — confirm it by eye.

## Outputs
- `artifacts/<project>/05-validation.md` — per-check results, the PASS/BLOCKED verdict (with the failing
  gate + findings), the captured-still paths, and the vision-grade block (plus your notes).
- `artifacts/<project>/snapshots/` — one still PNG per requested timestamp, for the pre-render vision
  check.

(These two paths are the gate's contract — restated here to match the frontmatter `outputs.path`.)

## Failure / fallback
- **`node_modules/remotion` missing** → BLOCK "run rm-build (init.sh) first." The gate needs the install
  for skew + tsc + still. Do not try to install here — that is rm-build's job.
- **Version skew** (a `@remotion/*` at a different version) → BLOCK. The fix is to re-pin every
  `@remotion/*` + `remotion` to ONE version and reinstall (`rm-build/scripts/init.sh` does this); skew is
  the #1 render break.
- **Stills fail / 0 captured** → BLOCK. On `sl8-animation` confirm the pinned Chrome Headless Shell
  exists (`$CHROME_HEADLESS_SHELL` / `/opt/remotion/chrome-headless-shell`); the still does **not**
  download Chrome. On the host playground the flag is absent and the system Chrome is used.
- **No `props.json`** → fine; stills render with the composition's `defaultProps`.
- **Can't determine a composition id** → BLOCK; rm-build must register at least one `<Composition>` (or
  set `compositionId` in `props.json`).
- **A legitimate identifier trips the lint** (e.g. a variable literally named `transition`) → rename it
  in rm-build; the lint errs toward blocking, which is the intended discipline.

## Quality criteria
- [ ] The four checks run **in order** and the gate exits `0` only when **all** pass; the first failure
      BLOCKS and stops (no still-render on a skewed/uncompilable/contract-violating app).
- [ ] `05-validation.md` records each check's result, the verdict, the findings, and the still paths.
- [ ] A composition with a version skew, a type error, a forbidden pattern, or a failed still is
      **BLOCKED** (exit 2) and routed back to rm-build — never rendered.
- [ ] On a clean app the gate **PASSES** and captures one non-blank still per timestamp for the vision
      grade; the verdict names the warning/finding counts and the captured-frame paths.
