Source: https://towardsdatascience.com/why-most-a-b-tests-are-lying-to-you/ · Kaushik Rajan, Towards Data Science · 2026-03-11 · done badly (an illustrative scenario, single-sourced); second source for the harm: Evan Miller, "How Not To Run An A/B Test", 2010-04-18

# Shipping on a mid-test read

A product manager read "Variant B, +8.3% conversion lift, 96% statistical significance" mid-test
and shipped it. Three more planned days would have dropped significance to 74% and the lift to +1.2%.

**Why it is bad:** no sample size, no end date, no decision rule fixed before looking, and a ship
decision on an interim read. With continuous peeking a nominal 5% false-positive rate becomes about
26% (Miller: "Decide on a sample size in advance and wait until the experiment is over").
