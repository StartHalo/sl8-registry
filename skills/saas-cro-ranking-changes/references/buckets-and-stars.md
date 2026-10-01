# Buckets and stars (ResearchXL master action sheet)

## The five buckets

Every issue goes into exactly one (Laja, CXL, "From data to test hypotheses"):

| Bucket | Put an issue here when | What the founder does |
|---|---|---|
| **Just Do It** | the fix is obvious and cheap, and doing it can't plausibly hurt (a broken link, a missing price, a confusing label, a form field nobody needs) | make the change, then measure before vs after |
| **Test** | a real chance to change behaviour, **and** the traffic tier allows a test (medium or high) | run the test in M2 |
| **Instrument** | something isn't measured, or the figures can't be trusted | set up the measurement first |
| **Hypothesize** | a real problem with no single obvious fix | try the options in M2, one at a time |
| **Investigate** | can't judge it yet: needs a screenshot, a figure, or customer evidence | the research-kit item or screenshot named in the row |

At low traffic (or unknown), nothing goes in **Test**: what would be tested becomes Just Do It
(when it's safe and obvious) or Hypothesize (when it's a bigger bet), and is measured before vs
after. Say so in the row.

## Stars: follow the money

Rate 1–5 from four things together:

- **how bad it is** (the severity from S3: 5 blocks or misleads most visitors on the main path);
- **how many visitors meet it** (home and pricing pages reach most; a footer link reaches few);
- **how close it is to revenue** (the demo form or sign-up beats a blog page);
- **how easy it is** (an easy fix to a big problem rates higher than a hard one).

A sheet with most rows at the same rating hasn't been prioritised. With 8 or more rows, use at
least 3 different ratings; the check enforces it.

## The columns

| Column | Content |
|---|---|
| `id` | `A1`, `A2` … kept across versions |
| `issue` | the problem in one line, visitor's side |
| `bucket` | one of the five, spelled exactly |
| `location` | page and place ("pricing page, plan table") |
| `evidence` | the quote and file, or the customer source |
| `action` | the specific change, or the rewrite itself |
| `stars` | 1–5 |
| `effort` | small (under an hour), medium (a day), large (more) |
| `owner` | founder (or the role the founder names) |
| `how_we_know` | the measure and period, e.g. "demo requests per 100 pricing-page visits, 4 weeks before vs after" |
| `status` | proposed, approved, shipped, kept, reverted, unclear, dropped |

Quote any cell holding a comma, as CSV requires. At most 40 rows: merge near-duplicates rather
than listing them twice.
