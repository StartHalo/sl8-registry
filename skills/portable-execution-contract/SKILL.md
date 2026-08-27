---
name: portable-execution-contract
description: >
  Enforce and grade the harness-neutral SL8 run contract after a tuple and agent bundle are
  selected. Use for RunSpec construction, normalized event/state handling, evidence-packet
  validation, reconnect or cancellation truth, lifecycle receipts, multi-agent bounds, legacy
  output compatibility, or named portable QC failures. Do not choose a harness/model or assemble
  the bundle here; use harness-selection and portable-agent-bundle first.
---

# Portable execution contract

Treat the outer SL8 controller as the owner of correctness. Harness adapters translate native
input, events, interrupt, resume, and hooks. They do not define a second state machine, lifecycle,
or output contract. No downstream UI, grader, Market bot, Lab proof, or Studio workflow may parse
raw vendor output.

## Preconditions

Require these inputs before launch:

- a resolved exact tuple whose availability is `certified` for the current immutable image and
  20-character E2B template ID;
- an immutable prepared bundle with matching closure and archive digests;
- a RunSpec with task, workspace, run root, exact harness/mode/provider/model, requirements,
  agent name, and positive `maxCostUsd`;
- signed certification evidence verified with the control-plane-pinned external attestor key;
- provider credentials injected by SL8 provisioning, referenced by name, and passed only through
  the sandbox controller allowlist; never copied from a host test runner.

Reject uncertainty before spend. Never repair an uncertified tuple, mismatched bundle digest, or
unsupported capability by silently choosing another harness or model.

## Durable execution

Launch only through `sl8-harness run`, `launch`, or `fanout`. Persist controller state under the
run root as it changes:

- append-only normalized events with unique IDs and contiguous sequences;
- one derived snapshot whose cursor never exceeds the journal;
- a durable run handle binding the SL8 session to the vendor session/process;
- child tree, parent inbox, completion receipts, and unique task roots for fan-out;
- raw adapter output for diagnosis, never for consumer logic.

The canonical states are `queued`, `starting`, `running`, `waiting`, `blocked`, `cancelling`,
`completed`, `failed`, `cancelled`, and `abandoned`. Only `completed`, `failed`, `cancelled`, and
`abandoned` are terminal. Process exit without a matching semantic terminal event is not success.
An interrupt becomes `cancelled` only after the adapter confirms termination. A rejected,
unobservable, or timed-out stop becomes `abandoned`. If terminal truth wins the race before an
abort, preserve that terminal state.

Reconnect by SL8 session ID, never by the newest process. Require the same vendor handle and
replay strictly after the supplied cursor. A restarted controller must reconcile the durable
handle/journal before continuing; if it cannot prove ownership, mark the run `abandoned` rather
than starting a duplicate invisibly.

## Controller-owned lifecycle

Before execution, load memory into the prompt and snapshot protected paths. After semantic
completion, the outer controller must:

1. audit all writes and reject protected-path mutation or symlink escape;
2. inventory and hash every declared artifact;
3. synthesize summary/index and append the daily memory archive;
4. render the dashboard;
5. finalize the normalized snapshot and evidence packet;
6. project the legacy `run.json`/`output.json` contract.

Harness-native hooks may add early interception when certified. Correctness never depends on a
vendor hook existing. A workflow that requires universal pre-tool blocking must fail closed on a
tuple without proven pre-tool interception.

## Named QC vocabulary

These stable codes have one semantic home here and one executable implementation in
`@starthalo/agent-runtime`. Preflight, self-check, receipt generation, and graders must call that
implementation; they must not recreate the rules.

| Code | Failure | Required response |
|---|---|---|
| `QC-01_TUPLE_TRUST` | Tuple is not exact, certified, or image/template-bound | Reject before driver construction or spend |
| `QC-02_PROMPT_ORDER` | Process/setup/user/memory/task order or hashes drift | Reject the prepared run |
| `QC-03_SKILL_CLOSURE` | Requested, discovered, and projected skills differ | Reject the bundle |
| `QC-04_SKILL_EFFECTIVENESS` | A required skill lacks runtime invocation evidence | Fail grading; presence alone is insufficient |
| `QC-05_EVENT_SEQUENCE` | Sequence, ID uniqueness, or tool correlation is invalid | Stop replay and expose the gap |
| `QC-06_PROCESS_IDENTITY` | Run, snapshot, and handle name different sessions | Refuse reconnect or status attachment |
| `QC-07_TERMINAL_TRUTH` | Snapshot state/cursor disagrees with the semantic terminal event | Do not publish completion |
| `QC-08_LIFECYCLE_COMPLETENESS` | Artifact, memory, dashboard, or write audit is incomplete | Fail finalization |
| `QC-09_SECRET_LEAK` | Evidence contains provider/package credential material | Quarantine evidence and fail the run |
| `QC-10_RECEIPT_INTEGRITY` | Required hashes are missing or recomputation differs | Reject the evidence packet |
| `QC-11_BUDGET_BOUND` | Run or aggregate child cost exceeds the approved ceiling | Reject before dispatch where possible; fail receipt otherwise |
| `QC-12_CHILD_ISOLATION` | Child roots collide/escape or reservations exceed the parent | Reject fan-out before any child launches |

## Validate and deliver

Validate the assembled version-1 packet with the package command:

```bash
sl8-harness validate-evidence \
  --packet "$EVIDENCE_PACKET" \
  --output "$GRADING_REPORT"
```

Exit zero plus `passed: true` is required. Preserve every violation's stable code, JSON path, and
message. The report metrics include event, tool, artifact, and child counts plus whether usage was
available. Product-specific graders may add duration, reconnect lag, and cost availability, but
must not weaken or rename a package violation.

The delivered evidence packet contains no secret values and binds at minimum:

- exact tuple, image, template, requested/resolved model, and certification status;
- ordered prompt-layer hashes and immutable skill-closure/effectiveness receipt;
- event journal, terminal snapshot, durable handle, lifecycle receipt, and artifacts;
- recomputed file/bundle/run-manifest hashes;
- run/child budgets and isolated child roots;
- legacy compatibility projection references where the consumer still requires them.

If validation fails, deliver the failing report and remediation as evidence. Never rewrite a
failed packet into a pass or discard the first failed capture after a later correction.
