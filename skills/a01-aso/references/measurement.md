# ASO terms and measurement rules

Source: Khalid's ASO guide, sl8-studio/sl8-resesarch `research/aso/v1.0/03_Guide/03_Concepts_and_Measurement.md`
@ 9616aff4, read 1 Nov 2026; carried whole. Platform authority: A05 (Apple metric definitions) and G03
(Play user base), in `research.md`. The other definitions are engagement metrics.

## Terms

ASO improves how an app is discovered and presented in a store. Metadata is listing text and related
descriptive fields. A locale is a language/region variant, not a country. A search intent is the job a
person expects the app to do. Search popularity and vendor difficulty are relative indicators, not
search counts or ranking probabilities. A keyword shortlist is a decision record, not a prediction.

A hypothesis states a change, the expected user response, the reason and the measurable result. The
control is the unchanged baseline; a treatment is the changed version. Random assignment supports causal
inference within the tested audience. A before/after comparison can be moved by seasonality, ads,
releases, competitors and measurement changes. A guardrail detects an unacceptable side effect. A gate
is a check that must pass before a dependent action.

## Metric dictionary

| Metric | Definition / formula | Required qualification |
|---|---|---|
| Apple unique impressions | Distinct devices exposed, Apple's definition | Same app, dates, territory, source, device filters |
| Apple total downloads | First-time downloads + redownloads | Not new users |
| Apple conversion rate | (Total downloads + qualifying pre-orders) / unique impressions | Native definition; no double-counting of fulfilled pre-orders; never product page views as the denominator |
| Google listing install-click rate | Unique install clicks / eligible listing visitors | Custom ratio only when the populations match; label it |
| Google native CTR | Share clicking Install/Open/Pre-register under the console's current definition | Keep action and acquisition-state filters; don't mix numerators |
| Completed acquisitions | Completed outcomes, a separate report | Not listing clicks |
| Activation rate | Users completing the agreed activation event / eligible new-user cohort | Event and window defined before analysis |
| D7 retention | Cohort users active on day 7 / original cohort | Mature cohorts; stated time zone and event |
| Absolute rate change | New rate − old rate | In percentage points |
| Relative lift | New rate / old rate − 1 | Undefined when the baseline is zero |
| Average revenue per cohort user | Cohort revenue / eligible cohort size | Same horizon and currency; short-term revenue is not LTV |

Native experiment estimates may be modelled and need not equal a raw division.

## Comparable data

The full preceding 28 completed days is a planning default, not a law. Record exact dates, time zone,
report name, metric label, population and filters. Export the report and keep a capture of the filters
with its date. Repeat the same selection after publication, starting only once the public change is
verified. Tracking changed: break the series and explain.

Keep paid activity and releases in a dated event list (`E/06_Release.md`). Apple's source groups and
Play's Search/Explore groups are not interchangeable measures of organic traffic. Don't subtract ads
mechanically when attribution populations differ. No causal organic-lift claim follows from a pre/post
change alone.

## Experiment interpretation

Use the store's configured decision method and keep its intervals and status. Apple's Bayesian
confidence is not a frequentist p-value. Capture Play's settings and metric names at creation; conflicting
help wording is recorded, and the operator takes the conservative reading.

If the store's interval includes no improvement, or the store reports insufficient evidence: inconclusive, keep
the control. Quality outcomes without treatment assignment are aggregate monitoring, not
treatment-specific guardrails.
