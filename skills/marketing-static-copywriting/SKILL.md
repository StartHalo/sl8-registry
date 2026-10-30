---
name: marketing-static-copywriting
description: >-
  Static ad copy: hooks, overlay lines, body and call to action for image ads, written to one copy
  target sentence, checked against platform review rules and the brand's own bans, varied as a
  test set of five on five axes and handed on as a copy-set file; also locks localized copy in a
  provenance ledger before any render, and reports risks in customer-supplied wording without
  rewriting it. Text only, no generation calls. Use when: write or rewrite copy for a static ad
  batch, test variations per concept, check or fix a line ad review might reject, or lock
  target-language copy before localized ads are rendered. NOT for: rendering or localizing the ads
  (marketing-ad-localization); layout of a finished graphic (marketing-branded-graphic); campaign
  families (marketing-campaign-pack); remaking a reference ad (marketing-ad-remake); capturing the
  brand (marketing-brand-kit); picking winners (marketing-winner-analysis); video scripts.
license: SL8 wording and SL8-authored script; method from JuicyLucy static-copywriting and ad-platform (proprietary), restated and cited
compatibility: "marketing-studio >=1.0.0 (sl8-video 1.5.0, sl8-image 1.5.0, Base 2.1.0); python3 3.11 (stdlib only); no ai-gen calls; rules as captured 2026-10-25 (JuicyLucy 0.33.2; platform specs last verified by the vendor 2026-08-17)"
metadata:
  version: 1.0.1
  revision: 2026-10-30a
  house-rules: HR-1.0
  upstream: [juicylucy-ads/staticcopywriting-e87f6c, juicylucy-ads/adplatform-a2543e]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27; JuicyLucy 0.33.2 installed 2026-10-25)
  approach: none (companion copy method; called by WF02-a1 step 6 and by the copy steps of the Marketing ad workflows; issue 294)
  attribution: Method restated in SL8 wording from JuicyLucy's static-copywriting skill and the copy part of its ad-platform skill (proprietary; nothing copied), cited by research id
  deltas: MKT-D460..MKT-D479
---

# Static ad copy

Copy for image ads: the words on the ad and beside it. One sentence fixes what the ad must land;
every line is written in plain customer language, checked against the platform's review patterns
and the brand's own bans, and handed on in one file that the calling workflow reads verbatim. The
method makes no generation call and spends nothing.

The rules are SL8's restatement of a vendor's copy method, written for its own agents and tuned on
Meta review outcomes. Neither the wording nor the copy it produces has been judged on this machine:
treat the first sets a customer receives as a test, and record what review rejects.

Every Bash call starts fresh, so shell variables do not carry over: write the full paths in each
command. Rules and the copy-set shape are in
`$HOME/.agents/skills/marketing-static-copywriting/references/` (`rules.json`, `copy-set.md`).

```bash
python3 $HOME/.agents/skills/marketing-static-copywriting/scripts/copyset.py lint   artifacts/<project>/copy/copy-set.json
python3 $HOME/.agents/skills/marketing-static-copywriting/scripts/copyset.py lock   work/<project>/lock-entry.json --copy-set artifacts/<project>/copy/copy-set.json --ledger artifacts/<project>/qa/<code>/translation-provenance.json
python3 $HOME/.agents/skills/marketing-static-copywriting/scripts/copyset.py export artifacts/<project>/copy/copy-set.json --variant v2 [--slot headline] --out <file>
```

`copyset.py` exits 0 pass or written, 1 a failed check or refusal, 2 an unreadable input or a file
it cannot write. It prints what it measured: FAIL (a rule it can measure), LEAD (read the line,
then answer it in the copy set's `leads[]`; lint fails a LEAD with no answer) and REPORT (customer
wording, reported and never blocked). `export` runs the lint again and refuses on a FAIL unless
`--force`.

## What a request needs

- **The concept or brief:** what is sold and to whom; for a rewrite, the line and, when known, why
  review rejected it; for localization, the source ad and the target language code.
- **The brand, in three parts** (step 3): what may be claimed, what this brand may not say, and the
  terms kept exactly as written (proven phrasings, names kept in Latin letters).
- **Optional:** wording the customer wants used as given; a real promotion with its end date;
  numbers the brand can stand behind (real prices, documented figures); slot names and word limits
  from the calling workflow (for example a hook of at most 6 words); a variant count.

Defaults when nothing else is stated: language `en`; slots `headline`, `body`, `cta`; **Default:
five variants per concept; a kit or brief may name another count**; no word limits (the vendor set
none for static copy). Each default used is said in one line in the delivery (HR12).

