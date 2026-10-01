---
name: saas-email-prospects
description: Builds a prospect list for a micro-SaaS founder — organisations that fit their customer profile in an area they name, each with one contact the organisation publishes on its own website, the page it came from and why it fits — as a CSV a campaign can use. Never buys lists, uses data brokers, guesses address patterns or contacts anyone. Run by the email campaign router for a Prospect list job.
---

# Building a prospect list

Find organisations that fit the founder's customer profile and the contact each one publishes on
its own website. The router tells you the folder (made with `scripts/prospects.mjs new`), who to
look for, where, how many (default 25, at most 100) and which role. Work inside that folder.

`P` below is this skill's folder (the base directory shown when it loaded).

## Read first

`artifacts/context.md` (what the product does, who buys it, region) and
[references/sourcing.md](references/sourcing.md).

## Steps

1. **Profile.** One line: what kind of organisation fits, which role buys (from the profile's
   "who buys it" and the request), and what would make one a poor fit.
2. **Find candidates.** Search the web for organisations of that kind in the area: public
   directories and association member lists first (they list many at once), then searches. Collect
   about one and a half times the count asked, so poor fits can be dropped.
3. **Open each candidate's own website.** Its contact, staff, team, leadership or about page.
   Take one contact per organisation, in this order: the published email of the person in the
   buying role; else a published role address for that role (`admissions@`, `office@`); else the
   organisation's main published address. Copy the address exactly as the page shows it.
   `source_url` is the page you read it on.
4. **Fit reason.** One line from what the site says (its type, size, the problem the product
   solves, as the site shows it). Drop organisations that don't fit.
5. **Skip, don't guess.** No email on the site, a contact form only, or the address is an image:
   record it under `## Skipped` with the reason. Never build an address from a name pattern, never
   use LinkedIn, data brokers, enrichment tools or personal social accounts.
6. **Write** `prospects.csv` and `prospects.md` (below), then
   `node P/scripts/prospects.mjs check <folder> --max <count>`. Fix what it reports and check again.
7. Hand back to the router.

Stop at the count asked. If fewer fit, say how many and why in `prospects.md`; never pad the list.

## `prospects.csv`

Exactly these columns, in this order (the campaign's contact step reads them):

```text
email,first_name,company,segment,role,source_url,fit_reason
```

`first_name` only when the page names the person; else empty. `segment` is the list's slug for
every row (or a sub-group such as `private-schools`, if the founder asked for groups). Quote any
field that contains a comma.

## `prospects.md`

```text
# Prospect list: <slug>
<one paragraph: N organisations of <kind> in <area>; how many named contacts vs role addresses; the next request>
## What was done
## How the list was built       (the profile line, the directories and searches used, how many candidates were opened)
## What to verify before sending (from references/sourcing.md: confirm each address, consent where needed, suppress existing customers)
## Skipped                      (organisation · reason; "- none" if none)
## Decisions
## Assumptions
```

Use these `##` headings exactly; the check reads them.

## When this skill is done

This skill is one step of a job, never the whole job. When the list passes its check, hand back
to the email campaign router. Don't write the final reply here.
