---
name: bot-010-narrative-design
description: Plans the narrative arc and slide outline for a presentation before any HTML is written. Choose a deck type from the audience, pick an arc, break it into sections and per-slide beats, select a running example, and decide the progress/journey indicator. Use at the start of any request to create, make, or build a presentation, slide deck, slides, or talk — and again when a revise request adds a whole new section.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-010
  inputs:
    - name: topic
      type: text
      required: true
      description: What the presentation is about — a topic or brief
    - name: audience
      type: text
      required: false
      description: Who the deck is for; inferred from topic if absent, else treated as general
    - name: source-material
      type: text
      required: false
      description: Optional notes, an outline, or a document the deck should be built from
    - name: slide-count
      type: text
      required: false
      description: Target number of slides; the skill picks 8-16 from scope if absent
    - name: progress-style
      type: text
      required: false
      description: Progress indicator none|percentage|journey-levels; defaults to percentage
  outputs:
    - name: outline
      type: markdown
      path: artifacts/<project>/outline.md
      description: Ordered, sectioned slide list with per-slide purpose and an optional level plan
---

# Narrative Design

## Purpose

Plan the **story** of a presentation before the `bot-010-deck-builder` skill writes any
HTML. A deck is a narrative, not a pile of slides: this skill chooses a deck type from
the audience, picks a narrative arc, breaks it into sections and per-slide beats,
selects a running example, decides the progress indicator, and writes a slide-by-slide
`outline.md` that the deck-builder consumes directly.

Run this skill **first** on any create-a-deck request. On a revise request, run it only
when the change adds a whole new section; small edits go straight to `bot-010-deck-builder`.

## Workflow

Copy this checklist into your response and check off each step:

```
Narrative Design Progress:
- [ ] Step 1: Read the brief, set the project name, apply defaults
- [ ] Step 2: Classify the deck type from the audience
- [ ] Step 3: Pick the narrative arc and sections
- [ ] Step 4: Choose a running example
- [ ] Step 5: Decide the progress indicator
- [ ] Step 6: Write the slide-by-slide outline to artifacts/<project>/outline.md
```

### Step 1 — Read the brief and set defaults

Extract from the prompt, `bot/user.md`, and any `source-material`:

| Input | Required | Default if missing |
|---|---|---|
| `topic` | yes | **Stop** — clean error: ask for a topic. Do not invent one. |
| `audience` | no | Infer from the topic; else treat as a general audience |
| `source-material` | no | Work from `topic` alone |
| `slide-count` | no | Pick 8-16 from the scope of the topic |
| `progress-style` | no | `percentage` |

Set a kebab-case **project name** from the topic (e.g. `series-a-pitch`). The outline
goes in `artifacts/<project>/`.

If the topic needs facts or figures the user did not supply, plan clearly-labelled
placeholders into the relevant slides — never plan invented data.

### Step 2 — Classify the deck type

Map the audience and intent to a deck type. Read `references/arc-patterns.md` for the
full templates; the common types:

| Audience / intent | Deck type |
|---|---|
| Investors, buyers — persuade and ask | Pitch |
| Learners, new hires — teach a skill step by step | Tutorial / course |
| Team, leadership — report status and next steps | Internal update |
| Mixed / general — explain an idea or product | Overview / explainer |

When the audience is ambiguous, default to **Overview / explainer**.

### Step 3 — Pick the narrative arc and sections

From the deck type, lay out the arc as 2–5 named body sections, bracketed by an opening
and a closing. Every arc obeys these rules:

- **Open with a hook/context slide** — why the audience should care; the problem,
  stakes, or opportunity. This is not a body section and carries no progress weight.
- **Body sections build** — each section depends only on sections before it. Never
  reference a concept before the section that introduces it.
- **Close with a resolution** — the payoff, recommendation, or call to action.
- **Appendix is optional** — reference material only; no progress weight.

`references/arc-patterns.md` gives a ready arc per deck type. Adapt it to the topic;
do not invent a structure from scratch when a pattern fits.

### Step 4 — Choose a running example

Pick one concrete case the deck returns to across sections — a sample customer, a
real scenario, a worked problem. It makes abstract points tangible and gives the
audience continuity. Name it in the outline so the deck-builder threads it through.
If the topic is itself concrete (a specific product, a specific event), the topic is
the running example — say so.

