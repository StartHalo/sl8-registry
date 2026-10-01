---
name: saas-cro-reviewing-pages
description: Reviews a B2B micro-SaaS website's key pages (home, pricing, demo request, trial sign-up) for what loses visitors — technical problems visible in the page, and friction judged on ResearchXL's five lenses (relevance, clarity, value, friction, distraction) — with every finding quoting the page or a screenshot, a green/yellow/red map of the trial path, unused proof, and a comparison with competitors' pages (ResearchXL steps S2 and S3). Run by the micro-SaaS conversion router; use it whenever the router names S2 or S3.
---

# Reviewing the pages (S2–S3)

This is where the review earns trust or loses it. Automated page audits fail in the same ways:
generic advice that fits any site, claims about elements the page doesn't have, and blindness to
the visitor's situation. One public test of eleven such tools found that shipping the best
tool's ten suggestions *lowered* sign-ups. So every finding here is tied to something the page
actually says, judged from the visitor's side, and written specifically enough that it couldn't be
pasted onto another company's site.

Read first:
- `01-goals-funnel.md` (paths, key pages, competitors) and every file in `pages/`;
- `inputs/screenshots/`, if the founder attached any (open each image);
- `artifacts/context.md` (read only);
- on a rerun, what the router says is new; keep earlier findings that still hold, with their IDs.

## S2 Technical analysis

Laja's rule: fix what's broken before judging anything else. Without a browser you can only see
what the page's text and links show; [references/technical-from-html.md](references/technical-from-html.md)
lists those checks and how to rate each issue's return. Include any speed or device figures the
founder supplied. List under `## Not checked` everything that needs the rendered page (speed,
layout on phones, browser differences), so the founder knows what's still open. At most 10 issues.

## S3 Heuristic analysis

1. **Inventory first, for each key page:** the main headline, every call to action, each form
   with its fields counted, proof shown (testimonials, logos, numbers, reviews), prices, and the
   navigation. Judging before inventorying is how reviews end up recommending a button the page
   already has.
2. **Findings**, at most 25, judged with the five lenses in
   [references/researchxl-lenses.md](references/researchxl-lenses.md). Each finding follows the
   rules in [references/evidence-rules.md](references/evidence-rules.md): its page, its lens, the
   quoted evidence and where it's from, why it costs conversions, and whether it's confirmed by
   data or still an area of interest. Spread the severity honestly: a minor wording slip and a
   pricing page that hides the price are not the same.
3. **Trial path** (trial-led sites): map each step from the sign-up button to the first useful
   result as green, yellow or red with
   [references/trial-path-map.md](references/trial-path-map.md), from public pages and
   screenshots only. Steps you can't see without an account are marked "not seen".
4. **Proof not shown where it's needed:** testimonials, customer counts, logos, results or
   security notes that exist somewhere on the site but are missing from the page where the visitor
   decides (pricing, demo form, sign-up). Quote where it is now.
5. **Competitors:** for each one saved in S1, what its pricing and demo/trial pages do that this
   site doesn't, and the reverse (price shown or hidden, form length, proof, the first ask).
   Quote both pages.
6. **Considered but rejected:** 2–5 things you looked at and decided weren't problems, with why.
   This shows the founder the review was selective.
7. **Not verified:** what you couldn't see (layout, the first screen, mobile, anything behind a
   login, pages that didn't load) and the kit item or screenshot that would settle it.

## Files

```text
# S2 Technical analysis: <product>          → 02-technical.md
## Checked              (each check run, on which pages)
## Issues               (one "### T<n> <title>" each: page, evidence, effect, fix, return-on-fix rating)
## Not checked          (needs a browser or the founder's data, with the screenshot or figure that would settle it)
## Open decisions

# S3 Heuristic analysis: <product>          → 03-heuristic.md
## Inventory            (per page)
## Findings             (one "### F<n> <title>" each, with the "Page:", "Lens:", "Evidence:", "Why it costs conversions:", "Status:" lines)
## Trial path           (trial-led sites only)
## Proof not shown where it's needed
## Competitors
## Considered but rejected
## Not verified
## Open decisions       ("- none", or bullets; add "(blocks S<n>)" when the review can't go on without it)
```

Use the `##` headings exactly, and keep the `Lens:` and `Evidence:` lines in every finding: the
router's check reads them.

An open decision already listed by an earlier step (in `01`–`05`) stays there: don't restate it in your own file in other words, or the founder sees the same question twice. Add a decision only when it is new.

## When this skill is done

This skill is one step of a job, never the whole job. When `02-technical.md` and
`03-heuristic.md` are written, hand back to the micro-SaaS conversion router and carry on with
step 4 of the router's run loop (the check). Don't end the job here: don't write the final reply,
`STATUS.md` or `outcome.json`.
