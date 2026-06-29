# Stage 2 — resolve-seed

Reads the persistent **Layer 2** kit at `artifacts/seed/` and makes it available to this short.
Per `docs/features/video-director-fleet/07-seed-element-interface.md`. This maker only **reads**
the kit; the only writer is `bot-035-update-character`.

**Reads:** `context.md`, `artifacts/seed/seed.manifest.json` (+ `style.md`, `identity.md`).
**Writes:** `artifacts/<slug>/seed-snapshot/` (the consumed kit, copied for self-containment).

This is a **token** kit with **`consumption: text-weave`** — identity is pinned by 5–7 frozen
CHARACTER tokens woven verbatim into every keyframe prompt. **There are NO PNG anchors**
(`anchors: []`); the keyframes are synthesized per project from the tokens at stage 4.

---

## Step 1 — Read the manifest (bootstrap if absent)

Read `artifacts/seed/seed.manifest.json`.

- **If `artifacts/seed/` is absent (first run) → bootstrap.** Run `bot-035-update-character`'s
  **freeze routine** (it ships `templates/seed/` defaults and is the only writer of the kit): it
  copies the template, freezes the 5–7 tokens into the manifest, and runs the free token-lock
  linter. Then re-read the manifest. This is the documented `make-video` → `update-seed` first-run
  coupling — kit generation lives in one place. **No anchors are generated (token kit).**
- **If `context.md` has `Reset seed: true` (intent = reset-character) →** run
  `bot-035-update-character`'s **reset** route first (archive the live kit → re-read the edited
  `style.md`/`identity.md` → re-freeze tokens → re-run the token-lock linter → bump provenance),
  then re-read the manifest. **This is FREE and instant — no image-gen** (token reset asymmetry).
- **If the kit is present and complete and no reset asked (continue-series / new-short) →**
  **reuse** it: no writes to `artifacts/seed/`, no re-freeze, no cost.

## Step 2 — Gate `kitType ∈ acceptsKitTypes`

Assert `manifest.kitType` is in `manifest.recipe.acceptsKitTypes`. For this bot that is
`token ∈ ["token"]`. **On mismatch, do NOT silently proceed** — write a clean recorded failure in
`state.md` ("kit-type `<x>` not supported by this recipe — bot-035 is a token / Hailuo
first-last recipe") and mark stage 2 `blocked`. Never render from an unsupported kit. (An
image-anchor kit dropped in here, for example, is a clean recorded failure, not a guess.)

## Step 3 — Load the seed elements

From the manifest, load (verbatim — never paraphrase):

- `seed` — the fixed integer seed (e.g. 2929) used for every keyframe in this short.
- `identity.tokens` — the **5–7 frozen CHARACTER tokens** (`"<key>: <token>"`). These are the
  text-level identity lock; stage 3 weaves them into the plan's `## Character` and the state
  descriptions, and stage 4 pastes them into every keyframe image prompt.
- `identity.blocks.STYLE_HEADER` — the look header (woven as the first sentence of every keyframe
  prompt) and `CHARACTER_BLOCK` if present.
- `style.md` → the `## Style` look paragraph (the same header) and the audio directive (the
  ambient bed source — Hailuo clips are silent).

There are **no anchor URLs to resolve** — token kit. The `consumption: text-weave` contract is
satisfied entirely by the frozen token strings.

## Step 4 — Dispatch on `consumption` → seed the shots

`consumption: text-weave`: the recipe weaves `identity.tokens` + the `STYLE_HEADER` **verbatim**
into each per-state keyframe prompt (stage 4). There is no `--ref` anchor file from the kit; the
per-state `--ref` chaining at stage 4 uses each *generated* keyframe as the ref for the next one
(so the character carries forward), but the kit itself ships no PNGs. No other consumption branch
applies here.

## Step 5 — Snapshot the kit into the project

Copy the consumed kit into `artifacts/<slug>/seed-snapshot/` so the short is independently
auditable. Token kit → there is no `anchors/` dir to copy:

```bash
mkdir -p artifacts/<slug>/seed-snapshot
cp artifacts/seed/seed.manifest.json artifacts/<slug>/seed-snapshot/
cp artifacts/seed/style.md           artifacts/<slug>/seed-snapshot/
cp artifacts/seed/identity.md        artifacts/<slug>/seed-snapshot/
```

Record in the decisions log which route ran: `reuse` / `reset` / `bootstrap`, and the frozen
tokens + seed used.

## Step 6 — Advance the ledger

Mark stage 2 `done`, set stage 3 `plan` `in-progress`. Update `next_action`:
"Stage 3 plan — write keyframe-plan.md (K+1 states / K scenes, frozen tokens woven verbatim),
validate with scripts/validate-keyframe-plan.sh." Note the snapshot path, the frozen tokens, and
the seed in the decisions log (stages 3 and 4 need them).
