---
name: bot-016-consistency-check
description: Vision-grade a character turnaround sheet against its locked spec and package the portable character bible. READS the reference-sheet PNG (keyless in-session vision), scores each trait token against the actual pixels, gives an overall 0-10 identity-consistency score with an explicit pass/regenerate verdict, then assembles character-bible.md — a manifest indexing every bible artifact (spec, sheet, hero, log) with paths, the seed, and a one-paragraph downstream-consumption handoff. Use as phase 3 (check-package) of a character-bible project, whenever asked to consistency-check a turnaround sheet, verify a character bible holds one identity, or package the bible for the downstream director bots.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-016
  inputs:
    - name: reference-sheet
      type: png
      required: true
      description: artifacts/<project-name>/reference-sheet.png — the multi-view turnaround written by phase 2; the pixels graded in this phase (missing → clean recorded failure, never grade from the filename)
    - name: character-spec
      type: markdown
      required: true
      description: artifacts/<project-name>/character-spec.md — the locked trait tokens, seed, palette, and frozen blocks written by phase 1; the contract every trait verdict is graded against (missing → clean recorded failure)
  outputs:
    - name: consistency-check
      type: markdown
      path: artifacts/<project-name>/consistency-check.md
      description: Per-trait verdict (each spec token graded against the sheet pixels), an overall 0-10 identity-consistency score, and an explicit pass or regenerate recommendation with the single tightened token if it regenerates
    - name: character-bible
      type: markdown
      path: artifacts/<project-name>/character-bible.md
      description: The portable bible manifest — indexes every bible artifact (spec, sheet, hero, generation log, consistency check) with its path, states the seed, and carries the fixed one-paragraph downstream-consumption handoff
---

# Consistency Check & Package — grade the pixels, then package the bible

Phase 3, the last phase. Two jobs that share one read of the sheet: **grade** whether the
turnaround actually holds ONE identity (vision, against the locked spec), and **package** the
portable bible the downstream director bots (BOT-017 Seedance, BOT-018 Kling) consume. The grade
gates the package — a drifting sheet is regenerated once before it is shipped, never rubber-stamped.

This bot runs **headless**. Never ask the user anything. Missing optional input → use the
documented default. Missing required input → record a clean failure in the project's `state.md`
and stop. There are no optional inputs here; both `reference-sheet.png` and `character-spec.md`
are required (see "Failure handling").

## The grade is on the PIXELS — Read the image, never grade from a filename

This is the one rule that makes this phase worth running. **You must `Read` `reference-sheet.png`
as an image** (keyless in-session vision) and grade each trait token against what your eyes see in
the pixels. A filename, a path, the spec text, or the generation log are NOT evidence of what the
sheet shows — a sheet named `reference-sheet.png` can still have the wrong hair in the side view.
Grading from anything but the rendered pixels is a fabricated grade, and a fabricated grade ships a
broken bible to two downstream bots. If you cannot actually view the PNG (Read returns no image),
that is a clean recorded failure, not a guessed score.

The spec is the *answer key*; the sheet is the *exam*. You read the answer key
(`character-spec.md` — the Identity Tokens, Palette, and CHARACTER_BLOCK), then you look at the
exam (the pixels) and mark each token present-and-consistent or drifting.

## Workflow

### 1. Read inputs (READ-BEFORE-WRITE)

Read `artifacts/<project-name>/state.md`, then the two required inputs:

- `artifacts/<project-name>/character-spec.md` — take the **Identity Tokens** list (face → hair →
  eyes → outfit/props order), the **Palette**, the **Seed**, and the **CHARACTER_BLOCK** verbatim.
  These are the trait checklist.
- `artifacts/<project-name>/reference-sheet.png` — **`Read` it as an image.** Also note where
  `hero.png` and `generation-log.md` live (same project folder) for the package step.

If either required file is missing, do not invent a score. Record the failure in `state.md`
(see "Failure handling") and stop.

### 2. Grade each trait token against the pixels

Load `references/consistency-rubric.md` once — it lists what to check per trait class and how to
phrase a targeted regenerate. Then, for **every** token in the spec's Identity Tokens (and the
Palette), look at the sheet across all its views and mark a verdict:

