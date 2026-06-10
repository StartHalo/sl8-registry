---
name: bot-013-stickman-art
description: Locks a reusable hand-drawn stickman character (source image, turnaround sheet, frozen written spec) and generates character-consistent pencil-sketch scene stills for every episode beat — frozen prompt blocks, fixed seed, pinned image-model fallback chains, and fal.media URL capture for the downstream image-to-video phase. Use for phase 2 (lock-character) and phase 3 (generate-stills) of a stickman episode project, whenever asked to create or reuse a stickman character, or to produce stickman scene stills.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-013
  inputs:
    - name: project-context
      type: markdown
      required: true
      description: artifacts/<project-name>/context.md — topic, aspect ratio, character/style hints, new-character flag
    - name: episode-plan
      type: markdown
      required: false
      description: artifacts/<project-name>/01-episode-plan.md — beats with scene blocks; REQUIRED for phase 3, optional prop-hint source for phase 2 (standalone character requests run on defaults)
    - name: character-spec
      type: markdown
      required: false
      description: artifacts/<project-name>/02-character/character-spec.md — written by phase 2; REQUIRED input to phase 3; if it already exists, phase 2 skips regeneration (series project)
    - name: seed
      type: number
      required: false
      description: Generation seed; defaults to 4242 and is recorded in character-spec.md for all later phases
  outputs:
    - name: character-source
      type: png
      path: artifacts/<project-name>/02-character/source.png
      description: Canonical source image — the locked character standing next to a cardboard box labeled "TASK"
    - name: character-turnaround
      type: png
      path: artifacts/<project-name>/02-character/turnaround.png
      description: Turnaround sheet — front, three-quarter, profile, and back views of the same figure, same seed
    - name: character-spec
      type: markdown
      path: artifacts/<project-name>/02-character/character-spec.md
      description: Frozen character block (≥40 words), frozen style stack, seed, and per-asset model + local path + fal.media URL
    - name: beat-stills
      type: png
      path: artifacts/<project-name>/03-stills/NN-<beat-slug>.png
      description: One pencil-sketch still per episode beat, character block copied verbatim from the spec
    - name: stills-log
      type: markdown
      path: artifacts/<project-name>/03-stills/stills-log.md
      description: Per-beat ledger — model actually used, full prompt, fal.media URL (the i2v input contract), self-check verdicts, recorded skips
---

# Stickman Art — Character Lock & Scene Stills

One skill, two phases. Phase 2 locks the episode's character identity (source image,
turnaround sheet, written spec). Phase 3 turns each beat of the episode plan into a
character-consistent pencil-sketch still. They live together because they share the
three things that fail most often when split: the frozen prompt blocks, the image-model
fallback chains, and the self-check discipline.

This bot runs **headless**. Never ask the user anything. Missing optional input → use
the documented default. Missing required input → record a clean failure in the
project's `state.md` and stop.

## Why the frozen blocks exist (read before generating anything)

No reference-image model is routed on the SL8 proxy — there is no "use this picture of
the character" input. Identity and style are carried entirely by **language plus seed**.
The moment a block is paraphrased ("a small stick figure with a hat" instead of the
frozen block), the model re-rolls the character and the episode looks like different
videos spliced together. So: the blocks below are pasted **character-for-character**,
never retyped from memory, never "improved".

### STYLE_STACK (frozen — first block of every still prompt)

```
Hand-drawn pencil sketch animation style, visible graphite grain, subtle smudging, light cross-hatching, varied line weight, on plain white paper background.
```

### DEFAULT_CHARACTER_BLOCK (frozen — the default character when the user gives no hints)

```
An extremely minimal hand-drawn stick figure: single-stroke arms and legs, a plain circle head, two small dot eyes, a simple curved smile, and a small baseball cap worn slightly tilted. No other facial features, no clothing besides the cap, no fingers — simple line hands. Proportions: head about one fifth of total height, limbs slightly longer than the torso.
```

### DISCIPLINE_BLOCK (frozen — fourth block of every still prompt)

```
Environments and objects rendered with realistic structure, weight, and light pencil shading. Communicate narrative through posture and spatial composition alone; no exaggerated facial expressions. Consistent lighting direction. The figure stays minimal while the world stays believable.
```

### NEGATIVES_BLOCK (frozen — last block of every still prompt)

```
No color, no photorealism, no text, no watermarks, no extra limbs, no duplicate figures.
```

### Sanctioned variants (the ONLY two deviations, used only where the frozen block would break the asset)

