---
name: bot-010-deck-builder
description: Builds and revises a self-contained single-file HTML slide deck. On a create request, turns a narrative outline into an index.html with inline CSS and JS, keyboard navigation, and an optional progress or journey bar. On a revise request, adds, removes, reorders, or restyles slides in an existing deck and runs the renumbering protocol. Use whenever a presentation, slide deck, or slides must be written to HTML or edited — after bot-010-narrative-design on a new deck, or directly when revising an existing one.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-010
  inputs:
    - name: outline
      type: markdown
      required: false
      description: Slide-by-slide outline from bot-010-narrative-design; required to create a new deck
    - name: deck
      type: html
      required: false
      description: Path to an existing single-file index.html; required to revise a deck
    - name: change-request
      type: text
      required: false
      description: What to change in an existing deck; required on a revise request
    - name: style-notes
      type: text
      required: false
      description: Theme or look-and-feel hints; defaults to the starter dark theme (create) or the deck's existing theme (revise)
    - name: progress-style
      type: text
      required: false
      description: Progress indicator none|percentage|journey-levels; defaults to percentage
  outputs:
    - name: deck
      type: html
      path: artifacts/<project>/index.html
      description: The self-contained single-file HTML slide deck
    - name: summary
      type: markdown
      path: artifacts/<project>/summary.md
      description: What was built or changed, plus design choices and suggested next edits
---

# Deck Builder

## Purpose

Write the actual presentation. This skill is the bot's primary skill: it turns a
narrative outline into a finished single-file HTML deck (`index.html`), and it revises
an existing deck without breaking its navigation.

Two modes, picked from the request:

- **Create** — an `outline` exists (from `bot-010-narrative-design`) and no prior
  deck. Build a new `index.html`.
- **Revise** — a `deck` (existing `index.html`) and a `change-request` exist. Edit it.

If asked to create a deck and no outline exists yet, run `bot-010-narrative-design`
first — see `.claude/skills/INDEX.md`.

## Reference files

Read these before building — do not work from memory:

- `references/structure.md` — slide format, `data-slide`/`data-level`, navigation,
  the **renumbering protocol**, and the verification checklist.
- `references/styling.md` — the theme variables and the CSS component-class vocabulary.
- `templates/index.html` — a working topic-agnostic starter deck. Always start a new
  deck by copying this file, never from a blank file.

## Workflow — Create mode

Copy this checklist into your response and check off each step:

```
Deck Builder (create) Progress:
- [ ] Step 1: Read the outline, set the project name, apply defaults
- [ ] Step 2: Copy templates/index.html to artifacts/<project>/index.html
- [ ] Step 3: Set the theme and progress style
- [ ] Step 4: Write one slide per outline entry
- [ ] Step 5: Run the renumbering protocol and the verification checklist
- [ ] Step 6: Write artifacts/<project>/summary.md
```

### Step 1 — Read the outline and set defaults

Read `artifacts/<project>/outline.md`. It names the topic, audience, deck type,
running example, progress style, and the numbered slide list. Reuse its project name.

| Input | Required | Default if missing |
|---|---|---|
| `outline` | yes (create) | **Stop** — run `bot-010-narrative-design` first |
| `style-notes` | no | The starter dark theme |
| `progress-style` | no | Take it from the outline; else `percentage` |

### Step 2 — Copy the starter

Copy `templates/index.html` to `artifacts/<project>/index.html`. You now have a working
deck to edit — never assemble HTML from scratch.

### Step 3 — Theme and progress style

- Set `<html data-progress="...">` to `none`, `percentage`, or `journey-levels` to
  match the outline.
- Edit the `:root` theme variables (see `references/styling.md`) to honor
  `style-notes`. If a style needs an external resource (a hosted font/image), fall
  back to a self-contained equivalent and record the substitution for `summary.md`.
- For `journey-levels`: fill the `JOURNEY_LEVELS` array in the `<script>` with the
  outline's ordered level names.

### Step 4 — Write the slides

Replace the starter's example slides with one `<section class="slide">` per outline
entry, in order:

- The first slide is the title slide (`title-slide`, `active`); number it `data-slide="1"`.
- Each new section gets a `section-slide` divider. With `journey-levels`, set its
  `data-level` to the level the outline assigned that section.
- Build content slides from the component patterns in `references/styling.md` — one
  core idea per slide, headings carry the structure, reuse the component classes.
- Thread the outline's running example through the body slides.
- Number every slide sequentially with `data-slide` as you go.
- Use clearly-labelled placeholders (e.g. "[metric TBD]") for any data the user did
  not supply. Never invent facts or figures.

### Step 5 — Renumber and verify

Run the **renumbering protocol** and the **verification checklist** from
`references/structure.md`. Both must pass before the deck is done:

- `data-slide` values are the contiguous sequence 1..N — no gaps, no duplicates.
- Every `goToSlide(n)` call targets an existing slide.
- The file is self-contained — no external CSS/JS/font/image references.
- `totalSlides` is computed from the DOM, not hardcoded.

If a check fails, fix it and re-run the checklist.

### Step 6 — Summary

Write `artifacts/<project>/summary.md` (≤ 600 words) — see the format below.

