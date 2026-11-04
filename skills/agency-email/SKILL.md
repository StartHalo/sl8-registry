---
name: agency-email
description: How every email to a customer is written, so it reads like a good agency's short business email - one purpose, the point in the first line, their questions answered, every ask needed now numbered, prose under 150 words, files named, plain words, a closing and the Slate Agency signature, never an internal person's name. Use when writing any comms draft (work/comms/TASK.md), and as the checker's checklist for an email. agency-comms decides what to send and when; this skill is how it reads.
metadata:
  status: draft
  version: 1.0.0
---

# Email

agency-comms decides **whether** and **what** the customer hears; this skill is **how it is written**.
It is the one home of the writing rules (D68); CUSTOMER.md's Email section and standing instructions
win over it.

## When to use

Writing any email to a customer: a comms task's draft, `work/comms/<task>.md`. The checker uses the
checklist below for every email (agency-evaluate).

## Inputs

The comms task (`do`, `refs`, `to`); CUSTOMER.md (the contact's name, the Email section); their
emails since our last (`work/inputs/`, the `received` events), with their subject lines; the files
it carries; `agency status` (the rank-1 lane's open ask, a red goal).

## Steps

1. **One purpose, said first.** The subject and the first sentence (a weekly email: after its three
   summary lines, agency-comms) say it: what is ready, what changed, or the answer; the rest is in the files.
2. **Subject (line 1).** A reply keeps the thread: `Re: <their subject, exactly>`, or `Re: <our
   subject>` when theirs names no topic. A new one says what it is ("Your trial sign-up path: the
   fix sheet"), never "Update" or "Quick question".
3. **"Hi <name>,"** (CUSTOMER.md's People), then the point; no "I hope this finds you well".
4. **Their questions answered,** in their order, a line each. One we can't answer yet: say so and
   what comes next, in the same line.
5. **Files:** each named once, in the sentence that says what it is, then `{{links}}` on its own
   line (`send` puts each file's link there, or its name when attached: D41, D70).
6. **Every ask needed now,** grouped and numbered together under a plain lead ("Four things we need
   from you:"), so nothing waits for another email (D74); one short line each, answerable in a line;
   a date only where one was given (the goal, the plan, them).
7. **Under 150 words,** not counting the `{{links}}` lines, a weekly email's three summary lines, the asks and the "How we checked:" paragraph; 1-3 sentences a paragraph.
8. **Plain words:** none of ours (lane, task, run, check, pass, workspace, `artifacts/`, agent or
   tool names, ids, paths); warm and direct; thanks once, for something specific; no exclamation
   marks, no "just", no apology for normal work.
9. **People:** only the customer's people and "we" (Slate Agency); never an internal person (D67:
   khalid never, nor "our owner" in his place). An ask outside the parameters (spend, a new goal,
   past the date) is said plainly as outside this engagement; one inside them is agreed and done.
10. **End:** "How we checked:" in one or two sentences (what was read, when), a closing line
    ("Best regards,"), then `Slate Agency` last; `send` adds the signature block (D68).

## Output

`work/comms/<task>.md`: the subject on line 1, then the body exactly as it will go, ending with the
closing line and `Slate Agency`.

## Quality bar

**Good** (run 3's re-check rewritten, [example.md](example.md); Brightloom is made up):

```
Re: Your trial sign-up path: the fix sheet

Hi Maya,

Sam's changes completed 3 of the 8 fixes and half of 3 more. One needs doing today: the form still
puts each new user's password in the page address (fix 3). Changing method="get" to method="post"
in the form's first line closes it.

Half done: the old trial link still shows "not found" (fix 1), pricing still sends card questions to
the sign-up page (fix 5), and there is no analytics tag yet (fix 8). Done: fixes 2, 4 and 7.

One thing we need from you:
1. Shall we take the fix sheet as accepted and close this? The aim is your acceptance by 14 November.

How we checked: on 30 October we re-read the live home, pricing, sign-up and welcome pages.

Best regards,
Slate Agency
```

**The checker's checklist** (agency-evaluate reports each miss with its line):

1. One purpose, said in the subject and the first sentence (a weekly email: after its three summary lines); a reply keeps the thread's subject.
2. Greeting by the contact's name.
3. Each question in their emails since our last answered, in their order.
4. Under 150 words, not counting the `{{links}}` lines, the three summary lines, the asks and the "How we checked:" paragraph (the note gives the count).
5. Every ask needed now, grouped and numbered together, one short line each; every date given by someone.
6. Each file named once, with `{{links}}` there.
7. No internal terms, ids, paths, agent or tool names; no internal person ("khalid", any case, "our
   owner"); an outside ask said plainly as outside this engagement.
8. "How we checked:" last and short; a closing line, then `Slate Agency`.
9. Nothing invented: no date, price, spend or promise nobody gave.
10. Not a fourth email we started in 7 days unless urgent: count the log's `sent` events of the last 7 days whose subject doesn't start with "Re:" (D74).

## Verify

`grep -i khalid work/comms/<task>.md` prints nothing. After `send`, open `work/outbox/<task>.eml` in
a mail app: one subject, the text, the signature with the logo, the files attached or linked.

## Sources

Read 30-31 Oct 2026, through search result summaries (the pages themselves were outside this
session's network):
- K. Sehgal, "How to Write Email with Military Precision", *Harvard Business Review*, Nov 2016
  (hbr.org/2016/11/how-to-write-email-with-military-precision): the bottom line up front (BLUF); a
  subject that says what it is; short.
- G. Kawasaki on the five-sentence email (entrepreneur.com/article/226581; five.sentenc.es): who you
  are, what you want, why, the next step; "more than five sentences wastes time".
- Boomerang, "7 tips for getting more responses to your emails with data" (2016, 40 million emails;
  blog.boomerangapp.com/2016/02/7-tips-for-getting-more-responses-to-your-emails-with-data/): 50-125
  words got the most replies; one to three questions, 50% more likely to get a reply than none.
- T. Rogers and J. Lasky-Fink, *Writing for Busy Readers* (Dutton, 2023): fewer words, the purpose
  clear to a skimmer, responding made easy.
- Chron, "Proper Etiquette for Business Emails" (smallbusiness.chron.com/proper-etiquette-business-emails-2875.html):
  a new topic gets its own email, never an old thread.

## Lessons

- **Run 2 (2026-10-30-uc1-r2):** plain text, "Re: your email", khalid named four times, each file
  listed twice. khalid: "Also do you have a skill on business email etiquates. If not that is
  required" · "Where are the logos etc" · "Yes my name comes out". This skill, the branded `.eml`, D67.
- **Run 3 (2026-10-30-uc1-r3):** C1-C3 ran 470, 350 and 429 words with up to eight asks, and the
  checker passed them. khalid: "you need to etiquates on how to write concise business emails". Hence
  one purpose, under 150 words, counted by the checker (D74 later replaced the three-ask cap).
