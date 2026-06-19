---
name: bot-016-character-design
description: Turn a character brief into a locked, verbatim trait-lock spec — 5-7 distinctive identity tokens in face→hair→eyes→outfit/props order, a fixed integer seed, a named palette with reasoning, and a frozen STYLE_STACK + CHARACTER_BLOCK — written into character-spec.md, the fleet interface every downstream director bot parses. This is THE bible step; identity drift downstream is caused by skipping it or by paraphrasing a locked token. Run as phase 1 of every BOT-016 character project, right after onboarding, whenever character-spec.md is missing or fails validate-spec.sh, or when asked to lock, re-lock, or refine a character's identity. Do this BEFORE any image is generated.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-016
  inputs:
    - name: project-context
      type: markdown
      required: true
      description: artifacts/<project-name>/context.md — the character brief (text description and/or a reference-image path). Absence is a recorded failure, never an invented character.
    - name: reference-image
      type: image
      required: false
      description: An uploaded reference image cited in context.md (e.g. inputs/ref.png). Copied into artifacts/<project-name>/inputs/ and recorded as the PRIMARY identity anchor; tokens reinforce it. Default — none (text-only spec).
    - name: style-preference
      type: text
      required: false
      description: Art style / render / lighting / camera look for the STYLE_STACK, from context.md. Default — "cinematic concept-art realism, photorealistic render, dramatic rim light".
    - name: seed
      type: text
      required: false
      description: Fixed generation seed (integer as text), reused across every asset in the project. Default — 7777. Recorded in character-spec.md so phases 2-3 use the same one.
  outputs:
    - name: character-spec
      type: markdown
      path: artifacts/<project-name>/character-spec.md
      description: The locked character bible spec — Identity Tokens (5-7 verbatim, face→hair→eyes→outfit/props order), Seed (one integer), Palette (named + reasoning), frozen STYLE_STACK + CHARACTER_BLOCK, Reference image, Provenance, Downstream use. The stable contract BOT-017/BOT-018 parse by fixed section name.
    - name: reference-image-copy
      type: png
      path: artifacts/<project-name>/inputs/ref.png
      description: Only written when context.md supplies a reference image — the uploaded reference copied into the project so downstream phases carry the same primary anchor. Absent for text-only briefs.
---

# Character Design — lock the character bible spec

Convert the project's brief into `artifacts/<project-name>/character-spec.md`: a verbatim
trait-lock spec with a fixed seed, a named palette, and two frozen prompt blocks. This is a
**pure-LLM phase** — no `ai-gen` calls, no network, no images. The spec is the contract for
the whole bible AND the fleet interface: phase 2 pastes its frozen blocks into every
generation prompt, phase 3 grades the sheet against its tokens, and the downstream director
bots (BOT-017 Seedance, BOT-018 Kling) parse its **fixed section names** to drive shots on
the same identity. A paraphrased token here becomes identity drift three bots downstream —
which is why the format is rigid, machine-checked, and the no-synonym rule is absolute.

This skill runs **headless**. Never ask the user anything: missing optional inputs take the
documented defaults; a missing brief is a clean, recorded failure.

## The consistency mechanism (read before writing anything)

Identity is held by **three reinforcing mechanisms** you lock here, in priority order:

1. **The reference image (primary, when supplied).** If `context.md` cites an uploaded
   reference, that image is the strongest anchor — downstream passes it as `--ref` on every
   generation (recipe A1: "consistency is achieved by how you use reference images", not by
   longer prompts). You copy it into `inputs/` and record it; tokens reinforce it.
2. **The frozen blocks (the written lock).** STYLE_STACK and CHARACTER_BLOCK are composed
   **once**, frozen, and pasted **byte-identical** into every prompt downstream. The moment a
   token is paraphrased — "emerald eyes" → "green eyes", "matte-black skin" → "dark skin" —
   the model drifts toward the looser description. **No-synonym rule: once a token is set, it
   is reused verbatim everywhere. Never rewrite a locked token.**
3. **The fixed seed (tie-breaker).** One integer (default 7777) reused across every asset
   keeps low-level rendering choices stable.

Read `references/trait-lock.md` before composing the tokens — it carries the no-synonym rule,
the 5-part frame, token ordering, the model-agnostic bible template, and worked examples.

## Workflow

### 1. Read before writing

Read `artifacts/<project-name>/context.md` and `state.md`. The character brief lives in
context.md (usually under "Strategic question / objective" or "What this project is"): a text
description, and/or a path to an uploaded reference image. Honor any standing constraints in
context.md (a named character, a do-not-touch detail, a stated style).

**If context.md has no character brief at all** (no description AND no reference image): do
NOT invent one. Record the failure in state.md (see "Failure handling") and stop the phase.

### 2. Resolve inputs and defaults

