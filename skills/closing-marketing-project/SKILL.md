---
name: closing-marketing-project
description: Closes a consumer health app's marketing plan or launch campaign with an honest summary — what was planned, what the person reported was done and achieved, and what stays open — without claiming any result that wasn't supplied. Run by the app marketing router for the Close job.
---

# Closing a marketing project

Write an honest record of how the period or campaign ended. The router tells you the project
folder. Work inside `artifacts/<project>/`.

## Read

- The plan (`marketing-plan.md` or `campaign-plan.md`), `02-objectives.md`, `06-control.md`,
  any `deliverables/M5-review-*.md`, and the close request with any results in `inputs/`.

## Write `99-closing.md`

```text
# Closing: <app>, <project>
Closed on <date> · plan version <N>

## What was planned        (the objectives and the main moves, in brief)
## What you reported       (actions done and results, only as the person supplied them;
                            "no figure supplied" for each objective without one)
## What stays open         (open decisions, untested channels, ideas worth carrying forward)
## For next time           (at most 3 lessons, each tied to something reported)
```

Rules:
- Claim no result that wasn't supplied. "Retention target: no figure supplied" is right;
  "retention improved as planned" without a figure is wrong.
- Change nothing that exists: no step file, plan, deliverable or `state.md`.
- Then stop. The router marks the project closed.
