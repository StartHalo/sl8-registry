# ASO research record: findings, sources and limits

Source: Khalid's ASO guide, sl8-studio/sl8-resesarch `research/aso/v1.0/` @ 9616aff4, read 1 Nov 2026:
`01_Research/` (README, findings, source_inventory.csv, traceability, access_receipts.json),
`00_Project_Brief.md`, `README.md` and `STATUS.md`. Every source was checked by the guide's author on
1 Nov 2026; recheck a living platform page before a live cycle and record any discrepancy as a dated
note, never a silent change.

## What the guide is, and is not

A documentation package for a first ASO cycle and a repeatable follow-up, for an existing consumer app
(iOS and/or Android, a first US English listing, other locales optional). It promises a documented
process and justified deliverables, not ranking, install or revenue uplift. Out of it: paid acquisition
management, engineering fixes, legal determinations, real design production, professional translation,
advanced pre-launch market validation (Apple Ads data may inform research). It was desk-validated only:
no live engagement, no real app or account, no native test, no novice pilot. The worked example
(RitualLoop) is fictional throughout.

Selection rule for evidence: original procedural teaching first, then official platform constraints,
then original reported cases. Course marketing pages and unread books are leads, not evidence.
Practitioner adoption is not causal proof; no independent academic validation of these frameworks was
found.

## Findings

- Phiture's ASO Stack for coverage, AppTweak's keyword workflow for search, SplitMetrics' sequence for
  creative tests: different jobs; none alone is a complete delivery SOP.
- Phiture's keyword cycle (M4) is compared separately. Neither it nor AppTweak supports the earlier
  35/25/20/20 score, its cutoff of 85 or the invented market-priority formula: all retired.
- Platform references govern fields and submission. A practitioner's statement about an algorithm is
  not an official ranking formula.

## Corrections and source conflicts

| ID | Earlier teaching / issue | Treatment | Evidence |
|---|---|---|---|
| C01 | Historical guide says 100 keyword characters | Count UTF-8 bytes; accented characters are not one byte | T01 p.14 vs A02 |
| C02 | Paid query metrics treated as organic truth | Keep paid, provider and organic provenance and scales apart | T01 p.15; T02; G03 |
| C03 | Older KWO uses another locale for extra US keywords | No cross-locale stuffing; research and review each real language | P04 Step 3.A; A01; G05 |
| C04 | Old density advice could become repetition targets | No repetition percentage or quota; accurate readable copy | P04 Step 3.B vs G01 |
| C05 | Play's Search row taken as all keyword discovery | Copy current definitions; generic-category searches may sit in Explore | G03 |
| C06 | Play click metric described as completed installs | Click intent apart from acquisitions; the source's own wording is inconsistent | G03 vs G02 |
| C07 | Apple analytics mentions description tests and simultaneous tests; configuration pages stress creative assets | One screenshot test (supported by both); no promise of text tests; verify other assets live | A04, A06, A09 |
| C08 | A vendor's numerical crash/rank effect looks like a threshold | Unverified vendor claim, not an acceptance criterion | P02 |
| C09 | Books treated as read from chapter descriptions | B01/B02 explicitly unread; methods use accessible original articles | access receipts, inventory |

## Cases and what they establish

Apple's product page optimisation page reports Simply Piano's original page beating a preview-video
treatment and Peak Brain Training's brain icon beating alternatives (A04): an appealing hypothesis can
lose, and results are app-specific; the percentages are not forecasts. SplitMetrics' Etermax and Hobnob
cases (X01) support hypothesis building, not replicated causal evidence; its bought external traffic is
never pooled with native-store traffic.

## Limits

B01/B02 full books, the AppTweak certification lessons (T04) and the original Phiture spreadsheet were
not read or run; their gaps license no invented author instructions. Hacking Growth was suggested as a
supporting book, not inspected, and is not a method. No paid keyword provider, store account, real build,
native translator or junior pilot was available. If the books become available: a new extraction
record, a comparison with v1, a dated revision.

## Source inventory (27 sources, all checked 1 Nov 2026)

