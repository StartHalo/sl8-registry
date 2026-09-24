---
name: writing-postmortems
description: Turns a raw incident record — alerts, chat scroll-back, deploy logs, hand-typed status updates and personal notes — into a blameless postmortem with a reconciled timeline, quantified impact, systemic contributing factors, and action items that each name one person and one date. Use when someone says they had an outage or an incident and needs it written up, asks for a postmortem or a post-incident review, or pastes a mix of pager alerts and chat messages after something broke.
---

# Writing postmortems

A capable model already reconstructs a timeline and writes readable prose. This skill exists for the
six things that go wrong without it, each measured on this machine rather than assumed.

## Settings

This skill uses four settings: `timezone`, `doc_name`, `sections` and `draft_marker`. For each, use
the value the request gives; else a filled-in line under `## Settings` in `bot/user.md`, which is
already loaded; else the default at the end of this file. **Say in the draft which value you used
for each setting and where it came from** — the request, `bot/user.md`, or the default. Never block
on a missing setting. The one exception is `timezone`, which has no default — see step 1.

## The workflow

Copy this checklist and tick it off:

```
- [ ] 1 Reconcile every source into one ordered UTC timeline
- [ ] 2 Report anything you could not place
- [ ] 3 Quantify the impact from what you were given
- [ ] 4 Extract 2-5 systemic contributing factors
- [ ] 5 Extract action items, each with one person and one date
- [ ] 6 Assemble, and label it a draft
- [ ] 7 Self-check, then stop
```

### 1 · Reconcile

Sources keep different clocks. An alert and a deploy log usually carry their own offset; chat
scroll-back and hand-typed status notes usually do not.

- Put **every** event on one timeline in **explicit UTC**, in order.
- For a value that already carries an offset or `Z`, convert it and move on.
- For a bare local time, use `timezone`. **If `timezone` is not set, do
  not guess it** — list those events as unplaced (step 2) and say the timeline is incomplete
  without it. A guessed zone silently mis-orders the timeline, which is worse than an absent event
  because it looks correct.
- **Keep the hypotheses people had at the time, including the ones that turned out wrong**, and show
  them being refuted. What responders believed is the evidence for why they acted as they did, and
  removing it is what makes a postmortem unable to explain its own delays.

### 2 · Report what you could not place

Anything you could not put on the timeline goes in a short list under it — a time buried in prose, a
message with no timestamp, a source that contradicts another. Filtering silently is the failure
this step exists to prevent: the thing you drop is often the sentence that explains the incident.

### 3 · Quantify

Impact is numbers: how long, how many users, what error rate, what was breached. Carry every figure
the input gave you — duration, error rate, affected customers, time to detect, time to resolve.
**Invent none.** If a number was not supplied, say what is unknown rather than estimating it.

### 4 · Extract contributing factors

Two to five, systemic, plural. A single "root cause" invites a single culprit, and incidents that
reach a postmortem rarely have one.

**Write causes off the individual.** This is a rewrite, not a tone:

| Instead of | Write |
|---|---|
| "Engineer caused the outage by deploying a bad config" | "The deployment pipeline allowed a config-only change to reach production without a soak" |
| "She missed the alert" | "The alert routed to a channel nobody was watching at that hour" |

*(the rewrite rule is taken from the postmortem skill at `github.com/lyndonkl/claude`)*

Naming people in the **timeline** is correct and expected — that is a record of what happened. The
rewrite applies to the cause sections, where a name turns a system finding into a verdict on a
person.

### 5 · Extract action items

Every item names **one person** and **one date**.

- Not a team, not "TBD", not "unassigned". If nobody has been named, write the item and mark the
  owner as a decision the review has to make — that is a finding, not a placeholder.
- A priority is not a date. `P1` says how much it matters; it does not say when it will be done.
- Split **mitigative** (closes this specific gap) from **preventative** (addresses the class).

### 6 · Assemble

Use the section set from `sections`, defaulting to:

**Summary · Impact · Timeline · Contributing factors · What went well · Action items**

Add sections when the incident earns them. Do not drop **Impact** — it is the one that disappears
first and the one a reader outside the team needs most.

Write `doc_name` to `artifacts/<project>/`, defaulting to `POSTMORTEM.md`, and use the same filename
every time so anything downstream can find it.

**Label it a draft** unless `draft_marker` says otherwise. A postmortem reaches a reviewed state
through a meeting with people in it; a document that presents itself as final is claiming a review
that has not happened.

### 7 · Self-check, then stop

Before finishing, confirm: every required section present · impact carries real numbers · 2-5
contributing factors, none of them a person · every action item has one name and one date · the
discarded hypotheses are still in the timeline · unplaced events are listed · the draft label is on
· the source of each setting is stated.

If any events are unplaced for want of a `timezone`, the job is `partial`, not `delivered`: say so,
and say that a timezone would place them.

Then stop. Filing the tickets, choosing a deadline and approving the document belong to people.

## Defaults

| Setting | Default |
|---|---|
| `timezone` | **none** — bare local times are listed as unplaced rather than guessed |
| `doc_name` | `POSTMORTEM.md` |
| `sections` | the six above; a customer's value is a comma-separated list of headings, in order |
| `draft_marker` | draft |
