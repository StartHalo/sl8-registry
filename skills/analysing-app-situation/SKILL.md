---
name: analysing-app-situation
description: Analyses where a consumer health or wellness app stands today — audience segments, up to five competitors from their store listings, the app's own growth levers, and health-policy factors — as the Situation step (S1) of a SOSTAC marketing plan, and writes the M1 Situation milestone. Run by the app marketing router; use it whenever the router names step S1 for a plan or a launch campaign.
---

# Analysing an app's situation (S1 → M1)

Answer "where are we now?" for one app, honestly, from what you can read and what the person
gave. The router tells you the project folder, the scope (`plan` or `campaign`) and any change
to take into account. Work inside `artifacts/<project>/`.

## Read first

- `artifacts/context.md`: the company profile (read only; the router writes it).
- `artifacts/<project>/inputs/`: the request, and any pasted listing, figures or exports.
- For a campaign: the parent plan's `01-situation.md`, if the router names a parent. Reuse it;
  only add what the launch changes. Never edit the parent's files.
- [references/situation-checklist.md](references/situation-checklist.md): what each section needs.

## Steps

1. **Read the app's store listing** from the link in the profile, with the web fetch tool. Note
   the URL. If it won't open, use pasted listing text from `inputs/`, or mark the listing
   `[TBD]` and add an open decision asking the person to paste it.
2. **Customers and segments.** Map the market into named segments before choosing any.
3. **Competitors, at most 5.** Find them from the store category, a web search, and the
   person's list. Open each listing you describe; cite its URL beside each claim, or write
   "(from you)". Never state a competitor fact you didn't read in this run.
4. **Growth levers.** Audit acquisition, engagement and retention, monetisation and analytics
   with [references/app-growth-levers.md](references/app-growth-levers.md).
5. **External factors and health policy.** Trends with a source, then the check in
   [references/health-policy-check.md](references/health-policy-check.md).
6. **Key findings**, at most 5, written last but placed first.
7. **Write the files** (headings exactly as below), then hand back to the router (see the end of this skill).

Figures: use only the person's figures or a cited page. An unknown figure is `[TBD]` with an
open decision; never an estimate dressed as a fact. Label estimates "estimate".

## `01-situation.md`

```text
# S1 Situation: <app>
## Key findings
## Customers and segments
## Competitors            (one "### <name>" per competitor, at most 5)
## Growth levers
## External factors and health policy
## Open decisions         ("- none" if none)
## Sources                (every URL opened, with the date)
```

Use these `##` headings exactly as written, in plan and campaign scope alike; the router's check
looks for them.

## Milestone M1 (plan scope only)

`deliverables/M1-situation.md`, in the layout in
[references/deliverables.md](references/deliverables.md): What was done, Findings (the key
findings and the segment map in brief), Decisions (none are made at S1: say so, or list the
questions for the person), Assumptions. In campaign scope, write no M1: the M4 campaign
deliverable covers it.

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the app marketing router and carry on with step 4 of the router's run loop (the check).
Don't end the job here: don't write the final reply, `STATUS.md` or `outcome.json`.
