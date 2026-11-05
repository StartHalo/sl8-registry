# Google Play: fields, release and test

Sources, merged: (1) Khalid's ASO guide, sl8-studio/sl8-resesarch `research/aso/v1.0/03_Guide/platforms/Google_Play.md`
@ 9616aff4, read 1 Nov 2026 (rules checked by its author 1 Nov 2026); (2) this agency's earlier rule
lines from Play Console Help, read 29 Oct 2026 from saved copies and 1 Nov 2026 from search results
(`docs/v5/research/2026-11-01-aso-protocol-draft.md`). One ID scheme, the guide's: G01-G07 as in
`research.md`; the earlier lines not in the guide are G08-G10. Earlier IDs: G1 → G08, G2 → G07,
G3 → G09, G4 → G10, G5 → G06, G6 → G03. A report's check cites its line (G01...); a check with no line
here is "practice". Use with S04-S07; recheck live help each cycle.

## The rules

- **G01 · Create and set up your app** (https://support.google.com/googleplay/android-developer/answer/9859152):
  name 30, short description 80, full description 4,000 characters; avoid repetitive or irrelevant keywords.
- **G02 · Run A/B tests on your store listing** (https://support.google.com/googleplay/android-developer/answer/12053285):
  localised experiments cover descriptions and graphics; setup exposes target metric, variants, audience,
  minimum detectable effect and confidence. Its click/install wording is inconsistent: record the
  console's definition.
- **G03 · Understand and grow your user base** (answer 9859173, https://support.google.com/googleplay/android-developer/answer/9859173):
  store listing visitors, acquisitions and conversion, split by traffic source; listing clicks and
  completed acquisitions are separate; generic-category searches can sit under Explore, so the Search
  row is not all organic keyword traffic; a search-term view only for "Google Play search".
- **G04 · Control when changes are reviewed and published** (https://support.google.com/googleplay/android-developer/answer/9859654):
  draft, sent for review, ready to publish and live are different states; managed publishing.
- **G05 · Translate and localise** (https://support.google.com/googleplay/android-developer/answer/9844778):
  translations are managed at the listing; language preference is not country.
- **G06 · Custom store listings** (https://support.google.com/googleplay/android-developer/answer/9867158;
  also https://play.google.com/console/about/customstorelistings, search result only): "up to 50 custom
  store listings", targeted "by country, user or buyer state, or search keyword". Different audiences
  are not an A/B test.
- **G07 · Add preview assets** (https://support.google.com/googleplay/android-developer/answer/9866151):
  "up to 8 screenshots for each supported device type"; feature graphic 1024x500; "Avoid duplication and
  redundancy of messaging across your short description, screenshots, feature graphics"; device and
  form-factor rules vary.
- **G08 · Metadata policy** (answer 9898842, https://support.google.com/googleplay/android-developer/answer/9898842):
  "Your app title must be 30 characters or less"; no emojis, emoticons or repeated special characters;
  no ALL CAPS; no text "that indicate store performance or ranking" ("#1", "Popular", "Best of Play
  20XX"), price or promotion; no "spammy keywords".
- **G09 · Store listing experiments** (answer 6227309): "one default graphics experiment or up to five
  localized experiments at the same time"; graphics tests cover icon, feature graphic and screenshots;
  localised tests add the descriptions; "up to 2" variants against the current listing; the metric is
  unique user install clicks (or open clicks); results can be "Draw" or "More data needed"; tests stop
  after 6 months.
- **G10 · Store listing best practice** (answer 13393723, search result only): short description 80,
  full 4,000; "Don't repeat your short description in your full description".
- **Play has no subtitle and no keyword field.** Which fields Play search reads is in no Google text
  read; vendors say title, short and full description: practice, not a rule.

## Metadata and publication (S04, S06)

1. Play Console → the app → Grow users → Store presence → Store listings; the target listing and language.
2. Current against proposed, within G01's limits. Natural, accurate, relevant prose. No
   Apple-style keyword field: never paste Apple's keyword list into Play prose.
3. Real app screenshots, supported devices, locale, dimensions, file acceptance (G07 and the upload
   panel). A phone screenshot does not satisfy tablet or watch needs.
4. The customer's team saves; in Publishing overview inspects every pending change, review state and
   managed publishing; submits only the approved set. Saving is not publication. We verify availability
   afterwards (`agency-store-reads`).
5. Other languages: Manage translations → languages → Apply/Save. Record product-language support and
   native review. Country targeting is distinct from language.

## Native experiment (S05-S07)

From the listing's Experiment action, a graphics or localised experiment; here one screenshot treatment
in the same language as the control. Copy the console's settings into the brief: target metric,
acquisition state, language/listing, audience share, confidence, minimum detectable effect, expected
duration. 50% experimental audience with one variant leaves 50% control; verify the displayed split;
more variants divide the experimental share. Preview, save, submit for review where needed, record the
start. At the planned decision time read the recommended action, uncertainty and data sufficiency; keep
the control on a draw or inconclusive result. Never change the primary target after seeing results.

## The reporting trap

Acquisition reporting separates listing clicks from completed acquisitions. A click-through rate can
include Install, Open or Pre-register depending on the population: record the exact label, definition
and acquisition-state filter, and never rename install clicks as installs; get acquisitions separately.
Keep segments consistent between periods. A custom listing targeted by country, query or URL is not a
randomised experiment. If a test can't isolate the intended country, state the real eligible population
or redesign it: language-only traffic is not "US only".
