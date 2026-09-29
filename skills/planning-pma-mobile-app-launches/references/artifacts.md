# Customer documents by mode

All paths below are relative to the current project. Author their proposed bytes only under the
fresh proposal directory; the CLI owns canonical writes. Keep documents usable without requiring
the customer to read state JSON. Cross-link related claim, decision, blocker, and research IDs.

## STRATEGY.md

For create/resume/update produce `launch/STRATEGY.md` containing:

- A concise engagement summary, mode/version, evidence boundary, method attribution, readiness,
  strongest blocker, accountable owner, pending human decisions, and next permitted action.
- Effective `app_platform` and `primary_market`, each with source `request`, `saved settings`, or
  `default`. Describe any conflict with a preserved project fact without overwriting it silently.
- A source/claim register with atomic state labels, source locations, dates/freshness, contradictions,
  and unknowns; it may be compact but every supplied fact remains traceable.
- Identifiable M1.S1–M1.S8 sections with the method outputs. Name SD1–SD5 where applied; identify
  SD5 as Factory-authored and conditional SD4 as a supplement. Address gaps explicitly.
- Readiness prerequisites and blocker table; phased work and dependency table; conditional tactics;
  measurement and learning decisions with human authority and evidence requirements.

Lead with decisions and evidence, not a generic framework explanation. Keep prospective action
language distinct from observed work. On resume preserve the completed frame; on update explain
affected decisions and retain unaffected ones.

## DECISIONS.md

For create/resume/update produce `launch/DECISIONS.md`. For each stable decision ID include the
question, claim-state label, evidence references, options, recommendation/reason, human decider,
approval status, blockers/prerequisites, and next action. A proposed recommendation is not a
customer-approved choice. Include unresolved targets, positioning, budget, consent/access,
legal/privacy, platform/release, and readiness authority when relevant. Preserve prior accepted
decisions unless changed evidence and human authority justify a revision.

## RESEARCH-BRIEF.md

For create/resume/update produce `launch/RESEARCH-BRIEF.md`, even when the list is empty. State
that live external research is unavailable and no requested research has been performed. For each
gap include the question, current known/unknown claim IDs, exact required evidence, primary-source
type, freshness/platform/market applicability, consent/access needs, owner or unknown owner,
completion condition, and decision it informs. Separate research from approval requests.
If no additional research is needed in the supplied record, say why; do not invent filler tasks.

## CHANGELOG.md

For resume/update/close produce `launch/CHANGELOG.md`. Preserve its entire prior bytes as a prefix,
if present; append a new entry headed `# Version N` using the actual integer version. Include mode,
source or reason, changed decisions, preserved decisions, unresolved unknowns, and owner actions.
Use those literal labels so structural validation can inspect the contract. Link decisions and
sources; explain continued work on resume, evidence impact on update, and closure-only changes on
close. No historical entry may be rewritten or removed.

## STATUS.md

For status produce only `launch/STATUS.md`. Report saved version and engagement status, completed
and outstanding method work, saved readiness, blockers, accountable owners, evidence gaps,
outstanding decisions, next permitted actions, and current setting values/sources. Identify
staleness or conflicting saved records as limitations without altering the assessment. Explicitly
state that this reports saved work and performed no new planning or research.

## CLOSURE.md

For close produce `launch/CLOSURE.md` and the changelog. Include mode/new version, planning
completed versus omitted/unresolved work, saved readiness and blockers, preserved decisions,
evidence limits, unverified outcomes, lessons supported by the record, owners and next actions,
and settings/sources. State that the engagement is closed and this workflow performed no launch;
business outcomes remain unverified unless explicitly supported by supplied evidence. Never
reinterpret closure as a fixed defect, satisfied prerequisite, approved launch, or measured result.

## Final customer message

After successful commit link all documents required by the selected mode. State mode/version,
readiness or closed status, strongest blocker and owner, research needs/unknowns, pending human
decisions, next permitted action, and setting values/sources. For status report the unchanged
saved version. For close retain the readiness limitation beside the closure status. Do not present
`STATE.json` or version snapshots as the primary customer outcome. On a failed commit report
incomplete delivery and the exact recovery need; do not link draft files as completed artifacts.