Two assets need something the NEGATIVES_BLOCK forbids. For those — and only those —
substitute the matching variant. Everything else in the prompt stays frozen.

- **TEXT_NEGATIVES** — for text-bearing prompts (the "TASK" box, a planned one-word
  label), where "no text" would fight the label:
  `No color, no photorealism, no watermarks, no extra limbs, no duplicate figures. No text anywhere except the single word "<LABEL>" on the <labeled object>.`
  (For source.png that is `"TASK"` on `the box`; for a labeled beat still, swap in the
  planned label word AND the object carrying it from the scene block — a jar, a sign,
  a mug — so the negative never points at a prop the scene does not contain.)
- **TURNAROUND_NEGATIVES** — for the turnaround sheet, where "no duplicate figures"
  would fight a multi-view sheet:
  `No color, no photorealism, no text, no watermarks, no extra limbs. The same single character repeated once per view; no other characters.`

## Model chains (pinned 2026-06-09 — walk in order, never improvise)

| Chain | Order | When |
|---|---|---|
| `stills` | `fal-ai/flux-dev` → `fal-ai/flux-pro` → `fal-ai/recraft-v3` → `fal-ai/stable-diffusion-v35-large` | turnaround + every beat still without a planned label |
| `text` | `fal-ai/ideogram/v3` → `fal-ai/stable-diffusion-v35-large` | source.png ("TASK" box) + any beat with a planned one-word label |

