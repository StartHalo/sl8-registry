# ASO stages S01-S08: the work instructions

Source: Khalid's ASO guide, sl8-studio/sl8-resesarch `research/aso/v1.0/03_Guide/` (README, 01_Delivery_Map,
stages/S01-S08) @ 9616aff4, read 1 Nov 2026. Condensed only where the guide repeats itself (each
stage's template, status and message footer). Source IDs (A01, G03, T01...) resolve in
`research.md`; methods M1-M4 in `methods.md`; metrics in `measurement.md`; each store's fields and
console steps in `app-store.md` and `google-play.md`. The guide's stage boundaries, gates and recovery
rules are its own service design, not the method authors'.

**Roles.** The guide names a human team. Here the operator does the operator's and the analyst's
work (on an unclear metric, the cautious reading: unknown, inconclusive, keep the control); the
customer shows features, approves, publishes and gives console data; the separate checker checks each
deliverable; we make screenshots from the app's real screens unless the customer's designer does.

**The unit** is one app in one country (a lane), moved one stage at a time; each store's work has its
own folder **E** = `work/aso/<app>-<country>/<store>/cycle-<n>/` and its own report. Raw exports go untouched into `E/evidence/` with their export time and source.
Templates and the order: the `a01-aso` skill. The stage status is the lane's tasks in the log
(`agency status`), not a separate status file; client messages are core (comms lane).

**Operating rules (all stages).** One row per store/country/language and data period. Unknown is not
zero. Never copy one store's demand value into another. A draft is not approval, approval is not
publication, and publication is not measured success. When a gate fails, do the independent work and
keep the affected task `blocked` (or back to `ready` with what must change). Existing work satisfies a
stage only if its evidence and gate are there; never skip a stage because someone says it was done.
Mark every file's mode: LIVE, DRAFT or SIMULATED; a simulated result is never reported as the customer's.

A stage starts as soon as its Entry is met (S04 and S05 independently, neither waiting on the other's approval); evidence it could still use is asked for in the same email, never waited on. S06 can hold two windows in
sequence: metadata live and observed, then a creative test; record separate dates and baselines. Do
not change metadata during a creative test meant to isolate the creative.

## S01 · Intake: scope, truth and access

**Entry:** a goal this agency fits. **Out:** `E/01_Intake.md`.

1. **The record.** Fill `01_Intake.md`: app ids and URLs, store, country, language, app version,
   audience, verified features, business objective, exclusions, who decides on the customer's side,
   who publishes, time zone. Record the real date. A hypothetical app: every file SIMULATED.
2. **Product truth.** Ask the customer to show each claimed capability in the current build (a customer
   task; a screen recording or screenshots will do). Record feature → screen/version → who showed it.
   Planned features apart. Write a one-sentence objective with a metric, population, baseline period and
   review date; a target is a desired outcome, never a promised uplift.
3. **Access and resources.** List: console analytics read access, who can edit and publish, analytics
   exports, current listing assets, review exports, a product contact. Record invitation status, never
   passwords. Keyword tool: provider, export, cost, expiry; existing tools first; no purchase beyond the
   engagement's budget. Without one, continue with observed suggestions and reviews and mark demand and
   rank unknown. Name the designer and native reviewer when those branches apply.
4. Record each missing input as a customer task with its date; then add S02's task.

**Done when:** scope, owners, feature evidence and access status are explicit; every unknown has an
action; missing access blocks the affected live task, not offline drafting.
**Recovery:** a claim that can't be checked is quarantined from metadata. "More downloads" is made
specific (store, market, metric, period) before S02.

## S02 · Audit: baseline and diagnosis (M1)

**Entry:** S01 done. **Out:** `E/02_Baseline.csv`, `E/02_Audit.md`, `E/02_Reviews.csv`.

1. **A comparable baseline.** A complete period covering normal weekly variation (default 28 days).
   Record store, market, language, acquisition source/state, dates, time zone, app/listing version and
   metric definition; raw exports in `E/evidence/`. Where a console can't filter language or give a
   metric, write unavailable; never invent a segment. Apple impressions and downloads stay apart from
   Play listing visits, clicks and acquisitions (`measurement.md`).
2. **Diagnose with M1.** One row per finding: observation, evidence, likely explanation, competing
   explanation, proposed action, confidence, owner. Look at visibility, listing persuasion, product and
   review friction, and measurement gaps. Compare three genuinely relevant competitors in the same
   store and locale (URL, capture date, wording and assets, similarity); competitor design is
   inspiration, not proof it converts. No composite score.
3. **Reviews.** Sample up to 50 recent reviews with a recorded time range and selection rule, low and
   high ratings. Per row: review id, short excerpt or paraphrase, rating, issue, feature relevance,
   action, owner. Report sample size and bias. Crashes, payment and support issues go to the customer's
   product team. A reply draft names the actual issue, offers a supported next step, asks for no
   personal data in public, promises no fix and rewards no rating (A07).
4. **Select work.** One primary opportunity, and why the rest waits. If visibility and conversion
   can't be told apart, start with measurement repair.

**Done when:** numerators and denominators named; each finding has evidence and its uncertainty; the
selected work has an owner. **Recovery:** broken tracking: affected rates unavailable, repair assigned.
Tiny or seasonal sample: extend the observation or use qualitative research; a low count is not a
performance failure.

## S03 · Keywords: research and select (M2)

**Entry:** S02 done; verified feature list. **Out:** `E/03_Keywords_Raw.csv`, `E/03_Keyword_Decisions.csv`.

1. **Candidates.** One term per store/country/language. Seed from the app's own language, review
   phrases, relevant competitor listings and observed store suggestions; each with its source (URL,
   export row or review id) and capture date, exact query and context. AI suggestions are ideas until
   checked, not observed demand.
2. **Enrich without mixing units.** With a tool, export volume, difficulty, chance and current rank with
   provider, market, store, date and the provider's definitions. Blank with a reason when unavailable.
   Never average vendors' scales or compare Apple volume with Play volume; keep the original export.
   Cluster by intent and verified feature; check ambiguous terms in the real store results.
3. **Decide.** First reject misleading or unsupported intent and competitor brand names. Then: **Keep**
   (relevant, observed existing value), **Test** (relevant, supported by opportunity evidence),
   **Later** (relevant, unmeasured or unattainable now), **Reject** (with reason). These labels are the
   guide's convention, not a vendor score. Compare demand and competition only within one
   provider/store/locale, with the trade-off in a sentence. No paid metrics: a low-confidence shortlist
   from observed language and suggestions, market size unknown.
4. **Review the shortlist** against product truth and raw provenance; record the target field and what
   observation would change the decision. A small useful set; no target number of keywords.

**Done when:** every decision joins a candidate; selected terms fit the app; original units kept;
unsupported terms excluded. **Recovery:** conflicting vendors: keep both apart, pick one provider for
the cycle, note the uncertainty. No tool: qualitative selection; never fabricate volume or use the
retired weighted score.

## S04 · Metadata and localisation (M2)

**Entry:** S03 done. **Out:** `E/04_Metadata.md` (with its counts).

1. **A change set.** Keep current field values, write proposed values, map terms to fields, explain each
   change. Apple: name, subtitle, keyword field, readable description. Play: title, short and full
   description. Never copy Apple's keyword list into Play prose; never claim a phrase will rank because
   it is in the metadata.
2. **Field QA.** Count the exact final strings, spaces and punctuation included. Apple keyword field in
   UTF-8 bytes (`verify.py` counts both); characters alone are not enough. Limits in the store's
   reference; recheck the live help before a live cycle. Check feature truth, grammar, brand ownership,
   unintended claims, duplicated keyword allocation and rendering. Keep a recovery copy of current
   values. A count pass is not policy approval; the console's validation is the final field check.
3. **Localisation, a branch.** Does evidence support another language or market? Then a separate
   shortlist and localised draft; translating the English list is not proof of local demand. Record
   locale, local query evidence, product-language availability, native reviewer and screenshot-language
   consistency. No evidence or reviewer: the locale is deferred (logged), a draft can't go live.
4. **Version-specific approval.** The customer approves the exact copy version (a customer task):
   who, date, version, changes asked. Don't ask twice for an approval already recorded. Lock copy during
   a later creative test.

**Done when:** change set, counts, original values, term mapping and approval record; every release
locale passed its own gate or is excluded. **Recovery:** overflow: edit the string and recount all
fields. Unsupported benefit: remove it or get product evidence. Wording changed by the customer: rerun
counts and term mapping.

## S05 · Creatives and the test plan (M3)

**Entry:** audit and target intent done. **Out:** `E/05_Creative_and_Experiment.md` (and real assets for a live run).

1. **The question.** Research observation → user motivation → hypothesis → primary metric → decision.
   Name the control, one treatment and the single purposeful difference. State the competing
   explanation and what a neutral result means.
2. **Brief and QA the assets.** Exact caption text, screenshot order, the current app screen each needs,
   device and locale. Genuine current product screens only; never a fabricated feature. Record file
   names/versions; check store specs, legibility at listing size, truthful claims, language consistency.
   Control and treatment comparable; unrelated screens unchanged.
3. **Settings, before launch.** Apple product page optimisation or Play store listing experiment (the
   store's reference). Record eligible population, randomisation unit as the store documents it, primary
   metric and denominator, allocation, start rule, end/review rule, confidence/decision settings,
   minimum useful effect and feasibility (the console's estimate where it gives one). Guardrails, and
   whether treatment-level quality data exists. Never pool tests across stores or paid landing pages.
4. **Readiness.** Freeze metadata, unrelated assets and other planned changes for the test; name who can
   pause it. An empty settings field is a blocker.

**Done when:** a complete brief, reviewed real assets (live), settings, feasibility and a decision rule.
A simulation holds labelled briefs only. **Recovery:** too little traffic: one treatment, a larger
meaningful effect if justified, or defer the test; a qualitative audit is not an A/B result. No valid
assets: back to the designer; never launch placeholders.

## S06 · Release: publish, verify, start the test

**Entry:** S04/S05 done for the exact live scope; the customer's team holds the console.
**Out:** `E/06_Release.md` (release and test events, incidents).

1. **Preflight** (with the customer's publisher): right app, store, locale, version, permission,
   approved change ids, original values, window, who recovers. All pending changes inspected;
   unrelated queued changes excluded. Console capability checked against the store's reference; a
   documentation conflict is recorded and only a verified path used.
2. **The metadata window.** The customer's team enters the approved fields, previews, compares each with
   the approved file, submits. Record states apart: Draft, Submitted, Approved, Published, Verified. Save
   is not publication. After availability, we read the public listing in the market and language
   (`agency-store-reads`) and keep a dated capture. Propagation pending: the task waits. No creative test
   until the listing is stable and the metadata observation window has ended.
3. **The creative window.** Per the store's reference. Record actual console settings and asset/version
   ids; compare with S05; confirm review state and start time; keep control and allocation proof. Watch
   for setup failures and concurrent changes. Never reinterpret the store's confidence method. If the
   console can't support the planned population or metric, revise S05 first.
4. **Recover.** Wrong metadata or asset: stop further changes, tell the customer, restore the approved
   previous values through the review path, verify the public state; no promise of instant rollback.
   Test issue: stop or pause where supported, keep the evidence, mark the run invalid, plan a new one.
   The launch is told to the customer only once its state is verified.

**Done when:** exact approvals, submission/publication/verification evidence and the actual test
configuration. Missing evidence: the task stays waiting or blocked. **Recovery:** access denied or review
rejected: reason, owner, correct and resubmit; never "Published". Unrelated queued changes: isolate first.

## S07 · Measurement: measure and decide (recurs)

**Entry:** S06 verified and the observation period complete. **Out:** `E/07_Observations.csv`, `E/07_Results.md`.

1. **Compare periods.** Export the same fields and filters as S02; keep originals. Check dates, weekday
   coverage, definitions, time zones, traffic sources, acquisition state, version changes, missing rows.
   Rates from counts; absolute change in percentage points, relative change apart. Name seasonality,
   paid campaigns and product changes. A pre/post difference is an observation, not proof the metadata
   worked.
2. **The randomised result.** Keep the store's experiment id, metric, population, allocation, dates,
   counts, intervals and status. Apply the predeclared rule. Never derive Apple's Bayesian label from a
   z-test or pool Play clicks with installs. Check technical validity first. No valid conclusion:
   inconclusive, keep the control (unless the customer has a documented non-performance reason).
3. **Product quality.** Activation and retention with explicit cohorts and maturity. Without treatment
   assignment it is aggregate monitoring, not proof the treatment preserved quality. A higher click rate
   alone is not more retained customers.
4. **Next action:** Keep / Adopt / Revise / Retest / Stop, with evidence, uncertainty and owner. Adopting
   a winner is a separate approved and verified change (S06).

**Done when:** counts reconcile; definitions match or the difference is disclosed; the store's status is
kept; inference proportionate; the next action has an owner. **Recovery:** missing denominator or changed
definition: no comparable rate. Lost randomisation: no causal reading. Insufficient evidence: extend only
within the planned rule, or close inconclusive; never wait selectively for a positive result.

## S08 · Handover: the report and the next cycle

**Entry:** S07 done, including a justified inconclusive or blocked result.
**Out:** `E/08_Client_Report.md` (the report the customer gets, per store), `E/08_Roadmap.md`.

1. **The report:** objective, scope, changes delivered, verified live state, outcome with numerator,
   denominator and dates, the test decision, limits and next action. Link the source files; plain
   language; spell out ASO terms on first use.
2. **The roadmap:** each item with its reason and evidence, priority, dependency, owner, review date,
   output and done condition. Include review/support issues and unresolved language or measurement work.
   A rejected hypothesis returns only with new evidence. Optional expansion apart from committed work.
   The roadmap's committed items become the next cycle's tasks.
3. **Operational control.** The next run can find the current metadata and assets, active tests and
   previous values in E. No credentials anywhere. Access removal or transfer is the customer's, tracked,
   never assumed done.
4. **Close.** Every stage gate checked; a deferred live rollout stated as such.

**Done when:** report, prioritised roadmap and an evidence index; remaining blockers have owners; no
hidden promise of publication or efficacy. **Recovery:** if the next run can't find an input or explain
its next task, fix the files and repeat that check.
