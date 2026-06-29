# Stage 2 — resolve-seed

Reads the persistent **Layer 2** kit at `artifacts/seed/` and makes it available to this
episode. Per `docs/features/video-director-fleet/07-seed-element-interface.md`. This maker
only **reads** the kit; the only writer is `bot-033-update-character`.

**Reads:** `context.md`, `artifacts/seed/seed.manifest.json` (+ `style.md`, `identity.md`, `anchors/`).
**Writes:** `artifacts/<slug>/seed-snapshot/` (the consumed kit, copied for self-containment).

This is an **image-anchor** kit with **`consumption: ref-image`** — identity is pinned by
three reference PNGs, and the recipe passes the front anchor as `--ref`.

---

## Step 1 — Read the manifest (bootstrap if absent)

Read `artifacts/seed/seed.manifest.json`.

- **If `artifacts/seed/` is absent (first run) → bootstrap.** Run
  `bot-033-update-character`'s **generate routine** (it ships `templates/seed/` defaults and
  is the only writer of the kit): it copies the template, freezes the blocks, and generates
  the three anchors (PAID) with a pixel self-check. Then re-read the manifest. This is the
  documented `make-video` → `update-seed` first-run coupling — kit generation lives in one
  place; do not regenerate anchors here.
- **If `context.md` has `Reset seed: true` (intent = reset-character) →** run
  `bot-033-update-character`'s **reset** route first (archive the live kit → re-derive blocks
  from the edited `style.md`/`identity.md` → regenerate anchors PAID → self-check → bump
  provenance), then re-read the manifest.
- **If the kit is present and complete and no reset asked (continue-series / new-episode) →**
  **reuse** it: no writes to `artifacts/seed/`, no regen, no cost.

## Step 2 — Gate `kitType ∈ acceptsKitTypes`

Assert `manifest.kitType` is in `manifest.recipe.acceptsKitTypes`. For this bot that is
`image-anchor ∈ ["image-anchor"]`. **On mismatch, do NOT silently proceed** — write a clean
recorded failure in `state.md` ("kit-type `<x>` not supported by this recipe — bot-033 is an
image-anchor / Seedance i2v recipe") and mark stage 2 `blocked`. Never animate from an
unsupported kit.

## Step 3 — Load the seed elements

From the manifest, load (verbatim — never paraphrase):

- `seed` — the fixed integer seed (e.g. 4242) used for every still in this episode.
- `identity.blocks.STYLE_STACK`, `CHARACTER_BLOCK`, `DISCIPLINE`, `CONSTRAINTS` — the four
  frozen prompt blocks the still composer pastes into the 5-block prompt at stage 4.
- `style.md` → "Video style lock" (the first line of every clip prompt) and "Audio directive".
- `anchors[]` — in particular the `role: source` anchor (`refOrder: 1`); read its hosted URL
  from `identity.md`'s "Anchor views" table. **This URL is the `--ref` for `consumption:
  ref-image`** — it is passed to `gen-image.sh` for every scene still so the character holds.

If an anchor's hosted URL is missing (e.g. the kit was generated in a prior session and the
URL was not persisted), regenerate just that anchor via `bot-033-update-character` (do not
improvise) — the URL is the consumption contract.

## Step 4 — Dispatch on `consumption` → seed the shots

`consumption: ref-image`: the recipe passes the anchor file(s) as `--ref` in `refOrder`. For
this bot the single `--ref` is the hosted **source** anchor URL; the ¾/side anchors exist for
identity provenance and are available if a beat needs a non-front establishing pose. The
frozen blocks + fixed seed are the language-level lock that survives a ref-blind fallback
model. No other consumption branch applies here.

## Step 5 — Snapshot the kit into the project

Copy the consumed kit into `artifacts/<slug>/seed-snapshot/` so the episode is independently
auditable (mirrors BOT-013 copying character assets into the episode folder):

```bash
mkdir -p artifacts/<slug>/seed-snapshot
cp artifacts/seed/seed.manifest.json artifacts/<slug>/seed-snapshot/
cp artifacts/seed/style.md           artifacts/<slug>/seed-snapshot/
cp artifacts/seed/identity.md        artifacts/<slug>/seed-snapshot/
cp -R artifacts/seed/anchors         artifacts/<slug>/seed-snapshot/anchors
```

Record in `seed-snapshot/` (or the decisions log) which route ran: `reuse` / `reset` /
`bootstrap`, and the hosted source URL used as `--ref`.

## Step 6 — Advance the ledger

Mark stage 2 `done`, set stage 3 `plan` `in-progress`. Update `next_action`:
"Stage 3 plan — plan 3–8 beats from context.md, validate with scripts/validate-plan.sh."
Note the snapshot path and the `--ref` source URL in the decisions log (stage 4 needs it).
