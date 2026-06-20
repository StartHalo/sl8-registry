---
name: bot-027-character-bible
description: Turn a cinematic brief into a locked character bible — first a verbatim trait-lock character-spec.md (5-7 distinctive identity tokens face→hair→eyes→outfit/props, a fixed integer seed, a named palette, frozen STYLE_STACK + CHARACTER_BLOCK), then the visual half — a multi-view turnaround reference-sheet.png and a clean hero.png of ONE consistent on-brief character — recorded with model/seed/prompt/fallback/url in bible-log.md. This is THE bible step — the reference-sheet + hero become the @Image1/@Image2 anchors the Seedance reference-to-video render reads to hold the SAME character across every shot; identity drift across the cinematic is caused by skipping this or by paraphrasing a locked token. Run as phase 1 of every BOT-027 cinematic project, right after onboarding, whenever character-spec.md is missing or the bible images are absent, or when asked to lock a character, build a character bible, or generate a turnaround / reference sheet / hero from a brief. Do this BEFORE the shotlist or the render.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-027
  inputs:
    - name: project-context
      type: markdown
      required: true
      description: artifacts/<project-name>/context.md — the cinematic brief (a story/fight premise plus a character description, and/or a path to a reference image). Absence is a recorded failure, never an invented character.
    - name: reference-image
      type: image
      required: false
      description: An uploaded reference image cited in context.md (e.g. inputs/ref.png). Copied into artifacts/<project-name>/inputs/, recorded as the PRIMARY identity anchor, and passed as --ref on every bible generation; tokens reinforce it. Default — none (text-only spec; the language+seed lock holds).
    - name: style-preference
      type: text
      required: false
      description: Art style / render / lighting / camera look for the STYLE_STACK, from context.md. Default — "cinematic concept-art realism, dramatic lighting".
    - name: seed
      type: text
      required: false
      description: Fixed generation seed (integer as text), reused across both bible images and recorded in the spec so phases 2-3 stay consistent. Default — 7777.
  outputs:
    - name: character-spec
      type: markdown
      path: artifacts/<project-name>/character-spec.md
      description: The locked character bible spec in the fleet-contract shape — Identity Tokens (5-7 verbatim, face→hair→eyes→outfit/props order), Seed (one integer), Palette (named + reasoning), frozen STYLE_STACK + CHARACTER_BLOCK, Reference image, Provenance, Downstream use. The Seedance render (phase 3) and the Kling sibling parse it by fixed section name.
    - name: reference-sheet
      type: png
      path: artifacts/<project-name>/reference-sheet.png
      description: Multi-view turnaround sheet — the requested angles (front / three-quarter / side / back by default) of ONE consistent character (face, hair, outfit, palette agree across views), clean neutral background, no in-image text. The @Image1 identity reference the Seedance render reads.
    - name: hero
      type: png
      path: artifacts/<project-name>/hero.png
      description: Clean front-facing hero portrait of the same character — the canonical i2v start frame and @Image2 reference the Seedance render feeds first.
    - name: bible-log
      type: markdown
      path: artifacts/<project-name>/bible-log.md
      description: Per-asset ledger — producing model + slug, the fixed seed, the full composed prompt (frozen blocks verbatim), any fallbacks taken in order, the fal.media URL, and the post-generation self-check verdict.
---

# Character Bible — lock the spec, then render the turnaround & hero

This is **phase 1** of the Cinematic Director (Seedance) pipeline (JTBD-1). It consolidates the
two halves of a character bible into one skill with two phases:

- **Phase A — lock the spec.** Turn the project's brief in `context.md` into
  `artifacts/<project-name>/character-spec.md`: a verbatim trait-lock spec with 5-7 distinctive
  Identity Tokens, a fixed seed, a named palette, and two frozen prompt blocks. **Pure-LLM** —
  no `ai-gen` calls, no network, no images.
