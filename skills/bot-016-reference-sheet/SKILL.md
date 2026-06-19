---
name: bot-016-reference-sheet
description: Turns a locked character-spec.md into the visual half of a character bible — a multi-view turnaround reference sheet (front / three-quarter / side / back, ONE consistent identity) plus a clean front hero portrait usable as an i2v start frame, then records every asset's model, seed, full prompt, fallbacks, and fal.media URL in a generation log. Pastes the spec's STYLE_STACK + CHARACTER_BLOCK VERBATIM into every prompt, walks the pinned image-model fallback chain, passes the reference image on every call, and self-checks the pixels. Use for phase 2 (turnaround) of a character-bible project, or whenever asked to generate a turnaround / reference sheet / hero portrait from a character spec.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-016
  inputs:
    - name: character-spec
      type: markdown
      required: true
      description: artifacts/<project-name>/character-spec.md — the locked spec from phase 1 (Identity Tokens, Seed, Palette, STYLE_STACK, CHARACTER_BLOCK, Reference image). The frozen blocks + seed are taken from here VERBATIM; missing → clean recorded failure, stop.
    - name: views
      type: text
      required: false
      description: Comma list of turnaround angles; defaults to "front view, three-quarter view, side profile, back view".
    - name: aspect-ratio
      type: text
      required: false
      description: Aspect ratio for the sheet and hero; defaults to 16:9 (a video-storyboard reference).
    - name: resolution
      type: text
      required: false
      description: Resolution preset for the sheet on nano-banana-pro (1K/2K/4K); defaults to 2K for a crisp, inspectable sheet.
  outputs:
    - name: reference-sheet
      type: png
      path: artifacts/<project-name>/reference-sheet.png
      description: Multi-view turnaround sheet — the requested angles of ONE consistent character (face, hair, outfit, palette agree across views), clean neutral background, no in-image text.
    - name: hero-portrait
      type: png
      path: artifacts/<project-name>/hero.png
      description: Clean front-facing hero portrait of the same character — the canonical i2v start frame the downstream director bots feed first.
    - name: generation-log
      type: markdown
      path: artifacts/<project-name>/generation-log.md
      description: Per-asset ledger — producing model + slug, seed, the full composed prompt, any fallbacks taken, and the fal.media URL; plus the post-generation self-check verdict for each asset.
---

# Reference Sheet — Turnaround & Hero from the Locked Spec

This is the **visual half** of the character bible (JTBD-2). Phase 1
(`bot-016-character-design`) already locked the identity in writing —
`character-spec.md` with verbatim Identity Tokens, a fixed Seed, a Palette, and the two
frozen blocks. This skill turns that spec into two reusable images:

- **`reference-sheet.png`** — a multi-view turnaround (front / three-quarter / side /
  back by default) holding ONE identity. The downstream director bots read it as the
  identity reference.
- **`hero.png`** — a clean front portrait. The canonical i2v **start frame** the
  director bots feed first.

…and an honest **`generation-log.md`** recording, per asset, which model actually
produced it, the seed, the full prompt, any fallbacks taken, and the fal.media URL.

This bot runs **headless**. Never ask the user anything. Missing optional input → use
the documented default (views / aspect / resolution). Missing required input
(`character-spec.md`) → record a clean failure in the project's `state.md` and stop.

## How identity is locked (read before generating anything)

The spec is the truth; this skill never re-describes the character. Identity is carried
by **three reinforcing mechanisms**, in priority order — full per-model detail in
`references/nbp-dialect.md`:

1. **The reference image (primary, when present).** The spec's `## Reference image`
   field names `inputs/ref.png` or `none`. When it names a path, pass it as `--ref` on
   **both** the sheet and the hero — a reference is the single biggest fix for identity
   drift, and all three models in the chain consume it.