`scripts/gen-image.sh` owns the walking — it tries each model in order, handles the
per-model quirks (recraft's prompt-length cap, .webp output), and prints which model
actually produced the asset. The chain order is the documented fallback contract from
requirements; inventing an out-of-chain model mid-run is how BOT-007's "SD 3.5
incident" happened — don't. **Record the actual producing model for every asset** in
character-spec.md / stills-log.md. Per-model prompt adjustments and quirks:
`references/still-dialects.md`.

> Reality check: the frozen blocks alone are ~900 chars, so most composed 5-block
> prompts exceed recraft's limit and the script skips it (logged). In practice the
> stills chain is flux-dev → flux-pro → SD3.5, with recraft serving only short
> special-case prompts. The skip is correct behavior, not a failure.

---

## Phase 2 — lock-character

Writes `artifacts/<project-name>/02-character/{source.png, turnaround.png, character-spec.md}`.

### 1. Read inputs (READ-BEFORE-WRITE)

Read `artifacts/<project-name>/context.md` (required) and
`artifacts/<project-name>/01-episode-plan.md` if it exists (optional — supplies prop
hints like "the episode is about IKEA assembly, a flat-pack box is a natural prop").
If `context.md` is missing, the project was never onboarded: record the failure in
`state.md` (`status: blocked`, `next_action: run onboarding — context.md missing`) and stop.

### 2. Series check — do not regenerate an existing character

If `02-character/character-spec.md` already exists, this is a returning series project
and the character IS the channel's identity. Skip regeneration entirely **unless
`context.md` explicitly asks for a new character**. On skip: verify `source.png` and
`turnaround.png` exist alongside the spec (if one is missing, regenerate only the
missing asset using the spec's own character block and seed), then update `state.md`
and finish the phase.

### 3. Compose the character block

- No character hints in `context.md` → use **DEFAULT_CHARACTER_BLOCK verbatim**.
- Hints present (e.g. "beanie and scarf") → adapt the default while keeping its exact
  structure: anatomy sentence → exclusions sentence → proportions sentence, **≥40
  words**, and the character stays in the extremely-minimal class (single-stroke limbs,
  circle head, dot eyes — that minimalism is the consistency mitigation, not a style
  preference). Style hints (e.g. "ballpoint pen doodle") adapt STYLE_STACK the same
  way: same clause structure, swap the medium words only.

Choose the seed: from `context.md` if given, else **4242**.

### 4. Generate source.png (text-bearing → `text` chain)

The canonical source image: the character standing in a simple relaxed pose next to a
cardboard box with the word "TASK" written on its side. Compose the 5-block prompt and
save it to `work/<project-name>/prompt-source.txt`:

1. STYLE_STACK · 2. character block · 3. scene: `He is standing in a simple relaxed
pose next to a plain cardboard box with the word "TASK" hand-written on its side in
simple capital letters.` · 4. DISCIPLINE_BLOCK · 5. TEXT_NEGATIVES

```bash
scripts/gen-image.sh work/<project-name>/prompt-source.txt \
  artifacts/<project-name>/02-character source.png \
  --seed <seed> --chain text --size square_hd
```

Inspect the result (Read the PNG): if the "TASK" label is garbled, regenerate once on
the same chain. **If the label fails twice, drop it** — rewrite the scene block without
the label ("next to a plain cardboard box"), regenerate on the `stills` chain with the
standard NEGATIVES_BLOCK, and record the dropped label in character-spec.md's
Deviations section. A clean box beats a garbled word.

### 5. Generate turnaround.png (same seed, `stills` chain)

Prompt to `work/<project-name>/prompt-turnaround.txt` — a character turnaround sheet:

1. STYLE_STACK · 2. character block · 3. scene: `A character turnaround sheet: the
same figure drawn four times in a row on a white background — front view,
three-quarter view, profile view, and back view, evenly spaced, identical proportions
and cap in every view.` · 4. DISCIPLINE_BLOCK · 5. TURNAROUND_NEGATIVES

```bash
scripts/gen-image.sh work/<project-name>/prompt-turnaround.txt \
  artifacts/<project-name>/02-character turnaround.png \
  --seed <seed> --chain stills --size landscape_16_9
```

### 6. Self-check both images

Run the checklist in `references/self-check.md` against each PNG (Read the image:
single figure where expected? cap present? pencil-sketch, no color/photo-real? ≥3
distinct views on the turnaround?). One retry with reinforced negatives on a failed
check; if it still fails, keep the best attempt and record the deviation honestly —
never loop, never hide it.

### 7. Write character-spec.md

This file is the contract phases 3 and 4 read. Exact shape:

```markdown
# Character Spec — <project-name>

## Frozen character block (copy VERBATIM into every still prompt)
<the character block used, exactly>

## Frozen style stack (copy VERBATIM into every still prompt)
<STYLE_STACK, or the adapted style stack, exactly>

## Seed
<seed>

## Assets
| asset | model | local path | fal.media URL |
|---|---|---|---|
| source.png | <model gen-image.sh printed> | artifacts/<project-name>/02-character/source.png | <url> |
| turnaround.png | <model> | artifacts/<project-name>/02-character/turnaround.png | <url> |

## Deviations
- <"TASK" label dropped after two garbled attempts / off-style best-attempt kept / none>
```

### 8. Update state.md

Mark the `lock-character` row `done` (or `blocked` with the reason if every model in a
chain failed — in that case still write character-spec.md with an ERROR section, no
fabricated assets), refresh `updated`, and set `next_action` (normally: `Run
bot-013-stickman-art phase 3 (generate-stills)`; on a character-only project: deliver
and mark the project complete). The ledger is how phases chain — never leave it stale.

---

## Phase 3 — generate-stills

Writes `artifacts/<project-name>/03-stills/{NN-<beat-slug>.png, stills-log.md}`.

### 1. Read inputs (READ-BEFORE-WRITE)

Read `01-episode-plan.md` AND `02-character/character-spec.md` (plus `context.md`).
Either missing → record a clean failure in `state.md` naming the missing file and stop.
Take the character block, style stack, and seed **from the spec, verbatim** — never
from this file's defaults. (A series project may carry an adapted character; the spec
is the truth, the defaults above are only for phase 2.)

### 2. Per beat NN (in plan order)

**a. Compose the Base Concept** (≥100 words, all 6 dimensions) and save it to
`work/<project-name>/base-concept-NN.md`. This is the deliberation step that catches
bad stills *before* spending credits — vague scenes and stacked actions are the #1
legibility failure. Cover:

- **subject** — the locked character + this beat's single action
- **composition** — close or medium shot, figure prominent, one readable action; wide
  shots with small figures break stick-figure anatomy
- **style** — the pencil-sketch stack (cite it, don't rewrite it)
- **color** — graphite monochrome on warm paper white, *because* the format's contrast
  mechanism is a minimal monochrome figure against a believably shaded world; color
  would break series continuity and the hand-drawn read
- **typography** — none, unless the plan explicitly calls for a one-word label on this
  beat (then name the word and note the `text` chain routing)
- **mood** — observational, restrained, deadpan; narrative through posture, not faces

If the plan's scene block packs more than one action, trim it to the single strongest
action here and record the trim in the stills-log notes.

**b. Compose the 5-block prompt** → `work/<project-name>/prompt-NN.txt`:

1. STYLE_STACK (verbatim from the spec) · 2. character block (verbatim from the spec) ·
3. scene block (from the plan, trimmed per the base concept if needed) ·
4. DISCIPLINE_BLOCK · 5. NEGATIVES_BLOCK (or TEXT_NEGATIVES for a planned-label beat)

**c. Generate:**

```bash
scripts/gen-image.sh work/<project-name>/prompt-NN.txt \
  artifacts/<project-name>/03-stills NN-<beat-slug>.png \
  --seed <spec seed> --chain stills --size <by plan aspect>
```

Use `--chain text` for a planned-label beat. Size by the plan's aspect: 16:9 →
`landscape_16_9`, 9:16 → `portrait_16_9`.

**d. Log it.** Append a block to `03-stills/stills-log.md` in this exact shape
(`scripts/check-set.sh` parses it):

```markdown
## Beat NN — <beat-slug>
- status: kept
- model: <model gen-image.sh printed>
- file: 03-stills/NN-<beat-slug>.png
- url: <https://fal.media/...>
- seed: <seed>
- self-check: figure=PASS cap=PASS style=PASS action=PASS
- notes: <fallbacks taken, trims, label decisions, deviations — or "none">

### Prompt
<the full prompt text>
```

The `url:` line is non-negotiable: it is the formal input contract for phase 4's
image-to-video calls. `gen-image.sh` already retries once when a response lacks the
hosted URL; if it still prints no URL, treat the attempt as failed.

**e. Self-check** the still (`references/self-check.md`): exactly one figure? cap
present and unmutated? style matches the set so far? one readable action? Record the
verdicts in the log block. On a failure: one retry with reinforced negatives appended
to the prompt; still failing → keep the best attempt, mark the failed dimension
`FAIL`, and explain in notes.

**f. Persistent failure** (`gen-image.sh` exits non-zero — every model in the chain
failed): write the beat's log block with `- status: skipped` and the error in notes,
then **continue to the next beat**. One stubborn beat must not kill the episode.

### 3. Gate the set

```bash
scripts/check-set.sh artifacts/<project-name>
```

It verifies every plan beat has a kept still or a recorded skip, every kept still has
a fal.media URL in its log block, and ≥80% of beats are kept. Fix anything it flags
before marking the phase done. Below 80% kept → mark the phase row `blocked` in `state.md`
with the skip list; the episode contract requires ≥80% of beats.

### 4. Update state.md

Mark the `generate-stills` row `done` (or `blocked`), refresh `updated`, set
`next_action: Run bot-013-clip-assembly for phase 4 (clips-and-assembly)`.

---

## Outputs

All paths are per-project and exactly as declared in frontmatter — never invent others:

- `artifacts/<project-name>/02-character/source.png` — canonical source image (character + "TASK" box)
- `artifacts/<project-name>/02-character/turnaround.png` — 4-view turnaround sheet
- `artifacts/<project-name>/02-character/character-spec.md` — frozen block ≥40 words, style stack, seed, per-asset model + path + fal.media URL
- `artifacts/<project-name>/03-stills/NN-<beat-slug>.png` — one still per kept beat (NN zero-padded, slug from the plan's beat name)
- `artifacts/<project-name>/03-stills/stills-log.md` — per-beat ledger (model, prompt, URL, self-check, skips)

Intermediates (base concepts, prompt files) go under `work/<project-name>/`, never
under `artifacts/`.

## Headless failure rules (recap)

- Missing `context.md` (phase 2) or missing plan/spec (phase 3) → clean `blocked` row
  in `state.md` naming the file; stop. No invented inputs.
- All models in a chain fail for a *character* asset → ERROR section in
  character-spec.md, phase row `blocked`. For a *beat* still → skip the beat, continue,
  gate on the 80% threshold.
- Off-style output → exactly one retry, then keep-best + record. Never silent, never
  an infinite loop, never an out-of-chain model.

## Scripts

- `scripts/gen-image.sh <prompt-file> <out-dir> <stable-name> [--seed N] [--chain stills|text] [--size SIZE]`
  — walks the chain in order, handles recraft's length cap (skips, never truncates)
  and .webp conversion, retries once on a missing hosted URL, prints
  `model<TAB>local-path<TAB>url` on success.
- `scripts/check-set.sh <project-dir>` — structural gate for the phase-3 set (beat
  coverage, URL presence, 80% threshold).

## References (load when needed)

- `references/still-dialects.md` — per-model prompt adjustments, quirks, ai-gen CLI
  mechanics, seed discipline.
- `references/pdf-patterns.md` — the source PDF's identity-asset patterns (steps 1–6)
  as reusable templates: source image, turnaround, 3×3 grid constraints block, 2×2
  grid, individual stills.
- `references/self-check.md` — the per-asset checklist and what to do on each failure.