- **Phase B — render the bible.** Turn that spec into two reusable images:
  `reference-sheet.png` (a multi-view turnaround holding ONE identity) and `hero.png` (a clean
  front portrait), recording every asset's provenance in `bible-log.md`.

The bible is the **cross-shot identity anchor** for the whole cinematic: phase 3 passes
`reference-sheet.png` as `--ref` (`@Image1`) and `hero.png` as `--ref` (`@Image2`) into the ONE
Seedance `reference-to-video` call, with "maintain the EXACT same identity in every shot". A
paraphrased token here, or a drifting/text-littered sheet, becomes identity drift across every
shot of the finished MP4 — which is why the spec format is rigid + machine-checked, the
no-synonym rule is absolute, and phase B self-checks the pixels.

This skill runs **headless**. Never ask the user anything: missing optional inputs take the
documented defaults; a missing brief or a missing locked spec is a clean, recorded failure.

## The consistency mechanism (read before writing or generating anything)

Identity is held by **three reinforcing mechanisms** you lock here, in priority order:

1. **The reference image (primary, when supplied).** If `context.md` cites an uploaded
   reference, that image is the strongest anchor — phase B passes it as `--ref` on every
   generation, and phase 3 carries it forward. You copy it into `inputs/` and record it; tokens
   reinforce it.
2. **The frozen blocks (the written lock).** STYLE_STACK and CHARACTER_BLOCK are composed
   **once**, frozen, and pasted **byte-identical** into every prompt downstream. The moment a
   token is paraphrased — "glowing violet eyes" → "purple eyes" — the model drifts.
   **No-synonym rule: once a token is set, it is reused verbatim everywhere.**
3. **The fixed seed (tie-breaker).** One integer (default 7777) reused across both bible images
   keeps low-level rendering choices stable.

Read `references/trait-lock.md` before composing the tokens (recipe A — no-synonym rule, the
5-part frame, token ordering, the model-agnostic bible template, worked examples) and
`references/nbp-dialect.md` before generating (recipe A1 — the verbatim turnaround/hero prompt
templates, the pinned image chain, per-model quirks, the `--resolution` fix, CLI mechanics).

---

## Phase A — lock the spec (pure-LLM)

Writes `artifacts/<project-name>/character-spec.md` (+ `inputs/ref.png` only when a reference is
supplied). No images, no generation.

### A1. Read before writing

Read `artifacts/<project-name>/context.md` and `state.md`. The character/story brief lives in
context.md (usually under "Strategic question / objective" or "What this project is"): a text
description, and/or a path to an uploaded reference image. Honor any standing constraints in
context.md (a named character, a do-not-touch detail, a stated style).

**If context.md has no character brief at all** (no description AND no reference image): do NOT
invent one. Record the failure in state.md (see "Failure handling") and stop the phase.

### A2. Resolve inputs and defaults

| input | required | default when absent |
|---|---|---|
| character/story brief | yes | — (clean recorded failure) |
| reference image | no | none (text-only spec) |
| character name | no | coin a short slug from the brief (e.g. "Vyre", "the-mascot") |
| style preference | no | `cinematic concept-art realism, dramatic lighting` |
| seed | no | `7777` |

Every default you apply gets recorded in the spec's `## Provenance` line, and — when it shaped
identity (a coined name, neutral defaults for a sparse brief) — a `Defaults applied` note.

### A3. Handle the reference image (when present)

If `context.md` cites a reference image and the file exists, copy it into the project:

```bash
mkdir -p artifacts/<project-name>/inputs
cp <cited-path> artifacts/<project-name>/inputs/ref.png
```

