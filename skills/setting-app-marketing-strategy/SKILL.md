---
name: setting-app-marketing-strategy
description: Sets a consumer health or wellness app's marketing objectives and strategy — at most three SMART objectives on the app funnel, a north-star metric, 1–3 target segments, positioning tested with the 3Cs, the one real obstacle, and what is ruled out — then critiques it as a dissenter, as the Objectives and Strategy steps (S2–S3) of a SOSTAC plan, and writes the M2 Strategy milestone. Run by the app marketing router whenever it names S2 or S3.
---

# Setting the app's marketing strategy (S2–S3 → M2)

Decide what to aim for and how to win, with choices that rule things out. The router tells you
the project folder, the steps, the scope and any change. Work inside `artifacts/<project>/`.

## Read first

- `01-situation.md` (S1), `artifacts/context.md`, and `inputs/` (the goal, and any change
  request such as `inputs/change-<date>.md`).
- [references/sostac-strategy.md](references/sostac-strategy.md) and
  [references/strategy-critique.md](references/strategy-critique.md).
- If the router says this is a change, redo or update: the earlier `02-`/`03-` files. Change
  what the request or the results require, keep the rest, and list what changed at the top of
  each file under `## What changed`.

## Steps

1. **S2 objectives:** at most 3, SMART, on the app funnel, each with metric, baseline or
   `[TBD]`, target, date and stage. Name the north-star metric. Write `02-objectives.md`.
2. **S3 strategy draft:** targets (1–3), positioning with the 3Cs check, the obstacle, what is
   ruled out, and the rest of TOPPP SEED where it matters.
3. **Critique pass:** argue against the draft; fix it; record the critique.
4. **Decisions for the person:** each strategy choice as "proposed: approve or change" (target,
   positioning, each objective's target). Write `03-strategy.md`.
5. **M2** (plan scope only), then hand back to the router (see the end of this skill).

The person approves the strategy; you propose it. Never invent a baseline.

## `02-objectives.md`

```text
# S2 Objectives: <app>
## Objectives            (one "### O<n> <name>" each, at most 3: metric, baseline, target, date, funnel stage)
## North-star metric
## Open decisions        ("- none" if none)
```

## `03-strategy.md`

```text
# S3 Strategy: <app>
## Targets
## Positioning
## 3Cs check
## The obstacle
## Ruled out
## Critique
## Decisions for you     (one bullet per decision, "proposed: approve or change")
## Open decisions        ("- none" if none)
```

Use these `##` headings exactly as written, in plan and campaign scope alike (no "Launch
objectives" or similar); the router's check looks for them.

In campaign scope: objectives are the launch's (at most 3), and the strategy is the launch's
target, message and obstacle, inside the parent plan's positioning when there is one.

## Milestone M2 (plan scope only)

`deliverables/M2-strategy.md`, in the layout in
[references/deliverables.md](references/deliverables.md). It opens with the target and what is
ruled out, so a reader sees the choice in the first lines. In campaign scope, write no M2.

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the app marketing router and carry on with step 4 of the router's run loop (the check).
Don't end the job here: don't write the final reply, `STATUS.md` or `outcome.json`.
