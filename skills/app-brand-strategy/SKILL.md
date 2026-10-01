---
name: app-brand-strategy
description: Writes the brand brief for a consumer wellness app, as the strategy phase (S2) of Alina Wheeler's brand identity process — the focus, one primary audience, positioning from the competitive alternatives, an onliness statement ("the only ___ that ___") checked against named competitors, a brand vision with proof points, the promise, what the brand will not do, and the health-claims limits on the promise — and writes the M2 Brand brief milestone. Run by the app brand router whenever it names S2.
---

# Clarifying the brand strategy (S2 → M2)

Make the choices the rest of the brand is built on, and make them sharp enough to rule things
out. The router tells you the project folder and the step, and whether this is a change. Work
inside `artifacts/<project>/`.

## Read first

- `01-research.md` (S1), `artifacts/context.md`, and `inputs/` (the request, and any change such
  as `inputs/change-<date>.md`).
- [references/brand-brief-method.md](references/brand-brief-method.md) and
  [references/health-claims-check.md](references/health-claims-check.md).
- If the router says this is a change, redo or refresh: the earlier `02-brand-brief.md`. Change
  what the request requires, keep the rest, and add `## What changed` at the top naming every
  section you changed (for example "Audience and Promise now speak to new parents first").

## Steps

1. **Focus:** the one job the app does best for people, from S1's findings. One paragraph.
2. **Audience:** one primary audience, described by need and moment, not demographics alone.
   Others are secondary and named as such.
3. **Positioning:** work through Dunford's five inputs (competitive alternatives, what only this
   app has, the value that gives, who cares most, the market frame), then one positioning
   statement.
4. **Onliness statement** and **Onliness check:** "<App> is the only <category> that <difference>
   for <audience>." Then test it against every competitor in S1: one line each saying why that
   app can't make the same claim. If one can, sharpen the statement and test again.
5. **Brand vision:** core values (2–5), each with a proof point from S1 or the app itself; the
   extended identity (personality traits); an essence of 2–4 words.
6. **Promise:** what a person can count on every time, inside the health-claims limits.
7. **We will not:** at least 3 things the brand refuses to say, do or look like, taken from S1's
   clichés and the positioning.
8. **Health-claims limits:** sort the promise and positioning words with the health-claims
   check; say what the brand may promise, what needs evidence, and what it never says.
9. **Decisions for you:** audience, positioning, onliness statement and promise, each
   "proposed: approve or change". A decision the person has already approved leaves this list; say
   "(approved <date>)" in its own section instead. A decision the brand can't move on without (for example
   whether the app is a regulated medical device, when the copy hints that it is) goes under
   Open decisions starting with `[blocking]`.
10. **M2**, then hand back to the router (see the end of this skill).

The person and their leadership approve the brand; you propose it. Never invent a proof point.

## `02-brand-brief.md`

```text
# S2 Clarify strategy: <app>
## What changed           (only on a change, redo or refresh)
## Focus
## Audience
## Positioning            (the five inputs, then the statement)
## Onliness statement
## Onliness check         (one line per S1 competitor)
## Brand vision           (core values with proof points, extended identity, essence)
## Promise
## We will not            (at least 3 bullets)
## Health-claims limits
## Decisions for you      (one bullet per decision, "proposed: approve or change")
## Open decisions         ("- none" if none; "[blocking] …" only for what stops the brand)
```

Use these `##` headings exactly as written; the router's check looks for them.

**Open decisions:** at most 4, the most important first. Never repeat one an earlier step
already lists (read its `## Open decisions` first); if it still matters, say "(still open from S<n>)"
in the text that depends on it instead. A bullet is a question or an action for the person:
never "none beyond …", and `[blocking]` only for a new question that stops the work.

## Milestone M2

`deliverables/M2-brand-brief.md`, in the layout in
[references/deliverables.md](references/deliverables.md). It opens with the audience and the
onliness statement, so a reader sees the choice in the first lines.

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the app brand router and carry on with step 4 of the router's run loop (the check).
Don't end the job here: don't write the final reply, `STATUS.md` or `outcome.json`.
