---
name: saas-cro-reading-results
description: Reads the results of conversion changes a B2B micro-SaaS founder made — what was shipped and when, with before and after figures for visits, demo requests, trials or paid customers — and gives each change an honest, indicative verdict (keep, revert, extend or unclear) with the arithmetic shown and the caveats a low-traffic before/after comparison carries; writes the M3 Results review (ResearchXL step S11, validate and learn). Run by the micro-SaaS conversion router; use it whenever the router names S11.
---

# Reading the results (S11 → M3)

With little traffic, a founder can't prove a change worked; they can see whether the numbers moved
in the right direction and whether anything else could explain it. Laja's route for low-traffic
sites is exactly that: make a bold change, compare consecutive periods, and allow for seasonality
and changes in where visitors come from. This skill keeps the founder honest in both directions:
no victory claimed from noise, no good change reverted on one slow month.

Read first: `09-action-sheet.md`, `action-sheet.csv`, `10-hypotheses.md` (the decision rules set
before shipping), the results the founder sent (`inputs/results-*.md`), and `artifacts/context.md`
(read only). The router gives the results version `<N>`.

`T` below is this skill's folder (the base directory shown when it loaded).

## Steps

1. **What was shipped, when:** each item the founder names, matched to its sheet ID. If an item
   isn't on the sheet, record it as an outside change: it can explain a movement.
2. **The arithmetic, per change:**
   `node T/scripts/stats.mjs compare --before <conversions>/<visitors> --after <conversions>/<visitors> --days-before <d> --days-after <d>`
   (conversions only when visitors weren't given). Quote the result: rates, change, and the
   caveats it lists.
3. **Read it against the decision rule** written in S10 for that change. Verdict: **keep**
   (moved the right way and nothing else explains it), **revert** (clearly worse), **extend**
   (flat, or the period was unusual: measure another 4 weeks), or **unclear** (several changes
   shipped at once, or figures missing).
4. **Caveats, named:** season or calendar (holidays, the buyer's busy months), a change in
   traffic sources or volume, several changes in one period, a small count. Say which apply.
5. **Every verdict is labelled indicative.** Never write that a change caused a result; write
   what moved and what else could explain it.
6. **What's next:** for each verdict, the next step (keep and move to the next change-first item;
   revert; or measure 4 more weeks). The router re-ranks the sheet after this.

## Files

```text
# S11 Results v<N>: <product>                 → 11-results-v<N>.md
## Results        (per change: shipped date, before, after, the stats.mjs numbers)
## Verdicts       (per change: keep / revert / extend / unclear — each marked "indicative")
## Caveats
## Open decisions

deliverables/M3-results-v<N>.md
## What was done
## Verdicts
## Decisions      (what the founder should keep, revert or keep measuring)
## Assumptions
```

Use the `##` headings exactly. The M3 deliverable stands alone: repeat the figures that matter.
Set the sheet status of each shipped row in your verdicts so the ranking step can carry it.

## When this skill is done

This skill is one step of a job, never the whole job, and the founder has not had a reply yet.
Don't announce a hand-back and don't stop: in the same turn, go straight on with the
micro-SaaS conversion router. Your very next action is the router's check
(`node <router>/scripts/state.mjs check <project> <steps>`), then the rest of its run loop, then
its section 4 (`status.mjs` and the reply to the founder). The job ends only there.
