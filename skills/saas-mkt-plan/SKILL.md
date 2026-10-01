---
name: saas-mkt-plan
description: Turns an approved micro-SaaS marketing strategy into tactics, a week-by-week action plan and measures — every channel on the bot's list ranked, up to three cheap channel tests with thresholds set in advance, a content plan that serves those channels, review-site and marketplace actions, how to present the price, actions that fit inside the founder's weekly hours and budget, and measures with decision dates — as the Tactics, Actions and Control steps (S4–S6) of a SOSTAC plan; then assembles the marketing plan (or a launch plan) with a one-page summary and its milestone. Run by the micro-SaaS marketing router whenever it names S4, S5 or S6.
---

# Planning a micro-SaaS's marketing (S4–S6 → M3 or M4)

Turn the strategy into what the founder does each week, within the hours they have, and how
they'll know it's working. The router tells you the project folder, the steps, the scope (`plan`
or `launch`), the plan version, the founder's hours a week, the budget, the settings and any
change. Work inside `artifacts/<project>/`.

## Read first

- `01-situation.md`, `02-objectives.md`, `03-strategy.md`; `artifacts/context.md`; `inputs/`
  (budget, channels in use, change or results files, any earlier strategy).
- [references/channels.md](references/channels.md), [references/bullseye.md](references/bullseye.md),
  [references/content-plan.md](references/content-plan.md),
  [references/deliverables.md](references/deliverables.md); in launch scope also
  [references/launch-scope.md](references/launch-scope.md).
- On a change, redo or update: the earlier `04-`–`06-` files and the plan in `versions/`. Keep
  what still holds; list every section you changed under `## What changed` at the top of each
  file.

## Steps

1. **S4 tactics:** rank every channel on the list A, B or C with one line why; at most 3 to
   test, each with its cheapest test, cost, hours a week, a threshold set now, a decision date
   and the objective it serves; the content plan that feeds those channels; review-site and
   marketplace actions; the pricing message (how to present the current price; a change is a
   decision for the founder). Write `04-tactics.md`.
2. **S5 actions:** a week-by-week table. Every action has a week, an owner (default "founder"),
   a channel from the list or `internal`, hours and cost. A weekly-hours table that never goes
   over the founder's hours. A resources table with the 4Ms (people, money, minutes, data) whose
   money adds up to the budget given, or marks money `[TBD]`. Time actions to the buyer's
   calendar from S1. Write `05-actions.md`.
3. **S6 control:** for each objective, its metric, source (a tool the founder actually has),
   check date and what to do if it dips; for each test channel, its decision date and what
   "continue", "change" and "stop" mean against its threshold; a short reflection question for
   the review; the review date. Write `06-control.md`.
4. **Assemble** the plan document (below), one-page summary first.
5. **Milestone:** M3 for a plan, M4 for a launch. Then hand back to the router (see the end of
   this skill).

Only a person spends, posts, sends, changes the site or pricing, or contacts anyone: write those
as actions for the founder, with draft wording where it helps (for example the review-request
email). Never set a launch date the founder didn't give.

## Step files

```text
# S4 Tactics: <product>                 (04-tactics.md)
## Channel ranking                      (every channel on the list: A, B or C, one line why)
## Channels to test                     (one bullet per channel, at most 3)
## Content plan
## Review sites and marketplaces
## Pricing message
## Open decisions

# S5 Actions: <product>                 (05-actions.md)
## Actions                              (a table with exactly these columns: Week | Owner | Channel | Action | Hours | Cost)
## Weekly hours                         (a table: Week | Hours, one row per week; never above the founder's hours)
## Resources                            (the 4Ms table)
## Open decisions

# S6 Control: <product>                 (06-control.md)
## Measures                             (per objective: metric, source, check date, dip response)
## Channel test decisions               (per test channel: decision date; continue / change / stop against its threshold)
## Review date
## Open decisions
```

Use these `##` headings and table columns exactly as written, in plan and launch scope alike;
add your own `###` sub-headings under them (for example **Before launch**, **Launch day**,
**After launch** under `## Actions`). The router's check reads them: hours in the Hours column
as a number ("2", "1.5"), cost as a dollar figure ("$0", "$150"), and the Channel column as a
name from [references/channels.md](references/channels.md) or `internal`. Write "- none" under
Open decisions when there are none.

## The plan document

- **Plan scope:** `marketing-plan.md`, version from the router, in the layout in
  [references/deliverables.md](references/deliverables.md). The **one-page summary** comes first.
  If the founder gave an earlier strategy, `## What changed from your earlier strategy` follows:
  kept, changed and dropped, each with its reason from S1's "Earlier strategy". From v2 on,
  `## What changed and why` ties each change to the founder's figures or request.
- **Launch scope:** `launch-plan.md` in the same layout; S5 is split into **Before launch**,
  **Launch day** and **After launch**. It sits inside the parent plan when there is one: read the
  parent, never change it.

## Milestone

- Plan: `deliverables/M3-plan.md`.
- Launch: `deliverables/M4-<project>.md` (the project is `launch-<name>`), covering the whole
  launch (S1–S6), owners and hours included.

Both in the layout in [references/deliverables.md](references/deliverables.md).

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the micro-SaaS marketing router and carry on with step 4 of the router's run loop (the check).
Don't end the job here: don't write the final reply, `STATUS.md` or `outcome.json`.
