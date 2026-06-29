# Stage 2 — resolve-seed

Reads the persistent **Layer 2** kit at `artifacts/seed/` and makes it available to this
shot. Per `docs/features/video-director-fleet/07-seed-element-interface.md`. This maker only
**reads** the kit; the only writer is `bot-036-update-character`.

**Reads:** `context.md`, `artifacts/seed/seed.manifest.json` (+ `style.md`, `identity.md`).
**Writes:** `artifacts/<slug>/seed-snapshot/` (the consumed kit, copied for self-containment).

This is a **token** kit with **`consumption: text-repeat`** — identity is pinned by **5–7
frozen text tokens only** (no PNG anchors), and the recipe repeats those tokens ≥80% verbatim
into the base prompt AND every extend hop.

---

## Step 1 — Read the manifest (bootstrap if absent)

Read `artifacts/seed/seed.manifest.json`.

- **If `artifacts/seed/` is absent (first run) → bootstrap.** Run
  `bot-036-update-character`'s **freeze routine** (it ships `templates/seed/` defaults and is
  the only writer of the kit): it copies the template and freezes the 5–7 tokens + the look
  block into `seed.manifest.json`, then re-runs the linter. **No image-gen, no anchors — free
  and instant.** Then re-read the manifest. This is the documented `make-video` → `update-seed`
  first-run coupling — kit generation lives in one place.
- **If `context.md` has `Reset seed: true` (intent = reset-character) →** run
  `bot-036-update-character`'s **reset** route first (archive the live kit → re-read the edited
  `style.md`/`identity.md` → re-freeze the tokens → re-run the linter → bump provenance), then
  re-read the manifest. **Token reset is FREE** — there are no anchors to regenerate
  (`anchors: []` makes "regenerate anchors" a declared no-op).
- **If the kit is present and complete and no reset asked (continue-channel / new-shot) →**
  **reuse** it: no writes to `artifacts/seed/`, no cost.

## Step 2 — Gate `kitType ∈ acceptsKitTypes`

Assert `manifest.kitType` is in `manifest.recipe.acceptsKitTypes`. For this bot that is
`token ∈ ["token"]`. **On mismatch, do NOT silently proceed** — write a clean recorded failure
in `state.md` ("kit-type `<x>` not supported by this recipe — bot-036 is a token / Veo
extend-chain recipe") and mark stage 2 `blocked`. Never render from an unsupported kit.

## Step 3 — Load the seed elements

From the manifest, load (verbatim — never paraphrase):

- `seed` — the fixed integer seed (e.g. 7777) recorded for provenance/reproducibility.
- `identity.tokens` — the **5–7 frozen CHARACTER tokens**. These are the language-level
  identity lock; they go verbatim into the plan's `CHARACTER:` block at stage 3 and are
  repeated ≥80% verbatim into the base + every hop at stage 4.
- `style.md` → the global look header (the first line of the continuous-plan) + the Audio
  directive (the native-audio phrase).
- `identity.blocks.CHARACTER_BLOCK` (optional, if present) — the prose subject sentence woven
  into the Base opening-frame description.

There is **no `--ref` and no anchor URL** — this is a token kit. The tokens themselves are the
lock; the base still is regenerated per project from them (stage 4).

## Step 4 — Dispatch on `consumption` → seed the shot

`consumption: text-repeat`: the recipe repeats `identity.tokens` (and the subject phrasing)
**≥80% verbatim** into the base-frame prompt, the base motion prompt, and EVERY extend hop.
This is the continuity contract that holds the subject across each Veo extend seam — the
extend model only sees the trailing frame + your text, so the tokens must recur nearly
word-for-word. No `ref-image` branch applies here (there are no anchors).

## Step 5 — Snapshot the kit into the project

Copy the consumed kit into `artifacts/<slug>/seed-snapshot/` so the shot is independently
auditable. **A token kit has no `anchors/` dir** — copy only the three invariant files:

```bash
mkdir -p artifacts/<slug>/seed-snapshot
cp artifacts/seed/seed.manifest.json artifacts/<slug>/seed-snapshot/
cp artifacts/seed/style.md           artifacts/<slug>/seed-snapshot/
cp artifacts/seed/identity.md        artifacts/<slug>/seed-snapshot/
```

Record in the decisions log which route ran: `reuse` / `reset` / `bootstrap`, and the frozen
tokens loaded (stage 3 weaves them into the plan's CHARACTER block).

## Step 6 — Advance the ledger

Mark stage 2 `done`, set stage 3 `plan` `in-progress`. Update `next_action`:
"Stage 3 plan — write continuous-plan.md from context.md + the seed tokens, validate with
scripts/validate-plan.sh." Note the snapshot path and the loaded tokens in the decisions log
(stage 3 needs them verbatim).
