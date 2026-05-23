---
derive_from:
  source_file: 1-requirements.md
  jtbds:
    - JTBD-1
  derivation_method: outputs+acceptance+failure
  derived_at: 2026-05-22T00:00:00.000Z
skill: bot-010-narrative-design
target_score: 0.8
publish_threshold: 0.75
stuck_window: 5
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: outline-shape
      weight: 0.15
      source: structural
      jtbd_source: JTBD-1
      assertion: Verify that `artifacts/<project>/outline.md` exists and is non-empty; that it contains a metadata block naming all six of topic, audience, deck type, running example, progress style, and slide count; that every slide line is numbered and the numbers run sequentially from 1 with no gaps or duplicates; and that the highest slide number equals the stated slide count.
    - id: narrative-arc-quality
      weight: 0.40
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: "This dimension comes from JTBD-1 (create a presentation deck) and grades the narrative arc planned in `artifacts/<project>/outline.md`. Score 10 if the outline opens with a hook/context slide that establishes why the audience should care, has 2 to 5 named body sections where each section depends only on sections before it (no slide references a concept introduced in a later section), ends with a resolution or call-to-action slide, and every content slide carries exactly one core idea. Score 5 if the arc is recognizable but flawed in one way — e.g. it has a weak or missing hook, or one section forward-references a later concept, or two or three slides bundle multiple ideas. Score 0 if the outline is an unordered list of topics with no opening hook, no building structure, and no closing, or if sections are sequenced so the deck cannot be followed."
    - id: progress-system-fit
      weight: 0.20
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: "This dimension comes from JTBD-1 and the acceptance scenario for journey-bar decks. It grades whether the progress indicator decision recorded in `outline.md` fits the deck. Score 10 if the chosen progress style matches the deck type by the skill's decision table (journey-levels for a tutorial/course, percentage for most decks, none for a very short or formal deck) OR exactly honors a progress-style the user explicitly requested; and, when the style is journey-levels, the outline names 3 to 4 ordered levels and attaches each to a specific body-section divider with the opening and appendix carrying no level. Score 5 if the style is plausible but the journey-level plan is incomplete — levels named but not attached to sections, or only 2 levels, or the opening slide wrongly carries a level. Score 0 if the chosen style contradicts the deck type with no user instruction to justify it (e.g. journey-levels on a 5-slide formal pitch), or journey-levels is selected with no level plan at all."
    - id: running-example-quality
      weight: 0.15
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: "This dimension comes from JTBD-1 and the narrative-design framework. It grades the running example named in `outline.md`. Score 10 if the outline names one concrete, specific running example (a named sample customer, a real scenario, a worked problem, or the topic itself when the topic is already concrete) AND at least two body-section slides explicitly reference it, so the example threads through the deck. Score 5 if a running example is named but only one slide references it, or the example is generic (e.g. 'a user', 'a company') rather than a specific named case. Score 0 if no running example is named anywhere in the outline."
    - id: missing-topic-fallback
      weight: 0.10
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: "This dimension comes from the JTBD-1 failure mode where no topic is supplied. Inspect the skill's output when the request contains no topic for the deck. Score 10 if the skill produces a user-facing message that explicitly states a topic is required to plan a deck, asks the user to supply one, and writes no `outline.md` and invents no topic. Score 5 if it asks for a topic but also emits a partial or placeholder outline, or gives a vague error that does not clearly request a topic. Score 0 if it silently invents a topic and writes a full outline, or produces no output and no explanation."
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/setup.md
    - bot/skills/bot-010-narrative-design/iteration-charter.md
---

## Notes for the proposer

- This charter grades the **narrative-design** skill — the planning half of JTBD-1.
  The HTML build and JTBD-2 (revise) are graded by the sibling `bot-010-deck-builder`
  charter. Do not add HTML/CSS dimensions here.
- `narrative-arc-quality` (0.40) carries the most weight: a deck lives or dies on its
  story. The whole skill exists to make the arc good before any markup is written.
- `progress-system-fit` (0.20) is weighted next because choosing the wrong progress
  style (or planning journey levels incompletely) misleads the audience and forces
  rework in the deck-builder.
- The structural `outline-shape` check (0.15) is a necessary gate but capped low — a
  well-formed outline that tells a bad story is still a failure.

## Mapping: JTBDs → rubric dimensions

| Dimension | JTBD source | Notes |
|---|---|---|
| `outline-shape` | JTBD-1 | structural — `outline.md` exists, metadata complete, slides sequential |
| `narrative-arc-quality` | JTBD-1 | 0–10: hook → 2–5 building sections → resolution; one idea per slide |
| `progress-system-fit` | JTBD-1 + acceptance-scenario:JTBD-1 | 0–10: progress style fits deck type; journey levels planned |
| `running-example-quality` | JTBD-1 | 0–10: a concrete running example chosen and threaded |
| `missing-topic-fallback` | failure-mode:JTBD-1 | 0–10: clean error on missing topic, no invented topic |

JTBD-1's planning phase is fully covered. JTBD-1's build phase and JTBD-2 are out of
scope for this skill (see the `bot-010-deck-builder` charter).
