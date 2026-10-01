---
name: saas-email-build
description: Builds a micro-SaaS email campaign's import-ready pack from its written copy — every email as finished HTML on one tested template (plus a plain-text version), static pre-send checks, the founder's own contact list split into segment CSVs, a sequence setup sheet with each email tool's merge tags, and a send checklist — and writes the M2 Campaign pack. Never sends, schedules or uploads anything. Covers Design and build the emails, Pre-send QA, and Package and hand off (S6–S8). Run by the email campaign router whenever it names S6, S7 or S8.
---

# Building the pack (S6–S8 → M2)

Turn `05-copy.md` into files the founder loads into their own email tool and sends. You never
write or edit HTML: `scripts/build.mjs` fills one tested template from the copy, and
`scripts/check.mjs` checks every email. When a check fails, fix the **copy** (or ask for the
profile field), rebuild and check again. Work inside `artifacts/<campaign>/`.

`B` below is this skill's folder (the base directory shown when it loaded). The scripts find the
home folder's `artifacts/` themselves; they need nothing installed.

## Read first

- `05-copy.md`, `04-storyboard.md` (delays, segments, exit rule), `01-insights.md` (segments,
  suppression, the conversion event), `artifacts/context.md` (sender, postal address, region,
  brand, tool), `inputs/` (a contact list CSV, if given).
- The settings the router passed: style (`branded` or `plain`).

## Steps

1. **Build (S6).** `node B/scripts/build.mjs <campaign> --style <branded|plain>`. It writes
   `pack/emails/NN-<slug>.html` and `.txt`, `pack/preview.html` and `pack/build.json`, and prints
   which profile fields are missing (`blocksSending`). Links to the founder's own site get UTM
   tags; other links are left alone.
2. **Check (S7).** `node B/scripts/check.mjs <campaign>`. It writes `pack/qa.json` and prints a
   Markdown table. On a failure, fix the cause in `05-copy.md` (a long subject, a stray tag, an
   `http://` link, a placeholder), then build and check again. At most two rounds; whatever still
   fails goes under `## Open decisions` in `07-qa.md`. Never edit files in `pack/emails/` by hand.
3. **Contacts.** With a prospect list in `inputs/prospects.csv` (columns email, first_name,
   company, segment, role, source_url, fit_reason):
   `node B/scripts/contacts.mjs split <campaign> inputs/prospects.csv --map "email=email,first_name=first_name,company=company" --segment <segment>`.
   With a CSV from the founder in `inputs/`:
   `node B/scripts/contacts.mjs split <campaign> inputs/<file>.csv --map "email=<col>,first_name=<col>,company=<col>" --segment-col <col> --segments "<value>=<segment>,…" --exclude-col <col> --exclude "<values>"`,
   using the segment and suppression rules in `01-insights.md`. Report the counts it prints
   (rows, kept per segment, excluded, duplicates, invalid). Without a list:
   `node B/scripts/contacts.mjs template <campaign> --segments "<segment>,…"`. A spreadsheet
   (.xlsx) is refused: ask the founder for a CSV under Open decisions. Never add a contact.
4. **Sequence setup sheet (S8).** Write `pack/sequence-setup.md` with
   [references/setup-sheet.md](references/setup-sheet.md): the emails in order with subject,
   delay, segment and file names; the exit rule; the suppression list; and the token table from
   [references/tool-tokens.md](references/tool-tokens.md) (the founder's tool first if the profile
   names one).
5. **Send checklist (S8).** Write `pack/send-checklist.md` from
   [references/send-checklist.md](references/send-checklist.md), filled for this campaign: the
   blocking items first (a `[TBD]` sender or address), the founder's own tests, deliverability
   for their sending domain, the law for their region, and who sends: the founder.
6. **QA record (S7).** Write `07-qa.md`: the table `check.mjs` printed under `## Script checks`;
   under `## Your tests before sending`, what only the founder's tool can test (from the send
   checklist, short); `## Open decisions`.
7. **M2.** `deliverables/M2-campaign-pack.md` with [references/deliverables.md](references/deliverables.md),
   then hand back.

Never send, schedule, upload or connect to an email tool, and never say the campaign is
compliant: the checklist says what to check.

## `07-qa.md`

```text
# S7 Pre-send QA: <campaign>
## Script checks                (the table check.mjs printed, and its last line)
## Your tests before sending    (rendering in your tool, a test send, links, spam test, DNS: one line each)
## Open decisions               ("- none" if none; "(blocks sending)" on a blocking one)
```

## `pack/send-checklist.md`

```text
# Before you send: <campaign>
## Before you send            (blocking items first: [TBD] sender or postal address)
## Your tests
## Deliverability
## The law where you send
## Sending                    (who sends: "You press send." The bot never sends.)
```

Use these `##` headings exactly as written; the router's check looks for them.

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the email campaign router and carry on with step 4 of its run loop (the check). Don't end the job
here: don't write the final reply, `STATUS.md` or `outcome.json`.