## Workflow — Revise mode

Copy this checklist into your response and check off each step:

```
Deck Builder (revise) Progress:
- [ ] Step 1: Load the deck, confirm it is a single-file deck, map its slides
- [ ] Step 2: Apply the requested add / remove / reorder / restyle change
- [ ] Step 3: Run the renumbering protocol
- [ ] Step 4: Run the verification checklist
- [ ] Step 5: Write artifacts/<project>/summary.md
```

### Step 1 — Load and map

Read the target `index.html`. Confirm it is a recognizable single-file deck (slide
`<section>`s with `data-slide`, the navigation script). If it is not, **stop** and
write a clean `error.md` describing the mismatch — do not attempt a destructive
rewrite. List the current slides and sections so you know what you are changing.

`change-request` is required. If it is missing, write `error.md` asking what to change
and leave the deck unmodified.

### Step 2 — Apply the change

Make exactly the requested edit — add, remove, reorder, or restyle slides — and
nothing else. Preserve every slide and style the user did not ask you to touch. For a
restyle, edit the `:root` theme variables. For a new whole section, you may consult
`bot-010-narrative-design` for where it fits the arc.

### Step 3 — Renumber

Run the **renumbering protocol** (`references/structure.md`): resequence `data-slide`
from 1, repoint every `goToSlide(n)` call, re-check `data-level` boundaries. If a
removed slide was a `goToSlide` target, repoint the call to the nearest surviving
slide.

### Step 4 — Verify

Run the verification checklist from `references/structure.md`. All items must pass.

### Step 5 — Summary

Write `artifacts/<project>/summary.md` listing each change applied and confirming the
renumbering protocol ran.

## Summary format

```markdown
# <Deck Title> — Build Summary

**Mode:** create | revise
**Slides:** <N>   **Progress style:** <none | percentage | journey-levels>
**Theme:** <one line — dark/light, accent color, any style-notes applied>

## What was built / changed
- <create: the narrative arc and sections>  OR  <revise: each change applied>

## Notes
<defaults applied, style substitutions, placeholders left for missing data>

## Suggested next edits
- <one or more optional refinements the user could ask for>
```

## Inputs

- **Create**: `outline` (path to `outline.md`), optional `style-notes`,
  `progress-style`.
- **Revise**: `deck` (path to `index.html`), `change-request` (text), optional
  `style-notes`.

## Outputs

All deliverables in `artifacts/<project>/`:

- `artifacts/<project>/index.html` — the self-contained single-file deck.
- `artifacts/<project>/summary.md` — what was built/changed and suggested next edits.
- On a clean failure, `artifacts/<project>/error.md` instead — and, in revise mode,
  the existing `index.html` is left unmodified.

## Examples

### Example 1: Build from an outline

User says: "Build the deck" (after narrative-design wrote `outline.md`).
Actions:
1. Read `artifacts/series-a-logistics/outline.md` — 12 slides, percentage progress.
2. Copy `templates/index.html`; set the theme; write 12 slides from the outline.
3. Run the renumbering protocol and verification checklist — all pass.
4. Write `summary.md`.
Result: `artifacts/series-a-logistics/index.html` opens and navigates in a browser.

### Example 2: Insert slides into an existing deck

User says: "Add two slides on pricing after the features section."
Actions:
1. Load `index.html` (10 slides); confirm it is a single-file deck.
2. Insert two new content slides after the features section divider.
3. Run the renumbering protocol — `data-slide` now 1..12, `goToSlide()` calls repointed.
4. Verify; write `summary.md`.
Result: a 12-slide deck with consistent numbering and navigation.

## Quality Criteria

- [ ] `artifacts/<project>/index.html` exists and is self-contained — no external
      CSS/JS/font/image references.
- [ ] `data-slide` values are the contiguous sequence 1..N — no gaps or duplicates.
- [ ] Every `goToSlide(n)` call targets an existing slide; `totalSlides` is computed
      from the DOM.
- [ ] The deck reflects the outline (create) or the change-request (revise).
- [ ] Slides reuse the component classes and one core idea per content slide.
- [ ] No fabricated facts or figures — missing data shown as labelled placeholders.
- [ ] `summary.md` names the mode, slide count, progress style, theme, and ≥1
      suggested next edit.

## Troubleshooting

### Target deck not found (revise mode)
Cause: the `deck` path does not exist.
Solution: write `error.md` naming the expected path. Do not silently create a new deck.

### Target file is not a single-file deck (revise mode)
Cause: the file has no `data-slide` sections or no navigation script.
Solution: write `error.md` describing the mismatch. Do not attempt a destructive rewrite.

### Numbering gap or dangling goToSlide after an edit
Cause: a structural edit desynchronized `data-slide` and `goToSlide()`.
Solution: run the renumbering protocol in `references/structure.md`, then re-verify.

### A style-note needs an external font or image
Cause: self-contained decks cannot link external resources.
Solution: fall back to a system font / a CSS-only equivalent; note it in `summary.md`.

## Attribution

`references/structure.md` and `references/styling.md` are generalized from the
`presentation-structure` and `presentation-styling` skills in
`shanraisshan/claude-code-best-practice`.
