# Hypotheses, PXL order and routes (S10)

## The hypothesis (CXL)

> We believe that doing **[A]** for people **[B]** will make outcome **[C]** happen. We'll know
> this when we see data **[D]** and feedback **[E]**.

Every part is concrete: A is the change from the action sheet; B the visitors it's for; C the
behaviour; D the measure and period; E what customers or testers would say.

## Order with PXL (CXL, 2016)

Score each hypothesis with yes/no questions, then order by total. Evidence counts more than
opinion:

| Question | Points if yes |
|---|---|
| Is it above the fold on its page? | 1 |
| Is it noticeable within 5 seconds? | 2 |
| Does it add or remove an element (not just restyle)? | 2 |
| Does it run on a high-traffic page (home, pricing)? | 1 |
| Is it supported by customer or visitor evidence (S5–S8)? | 1 |
| Is it supported by figures (S4)? | 1 |
| Is it supported by more than one source? | 1 |
| Is it easy to build (under a day)? | 1 |

"Above the fold" and "noticeable" need a screenshot. Without one, score them 0 and say so.

## The route, from the arithmetic

Run `node T/scripts/stats.mjs tier …` and, for a candidate test, `node T/scripts/stats.mjs size
--baseline <rate> --lift <lift> --visitors-per-week <v>`. Quote the result.

| Tier (conversions per 4 weeks; Speero 2026) | Route |
|---|---|
| high, 3,100 or more | A/B test; detects about a 10% lift |
| medium, 784–3,099 | A/B test only for bold changes (10–20% lift) |
| low, under 784, or not known | **ship and instrument**: make the change, compare the same-length periods before and after, read it as indicative; or a **preference test** (5–10 people choose between two versions) to check direction before shipping |

A test that would take more than 8 weeks isn't worth running: ship and instrument instead (the
`size` result says so).

## The decision rule, set before shipping

For ship and instrument: "After 4 full weeks, compare <measure> with the 4 weeks before. Keep it
if it is up and nothing else changed in the period; revert it if it is clearly down; extend 4
weeks if it's flat or the period was unusual." Write the baseline period down now, so the
comparison later is like for like.
