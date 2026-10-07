# Ledgerline: test design for "the pricing headline names the per-invoice cost"

- Product: Ledgerline, https://ledgerline.example
- Change: C2 from the trial-path review: the pricing headline names the per-invoice cost

## The change
Pricing page, hero (https://ledgerline.example/pricing): replace "Simple pricing for growing teams"
with "From $0.40 an invoice, no seat fees" (the price is the one the pricing table already shows).

## Hypothesis
Because we saw that the pricing page never says what one invoice costs until the plan table (review
finding C2), we expect that naming the per-invoice cost in the headline will cause more
pricing-page visitors to start a trial. We'll measure this using trials started per pricing-page
visitor.

## The arithmetic
- Inputs: baseline 2% (example rate, assumed), lift 20%, visitors per week 500 (example, assumed)
- Tier: low (40 conversions per 4 weeks; Speero: 3,100+ high, 784–3,099 medium, under 784 low)
- Visitors per arm: 21,109
- Weeks: 84.4

## Route
**Route:** ship and measure before and after. An A/B test would take about 85 weeks, far more than
8, and the tier is low. If you want direction first, show both headlines to 30 people like your
buyers and ask which makes the price clearer; that tells you direction, not size.

## Measures
- Primary: trials started per pricing-page visitor
- Secondary: trials that send a first invoice within 7 days
- Guardrail: trials started from the home page (the change must not pull them down)

## Decision rule
Set now, before shipping: after 4 full weeks, compare the primary measure with the 4 weeks before.
Keep the change if it is up and nothing else changed in the period; revert it if it is clearly
down; extend 4 weeks if it is flat or the period was unusual. Note today's date as the end of the
baseline period.

## What to send back
Weekly pricing-page visitors and trials started for the 4 weeks before and the 4 weeks after, the
date the headline changed, and anything else that changed on the site in those weeks.

## Method
Hypothesis Kit form; Speero's B2B traffic tiers (Jeff Kellner, 2026); exact two-proportion sample
size by stats.mjs (alpha 0.05 two-sided, power 0.8); A/B test only at 8 weeks or fewer.

## Assumptions
- **Baseline conversion:** not given. Assumed 2%, an example rate. Send the share of pricing-page visitors who start a trial over the last 4 weeks to replace it.
- **Visitors per week:** not given. Assumed 500 a week, an example. Send the pricing page's weekly visitors to replace it.
- **Lift worth detecting:** not given. Assumed 20% relative. Send the smallest lift that would change your decision to replace it.
