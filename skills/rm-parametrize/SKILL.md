---
name: rm-parametrize
description: "DEFERRED / scaffolded-not-active (gated on REQ-005 RAM). Documents the data-driven + batch-at-scale parametrization pattern for a built Remotion app: a Zod props schema + calculateMetadata that turn ONE composition into N personalized variants from a dataset (GitHub-Unwrapped / Spotify-Wrapped class — one MP4 per row). When active it reads a dataset (CSV/JSON, one record per variant) + the per-project remotion-project/ and writes per-variant props + a batch manifest that rm-render iterates. It authors NO React itself (rm-build composes the schema/calculateMetadata) and it does NOT render (rm-render renders). INACTIVE in v1: scripts/check.sh prints the deferral and the activation gate; the durable how-to lives in references/parameters.md. Do NOT run it on the default phase chain — single videos go straight through build→validate→render."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: []
  inputs:
    - name: dataset
      type: x-file
      required: true
      description: "The batch source — a CSV or JSON array with ONE record per output variant (e.g. one row per user/quarter/region). Each record's fields map onto the composition's Zod props. Required only when this skill is ACTIVE; ignored while deferred."
    - name: remotion-project
      type: x-dir
      required: true
      description: "artifacts/[project]/remotion-project/ — the built app whose src/schema.ts Zod schema the per-variant prop sets must satisfy (built by rm-build, gated by rm-validate). Required only when ACTIVE."
  outputs:
    - name: batch
      type: x-dir
      path: artifacts/<project>/remotion-project/batch/
      description: "GATED (REQ-005). When active: per-variant prop files (variant-NNNN.props.json, each satisfying the composition Zod schema) + manifest.json (the list of {compositionId, props, outName} rm-render iterates). While deferred this directory is NOT produced — scripts/check.sh prints the deferral instead."
---

# rm-parametrize — data-driven + batch-at-scale variants (DEFERRED STUB)

> **Status: scaffolded-not-active.** This skill is GATED on **REQ-005 (sandbox RAM)** and ships **inactive
> in v1**. It has NO render-producing scripts — `scripts/check.sh` only prints the deferral. The durable
> how-to is captured now (`references/parameters.md`) so the capability activates with a one-line gate flip
> when the RAM tier lands. Until then, **do not route the phase chain through this skill** — single videos
> go straight through `rm-build → rm-validate → rm-render`.

## Purpose
Turn ONE validated Remotion composition into **N personalized variants** from a dataset — the
GitHub-Unwrapped / Spotify-Wrapped pattern (one MP4 per user/row/segment). It is the *batch* layer on top of
the studio: `rm-build` already exposes the composition's facts as **Zod props**, so a record set + a
`calculateMetadata` that adapts per props is all that separates "one video" from "ten thousand." This skill
emits the **per-variant prop sets + a batch manifest**; `rm-render` renders each entry with `--props`.

It authors **no** React (that is `rm-build`) and renders **nothing** (that is `rm-render`). It only shapes
*props at scale*. See `references/parameters.md` for the Zod-schema + `calculateMetadata` contract.

`$SKILL` below = this skill's directory.

## Why it is deferred (REQ-005)
Batch-at-scale multiplies the render cost the studio is already RAM-bound by: the ~1.9 GB starter OOMs
(`Exit-137`) above ~1.9 GB even at `--concurrency=1`, and a fan-out of many compositions amplifies peak
memory and wall-clock. v1 is **CPU-2D, one render at a time**. Activating batch needs the **REQ-005 RAM
tier** (a larger `sl8-animation` instance / per-variant memory headroom) so a manifest of variants renders
without OOM. Maps (`maplibre.md`) are separately blocked on a Mapbox token. Until REQ-005 ships, this skill
stays a documented stub.

## When to run (when ACTIVE)
- **Batch / personalization job**: the user wants the SAME composition rendered once per record (per user,
  per quarter, per region) — a roll-up like Spotify-Wrapped, a templated certificate run, a per-segment ad set.
- It slots **after** `rm-validate` (the composition is proven on its default props) and **before** a
  fan-out of `rm-render` calls (one per manifest entry).
- Do NOT use it for a single video, to author React (`rm-build`), to validate (`rm-validate`), or to render
  (`rm-render`).