2. **The frozen blocks (reinforcement).** `STYLE_STACK` and `CHARACTER_BLOCK` are pasted
   **byte-for-byte from the spec**, never retyped from memory, never "improved". The
   moment a token is paraphrased ("violet eyes" → "purple eyes") the model drifts. This
   is the **no-synonym rule** — the same discipline that locks the spec.
3. **The fixed seed (tie-breaker).** The spec's `## Seed` (default 7777) is reused on the
   sheet, the hero, and any retry — it keeps low-level rendering stable.

The frozen blocks come FROM the spec. This skill does NOT invent them and has no
defaults for them — if the spec is missing or its blocks are empty, that is a clean
recorded failure, not an excuse to improvise a character.

## Model chain (pinned 2026-06-18 for ai-gen v2.1.0 — walk in order, never improvise)

| Order | Model | fal slug | Role |
|---|---|---|---|
| 1 | Nano Banana Pro | `fal-ai/nano-banana-pro` | primary sheet + hero — best identity, `--aspect-ratio` + `--resolution` + `--ref` (≤14) |
| 2 | GPT Image 2 | `openai/gpt-image-2` | fallback 1 — Thinking Mode, ≤16 refs; ref flag is runtime-confirm |
| 3 | Nano Banana 2 | `fal-ai/nano-banana-2` | fallback 2 — cheaper Flash sibling, fixed-seed, `--ref` supported |

**All three models are reference-capable and aspect-ratio-capable** — so `--aspect-ratio`
+ `--ref` are passed to every model and the character lock survives a fallback (unlike
BOT-013, whose diffusion fallbacks were ref-blind). `scripts/gen-image.sh` owns the
walking: it tries each model in order, passes the shared flags, parses
`files[0].local_path`, captures the `*.fal.media` URL, converts a stray `.webp`→`.png`,
retries once on a missing URL, and prints `model<TAB>local-path<TAB>url`. **Record the
actual producing model for every asset.** Inventing an out-of-chain model mid-run is the
BOT-007 "SD 3.5 incident" — don't. Per-model quirks (incl. the runtime-confirm
gpt-image-2 ref flag and the "no text" gotcha): `references/nbp-dialect.md`.

> Cost note: nano-banana-pro is cheap (tens of credits per image); a full bible is well
> under $0.50. Pass `--max-cost 80` on every call (the script forwards it). The
> `credits_used` JSON field is unreliable — trust `ai-gen estimate` / `ai-gen balance`.

---

## Phase 2 — turnaround

Writes `artifacts/<project-name>/{reference-sheet.png, hero.png, generation-log.md}`.

### 1. Read inputs (READ-BEFORE-WRITE)

Read `artifacts/<project-name>/character-spec.md` (required). It is missing or its
`STYLE_STACK` / `CHARACTER_BLOCK` / `Seed` sections are empty → the bible was never
locked: record the failure in `state.md` (`status: blocked`,
`next_action: run bot-016-character-design — character-spec.md missing or incomplete`)
and stop. Do **not** invent a character.

From the spec, take **verbatim**:
- `STYLE_STACK` (the frozen style line)
- `CHARACTER_BLOCK` (the comma-joined identity tokens, fixed order)
- `Seed` (the fixed integer)
- `Reference image` (a path under `inputs/` or `none`)

Resolve the optional inputs (defaults applied silently, headless):
- **views** → default `front view, three-quarter view, side profile, back view`
- **aspect-ratio** → default `16:9`
- **resolution** → accepted but **ignored** (Test 2026-06-19: the ai-gen CLI rejects `--resolution` for the bible-chain models and the whole chain fell through, skipping the primary; each model now renders at its own default — 16:9 was crisp at default in the Step-0 PoC)

### 2. Compose the turnaround prompt (frozen blocks VERBATIM + A1 instruction)

Build the prompt in the fixed order from `references/nbp-dialect.md` and save it to
`work/<project-name>/prompt-sheet.txt`:

