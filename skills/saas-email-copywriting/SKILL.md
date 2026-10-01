---
name: saas-email-copywriting
description: Writes every email of a micro-SaaS email campaign from its storyboard — subject line, preview text, body, one primary button, optional secondary link, sign-off and P.S. — in the founder's voice, in the exact format the campaign's build script reads, as the Write the copy step (S5) of the Atomic Emails method. Also rewrites only the emails a founder names in a change. Run by the email campaign router whenever it names S5.
---

# Writing the copy (S5)

Write the words of every email. You never write HTML: the build step lays the words out. The
router tells you the campaign folder, the settings and, for a change, which emails to rewrite.
Work inside `artifacts/<campaign>/`.

## Read first

- `04-storyboard.md` (one email per row), `01-insights.md` (copy material, problems, the
  conversion event), `02-resources.md` (links and offers), `artifacts/context.md` (voice and
  sign-off), `inputs/` (a voice sample or past email, if given).
- [references/customer-check.md](references/customer-check.md) and
  [references/banned-phrases.md](references/banned-phrases.md).
- **Change mode** (the router names emails, such as `inputs/change-<date>.md`): rewrite only the
  emails named, only in the way asked. Every other email stays exactly as it is, character for
  character. List what changed at the top of `05-copy.md` under `## What changed` (email, field,
  before → after, in one line each).

## Steps, for each storyboard row

1. **Outline from the synopsis.** One idea. Open with the reader's situation or problem, not the
   product. If the email quotes a resource, open its page again and use its own words.
2. **Body.** Short paragraphs (1–3 sentences), plain words, the founder's voice. 50–200 words
   unless the storyboard says long-form. Markdown only: blank lines between paragraphs, `- ` for
   a short list, `**bold**` sparingly, links as `[text](https://…)`. Open with `Hi {{first_name}},`
   unless the voice says otherwise. End the body before the button.
3. **Primary CTA.** One button, the storyboard's offer: `[Verb-first text](https://…)`, the text
   under 30 characters ("Book a 15-minute demo", not "Click here").
4. **Secondary CTA.** Optional, a softer link (a resource), or `none`.
5. **Sign-off.** The founder's name from the profile's sender or voice, with a role after a `/`
   ("Ana / Founder, Tallyhub"). If no name is known, use `[TBD] sender`.
6. **P.S.** Optional: one line that adds something (a reply invitation, a short proof), or `none`.
7. **Subject and preheader.** Subject 60 characters or fewer, specific, no ALL CAPS or `!!`, no
   "Re:" or "Fwd:" tricks. Preheader 40–100 characters that adds to the subject, never repeats it.
8. **Customer check.** Re-read each email with `customer-check.md`; fix what fails.

**Tokens.** Only `{{first_name}}` (in the copy) and `{{unsubscribe_url}}` (the build adds it).
Never `*|FNAME|*`, `{firstName}`, `[First name]` or any other tag: the build's check fails them,
and the setup sheet maps the two tokens to the founder's tool.

**Facts.** Every claim, figure, quote and customer name comes from a page opened in S1–S2 or from
the founder. Every link is from `02-resources.md` or the founder. If you need a fact you don't
have, leave it out; never write a placeholder for it.

## `05-copy.md`

```text
# S5 Copy: <campaign>
## What changed            (change mode only)
## Email 1 · <title from the storyboard>
- Send: <delay from the storyboard, e.g. day 0, +3 days>
- Segment: <segment short names from the storyboard, or "all">
- Subject: <subject>
- Preheader: <preheader>

### Body
<the body in Markdown>

- Primary CTA: [<button text>](<https://…>)
- Secondary CTA: [<text>](<https://…>) | none
- Sign-off: <Name / Role>
- P.S.: <one line> | none

## Email 2 · …
## Open decisions          ("- none" if none)
```

One `## Email <n> · <title>` section per storyboard row, numbered as the storyboard. Every field
line is required, written exactly as above; the build script and the router's check read them.

## When this skill is done

This skill is one step of a job, never the whole job. When `05-copy.md` is written, hand back to
the email campaign router and carry on with step 4 of its run loop (the check). Don't end the job
here: don't write the final reply, `STATUS.md` or `outcome.json`.
