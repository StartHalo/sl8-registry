---
name: saas-mkt-strategy
description: Sets a B2B micro-SaaS's marketing objectives and strategy — the revenue lever to pull, at most three SMART objectives on the SaaS funnel, one or two target segments, positioning in April Dunford's five parts, demo-led or trial-led, partnerships, the one real obstacle and what is ruled out, plus a messaging sheet — then critiques it as a dissenter, as the Objectives and Strategy steps (S2–S3) of a SOSTAC plan, and writes the M2 Strategy milestone. Run by the micro-SaaS marketing router whenever it names S2 or S3.
---

# Setting a micro-SaaS's marketing strategy (S2–S3 → M2)

Decide what to aim for and how to win, with choices that rule things out. The router tells you
the project folder, the steps, the scope, the founder's hours and any change. Work inside
`artifacts/<project>/`.

## Read first

- `01-situation.md` (S1), `artifacts/context.md`, and `inputs/` (the goal, any change request
  such as `inputs/change-<date>.md`, and any earlier strategy).
- [references/sostac-strategy.md](references/sostac-strategy.md),
  [references/positioning.md](references/positioning.md),
  [references/saas-funnel.md](references/saas-funnel.md) and
  [references/strategy-critique.md](references/strategy-critique.md).
- If the router says this is a change, redo or update: the earlier `02-`/`03-` files. Change
  what the request or the results require, keep the rest, and list every section you changed at
  the top of each file under `## What changed` (name each one; "unchanged" only if no line in it
  changed).

## Steps

1. **S2 objectives:** pick the revenue lever first, then at most 3 SMART objectives on the SaaS
   funnel, each with metric, baseline or `[TBD]`, target, date and funnel stage. Benchmarks go
   under `## Benchmarks used` with their source, never as the founder's baseline. Write
   `02-objectives.md`.
2. **S3 strategy draft:** 1–2 target segments; positioning in Dunford's five parts; the sales
   motion; partnerships and sequence; the obstacle; what is ruled out; the rest of TOPPP SEED
   where it changes something.
3. **Messaging sheet:** the one-line pitch, three messages each with proof, the top objections
   with answers. From the positioning, in buyers' words where S1 has them.
4. **Critique pass:** argue against the draft; fix it; record the critique.
5. **Decisions for the founder:** each strategy choice as "proposed: approve or change"
   (targets, positioning, motion, each objective's target). Start a line with `Blocking:` only
   when S4 can't go on without the answer. Write `03-strategy.md`.
6. **M2** (plan scope only), then hand back to the router (see the end of this skill).

The founder approves the strategy; you propose it. Never invent a baseline. Pricing changes are
the founder's decision: you may recommend one as a decision, never state it as done.

## `02-objectives.md`

```text
# S2 Objectives: <product>
## Revenue lever          (which of the four, and why, from S1)
## Objectives             (one "### O<n> <name>" each, at most 3: metric, baseline, target, date, funnel stage)
## Benchmarks used        (each benchmark with its source; "- none" if none)
## Open decisions         ("- none" if none)
```

## `03-strategy.md`

```text
# S3 Strategy: <product>
## Target segments
## Positioning            (the five parts, then the one-sentence statement)
## Sales motion           (demo-led, trial-led or hybrid, and why)
## Partnerships and sequence
## The obstacle
## Ruled out
## Critique
## Messaging sheet        (pitch; three messages with proof; objections and answers)
## Decisions for you      (one bullet per decision, "proposed: approve or change")
## Open decisions         ("- none" if none)
```

Use these `##` headings exactly as written, in plan and launch scope alike (no "Launch
objectives" or similar); the router's check looks for them. Keep S3 above the messaging sheet to
about one page.

In launch scope: objectives are the launch's (at most 3), and the strategy is the launch's
target, message and obstacle, inside the parent plan's positioning when there is one.

## Milestone M2 (plan scope only)

`deliverables/M2-strategy.md`, in the layout in
[references/deliverables.md](references/deliverables.md). It opens with the target segment and
what is ruled out, so a reader sees the choice in the first lines, and includes the messaging
sheet. In launch scope, write no M2.

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the micro-SaaS marketing router and carry on with step 4 of the router's run loop (the check).
Don't end the job here: don't write the final reply, `STATUS.md` or `outcome.json`.
