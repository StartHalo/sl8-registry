# Lane: outbound email

Library id: `outbound-email`. Cold email in small waves to a list of fitting prospects, built from
public sources, plus one warm email to leads who asked for a demo and went quiet. The customer sends
from their own tool and domain; we size the market, build the list, write the emails and read the
results.

## 1. When it fits

- **Fits:** a B2B goal counted in new paying customers, where buyers can be named from public
  sources (schools, clinics, firms of a type), and competitors get visits from email.
- **Stage:** sales stages from go-to-market fit on; at product-market fit, cold outreach in waves
  is held (not yet: first prove the offer); warm follow-up of the customer's own leads is not held.
- **Does not fit:** a near-term goal that outbound alone cannot reach at published rates (do the
  sums first); the customer will not set up a separate sending domain, sender name and postal
  address; no tool that stops a prospect's emails when they reply, book, unsubscribe or bounce; the
  buying season is months away.

## 2. How it moves the goal

paying customers = prospects emailed × reply rate × demo or trial rate × win rate. A wave of a few
dozen at published median rates gives well under one customer: it tests whether emails arrive and
draw replies, and carries the goal only at volume.

## 3. Gauge

- **Lead:** prospects emailed in the wave, of N; then replies and demos or trials booked.
- **How read:** the customer's sending tool's report and their inbox (a `customer` task gives the
  counts; a `read` logs them). Before sending, the readiness items done, of N (our record).
- **Weekly target:** the wave's schedule (all N emailed over the sequence); success line 1 or more
  positive replies.

## 4. Done when / Pause when

- **Done when:** every prospect in the wave has had every email in the sequence, or has stopped it
  by a reply, opt-out or bounce, and the read 2 weeks after the last email is logged; then keep (1+
  positive reply) or stop.
- **Stop at once when:** more than 2% of emails bounce, or one spam complaint. No reply is not a stop.
- **Pause when:** the sender details (domain, sender name, postal address, tool) are not received 2
  weeks after they were due.

## 5. Score guidance

- **Impact 1–2:** small waves add little before a near date; 2 when waves are large or the season
  is now.
- **Confidence 2:** published cold-email rates exist; the customer's own are unknown.
- **Control 1:** we write and list; the customer's domain, tool, name and send are theirs.
- **Who controls:** the customer for sending and replies; us for list, emails and reads.
- **Speed 2:** a new domain needs warm-up (about two weeks assumed, unsourced) before the first wave.

## 6. Seed tasks

```json
[
  {"id": "S1", "lane": "outbound-email", "kind": "work", "title": "Size the market and set the rates",
   "do": "how many prospects fit, by area, from public sources; reply, demo and win rates from published benchmarks with source and year; the funnel per wave",
   "refs": ["work/discovery/", "work/agency/CUSTOMER.md"], "skill": "agency-web-reads", "owner": "us",
   "done_when": "counts per area with source and date; each rate with its source; the expected result per wave, low to high",
   "out": "work/outbound/sizing.md"},
  {"id": "S2", "lane": "outbound-email", "kind": "work", "title": "Build and verify the first wave's list",
   "do": "find and confirm each address, test the method on a sample; remove current customers and open demo requests; keep the list outside the workspace's shared files",
   "refs": ["work/outbound/sizing.md"], "skill": "agency-task", "owner": "us",
   "done_when": "N prospects with a confidence rank each; sample re-check result recorded",
   "out": "work/outbound/wave-1-list-summary.md"},
  {"id": "S3", "lane": "outbound-email", "kind": "deliverable", "title": "The wave's emails and the warm follow-up email",
   "do": "a short sequence (about 4 emails) and one warm email for leads who went quiet; the customer's own proof (a case study already on their site), no claim beyond it",
   "refs": ["work/outbound/sizing.md", "work/agency/CUSTOMER.md"], "skill": "agency-report-pdf", "owner": "us",
   "done_when": "every claim matches the live site; merge fields and an unsubscribe line in each; evaluator passes",
   "out": "work/outbound/emails-v1.pdf"},
  {"id": "S4", "lane": "comms", "kind": "comms", "title": "Send the emails; ask for the sender details",
   "do": "the emails (the list never goes through the customer's folder: say how many are on it and agree how they get it); ask: sending domain, sender name, postal address, which tool, the areas and dates, and how many quiet leads (a count only)",
   "refs": ["work/outbound/emails-v1.pdf"], "follows": "S3", "skill": "agency-comms", "owner": "us",
   "to": "<customer email, from bot/user.md>", "out": "work/comms/<task id>.md"},
  {"id": "S5", "lane": "outbound-email", "kind": "customer", "title": "Sender details and the sending tool",
   "do": "a sending domain separate from the main one, warmed up; sender name; postal address; the tool named", "skill": "none", "owner": "customer"},
  {"id": "S6", "lane": "outbound-email", "kind": "work", "title": "Check the sending tool",
   "do": "from the tool's own pages: it stops a prospect's emails on reply, booking, unsubscribe and bounce; its terms allow emailing people who never signed up",
   "refs": ["work/outbound/sizing.md"], "follows": "S5", "skill": "agency-web-reads", "owner": "us",
   "done_when": "each check with its page and read date",
   "out": "work/outbound/tool-check.md"},
  {"id": "S7", "lane": "outbound-email", "kind": "customer", "title": "Send the wave and report the counts",
   "do": "load the emails, send on the agreed dates; give the tool's report (sent, bounced, replies, unsubscribes) and the demos booked", "skill": "none", "owner": "customer"},
  {"id": "S8", "lane": "outbound-email", "kind": "read", "title": "Weekly: the wave's numbers",
   "do": "log emailed, bounced, replies, demos or trials from the customer's report; apply the stop rule",
   "skill": "agency-task", "owner": "us", "every": "fri",
   "done_when": "read events with each count given; a stop logged at once if bounces pass 2% or a complaint arrives"}
]
```

## 7. References

The customer's live site (claims, case study, price), the sizing and rates note, the customer's
current customer list and open demo requests (to exclude; held by them, not copied), the sending
tool's pages, the email standard in work/agency/CUSTOMER.md.

## 8. Lessons from our work

- The whole lane waited on details only the customer could give: the sending domain, sender name
  and postal address were due 14 Oct and had not arrived by 19 Oct; 0 prospects emailed
  (a B2B customer's records,
  Strategy). Ask for them first and set the pause rule on them.
- Do the sums before the plan: 24 prospects at the plan's median rates give about 0.5 replies and
  0.01 paying customers, so the wave tests copy and delivery, not the goal
  (a B2B customer's records, section 3).
- The success and stop lines were set before sending: "1+ positive reply"; stop at more than 2%
  bounces or one spam complaint; "No reply is not a stop" (same file, section 2).
- Never copy a prospect list into the workspace's shared record, and ask for counts, not names: the
  warm email asks only how many quiet leads there are (khalid, 19 Oct: "change warm email to count
  only"; a B2B customer's records,
  Decisions).
- Use the proof the customer already has: the case study on their site replaced a new video
  (a B2B customer's records, EC-14).
- Approved but unsent work reads as no progress (inferred): khalid reported the customer "would
  rather pick something and continually amke progress" over recommendations (a B2B customer's records 2026-10-21/22).
