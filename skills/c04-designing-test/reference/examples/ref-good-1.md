Source: https://speero.com/post/preference-testing-vs-a-b-testing-for-b2b-saas · Jeff Kellner, Speero · 2026-08-20 · real practitioner guidance (read through the fetch tool's summary)

# Preference testing vs A/B testing for B2B SaaS

- Worked case: a demo-request page at a 3% baseline needs "roughly 51,700 visitors per variant" to
  detect a 10% relative lift at 95% confidence and 80% power; at 8,000 visitors a month, "13 months".
- Tiers, in conversions over a 4-week window: 3,100+ (detects 10% or better) · 784–3,100 (10–20%) ·
  under 784 (only 20% or more). Rule of thumb: MDE (relative) ≈ 5.6 / √(conversions in window).
- Four levers shorten a test: a bigger MDE, a higher-funnel metric, a looser alpha, or all three.
- Route: a preference test with 30–100+ people from the ideal customer profile in under 48 hours;
  A/B test the winner only if traffic supports it; "If traffic doesn't exist, ship the
  preference-tested variant instrumented." Stated preference predicts direction only (NN/g, r = .53).

**What makes it good (countable):** 1 formula, 3 tier cut-offs in conversions, 4 levers each with a
time, 3 routes each with its condition.
