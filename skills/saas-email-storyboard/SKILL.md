---
name: saas-email-storyboard
description: Turns a micro-SaaS email campaign's research into an idea pool and a storyboard — which emails to send, why each one, in what order, how many days apart, to which segment, and when someone drops out — and writes the M1 Campaign plan, as the Write the idea pool and Build the storyboard steps (S3–S4) of the Atomic Emails method. Also revises a storyboard when the founder asks to drop, add or reorder emails. Run by the email campaign router whenever it names S3 or S4.
---

# Building the storyboard (S3–S4 → M1)

Decide which emails the campaign sends. The router tells you the campaign folder, the steps, the
settings (number of emails, if the founder set one) and any change. Work inside
`artifacts/<campaign>/`.

## Read first

- `01-insights.md` and `02-resources.md`, `artifacts/context.md`, `inputs/`.
- [references/curation.md](references/curation.md) and [references/cadence.md](references/cadence.md).
- **Revise mode** (the router says there is a storyboard change, such as `inputs/change-<date>.md`):
  read the current `03-` and `04-` files. Change only `04-storyboard.md` and M1: apply the change,
  re-space the delays, move a dropped email's idea to Leftovers, keep everything else, and list
  what changed at the top of `04-storyboard.md` under `## What changed`. Never edit
  `03-idea-pool.md` in revise mode: an email the founder adds takes its idea from the pool, or is
  written in its storyboard row only.

## Steps

1. **Size.** The number of emails is the founder's if they set one (1–9); otherwise let the
   recipe in `curation.md` decide (it gives 5–9). A one-off announcement is 1 email.
2. **Idea pool (S3).** Write 2–3 ideas for every email you'll send (at most 24), unordered. Each:
   a short title, a 2–3 sentence synopsis, its purpose (crucial problem, perceived value,
   inspiration, action), and the resource or offer it uses from `02-resources.md`. One idea per
   email. Walk the resources and the problems asking "could this be one email?". Don't write only
   instructions or only sales asks.
3. **Curate (S4).** Pick by purpose with the recipe in `curation.md`, then check each pick with the
   customer re-read there. Drop what fails it.
4. **Order and delays.** Order by the customer's journey (the steps to success in S1), not by
   purpose. Set delays from `cadence.md` for this campaign type. The first email goes out on day 0.
5. **Each storyboard row:** #, email (its title), purpose, idea (one line), primary CTA (one
   offer from S2), delay, segment.
6. **Exit rule.** Who stops getting the sequence: at least everyone who does the conversion event
   (for example books a demo). Add replies if the founder handles them personally.
7. **Leftovers.** The ideas not used, kept for a later campaign.
8. **Decisions for the founder:** "Approve the N-email storyboard, or change it", plus any choice
   you made that they might not (an offer, a segment, a long gap).
9. **M1** (below), then hand back.

## `03-idea-pool.md`

```text
# S3 Idea pool: <campaign>
## Ideas            (a table: Idea | Synopsis | Purpose | Resource or offer; 2–3 per planned email, at most 24 rows)
## Open decisions   ("- none" if none)
```

## `04-storyboard.md`

```text
# S4 Storyboard: <campaign>
## What changed     (revise mode only)
## Storyboard       (a table: # | Email | Purpose | Idea | Primary CTA | Delay | Segment; one row per email, at most 9)
## Exit rule
## Leftovers
## Decisions for you   (one bullet each, "approve or change")
## Open decisions      ("- none" if none)
```

Use these `##` headings exactly as written; the router's check looks for them.

## Milestone M1

`deliverables/M1-campaign-plan.md`, in the layout in
[references/deliverables.md](references/deliverables.md). It stands alone: a founder who reads
only M1 knows the goal, who gets the campaign, every email's purpose and timing, and what to
approve.

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the email campaign router and carry on with step 4 of its run loop (the check). Don't end the job
here: don't write the final reply, `STATUS.md` or `outcome.json`.
