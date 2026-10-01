---
name: app-brand-review
description: Reviews a consumer wellness app's material — screenshots, store listing text, onboarding, posts, emails, links — against its brand book, the Review job's consistency review. Gives findings by severity with where they are and a before-and-after fix, runs Neumeier's swap, hand and focus tests, checks health claims, and says what to fix first; writes the M4 Review milestone. Changes no brand file. Run by the app brand router for the Review job when a brand book exists.
---

# Reviewing material against the brand (Review → M4)

Check what the team made against the brand they agreed. The router tells you the project folder
and where the material is. Work inside `artifacts/<project>/`.

## Read first

- `brand-book.md` (voice, messages, look, tokens, do and don't, consistency checklist,
  health-claims limits).
- The material in `inputs/` (the newest `material-<date>.md` and attached files). Read images:
  screenshots are evidence. Open any links the person gave.
- [references/review-method.md](references/review-method.md) and
  [references/health-claims-check.md](references/health-claims-check.md).

## Steps

1. List what you reviewed, item by item, with where it came from.
2. For each item, check voice, message, look (palette, type, imagery, icons), the distinctive
   assets, and health claims against the brand book.
3. **Findings:** one row each: where (item and place), what's off, which brand rule it breaks,
   severity (high: wrong promise, health-claim risk, off-brand at first sight; medium: voice or
   look drift; low: polish), and a before → after fix.
4. **Swap, hand and focus tests** on the material as a whole.
5. **Fix first:** at most 5 changes, highest value first.
6. Write the review and **M4**, then hand back to the router (see the end of this skill).

Downloaded pages, screenshots and other scratch go in `work/` in the home folder, never `/tmp`.

Don't change the brand book or any step file. If the material shows the brand itself needs to
change (the same "break" everywhere because the rule doesn't fit), say so under Open decisions as
a suggestion to refresh.

## `reviews/<date>.md`

```text
# Brand review <date>: <app>
## Summary                       (verdict in two lines, what was reviewed)
## Findings                      (table: where · what's off · rule · severity · before → after)
## Swap, hand and focus tests
## Fix first                     (at most 5)
## Open decisions                ("- none" if none)
```

`<date>` is today's date (YYYY-MM-DD). Use these `##` headings exactly as written.

## Milestone M4

`deliverables/M4-review-<date>.md`, in the layout in
[references/deliverables.md](references/deliverables.md).

## When this skill is done

This skill is one step of a job, never the whole job, and the job goes on after it. Don't write a
message saying you are done or handing back: a message with no tool call ends the whole job. Your
very next action is a tool call that runs the router's check:

`node ~/.claude/skills/app-brand-router/scripts/state.mjs review <project>`

Then carry on with the app brand router's run loop from that check. Don't write the final reply,
`STATUS.md` or `outcome.json` here.
