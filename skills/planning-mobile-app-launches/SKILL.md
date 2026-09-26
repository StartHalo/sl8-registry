---
name: planning-mobile-app-launches
description: Creates and maintains an evidence-labelled mobile-app launch strategy, prioritized operating path, measurement design, and durable decision state without inventing authority or results. Use when the user asks to create, plan, resume, update, report status on, or close the strategy for one mobile-app launch.
---

# Planning mobile-app launches

**Version:** 1.0.0

This skill turns a mixed or sparse case file into one review-ready strategy and the durable state
needed to continue it later. It recommends; it does not approve, publish, spend, operate a store or
campaign, or claim future performance.

## Contents

Settings · Working rules · Workflow · Strategy contract · State contract · Evidence and platform
rules · Authority and action boundaries · Defaults

## Settings

Resolve all 14 settings before strategic work. For each setting, use this precedence:

1. A value supplied in the current request wins for this job.
2. Otherwise use its filled-in value under `## Settings` in the already-loaded `bot/user.md`.
3. Otherwise use the value in this skill's `## Defaults` table.

Never stop merely because a setting is blank. Where the default is unknown or unverified, preserve
that state and make recommendations conditional. In both `LAUNCH_MARKETING_STRATEGY.md` and
`launch-state/STATE.md`, include a resolved-settings table with the setting, resolved value, and
source: `request`, `bot/user.md`, or `default`.

## Working rules

- Keep the boundary to one declared launch. Do not silently widen strategy work into release
  management, asset production, or campaign operation.
- Preserve each value's input-contract status label; also distinguish a supplied fact, human
  decision, derived recommendation, assumption, conflict, and unresolved question.
- Continue autonomously. Put high-consequence questions in the record, then use labelled hypotheses
  or conditional options rather than waiting for an answer.
- Make the chain inspectable: evidence or explicit gap → rationale and options → prioritized or
  conditional recommendation → owner and approval → first action → measure and change rule.
- Derive framework, channel roles, message direction, and measures from the case. Do not start with
  a predetermined framework, channel mix, KPI set, channel count, or outcome threshold.
- Maintain one canonical strategy. A timeline, checklist, status view, or asset plan may be a
  traceable section, not a competing source of truth.