Record `inputs/ref.png` in the spec's `## Reference image` section as the **primary anchor**, and
derive the trait tokens **consistent with the reference** (do not contradict what the image
shows). If the cited reference path does not exist on disk, treat it as text-only, set
`## Reference image` to `none`, and add a `Defaults applied` note ("cited reference <path> not
found"). Never fabricate a reference path.

### A4. Extract the trait tokens (5-7, distinctive, fixed order)

From the brief, extract **5-7 distinctive identity traits** and phrase each as a verbatim token,
ordered **face → hair → eyes → outfit/props → other distinctive** (scar, marking, signature
prop). Distinctive = a trait that visibly separates THIS character from a generic one — use
**specific materiality**, not adjective soup ("obsidian-and-crimson lamellar armor", not "cool
armor"). Each token is a self-contained noun phrase with its distinguishing detail baked in. Cap
at 7 — more dilutes the lock. The first three bullets MUST be keyed `face`, `hair`, `eyes`. Full
craft rules + worked examples: `references/trait-lock.md`.

**Too-sparse brief** (fewer than 2 distinctive traits): do NOT stop. Add **neutral defaults** to
reach at least 5 tokens (a neutral face, a plain hairstyle, a simple outfit consistent with the
brief's genre), and flag each invented token in a `Defaults applied` note.

### A5. Choose the seed and the palette

- **Seed**: from `context.md`/inputs if given, else **7777**. Exactly one integer, reused by
  both bible images and phase 3 — do not pick a new one per asset.
- **Palette**: name a coherent palette and give **one line of reasoning** tying it to the
  character. Descriptive guidance only; it must not contradict any color baked into a token.

### A6. Compose the two frozen blocks

Compose each once, then never rewrite it:

- **STYLE_STACK** — art style + render + lighting + camera look, from the style preference (or
  the default `"cinematic concept-art realism, dramatic lighting"`). One quoted line. NO identity
  tokens — style only. (Lighting words earn the most quality-per-word for both the bible image
  and the Seedance render that reads this stack.)
- **CHARACTER_BLOCK** — the trait tokens, **comma-joined in the fixed face→hair→eyes→outfit/props
  order**, as one quoted line. Every token must appear **byte-identical** to its bullet in
  `## Identity Tokens` — that byte-identity IS the no-synonym lock the validator checks.

Keep style words OUT of CHARACTER_BLOCK and identity words OUT of STYLE_STACK.

### A7. Write the spec file

Write `artifacts/<project-name>/character-spec.md` in EXACTLY this layout. The section names are
a stable **fleet contract** — phase 3 and the Kling sibling parse them by name, and
`validate-spec.sh` greps them, so do not rename, reorder, or drop any heading:

```markdown
# Character Spec: <Name>

## Identity Tokens   (verbatim — reuse byte-identical downstream, never paraphrase)
- face: <token>
- hair: <token>
- eyes: <token>
- outfit/props: <token>
- <5-7 distinctive tokens total, face → hair → eyes → outfit/props order>

## Seed
7777

## Palette
<Named palette> — <one line of reasoning>

## STYLE_STACK   (frozen — paste verbatim into every prompt)
"<art style, render, lighting, camera look>"

## CHARACTER_BLOCK   (frozen — paste verbatim into every prompt)
"<the identity tokens, comma-joined, fixed order>"

## Reference image
inputs/ref.png

## Provenance
brief source · defaults applied · 2026-06-19 · models used: TBD (phase B records the sheet/hero models)

## Downstream use
front-frame: hero.png · identity reference: reference-sheet.png · tokens: CHARACTER_BLOCK
```

- `## Seed` — one line, exactly one integer, nothing else.
- `## STYLE_STACK` / `## CHARACTER_BLOCK` — a single double-quoted line each, non-empty.
- `## Reference image` — `inputs/ref.png` when one was copied, else `none`.
- Any neutral defaults invented for a sparse brief → a one-line `Defaults applied:` clause inside
  `## Provenance` AND a state.md Decisions line.
- Keep the whole spec ≤ ~1500 words.

### A8. Validate the spec (deterministic gate)

```bash
bash <skill-dir>/scripts/validate-spec.sh artifacts/<project-name>/character-spec.md
```

Exit 0 = structurally sound (≥5 tokens, face→hair→eyes order, exactly one integer Seed, non-empty
frozen blocks, every contract section, CHARACTER_BLOCK tokens trace byte-identical to the token
list). Exit 1 = line-itemized errors — fix and re-run, up to **3 fix cycles**. If it still fails
after 3 cycles, keep the best version, mark the phase `blocked` in state.md with the validator
output quoted, and stop — never advance to phase B on an invalid spec.

---

## Phase B — render the turnaround & hero

Writes `artifacts/<project-name>/{reference-sheet.png, hero.png, bible-log.md}`. The frozen blocks
come FROM the spec; this phase never re-describes the character and has no defaults for the blocks.

### B1. Read the spec (READ-BEFORE-WRITE)

Read `artifacts/<project-name>/character-spec.md`. If it is missing or its `STYLE_STACK` /
`CHARACTER_BLOCK` / `Seed` sections are empty, the bible was never locked: record the failure in
state.md and stop. Do NOT invent a character. Take **verbatim** from the spec: `STYLE_STACK`,
`CHARACTER_BLOCK`, `Seed`, `Reference image` (a path under `inputs/` or `none`).

Resolve the optional inputs (defaults applied silently, headless):
- **views** → default `front view, three-quarter view, side profile, back view`
- **aspect-ratio** → default `16:9`
- **resolution** → accepted but **ignored** (the ai-gen CLI rejects `--resolution` for these
  models and the whole chain falls through, skipping the primary — see `references/nbp-dialect.md`;
  each model renders at its own default, which was crisp at 16:9 in the Step-0 PoC).

### B2. Compose the turnaround prompt (frozen blocks VERBATIM + A1 instruction)

Build the prompt in the fixed order from `references/nbp-dialect.md` and save it to
`work/<project-name>/prompt-sheet.txt`:

```
<STYLE_STACK verbatim> . <CHARACTER_BLOCK verbatim> . <A1 turnaround instruction with the resolved view list> . no text in the image . <aspect ratio>
```

The A1 instruction (with `[VIEW_LIST]` filled from the resolved views): "Create a complete
character turnaround sheet showing the same character from these angles: [VIEW_LIST]. All views
show the SAME character with consistent proportions, facial features, hair, outfit, and color
palette — no drift between views. Clean neutral background with clear separation between views.
Professional character-design reference sheet, clean render." Always append **"no text in the
image"** and state the aspect ratio at the end. Never reorder or paraphrase a token inside the
frozen blocks.

### B3. Generate the sheet

Pass the spec's reference image as `--ref` when it is a path (omit when `none`):

```bash
bash <skill-dir>/scripts/gen-image.sh work/<project-name>/prompt-sheet.txt \
  artifacts/<project-name> reference-sheet.png \
  --seed <spec seed> --aspect-ratio <aspect> \
  --ref <spec reference image, if a path> --max-cost 80
```

Capture the printed `model<TAB>path<TAB>url` line — the model and URL go in the log.

### B4. Compose & generate the hero portrait (same seed, same chain)

Build `work/<project-name>/prompt-hero.txt` — the frozen blocks VERBATIM + the hero instruction
from `references/nbp-dialect.md` ("A clean front-facing hero portrait of the same character …
neutral studio background … single character, no other figures. No text in the image.") + the
aspect ratio. Pass the same `--ref` and the **same seed**:

```bash
bash <skill-dir>/scripts/gen-image.sh work/<project-name>/prompt-hero.txt \
  artifacts/<project-name> hero.png \
  --seed <spec seed> --aspect-ratio <aspect> \
  --ref <spec reference image, if a path> --max-cost 80
```

### B5. Self-check both images (Read the pixels)

**Read each PNG** and run a quick self-check — this catches a bad bible before it poisons every
Seedance shot downstream:

- **reference-sheet.png** — are all requested views present? Is it ONE consistent character across
  every view (face, hair, outfit, palette agree — no drift/warping)? On-brief vs CHARACTER_BLOCK?
  Clean background, no stray text?
- **hero.png** — a single clean front-facing portrait of the SAME character, on-brief, usable as
  the i2v start frame (no second figure, no text)?

On a failure: **one retry** on the same chain with the same seed, tightening the prompt toward the
drifting token (emphasize the token that warped) — never change the seed to "fix" drift. If it
still fails, **keep the best attempt** and record an honest note in the log (which dimension
failed, that the best attempt was kept). Never loop, never hide it.

### B6. Write bible-log.md

This file tells the truth about production and is parsed downstream + by the eval grader. Write one
block per asset in this exact shape:

```markdown
# Bible Log — <project-name>

## reference-sheet.png
- model: <model gen-image.sh printed>
- seed: <spec seed>
- aspect-ratio: <aspect>
- resolution: <resolution — ignored, model default>
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
- resolution: <resolution — ignored, model default>
- ref: <path | none>
- url: <https://fal.media/...>
- fallbacks: <...>
- self-check: front-portrait=PASS identity=PASS on-brief=PASS no-text=PASS
- notes: <...>

### Prompt
<the full composed prompt text, including the frozen blocks verbatim>
```

The `model:`, `seed:`, `url:`, `fallbacks:` lines and the verbatim `### Prompt` are
non-negotiable — they are the provenance contract JTBD-1 grades and phase 3 relies on.
`gen-image.sh` already retries once when a response lacks the URL; if it still prints none, treat
the attempt as failed.

### B7. Update the ledger

state.md is how phases chain — never leave it stale (see "Ledger updates").

---

## Safety (always on)

Family-safe / advertiser-safe. Route **stylized characters/creatures only** — no real
identifiable people, no real brands, no copyrighted characters (this also respects the downstream
Seedance face policy). If the brief names a real person or a copyrighted character, keep the
premise but swap in an original stylized stand-in, and record the substitution in a `Defaults
applied` note. Proceed; do not stop for this.

## Failure handling (headless)

| situation | action |
|---|---|
| context.md missing entirely | Phase cannot run — mark the phase row `blocked`, project `status: blocked`, blocker: "character-bible blocked: no context.md — run onboarding first". Stop. |
| no brief in context.md (no description AND no reference) | Do NOT write a spec. Mark the phase row `blocked`, project `status: blocked`, blocker: "character-bible blocked: character brief required — add a description and/or a reference image to context.md, then re-run phase 1". `next_action: Add a character brief to context.md, then re-run phase 1 (bot-027-character-bible).` Stop. |
| brief too sparse (<2 distinctive traits) | Add neutral defaults to reach ≥5 tokens; flag each in a `Defaults applied` note and a state.md Decisions line. Proceed. |
| cited reference image not found on disk | Treat as text-only; set `## Reference image` to `none`; add a `Defaults applied` note ("cited reference <path> not found"). Proceed. |
| real-person / branded / copyrighted character | Keep the premise, swap in an original stylized stand-in; note the substitution. Proceed. |
| validate-spec.sh still failing after 3 fix cycles | Keep best version, mark phase `blocked` with the validator output quoted in state.md. Stop — never advance to phase B on an invalid spec. |
| character-spec.md missing/incomplete at phase B | Bible was never locked — clean `blocked` row in state.md naming the file; stop. No invented character, no generation. |
| all models in the chain fail for an asset | Write `bible-log.md` with an ERROR block for the failed asset (no fabricated asset); mark phase `blocked`. Never pass a partial/missing asset off as complete. |
| off-brief / drifting image | Exactly one retry (same seed, tightened prompt), then keep-best + record honestly. Never silent, never an infinite loop, never an out-of-chain model. |

## Outputs

This phase writes exactly (paths are per-project and exactly as declared in frontmatter — never
invent others):

- `artifacts/<project-name>/character-spec.md` — the locked character bible spec in the contract
  shape: Identity Tokens (5-7 verbatim, face→hair→eyes→outfit/props), Seed (one integer), Palette
  (named + reasoning), frozen STYLE_STACK + CHARACTER_BLOCK, Reference image, Provenance,
  Downstream use.
- `artifacts/<project-name>/reference-sheet.png` — multi-view turnaround of ONE consistent
  character (requested views present; face/hair/outfit/palette agree; clean neutral background; no
  in-image text). The `@Image1` reference for phase 3.
- `artifacts/<project-name>/hero.png` — clean front-facing hero portrait of the same character
  (single figure, on-brief, i2v start frame; no in-image text). The `@Image2` reference for phase 3.
- `artifacts/<project-name>/bible-log.md` — per-asset ledger (producing model + slug, the fixed
  seed, the full verbatim-block prompt, any fallbacks taken in order, the fal.media URL, and the
  self-check verdict).
- `artifacts/<project-name>/inputs/ref.png` — **only** when context.md supplied a reference image:
  the uploaded reference copied into the project as the primary anchor. Absent for text-only briefs.

Intermediate scratch (the composed prompt files) goes under `work/<project-name>/`, never under
`artifacts/`.

## Ledger updates

After the bible is complete, update `artifacts/<project-name>/state.md`:

- Mark this phase row (`character-bible`) `done`; set the next row (`shotlist`) to `next` (or
  `in-progress` if you continue this session).
- Refresh `updated:` to today; keep project `status: in-progress`.
- Rewrite `next_action:` to the one imperative for phase 2, e.g.:
  `next_action: Design the cinematic shot-list — run bot-027-shotlist phase 2 (reads context.md + character-spec.md, writes shotlist.md).`
- Append a Decisions-log line for any default/assumption that shaped the bible (coined name,
  neutral defaults, missing reference, stand-in substitution, a model fallback, a kept-best image).

On failure, write the `blocked` shape from "Failure handling" instead — a clean recorded failure
is a correct outcome; a silent or invented one is not.

## Scripts

- `scripts/validate-spec.sh <path/to/character-spec.md>` — deterministic structural + no-synonym
  byte-identity gate (token count, face→hair→eyes ordering, single-integer seed, non-empty frozen
  blocks, all contract sections, and the comma-tolerant CHARACTER_BLOCK join-equality check against
  the locked token list). Exit 0 valid, 1 lint errors, 2 usage/deps. The phase-A gate for the eval loop.
- `scripts/gen-image.sh <prompt-file> <out-dir> <stable-name> [--seed N] [--size SIZE] [--aspect-ratio AR] [--resolution 1K|2K|4K] [--ref P ...] [--max-cost CREDITS]`
  — walks the pinned chain `fal-ai/nano-banana-pro → openai/gpt-image-2 → fal-ai/nano-banana-2` in
  order, passes `--aspect-ratio` + `--ref` (repeatable) to every model, **does not forward
  `--resolution`** (the CLI rejects it for these models — accepted-but-ignored), parses
  `files[0].local_path`, captures the `*.fal.media` URL, converts `.webp`→`.png`, retries once on a
  missing URL, and prints `model<TAB>local-path<TAB>url` on success. Exits 1 when the whole chain fails.

## References (load when needed)

- `references/trait-lock.md` — recipe A baked inline (no-synonym rule, 5-part frame, token
  ordering/craft, model-agnostic bible template, the A4 fixed-seed frame, worked dark-elf +
  sparse-brief STYLE_STACK / CHARACTER_BLOCK examples). Load before composing tokens (phase A).
- `references/nbp-dialect.md` — recipe A1 baked inline (the verbatim turnaround + hero prompt
  templates, the prompt-assembly contract, the pinned image chain + per-model quirks, the
  `--resolution` fix, seed discipline, and ai-gen v2.1.0 CLI mechanics). Load before generating (phase B).
