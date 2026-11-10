---
name: agency-plan
description: Turn a goal into ranked lanes with seed tasks, or review the lanes when something changed (a read-out, a flat gauge, a new fact, a customer's new ask, twelve weeks). Use for every plan-kind task.
metadata:
  status: core
  version: 1.1.0
---

# Plan

The method is `~/.claude/skills/agency-run/knowledge/how-to-plan.md`. Follow it in order:
0. **Discovery done?** If the facts this goal needs aren't in `work/agency/CUSTOMER.md` or `work/discovery/`, add
   the discovery tasks, park this task on them, and stop (D51).
1. The goal, and the customer's way if they named one (it becomes a lane first and is never scored
   away: D47).
2. The sums, written to the goal's own `work/plan/<goal>.md`, with every step below.
3. Candidates from the lanes `bot/setup.md`'s `<AGENCY>` names (Taste first), or from comparables when no entry fits.
4. A score from 1 to 3 for impact, confidence and control, with a reason for each.
5. **One rank across all goals, with no ties.**
6. Open each lane with its whole definition, its `title` (required; the customer's words), its `due` when the plan
   has a date, its `scope` (what it covers and what not, in words the
   customer could read: D48) and the seed task of every stage, each with `follows`, made executable.

**A review:**
1. Re-read the gauges and the facts since the last review.
2. Re-score each lane.
3. Change it with `lane_set`: rank, state (paused, stopped, done), gauge, done or pause, with `why`
   naming the reason.
4. At the end, check that active lanes have no rank ties.

**Before you finish:**
- Add a comms task telling the customer what changed and why, in a few lines, if it changes what they
  see or do.
- A change the parameters don't cover (spend, a new goal, past the date; `bot/user.md`) is outside this engagement
  (D67): tell the customer plainly in the run's email, and log it.
