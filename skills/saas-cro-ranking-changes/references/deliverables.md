# Milestone layouts: M1 and M2

Milestones go in `artifacts/<project>/deliverables/` as Markdown (PDF later, when the machine can
render it). Each one **stands alone**: a founder who opens only this file understands what was
done, what was found, what to do and what was assumed. Never write "see state.md" or "see the
step files"; repeat what matters.

## `deliverables/M1-conversion-review.md`

```text
# M1 Conversion review: <product> · v<sheet version> · <date>

## What was done
(paths and pages reviewed, competitors compared, evidence read, in 3–5 lines)

## Change first
(the numbered list from S9: change, why, how you'll know — with [A<n>] ids)

## Findings
(by page: the 2–4 most important findings per key page, each with its quote)

## What this review could not see
(no rendered page or mobile view without screenshots; figures not supplied; steps inside the
product; severity rated by one reviewer rather than the average of several; each with the kit item
or screenshot that would settle it)

## Decisions
(what the founder is asked to approve or change: the change-first list is marked
"proposed: approve or change")

## Assumptions
(every default, inferred value and [TBD], with what would replace it)
```

## `deliverables/M2-test-plan.md`

```text
# M2 Test and measurement plan: <product> · v<sheet version> · <date>

## What was done
(the traffic tier and what it allows, quoted from the arithmetic)

## How each change will be judged
(per change-first item and hypothesis: route, measure, baseline period, decision rule)

## Decisions
(any test the founder must choose to run or skip)

## Assumptions
```

On v2 and later, each milestone opens with `## What changed` before `## What was done`.
