# ASO methods: M1-M4, their roles and how they combine

Source: Khalid's ASO guide, sl8-studio/sl8-resesarch `research/aso/v1.0/02_Methods/` (README, M1-M4) @ 9616aff4,
read 1 Nov 2026. Source IDs in `research.md`. The sequences, Keep/Test/Later/Reject labels, one-change
convention and file names are the guide's service adaptation, not the method authors' formulas.

| Method | Job | Distinctive decision | Status |
|---|---|---|---|
| M1 Phiture ASO Stack (P01, P02) | Diagnose the whole opportunity | Visibility, conversion, supporting insight and quality together | Selected: diagnosis (S02) |
| M2 AppTweak keyword workflow (T01, T02, T03) | Research and target relevant search demand | Audit → discover → relevance, then metrics → field targeting → monitoring | Selected: keywords and metadata (S03, S04, S07) |
| M3 SplitMetrics experimentation (X01) | Test creative and message hypotheses | Eight steps from research to sharing and back to a hypothesis | Selected: creatives and tests (S05-S07), on the stores' native tests |
| M4 Phiture keyword optimisation cycle (P03, P04) | Keyword prioritisation and allocation | Backlog, relevance multipliers, value per character | Alternative, not activated |

## M1 · Phiture ASO Stack (diagnosis)

Visibility and conversion are linked, with tools and other influences supporting both (P01); the 2026
Redux adds discovery surfaces, quality and creative operations (P02). A coverage framework, not a
numbered SOP. Use it when the ask is simply "improve ASO" or one metric moved without a known cause: it
stops keyword edits being chosen before audience, conversion or product problems are checked. It
establishes no causal effect, ranking weight or priority order.

1. S01 verifies the product and the objective.
2. S02: separate rows for search/discovery, listing conversion, reviews, localisation, product quality;
   each with one observation or an explicit missing-evidence entry.
3. Facts apart from suspected mechanisms (an old headline omits routine planning: fact; adding it will
   lift conversion: hypothesis).
4. One main issue with evidence and an actionable next step; the rest is a backlog, not launched together.
5. Search → M2; message or creative uncertainty → M3; product faults → the customer's engineers.
   Reassess after S07.

Each finding has evidence, an action, an owner and a limit on the conclusion. Missing analytics allows
a descriptive audit, not a growth estimate. P02's numerical crash-to-visibility effect is an unverified
vendor claim, not a threshold.

## M2 · AppTweak keywords and metadata

Research, prioritise, target, adjust (T02); preparation covers goals, audience, current metadata and
performance, competitors, benchmarks; selection weighs relevance, demand and attainable competition.
T01 pp.4-19 gives discovery and localisation examples and the historical vendor metric KEI.

Inputs: verified features, one store/country/language, current metadata, dated keyword observations,
a provider export if authorised. Keep the vendor's columns beside the decisions; never relabel simulated
or hand-judged values as AppTweak output. Sequence: audit retained terms; gather candidates; confirm
product and intent fit; compare available demand and competition; shortlist; allocate to the store's
fields; inspect the published result; reassess on comparable observations.

Boundaries: unsupported intent is excluded whatever its demand. Useful existing terms stay unless a
documented reason removes them. Missing demand stays unknown. Vendor estimates support judgement; they
don't forecast installs. A literal word match in metadata is a coverage check, not evidence of indexing.
No recreated KEI and no weighted score (the earlier 35/25/20/20 score with its cutoff of 85 is retired).
Without vendor data, a provisional shortlist with an evidence request, never a precise-looking ranking.
Validate: traceability, truthful feature fit, original units, locale separation, field limits, and
whether the declared measurement tests the objective. M2 does not replace creative tests, product fixes
or a causal design.

## M3 · SplitMetrics testing framework, on native store tests

X01's eight stages: research, ideation, hypothesis, variant selection, execution, analysis, sharing,
back to hypothesis; its examples tie audience motivation to creative choices. X01 uses external page
tests and bought traffic; those results don't establish native-store lift. Here the sequence runs on
Apple's or Play's native test, with settings, statistics and rollout from the store's documentation; one
record per store.

1. Take S02 audience and competitor evidence and S03 intent decisions.
2. At least two plausible creative ideas, each tied to an observation.
3. One hypothesis, one changed asset for the first test; say how it could fail.
4. A versioned control and treatment brief listing everything unchanged.
5. S06's eligibility, metric, allocation, duration and release checks before activation.
6. S07 keeps the native result and its uncertainty: better, worse or inconclusive.
7. S08 explains the decision and its limits.
8. The next hypothesis goes to the roadmap with what was learned.

Don't run when: no usable traffic, misleading assets, an unstable target definition, no approval to show
variants, or overlapping changes that spoil the question. Resolve it or report readiness; never invent
an outcome. A broad concept test shows bundle performance, not each element's effect.

## M4 · Phiture keyword optimisation cycle (alternative, not activated)

Backlog, relevance multipliers and value per character (P03, P04; https://phiture.com/resources/keywords-tool/);
not used until its original sheet is obtained and checked, and never blended with M2's or a made-up score.

## How they combine (D01-D05) and which to use

- **D01** M1 + M2 complement: M1 finds a search issue, M2 makes the keyword record and proposal. M1 does
  not weight keywords.
- **D02** M1 + M3 complement: M1 finds a conversion or promise mismatch, M3 tests it. A low conversion
  number alone doesn't say which asset is wrong.
- **D03** M2 + M3 complement in sequence: chosen intents inform creative hypotheses. Freeze metadata
  during a creative test, or record the contamination and claim no cause. No shared success metric.
- **D04** M2 and M4 are alternatives for the same work: never blend their scores or claim both ran.
- **D05** Native and external (SplitMetrics) tests are alternative environments: the research and
  hypothesis cycle transfers; sampling, outcome definitions, statistics and controls don't. An external
  test needs its own budget in the engagement's parameters.

Which to use:
1. No verified product facts or baseline: S01-S02 before any change.
2. A product or reliability defect affects the promise: tell the customer's product team, pause that
   claim, carry on with unaffected research.
3. Supported intents missing or weak in the listing: M2 in S03-S04.
4. Messaging or visuals may not explain verified benefits, and there is eligible traffic: M3 in S05-S07.
5. Little traffic: a prioritised hypothesis and readiness report; never a manufactured winner.
6. A new market: the same research per store and locale (S04's localisation branch), never a literal
   translation of the US list.
