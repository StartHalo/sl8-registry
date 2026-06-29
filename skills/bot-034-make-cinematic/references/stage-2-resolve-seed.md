# Stage 2 — resolve-seed

Reads the persistent **Layer 2** character bible at `artifacts/seed/` and makes it available
to this cinematic. Per `docs/features/video-director-fleet/07-seed-element-interface.md`. This
maker only **reads** the kit; the only writer is `bot-034-update-character-bible`.

**Reads:** `context.md`, `artifacts/seed/seed.manifest.json` (+ `style.md`, `identity.md`, `anchors/`).
**Writes:** `artifacts/<slug>/seed-snapshot/` (the consumed kit, copied for self-containment).

This is an **image-anchor** kit with **`consumption: ref-image`** — identity is pinned by two
reference PNGs (a multi-view turnaround and a hero portrait), and the recipe passes them as
`--ref` so the SAME character holds across every cut of the single reference-to-video pass.

> **New-architecture win:** BOT-027 regenerated a character bible *every project*. Here the
> bible is a **one-time channel kit** — locked once by `bot-034-update-character-bible`, reused
> by every cinematic (no per-project bible cost). That is the whole point of resolve-seed.

---

## Step 1 — Read the manifest (bootstrap / reset / reuse)

Read `artifacts/seed/seed.manifest.json`.

- **If `artifacts/seed/` is absent (first run) → bootstrap.** Run
  `bot-034-update-character-bible`'s **generate routine** (it ships `templates/seed/` defaults
  and is the only writer of the kit): it copies the template, freezes the blocks, and generates
  the turnaround + hero anchors (PAID) with a pixel self-check. Then re-read the manifest. This
  is the documented `make-video` → `update-seed` first-run coupling — bible generation lives in
  one place; **do not regenerate anchors here.** If `context.md` named a reference image
  (`inputs/ref.png`), pass it through so the default bible is rebuilt around the user's character.
- **If `context.md` has `Reset seed: true` (intent = reset-bible) →** run
  `bot-034-update-character-bible`'s **reset** route first (archive the live kit → re-derive
  blocks from the edited `style.md`/`identity.md` → regenerate anchors PAID → self-check → bump
  provenance), then re-read the manifest.
- **If the kit is present and complete and no reset asked (continue-channel / new-cinematic) →**
  **reuse** it: no writes to `artifacts/seed/`, no regen, no cost.

## Step 2 — Gate `kitType ∈ acceptsKitTypes`

Assert `manifest.kitType` is in `manifest.recipe.acceptsKitTypes`. For this bot that is
`image-anchor ∈ ["image-anchor"]`. **On mismatch, do NOT silently proceed** — write a clean
recorded failure in `state.md` ("kit-type `<x>` not supported by this recipe — bot-034 is an
image-anchor / Seedance reference-to-video recipe") and mark stage 2 `blocked`. Never render
from an unsupported kit.

## Step 3 — Load the seed elements

From the manifest, load (verbatim — never paraphrase):

- `seed` — the fixed integer seed (e.g. 7777). It was used to lock the bible; the render reads
  it for provenance and the fallback i2v reuses it where the model accepts a seed.
- `identity.blocks.STYLE_STACK`, `CHARACTER_BLOCK` — the two frozen prompt blocks. They go into
  the shotlist's global header (STYLE_STACK) and the identity-lock line (a 2–3 token subset of
  CHARACTER_BLOCK) at stage 3, byte-identical.
- `identity.tokens` — the 5–7 verbatim trait tokens (face → hair → eyes → outfit/props order).
- `style.md` → the look/medium and the `Audio:` directive guidance.
- `anchors[]` — the **turnaround** anchor (`role: turnaround`, `refOrder: 1` → **`@Image1`**)
  and the **hero** anchor (`role: hero`, `refOrder: 2` → **`@Image2`**). Read their local paths
  (`anchors/turnaround.png`, `anchors/hero.png`) and the hosted URLs from `identity.md`'s
  "Anchor views" table. **These two images are the `--ref` inputs for `consumption: ref-image`.**

If an anchor file is missing on disk (e.g. the kit was generated in a prior session but an
anchor was lost), regenerate it via `bot-034-update-character-bible` (do not improvise) — the
two anchors are the consumption contract.

## Step 4 — Dispatch on `consumption` → seed the shots

`consumption: ref-image`: the recipe passes the two anchor files as `--ref` **in `refOrder`** —
the turnaround first (mapped to `@Image1`), the hero second (mapped to `@Image2`). The shotlist's
identity-lock line (stage 3) names them explicitly: *"@Image1 is the character turnaround
reference and @Image2 is the hero reference for `<Name>` (`<2-3 tokens>`) — maintain the EXACT
same character identity in every shot."* The frozen blocks + fixed seed are the language-level
lock that survives the per-shot i2v fallback. No other consumption branch applies here.

## Step 5 — Snapshot the kit into the project

Copy the consumed bible into `artifacts/<slug>/seed-snapshot/` so the cinematic is independently
auditable:

```bash
mkdir -p artifacts/<slug>/seed-snapshot
cp artifacts/seed/seed.manifest.json artifacts/<slug>/seed-snapshot/
cp artifacts/seed/style.md           artifacts/<slug>/seed-snapshot/
cp artifacts/seed/identity.md        artifacts/<slug>/seed-snapshot/
cp -R artifacts/seed/anchors         artifacts/<slug>/seed-snapshot/anchors
```

Record in the decisions log which route ran: `reuse` / `reset` / `bootstrap`, and the two
anchor paths used as `@Image1` / `@Image2`.

## Step 6 — Advance the ledger

Mark stage 2 `done`, set stage 3 `plan` `in-progress`. Update `next_action`:
"Stage 3 plan — write a 4–6 shot, time-coded shotlist.md from context.md + the bible tokens;
validate with scripts/validate-shotlist.sh." Note the snapshot path and the two `--ref` anchors
in the decisions log (stage 4 needs them).
