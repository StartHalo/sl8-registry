---
name: bot-034-update-character-bible
description: Sets, regenerates, or reports the cinematic channel's persistent character BIBLE (the reusable character + style) at artifacts/seed/. This is the ONE author-facing skill for changing the look that carries across all future cinematics, and the only writer of artifacts/seed/. It is an image-anchor kit — identity is pinned by two generated reference PNGs (a multi-view turnaround and a clean hero portrait) plus frozen prompt blocks (STYLE_STACK + CHARACTER_BLOCK), 5-7 verbatim trait tokens, and a locked seed. Routes by intent — reuse (report the current bible, no writes), reset (archive the current bible, re-derive frozen blocks from the edited style.md/identity.md, regenerate the turnaround + hero via the shared video-toolkit image driver with a pixel self-check, bump provenance), and kit-only (establish the bible then stop, no cinematic). make-cinematic calls it on first run to bootstrap the bible. Use it whenever the user wants to set up, change, reset, or inspect their cinematic character or style.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [video-toolkit, bot-034-make-cinematic]
  inputs:
    - name: intent
      type: chat
      required: true
      description: "What the user wants: set up / change / reset / inspect the channel character or style. Routes to reuse | reset | kit-only."
    - name: seed-docs
      type: markdown
      required: false
      description: "The editable bible docs the user may have changed — artifacts/seed/style.md and artifacts/seed/identity.md (or the shipped templates/seed/ defaults on first run). An optional user reference image (artifacts/<project>/inputs/ref.png) is passed through as the primary identity anchor when present."
  outputs:
    - name: seed-kit
      type: x-seed-kit
      path: artifacts/seed/
      description: "The persistent image-anchor character bible: seed.manifest.json + style.md + identity.md + anchors/{turnaround,hero}.png + archive/<date>/ on reset."
    - name: anchors
      type: png
      path: artifacts/seed/anchors/
      description: "Two reference images — a multi-view turnaround (@Image1) and a clean front hero portrait (@Image2) — of ONE consistent character, generated via the shared video-toolkit image driver."
---

# bot-034-update-character-bible — set / reset / report the cinematic bible

