# Static ad batch: the long-form method

SL8 wording throughout. The method is JuicyLucy's static-ad-production as the capability
assessment records it (research `juicylucy-ads/staticadproduction-39a415`, approach `WF01-a2`),
restated and cited; nothing here is copied from the vendor's files.

## Contents
- [Source adapters](#source-adapters)
- [Repeat or explore](#repeat-or-explore)
- [Transferable elements](#transferable-elements)
- [Mutation modes](#mutation-modes)
- [Plate check](#plate-check)
- [Master QA](#master-qa)
- [Localization modes and the stress sample](#localization-modes-and-the-stress-sample)
- [Batch QA](#batch-qa)
- [Delivery record](#delivery-record)
- [Guardrails](#guardrails)

## Source adapters

Every batch takes its signal from one of two places, named in `batch.json` as `adapter`.

**winners** (the customer's own account). The ranking, preview check and evidence record are
marketing-winner-analysis (WF03-a1): read its run first, or run it on the customer's export. What
this skill needs from it, per selected concept:
- the ad id or name, spend, results, cost per result and return figures when the export has them;
- confirmation that the creative image was opened and matches the export row;
- the concept cluster, the sibling executions folded into it, and the reference image path;
- its unused-winner ledger, which feeds [repeat or explore](#repeat-or-explore).

Statics only: a video ad never seeds a static batch. A local file with the same concept name is not
the winner until the image has been compared with the row. No token or raw API response is ever
kept in the batch.

**competitors** (public ad libraries over the brand's competitor list).
1. Before looking at any library, add a competitor dimension to the history: competitor or page,
   source link or visible ad id, a short description of the image, the concept, the batches and
   dates it was used in, markets and modes. A source used before is the same source even when its
   file name, crop, language or path changed; mark a doubtful match as doubtful.
2. Per competitor, in the order the brand lists them: the customer's competitor statics by default,
   or a headless screenshot of the library page (`statics.mjs capture`), filtered to active ads, all
   countries and image ads, sorted by impressions where the page offers it. Look at the real
   creative, not a thumbnail or the ad copy alone.
3. Save each chosen reference into `work/<p>/refs/` and record: competitor or page, source id, hook,
   the audience's pain, the promise, the kind of proof, how the copy is built, the layout, the
   reading order, the idea worth reusing and whether it was used before. Keep no login state.
4. Fold translations, other sizes and cosmetic variants of one idea into one slot before choosing.
5. When recent batches kept returning to the same competitor idea, lean toward a credible source
   that is new or little used: variety is the point of this adapter.

Impressions and run length show what a competitor keeps paying for; they are never evidence of
profit or return. No brand file lists competitors: open a gate asking for the list (step 9).

The identity rule holds for both adapters: whoever made the reference owns its name, logo, offer
and landing page. Take the idea; everything that identifies a brand comes from the brand resolved
in step 3.

## Repeat or explore

Join the candidates with the history and write two options, each with its evidence:
- **repeat** the strongest current concept, saying when it was last iterated and how many days ago;
- **explore** a credible different concept, with what the batch would learn from it.

Take the customer's choice when the brief gives one. Otherwise take the stronger option, say which
and why, record it in `batch.json` and carry on; the master review (step 19) is where it can be
overturned. When recent batches reused one concept, recommend exploring. The top-ranked concept is
never repeated just because it is still first.

Source conflict recorded by the assessment (fine point 46): the vendor's long-form reference would
ask here instead of choosing. This skill follows its entry-point rule and says in the delivery that
the choice was made, not asked.

## Transferable elements

Write, per chosen reference, the parts that carry over: hook, promise, kind of proof, copy
structure, layout, reading order, palette role and what the audience wants. Keep the strategy, not
the design. A device tied to a place or culture (a landmark, a local hero, a local joke) becomes its
role (recognition, pride, scale, an anchor) with the local asset marked as not transferable. One
sentence per concept states the idea being tested.

## Mutation modes

Each master gets exactly one mode, recorded with what it keeps and what it alters before any call:
- **copy** (copy-led): new wording; the reference's setting, structure or motif comes back as a new
  rendering that is recognisably related, never a pixel copy.
- **visual** (visual-led): the approved wording stays exactly as approved; the setting, subject,
  surface, composition or visual metaphor changes clearly.
- **remix** (full remix): both change clearly; only the idea under test remains.

Spread all three across the set when the count allows. A colour swap is not a new concept.

## Plate check

Before the copy and logo are composited, look at `plate.png` alone (full size) and write what you
see for each line (HR14):
- no letters, numbers, logos, badges, prices, QR codes, ratings or interface anywhere (an edit
  model given a reference tends to copy its lettering, logo or fake interface);
- no name, face or person from the reference; a person present is generic (HR17);
- the calm zones for the copy and the logo corner are really calm, and inside the safe area.
A fault: mask it out of the plate, or use the one regeneration under the `follow-up` row.

## Master QA

Look at every master at full size, then at about 360 px wide (the phone check), and write what you
see for each line (HR14):
- the safe area holds: every line and the logo sit inside the safe zones of the ratio
  (`conventions.json` § safe_zones; 9x16 keeps the top 14%, the bottom 20% and 6% each side clear);
- the declared mode holds: what was meant to stay stayed, what was meant to change changed;
- the brand name is complete and spelled exactly (a shortened or near-miss name is a defect); the
  real logo is the customer's file, sits in its corner and is not covered;
- every claim is one the brand's product facts support; nothing a platform would flag;
- no clipped or crowded words, no awkward line breaks, no large dead areas, a call to action you can
  read;
- clearly different from the source and from the other masters, not a recolour;
- at phone width, within about three seconds, a viewer gets the main promise and what to do next
  without hunting. If it feels busy, take out extra interface, repeated proof, second call-to-action
  styles and decorative badges before making any type smaller.

## Localization modes and the stress sample

Pick one mode per master before any localized call, and write it in the localization table:
- **text-only**: picture, subject, composition, palette, symbols and call-to-action structure stay;
  only the words and locale details change, reflowed for the script (marketing-ad-localization's
  default fresh render).
- **creative adaptation**: the idea and the brand system stay; subject, setting, object, styling or
  cultural detail may change (marketing-ad-localization's cultural adaptation). A concept tied to a
  place defaults to this, with a target-market equivalent that does the same job; when a language
  covers several markets and the place is unclear, use a setting most of them would recognise.

Per locale: carry the meaning and the selling intent, not the words; localize names, handles,
punctuation and cultural cues; keep the approved concept and the exact brand name; recompose the
type for longer, shorter or right-to-left text instead of dropping new strings into the old boxes.

Before the full run, localize one approved master into four kinds of target: a compact Latin
language, a long Latin language, a non-Latin script and, when the batch has one, a right-to-left
script. Look at all four at 100%. A fault seen there is fixed as a rule (shorter copy, a type note,
a script that takes Track A), not one image at a time.

## Batch QA

For every delivered file (the language gates of marketing-ad-localization cover the localized
ones; `statics.mjs verify` and media-qc measure what can be measured):
1. the right language and locale, nothing left untranslated, phrasing that reads naturally;
2. the brand and product names exactly right, in the right treatment;
3. no clipped, overlapping or tiny text; balanced spacing; a clear hierarchy; a readable call to
   action;
4. the declared ratio and pixel size; the file opens and is the intended final image;
5. the master's mutation mode and the localization mode both respected;
6. clearly different from the source and from its siblings;
7. landmarks and cultural symbols that fit the target market;
8. right-to-left and non-Latin text drawn correctly;
9. the right destination folder, a tool-made name, nothing overwritten, and every ad set holding
   the requested number of distinct files (never one file copied to fill a count);
10. any regenerated file still matches its whole original brief.

When several files share one layout fault, stop, fix the master or the localization rule, and
regenerate the affected files within their attempt caps.

## Delivery record

`batch.json` (keys in `conventions.json` § batch_record) and the reply say:
- the adapter, the scope and how concepts were selected;
- the chosen concepts with their prior use and the idea kept;
- the history consulted, the repeat and explore options and the decision (and that it was decided,
  not asked);
- each master's mode with what it kept and altered, and the review answer;
- the allocation table used;
- the folder tree with counts per language;
- the QA faults fixed, the exceptions, and what still needs a person's review;
- in so many words: no live campaign was published, launched or changed.

## Guardrails

- One medium per shortlist, reference set and QA pass.
- No date, path, page, language set, count, campaign number or root seen in an example or an
  earlier batch is a default: each is an input for this run.
- Production starts only when the brand is resolved, the conventions are readable, earlier batches
  were checked for reuse and repeat or explore is decided.
- One source slot per concept: deduplicate first and keep the strongest reference.
- Never reproduce a source pixel for pixel; keep the idea and change the execution.
- One visual hero, one clear copy hierarchy, one primary call to action.
- Never overwrite a creative, renumber a folder or rerun allocation in a same-day continuation.
- Publishing, launching or changing a live campaign is a separate request; this skill does none of it.