| input | required | default when absent |
|---|---|---|
| character brief | yes | — (clean recorded failure) |
| reference image | no | none (text-only spec) |
| character name | no | coin a short slug from the brief (e.g. "Vyre", "the-mascot") |
| style preference | no | `cinematic concept-art realism, photorealistic render, dramatic rim light` |
| seed | no | `7777` |

Every default you apply gets a bullet in the spec's `## Provenance` line and, when it shaped
identity (a coined name, neutral defaults for a sparse brief), a `Defaults applied` note —
downstream phases and the run summary rely on that honesty.

### 3. Handle the reference image (when present)

If `context.md` cites a reference image and the file exists, copy it into the project:

```bash
mkdir -p artifacts/<project-name>/inputs
cp <cited-path> artifacts/<project-name>/inputs/ref.png
```

Record `inputs/ref.png` in the spec's `## Reference image` section as the **primary anchor**.
Derive the trait tokens **consistent with the reference** (do not contradict what the image
shows). If the brief cites a reference path that does not exist on disk, treat it as text-only,
set `## Reference image` to `none`, and add a `Defaults applied` note that the cited reference
was not found. Never fabricate a reference path.

### 4. Extract the trait tokens (5-7, distinctive, fixed order)

From the brief, extract **5-7 distinctive identity traits** and phrase each as a verbatim
token. Distinctive = a trait that visibly separates THIS character from a generic one (a scar,
a braid style, glowing eyes, a signature garment) — not a generic filler ("brown hair, two
eyes"). Order them **face → hair → eyes → outfit/props** (the recipe-A frame: list face, then
hair, then clothing). Each token is the byte-identical string you will reuse everywhere:

- Use **specific materiality**, not adjective soup: "obsidian-and-crimson lamellar armor", not
  "cool armor". (See `references/trait-lock.md` § Token craft.)
- A token is a noun phrase with its distinguishing detail baked in, so it survives copy-paste:
  `silver-white braided hair`, `glowing violet eyes`, `jagged scar across the left cheekbone`.
- Cap at 7. More tokens dilute the lock (recipe A: over-describing *hurts* consistency).

