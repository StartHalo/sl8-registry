---
name: saas-cro-reading-evidence
description: Reads whatever evidence a B2B micro-SaaS founder has about why visitors don't convert — figures for visits, demo requests, trials and paid customers; customer interview or call notes; reviews, support tickets and sales notes; recordings or heatmap notes; user-test and copy-test answers — checks it, places figures in benchmark ranges, and writes a short research kit for what's missing (ResearchXL steps S4 to S8). Run by the micro-SaaS conversion router; use it whenever the router names S4, S5, S6, S7 or S8.
---

# Reading the evidence (S4–S8)

ResearchXL confirms page opinions with data and customers' own words. Agencies do that with
analytics, heatmaps, hundreds of survey answers and paid user tests. A micro-SaaS founder has
little of that, and often no traffic data at all. So this skill does two things: it reads honestly
whatever the founder does have, and for each gap it writes one short script the founder can run
with real people this week. It never invents respondents or simulates users. Simulated users
have been compared with real studies and found too shallow and too agreeable to be evidence.

Read first: `01-goals-funnel.md`, `03-heuristic.md` (the areas of interest to confirm or reject),
every file in `inputs/`, and `artifacts/context.md` (read only). On a rerun, the router says which
step the new evidence is for; rewrite only that step's section and keep the rest.

## S4 Analytics health check and leak analysis

1. **Data received:** each figure the founder gave, with its period and source, exactly as given.
2. **Health check:** do the figures hang together? (Demo requests can't exceed visits; trials
   should match sign-ups; periods should line up.) Note conflicts as open decisions; use the
   founder's figure as given.
3. **Leaks:** rates computed only from supplied counts ("6 demo requests from about 900 pricing-page
   visits is 0.7%"), placed against the ranges in [references/benchmarks.md](references/benchmarks.md)
   with source and date. A range is context, never a target.
4. **Instrument items:** what isn't measured and should be, cheapest first (count demo-form
   submissions; tag trial sign-ups by source; a free session-recording tool). With no figures at
   all, say so plainly. The review still stands, and these items are how the founder gets numbers.

## S5–S8

For each step, write findings from supplied evidence, or `not available` plus the kit item that
would supply it. Mine what exists before asking for more: reviews, support tickets, sales or
demo-call notes and chat logs often already hold the buyer's fears in their own words.
[references/voice-of-customer.md](references/voice-of-customer.md) says what to pull out and how
to label confidence.

| Step | Findings from | If not available |
|---|---|---|
| S5 Mouse tracking and session replays | recordings or heatmap notes the founder sends | kit item: install a free recording tool, then watch 10–20 sessions of the main path |
| S6 Qualitative surveys and interviews | interview or call notes, reviews, tickets, sales notes, survey answers | kit item: 5 short customer calls, or a 3-question poll |
| S7 User testing | notes from people who tried the site while the founder watched | kit item: a 5-person task test of the main path |
| S8 Copy testing | answers to a 5-second or preference test | kit item: a 5-second test of the home page's first screen |

Each finding names its source file and a confidence (High, Medium, Low), and says which S3 area of
interest it confirms or rejects.

## The research kit (S8 writes it)

`deliverables/research-kit.md`, from the templates in
[references/research-kit.md](references/research-kit.md): at most 4 items, each under 30
minutes of the founder's time, numbered K1–K4, each saying what to do, the exact questions or
tasks, and what to send back ("Review our conversion: continue <project>" with the notes
attached). Pick the items that would settle the highest-severity open questions. If the
founder already supplied everything, the kit says so in one line.

## Files

```text
# S4 Analytics health check and leak analysis: <product>    → 04-analytics.md
## Data received
## Health check
## Leaks
## Instrument items
## Open decisions

# S5–S8 Customer and visitor research: <product>           → 05-research.md
## S5 Mouse tracking and session replays
## S6 Qualitative surveys and interviews
## S7 User testing
## S8 Copy testing
## Open decisions

# Research kit: <product>                                  → deliverables/research-kit.md
## What to run           (one "### K<n> <title>" each, at most 4)
## What to send back
## Assumptions
```

Use the `##` headings exactly. A `not available` section must name its kit item (K1 …). Open
decisions that stop the review going on carry "(blocks S<n>)".

An open decision already listed by an earlier step (in `01`–`05`) stays there: don't restate it in your own file in other words, or the founder sees the same question twice. Add a decision only when it is new.

## When this skill is done

This skill is one step of a job, never the whole job. When the files are written, hand back to
the micro-SaaS conversion router and carry on with step 4 of the router's run loop (the check).
Don't end the job here: don't write the final reply, `STATUS.md` or `outcome.json`.