### Step 5 — Decide the progress indicator

Honor `progress-style` if the user set it. Otherwise decide:

| Situation | Indicator | `progress-style` |
|---|---|---|
| Tutorial / course — audience accumulates skill | Named multi-level journey bar | `journey-levels` |
| Most decks — pitch, update, overview | Simple percentage progress bar | `percentage` (default) |
| Very short deck (≤6 slides) or a formal pitch | None | `none` |

For `journey-levels`, also plan the levels: name 3–4 levels in order (e.g.
Beginner → Intermediate → Advanced → Expert) and mark which section divider starts
each level. The opening and appendix carry no level.

### Step 6 — Write the outline

Write `artifacts/<project>/outline.md` using this structure:

```markdown
# <Deck Title> — Outline

- **Topic:** <topic>
- **Audience:** <audience or "general (inferred)">
- **Deck type:** <pitch | tutorial | internal update | overview>
- **Running example:** <the concrete case threaded through the deck>
- **Progress style:** <none | percentage | journey-levels>
- **Slide count:** <N>

## Section: <Opening>
1. **<Slide title>** — <one-line purpose / the one core idea>

## Section: <Body section 1 name>   <!-- journey level: <name>, if journey-levels -->
2. **<Slide title>** — <one-line purpose>
3. **<Slide title>** — <one-line purpose>

## Section: <Body section 2 name>
...

## Section: <Closing>
N. **<Slide title>** — <one-line purpose>
```

Rules for the outline:

- Every slide is numbered sequentially from 1; the count matches `slide-count`.
- One core idea per content slide. If a slide's purpose needs the word "and" twice,
  split it.
- Each section names a journey level only when `progress-style: journey-levels`.
- The outline is the contract for `bot-010-deck-builder` — it must be complete enough
  that the builder never has to invent a slide.

## Inputs

- `topic` (required) and the optional fields above, from the prompt / `bot/user.md` /
  `source-material`.

## Outputs

- `artifacts/<project>/outline.md` — the ordered, sectioned slide list described above.

After writing the outline, hand off to the `bot-010-deck-builder` skill to build the
deck. See `.claude/skills/INDEX.md` for routing.

## Examples

### Example 1: Investor pitch

User says: "Make a pitch deck for our logistics startup raising a Series A."
Actions:
1. Project `series-a-logistics`; audience inferred = investors; deck type = Pitch.
2. Arc = problem → solution → traction → market → ask (5 body sections).
3. Running example = a named sample shipper using the product.
4. Progress style = `percentage` (a pitch — no journey levels).
5. Write `outline.md` with ~12 numbered slides.
Result: `artifacts/series-a-logistics/outline.md`, ready for the deck-builder.

### Example 2: Beginner course

User says: "Build a course introducing Git to people who have never used it."
Actions:
1. Project `git-basics-course`; audience = beginners; deck type = Tutorial.
2. Arc = prerequisites → progressive lessons; progress style = `journey-levels`.
3. Levels = Beginner → Intermediate → Confident; mapped to section dividers.
4. Running example = one sample repo carried through every lesson.
Result: `artifacts/git-basics-course/outline.md` with a level plan.

## Quality Criteria

- [ ] `outline.md` exists at `artifacts/<project>/outline.md`.
- [ ] The outline names topic, audience, deck type, running example, progress style,
      and slide count.
- [ ] Slides are numbered sequentially from 1; the count matches `slide-count` (or the
      8-16 default) — no gaps.
- [ ] The arc opens with a hook/context slide and closes with a resolution/CTA.
- [ ] Body sections build in order; no slide references a concept before its section.
- [ ] One core idea per content slide.
- [ ] With `journey-levels`, each body section names a level and levels are ordered.

## Troubleshooting

### No topic supplied
Cause: the request has no subject for the deck.
Solution: stop and write a clean error asking for a topic. Do not invent one.

### Audience unclear
Cause: the prompt names no audience and the topic does not imply one.
Solution: default to the Overview / explainer deck type and note the assumption in the
outline's Audience field.

## Attribution

The narrative patterns generalize the deck-specific `vibe-to-agentic-framework` skill
from `shanraisshan/claude-code-best-practice` into topic-agnostic guidance.