**Too-sparse brief** (you can extract fewer than 2 distinctive traits): do NOT stop. Add
**neutral defaults** to reach at least 5 tokens (e.g. a neutral face, a plain hairstyle, a
simple outfit consistent with the brief's genre), and flag each invented token in a
`Defaults applied` note so the creator can refine. A flagged neutral default is a correct
headless outcome; an unflagged guess is not.

### 5. Choose the seed and the palette

- **Seed**: from `context.md`/inputs if given, else **7777**. Exactly one integer. It is
  recorded in the spec and reused by every later phase — do not pick a new one per asset.
- **Palette**: name a coherent palette and give **one line of reasoning** tying it to the
  character (e.g. "Obsidian & Violet — matte-black skin and glowing violet eyes against
  cold-steel armor read as menacing nobility"). The palette is descriptive guidance, not a
  per-token color override; it must not contradict any color already baked into a token.

### 6. Compose the two frozen blocks

These are the byte-identical strings phase 2 pastes into every prompt. Compose each once,
then never rewrite it:

- **STYLE_STACK** — art style + render + lighting + camera look, from the style preference (or
  the default). One quoted line, e.g.
  `"cinematic concept-art realism, photorealistic render, dramatic rim light, volumetric atmosphere, sharp focus"`.
  It carries NO identity tokens — style only.
- **CHARACTER_BLOCK** — the trait tokens, **comma-joined in the fixed face→hair→eyes→outfit/props
  order**, as one quoted line, e.g.
  `"matte black-violet skin, silver-white braided hair, glowing violet eyes, obsidian-and-crimson lamellar armor"`.
  Every token in CHARACTER_BLOCK must appear **byte-identical** to its bullet in
  `## Identity Tokens` — that byte-identity IS the no-synonym lock the validator checks.

Keep style words OUT of CHARACTER_BLOCK and identity words OUT of STYLE_STACK — the two blocks
have non-overlapping jobs, and mixing them is the #1 cause of prompt-composition drift.

### 7. Write the spec file

Write `artifacts/<project-name>/character-spec.md` in EXACTLY this layout. The section names
are a stable contract — the downstream director bots parse them by name, and
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
brief source · defaults applied · 2026-06-19 · model used for the sheet: TBD (phase 2 records it)

## Downstream use
front-frame: hero.png · identity reference: reference-sheet.png · tokens: CHARACTER_BLOCK
```

Notes on the fields:

- `## Identity Tokens` — bullets `- <key>: <token>`. At least 5 tokens, ordered face → hair →
  eyes → outfit/props. The `face`, `hair`, `eyes`, `outfit/props` keys lead; extra distinctive
  tokens follow with their own short key (`scar:`, `props:`, `marking:`).
- `## Seed` — one line, exactly one integer, nothing else.
- `## STYLE_STACK` / `## CHARACTER_BLOCK` — a single double-quoted line each, non-empty.
- `## Reference image` — `inputs/ref.png` when one was copied, else `none`.
- If any neutral defaults were invented for a sparse brief, add them as a one-line
  `Defaults applied:` clause inside `## Provenance` AND record them in state.md's Decisions log.
- Keep the whole spec ≤ ~1500 words.

### 8. Validate

Run the structural gate and fix every reported line until it passes:

```bash
bash <skill-dir>/scripts/validate-spec.sh artifacts/<project-name>/character-spec.md
```

Exit 0 = the spec is structurally sound (≥5 tokens, exactly one integer Seed, non-empty
frozen blocks, every contract section present, CHARACTER_BLOCK tokens trace to the token
list). Exit 1 = line-itemized errors. Fix and re-run, up to 3 fix cycles. If it still fails
after 3 cycles, keep the best version on disk, mark the phase `blocked` in state.md with the
validator output quoted under "Open questions / blockers", and stop — never advance the chain
on an invalid spec. The validator is the deterministic gate the eval loop uses; do not
hand-wave past it.

### 9. Update the ledger

state.md is how phases chain — never leave it stale (see "Ledger updates").

## Safety (always on)

Family-safe / advertiser-safe. Route **stylized characters only** — no real identifiable
people, no real brands, no copyrighted characters (this also respects the downstream
Seedance/Kling face policy). If the brief names a real person or a copyrighted character, keep
the premise but swap in an original stylized stand-in, and record the substitution in a
`Defaults applied` note. Proceed; do not stop for this.

## Failure handling (headless)

| situation | action |
|---|---|
| context.md missing entirely | Phase cannot run — mark the phase row `blocked`, project `status: blocked`, blocker: "lock-spec blocked: no context.md — run onboarding first". Stop. |
| no brief in context.md (no description AND no reference) | Do NOT write a spec. Mark the phase row `blocked`, project `status: blocked`, blocker: "lock-spec blocked: character brief required — add a description and/or a reference image to context.md, then re-run phase 1". `next_action: Add a character brief to context.md, then re-run phase 1 (bot-016-character-design).` Stop. |
| brief too sparse (<2 distinctive traits) | Add neutral defaults to reach ≥5 tokens; flag each in a `Defaults applied` note and a state.md Decisions line. Proceed. |
| cited reference image not found on disk | Treat as text-only; set `## Reference image` to `none`; add a `Defaults applied` note ("cited reference <path> not found"). Proceed. |
| real-person / branded / copyrighted character | Keep the premise, swap in an original stylized stand-in; note the substitution. Proceed. |
| validate-spec.sh still failing after 3 fix cycles | Keep best version, mark phase `blocked` with the validator output quoted in state.md. Stop. |

## Outputs

This phase writes exactly:

- `artifacts/<project-name>/character-spec.md` — the locked character bible spec, in the
  contract shape above: Identity Tokens (5-7 verbatim, face→hair→eyes→outfit/props order), Seed (one
  integer), Palette (named + reasoning), frozen STYLE_STACK + CHARACTER_BLOCK, Reference
  image, Provenance, Downstream use.
- `artifacts/<project-name>/inputs/ref.png` — **only** when context.md supplied a reference
  image: the uploaded reference copied into the project as the primary anchor. Absent for
  text-only briefs.

No images, no sheets, no logs — those belong to phase 2. Intermediate scratch goes under
`work/<project-name>/`, never under `artifacts/`.

## Ledger updates

After the spec validates, update `artifacts/<project-name>/state.md`:

- Mark this phase row (`lock-spec`) `done`; set the next row (`turnaround`) to `next` (or
  `in-progress` if you continue this session).
- Refresh `updated:` to today; keep project `status: in-progress`.
- Rewrite `next_action:` to the one imperative for phase 2, e.g.:
  `next_action: Generate the turnaround sheet + hero — run bot-016-reference-sheet phase 2 (reads character-spec.md, writes reference-sheet.png + hero.png + generation-log.md).`
- Append a Decisions-log line for any default or assumption that shaped the spec (coined name,
  neutral defaults, missing reference, stand-in substitution).

On failure, write the `blocked` shape from "Failure handling" instead — a clean recorded
failure is a correct outcome; a silent or invented one is not.

## References

- `references/trait-lock.md` — the no-synonym rule, the 5-part trait frame, token ordering
  and craft, the model-agnostic A2 bible template, the A4 fixed-seed frame, and worked
  STYLE_STACK / CHARACTER_BLOCK examples (including the Step-0 dark-elf token set). Load before
  composing tokens.
- `scripts/validate-spec.sh` — deterministic structural gate; the phase gate for the eval loop.