## Steps (vendor step numbers in brackets)

1. **Read the rules first** [1]. Read `references/rules.json` whole before writing a line: every row
   (`copy-target`, `writing-rules`, `story-order`, `agency`, `platform-rules`, `two-layers`,
   `rejected-shapes`, `why-flagged`, `money-framing`, `rewrite-shapes`, `variation`,
   `supplied-copy`, `retest`, `localization-lock`, `native-questions`, `term-example`,
   `checklist`). The platform layer travels in this file; there is no separate ad-platform skill on
   this machine. The copy-set shape is in `references/copy-set.md`.
2. **Name the brand** [2]. One brand in the job (a marketing-brand-kit kit, or the customer's brand
   files): use it and name it in the reply. Several and none named: **Default: the brand in the brief; else
   the kit named for the project; else the first by name**, said in one line in the delivery
   (HR12: no question tool; a kit or brief may name another).
   No brand at all: making one in the conversation is **not offered on this machine yet**; the
   local alternative is marketing-brand-kit for the visual brand plus the customer's product facts,
   and a bot job ends and reports that the claims are missing. Never take the brand from what a
   reference ad shows: it is usually a competitor's.
3. **Read the brand's three parts** [3]. From the kit's notes or the customer's files, write the
   `brand` block of the copy set: `name`, `sources` (every file read in this job), `claims`,
   `bans`, `protected_terms` (an empty list says the brand has none; an empty `claims` stops the
   copy, and lint fails it). A file that cannot be read
   stops the copy: report it, never write from memory. Example names in `rules.json` ([Brand])
   are placeholders, never product scope.
4. **Write the copy target** [4]. One sentence, the customer's words, one capability or one
   relief (`copy-target` row). When the reference ad and the claims disagree, the claims win.
5. **Draft** [5]. Apply `writing-rules`: plain words, the reader's concrete pain, relief before
   mechanism, the tired late-evening reader test, one idea per ad (default window 20 words), soft
   promises. Keep exact figures out unless they are in `allowed_numbers`.
6. **Multi-line copy is one story** [6]. Overlay copy of more than one line follows `story-order`
   (today, one obstacle, the product as the bridge, the capability, a close on the same story)
   with connecting words, and `agency` (who acts is clear; making and publishing kept apart). The
   remove-a-line test: if a line can go without changing its neighbours, rewrite it as a story.
7. **Check both layers** [7]. Every line against `platform-rules`, `rejected-shapes`,
   `why-flagged` and `money-framing`, and against the brand's `bans`. A line that clears one layer
   is not cleared by it for the other. Rewrite with `rewrite-shapes`. A flyer, handwritten-note or
   earnings-story concept is flagged to the caller even when the words pass: the look alone is a
   scam trope.
8. **Five variants on five axes** [8]. Per concept, the default count of variants, each with
   `entry`, `format` (one of `checklist`, `problem-relief`, `question`, `testimonial`, `pov`),
   `angle` (`time`, `money`, `stress`, `confidence`, `other`) and `length` (`punch` under 10
   words, `setup` problem before relief, `other`): different entry points, one of each format, at
   least one punch and one setup, more than one angle (`variation` row). The `punch` is counted on the headline slot (words;
   for zh, ja and th characters, fewer than 16). The `testimonial` format is a generic voice with
   no name, role, number, rating or "customers say" attribution (HR17, HR18); the delivery says it
   is a style, not a quote. A risky variant that would clearly win is rebuilt inside the rules,
   never kept. Lint counts authored variants against `count` and fails a mismatch.
9. **Customer wording is used as given** [9]. A variant the customer supplied is `supplied: true`
   and its words are not changed. Lint reports its risks; in `risks[]` name each one (`pattern`:
   the platform shape, the brand ban or the missing claim) with a compliant `alternative`, and say
   them in the reply. Never rewrite it silently and never hold the batch back (`supplied-copy`;
   HR20). A line the customer re-runs after a rejection is written as asked, its pattern named, and
   the reply says to expect a rejection and an appeal (`retest`); keeping that history with the
   brand's records is **not offered on this machine yet**: the copy set's `risks[]` is the record.
