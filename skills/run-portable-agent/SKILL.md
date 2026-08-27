---
name: run-portable-agent
description: >
  Execute an SL8 agent brief end to end through a certified harness/provider/model tuple and
  deliver a durable run-evidence packet. Use when the user asks to run, resume, reconnect,
  cancel, fan out, prove, or compare a portable bot across Claude, Codex, Pi, OpenAI Agents SDK,
  or another supported harness. Do not use for catalog advice, bundle assembly alone, or grading
  an already-finished packet; route those to the owning lower-tier skill.
---

# Run portable agent

Own one deliverable: a validated, durable agent-run evidence packet. Work from files so another
controller can resume after context loss. Never claim a run from chat memory, a process exit, or
vendor-native output.

## Required skill chain

Use these skills in order and keep their responsibilities separate:

1. `harness-selection` observes readiness and resolves one exact certified tuple.
2. `portable-agent-bundle` assembles canonical context and the complete skill closure.
3. `portable-execution-contract` owns launch, normalized state, reconnect/cancel truth, lifecycle,
   evidence validation, and named quality failures.

Do not restate their rule tables here. Preserve their receipts as workflow evidence.

## Project files

Create one project folder under `/home/user/artifacts/portable-runs/<slug>/` with:

```text
BRIEF.md                 immutable normalized brief
plan.json                workflow state and evidence index; the only mutable control file
inputs/run-spec.json     exact RunSpec; contains secret names, never values
bundle/                  prepared archive and receipts
run/                     controller journal, snapshot, handles, raw adapter log
evidence/packet.json     delivered evidence packet
evidence/grading.json    package validation report
evidence/                readiness, certification, lifecycle, reconnect, cancel, child receipts
```

`plan.json` is an index, not a second run store. Run state remains authoritative in the
controller journal/snapshot/handle registry. The plan holds hashes and paths that make the
workflow resumable.

## Initialize

Normalize the user's objective, constraints, required outputs, acceptance checks, provider/model
preference, maximum cost, reconnect/cancel requirements, and fan-out limits into a short source
brief. Create the state files before selecting or spending:

```bash
node skills/run-portable-agent/scripts/workflow-state.mjs init \
  --project "$PROJECT_ROOT" \
  --brief "$SOURCE_BRIEF" \
  --run-spec "$RUN_SPEC"
```

Initialization is idempotent only when the brief and RunSpec hashes match. A different input in an
existing project is a new project, not a silent overwrite.

## Status ladder and gates

Advance one edge at a time. Every successful edge requires a retained evidence file:

```text
briefed → selected → bundled → running → finalizing → validating → delivered
                                  ↕
                              reconnecting
```

Any nonterminal state may become `failed` or `abandoned` with evidence. Terminal states never
advance. `reconnecting → running` is allowed only after the same-session replay proof. Cancellation
truth is a controller concern: its confirmed result is indexed as terminal evidence rather than
inventing a separate workflow status.

Advance atomically:

```bash
node skills/run-portable-agent/scripts/workflow-state.mjs advance \
  --project "$PROJECT_ROOT" \
  --to selected \
  --evidence "$READINESS_RECEIPT"
```

The helper uses an exclusive lock and atomic rename. A live or abandoned lock is a stop condition
for human/controller reconciliation; never delete it merely to make progress.

## Execute

1. Select the tuple. Retain readiness, exact image/template identity, signed ledger reference,
   capabilities, and the no-spend rejection output for any failed candidate. Advance to
   `selected` only for an exact certified tuple.
2. Prepare the bundle. Require canonical instructions, prompt-layer hashes, complete skill
   closure, archive hash, and effective-invocation requirements. Advance to `bundled`.
3. Launch through the common controller with a positive per-run budget:

   ```bash
   sl8-harness run \
     --spec "$PROJECT_ROOT/inputs/run-spec.json" \
     --run-root "$PROJECT_ROOT/run" \
     --readiness "$READINESS_PATH" \
     --catalog /etc/sl8/harnesses.json \
     --image "$IMMUTABLE_IMAGE" \
     --template-id "$E2B_TEMPLATE_ID" \
     --certifications "$SIGNED_LEDGER" \
     --attestor-public-key "$ATTESTOR_PUBLIC_KEY"
   ```

   Advance to `running` only after the durable SL8 session ID and vendor handle are written.
4. Stream normalized events. Consumers read the journal/snapshot, never the raw adapter log.
5. If the controller restarts, advance to `reconnecting`, attach by the recorded SL8 session ID,
   replay strictly after the saved cursor, prove the vendor handle is unchanged, then return to
   `running`. If ownership cannot be proved, retain the evidence and terminate honestly.
6. For fan-out, declare aggregate/depth/descendant/concurrency/secret limits before dispatch.
   Give each child a unique task root and require a structured completion receipt in the parent
   inbox. Cross-review uses a different harness family.
7. At semantic terminal, advance to `finalizing`. Let the controller audit writes, inventory
   artifacts, synthesize memory, render the dashboard, and project compatibility output.
8. Assemble `evidence/packet.json`, advance to `validating`, and invoke the owning contract's
   package validator. Advance to `delivered` only when `grading.json` says `passed: true`.

## Resume

On every restart:

```bash
node skills/run-portable-agent/scripts/workflow-state.mjs check --project "$PROJECT_ROOT"
```

Read `BRIEF.md`, `plan.json`, and only the evidence indexed by the current/recent transitions.
Verify indexed hashes before acting. Reconcile `running` or `reconnecting` against the durable
controller registry. Never relaunch merely because a local PID is gone. For other states, repeat
the current gate idempotently or continue along the single allowed edge.

## Delivery

Return:

- project and packet paths;
- exact harness/mode/provider/requested-and-resolved model, image, and template ID;
- terminal state and evidence-validation result;
- artifact inventory, usage/cost availability, duration, and reconnect lag when measured;
- child summary and unresolved risks;
- legacy projection references required by existing consoles;
- explicit limitations for every unproven capability.

A failed or abandoned run is still a deliverable when its evidence is intact. Never erase failed
attempts, weaken the validator, substitute an uncertified tuple, or call installed software
supported without the exact live proof.