| ID | Source | Access (locator) | Role | What it supports | Limit |
|---|---|---|---|---|---|
| P01 | [Introducing the ASO Stack](https://phiture.com/asostack/introducing-the-aso-stack-2019/), Moritz Daan / Phiture, 2019-06-18; page subsequently updated | Article read (Framework definition, paragraphs 1–9) | M1 | Visibility and conversion are linked concerns; use the framework to avoid narrowing every problem to keywords. | Strategic coverage; no complete sequential SOP. |
| P02 | [ASO Stack Redux 2026](https://phiture.com/asostack/aso-stack-redux-2026-article/), Claudia Trujillo / Phiture, 2026-02-05 | Article read (New Visibility Levers; App Vitals; Strategy) | M1 | Adds discovery surfaces, quality, and creative/tool considerations. Do not adopt its specific crash-to-visibility effect as a proven threshold. | Vendor statements about numerical ranking effects lack inspected underlying data. |
| P03 | [ASO Keyword Optimization in Practice: Part 1](https://phiture.com/asostack/aso-keyword-optimization-in-practice-part-1-e43e8eb9a6f/), Mathew Parry / Phiture, 2019-06-11 | Article read (Getting Started; Steps 2.A–2.B) | M4 | Backlog, imported keyword evidence, relevance labels and multipliers precede metadata targeting. The scoring implementation is not reconstructed from incomplete prose. | Historical tool workflow; original spreadsheet not executed. |
| P04 | [ASO Keyword Optimization in Practice: Part 2](https://phiture.com/asostack/aso-keyword-optimization-in-practice-part-2-504ccc15b531/), Mathew Parry / Phiture, 2019-07-04 | Article read (Steps 2.C, 3.A, 3.B, 4) | M4 | Considers value per character, field allocation, edited copy, and tracking. Keep this workflow separate from AppTweak metrics. | Cross-locale and density claims are historical; not current platform guarantees. |
| T01 | [Advanced Keyword Research Guide](https://www.apptweak.com/assets/resources/guides/AppTweak-Advanced_Keyword_Research_Guide.pdf), AppTweak, Undated PDF; historical product examples | Full 20-page PDF text read; page 12 visually inspected (PDF pp.4–8 discovery; 9–12 selection; 13–15 targeting; 16–19 localization) | M2 | Relevance precedes metric-based selection. Historical KEI is provider-derived, not our own formula. Local research must precede translation. | Vendor estimates; old UI/field descriptions need current checks. |
| T02 | [The step-by-step guide to app store keyword research](https://www.apptweak.com/en/aso-blog/app-store-keyword-research-aso), Alexandra De Clerck / AppTweak, Updated 2026-02-10 | Article sections read (Preparation; Step 1; Step 2; Step 3; monitoring) | M2 | Audit existing performance, discover candidates, prioritize relevant attainable terms, target fields, and monitor. Retain useful existing terms; preserve provider units. | Vendor claims about ranking weights are not platform disclosures. |
| T03 | [Keyword suggestion tools](https://help.apptweak.com/en/articles/4055902-find-keywords-for-your-app-using-our-keyword-suggestion-tools), AppTweak Help Center, 2026-07-22 | Article read (Adding Keywords; Metadata; Top Ranked; Store Auto-Complete) | M2 | Describes current picker names and provenance options. AI suggestions are candidates, not observed searches. | Requires applicable account features for live operation. |
| T04 | [ASO with AppTweak course](https://certification.apptweak.com/course), AppTweak, Undated current curriculum | Curriculum read; lessons not viewed (Organic Search; course outcomes) | Candidate | Retained as a learning route, not evidence that lesson-specific teaching was inspected. | Not equivalent to course completion. |
| X01 | [How to Design & Run Valid A/B tests: the SplitMetrics Framework](https://splitmetrics.com/blog/master-the-official-splitmetrics-a-b-testing-validation-framework-to-win-on-the-app-store/), SplitMetrics, 2026-09-14 | Full article read (Official framework; Steps 1–8; Etermax/Hobnob examples) | M3 | Eight-step experimentation process includes sharing results and returning to hypothesis formation. Research inputs and audience assumptions matter before asset production. | Vendor cases; external test traffic differs from native stores. |
| A01 | [Creating your product page](https://developer.apple.com/app-store/product-page/), Apple Developer, Living documentation | Relevant sections read (App name; Subtitle; Screenshots; Keywords) | Platform | Name/subtitle limits and truthful product presentation guide implementation. Screenshot order should communicate actual functionality. | Recheck before submission. |
| A02 | [Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information), Apple Developer, Living documentation | Relevant fields read (Keywords; Description; Promotional text) | Platform | Keyword field is at most 100 bytes; description 4000 characters; promotional text 170 characters. Use source-specific field rules. | Byte and character constraints differ. |
| A03 | [View and edit app information](https://developer.apple.com/help/app-store-connect/create-an-app-record/view-and-edit-app-information), Apple Developer, Living documentation | Procedure read (Steps 1–4; editable status; FAQs) | Platform | Distribution/version and General/App Information contain different properties; Save does not prove public deployment. | Account/version state determines editability. |
| A04 | [Product page optimization](https://developer.apple.com/app-store/product-page-optimization/), Apple Developer, Living documentation | Overview/configuration and developer cases read (Configure your test; Simply Piano; Peak) | Platform | Native asset tests require eligibility and review; alternate icons have binary dependencies. Keep experiment setup and interpretation tied to the console. | Some newer analytics wording conflicts with configuration guidance. |
| A05 | [Metric definitions](https://developer.apple.com/help/app-store-connect-analytics/reference/metrics-definitions/), Apple Developer, Living documentation | Relevant metric tables read (App Store metrics; Downloads; Usage) | Metrics | Conversion rate uses downloads and pre-orders over unique impressions; total downloads include redownloads. Do not substitute page views. | Usage data is opt-in; metric populations differ. |
| A06 | [Product Page Optimization analytics](https://developer.apple.com/help/app-store-connect-analytics/acquisition/product-page-optimization/), Apple Developer, Living documentation | Article read (Analyze results; definitions; troubleshooting) | Metrics | Native estimates use Bayesian analysis; retain native result labels and uncertainty rather than replacing them with a generic z-test. | Description/multiple-test/duration wording conflicts with other Apple pages. |
| A07 | [Ratings, reviews, and responses](https://developer.apple.com/app-store/ratings-and-reviews/), Apple Developer, Living documentation | Article read (Responding; asking for reviews; managing responses) | Platform | Respond specifically to feedback, avoid personal data, and prioritize actionable issues. Do not promise fixes not confirmed by engineering. | Prompt API implementation is an engineering handoff. |
| A08 | [Custom Product Pages](https://developer.apple.com/app-store/custom-product-pages/), Apple Developer, Living documentation | Overview accessed (Overview and keyword-specific pages) | Platform | Custom pages support intent-specific presentation; they are not automatically randomized experiments. | Optional branch; verify live eligibility before using. |
| G01 | [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en), Google Play Console Help, Living documentation | Listing and localization sections read (Set up your store listing and settings) | Platform | Name 30, short description 80, full description 4000 characters; avoid repetitive or irrelevant keywords. | Paths can change. |
| G02 | [Run A/B tests on your store listing](https://support.google.com/googleplay/android-developer/answer/12053285?hl=en), Google Play Console Help, Living documentation | Article read (Create experiment; review/apply; definitions) | Platform | Localized experiments support descriptions and graphics. Current setup exposes target metric, variants, audience, MDE, and confidence. | Metric definitions have inconsistent click/install wording; record console definition. |
| G03 | [Understand and grow your app user base](https://support.google.com/googleplay/android-developer/answer/9859173?hl=en), Google Play Console Help, Living documentation | Article retrieved and relevant sections read (How measured; conversion analysis; traffic sources) | Metrics | Listing click intent and completed acquisitions are separate. Generic-category search can be grouped under Explore; do not call the Search row all organic keyword traffic. | June/July transition wording and legacy metrics coexist. |
| G04 | [Control when app changes are reviewed and published](https://support.google.com/googleplay/android-developer/answer/9859654?hl=en), Google Play Console Help, Living documentation | Publishing overview sections read (Changes not sent; review; managed publishing) | Platform | Draft, sent for review, ready to publish, and live are different states. | Other queued changes must be reviewed with release owner. |
| G05 | [Translate and localize your app](https://support.google.com/googleplay/android-developer/answer/9844778?hl=en), Google Play Console Help, Living documentation | Translation procedure read (Add translations; language selection) | Platform | Manage translations at the listing; validate app-language readiness and native wording separately. | Language preference is not equivalent to country. |
| G06 | [Create custom store listings](https://support.google.com/googleplay/android-developer/answer/9867158?hl=en), Google Play Console Help, Living documentation | Overview accessed (Targeting and use cases) | Platform | Differentiated pages can serve selected segments; results from different audiences are not an A/B test. | Optional; inspect actual targeting settings. |
| G07 | [Add preview assets](https://support.google.com/googleplay/android-developer/answer/9866151), Google Play Console Help, Living documentation | Page accessed; specifications linked for operator (Screenshots; icon; feature graphic; preview video) | Platform | Use platform requirements for asset production, not dimensions remembered from an old book. | Device/form-factor rules vary; inspect relevant specs before export. |
| B01 | [Advanced App Store Optimization, 2022 edition](https://www.asoebook.com/), Moritz Daan and Maggie Ngai / Phiture, 2022 | Publisher page and Gumroad product page only (Publisher chapter overview) | Book access gap | Official page advertises a free copy. Gumroad product metadata shows zero price but no public content URL; no checkout or personal-data submission performed. | Full text NOT obtained or read. |
| B02 | [Advanced App Store Optimization, 2018 edition](https://phiture.com/resources/asoebook2018/), Moritz Daan and Gabe Kwakyi / Phiture and Incipia, 2018 edition; earlier release 2017 | Publisher page and access HTML only (Chapter list; embedded download form) | Book access gap | Public access route contains an embedded form; no direct PDF was exposed in inspected page. No chapter-level teachings attributed to this book. | Full text NOT obtained or read. |
| A09 | [Create a product page optimization test](https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/create-a-test), Apple Developer, Current documentation checked 2026-11-01 | Procedure read (Create a test; steps 1–8) | Platform overlay / S06 | Native setup covers eligibility, role, treatment share, locale selection and duration estimate. | Creation page duration guidance differs from analytics help; live support must be verified. |

Access receipts: the AppTweak PDF (T01, 14,102,605 bytes, sha256 2ac362d5…35da1), the 2022 book's
Gumroad page (B01, sha256 4a5a3b11…cd5f), the 2018 book page (B02, sha256 1ea58f6e…3316) and the Play
metrics page (G03, sha256 d58d7983…010ca0) were studied in a temporary cache on 1 Nov 2026 and not
redistributed; the full hashes are in the guide's `01_Research/access_receipts.json`.
