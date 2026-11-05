# Lane: referral

Library id: `referral`. The customer asks their current, happy customers for introductions to
peers, with a reward paid when the new customer pays, and asks for a public review in the same
call. The customer runs it; our work is the method, the words, the counting and the follow-up.

## 1. When it fits

- **Fits:** a B2B goal counted in new paying customers, where the customer has a base of happy
  customers (high renewal) who know peers who buy the same thing, and the founder or a salesperson
  can call them.
- **Stage:** any sales stage; customer referrals are never held, at any stage.
- **Does not fit:** few customers or weak renewal; nobody on the customer's side will make the calls;
  a consumer app (use a share card in a retention lane instead).

## 2. How it moves the goal

new paying customers = customers called × share who introduce × introductions who start a trial or
demo × share who pay. No published benchmark exists for introduction to trial; every rate is an
assumption until the customer's first counts.

## 3. Gauge

- **Lead:** customers called and introductions asked (weekly target: the customer's to set).
- **Then:** introductions received, trials or demos from them, paid.
- **How read:** only from the customer (a `customer` task asks for the counts; a `read` logs each
  one); a source question on sign-up ("How did you hear about us?") makes referred sign-ups
  countable. Reviews on review sites can be read by us (`agency-web-reads`).

## 4. Done when / Pause when

- **Done when:** every current customer has been called, or the customer says the round is over,
  and the counts are logged; then keep, change the offer or stop.
- **Pause when:** the customer says to, or no count has come 2 weeks after the date they gave (or
  after the ask, if they gave none).
  Follow up only on their dates (comms guidance); never chase a paused lane.

## 5. Score guidance

- **Impact 3:** the warmest channel for a firm with many happy customers; in our arithmetic it can
  carry a small near-term goal.
- **Confidence 2:** competitors in the space run "refer a" offers, but the rate is unproven.
- **Control 1:** the customer makes every call and pays the reward.
- **Who controls:** the customer. Kept in the plan and shown as theirs; our tasks are comms and
  counts.
- **Speed 2–3:** calls can start this week; trials take their length to pay.

## 6. Seed tasks

```json
[
  {"id": "S1", "lane": "referral", "kind": "work", "title": "The method in a few lines",
   "do": "who to call first (happiest), the one question to ask, one nudge then stop, the reward paid when the new customer pays, a review asked in the same call (no gift); what competitors offer",
   "refs": ["work/discovery/", "work/agency/CUSTOMER.md"], "skill": "agency-web-reads", "owner": "us",
   "done_when": "under ten lines, each claim sourced; competitors' offers linked",
   "out": "work/referral/method.md"},
  {"id": "S2", "lane": "comms", "kind": "comms", "title": "Send the method and ask for the counts",
   "do": "the call tips in the email body; ask for the weekly counts (called, introductions, trials, paid) and the date they start",
   "refs": [], "follows": "S1", "skill": "agency-comms", "owner": "us",
   "to": "<customer email, from bot/user.md>", "out": "work/comms/<task id>.md"},
  {"id": "S3", "lane": "referral", "kind": "customer", "title": "Launch the offer and call each customer",
   "do": "put the offer where customers see it (their dashboard or newsletter); call each customer, happiest first", "skill": "none", "owner": "customer"},
  {"id": "S4", "lane": "referral", "kind": "customer", "title": "Report the counts",
   "do": "customers called, introductions, trials or demos, paid, since the last count", "skill": "none", "owner": "customer"},
  {"id": "S5", "lane": "referral", "kind": "read", "title": "Weekly: reviews on the review sites",
   "do": "count reviews and the newest review's date on the customer's review-site listings; log the count",
   "skill": "agency-web-reads", "owner": "us", "every": "fri",
   "done_when": "a read event with the review count and its source"}
]
```

## 7. References

The customer's renewal figure and customer count, their review-site listings, competitors' referral
offers, any source question on their sign-up and demo forms (from the conversion lane), the
customer's standing instructions on what is theirs to run.

## 8. Lessons from our work

- When the customer runs it, we open no project of ours: "Leave that upto [the founder]. No
  projects runnign there" (a B2B customer's records, Strategy; a B2B customer's records,
  Decisions, 2026-10-16). In v5 that is a lane shown as the customer's, with low control.
- It was ranked the first channel and called "more of a sales than marketing" play, but was still
  not launched at the call; no counts came after (a B2B customer's records,
  "Channel Review: Referrals"; a B2B customer's records, Strategy).
- No published benchmark exists for introduction to trial; the plan's numbers were assumptions to be
  reset by the first thirty introductions (a B2B customer's records,
  Exhibit 4).
- Ask for a review in the same call: the newest review on the main review site was from August 2021
  (a B2B customer's records, item 1).
- Without a source question on sign-up, a referred customer looks like direct traffic (inferred) and the lane
  cannot be counted (a B2B customer's records,
  section 3). Pair this lane with the conversion lane's source question.
- The sums set the ask: for a few new customers from a base of a few dozen, about one call in 13 must end in a
  paying customer (a B2B customer's records, Strategy, the arithmetic). Whether that is reachable
  is unproven.
