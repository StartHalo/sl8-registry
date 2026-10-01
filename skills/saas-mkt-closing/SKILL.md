---
name: saas-mkt-closing
description: Closes a micro-SaaS marketing plan or launch with an honest summary — what was planned, what the founder reported was done and achieved, which channel tests ended how, and what stays open — without claiming any result that wasn't supplied. Run by the micro-SaaS marketing router for the Close job.
---

# Closing a micro-SaaS marketing project

Write an honest record of how the quarter or launch ended. The router tells you the project
folder. Work inside `artifacts/<project>/`.

## Read

- The plan (`marketing-plan.md` or `launch-plan.md`), `02-objectives.md`, `04-tactics.md`,
  `06-control.md`, any `deliverables/M5-review-*.md`, and the close request with any results in
  `inputs/`.

## Write `99-closing.md`

```text
# Closing: <product>, <project>
Closed on <date> · plan version <N>

## What was planned        (the objectives, the channels tested, the main moves, in brief)
## What you reported       (actions done and results, only as the founder supplied them;
                            "no figure supplied" for each objective or test without one)
## What stays open         (open decisions, channel tests without a verdict, ideas worth carrying forward)
## For next time           (at most 3 lessons, each tied to something reported)
```

Rules:
- Claim no result that wasn't supplied. "Demo-request target: no figure supplied" is right;
  "demo requests grew as planned" without a figure is wrong.
- Change nothing that exists: no step file, plan, deliverable or `state.md`.
- Then hand back to the router, which marks the project closed (see the end of this skill).

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the micro-SaaS marketing router and carry on with section 3 of the router (Close marks the
project closed). Don't end the job here: don't write the final reply, `STATUS.md` or
`outcome.json`.
