# Deliverables and plan layout

Milestone deliverables go in `artifacts/<project>/deliverables/` as Markdown (PDF is added when
the machine can render it). Each one **stands alone**: a founder who opens only this file
understands what was done, what was found, what was decided and what was assumed. Never write
"see state.md" or "see the step files"; copy in what the reader needs, including owners and hours.

Every deliverable has these four sections, with these exact headings:

```text
# M<n> <Name>: <product>, <project>
<one-line date and plan version>

## What was done
## Findings
## Decisions
## Assumptions
```

Under **Decisions**, mark each strategy decision "proposed: approve or change". Under
**Assumptions**, list every value that came from a default or "assume for me", every benchmark
used (with its source), and every `[TBD]`, with what would replace it.

| Milestone | File | Written by | Covers |
|---|---|---|---|
| M1 Situation | `deliverables/M1-situation.md` | saas-mkt-situation | S1: customers, competitors and alternatives, the company, external factors, earlier strategy, key findings |
| M2 Strategy | `deliverables/M2-strategy.md` | saas-mkt-strategy | S2–S3: lever, objectives, targets, positioning, motion, obstacle, ruled out, critique outcome, messaging sheet |
| M3 Plan | `deliverables/M3-plan.md` | saas-mkt-plan | S4–S6: channel ranking and tests, content, review sites, pricing message, actions and hours, measures, review date |
| M4 Launch | `deliverables/M4-launch-<name>.md` | saas-mkt-plan (launch scope) | S1–S6 at launch scope, with before / on / after launch-day actions, owners and hours |
| M5 Review | `deliverables/M5-review-<date>.md` | saas-mkt-review | results against objectives and channel tests, broken assumptions, steps to redo |

## `marketing-plan.md` (plan scope) and `launch-plan.md` (launch scope)

One document, written by saas-mkt-plan after S6:

```text
# Marketing strategy and plan: <product>, <project> · v<N>
## One-page summary            (first: the bets, the ≤3 objectives with targets, the channels to test, the first four weeks, decisions waiting)
## What changed from your earlier strategy   (only when the founder gave one: kept / changed / dropped, each with a reason)
## What changed and why        (v2 and later only, tied to the founder's figures or request)
## Assumptions                 (every default, benchmark and [TBD])
## Strategy layer
### S1 Situation               (key findings)
### S2 Objectives
### S3 Strategy                (targets, positioning, motion, obstacle, ruled out)
### Messaging sheet
## Plan layer
### S4 Tactics
### S5 Actions                 (the weekly table with hours)
### S6 Control
## Decisions waiting on you
```

The one-page summary fits on one screen: about 250 words and one small table.

A launch plan follows the same layout at launch scope, and its S5 is split into **Before
launch**, **Launch day** and **After launch**, each action with an owner and hours.
