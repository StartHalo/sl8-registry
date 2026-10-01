---
name: app-brand-guidelines
description: Writes brand guidelines a small team can use for a consumer wellness app, as the managing-assets phase (S5) of Alina Wheeler's brand identity process — an owner and a home, do and don't pairs with examples, templates, a consistency checklist from the swap, hand and focus tests, and a review cadence with triggers — then assembles the whole brand book with a tokens table and writes the M3 Brand book milestone. Run by the app brand router whenever it names S5.
---

# Managing assets: guidelines and the brand book (S5 → M3)

Make the brand usable by people who weren't in the room, and assemble it into one book. The
router tells you the project folder, the step, the brand book version, and whether this is a
change. Work inside `artifacts/<project>/`.

## Read first

- `02-brand-brief.md`, `03-identity.md`, `04-touchpoints.md`, and `01-research.md`'s key
  findings.
- [references/guidelines-method.md](references/guidelines-method.md) and
  [references/deliverables.md](references/deliverables.md) (the brand book layout).
- On a change, redo or refresh: the earlier `05-guidelines.md` and the kept brand book in
  `versions/`. Change what the request requires, keep the rest; in `05-guidelines.md` add
  `## What changed` naming every section you changed, and open the new brand book with
  `## What changed and why`.

## Steps

1. **Owner and home:** who owns the brand (the marketing lead, by default), who approves changes
   (leadership, by default), where the brand book lives, and how the team asks a question.
2. **Do and don't:** pairs for voice, messages, colour, type, imagery and icons, each with a short
   example. At least 8 pairs.
3. **Templates:** 3–5 fill-in templates the team reuses (a store screenshot caption, a social
   post, a release-notes line, an email, a push notification), each with its structure and one
   filled example.
4. **Consistency checklist:** the questions anyone runs before publishing, built from Neumeier's
   swap, hand and focus tests and the health-claims limits.
5. **Review cadence and triggers:** when the brand is reviewed (yearly at least; the touchpoints
   quarterly) and what triggers an early refresh (a launch, a new audience, a new market, repeated
   questions from the team).
6. **The brand book:** assemble `brand-book.md` in the layout in
   [references/deliverables.md](references/deliverables.md), from the step files: assumptions
   first, then the brand in one page, the layers, and the **Tokens** table. Copy decisions and
   assumptions from the step files; invent nothing new here.
7. **M3**, then hand back to the router (see the end of this skill).

## `05-guidelines.md`

```text
# S5 Manage assets: <app>
## What changed                 (only on a change, redo or refresh)
## Owner and home
## Do and don't                 (at least 8 pairs, each with an example)
## Templates                    (3–5)
## Consistency checklist
## Review cadence and triggers
## Open decisions               ("- none" if none)
```

Use these `##` headings exactly as written; the router's check looks for them, and for
`## Assumptions` and `## Tokens` in `brand-book.md`.

**Open decisions:** at most 4, the most important first. Never repeat one an earlier step
already lists (read its `## Open decisions` first); if it still matters, say "(still open from S<n>)"
in the text that depends on it instead. A bullet is a question or an action for the person:
never "none beyond …", and `[blocking]` only for a new question that stops the work.

## Milestone M3

`deliverables/M3-brand-book.md`, in the layout in
[references/deliverables.md](references/deliverables.md): a short standalone summary of the
whole brand (what was done, findings, the decisions, assumptions) that names `brand-book.md` as
the full book.

## When this skill is done

This skill is one step of a job, never the whole job, and the job goes on after it. Don't write a
message saying you are done or handing back: a message with no tool call ends the whole job. Your
very next action is a tool call that runs the router's check:

`node ~/.claude/skills/app-brand-router/scripts/state.mjs check <project> S5`

Then carry on with the app brand router's run loop from that check. Don't write the final reply,
`STATUS.md` or `outcome.json` here.