```
<STYLE_STACK verbatim> . <CHARACTER_BLOCK verbatim> . <A1 turnaround instruction with the resolved view list> . no text in the image . <aspect ratio>
```

The A1 turnaround instruction (from `references/nbp-dialect.md`, with `[VIEW_LIST]`
filled from the resolved views): "Create a complete character turnaround sheet showing
the same character from these angles: [VIEW_LIST]. All views show the SAME character
with consistent proportions, facial features, hair, outfit, and color palette — no drift
between views. Clean neutral background with clear separation between views. Professional
character-design reference sheet, clean render."

Always append **"no text in the image"** (the A3 printed-name gotcha) and state the
aspect ratio at the end. Never reorder or paraphrase a token inside the frozen blocks.

### 3. Generate the sheet

Pass the spec's reference image as `--ref` when it is a path (not `none`):

```bash
scripts/gen-image.sh work/<project-name>/prompt-sheet.txt \
  artifacts/<project-name> reference-sheet.png \
  --seed <spec seed> --aspect-ratio <aspect> \
  --ref <spec reference image, if a path> --max-cost 80
```

(Omit `--ref` entirely when the spec's `Reference image` is `none`.) Capture the printed
`model<TAB>path<TAB>url` line — the model and URL go in the log.

### 4. Compose & generate the hero portrait (same seed, same chain)

Build `work/<project-name>/prompt-hero.txt` — the frozen blocks VERBATIM + the hero
instruction from `references/nbp-dialect.md` ("A clean front-facing hero portrait of the
same character … neutral studio background … single character, no other figures. No text
in the image.") + the aspect ratio. Pass the same `--ref` and the **same seed**:

```bash
scripts/gen-image.sh work/<project-name>/prompt-hero.txt \
  artifacts/<project-name> hero.png \
  --seed <spec seed> --aspect-ratio <aspect> \
  --ref <spec reference image, if a path> --max-cost 80
```

### 5. Self-check both images (Read the pixels)

**Read each PNG** and run a quick self-check — this catches a bad image before it is
passed off as the bible:

- **reference-sheet.png** — are all requested views present? Is it ONE consistent
  character across every view (face, hair, outfit, palette agree — no drift/warping)? Is
  it on-brief vs the CHARACTER_BLOCK? Is the background clean and free of stray text?
- **hero.png** — is it a single clean front-facing portrait of the SAME character, on-
  brief, usable as an i2v start frame (no second figure, no text)?

On a failure: **one retry** on the same chain with the same seed, tightening the prompt
toward the drifting token (e.g. emphasize the token that warped) — never change the seed
to "fix" drift. If it still fails, **keep the best attempt** and record an honest note in
the log (which dimension failed, that the best attempt was kept). Never loop, never hide
it.

### 6. Write generation-log.md

This file tells the truth about production and is parsed downstream + by the eval grader.
Write one block per asset in this exact shape:

```markdown
# Generation Log — <project-name>

## reference-sheet.png
- model: <model gen-image.sh printed>
- seed: <spec seed>
- aspect-ratio: <aspect>
- resolution: <resolution>
- ref: <spec reference image path | none>
- url: <https://fal.media/...>
- fallbacks: <"none" | which models were tried before the producing one, in order>
- self-check: views=PASS identity=PASS on-brief=PASS no-text=PASS
- notes: <retries, drift kept as best-attempt, deviations — or "none">

### Prompt
<the full composed prompt text, including the frozen blocks verbatim>

## hero.png
- model: <model>
- seed: <spec seed>
- aspect-ratio: <aspect>
- resolution: <resolution>
- ref: <path | none>
- url: <https://fal.media/...>
- fallbacks: <...>
- self-check: front-portrait=PASS identity=PASS on-brief=PASS no-text=PASS
- notes: <...>

### Prompt
<the full composed prompt text, including the frozen blocks verbatim>
```

The `model:`, `seed:`, `url:`, `fallbacks:` lines and the verbatim `### Prompt` are
non-negotiable — they are the provenance contract JTBD-2 grades and the director bots
rely on. `gen-image.sh` already retries once when a response lacks the URL; if it still
prints none, treat the attempt as failed.

### 7. (Optional) per-angle crops

If a downstream consumer wants single-angle PNGs, run the best-effort helper — it never
fails the phase:

```bash
scripts/crop-views.sh artifacts/<project-name>/reference-sheet.png \
  artifacts/<project-name>/views <N>
```

Crops are convenience only; the bible contract is `reference-sheet.png` + `hero.png`.

### 8. Update state.md

Mark the `turnaround` row `done` (or `blocked` with the reason if every model in the
chain failed for an asset — in that case still write `generation-log.md` with an ERROR
block for the failed asset, no fabricated asset), refresh `updated`, and set
`next_action: Run bot-016-consistency-check for phase 3 (check-package)`. The ledger is
how phases chain — never leave it stale.

---

## Outputs

All paths are per-project and exactly as declared in frontmatter — never invent others:

- `artifacts/<project-name>/reference-sheet.png` — multi-view turnaround of ONE
  consistent character (requested views present; face/hair/outfit/palette agree; clean
  neutral background; no in-image text).
- `artifacts/<project-name>/hero.png` — clean front-facing hero portrait of the same
  character (single figure, on-brief, i2v start frame; no in-image text).
- `artifacts/<project-name>/generation-log.md` — per-asset ledger (producing model +
  slug, seed, full verbatim prompt, fallbacks taken, fal.media URL, self-check verdict).

Intermediates (composed prompt files) go under `work/<project-name>/`, never under
`artifacts/`. Optional per-angle crops go under `artifacts/<project-name>/views/`.

## Headless failure rules (recap)

- Missing or incomplete `character-spec.md` → clean `blocked` row in `state.md` naming
  the file; stop. No invented character, no generation.
- All models in the chain fail for an asset → ERROR block in `generation-log.md` for that
  asset, phase row `blocked`. Never pass a partial/missing asset off as complete.
- Off-brief or drifting output → exactly one retry (same seed, tightened prompt), then
  keep-best + record honestly. Never silent, never an infinite loop, never an out-of-
  chain model.

## Scripts

- `scripts/gen-image.sh <prompt-file> <out-dir> <stable-name> [--seed N] [--size SIZE] [--aspect-ratio AR] [--resolution 1K|2K|4K] [--ref P ...] [--max-cost CREDITS]`
  — walks the pinned chain `fal-ai/nano-banana-pro → openai/gpt-image-2 →
  fal-ai/nano-banana-2` in order, passes `--aspect-ratio` (+ `--resolution` to NBP) +
  `--ref` (repeatable) to every model, parses `files[0].local_path`, captures the
  `*.fal.media` URL, converts `.webp`→`.png`, retries once on a missing URL, and prints
  `model<TAB>local-path<TAB>url` on success. Exits 1 when the whole chain fails. The
  gpt-image-2 ref/aspect flag is runtime-confirm — a model that rejects an arg falls
  through to the next.
- `scripts/crop-views.sh <reference-sheet.png> <out-dir> [N]` — OPTIONAL, best-effort
  ImageMagick helper to slice N evenly-spaced angle crops from the sheet. Non-fatal:
  soft-exits 0 if ImageMagick is missing or the crop can't be computed.

## References (load when needed)

- `references/nbp-dialect.md` — recipe A1 baked inline (verbatim turnaround + hero prompt
  templates), the prompt-assembly contract, per-model quirks (NBP `--aspect-ratio` +
  `--resolution` + `--ref`; gpt-image-2 Thinking Mode + the runtime-confirm ref flag +
  "no text" gotcha; nano-banana-2 cheaper fixed-seed), seed discipline, the fallback
  reasoning, and ai-gen v2.1.0 CLI mechanics.