10. **Localized copy is locked before the render** [10]. For each source ad, follow
    `localization-lock` and `native-questions`: write out the source's hook, mechanism, proof line
    and call to action; write native copy that keeps the approved claim (meaning, not words; choose
    each term by its object, `term-example`); check claims and both layers; keep protected terms
    letter for letter; set line breaks to the source's hierarchy with phone-safe margins, shorter
    copy before smaller type. Script, direction and Chinese variant come from
    marketing-ad-localization's `references/languages.json` (or a kit's table with the same keys),
    never from memory. Then lock it before the first render:
    `python3 $HOME/.agents/skills/marketing-static-copywriting/scripts/copyset.py lock work/<project>/lock-entry.json --copy-set artifacts/<project>/copy/copy-set.json --ledger artifacts/<project>/qa/<code>/translation-provenance.json`
    (write the entry at `work/<project>/lock-entry.json`) with `source`, `target`, `headline`, `body`, `cta`, `protected_tokens`, `product_marks` (marks
    printed on the product, left as printed) and `notes` (why a line was shortened or reworded).
    With `--copy-set` it also requires every protected term of the brand in `protected_tokens`,
    rejects a figure that is not in `allowed_numbers` or the source copy, and checks absolutes and
    urgency for English. The script refuses a second lock of the same source unless
    `--replace --reason` (the older entry is marked `superseded_by`; a reader takes the entry
    without it). One copy set holds one language: localized copy goes through `lock` only, one
    ledger per `<code>`, and the English copy set is the source of truth. Inspecting
    every rendered glyph is the caller's step (marketing-ad-localization: tesseract OCR as a lead,
    then its own read of the image); this skill renders nothing.
11. **Checklist, lint, hand-off** [11]. Fill `checklist` in the copy set: the 13 items of the
    `checklist` row, each with what you saw, never a bare pass (HR14). Run
    `python3 $HOME/.agents/skills/marketing-static-copywriting/scripts/copyset.py lint artifacts/<project>/copy/copy-set.json`; fix every FAIL and answer every LEAD in the copy set's
    `leads[]` (`where`, `seen`); for a language other than English the word lists are skipped and you read
    every line against the rules. Deliver the copy set (`artifacts/<project>/copy/copy-set.json`)
    and, for a caller that reads one text file, `export` it (for example `copy.txt` for a graphic,
    `hook.txt` for a hook slot), verbatim. Layout and typography are the caller's
    (marketing-branded-graphic, marketing-ad-localization). The reply names the brand used, the
    defaults taken, and every REPORT with its alternative (HR15: name the file and what is still
    owed on it, such as copy not yet judged by the customer).

## Failures

- **A list pretending to be a story:** rebuild it in `story-order` with connecting words.
- **Localization that translated words:** choose the phrase for the object meant and rewrite it as
  a native customer would (`native-questions`).
- **Sentences with no actor** ("Upload the photo. Publish it."): name who acts (`agency`).
- **A line rejected by review:** rewrite with reduction phrasing, ranges instead of exact figures,
  and urgency only for a real dated promotion (`rewrite-shapes`); a rejection overturned on appeal
  once is not cleared for the next submission.
- **No claims to write from:** stop and report what is missing (step 2, step 3); lint fails an
  empty `claims`.

## Not on this machine

- **Making a brand in the conversation** (the vendor's first-brand setup) is not offered on this
  machine yet: marketing-brand-kit for the visual brand plus the customer's claims (step 2).
- **The vendor's evidence ledger and language table** are replaced by marketing-ad-localization's
  `translation-provenance.json` (written with `copyset.py lock`) and its `languages.json`.
- **Platform specs** (canvas, safe zones, file caps, video rules, delivery formats, 9:16 budgets,
  sound-off rules) are not offered on this machine yet; local alternative: marketing-branded-graphic
  for layout and marketing-ad-localization for rendering. The rules here cover the copy only.

## House rules (HR-1.0)

Relies on: HR8 (the copy set under `artifacts/<project>/copy/`), HR12 (stated defaults; no question
tool; a missing brand or unreadable file ends a bot job with a report), HR13 (`copyset.py lint`,
`lock` and `export` measure what can be measured), HR14 (the checklist says what was seen), HR15, HR17 (a
testimonial-style line is generic, never attributed to a real person; lint fails a name, rating
or "customers say"), HR18 (no figure, rating,
testimonial or claim beyond the brand's claims and `allowed_numbers`), HR19, HR20 (customer
wording used as given, its risks reported), HR21, HR22 — see
the shared house rules file `$HOME/.agents/skills/media-ai-gen/references/house-rules.md` (HR-1.0).
Not applicable: HR1–HR7, HR9, HR11, HR16 (no generation call: nothing is quoted, run or retried),
HR10 (no rendering here; the caller composites or renders the locked copy).
Open with HR18 (owner decision pending, learnings MKT-L463): HR18 asks for the customer's
confirmation of a typed claim, while step 9 uses supplied wording as given and reports its risks;
a bot job has no one to confirm.
