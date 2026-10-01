---
name: app-brand-identity
description: Designs a consumer wellness app's brand identity as direction a team and a designer can use, as the identity phase (S3) of Alina Wheeler's brand identity process — personality, 3–5 voice attributes written "X, not Y" with on- and off-voice examples, tone by context, one umbrella message with three supporting messages, look and feel, a hex palette with computed contrast, a type pairing, imagery and icon rules, 3–5 distinctive assets, trial applications, and optional mood boards generated with ai-gen. Direction only, never a finished logo. Run by the app brand router whenever it names S3.
---

# Designing the brand identity (S3)

Turn the brief into how the brand sounds and looks. The router tells you the project folder, the
step, the mood-board setting, and whether this is a change. Work inside `artifacts/<project>/`.

## Read first

- `02-brand-brief.md` (S2) and `01-research.md` (S1: clichés, review words, competitors' look).
- Current brand material in `inputs/` (logo, colours, screenshots): keep what has equity unless
  the brief says otherwise, and say which.
- [references/voice-method.md](references/voice-method.md),
  [references/visual-direction.md](references/visual-direction.md) and, when mood boards are on,
  [references/mood-board-prompts.md](references/mood-board-prompts.md).
- If the router says this is a change or redo: the earlier `03-identity.md`. Change what the
  request requires, keep the rest, and add `## What changed` at the top naming every section you
  changed.

## Steps

1. **Personality:** 3–5 traits from the brief's extended identity, as a short paragraph.
2. **Voice:** 3–5 attributes, each a `### <attribute>, not <its overdone opposite>` with one
   sentence on what it means, one on-voice example and one off-voice example, written for this
   app's touchpoints.
3. **Tone by context:** one voice; a table of how tone shifts by moment (first open, a reminder,
   an error, a milestone, a store listing, a social post).
4. **Messages:** one umbrella message and three supporting messages, each tied to a core value
   from the brief.
5. **Look and feel:** the mood in words, built from the brief and set against S1's clichés.
6. **Palette:** 4–6 colours in hex with names and roles. Run
   `node <this skill's folder>/scripts/contrast.mjs '<text>' '<background>' …` for every text and
   background pair you propose and copy its lines into the section. Fix any body-text pair that
   fails AA.
7. **Type:** a display and a body family, named, each with a free fallback, and why.
8. **Imagery and icons:** rules for photos or illustration, and for icons, each with a do and a
   don't.
9. **Distinctive assets:** 3–5 things that should become recognisably this brand (a colour, a
   shape, a phrase, an illustration style), chosen because no S1 competitor uses them.
10. **Trial applications:** at least 2 described in words (the app icon direction and the first
    store screenshot, for example), as a designer's brief, not a finished design.
11. **Mood boards** (when the setting is on): one per direction, by
    [references/mood-board-prompts.md](references/mood-board-prompts.md), saved in `images/`.
    Recommend one direction; give at most two alternatives. If generation fails or is declined,
    keep the direction in words and say so under Open decisions, without technical detail.
12. Then hand back to the router (see the end of this skill).

Never design a final logo, and never put the app name or any text inside a generated image.

## `03-identity.md`

```text
# S3 Design identity: <app>
## What changed          (only on a change, redo or refresh)
## Personality
## Voice                 (one "### <attribute>, not <opposite>" each, 3–5, with on and off examples)
## Tone by context
## Messages              (umbrella, then three)
## Look and feel         (the recommended direction; alternatives in brief)
## Palette               (name · hex · role, then the contrast lines)
## Type
## Imagery and icons
## Distinctive assets    (3–5 bullets)
## Trial applications
## Mood boards           (only when on: each image's path and the direction it shows)
## Open decisions        ("- none" if none)
```

Use these `##` headings exactly as written; the router's check looks for them.

**Open decisions:** at most 4, the most important first. Never repeat one an earlier step
already lists (read its `## Open decisions` first); if it still matters, say "(still open from S<n>)"
in the text that depends on it instead. A bullet is a question or an action for the person:
never "none beyond …", and `[blocking]` only for a new question that stops the work.

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the app brand router and carry on with step 4 of the router's run loop (the check).
Don't end the job here: don't write the final reply, `STATUS.md` or `outcome.json`.