- Treat the peer Amplitude launch-strategy skill's tier-aware planning and backward planning from a
  known launch date as useful conditional rules, not mandatory structure: cite the
  [source skill](https://raw.githubusercontent.com/amplitude/builder-skills/main/launch-skills/skills/launch-strategy/SKILL.md)
  when applying that precedent.

## Workflow

Copy this checklist into the working context and complete it in order.

```text
- [ ] UC1.1 Resolve settings and locate prior launch state
- [ ] UC1.2 Normalize the case and choose create/update/status/close mode
- [ ] UC1.3 Research audience, demand, category, and competitors
- [ ] UC1.4 Audit product and platform readiness conditionally
- [ ] UC1.5 Frame or refine the objective
- [ ] UC1.6 Derive positioning and message direction
- [ ] UC1.7 Prioritize launch motion and channel roles
- [ ] UC1.8 Design store and discovery strategy
- [ ] UC1.9 Sequence the operating path
- [ ] UC1.10 Build the measurement and learning loop
- [ ] UC1.11 Assemble, self-check, persist, and render
```

### UC1.1 · Resolve settings and prior state

- Apply the settings precedence above and record every source.
- Use the existing `artifacts/<project>/` when the request clearly identifies it. Otherwise derive
  one stable filesystem-safe project slug from the launch identity; if the identity is absent, use
  `launch-strategy` and mark that path choice as derived.
- If `launch-state/STATE.md` exists, read it, the immediately previous immutable snapshot, and the
  tail of `LOG.md`. Do not reconstruct history from the reader-facing strategy alone.
- Do not overwrite or reset an existing launch because a new request is sparse.

### UC1.2 · Normalize and classify

- Classify the invocation as `create`, `update`, `status`, or `close`. An update changes the current
  recommendation; status reports the current state without manufacturing progress; close records
  the supplied closing basis and remaining obligations.
- Normalize every settings group into durable state. Retain source, value status, and whether each
  entry is a fact, decision, recommendation, assumption, conflict, or question.
- Deduplicate repeated material without dropping disagreements. Show each conflict and what would
  settle it.
- Surface questions that could reverse the plan: product/build readiness, approval authority, hard
  timing or budget, and regulated, privacy-sensitive, or child-audience scope. Continue with safe
  conditional branches.
- Describe the delta from prior state. On create, say that there was no prior version.

### UC1.3 · Research audience, demand, category, and competitors

- Keep four evidence pools distinct: public market evidence, supplied first-party evidence,
  official platform rules, and company-only facts or decisions.
- Cluster needs, contexts, barriers, language, and behavior. Compare alternatives on promise,
  proof, pricing or offer, keywords, reviews, creative pattern, and route to discovery only where
  evidence exists.
- For each material external claim, provide a resolvable citation, source date when available,
  evidence strength, limitation, and implication. Prefer primary and current sources.
- A named interview set, survey, analytics export, attachment, or URL is not evidence read unless
  its contents were actually available. Record unavailable contents rather than inferring themes
  from a filename or count.
- Separate observation from inference and hypothesis. State what evidence would confirm or reverse
  the audience choice.

### UC1.4 · Audit product and platform readiness

- Branch on `platforms_and_stores`; do not apply one store's vocabulary or requirements to another.
- Compare the supplied build, listing, metadata, assets, localization, audience/privacy, analytics,
  timing, and policy state with applicable official requirements.
- State what is supplied, what an official source supports, and what remains to be verified in the
  relevant console. Never claim console access or verification.
- Cite official Apple sources for App Store claims and official Google sources for Google Play
  claims. If no platform is known, provide a platform-selection verification gap instead of
  store-specific advice.
- Treat live eligibility, review timing, experiment availability, and account permissions as
  unverified until supplied or observed.

### UC1.5 · Frame the objective

- Define the one-launch boundary: product/build state, platform, market and locale, lifecycle
  segment, horizon, constraints, and named owner.
- Convert a broad ambition into one primary outcome plus diagnostic measures only when the evidence
  supports that choice. Record rationale and rejected alternatives.
- Name source, baseline, target or threshold, window, and owner where supplied. Leave missing
  numeric values unresolved; never invent a target so the plan appears complete.
- Mark the objective `provisional` until the named business approver accepts it.

### UC1.6 · Derive positioning and message direction

- Connect the selected audience's evidenced need and context to a differentiated promise, desired
  action, product truth, permissible proof, alternatives, and brand or policy constraints.
- Label every proposed claim as approved, pending approval, unsupported, or prohibited by a known
  constraint. Generated wording is not approved proof.
- Show the recommended direction, plausible alternatives, why the recommendation leads, and the
  evidence or decision that would change it.

### UC1.7 · Prioritize launch motion and channel roles

- Generate candidates from the audience, objective, product readiness, available reach, capacity,
  timing, measurement readiness, and authority—not from a generic channel checklist.
- Evaluate each candidate on audience fit, objective contribution, readiness, capacity and cost,
  measurability, evidence strength, dependency, and risk.
- Assign prioritized roles such as primary, supporting, experiment, conditional, or exclude as the
  case supports. Name exclusions and tradeoffs.
- For every selected or conditional route, state the owner, approval needed, immediate first action,
  and evidence that would scale, revise, pause, or exclude it.
- Authorized paid spend defaults to zero. A recommendation may prepare a paid option but may not
  commit budget or imply permission.

### UC1.8 · Design store and discovery strategy

- Translate product truth and positioning into platform-specific metadata direction, creative
  direction, localization needs, discovery priorities, and test hypotheses.
- Keep iOS/App Store and Android/Google Play terminology, requirements, and measurement separate.
- Link each applicable readiness or measurement claim to an official platform source. Label
  supplied listing state separately from what must be verified in a console.
- Recommend experiments only when eligibility, traffic, assets, decision ownership, and a learning
  rule can be stated. Do not claim an experiment was configured or run.

### UC1.9 · Sequence the operating path

- Build a scanable pre-launch, launch, and post-launch path appropriate to the selected motion.
- Each milestone names purpose, accountable owner or unassigned owner, dependency, approval,
  resource or budget assumption, time window or condition, risk, contingency, and next action.
- Use relative sequencing when the date is unknown. If an immovable date is supplied, work backward and
  identify readiness conditions that threaten it.
- Keep publication, store changes, campaign activation, spend, and external communication as
  human-owned acts. The strategy may prepare the decision surface but cannot perform the act.

### UC1.10 · Build the measurement and learning loop

- Map the primary objective through lifecycle events and diagnostic measures. Define each measure,
  source, baseline, target or threshold, window, cadence, and owner; mark gaps explicitly.
- Do not substitute a list of common KPIs for definitions tied to the chosen objective and route.
- State the hypothesis behind each material recommendation and the observation that would support
  or weaken it.
- Propose a review cadence for human approval. Give conditional scale, revise, pause, or stop rules;
  rules depending on unresolved thresholds remain proposals.
- Separate the pre-launch quality verdict from future performance. No result exists until an
  authorized owner supplies an observation.

### UC1.11 · Assemble, self-check, persist, and render

1. Build the canonical strategy to the `## Strategy contract` below.
2. Build the compact current state to the `## State contract` below.
3. Write a new immutable snapshot before replacing an existing current state. Never rewrite an old
   snapshot.
4. Append one log entry; never replace or reorder earlier entries.
5. Refresh `LAUNCH_MARKETING_STRATEGY.md` from the current state and decision chain.
6. Run the self-check. Repair any safe defect before ending.

Self-check: all 14 settings and sources disclosed · all 14 normalized groups preserved with status
and provenance · one-launch boundary clear · external claims cited · unread material identified ·
platform branches correct · facts and recommendations distinct · choices prioritized · rejected
alternatives visible · owners and approvals explicit · authority never inferred · operating path
feasible · measures defined · change rules present · strategy and state agree · version advanced ·
snapshot immutable · log appended · delta stated · no template markers remain.

If an unknown, conflict, unavailable source, or absent authority prevents a safe unique choice,
still write the complete conditional record and report the job as `partial`. Otherwise report it as
`delivered`. A status-only or close request must still persist its new lifecycle event.

## Strategy contract

Write `artifacts/<project>/LAUNCH_MARKETING_STRATEGY.md`. It is the reader-facing source of truth
and should make these surfaces easy to scan:

- document status, launch identity, state version, lifecycle mode, boundary, owner, approver, and
  changed-since-last-run summary
- resolved settings with source; facts, conflicts, assumptions, unresolved questions, and approval asks
- evidence ledger and audience decision, including strength, limitations, and reversal evidence
- objective, positioning and message direction, prioritized motion/channel roles, exclusions, and
  the evidence-to-choice rationale
- conditional platform/store readiness and discovery guidance with official citations
- pre-launch, launch, and post-launch operating path with ownership, dependencies, contingencies,
  approvals, and immediate actions
- measurement and learning design with sources, gaps, cadence proposal, hypotheses, and conditional
  scale/revise/pause rules
- rejected alternatives, risks, decisions awaiting approval, and next resume point

Label it a review-ready draft unless the durable approval history contains an explicit approval by
the named authority. A title such as business approver does not itself prove authority.

## State contract

Maintain these paths under `artifacts/<project>/launch-state/`:

- `STATE.md` — compact current state: launch identity and version; mode/status; resolved settings;
  all normalized values with status, provenance and type; evidence index; decisions and rejected
  alternatives; approvals and authority gaps; operating status; measurement definitions and latest
  authorized observations; conflicts, questions, risks, and next resume point.
- `LOG.md` — append-only entries with timestamp, resulting version, requested mode, sources read,
  decisions added or changed, approval events, observations added, unresolved gaps, and outcome.
- `VERSION-<version>.md` — immutable snapshot of the resulting state for this invocation, including
  a `Delta` section against the prior version. Keep the snapshot directly under `launch-state/`;
  never create a nested `versions/` directory. Use the literal `VERSION-` prefix followed by the
  monotonically increasing integer, for example `VERSION-1.md`.

Use a monotonically increasing version. A new invocation always creates a new snapshot and log
entry, even when the delta is “status checked; no authorized factual change.” Never turn a proposed
approval into an approval event. On close, record who supplied the closing basis, what was actually
observed, and what remains unresolved.

## Evidence and platform rules

- Cite external facts close to the claim. A citation must support the specific statement made.
- Official platform documentation controls platform behavior; secondary sources may explain craft
  but cannot override a platform contract.
- For Apple branches, distinguish supplied readiness from App Store Connect verification and use
  Apple-specific listing, acquisition, analytics, and experiment vocabulary.
- For Google branches, distinguish supplied readiness from Play Console verification and use
  Google Play-specific listing, reporting, and experiment vocabulary.
- Never claim eligibility, live account state, analytics access, review completion, campaign
  results, or attachment contents that were not observed.
- When sources conflict, preserve the conflict, prefer the more authoritative/current source for a
  provisional branch, and name what a human must verify.

## Authority and action boundaries

- Never infer claim, legal/privacy, date, budget, spend, publication, store-action, or campaign
  authority from a title, role label, or request to draft a strategy.
- Route each commitment to its supplied owner; otherwise mark the authority `unassigned`.
- Do not create final customer-facing campaign assets, publish, send, deploy, buy, activate, change
  a store listing, configure an experiment, or operate an advertising or analytics console.
- Do not present a recommendation as approved, an external action as completed, or future
  performance as observed.
- Legal, privacy, policy, and regulated-category judgments remain with qualified human owners. Name
  the issue and the required verification without pretending to resolve it.

## Defaults

| Setting | Default |
|---|---|
| `product_build_and_store_state` | `unknown` |
| `launch_motion` | `unspecified` |
| `platforms_and_stores` | `unknown` |
| `markets_and_locales` | `unknown` |
| `audience_and_lifecycle_segment` | `unknown` |
| `category_and_policy_profile` | `unverified` |
| `positioning_status` | `derive_provisional` |
| `monetization_and_offer` | `unknown` |
| `launch_objective` | `derive_provisional` |
| `date_and_flexibility` | `undated_and_flexible` |
| `budget_resources_and_channel_constraints` | authorized paid spend `0`; use supplied capacity |
| `roles_and_approvals` | requester may own strategy review; other authority is `unassigned` |
| `assets_evidence_and_reach` | use supplied material; assume no other proof or reach |
| `measurement_readiness` | `unverified_no_baseline` |
