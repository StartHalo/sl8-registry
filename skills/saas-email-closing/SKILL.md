---
name: saas-email-closing
description: Closes a micro-SaaS email campaign with an honest summary — what was planned and built, the results only as the founder reported them, and what stays open for a next campaign — without changing any earlier file. Run by the email campaign router for a close job.
---

# Closing a campaign

Write `artifacts/<campaign>/99-closing.md` and change nothing else. The router then marks the
campaign closed.

## Read first

`state.md`, `deliverables/` (M1, M2, any M3), `inputs/` (any results and the close request),
`04-storyboard.md` (leftover ideas).

## `99-closing.md`

```text
# Closing: <campaign>

## What was planned and built
The goal, the segments, the number of emails, the pack version(s).

## What you reported
Each figure the founder gave, with its date. Anything not reported is "not reported". Never a
result, a rate or a judgement the founder's figures don't support.

## What stays open
Open decisions not taken; changes proposed and not approved; leftover ideas worth a next
campaign (from the storyboard's Leftovers).

## For the next campaign
One to three lines the founder can reuse: what to keep, what to try.
```

Use only the founder's figures. Don't rebuild or edit any email, plan or deliverable.

## When this skill is done

Hand back to the email campaign router, which closes the campaign (`state.mjs close`) and
rewrites the dashboard. Don't write the final reply or `STATUS.md` here.
