---
name: saas-cro-ranking-changes
description: Turns a B2B micro-SaaS conversion review's findings into what the founder should change first — a ranked action sheet (every issue in one of ResearchXL's five buckets with a 1–5 star rating, evidence, action, effort and how to tell it worked), a change-first list of at most ten, copy rewrites where wording is the problem, and test hypotheses whose route (A/B test, preference test, or ship and measure) is set by the site's real traffic; writes the M1 Conversion review and M2 Test plan (ResearchXL steps S9 and S10). Run by the micro-SaaS conversion router; use it whenever the router names S9 or S10.
---

# Ranking the changes (S9–S10 → M1, M2)

The founder has a few hours a week and can't do 40 things. Users of AI page reviews say what
earns their trust is a short, ranked list with the evidence shown, not a long list of best
practice. ResearchXL's master action sheet does exactly that: every issue goes into one bucket,
gets a rating that "follows the money", and has a named action. The change-first list on top is
what the founder will actually do this month.

Read first: `01-goals-funnel.md` to `05-research.md`, `artifacts/context.md` (read only), the
current `action-sheet.csv` if one exists (a rerun), and what the router says is new.

`T` below is this skill's folder (the base directory shown when it loaded).

## S9 Master action sheet

1. **Traffic tier.** `node T/scripts/stats.mjs tier --conversions <n> --weeks <w>` with the main
   path's conversions from S1/S4, or `node T/scripts/stats.mjs tier` when they aren't known.
   Quote its result; it decides whether any item may sit in the Test bucket.
2. **One row per issue** from S2–S8 (technical issues, findings, leaks, customer evidence),
   merging duplicates. Bucket, stars and the other fields follow
   [references/buckets-and-stars.md](references/buckets-and-stars.md). Every row carries its
   evidence (quote and file) and a "how we'll know" measure the founder can take.
3. **Actions are specific changes**, written so the founder could hand them to whoever edits the
   site. Where wording is the problem, give the rewrite itself, following
   [references/copy-rewrites.md](references/copy-rewrites.md).
4. **Change first:** at most 10, numbered, each naming its sheet ID in brackets (`[A3]`). Just Do It
   items with the most stars first, then the highest-star items of other buckets. One line each:
   the change, why, and how you'll know.
5. On a rerun (new evidence or results): keep each row's ID, update stars, buckets and statuses
   the evidence changes, and say in `## What changed` which rows moved and why. Rows the founder
   shipped keep their status (`shipped`, `kept`, `reverted`, `unclear`).

## S10 Write hypotheses and order the tests

For Test and Hypothesize items, and the top shipped changes, write at most 8 hypotheses in CXL's
form with PXL ordering and a route set by the arithmetic, as in
[references/hypotheses-and-pxl.md](references/hypotheses-and-pxl.md). Every number about sample
size, weeks or traffic comes from `node T/scripts/stats.mjs size …`; quote it. Then the
measurement plan: what to measure for each change, from when to when, where to read it, and the
decision rule set in advance.

## Files

```text
# S9 Master action sheet: <product> · v<sheet version>    → 09-action-sheet.md
## What changed          (v2 and later: rows added, moved or re-rated, and why)
## Traffic tier          (the stats.mjs result, quoted)
## Change first          (numbered, at most 10, each with [A<n>])
## Action sheet          (the full sheet as a readable table, grouped by bucket)
## Open decisions

action-sheet.csv   header exactly: id,issue,bucket,location,evidence,action,stars,effort,owner,how_we_know,status

# S10 Hypotheses and test order: <product>                → 10-hypotheses.md
## Hypotheses            (one "### H<n> [A<id>] <title>" each, at most 8, each with a "Route:" line)
## Measurement plan
## Open decisions
```

Then the two milestones, in the layouts in [references/deliverables.md](references/deliverables.md):
`deliverables/M1-conversion-review.md` and `deliverables/M2-test-plan.md`. Each stands alone.
Use the `##` headings exactly; the router's check reads them and the CSV.

An open decision already listed by an earlier step (in `01`–`05`) stays there: don't restate it in your own file in other words, or the founder sees the same question twice. Add a decision only when it is new.

## When this skill is done

This skill is one step of a job, never the whole job. When the files are written, hand back to
the micro-SaaS conversion router and carry on with step 4 of the router's run loop (the check).
Don't end the job here: don't write the final reply, `STATUS.md` or `outcome.json`.
