---
name: saas-email-research
description: Researches a micro-SaaS product, its customers and an email campaign's goal from the product's website and what the founder gave — customer and non-fit, the goal as one conversion event, up to three segments and who to leave out, the customer's problems and steps to success, copy material — and lists the resources and offers the emails can use, as the Gather insights and Gather resources steps (S1–S2) of the Atomic Emails method. Run by the email campaign router whenever it names S1 or S2.
---

# Researching the campaign (S1–S2)

Know the product, the customer and the goal well enough that every email can be specific. The
router tells you the campaign folder and the steps. Work inside `artifacts/<campaign>/`.

## Read first

- `artifacts/context.md` (the company profile), `inputs/` (the request; a contact list or past
  emails if given), and [references/segments.md](references/segments.md).
- **The website, before asking anything.** Open the home page, then the pages a customer would
  read: product or features, pricing, the demo or trial page, case studies, testimonials or
  reviews, help or docs, the blog, about. Note each URL you open. If a page won't open, carry on
  and list it under `## Sources` as "not opened".

## Steps

0. **Cold or warm.** If the campaign's list is a prospect list the bot built (the router says so,
   or `inputs/prospects.csv` exists), these people have never heard of the product: a **cold
   first contact**. Say so in `## Audience and segments`; the emails must introduce the founder and
   the product, never say "you asked" or "you signed up", and carry an easy opt-out.
1. **Goal → one conversion event.** Turn the founder's goal into the one action that counts and
   how it is counted: "a demo booked through /request-demo/", "a trial started", "a reply". If the
   goal names no audience, infer it from the goal and say so.
2. **Audience and segments.** At most 3 segments, split by intent and by where people came from
   (a demo request, a trial, a webinar list, a customer). One table row per segment: a short name
   of 2–4 words in lowercase with hyphens (it becomes the contact file's name, such as
   `recent-requests`; never a letter like "A"), who, how to recognise them in the founder's list,
   why they'd act now. Name who is suppressed: customers
   already converted, unsubscribed, anyone who did the conversion event recently.
3. **Customer and non-fit.** Who succeeds with the product, and who isn't a fit (from the site and
   the request; never invented).
4. **Steps to success.** The 3–5 steps a customer takes from interest to the conversion event and
   past it.
5. **Problems.** The main problems the customer has before the product, in their words where the
   site quotes them.
6. **Copy material.** What the product does in one sentence; the founding story if the site tells
   it; why customers chose it (from testimonials or case studies, quoted with the page); the top
   features as benefits; the workaround they'd use without it; the feeling to leave them with.
7. **Resources (S2).** Up to 15 linkable things an email can point to: case studies, guides, help
   pages, videos, templates, testimonials. Each with its URL (opened in this job, or given by the
   founder) and the problem or step it serves.
8. **Offers (S2).** What the founder can offer: the demo link, a guided trial, setup help, a
   trial extension, a discount. Only offers the site shows or the founder gave; an offer you'd
   suggest goes under Open decisions as a question.
9. **Unknowns.** Anything missing is `[TBD]` with a bullet under `## Open decisions`. If the
   profile has no postal address or no sender, add "Postal address for the legal footer (blocks
   sending)" or "Sender name and email (blocks sending)".

Never quote a testimonial, a figure or a customer name that isn't on a page you opened or in what
the founder gave. Never contact anyone.

## `01-insights.md`

```text
# S1 Insights: <campaign>
## Goal and conversion event
## Audience and segments     (a table: Segment (short-name) | Who | How to find them in your list | Why now; at most 3 rows)
## Suppressed
## Customer and non-fit
## Steps to success
## Problems
## Copy material
## Sources                    (every URL opened, or "from you"; pages that didn't open)
## Open decisions             ("- none" if none; a blocking one ends with "(blocks sending)")
```

## `02-resources.md`

```text
# S2 Resources and offers: <campaign>
## Resources                  (a table: Title | URL | Problem or step it serves; at most 15 rows)
## Offers                     (a table: Offer | Link | Condition)
## Open decisions             ("- none" if none)
```

Use these `##` headings exactly as written; the router's check looks for them.

## When this skill is done

This skill is one step of a job, never the whole job. When both files are written, hand back to
the email campaign router and carry on with step 4 of its run loop (the check). Don't end the job
here: don't write the final reply, `STATUS.md` or `outcome.json`.
