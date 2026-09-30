---
name: planning-app-marketing-actions
description: Turns an approved marketing strategy for a consumer health or wellness app into tactics, a week-by-week action plan and measures — channels by journey stage, a Bullseye top three to test, store search (ASO) actions, the brand and performance split, owners and weeks, a resource table against the budget, and metrics with a review date — as the Tactics, Actions and Control steps (S4–S6) of a SOSTAC plan; then assembles the full marketing plan (or a launch campaign plan) and its milestone. Run by the app marketing router whenever it names S4, S5 or S6.
---

# Planning the app's marketing actions (S4–S6 → M3 or M4)

Turn the strategy into what the team does, week by week, and how they'll know it's working.
The router tells you the project folder, the steps, the scope (`plan` or `campaign`), the plan
version, the settings (horizon, leadership summary) and any change. Work inside
`artifacts/<project>/`.

## Read first

- `01-situation.md`, `02-objectives.md`, `03-strategy.md`; `artifacts/context.md`; `inputs/`
  (budget, team, channels in use, change or results files).
- [references/channel-selection.md](references/channel-selection.md),
  [references/aso-keyword-cycle.md](references/aso-keyword-cycle.md),
  [references/health-policy-check.md](references/health-policy-check.md),
  [references/deliverables.md](references/deliverables.md).
- On a change, redo or update: the earlier `04-`–`06-` files and the plan in `versions/`. Keep
  what still holds; list what changed under `## What changed` at the top of each file.

## Steps

1. **S4 tactics:** channels by journey stage, each tied to a target and an objective; the
   Bullseye ranking with 3 channels to test and the cheapest test for each; store search
   actions (draft listing text for the person); the brand and performance split; the
   health-policy check on every claim and data use. Write `04-tactics.md`.
2. **S5 actions:** every action with an **owner role** (from the team given, default "one
   marketer" stated as an assumption), a **week** within the horizon, and its **channel**. A
   resources table with the 4Ms (people, money, minutes, data) that adds up to the budget given,
   or marks money `[TBD]`. Write `05-actions.md`.
3. **S6 control:** for each objective, its metric, source (which console or tool), check date
   and what to do if it dips; the review date (end of the review cadence). Separate outputs
   (what was done) from outcomes (what it achieved), as AMEC does. Write `06-control.md`.
4. **Assemble** the plan document (below).
5. **Milestone:** M3 for a plan, M4 for a campaign. Then hand back to the router (see the end of this skill).

Only a person spends, posts, changes the listing or contacts anyone: write those as actions for
the owner role, with draft text. Never set a launch date the person didn't give.

## Step files

```text
# S4 Tactics: <app>                     (04-tactics.md)
## Channels by journey stage
## Channels to test                     (one bullet per channel, at most 3)
## Store search (ASO)
## Brand and performance split
## Health-policy check
## Open decisions

# S5 Actions: <app>                     (05-actions.md)
## Actions                              (a table: week, action, owner role, channel, objective)
## Resources                            (the 4Ms table)
## Open decisions

# S6 Control: <app>                     (06-control.md)
## Measures                             (per objective: metric, source, check date, dip response)
## Review date
## Open decisions
```

Use these `##` headings exactly as written, in plan and campaign scope alike; add your own `###`
sub-headings under them (for example **Before launch**, **Launch day**, **After launch** under
`## Actions`). The router's check looks for these exact headings. Write "- none" under Open
decisions when there are none.

## The plan document

- **Plan scope:** `marketing-plan.md`, version from the router, in the two-layer layout in
  [references/deliverables.md](references/deliverables.md). From v2 on, `## What changed and why`
  comes first and ties each change to the person's figures or request. Add the leadership
  summary only when the setting is on.
- **Campaign scope:** `campaign-plan.md` in the same layout; S5 is split into **Before launch**,
  **Launch day** and **After launch**, each action with an owner role. It sits inside the parent
  plan when there is one: read the parent, never change it.

## Milestone

- Plan: `deliverables/M3-plan.md`.
- Campaign: `deliverables/M4-campaign-<project>.md`, covering the whole campaign (S1–S6).

Both in the layout in [references/deliverables.md](references/deliverables.md).

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the app marketing router and carry on with step 4 of the router's run loop (the check).
Don't end the job here: don't write the final reply, `STATUS.md` or `outcome.json`.
