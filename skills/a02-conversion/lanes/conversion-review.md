# Lane: conversion review

Library id: `conversion/conversion-review`. A fix sheet for the customer's site (or store page): every spot
that stops a visitor from starting a trial or asking for a demo, with the exact page, a screenshot
and a one-line fix stated as an outcome; then a weekly re-read of the live site to count what is
fixed. It includes making each sign-up's source countable.

## 1. When it fits

- **Fits:** every channel's visitors arrive through the site and sign-up, and the path has clear
  friction (too many fields, no trial length, a hidden trial button, conflicting prices, broken
  links) or no way to tell where sign-ups come from.
- **Stage:** repairs (dead links, conflicting prices) are never held; the source question and
  tracking are the foundation every channel test needs. Pure optimisation of a page with little
  traffic, before users love the product, is early (before that checkpoint, tuning waits).
- **Does not fit:** the customer is rebuilding the site now (re-read the new site first); nobody can
  change the site; the goal does not pass through the site.

## 2. How it moves the goal

paying customers = visitors × share who start a trial or ask for a demo × share who pay. On its own
it wins no customer; it decides how many visitors from every other lane sign up, and the source
question lets each lane be counted.

## 3. Gauge

- **Lead:** open fixes live, of N (read weekly by `agency-web-reads` and `agency-screenshots`); the source
  question live on every form, of N forms.
- **Then:** the share of visits that start a trial or ask for a demo, before and after (from the
  customer; ask for the before figure at send time).
- **Weekly target:** the customer's own; a re-read every week regardless (it catches their edits).

## 4. Done when / Pause when

- **Done when:** the urgent fixes are live (we see it on the weekly read): the weekly report stops and
  the important ones go to the customer once, as a final list (D71).
- **Pause when:** 4 weekly reads with no change on the site: the report says so plainly and stops; it
  restarts when the site changes. Every report ends "Weeks unchanged: N of 4" (D71).

## 5. Score guidance

- **Impact 2:** multiplies every other lane; adds nothing alone.
- **Confidence 2:** friction on sign-up is well documented in general; the size for this site is
  unknown until the customer's figures arrive.
- **Control 1:** we list and check; the customer or their developer changes the site.
- **Who controls:** the customer for every fix; us for the sheet and the weekly read.
- **Speed 3:** most fixes are small.

## 6. Seed tasks

```json
[
  {"id": "S1", "lane": "conversion-review", "kind": "read", "title": "Read the path to a trial or demo",
   "do": "every page from home to trial and demo, desktop and phone; follow every link; record redirects and 404s; screenshots; do not submit forms",
   "refs": ["work/discovery/"], "skill": "agency-screenshots", "owner": "us",
   "done_when": "raw pages and screenshots saved with read time; a read event with the count of broken links",
   "out": "work/conversion/<date>-live/"},
  {"id": "S2", "lane": "conversion-review", "kind": "deliverable", "title": "Fix sheet",
   "do": "one row per problem (one fix block in report.json): URL, the exact spot, its own screenshot (a code-only fix: the code line itself, a fix-code block), a one-line fix stated as an outcome; urgent first, at most 3 (a visitor blocked or misled today: a dead link, contradicting prices, a promise the product doesn't keep), then the important ones (would raise conversion), one line each; the rest dropped; the cover says 'N urgent, M important' (D71); the source question and tracking as one fix",
   "refs": ["work/conversion/<date>-live/", "work/agency/CUSTOMER.md"], "skill": "agency-report-pdf", "owner": "us",
   "done_when": "every urgent row has URL, spot, its own screenshot (count them: screenshots = urgent rows) and a fix a developer can do without asking; re-read against the live site the day it is sent; evaluator passes",
   "out": "work/conversion/fix-sheet-v1.pdf"},
  {"id": "S3", "lane": "comms", "kind": "comms", "title": "Send the fix sheet; ask for the before figure",
   "do": "short email: the top 3 fixes in one line each; ask for visits, trials and demo requests per month for the last four weeks, and who changes the site",
   "refs": ["work/conversion/fix-sheet-v1.pdf"], "follows": "S2", "skill": "agency-comms", "owner": "us",
   "to": "<customer email, from bot/user.md>", "out": "work/comms/<task id>.md"},
  {"id": "S4", "lane": "conversion-review", "kind": "customer", "title": "Make the fixes live",
   "do": "change the site for each fix, starting with the top 3", "skill": "none", "owner": "customer"},
  {"id": "S5", "lane": "conversion-review", "kind": "customer", "title": "The before figure",
   "do": "visits, trials and demo requests a month for the last four weeks; then, once the source question is live, trials and demo requests by source each week", "skill": "none", "owner": "customer"},
  {"id": "S6", "lane": "conversion-review", "kind": "read", "title": "Weekly re-read of the site",
   "do": "re-read the path; count each fix as fixed, fixed another way, partly, open; note anything new the customer changed; log fixes live; the week's report in the fix sheet's order, stopping as §4 says",
   "refs": ["work/conversion/fix-sheet-v1.pdf"], "skill": "agency-web-reads", "owner": "us", "every": "fri",
   "done_when": "a dated note in work/conversion/ and a read event: fixes live (of N)"}
]
```

## 7. References

The live pages and their raw reads, the last fix sheet and the last weekly note, the customer's
price wherever it appears (site, blog, directory listings), their forms and analytics setup as seen
from outside, their before figure if given.

## 8. Lessons from our work

- The exact page, exact spot and a one-line fix is what got used; a list without sources drew "if we
  can find the source for this, I can fix it" (`knowledge/playbooks/conversion-review.md`, Lessons;
  a B2B customer's records, brief).
- Sites change under you: the site changed twice in 12 days and one edit broke most demo links
  (`knowledge/playbooks/conversion-review.md`, Lessons). The weekly re-read khalid asked for
  ("we should redo the conversion review every week", 16 Oct) caught the next change, a new booking
  calendar (a B2B customer's records, section 1).
- Write outcomes, not mechanisms: a fix text gave a 14-day trial where the site said 30
  (a B2B customer's records, section 2, fix 10).
- Ask for the before figure at send time; without it the effect could not be measured
  (`knowledge/playbooks/conversion-review.md`, Lessons).
- Without "How did you hear about us?" on every form and an analytics tag on sign-up, no lane can be
  counted; it became its own fix and a spec (a B2B customer's records,
  section 3 and 5).
- The customer's pace sets the gauge: 0 of 3 open fixes were live on 19 Oct
  (a B2B customer's records, Strategy).
- 2026-10-30 · UC1 run 2026-10-30-uc1: the checks passed fix sheets whose rows had no screenshot
  (v3 and v4). The bar is one screenshot per urgent row (D71), counted; a fix seen only in the page code shows
  that code line as its image (`docs/v5/runs/2026-10-30-uc1/verdict.md`, gap 11).
