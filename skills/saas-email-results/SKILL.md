---
name: saas-email-results
description: Reviews a sent micro-SaaS email campaign's results against its goal — the conversion event first, then clicks, replies, unsubscribes, complaints and bounces, with opens reported but never judged — warns when the list is too small to compare, and proposes at most three changes, each tied to a figure, for the founder to approve; writes the M3 Results review. The Measure and iterate step (S9). Run by the email campaign router whenever it names S9.
---

# Reviewing results (S9 → M3)

Judge what the founder sent against what it was for, and say what to change next. The router
tells you the campaign folder and where the figures are (`inputs/results-<date>.md`). Work inside
`artifacts/<campaign>/`.

## Read first

- The newest `inputs/results-<date>.md` (and any earlier ones), `01-insights.md` (the
  conversion event and segments), `04-storyboard.md`, `05-copy.md`.
- [references/metrics.md](references/metrics.md).

## Steps

1. **Against the goal.** The conversion event first: how many, out of how many sent, as a rate.
   Then per email where the figures allow (which email drove the conversions or clicks).
2. **The other signals:** clicks (and click rate), replies, unsubscribes, spam complaints,
   bounces. Opens only as reported, with the note that Apple Mail Privacy inflates them; never
   judge or compare on opens.
3. **Size warning.** If a comparison rests on fewer than about 100 recipients per email or
   variant, say so plainly: the difference may be chance.
4. **Health flags.** Complaints at or above 0.1%, bounces above 2%, or unsubscribes above 1% on
   one email are flagged first, with the fix (clean the list, check the segment, slow the cadence).
5. **What to keep.** What worked, each tied to a figure.
6. **What to change.** At most 3 changes, each with the figure behind it, a hypothesis ("if we
   …, then … because …"), the emails it touches, and how the next send would show it worked.
   Each is a decision for the founder ("proposed: approve or change"); nothing is rebuilt until
   they approve, through "change emails".
7. **M3**, then hand back.

Use only the founder's figures. A figure they didn't give is "not reported"; never estimate one.
Benchmarks only from `metrics.md`, with their source and date, as general ranges.

## `09-results-<date>.md` (the date of the results input)

```text
# S9 Results: <campaign>, <date>
## Results against the goal     (a table: Email | Sent | Conversions | Clicks | Replies | Unsubscribes | Complaints | Bounces | Opens (reported only); "not reported" where missing)
## What to keep
## What to change               (at most 3: change · figure · hypothesis · emails touched · how we'd know)
## Open decisions               (each change as "proposed: approve or change"; "- none" if none)
```

Use these `##` headings exactly; the router's check looks for them.

## Milestone M3

`deliverables/M3-results-<date>.md` (same date), standing alone:

```text
# M3 Results review: <campaign>, <date>
<one paragraph: the conversion result against the goal, in one sentence; the main finding; what to approve>
## What was done
## What the results say
## Decisions
## Assumptions
```

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the email campaign router and carry on with step 4 of its run loop (the check). Don't end the job
here: don't write the final reply, `STATUS.md` or `outcome.json`.
