# Launch state and commit contract

Read for every mode. Canonical files are under the current project's `launch/` directory.
Only `scripts/launch-state-cli.mjs` commits them. The pure `state-operation.mjs` handles declared
virtual paths; `launch-policy.mjs` applies this job's path/mode/schema rules. Neither is a second
runtime filesystem entrypoint. Their existence alone does not prove runtime availability.

## Contents

Read and route · Exact mode proposal sets · Construct JSON and digests · Commit and inspect ·
Failure and recovery

## Read and route

Read the current state, its referenced customer files, and current/prior versions before proposing
a continuation. Validate references and digests; treat corrupt or conflicting records as a refusal,
not an invitation to repair them manually. Support sparse saved method forms `PMA-M1` and
`PMA-M1-plus-SD1-SD5`; normalize absent fields in memory as unknown, never as evidence. Preserve
the exact bytes of every old version. Do not enrich sparse history in place.

Use the saved current integer version as `--expected-version`. For an empty create use `none`.
The next version is current plus one, or the first version on create, padded to exactly four digits
in `launch/VERSIONS/NNNN.json`. The policy validates allocation; never nest another `launch/`
inside the versions directory. Status allocates no version. Close changes status to `closed` while
retaining saved readiness, completed steps, evidence, blockers, and decisions.

## Exact mode proposal sets

| Mode | Files staged beneath the proposal directory |
|---|---|
| create | `launch/STRATEGY.md`, `launch/DECISIONS.md`, `launch/RESEARCH-BRIEF.md`, `launch/STATE.json`, first `launch/VERSIONS/NNNN.json` |
| resume / update | The three planning documents, `launch/CHANGELOG.md`, `launch/STATE.json`, next `launch/VERSIONS/NNNN.json` |
| status | `launch/STATUS.md` only |
| close | `launch/CLOSURE.md`, `launch/CHANGELOG.md`, `launch/STATE.json`, next `launch/VERSIONS/NNNN.json` |

Do not include preserved old versions or preserved close-mode planning documents in the proposal.
Never stage absolute/traversing paths, symlinks, undeclared outputs, deletions, or files beneath
`outreach/`, `spend/`, `app-store/`, or `production/`. Status preserves every other byte. Close
preserves the three planning documents and all prior versions. Every mode preserves unrelated
project files. A create target containing an engagement must be refused, not overwritten.

## Construct JSON and digests

Use SHA-256 of exact UTF-8 bytes, formatted `sha256:` followed by 64 lowercase hexadecimal digits.
Do not hash parsed/reserialized old JSON instead of its existing bytes. Preserve exact request bytes
for `requestDigest`. Choose a stable digest-format transaction ID for this intended transaction;
retain it with its exact proposal/request/pre-state for retries. It is an identity, not a claim
that a circular self-referential proposal hash is possible. Do not reuse it for different bytes.

First finish customer Markdown and compute `documentDigests` using project-relative paths as keys.
Include all current customer documents: create has the three planning documents; resume/update
also includes CHANGELOG; close includes the three preserved planning documents plus CHANGELOG
and CLOSURE. Hash preserved close documents from their current bytes. No state/version files
belong in this map. Then serialize the new version, hash its bytes, and serialize new STATE.
The version never hashes mutable STATE, so there is no digest cycle.

New `launch/VERSIONS/NNNN.json` uses these exact fields:

| Field | Value |
|---|---|
| `schemaRevision` | integer `1` |
| `version` | new integer version |
| `priorVersionDigest` | `null` for create; digest of exact previous version bytes otherwise |
| `transactionId`, `requestDigest` | the same digest strings supplied to the CLI |
| `mode` | selected mode |
| `completedSteps` | array of completed `M1.S1` through `M1.S8` IDs, without invented completion |
| `evidenceRefs`, `decisionRefs` | string arrays resolving to the source/claim and decision identifiers in customer documents |
| `readiness` | saved or newly reasoned recommendation string as applicable |
| `blockers` | string array of blocker descriptions with class/owner/evidence references as available |
| `documentDigests` | path-to-digest map described above |

New `launch/STATE.json` uses these exact fields:

| Field | Value |
|---|---|
| `schemaRevision` | integer `1` |
| `engagementId` | preserve existing ID; on create allocate an opaque local string ID without inventing a business fact |
| `owner` | supplied accountable owner string, or explicit `unknown` |
| `status` | `active`, or `closed` for close |
| `lastMode` | selected mode |
| `method` | `PMA-M1` |
| `supplements` | string array naming separately applied SD1–SD5 |
| `completedSteps` | identical to new version |
| `currentVersion` | new integer version |
| `previousTransactionId` | this committing transaction ID, as required by the adapter schema |
| `readiness`, `blockers`, `evidenceRefs`, `decisionRefs` | identical to new version |
| `externalResearch` | string explaining live research is unavailable; supplied evidence only |
| `documentDigests` | identical to new version |
| `currentVersionDigest` | digest of exact new version JSON bytes |

Status proposes no STATE or version and reports the existing version. The CLI checks schemas,
references, allowed writes, expected version, and history preservation; you still own semantic
agreement between prose, claims, and readiness. A structurally valid record cannot certify evidence
quality, human approval, or business outcomes.

## Commit and inspect

Create a fresh OS temporary proposal directory outside the project. Materialize only the exact
mode output files under its `launch/` paths. No separate manifest belongs in the proposal.

```text
node <skill-root>/scripts/launch-state-cli.mjs commit --project-root <absolute-project-root> --proposal-dir <fresh-temp-dir> --mode <create|resume|update|status|close> --expected-version <integer|none> --transaction-id <digest> --request-digest <digest>
```

Successful stdout is one JSON object with `status: "committed"` or `status: "unchanged"`, `mode`,
`version`, `transactionId`, `requestDigest`, `writtenPaths`, and `digest`. Check exit zero, matching
mode/identity/version and the mode's exact path set before delivery. An identical successful retry
can return unchanged without creating another version. Refusal has `status: "refused"` or
`status: "incomplete"` and `reason`, with nonzero exit. Missing, malformed, conflicting, or
non-success receipts prohibit a success claim; report the reason and next recovery action.

## Failure and recovery

The CLI owns its out-of-project journal/backups keyed by project identity and transaction ID.
Each invocation scans recovery state. An incomplete transaction restores the prior complete set
and reports incomplete without advancing version. A verified commit marker can reconstruct the
already-successful receipt. These are same-machine run recovery guarantees, not cross-machine
durability. Never delete journals, hand-fix current state, or bypass validation with direct writes.

The same transaction ID is retryable only with identical request/proposal/pre-state digests.
On a version conflict, stop and reread; require a separately authorized retry for a changed
transaction. On missing runtime code, unverified adapter, invalid references, path escape,
unexpected write set, or unrecoverable state, preserve canonical bytes and report the exact gap.
Do not claim that failed staging or a partially committed set completed the engagement.