This is **Layer 2** (seed elements) for the cinematic director — see
`docs/features/video-director-fleet/07-seed-element-interface.md`. It owns the persistent
**image-anchor** kit at `artifacts/seed/`. `make-cinematic` only *reads* the bible (and calls
this skill's **generate routine** to bootstrap it on first run). Everything that writes
`artifacts/seed/` lives here.

> **New-architecture win:** BOT-027 rebuilt a character bible *every project*. This promotes the
> bible to a **one-time channel kit** — locked once here, reused by every cinematic. A reset is
> the only paid event; a reuse is free.

**Kit shape (image-anchor):**

```
artifacts/seed/
  seed.manifest.json          # the interface — kitType: image-anchor, consumption: ref-image
  style.md                    # STYLE_STACK (style/render/lighting/camera) + palette + audio directive
  identity.md                 # Identity Tokens (5-7 verbatim) + CHARACTER_BLOCK + locked seed + anchor URLs
  anchors/
    turnaround.png            # multi-view turnaround → refOrder 1 (the @Image1 reference)
    hero.png                  # clean front hero portrait → refOrder 2 (the @Image2 reference)
  archive/<YYYY-MM-DD>/        # the previous bible, moved here on reset (never silently destroyed)
```

The shared image driver is `.claude/skills/video-toolkit/scripts/gen-image.sh` (the canonical
bible chain `fal-ai/nano-banana-pro → openai/gpt-image-2 → fal-ai/nano-banana-2` — **all three
are reference-capable**, so the character lock survives a fallback).

---

## Step 1 — Route the request

Decide the route from intent BEFORE touching any file:

| Route | Trigger | Action |
|---|---|---|
| **reuse** | "show / inspect my character / bible", or `make-cinematic` finds an existing kit with both anchors present | Read `seed.manifest.json`; report kitType, Name, seed, model/date, anchor status. **No writes.** Stop. |
| **reset** | "reset bible / new character / change the style / new look", or the user says they edited `style.md` / `identity.md` | Archive → re-derive blocks → **regenerate the turnaround + hero (PAID)** → self-check → bump provenance (Steps 2–6). |
| **kit-only** | "just set up my character / lock a character", no cinematic story given | Same as reset's establish path, then **stop — no cinematic**. |

First-run **bootstrap** (called by `make-cinematic` resolve-seed when `artifacts/seed/` is
absent): copy the shipped `templates/seed/` into `artifacts/seed/`, then run the **reset**
generate path (anchors don't exist yet). `origin = "default-template"`. If a user reference image
was supplied, pass it through as the primary `--ref` so the default bible is rebuilt around the
user's character.

---

## Step 2 — Bootstrap / archive

1. **If `artifacts/seed/` is absent** (first run): copy this skill's `templates/seed/`
   (`seed.manifest.json`, `style.md`, `identity.md`) verbatim into `artifacts/seed/`. Note:
   "Created bible from default template." Set `provenance.origin = "default-template"`.
2. **If resetting an existing kit**: move the current `style.md`, `identity.md`, and `anchors/`
   into `artifacts/seed/archive/<YYYY-MM-DD>/`. Record the archive path in the manifest's
   `archive` field and in `state.md`. **Never overwrite a live bible without archiving.** Set
   `provenance.origin = "user-reset"` (or `"user-kit-only"` for the kit-only route).

For **reuse**, skip to nothing — you already reported and stopped in Step 1.

---

## Step 3 — Read the bible docs & freeze the blocks

Read `artifacts/seed/style.md` and `artifacts/seed/identity.md`. Extract and write into
`seed.manifest.json` (so the recipe reads them machine-side):

- **`identity.tokens`** — the 5–7 verbatim trait tokens from `identity.md`'s **Identity Tokens**
  list, in **face → hair → eyes → outfit/props** order. Distinctive, specific materiality, each a
  self-contained noun phrase. Cap at 7 (more dilutes the lock).
- **`identity.blocks.STYLE_STACK`** — the frozen style line from `style.md` (art style + render +
  lighting + camera look; NO identity tokens). One quoted line.
- **`identity.blocks.CHARACTER_BLOCK`** — the trait tokens **comma-joined in the fixed
  face → hair → eyes → outfit/props order**, byte-identical to the token list. **No-synonym rule:
  once a token is set, it is reused verbatim everywhere** (in the spec, here, the shotlist, and the
  render prompt). Paraphrase — "glowing violet eyes" → "purple eyes" — is the #1 cross-shot drift
  vector. Keep style words OUT of CHARACTER_BLOCK and identity words OUT of STYLE_STACK.

Use the **locked seed** from `identity.md` (default 7777) for both anchors — write it to
`manifest.seed`. The frozen blocks + fixed seed are the language-level identity lock that holds
even when a fallback model can't take a `--ref`.

---

## Step 4 — Generate `turnaround.png` (the @Image1 anchor)

The multi-view turnaround — the cross-shot identity reference. Compose the prompt to a file
(frozen blocks VERBATIM + the turnaround instruction), then call the shared driver:

```bash
mkdir -p artifacts/seed/anchors work
cat > work/bible-turnaround-prompt.txt <<'PROMPT'
<STYLE_STACK verbatim> . <CHARACTER_BLOCK verbatim> . Create a complete character turnaround
sheet showing the same character from these angles: front view, three-quarter view, side
profile, back view. All views show the SAME character with consistent proportions, facial
features, hair, outfit, and color palette — no drift between views. Clean neutral background
with clear separation between views. Professional character-design reference sheet, clean
render. no text in the image . 16:9
PROMPT

.claude/skills/video-toolkit/scripts/gen-image.sh \
  work/bible-turnaround-prompt.txt artifacts/seed/anchors turnaround.png \
  --aspect-ratio 16:9 --seed <seed> \
  --ref "<user reference image, if supplied>" --max-cost 80
```

`gen-image.sh` prints `model<TAB>local-path<TAB>hosted-url`. **Capture the hosted URL** — the
hero uses it as `--ref`, and the manifest + identity.md need it. (Omit `--ref` when no user
reference was supplied; the frozen blocks + seed are the lock.)

**Self-check turnaround.png** (one retry on fail; keep best + log a DEVIATION if still failing):
all requested views present · ONE consistent character across every view (face/hair/outfit/palette
agree, no drift/warping) · on-brief vs CHARACTER_BLOCK · clean background, no stray text.

---

## Step 5 — Generate `hero.png` (the @Image2 anchor, anchored to the turnaround)

The clean front-facing hero portrait and i2v start frame — anchored to the turnaround via `--ref`
so it is the SAME character, with the **same seed**:

```bash
cat > work/bible-hero-prompt.txt <<'PROMPT'
<STYLE_STACK verbatim> . <CHARACTER_BLOCK verbatim> . A clean front-facing hero portrait of the
same character, centered, neutral studio background, professional cinematic key light. Single
character, no other figures. No text in the image . 16:9
PROMPT

.claude/skills/video-toolkit/scripts/gen-image.sh \
  work/bible-hero-prompt.txt artifacts/seed/anchors hero.png \
  --aspect-ratio 16:9 --seed <seed> \
  --ref "<hosted turnaround URL>" --max-cost 80
```

Pass the user reference image as an *additional* `--ref` too when one was supplied (the driver
accepts repeated `--ref`). **Self-check hero.png** (single clean front-facing portrait of the SAME
character · on-brief · usable as the i2v start frame · no second figure, no text). One retry;
keep best + log DEVIATION on persistent failure. Capture the hosted URL.

---

## Step 6 — Write the bible back & finish

1. **`identity.md`** — fill the "Anchor views" table with each anchor's local path + hosted URL.
2. **`seed.manifest.json`** — set `identity.tokens` + `identity.blocks` (Step 3), `seed`,
   `anchors[].file`, `provenance.models` (model used per anchor), `provenance.createdAt`/`updatedAt`
   (today), `provenance.origin`, and `archive` (the archive path if this was a reset, else null).
3. **`artifacts/dashboard.html`** — update the channel block: each anchor `✓ done — <model>, seed <seed>`
   (or `⚠ DEVIATION: <note>`).
4. **`state.md`** — if this ran inside a cinematic (bootstrap/reset), mark the `resolve-seed` stage
   ready and hand back to `make-cinematic`. For the **kit-only** route, set `status: complete`,
   `next_action: "Bible ready at artifacts/seed/ — give me a story to make a cinematic."` and **stop**.

---

## Honesty & headless rules

- **Never silently destroy identity** — a reset always archives first.
- **No-synonym discipline** — a locked trait token is reused byte-identical in `identity.md`,
  `CHARACTER_BLOCK`, the shotlist, and the render prompt. Paraphrase is the drift vector this skill
  exists to prevent.
- **Stylized characters/creatures only** — no real, identifiable people, brands, or copyrighted
  characters (also respects Seedance's downstream face policy). Swap in a stylized stand-in and note it.
- **Disclose deviations** — any kept-best anchor with a failed self-check is logged in the manifest
  `provenance` and surfaced to the user.
- **Cost** — anchor regeneration is PAID (2 image-gens). For a `reuse`, there is zero cost. Estimate
  with `.claude/skills/video-toolkit/scripts/cost.sh` if asked; gate each call with `--max-cost 80`.
- **Headless** — never ask for missing inputs; if `style.md`/`identity.md` are absent, bootstrap
  from the template and note the assumption.
