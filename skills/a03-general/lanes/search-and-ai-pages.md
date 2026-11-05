# Lane: search and AI answer pages

Library id: `search-and-ai-pages`. Pages on the customer's own site that answer the questions
buyers ask Google and AI assistants (what the product is, how it compares, what it works with, who
it is for), plus an `llms.txt`, written by us as ready files the customer pastes in; counted on a
fixed set of buyer questions.

## 1. When it fits

- **Fits:** buyers search or ask an assistant before they buy; the customer's own site is rarely or
  never cited in the answers; there are questions nobody answers well where the customer has a true
  answer (an integration, a niche segment, a comparison).
- **Stage:** any sales or growth stage; it is cheap and slow, so it suits a goal several months out
  or a customer who wants visible progress they can paste.
- **Does not fit:** the customer cannot or will not add pages to their site; the goal date is weeks
  away and nothing else is running (it will not show in time); the only answers would be claims the
  customer cannot back.

## 2. How it moves the goal

trials from search = buyer searches and questions × share whose answer cites the customer's site ×
share who click and start. The method's evidence is thin (one agency's results, one lab study,
correlations); the size is unknown until the source question on sign-up counts it.

## 3. Gauge

- **Lead:** the customer's own site cited in N of the same 20 buyer questions (17 that do not name
  the customer, 3 that do), asked once each with the session's web search tool (capabilities.md,
  "Search and AI assistants' answers"), with a fixed list; also named in N, and
  present in N of a fixed set of category searches.
- **Also:** pages live, of the pages sent (read by `agency-web-reads`).
- **Weekly target:** pages live as the customer's date says; the 20 questions re-read weekly once
  pages are live. One run per question is a snapshot: answers vary run to run.

## 4. Done when / Pause when

- **Done when:** 6 reads of the 20 questions with the first pages live are logged; keep if the own
  site is cited in more than 0, else stop.
- **Pause when:** no page is live 2 weeks after the date the customer gave, or 2 weeks after the
  send if they gave none.

## 5. Score guidance

- **Impact 2:** a lasting source of trials, but slow and unsized.
- **Confidence 1–2:** a written method exists (Ethan Smith's seven steps; Google Search Central);
  evidence is thin and nothing is specific to most niches.
- **Control 2:** we write every page and the counts; the customer pastes and publishes.
- **Who controls:** us for pages and reads; the customer for going live.
- **Speed 2:** pages in days; citations in weeks or months.

## 6. Seed tasks

```json
[
  {"id": "S1", "lane": "search-and-ai-pages", "kind": "read", "title": "Starting count: 20 buyer questions and the category searches",
   "do": "ask the 20 fixed questions once each and run the fixed category searches; record vendors named, pages linked, named yes or no, own site yes or no; save raw answers",
   "refs": ["work/discovery/"], "skill": "agency-task", "owner": "us",
   "notes": "the questions with the session's web search tool; pages live with agency-web-reads",
   "done_when": "a dated record with raw answers; read events: own site cited (of 20), named (of 17)",
   "out": "work/search/<date>/record.md"},
  {"id": "S2", "lane": "search-and-ai-pages", "kind": "work", "title": "Questions nobody answers, and stale facts repeated",
   "do": "from the record: questions where no vendor is cited and the customer has a true answer; third-party listings that repeat an old price or trial",
   "refs": ["work/search/<date>/record.md"], "follows": "S1", "skill": "agency-task", "owner": "us",
   "done_when": "a ranked list of pages to write, each with the question it answers and the source of the true answer",
   "out": "work/search/pages-to-write.md"},
  {"id": "S3", "lane": "search-and-ai-pages", "kind": "deliverable", "title": "The first pages, ready to paste, and llms.txt",
   "do": "each page as final text with its address and where it goes; sources, figures and quotes on the page; only facts the customer has confirmed",
   "refs": ["work/search/pages-to-write.md", "work/agency/CUSTOMER.md"], "skill": "agency-report-pdf", "owner": "us",
   "done_when": "every claim matches the live site or the customer's words; placement note for each; evaluator passes",
   "out": "work/search/pages-v1/"},
  {"id": "S4", "lane": "comms", "kind": "comms", "title": "Send the pages and the starting count",
   "do": "short email: the count in one line, the pages, where each goes; ask for the date they go live and for fixes to stale third-party listings",
   "refs": ["work/search/pages-v1/"], "follows": "S3", "skill": "agency-comms", "owner": "us",
   "to": "<customer email, from bot/user.md>", "out": "work/comms/<task id>.md"},
  {"id": "S5", "lane": "search-and-ai-pages", "kind": "customer", "title": "Paste the pages and publish them",
   "do": "each page live at its address; say when", "skill": "none", "owner": "customer"},
  {"id": "S6", "lane": "search-and-ai-pages", "kind": "read", "title": "Weekly: pages live and the 20 questions",
   "do": "check each page is live; re-ask the same 20 questions; log own site cited (of 20) and pages live (of N)",
   "refs": ["work/search/<date>/record.md"], "skill": "agency-task", "owner": "us", "every": "wed",
   "notes": "the questions with the session's web search tool; pages live with agency-web-reads",
   "done_when": "a new dated record and two read events"}
]
```

## 7. References

The fixed list of 20 questions and the category searches, the last dated record, the customer's
live site (pages, sitemap, robots.txt, llms.txt), their review-site and directory listings, the
method notes, facts the customer has confirmed (integrations, segments, prices).

## 8. Lessons from our work

- The starting count was stark and stable: own site cited in 0 of 20 on 18 and 21 Oct, no question
  changed between the reads (a B2B customer's records).
- Some questions had no cited vendor at all where the customer had a true answer (an integration
  with a school system, a niche segment, a head-to-head comparison); the method says these can be
  won early (a B2B customer's records, bottom line 4).
- Assistants repeat stale third-party listings: an old price and a trial length that were no longer
  true came from an undated exhibitor listing (same file, bottom line 2).
- One major assistant cannot be read by script for free; the choices were a person typing the
  questions once, a capped API test, or a paid tracker; the paid ones need a budget in the parameters (same file, decision 2).
- It was chosen as the one thing after a reset because the customer wanted to see automation and
  steady progress, delivered as "Ready files he pastes in" (a B2B customer's records 2026-10-21/22).
- A page for a segment waits until the fact behind it is confirmed: the Islamic schools page waits
  on confirmed membership of the association (a B2B customer's records, step 4).
  Whether the pages earn citations is unproven.