## Inputs (read-before-write)
- `<dataset>` (required when active) — a CSV or JSON array, **one record per variant**; fields map onto the
  composition's Zod props.
- `artifacts/<project>/remotion-project/` (required when active) — the built, validated app; `src/schema.ts`
  is the contract every variant's props must satisfy.
- **While deferred there is no read step** — `check.sh` reports the gate and stops.

## Procedure

### 0. Gate check (always first)
```bash
bash "$SKILL/scripts/check.sh"
```
`check.sh` prints the **DEFERRED** banner, the REQ-005 activation gate, and a best-effort RAM probe, then
exits non-zero (`3` = deferred). **In v1 this is where the skill ends:** record "rm-parametrize deferred
(REQ-005)" in `state.md` and fall back (below). Do not author or render. The numbered steps run only once
the gate flips active.

### 1. Read schema + dataset *(active only)*
Read `remotion-project/src/schema.ts` (the Zod props the composition expects) and the dataset. Confirm every
record carries the fields the schema requires; coerce types to match the schema (numbers as numbers, colors
as the plain `z.string()` hex the contract uses — **never** `@remotion/zod-types`, which peers on a different
zod major; this project pins **`zod@4`**). See `references/parameters.md`.

### 2. Make the composition data-driven *(active only)*
The composition must derive its duration/dimensions/props **from props**, not constants — via
`calculateMetadata` on the `<Composition>` (`references/parameters.md` §"calculateMetadata"). This is a
`rm-build` edit (extend `schema.ts` + add `calculateMetadata`), not something this skill writes; this skill
*verifies* the composition is parametrizable before fanning out.

### 3. Emit per-variant props + manifest *(active only)*
For each record, write `batch/variant-NNNN.props.json` (the record mapped onto the schema) and append a
`batch/manifest.json` entry `{ "compositionId": "...", "props": "batch/variant-NNNN.props.json", "outName":
"<slug>-<key>" }`. Validate each prop file against the schema before writing (a failing record is dropped to
`batch/rejects.json` with the zod error — never silently rendered wrong).

### 4. Hand off to rm-render *(active only)*
`rm-render` iterates `manifest.json`, calling `remotion render <id> --props=batch/variant-NNNN.props.json
--output=exports/<outName>-<ar>.mp4` per entry (pinned Chrome Shell, `--concurrency=1`, ffprobe-verify each).
This skill never invokes the renderer itself.

## Outputs
- **GATED (REQ-005).** When active: `artifacts/<project>/remotion-project/batch/` — per-variant prop files
  (`variant-NNNN.props.json`, each satisfying the composition's Zod schema) + `manifest.json` (the
  `{compositionId, props, outName}` list `rm-render` iterates), plus `rejects.json` for any record that
  failed schema validation.
- **While deferred:** **no** `batch/` directory is produced. `scripts/check.sh` prints the deferral and the
  activation gate; nothing is written under `artifacts/`.

## Failure / fallback
- **Deferred (the v1 default)** — `check.sh` exits `3`. Record "rm-parametrize deferred (REQ-005 RAM)" in
  `state.md` and tell the user batch/personalization-at-scale is a **future capability**; for now render
  variants **one at a time** by re-running the normal chain with each record's facts (JTBD-4 re-voice/restyle
  is the manual analog). Never attempt a fan-out render in v1 — it OOMs.
- **Active, but a record fails the schema** — drop it to `batch/rejects.json` with the zod error; continue the
  rest. Never render a variant whose props don't satisfy `src/schema.ts`.
- **Active, but the composition is not parametrizable** (constants instead of props / no `calculateMetadata`)
  — stop and route back to `rm-build` to make it data-driven (`references/parameters.md`); do not patch props
  the component ignores.

## Quality Criteria
- [ ] v1: `check.sh` prints the DEFERRED banner + the REQ-005 gate and exits non-zero; nothing is written.
- [ ] No active render/author scripts ship here (renders are `rm-render`; schema/`calculateMetadata` are `rm-build`).
- [ ] (Active) every emitted `variant-NNNN.props.json` validates against `src/schema.ts` before it is written.
- [ ] (Active) `manifest.json` is the single source `rm-render` iterates; rejects are explicit, never silent.
