---
derive_from:
  source_file: 1-requirements.md
  jtbds:
    - JTBD-1
    - JTBD-2
  derivation_method: outputs+acceptance+failure
  derived_at: 2026-05-22T00:00:00.000Z
skill: bot-010-deck-builder
target_score: 0.8
publish_threshold: 0.75
stuck_window: 5
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: deck-html-shape
      weight: 0.20
      source: structural
      jtbd_source: JTBD-1
      assertion: Verify that `artifacts/<project>/index.html` exists and is non-empty; that it contains no reference to an external CSS, JS, font, or image (no `<link rel="stylesheet">`, no `<script src=`, no `href`/`src` pointing at an http(s) URL or a sibling file); that exactly one element carries `data-slide="1"`; that the set of `data-slide` integer values is the contiguous sequence 1..N with no gaps and no duplicates; that every numeric argument passed to `goToSlide(` matches an existing `data-slide` value; and that the slide count is computed from the DOM (the source contains `querySelectorAll` feeding `totalSlides`) rather than a hardcoded integer literal.
    - id: deck-render-navigation
      weight: 0.18
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-1
      judge_prompt: "This dimension comes from JTBD-1 and its happy-path acceptance scenario (the deck must open and navigate in a browser). Open `artifacts/<project>/index.html` in a browser or render it. Score 10 if the deck loads with exactly one slide visible (the title slide), the right-arrow / space keys and the on-screen next/prev controls move through every slide in order to the last and back, the slide counter shows the correct position, and the progress indicator (percentage bar or journey bar, per the deck's progress style) updates as slides advance. Score 5 if the deck loads and most navigation works but one mechanism is broken — e.g. keyboard works but the on-screen buttons do not, or the counter is wrong, or the progress bar never moves. Score 0 if the deck does not render, shows no slide or all slides stacked at once, or navigation does not advance past the first slide."
    - id: styling-quality
      weight: 0.18
      source: llm-judge
      jtbd_source: skill-quality-criteria
      judge_prompt: "This dimension grades visual craft against the skill's styling reference. Inspect every slide. Score 10 if the deck applies one consistent theme (a single coherent palette via the `:root` variables), reuses the documented component classes (`.two-col`, `.col-card`, `.trigger-box`, `.code-block`, `.use-cases`, etc.) rather than ad-hoc inline styles, every content slide carries exactly one core idea with headings that structure it, and no slide overflows so badly that content is clipped or unreadable. Score 5 if the deck is presentable but inconsistent in one way — mixed ad-hoc styling alongside the classes, or two or three slides overcrowded with multiple ideas, or uneven heading use. Score 0 if slides are unstyled or each slide looks different, text is illegible (poor contrast, clipped), or content routinely spills off the slide."
    - id: narrative-fidelity
      weight: 0.16
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: "This dimension comes from JTBD-1: the built deck must realize the planned narrative. Compare `artifacts/<project>/index.html` against `artifacts/<project>/outline.md`. Score 10 if the deck has one slide per outline entry in the same order, the title slide and section dividers match the outline's sections, each slide delivers the core idea its outline line specified, and the outline's running example actually appears across multiple body slides. Score 5 if the deck broadly follows the outline but drifts in one way — a slide or section is missing or merged, the order differs in one place, or the running example is named once but not threaded. Score 0 if the deck bears little relation to the outline — wrong sections, wrong order, or invented content replacing the planned slides. If no outline exists (the deck was a direct build), judge instead whether the deck has a coherent hook-to-resolution arc."
    - id: revise-change-and-renumber
      weight: 0.16
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: "This dimension comes from JTBD-2 (revise an existing deck) and its acceptance scenario. Inspect the revised `index.html` and the session transcript against the change-request. Score 10 if the requested change is fully and exactly applied (added slides are present, removed slides are absent, reordered slides are in the new order, or the restyle is in effect), slides the user did not ask to change are preserved unchanged, the `data-slide` values are the contiguous sequence 1..N with no gaps or duplicates after the edit, and every `goToSlide(n)` call still targets an existing slide (any call whose target was deleted is repointed to a surviving slide). Score 5 if the change was applied but the renumbering protocol left a flaw — a numbering gap, a duplicate, or one dangling `goToSlide` target — or unrelated slides were modified. Score 0 if the requested change was not applied, the deck was destructively rewritten, or navigation is broken after the edit. If the run was a create (no revise requested), score this dimension 10 as not-applicable."
    - id: summary-quality
      weight: 0.07
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: "This dimension grades `artifacts/<project>/summary.md`. Score 10 if the file states the mode (create or revise), the slide count, the progress style, a one-line theme description, what was built or each change applied, and at least one actionable suggested next edit that names a specific slide or element and a concrete change. Score 5 if the file exists and covers the build but omits one element (e.g. no progress style stated, or the suggested edit is too vague to act on). Score 0 if `summary.md` does not exist or does not describe the deck."
    - id: missing-input-fallback
      weight: 0.05
      source: llm-judge
      jtbd_source: failure-mode:JTBD-2
      judge_prompt: "This dimension comes from the JTBD-2 failure modes for missing required input. Inspect the output when a revise request lacks a target `deck` path or a `change-request`, or a create request reaches the builder with no outline. Score 10 if the skill writes a clean `artifacts/<project>/error.md` that names exactly what is missing and what the user must supply, produces no half-built deck, and — in revise mode — leaves any existing `index.html` byte-for-byte unmodified. Score 5 if it reports the problem but also leaves a partial deck behind, or the error message is vague about what is needed. Score 0 if it silently invents the missing input and proceeds, overwrites or corrupts an existing deck, or produces no output and no explanation."
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/setup.md
    - bot/skills/bot-010-deck-builder/iteration-charter.md
---

## Notes for the proposer

- This charter grades the **deck-builder** skill — the HTML build half of JTBD-1 and
  all of JTBD-2. The narrative planning is graded by the sibling
  `bot-010-narrative-design` charter; do not add outline-quality dimensions here.
- The three heaviest dimensions — `deck-render-navigation` (0.18), `styling-quality`
  (0.18), and `deck-html-shape` (0.20) — together carry over half the composite. A
  deck that does not render, navigate, and look finished has failed regardless of its
  content.
- `revise-change-and-renumber` (0.16) is weighted as a peer of the create dimensions
  because the renumbering protocol is the bot's headless safeguard: a revise that
  silently breaks navigation is the worst failure this skill can produce.
- The structural `deck-html-shape` check is a hard gate but, being mechanical, will
  not by itself distinguish a good deck from a mediocre one — the llm-judge
  dimensions do that.

## Mapping: JTBDs → rubric dimensions

| Dimension | JTBD source | Notes |
|---|---|---|
| `deck-html-shape` | JTBD-1 | structural — self-contained, sequential `data-slide`, valid `goToSlide`, DOM-computed count |
| `deck-render-navigation` | acceptance-scenario:JTBD-1 | 0–10: opens, navigates start-to-finish, indicators update |
| `styling-quality` | skill-quality-criteria | 0–10: consistent theme, component classes, one idea per slide |
| `narrative-fidelity` | JTBD-1 | 0–10: built deck realizes the outline / has a coherent arc |
| `revise-change-and-renumber` | JTBD-2 | 0–10: change applied exactly, renumbering protocol clean |
| `summary-quality` | JTBD-1 | 0–10: summary names mode, count, progress, theme, next edit |
| `missing-input-fallback` | failure-mode:JTBD-2 | 0–10: clean error, existing deck untouched |

JTBD-1's build phase and JTBD-2 are fully covered. JTBD-1's planning phase is out of
scope for this skill (see the `bot-010-narrative-design` charter).
