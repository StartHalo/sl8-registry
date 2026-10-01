---
name: saas-cro-closing-review
description: Closes a B2B micro-SaaS conversion review (or a test design) with an honest summary — what was recommended, what the founder shipped, the results they supplied, and what is still open — claiming no result the founder didn't report. Run by the micro-SaaS conversion router for the Close job; use it whenever the router names it.
---

# Closing a review

A closing summary is what the founder reads in six months when they ask "what did we change last
time, and did it help?". It is only useful if it is honest: what was recommended, what was done,
what was measured, and what nobody knows yet.

Read: `state.md`, `action-sheet.csv`, `09-action-sheet.md`, any `11-results-v*.md`,
`tests/`, the request (how the round ended, anything shipped or measured), and
`artifacts/context.md` (read only). Never change those files.

## Steps

1. **What was recommended:** the change-first list as it last stood, with sheet IDs.
2. **What was shipped:** each item the founder reported shipping, with its date and status from
   the sheet (`shipped`, `kept`, `reverted`, `unclear`). Items not reported are "not reported as
   shipped", not "not done".
3. **Results supplied:** only figures the founder gave, with their verdicts from S11, each
   labelled indicative. If no results were sent, write "no results supplied" for each item; never
   infer one.
4. **Still open:** decisions waiting, Investigate and Instrument items, research-kit items not
   run, and what would be worth reviewing next time.

## File

`deliverables/closing-summary.md`:

```text
# Closing summary: <product>, <project> · <date>
## What was recommended
## What was shipped
## Results supplied
## Still open
```

Use the `##` headings exactly; the router's close checks them.

## When this skill is done

This skill is one step of a job, never the whole job, and the founder has not had a reply yet.
Don't announce a hand-back and don't stop: in the same turn, go straight on with the
micro-SaaS conversion router. Your very next action is the router's check
(`node <router>/scripts/state.mjs check <project> <steps>`), then the rest of its run loop, then
its section 4 (`status.mjs` and the reply to the founder). The job ends only there.
For this job the router then runs `state.mjs close <project>`.
