# Consistency Rubric — grading a turnaround sheet against the locked spec

Craft knowledge for the vision grade in phase 3. The blocks below are baked **inline** from
recipe family A (KB [Cinematic Video Recipes §A](https://kb) — the runtime has no KB access).
The job: look at `reference-sheet.png` and decide, per trait, whether the SAME character is held
across every view, then phrase one targeted regenerate if it is not.

## First principle — consistency lives in references + verbatim tokens, not longer prompts

Recipe A's core finding: identity comes from **reference images + tokens reused byte-identical**,
and *over-describing hurts* consistency. So drift, when it happens, is almost always one of two
things — a token that got **paraphrased** somewhere ("emerald eyes" → "green eyes"), or a view the
model **re-rolled** instead of holding. You are grading for exactly that: does each locked token
survive, unchanged, across front / three-quarter / side / back? The fix is never "describe more";
it is "tighten the one token that slipped and re-run at the same seed".

## How to grade — the answer key vs the exam

- The **answer key** is `character-spec.md`: the Identity Tokens (face → hair → eyes → outfit/props
  order), the Palette, and the frozen CHARACTER_BLOCK. These are the locked truth.
- The **exam** is the pixels of `reference-sheet.png`. `Read` it as an image and look — do not
  infer the grade from the spec text, the filename, or the generation log.
- Walk the sheet view by view (front, three-quarter, side, back) and trait by trait. Drift hides in
  the view the eye does NOT land on first (usually the side or back), so check every view, not just
  the hero-facing front.

## Per-trait checklist (walk in this order — face is the strongest identity signal)

| trait class | what to verify across ALL views | classic drift to flag |
|---|---|---|
| **face** | same face geometry, skin tone, distinctive marks (scar, freckles); reads as one person front/¾/side/back | skin tone shifts between views; a scar present in front but gone in profile; the face subtly "ages" or changes ethnicity in one angle |
| **hair** | same color, length, style (braids/crop/updo), parting and hairline | braids in front become loose hair in the side view; color drifts lighter/darker; length changes; a fringe appears or vanishes |
| **eyes** | same color and shape; any "glow"/heterochroma the token locks | eye color reverts to a default (violet → brown); glow present in front, absent in back |
| **outfit / props** | same garment design, color, materials; signature props present in every relevant view | a signature prop (sword, pendant, pauldron) appears in some views and not others; armor color shifts; a cloak design changes pattern |
| **palette** | the named palette holds across the whole sheet; no view drifts to a foreign hue family | one view tints warm/cold against the rest; an accent color (crimson) drops out of a view |
| **silhouette / proportions** | same build, height ratio, head-to-body proportion across views | body type changes (slim → bulky); head proportion differs; the back view is a noticeably different build |

Mark each token `consistent` (present and the same everywhere), `drift` (present but changed in
some view, or doesn't match the spec token), or `absent` (not visible anywhere on the sheet).
A trait class that the spec does not lock (e.g. no signature prop) is not graded — only grade what
the spec locks.

## Scoring the overall identity (0-10)

Roll the per-trait verdicts into one score. Face / hair / eyes / signature props are
**identity-defining** — a `drift` or `absent` on any of those caps the score in the regenerate band.
Palette and incidental folds are secondary.

| score | meaning | verdict |
|---|---|---|
| 9-10 | every trait consistent across every view; a stranger says "same character, every angle" | pass |
| 7-8 | identity clearly holds; at most one minor, non-identity-defining wobble (a cloak fold, a lighting tint) | pass |
| 4-6 | one identity-defining trait drifts or is absent in a view (hair changes, an eye color shifts, a signature prop appears/vanishes) | regenerate |
| 0-3 | multiple traits drift, the views look like different characters, or the sheet is unusable as a reference | regenerate |

**Pass bar: ≥ 7/10.** Be honest in the 6-7 boundary: if an identity-defining trait drifts in even
one view, it is a 6 (regenerate), not a 7 — the downstream bots will inherit that drift on every
shot. Recommending a regenerate on real drift is the correct outcome; passing a drifting sheet to
keep the chain moving is exactly the failure this phase prevents. Equally, do not invent drift to
look thorough — a clean sheet scores 9-10 and passes.

## Phrasing a targeted regenerate (one variable, same seed)

When the verdict is `regenerate`, write ONE instruction that changes exactly one thing:

1. **Keep the seed.** Reuse the spec's seed unchanged. Drift is fixed by tightening language, not by
   re-rolling — a new seed throws away everything that was already right.
2. **Name the single drifting token** and give a **tightened** phrasing — more specific and explicit,
   pinning the trait across views. Tightening is NOT a synonym: you are sharpening the *same* locked
   token, never renaming it (the no-synonym rule still holds). Examples:
   - hair drift → tighten `hair` to `waist-length silver-white braided hair, the identical braid
     pattern repeated in every view`.
   - a prop vanishing in the side view → tighten `outfit/props` to `obsidian-and-crimson lamellar
     armor with the crimson shoulder pauldron visible in every view`.
   - eye color reverting → tighten `eyes` to `glowing violet eyes, the same violet in every view,
     not brown`.
3. **One token only.** Tighten the single worst-drifting trait, not three at once — changing one
   variable is how recipe A keeps the re-roll controlled and the result attributable. If two traits
   drift, pick the most identity-defining one; a second pass can catch the other, but this phase
   only ever asks for **one** regenerate.
4. **Once.** The regenerate happens a single time (phase 2 re-runs with the same seed + the tightened
   token, then phase 3 re-grades). If it still scores below 7, do not loop — record the residual
   drift honestly and let the creator decide.

## Reminders

- The grade is on the pixels. A sheet named `reference-sheet.png` can still have the wrong hair in
  the side view — Read the image, never grade from the filename or the spec text.
- Only grade what the spec locks; a trait the spec does not name is not a drift.
- Be specific in the evidence column — "silver braids in front, loose dark hair in the side view"
  tells phase 2 exactly what to tighten; "hair looks off" does not.