- **`consistent`** — the token is present and the SAME across every view on the sheet (the front,
  three-quarter, side, and back read as one character on this trait).
- **`drift`** — the token is present in some views but changed in others (e.g. silver braids in
  front, loose dark hair in the side view), OR it is rendered but does not match the spec token
  (e.g. spec says "glowing violet eyes", the sheet shows brown).
- **`absent`** — the token is not visible anywhere on the sheet (e.g. a signature prop the spec
  locks is missing entirely).

Grade by trait CLASS across views — face, hair, eyes, outfit/props, palette, and overall
silhouette/proportions — because drift hides in one view, not in the front the eye lands on first.
The per-trait checklist in `references/consistency-rubric.md` is the order to walk.

### 3. Score 0-10 and decide pass vs regenerate

Combine the per-trait verdicts into ONE overall identity-consistency score, 0-10:

- **9-10** — every trait consistent across every view; a stranger says "same character, every angle".
- **7-8** — identity clearly holds; at most one minor, non-identity-defining wobble (a fold of the
  cloak differs; the face/hair/eyes/signature props all agree). **Pass.**
- **4-6** — one identity-defining trait drifts or is absent in a view (the hair changes, an eye
  color shifts, a signature prop appears/vanishes). **Regenerate.**
- **0-3** — multiple traits drift, the views look like different characters, or the sheet is
  unusable as an identity reference. **Regenerate.**

**Pass bar: ≥ 7/10.** The verdict is `pass` at 7 or above, `regenerate` below 7.

### 4. The regenerate-once rule (single variable, same seed)

If the verdict is `regenerate`, recommend **exactly one** targeted regeneration — never an open
loop, never a free re-roll:

- **Same seed.** The seed from the spec is reused (drift is fixed by tightening language, not by
  re-rolling the dice).
