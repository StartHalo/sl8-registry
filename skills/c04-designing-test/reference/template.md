# tests/<change>.md: the layout (validate.mjs reads these headings and lines)

```markdown
# <Product>: test design for "<the change, short>"

- Product: <name, website, or "not given">
- Change: <the change as the founder said it, or its ID and words from the trial-path review>

## The change
<Page and section (full URL when known): what is there now, and what replaces it, word for word
when it is copy.>

## Hypothesis
Because we saw <the evidence: a quoted page, the founder's figure, or a review finding>, we expect
that <the change> will cause <the behaviour that moves>. We'll measure this using <the primary measure>.

## The arithmetic
- Inputs: baseline <rate>[ (example rate, assumed)], lift <rate>, visitors per week <n>[ (example, assumed)]
- Tier: <high|medium|low> (<n> conversions per 4 weeks; Speero: 3,100+ high, 784–3,099 medium, under 784 low)
- Visitors per arm: <n from stats.mjs>
- Weeks: <weeks from stats.mjs>
- Before and after (4 weeks each): <copied from stats.mjs plan's beforeAfter.line, for ship and measure>

## Route
**Route:** <A/B test | preference test | ship and measure before and after>. <Why, from the weeks and
the tier. A preference test is for direction only.>

## Measures
- Primary: <the one measure the decision rests on, per visitor of the page changed>
- Secondary: <a later step it should also move>
- Guardrail: <what must not get worse>

## Decision rule
Set now, before shipping: <when to read it, what keeps the change, what reverts it, what extends it; for
ship and measure, the smallest change it can tell from noise, n%>.

## What to send back
<the figures, periods and dates the founder sends after the test or the measuring period>

## Method
Hypothesis Kit form; Speero's B2B traffic tiers (Jeff Kellner, 2026); exact two-proportion sample
size by stats.mjs (alpha 0.05 two-sided, power 0.8); A/B test only at 8 weeks or fewer.

## Assumptions
- **<Label>:** not given. Assumed <what>. Send <what> to replace it.
```

- Copy the four figures and the before-and-after line from `stats.mjs plan` exactly; the validator
  reruns it on the Inputs line.
- Write "(example rate, assumed)" after a baseline you did not get, and "(example, assumed)" after
  visitors you did not get.
- **Route:** never an A/B test when the weeks are over 8. At 8 weeks or fewer and a medium or high
  tier, an A/B test is the default; say why if you choose another. "An A/B test would take about <n>
  weeks" uses the weeks rounded up. Ship and measure says it is indicative, not proof.
- When every input was given, the Assumptions section says `- None: every input was given.`
