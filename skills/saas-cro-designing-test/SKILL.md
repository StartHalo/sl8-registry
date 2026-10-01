---
name: saas-cro-designing-test
description: Designs how to test one conversion change on a B2B micro-SaaS website given its real traffic — whether an A/B test is even possible, how many visitors and weeks it would need (with the arithmetic shown), or whether to ship the change and measure before and after, or run a quick preference test — with the hypothesis, measures and a decision rule set in advance. Run by the micro-SaaS conversion router for the "Design a test for one change" job; use it whenever the router names it.
---

# Designing a test for one change

Founders hear "A/B test everything", then find their site would need years of traffic to detect
anything. This skill answers the real question for one change: can you test it, and if not, what
should you do instead? The answer comes from the arithmetic, shown so the founder can check it.

Read: the request and the founder's figures (`inputs/`), `artifacts/context.md` (read only), and,
when the router names an open review, its `action-sheet.csv` and `10-hypotheses.md` (read only:
never change a review's files from here).

`T` below is this skill's folder (the base directory shown when it loaded).

## Steps

1. **The change**, in one line, with the page, and the sheet ID if it's on a review's sheet.
2. **Hypothesis** in CXL's form: "We believe that doing [A] for people [B] will make outcome [C]
   happen. We'll know this when we see data [D] and feedback [E]."
3. **The arithmetic.** Traffic tier: `node T/scripts/stats.mjs tier --conversions <n> --weeks <w>`
   (or with no figures). For the lift the change could plausibly make (say 20% unless the founder
   gives a reason for another), `node T/scripts/stats.mjs size --baseline <rate> --lift <lift>
   --visitors-per-week <v>`. Quote both results. With no figures, show what traffic a test would
   need at a typical rate, label the rate as an example, and say the founder's own numbers decide.
4. **Route**, following from step 3: an A/B test (if testable in 8 weeks or fewer), a preference
   test with 5–10 people to check direction first, or ship and instrument. Explain why in two lines.
5. **Measures:** the primary measure (the conversion that matters), one or two secondary ones, and
   a guardrail (something that must not get worse, such as demo no-shows or trial-to-paid).
6. **Decision rule**, written before anything ships: the period, the comparison, and what result
   means keep, revert or extend.
7. **What to send back** after the period, and the exact request: "Review our conversion: <project>,
   we shipped <change> on <date>; before: …, after: …".

## File

`tests/<slug>.md` (make the `tests/` folder if it isn't there), the slug short and naming the change:

```text
# Test design: <the change>
## The change
## Hypothesis
## The arithmetic      (the stats.mjs results, quoted)
## Route
## Measures
## Decision rule
## What to send back
```

Use the `##` headings exactly; the router checks them.

## When this skill is done

This skill is one step of a job, never the whole job. When the file is written, hand back to the
micro-SaaS conversion router, which checks it (`state.mjs test`) and finishes the job. Don't write
the final reply, `STATUS.md` or `outcome.json`.
