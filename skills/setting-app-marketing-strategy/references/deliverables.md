# Deliverables and plan layout

Milestone deliverables go in `artifacts/<project>/deliverables/` as Markdown (PDF is added when
the machine can render it). Each one **stands alone**: a reader who opens only this file
understands what was done, what was found, what was decided and what was assumed. Never write
"see state.md" or "see the step files".

Every deliverable has these four sections, with these exact headings:

```text
# M<n> <Name>: <app>, <project>
<one-line date and plan version>

## What was done
## Findings
## Decisions
## Assumptions
```

Under **Decisions**, mark each strategy decision "proposed: approve or change". Under
**Assumptions**, list every value that came from a default or "assume for me", and every
`[TBD]`, with what would replace it.

| Milestone | File | Written by | Covers |
|---|---|---|---|
| M1 Situation | `deliverables/M1-situation.md` | analysing-app-situation | S1: segments, competitors, growth levers, health-policy factors, key findings |
| M2 Strategy | `deliverables/M2-strategy.md` | setting-app-marketing-strategy | S2–S3: objectives, north star, targets, positioning, obstacle, ruled out, critique outcome |
| M3 Plan | `deliverables/M3-plan.md` | planning-app-marketing-actions | S4–S6: channels, tests, ASO, actions, resources, measures, review date |
| M4 Campaign | `deliverables/M4-campaign-<project>.md` | planning-app-marketing-actions (campaign scope) | S1–S6 at campaign scope, with before / on / after launch-day actions |
| M5 Review | `deliverables/M5-review-<date>.md` | reviewing-marketing-results | results against objectives, broken assumptions, next ideas, steps to redo |

## `marketing-plan.md` (plan scope) and `campaign-plan.md` (campaign scope)

One document in two layers, written by planning-app-marketing-actions after S6:

```text
# Marketing strategy and plan: <app>, <project> · v<N>
## What changed and why        (v2 and later only, first, tied to the person's figures or request)
## Assumptions                 (first: every default, estimate and [TBD])
## Strategy layer
### S1 Situation               (key findings)
### S2 Objectives              (at most 3, north star)
### S3 Strategy                (targets, positioning, obstacle, ruled out)
## Plan layer
### S4 Tactics
### S5 Actions
### S6 Control
## Health-policy check
## Decisions waiting on you
## Leadership summary          (only when the setting is on)
```

A campaign plan follows the same layout at campaign scope, and its S5 is split into
**Before launch**, **Launch day** and **After launch**, each action with an owner role.