- **One tightened token.** Name the single drifting trait and the tightened phrasing that should
  replace it in the prompt (e.g. "tighten `hair` to `waist-length silver-white braided hair,
  identical braid pattern in every view`"). Tightening means more specific and explicit, **never a
  synonym** — the no-synonym rule still holds; you are sharpening the locked token, not renaming it.
- **Once only.** This phase recommends the regenerate; phase 2 (`bot-016-reference-sheet`) executes
  it once with the same seed + the tightened token, then this phase re-grades. If the second sheet
  still scores below 7, do **not** loop a third time: write the consistency check with the best
  attempt, an honest `regenerate` verdict explaining the residual drift, and let the creator decide
  — a flagged imperfect bible beats an infinite loop or a rubber-stamped lie.

Whether it passes or recommends a regenerate, write the verdict honestly. Recommending a regenerate
on real drift is the correct, honest outcome; passing a drifting sheet to keep the chain moving is
the failure this phase exists to prevent.

### 5. Write consistency-check.md

Write `artifacts/<project-name>/consistency-check.md` in this exact shape (≤ ~600 words):

```markdown
# Consistency Check: <Name>

## Per-trait verdict
| trait | spec token | verdict | evidence (what the pixels show across views) |
|---|---|---|---|
| face | <token> | consistent | <one line: same face front/¾/side/back> |
| hair | <token> | drift | <one line: silver braids front, loose dark hair in side view> |
| eyes | <token> | consistent | <...> |
| outfit/props | <token> | consistent | <...> |
| palette | <named palette> | consistent | <...> |
| silhouette | proportions/build | consistent | <...> |

## Overall identity-consistency score
<N>/10

## Verdict
<pass | regenerate>

## Regenerate instruction (only when verdict = regenerate)
- seed: <the spec seed — unchanged>
- tighten: <the single drifting token> → "<tightened, more-specific phrasing — not a synonym>"
- note: re-run bot-016-reference-sheet once with the same seed and this one tightened token.

## Method
Graded by viewing reference-sheet.png (keyless in-session vision); each token checked against the
pixels across all views, not from the filename or the spec text.
```

When the verdict is `pass`, write the Regenerate-instruction section header with `- (none — passed)`.

### 6. Package the bible — character-bible.md

Run the packager to assemble the manifest:

```bash
bash <skill-dir>/scripts/package-bible.sh artifacts/<project-name>
```

It reads the spec for the seed and the character name, lists every bible artifact that **actually
exists** on disk (spec, sheet, hero, generation log, consistency check) with its path, marks any
optional artifact that is missing (non-fatal — noted, not an error), and writes
`artifacts/<project-name>/character-bible.md` with the **fixed downstream-use paragraph** baked in.
On success it prints one machine-readable line to stdout:

```
character-bible<TAB>artifacts/<project-name>/character-bible.md<TAB>seed=<N><TAB>artifacts=<count>
```

Read the resulting `character-bible.md` once to confirm it indexes the spec, sheet, hero, and log
and states the downstream use. The manifest is the file the director bots open first; it must point
at every part of the bible.

### 7. Update state.md

Mark the `check-package` row `done`, refresh `updated`, set project `status`:

- Verdict `pass` → `status: complete`; `next_action: deliver the character bible — character-bible.md
  is ready for the downstream director bots (BOT-017/018).`
- Verdict `regenerate` (first time) → `status: in-progress`; set the `turnaround` (phase 2) row back
  to `next` with the tightened token recorded in the Decisions log; `next_action: re-run phase 2
  (bot-016-reference-sheet) once with the same seed and the tightened token from consistency-check.md,
  then re-run phase 3.`
- Verdict `regenerate` (after the one allowed re-run already happened) → `status: blocked`;
  `next_action: bible held one regenerate and still scored below 7/10 — review consistency-check.md;
  the flagged drift needs creator input before shipping.`

Never leave the ledger stale — it is how the phase chain (and the resume) works.

## Failure handling (headless)

| situation | action |
|---|---|
| `reference-sheet.png` missing | Cannot grade pixels. Mark the `check-package` row `blocked`, project `status: blocked`, blocker: "check-package blocked: reference-sheet.png missing — run phase 2 (bot-016-reference-sheet) first". Stop. No score. |
| `character-spec.md` missing | No trait checklist to grade against. Mark the row `blocked`, blocker: "check-package blocked: character-spec.md missing — run phase 1 (bot-016-character-design) first". Stop. |
| Read returns no viewable image | Do NOT guess a score. Mark the row `blocked`, blocker: "check-package blocked: could not view reference-sheet.png (vision read failed)". Stop. |
| Sheet scores below 7 after the one allowed regenerate | Write consistency-check.md with the best attempt + an honest `regenerate` verdict naming the residual drift; mark the row `blocked` per the state.md rule above. Never loop a third time. |
| `package-bible.sh` reports a missing optional artifact (hero.png / generation-log.md) | Non-fatal — the manifest notes it as missing and continues. Only the spec + sheet are load-bearing for the package. |

A clean recorded failure is a correct outcome. A guessed score or a silently-shipped drifting bible
is not.

## Outputs

This phase writes exactly two artifacts, at the paths declared in frontmatter — never invent others:

- `artifacts/<project-name>/consistency-check.md` — the scored checklist: a per-trait verdict
  (each spec token graded against the sheet pixels), an overall 0-10 identity-consistency score,
  and an explicit `pass` or `regenerate` recommendation (with the single tightened token + the same
  seed when it regenerates).
- `artifacts/<project-name>/character-bible.md` — the portable bible manifest: every bible artifact
  (spec, sheet, hero, generation log, consistency check) indexed with its path, the seed stated,
  and the fixed one-paragraph downstream-consumption handoff (front-frame: hero.png · identity
  reference: reference-sheet.png · tokens: CHARACTER_BLOCK).

Intermediates (if any) go under `work/<project-name>/`, never under `artifacts/`.

## Scripts

- `scripts/package-bible.sh <project-dir>` — assembles `character-bible.md`: reads the seed and
  character name from `character-spec.md`, lists each bible artifact that exists on disk with its
  path (notes any optional artifact that is missing — non-fatal), and writes the manifest with the
  fixed downstream-use paragraph. Prints one machine-readable success line; diagnostics to stderr;
  `set -euo pipefail`; python3 for parsing.

## References (load when needed)

- `references/consistency-rubric.md` — what to check per trait class (face, hair, eyes, outfit,
  palette, silhouette) across views, the cross-view drift patterns to look for, and how to phrase a
  single targeted regenerate instruction (same seed + one tightened token).
