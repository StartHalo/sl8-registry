---
name: bot-033-update-character
description: Sets, regenerates, or reports the stickman channel's persistent SEED kit (the reusable character + style) at artifacts/seed/. This is the ONE author-facing skill for changing the look that carries across all future episodes, and the only writer of artifacts/seed/. It is an image-anchor kit — identity is pinned by three generated reference PNGs (front, three-quarter, side) plus frozen prompt blocks and a locked seed. Routes by intent — reuse (report the current kit, no writes), reset (archive the current kit, re-derive frozen blocks from the edited style.md/identity.md, regenerate the three anchors via the shared video-toolkit image driver with a pixel self-check, bump provenance), and kit-only (establish the kit then stop, no video). make-stickman calls this skill's generate routine on first run to bootstrap the kit. Use it whenever the user wants to set up, change, reset, or inspect their stickman character or style.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [video-toolkit, bot-033-make-stickman]
  inputs:
    - name: intent
      type: chat
      required: true
      description: "What the user wants: set up / change / reset / inspect the channel character or style. Routes to reuse | reset | kit-only."
    - name: seed-docs
      type: markdown
      required: false
      description: "The editable seed docs the user may have changed — artifacts/seed/style.md and artifacts/seed/identity.md (or the shipped templates/seed/ defaults on first run)."
  outputs:
    - name: seed-kit
      type: x-seed-kit
      path: artifacts/seed/
      description: "The persistent image-anchor kit: seed.manifest.json + style.md + identity.md + anchors/{character-source,character-threequarter,character-sideprofile}.png + archive/<date>/ on reset."
    - name: anchors
      type: png
      path: artifacts/seed/anchors/
      description: "Three reference-anchored character views (front, three-quarter, side) generated via the shared video-toolkit image driver."
---

# bot-033-update-character — set / reset / report the stickman seed kit

