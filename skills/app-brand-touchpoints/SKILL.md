---
name: app-brand-touchpoints
description: Applies a consumer wellness app's brand to the places people meet it, as the touchpoints phase (S4) of Alina Wheeler's brand identity process — store listing fields within the stores' character limits, onboarding screens, social posts and emails, each in the brand's voice and messages with layout notes and a health-claims check — or writes one piece of copy in the approved brand for the Apply job. Proposes text; never publishes. Run by the app brand router whenever it names S4 or an Apply piece.
---

# Creating touchpoints (S4, and Apply pieces)

Show the brand working where people meet it. The router tells you the project folder, the mode
(**S4** or **piece**), the touchpoints or the piece, and whether this is a change. Work inside
`artifacts/<project>/`.

## Read first

- `02-brand-brief.md` (promise, health-claims limits) and `03-identity.md` (voice, tone by
  context, messages, look). For a piece: `brand-book.md`, which holds both.
- The current listing or copy in `inputs/` or `01-research.md`'s touchpoint audit.
- [references/touchpoint-guide.md](references/touchpoint-guide.md) and
  [references/health-claims-check.md](references/health-claims-check.md).
- On a change or redo of S4: the earlier `04-touchpoints.md`. Change what the request requires,
  keep the rest, and add `## What changed` at the top naming every section you changed.

## S4 steps

1. For each chosen touchpoint (the router names them; default store listing, onboarding, social,
   email), write example copy and layout notes in the brand, using
   [references/touchpoint-guide.md](references/touchpoint-guide.md). Name the voice attributes and
   the message each one uses.
2. **Store listing:** a field table. Count each field's characters and stay inside the limit; the
   router's check counts them again.
3. **Health-claims check** over everything you wrote.
4. Then hand back to the router (see the end of this skill).

## `04-touchpoints.md`

```text
# S4 Create touchpoints: <app>
## What changed           (only on a change or redo)
## Store listing          (when chosen: the field table, then screenshot captions and layout notes)
## Onboarding             (when chosen)
## Social                 (when chosen)
## Email                  (when chosen)
## Website                (only when chosen)
## Push notifications     (only when chosen)
## Health-claims check
## Open decisions         ("- none" if none)
```

The store listing table, exactly this shape (one row per field, text without quotes):

```text
| Field | Proposed text | Characters |
|---|---|---|
| App name | … | 18 |
| Subtitle | … | 27 |
| Promotional text | … | 140 |
| Keywords | …,…,… | 92 |
| Short description | … | 74 |
```

## Piece mode (the Apply job)

Write `touchpoints/<name>.md` (the router gives the name) for the one piece asked for:

```text
# <piece>: <app>
## Copy                     (the text, ready to paste; a store listing piece adds "## Store listing" with the field table)
## Layout notes
## Voice and messages used  (which attributes and message, and how)
## Health-claims check
## Open decisions           ("- none" if none)
```

A piece changes no other file: not the brand book, not a step file.

Use these `##` headings exactly as written; the router's check looks for them. You propose text;
the person publishes it.

**Open decisions:** at most 4, the most important first. Never repeat one an earlier step
already lists (read its `## Open decisions` first); if it still matters, say "(still open from S<n>)"
in the text that depends on it instead. A bullet is a question or an action for the person:
never "none beyond …", and `[blocking]` only for a new question that stops the work.

## When this skill is done

This skill is one step of a job, never the whole job, and the job goes on after it. Don't write a
message saying you are done or handing back: a message with no tool call ends the whole job. Your
very next action is a tool call that runs the router's check:

`node ~/.claude/skills/app-brand-router/scripts/state.mjs check <project> S4` (S4), or `node ~/.claude/skills/app-brand-router/scripts/state.mjs piece <project> <name>` (a piece)

Then carry on with the app brand router's run loop from that check. Don't write the final reply,
`STATUS.md` or `outcome.json` here.
