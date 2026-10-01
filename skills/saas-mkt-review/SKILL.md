---
name: saas-mkt-review
description: Reviews a micro-SaaS marketing plan against the results the founder supplies — each objective's outcome against its baseline and target, each channel test continued, changed or stopped against its threshold, the assumptions the results broke, a short reflection — and names which SOSTAC steps to redo, writing the M5 Review milestone. Run by the micro-SaaS marketing router when a plan is updated with results or figures.
---

# Reviewing a micro-SaaS's marketing results (update → M5)

Learn from what happened and decide what to redo, using only the founder's figures. The router
tells you the project folder. Work inside `artifacts/<project>/`.

## Read first

- The plan as it was: the newest folder in `versions/` (the router kept it before this update),
  with `02-objectives.md`, `04-tactics.md` and `06-control.md` in it.
- The results: `inputs/results-<date>.md` and any attached exports in `inputs/`.
- [references/review-method.md](references/review-method.md),
  [references/channels.md](references/channels.md) and
  [references/deliverables.md](references/deliverables.md).

## Steps

1. For each objective: what was done and what it achieved, against its baseline and target.
   "No figure supplied" where there is none.
2. For each test channel: continue, change or stop, against the threshold set in S4, with the
   figure that decides it.
3. The assumptions and findings the results broke, each with the figure that broke it.
4. A short reflection: what the founder learned that the plan should keep.
5. The steps to redo, each with its reason, or "none: the plan stands".
6. Write `deliverables/M5-review-<date>.md` (today's date), then hand back to the router (see the
   end of this skill). The router reads `## Steps to redo` and reopens the plan from there.

## `deliverables/M5-review-<date>.md`

```text
# M5 Review: <product>, <project>, <date>
## What was done          (outputs, from the founder)
## Findings               (per objective: outcome vs baseline and target; per test channel: result vs threshold; broken assumptions)
## Decisions              (continue / change / stop per channel; next ideas; each "proposed: approve or change")
## Assumptions            (anything read into the figures, and figures not supplied)
## Steps to redo          (one bullet per step: "- S4: paid search missed its threshold (1 demo for $300, your figures)")
```

Never change the plan, the step files or `state.md` yourself.

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the micro-SaaS marketing router and carry on with section 3 of the router (the update mode reads
your Steps to redo). Don't end the job here: don't write the final reply, `STATUS.md` or
`outcome.json`.
