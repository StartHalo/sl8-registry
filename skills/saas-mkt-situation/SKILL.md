---
name: saas-mkt-situation
description: Analyses where a B2B micro-SaaS stands today — best-fit customers and segments, up to five competitors and the alternatives buyers use instead, the product's price and sales motion, funnel and churn figures, the buyer's calendar, and any earlier marketing strategy — as the Situation step (S1) of a SOSTAC marketing plan, and writes the M1 Situation milestone. Run by the micro-SaaS marketing router; use it whenever the router names step S1 for a plan or a launch.
---

# Analysing a micro-SaaS's situation (S1 → M1)

Answer "where are we now?" for one B2B SaaS product, honestly, from what you can read and what
the founder gave. The router tells you the project folder, the scope (`plan` or `launch`) and any
change to take into account. Work inside `artifacts/<project>/`.

## Read first

- `artifacts/context.md`: the company profile (read only; the router writes it).
- `artifacts/<project>/inputs/`: the request, and any figures, customer notes, review text or
  exports. **`inputs/earlier-strategy-*.md`**, if present, is a strategy the founder already has:
  read it closely.
- For a launch: the parent plan's `01-situation.md`, if the router names a parent. Reuse it;
  only add what the launch changes. Never edit the parent's files.
- [references/situation-checklist.md](references/situation-checklist.md): what each section needs.
- [references/alternatives-and-reviews.md](references/alternatives-and-reviews.md): finding
  competitors and alternatives, and reading review sites without scraping.

## Steps

1. **Read the founder's website** from the profile with the web fetch tool: the home page, the
   pricing page, and one or two pages that say who it's for (customers, case studies, features).
   Note each URL. If a page won't open, use what's in `inputs/`, or mark the gap `[TBD]` with an
   open decision asking the founder to paste it.
2. **Customers and segments.** Name the best-fit customers first (who gets the most value, from
   the site's customer logos, case studies, reviews and the founder's notes), then the wider
   segments. Don't choose targets here; S3 does.
3. **Competitors and alternatives.** What buyers would do without the product (spreadsheets,
   paper, a general tool, doing nothing, hiring someone), then at most 5 named competitors. Open
   each competitor page you describe and cite its URL beside the claim, or write "(from you)".
   A claim you can't tie to a page opened in this job is dropped, not softened.
4. **The company.** Product, price and billing, sales motion (demo, trial or both), channels in
   use, integrations, proof (logos, reviews, ratings) and the funnel: visitors, trials or demo
   requests, paying customers, churn. Only the founder's figures or a cited page; otherwise
   `[TBD]`.
5. **External factors.** The buyer's calendar and rules: when buyers budget and decide (a fiscal
   year, a public body's budget year, a busy season), who signs, any compliance a buyer asks for. Trends only with a
   source.
6. **Earlier strategy** (only when `inputs/earlier-strategy-*.md` exists): what it decided
   (targets, message, channels, goals), what the evidence now supports, and what it questions.
   Quote its own words briefly.
7. **Key findings**, at most 5, written last but placed first. The last one names the likely
   growth obstacle, as a hypothesis for S3.
8. **Write the files** (headings exactly as below), then hand back to the router (see the end of
   this skill).

Figures: use only the founder's figures or a cited page. An unknown figure is `[TBD]` with an
open decision; never an estimate dressed as a fact. Label estimates "estimate". A review-site or
traffic figure you couldn't open is not used.

## `01-situation.md`

```text
# S1 Situation: <product>
## Key findings
## Customers and segments
## Competitors and alternatives    (alternatives first, then one "### <name>" per competitor, at most 5)
## The company
## External factors
## Earlier strategy                (only when the founder gave one)
## Open decisions                  ("- none" if none)
## Sources                         (every URL opened, with the date)
```

Use these `##` headings exactly as written, in plan and launch scope alike; the router's check
looks for them.

## Milestone M1 (plan scope only)

`deliverables/M1-situation.md`, in the layout in
[references/deliverables.md](references/deliverables.md): What was done, Findings (the key
findings, best-fit customers and the main alternatives in brief), Decisions (none are made at S1:
say so, or list the questions for the founder), Assumptions. In launch scope, write no M1: the
M4 launch deliverable covers it.

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the micro-SaaS marketing router and carry on with step 4 of the router's run loop (the check).
Don't end the job here: don't write the final reply, `STATUS.md` or `outcome.json`.
