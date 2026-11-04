---
name: agency-discover
description: Research the customer's space, product, brand, competitors and numbers from public sources, and keep CUSTOMER.md and work/discovery/ current. Use for discovery-lane tasks, and when a plan needs facts it doesn't have.
metadata:
  status: core
  version: 1.0.0
---

# Discover

Outside in first: find out everything you can before asking the customer anything.

## When to use

A discovery-lane task, or a plan that needs a fact it doesn't have.

## Inputs

CUSTOMER.md, `agency view facts`, `work/discovery/`, the task's refs; public sources only.

## Steps

1. **Read** what exists: CUSTOMER.md, `agency view facts`, `work/discovery/`.
2. **Research** with the read packs (agency-web-reads, with `--render` for pages built by scripts;
   agency-store-reads; agency-screenshots). Use subagents for breadth, such as one per comparable
   company. Give each subagent the absolute path of the file it writes
   (`/home/user/work/discovery/<topic>.md`) and the packs' paths (`~/.claude/skills/...`);
   it writes there itself and returns a short summary with sources. Never a relative path, never
   its scratchpad.
3. **Write** detail to `work/discovery/<topic>.md`: business, product, market, competitors,
   customers, numbers. Every line carries its source and date. An unknown stays unknown, with who
   can give it.
4. **Log** each fact that matters as a `fact` event (`text`, `src`). Then ask: does it change a goal
   or the lanes' order? If yes, add a `plan` review task.
5. **Keep CUSTOMER.md's profile** to a page. It points to `work/discovery/` for the rest.
6. **Their logo** (D68): save it from their own site to `work/discovery/brand/logo.<ext>`, the first
   of: the header's logo `<img>` (or inline `<svg>`), `og:image` when it is the logo, the site's
   icon (`apple-touch-icon`, then `favicon`). SVG or PNG; keep the file as served. Note on
   CUSTOMER.md's "Who they are" one line: `Logo: work/discovery/brand/logo.<ext> (<its URL>, read
   <date>)`. None found: `Logo: none on their site (<date>)`; the PDF cover then shows their name alone.
7. **Comparables:** for each of 5–8 companies at the same stage, record what they do, how many of
   them share each move, and the evidence (verified, reported, unproven). This is what plan ranks from.

## Output

`work/discovery/<topic>.md` (detail, each line sourced and dated), `fact` events in the log,
`work/discovery/brand/logo.<ext>` with its line in CUSTOMER.md, and CUSTOMER.md's one-page profile.

## Quality bar

Every line has a source and a read date; an unknown says who can give it; comparables mark each
claim verified, reported or unproven; nothing invented.

## Verify

Open each file a subagent wrote at its path; spot-check two facts against their saved
sources; `agency view facts` shows the facts logged.

## Lessons

- **A research subagent gets the workspace's absolute path and writes there (2026-10-30).** Run
  2026-10-30-uc1: the comparables subagent wrote to a mistyped copy of the workspace path, outside
  the workspace; the write was refused, it saved to its own scratchpad, and the operator copied the
  file in by hand. Copy the path from `pwd`, whole. Source:
  `docs/v5/runs/2026-10-30-uc1/verdict.md`, gap 9; `transcripts/01a-run.md` 69-75.