This is **Layer 2** (seed elements) for the stickman animator — see
`docs/features/video-director-fleet/07-seed-element-interface.md`. It owns the persistent
**image-anchor** kit at `artifacts/seed/`. `make-stickman` only *reads* the kit (and calls
this skill's **generate routine** to bootstrap it on first run). Everything that writes
`artifacts/seed/` lives here.

**Kit shape (image-anchor):**

```
artifacts/seed/
  seed.manifest.json          # the interface — kitType: image-anchor, consumption: ref-image
  style.md                    # style stack / discipline / constraints / video lock / audio
  identity.md                 # character block + locked seed + anchor URLs (filled after gen)
  anchors/
    character-source.png      # front-facing → refOrder 1 (the primary --ref anchor)
    character-threequarter.png# ¾ view       → refOrder 2 (anchored to source via --ref)
    character-sideprofile.png # side profile → refOrder 3 (anchored to source via --ref)
  archive/<YYYY-MM-DD>/        # the previous kit, moved here on reset (never silently destroyed)
```

The shared image driver is `.claude/skills/video-toolkit/scripts/gen-image.sh` (the
nano-banana bible chain — all models ref-capable, so the lock survives a fallback).

---

## Step 1 — Route the request

Decide the route from intent BEFORE touching any file:

| Route | Trigger | Action |
|---|---|---|
| **reuse** | "show / inspect my character", or `make-stickman` finds an existing kit with anchors present | Read `seed.manifest.json`; report kitType, seed, model/date, anchor status. **No writes.** Stop. |
| **reset** | "reset character / new character / change the style / new look", or the user says they edited `style.md` / `identity.md` | Archive → re-derive → **regenerate anchors (PAID)** → self-check → bump provenance (Steps 2–6). |
| **kit-only** | "just set up my character / set up my style", no episode topic given | Same as reset's establish path, then **stop — no video**. |

First-run **bootstrap** (called by `make-stickman` resolve-seed when `artifacts/seed/` is
absent): copy the shipped `templates/seed/` into `artifacts/seed/`, then run the **reset**
generate path (anchors don't exist yet). `origin = "default-template"`.

---

## Step 2 — Bootstrap / archive

1. **If `artifacts/seed/` is absent** (first run): copy this skill's `templates/seed/`
   (`seed.manifest.json`, `style.md`, `identity.md`) verbatim into `artifacts/seed/`.
   Note: "Created seed kit from default template." Set `provenance.origin = "default-template"`.
2. **If resetting an existing kit**: move the current `style.md`, `identity.md`, and
   `anchors/` into `artifacts/seed/archive/<YYYY-MM-DD>/`. Record the archive path in the
   manifest's `archive` field and in `state.md`. **Never overwrite a live kit without archiving.**
   Set `provenance.origin = "user-reset"` (or `"user-kit-only"` for the kit-only route).

For **reuse**, skip to nothing — you already reported and stopped in Step 1.

---

## Step 3 — Read the seed docs & freeze the blocks

Read `artifacts/seed/style.md` and `artifacts/seed/identity.md`. Extract the four frozen
blocks used verbatim in every image/clip prompt, and write them into
`seed.manifest.json` → `identity.blocks` (so the recipe reads them machine-side):

- **STYLE_STACK** — the "Style stack" from `style.md`
- **CHARACTER_BLOCK** — the "Character block" from `identity.md`
- **DISCIPLINE** — the "Discipline" from `style.md`
- **CONSTRAINTS** — the "Positive constraints" from `style.md` + `NO TEXT LABELS. NO WATERMARKS. NO ANNOTATIONS.`

Use the **locked seed** from `identity.md` (default 4242) for the whole character set —
write it to `manifest.seed`. The frozen blocks + fixed seed are the language-level identity
lock that holds even when a fallback model can't take a `--ref`.

---

## Step 4 — Generate `character-source.png` (the front anchor)

The canonical front-facing anchor. All other views use it as `--ref`. Compose the prompt
to a file, then call the shared driver:

```bash
mkdir -p artifacts/seed/anchors work
cat > work/seed-source-prompt.txt <<'PROMPT'
[Style]: <STYLE_STACK>. [Character]: <CHARACTER_BLOCK>. [Scene]: Stickman standing upright,
front-facing, centre frame. Arms at sides, legs slightly apart. Plain white background,
close-medium framing — figure fills ~60% of frame height. [Discipline]: <DISCIPLINE>.
[Constraints]: <CONSTRAINTS>.
PROMPT

.claude/skills/video-toolkit/scripts/gen-image.sh \
  work/seed-source-prompt.txt artifacts/seed/anchors character-source.png \
  --aspect-ratio 1:1 --seed <seed> --max-cost 80
```

`gen-image.sh` prints `model<TAB>local-path<TAB>hosted-url`. **Capture the hosted URL** —
the ¾/side views and the manifest need it.

**Self-check source.png** (one retry on fail; keep best + log a DEVIATION if still failing):
single front-facing stick figure · single-stroke arms/legs (no rounded/thick limbs) · cap
present and placed · monochrome pencil on plain white · no model-added text/labels/watermarks.

---

## Step 5 — Generate the ¾ and side anchors (anchored to source)

Each is anchored to `character-source.png` via `--ref <hosted source URL>` to avoid
multi-view drift. Compose a per-view prompt file and call the driver with the same seed:

```bash
# three-quarter
.claude/skills/video-toolkit/scripts/gen-image.sh \
  work/seed-threequarter-prompt.txt artifacts/seed/anchors character-threequarter.png \
  --aspect-ratio 1:1 --seed <seed> --ref "<hosted source URL>" --max-cost 80
# side profile
.claude/skills/video-toolkit/scripts/gen-image.sh \
  work/seed-sideprofile-prompt.txt artifacts/seed/anchors character-sideprofile.png \
  --aspect-ratio 1:1 --seed <seed> --ref "<hosted source URL>" --max-cost 80
```

- **¾ prompt scene:** "Same stickman facing three-quarter right (body turned ~45° from
  front). Same single-stroke limbs and small cap. Plain white background, close-medium framing."
- **side prompt scene:** "Same stickman in strict side profile (body turned 90° right).
  Stick-thin — one visible arm forward, one visible leg. Same single-stroke limbs and cap.
  Plain white background, close-medium framing."

**Self-check each** (angle correct · single-stroke limbs · cap consistent with source ·
no watermark). One retry; keep best + log DEVIATION on persistent failure. Capture each
hosted URL.

---

## Step 6 — Write the kit back & finish

1. **`identity.md`** — fill the "Anchor views" table with each view's local path + hosted URL.
2. **`seed.manifest.json`** — set `identity.blocks` (Step 3), `seed`, `anchors[].file`,
   `provenance.models` (model used per view), `provenance.createdAt`/`updatedAt` (today),
   `provenance.origin`, and `archive` (the archive path if this was a reset, else null).
3. **`artifacts/dashboard.md`** — update the kit block: each anchor `✓ done — <model>, seed <seed>`
   (or `⚠ DEVIATION: <note>`).
4. **`state.md`** — if this ran inside an episode (bootstrap), mark the `resolve-seed` stage
   `done` and hand back to `make-stickman`. For the **kit-only** route, set
   `status: complete`, `next_action: "Seed kit ready at artifacts/seed/ — give me a topic to make an episode."` and **stop**.

---

## Honesty & headless rules

- **Never silently destroy identity** — a reset always archives first.
- **Disclose deviations** — any kept-best anchor with a failed self-check is logged in the
  manifest `provenance` and surfaced to the user.
- **Cost** — anchor regeneration is PAID (3 image-gens). For a `reuse`, there is zero cost.
  Estimate with `.claude/skills/video-toolkit/scripts/cost.sh` if asked; gate each call with `--max-cost 80`.
- **Headless** — never ask for missing inputs; if `style.md`/`identity.md` are absent,
  bootstrap from the template and note the assumption.
