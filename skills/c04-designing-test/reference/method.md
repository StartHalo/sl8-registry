# Method: designing a test a small SaaS can actually run

## 1. The hypothesis (Hypothesis Kit form)
"Because we saw [data], we expect that [change] will cause [impact]. We'll measure this using
[metric]." Every part is concrete: the data is a quoted page, a figure the founder gave, or a
finding from the trial-path review (name it, e.g. "C2"); the change is the one change; the impact
is a behaviour (start a trial, book a demo, finish sign-up); the metric is the primary measure.

## 2. The arithmetic (always `stats.mjs plan`, never by hand)
- **Tier** (Speero, Jeff Kellner, 2026-08-20): conversions in a 4-week window. 3,100+ high (an A/B
  test sees about a 10% lift); 784–3,099 medium (10–20%, bold changes only); under 784 low (only
  20% or more, and usually not in reasonable time).
- **Sample size:** exact two-proportion formula, two-sided, alpha 0.05, power 0.8. Calculators
  differ by a few percent; quote the script.
- **Lift:** the smallest relative lift worth finding. Without one, 20% (the smallest a low-traffic
  test can see).
- **Before and after:** two equal 4-week periods of C conversions each differ by chance with a spread
  of √(2C), so a change under 1.96 × √(2C) conversions is within the noise (95%, two-sided). At 40
  conversions a period that is 18 (45%): a 20% lift cannot be told from noise, and the comparison is
  indicative, not proof. `stats.mjs plan` prints the line (`beforeAfter.line`); copy it.

## 3. The route, from the weeks
| Weeks for an A/B test | Route |
|---|---|
| 8 or fewer, medium or high tier | **A/B test**, run full weeks to the planned sample; no peeking (Evan Miller: decide the sample in advance and wait) |
| more than 8 (or low tier) | **ship and measure before and after**: make the change, compare the same-length periods before and after; indicative, not proof, and it sees only a change larger than the noise (the before-and-after line) |
| any, when the change is copy or a layout people can judge | optionally first a **preference test**: 30–100 people like the buyers choose between two versions; direction only (stated preference and behaviour agree only loosely, NN/g r = .53) |

Shorten a test by testing a bigger change, measuring a step higher in the funnel (more conversions),
or both (Speero's levers). Say which lever would bring it under 8 weeks when one would.

## 4. Measures
- **Primary:** one, per visitor of the page changed (trials started per pricing-page visitor).
- **Secondary:** a later step it should also move (trials that reach the first result).
- **Guardrail:** what must not get worse (sign-ups elsewhere, demo requests, refunds).

## 5. The decision rule, set before shipping
- **A/B test:** "At <n> visitors per arm (about <weeks> weeks), keep the variant if the primary
  measure is up and significant at 95% with no guardrail worse; otherwise keep the original. Do not
  stop early."
- **Ship and measure:** "After 4 full weeks, compare <primary> with the 4 weeks before. Keep it if it
  is up by <the smallest change it can tell from noise, n%> or more and nothing else changed; revert it
  if it is down by as much. In between, the result is within the noise: keep a change that was safe to
  ship (a Just Do It), and extend 4 weeks for a clearer read." Write the baseline period down now. The
  percentage is the before-and-after line's; never round it by hand.

## 6. What to send back
The figures for the primary, secondary and guardrail measures for each period or arm, the dates the
change shipped or the test ran, and anything else that changed in the period.

## Sources
Speero (Kellner, 2026-08-20) for tiers and routes; Evan Miller (2010) and a peeked test (Rajan,
2026) for fixing the sample and the rule in advance; Omniconvert (2026) and a filled template
(abtestplan.com) for the plan's fields. The 8-week limit is ours. See `examples/ref-*.md`.
