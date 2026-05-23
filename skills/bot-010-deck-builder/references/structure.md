# Deck Structure Reference

The mechanics of a single-file HTML deck. Vendored and generalized from the upstream
`presentation-structure` skill (`shanraisshan/claude-code-best-practice`).

## File shape

The deck is **one** `index.html` with everything inline: a `<style>` block, the slide
`<section>`s, and a `<script>` block. No external CSS, JS, fonts, or images. No build
step. It must open by double-click in any modern browser.

The `templates/index.html` in this skill is a working starter — copy it and edit, do
not write a deck from a blank file.

## Slide format

Each slide is a `<section class="slide" data-slide="N">`:

- `data-slide` is a **sequential integer starting at 1**. It is the slide's stable
  identity — `goToSlide(n)` and the renumbering protocol both key off it.
- Exactly one slide carries `class="slide active"` at load time (slide 1).
- A **section divider** adds `class="section-slide"`. It announces a new section.
- The **title slide** (slide 1) adds `class="title-slide"`.

## Journey levels (progress-style: journey-levels only)

When the deck uses a multi-level journey bar:

- Each **section divider** that starts a new level sets `data-level="<name>"` (lower-
  case, matching an entry in the `JOURNEY_LEVELS` array in the script).
- Slides **inherit** the level of the most recent divider with a `data-level` set,
  until the next divider changes it.
- The opening (title, hook) and the appendix carry **no** level — leave `data-level`
  empty or absent. The journey bar is hidden on the title slide.
- The ordered level names live in the `JOURNEY_LEVELS` array in the `<script>`. The
  bar segments are JS-built from that array — do not hand-write the bar's HTML.

## Navigation

- `totalSlides` is computed from the DOM (`document.querySelectorAll('.slide').length`).
  **Never hardcode the slide count** — adding or removing a slide must not require a JS
  edit.
- `goToSlide(n)` jumps to the slide whose `data-slide` equals `n` (1-based). Any
  in-deck link or table-of-contents button calls `goToSlide(n)` with a real
  `data-slide` number.
- Keyboard: → / Space / PageDown advance; ← / PageUp go back; Home / End jump to the
  first / last slide. The starter template wires all of these.

## Renumbering protocol (run after every structural edit)

Adding, removing, or reordering slides desynchronizes `data-slide` numbers and
`goToSlide()` targets. After **any** structural edit:

1. **Resequence** — walk the slides top to bottom and set `data-slide` to 1, 2, 3, …
   with no gaps and no duplicates.
2. **Repoint `goToSlide()` calls** — for every `goToSlide(n)` in the HTML, confirm `n`
   still names the intended slide; update it if numbering shifted. If a call's target
   slide was deleted, repoint it to the nearest surviving slide.
3. **Fix journey levels** — if a section divider moved or was removed, re-check that
   `data-level` attributes still place each level boundary correctly.
4. **Verify** — no two slides share a `data-slide`; the numbers are 1..N contiguous;
   every `goToSlide(n)` target exists. `totalSlides` needs no manual change.

## Verification checklist (run before declaring the deck done)

- [ ] The file is a single self-contained `index.html` — no `src=`/`href=` pointing at
      an external CSS, JS, font, or image; no `import`/build directive.
- [ ] Exactly one slide has `data-slide="1"`.
- [ ] `data-slide` values are the contiguous sequence 1..N with no gaps or duplicates.
- [ ] Every `goToSlide(n)` call targets an existing `data-slide`.
- [ ] `totalSlides` is computed from the DOM, not a literal number.
- [ ] Exactly one slide has the `active` class at load (slide 1).
- [ ] With `journey-levels`: `JOURNEY_LEVELS` is non-empty and every `data-level`
      value on a divider matches an entry in it.
- [ ] The file is non-empty and well-formed HTML.
