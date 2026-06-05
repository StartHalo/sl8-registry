# Project control-file templates

These are the two control files PROJECT mode creates in `artifacts/<project-name>/`.
Copy the shapes below verbatim and fill them in. They live at runtime under
`/home/user/artifacts/<project-name>/`, never under `bot/`.

---

## `context.md` — the project brief

`bot/user.md` = *who the operator is, once.* `context.md` = *what THIS project is about.*
Written once at project start, ≤2,500 chars, wrapped so it appends cleanly to context.
Idempotent (same answers → same file). This is the **only** home for the project goal.

```markdown
<PROJECT_CONTEXT>
# Project Brief: <project-name>

## What this project is
<!-- The product/account/ticket/campaign this folder is about. One paragraph. -->

## Audience / stakeholders
<!-- Who the outputs are for (exec, eng, customer, board…), their level. -->

## Subject specifics
<!-- Product facts, positioning, North Star + L1 metrics, competitive set, voice —
     whatever the bot needs to not re-ask every session. -->

## Strategic question / objective
<!-- The goal of THIS project. (The goal lives HERE — NOT in setup.md <GOAL>.) -->

## Provided data
<!-- Inventory of inputs/ : what the user uploaded/pasted, and what's missing. -->

## Standing constraints
<!-- Project-specific guardrails (tone, legal-sensitive topics, do-not-touch). -->

## Imported handoff (optional)
<!-- Seed pasted in from an upstream bot's state.md handoff block. -->

<!-- Created: YYYY-MM-DD -->
</PROJECT_CONTEXT>
```

---

## `state.md` — the phase ledger (the "what's done / what's next" file)

Markdown so it renders in the gallery file viewer and is greppable by hooks. A front block
for machine fields, a phase table, then pointers. Update it every phase.

```markdown
# Project State

project: <project-name>
grain: one-folder-per-product        # or: per-ticket | per-article | per-campaign
status: in-progress                  # in-progress | blocked | complete
updated: YYYY-MM-DD

## Phases

| # | phase   | skill           | status      | reads                     | writes               |
|---|---------|-----------------|-------------|---------------------------|----------------------|
| 0 | onboard | onboarding      | done        | chat Q&A                  | context.md, state.md |
| 1 | <phase> | <skill>         | next        | context.md, inputs/       | 01-<phase>.md        |
| 2 | <phase> | <skill>         | next        | context.md, 01-<phase>.md | 02-<phase>.md        |

next_action: <one imperative line — the single thing to do next>

## Open questions / blockers
- (none)

## Decisions log
- YYYY-MM-DD: <decision>

## Handoff
- (none)     # when set: downstream bot slug + a copy-pasteable seed for its context.md
```

Field semantics (load-bearing):
- **`status` per phase** is the resume contract: exactly one row is `in-progress` (or none,
  between phases); the first `next` row is what the loop runs. `done` rows are immutable.
- **`skill`** is looked up in `INDEX.md` (INDEX stays a *catalog*). A phase may be `—` (no
  skill) for a GATE/HANDOFF row.
- **`reads` / `writes`** are the interlink (READ-BEFORE-WRITE): `reads` names the exact prior
  numbered artifacts a phase consumes; `writes` is its `NN-<phase>.md`. The phase chain as data.
- **`next_action`** is the one imperative SessionStart surfaces so a resumed headless session
  knows what to do without re-deriving it.
- **`handoff`** carries a downstream bot slug + a seed paragraph its `context.md` ingests.

A recurring phase appends new numbered artifacts in the SAME folder (e.g. a weekly update
writes `02-update-2026-06-04.md`, then `04-update-2026-06-11.md`).
