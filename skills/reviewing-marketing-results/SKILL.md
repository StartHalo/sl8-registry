---
name: reviewing-marketing-results
description: Reviews a consumer health app's marketing plan against the results the person supplies — what was done versus what it achieved for each objective, which assumptions broke, next ideas scored by impact, confidence and ease — and names which SOSTAC steps to redo, writing the M5 Review milestone. Run by the app marketing router when a plan is updated with results or figures.
---

# Reviewing marketing results (update → M5)

Learn from what happened and decide what to redo, using only the person's figures. The router
tells you the project folder. Work inside `artifacts/<project>/`.

## Read first

- The current plan: the newest file in `versions/` (the router kept it before this update) and
  `02-objectives.md`, `06-control.md`.
- The results: `inputs/results-<date>.md` and any attached exports in `inputs/`.
- [references/review-method.md](references/review-method.md) and
  [references/deliverables.md](references/deliverables.md).

## Steps

1. For each objective: outputs, out-takes, outcomes, impact; each outcome against its baseline
   and target. "No figure supplied" where there is none.
2. The assumptions and findings the results broke, each with the figure that broke it.
3. Next ideas, scored with ICE (at most 7).
4. The steps to redo, each with its reason, or "none: the plan stands".
5. Write `deliverables/M5-review-<date>.md` (today's date), then stop. The router reads
   `## Steps to redo` and reopens the plan from there.

## `deliverables/M5-review-<date>.md`

```text
# M5 Review: <app>, <project>, <date>
## What was done          (outputs, from the person)
## Findings               (per objective: outcome vs baseline and target; broken assumptions)
## Decisions              (next ideas with ICE scores, proposed: approve or change)
## Assumptions            (anything read into the figures, and figures not supplied)
## Steps to redo          (one bullet per step: "- S4: paid social failed its test (CPI above target, your figures)")
```

Never change the plan, the step files or `state.md` yourself.
