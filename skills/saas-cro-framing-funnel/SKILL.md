---
name: saas-cro-framing-funnel
description: Frames a conversion review for a B2B micro-SaaS website — the paths to a demo request or free trial, what counts as a conversion on each, the key pages (home, pricing, demo request, trial sign-up), a saved copy of each page's text, the figures known so far, and up to three competitors (ResearchXL setup, step S1). Run by the micro-SaaS conversion router; use it whenever the router names step S1.
---

# Framing the funnel (S1)

Before anyone judges a page, agree what the site is for: which path a visitor takes to become a
customer, what counts as a conversion on that path, and which pages carry it. Every later step
reads the page copies you save here, so the whole review quotes the same text. That is what keeps
its findings checkable instead of generic.

The router tells you the project folder (`artifacts/<project>/`) and what the founder supplied
(in `inputs/`). Read `artifacts/context.md` (read only; the router writes it).

## Steps

1. **Paths** ([references/funnel-paths.md](references/funnel-paths.md)). From the request, the profile's sales path, and the home page's calls to action,
   name each path: demo-led ("Book a demo" → form → call → paid), trial-led ("Start free trial"
   → sign-up → first use → paid), or both. At most 2 paths. Name the founder's main one first.
2. **Conversions.** For each path, the steps a visitor takes and which one is the conversion that
   matters (a demo request submitted; a trial started; a trial turned paid). Plain words.
3. **Key pages**, at most 6: the home page, the pricing page, the demo-request page or form, the
   trial sign-up page, and up to 2 more the paths depend on (a features page, a login page that
   doubles as sign-up). Find them from the home page's links.
4. **Save each key page** with the web fetch tool, following
   [references/page-capture.md](references/page-capture.md): one file per page in `pages/`, with
   the URL and fetch time on top and the page's text below. If a page won't load, or comes back
   nearly empty (built by script), record that and move on; don't guess its content.
5. **Price** from the pricing page, if it shows one: note it under KPIs and baselines.
6. **KPIs and baselines.** Per path: the conversion rate or count the founder supplied, with its
   period and source; otherwise `not known`. Never estimate a rate.
7. **Competitors**, at most 3, from the request, the site's own comparisons, or a web search
   for the product category. For each, save its pricing page and its demo or trial page in
   `pages/` the same way (they are read in S3). One line per competitor on why it is comparable.
8. **Assumptions.** Everything you inferred rather than read or were told.
9. Write `01-goals-funnel.md`, then hand back (end of this skill).

## `01-goals-funnel.md`

```text
# S1 Frame goals and the funnel: <product>
## Paths and conversions      (each path, its steps, and its conversion)
## Key pages                  (one "### <page name>" each, with its URL and its pages/ file)
## KPIs and baselines         (per path: figure, period, source — or "not known")
## Competitors                (one "### <name>" each, at most 3, with URLs and pages/ files)
## Assumptions
## Open decisions             ("- none", or one bullet per question; add "(blocks S<n>)" when the review can't go on without it)
```

Use these `##` headings exactly: the router's check looks for them. Mark an unknown that matters
`[TBD]` and add an open decision for it.

## When this skill is done

This skill is one step of a job, never the whole job, and the founder has not had a reply yet.
Don't announce a hand-back and don't stop: in the same turn, go straight on with the
micro-SaaS conversion router. Your very next action is the router's check
(`node <router>/scripts/state.mjs check <project> <steps>`), then the rest of its run loop, then
its section 4 (`status.mjs` and the reply to the founder). The job ends only there.
