# App Store: fields, release and test

Sources, merged: (1) Khalid's ASO guide, sl8-studio/sl8-resesarch `research/aso/v1.0/03_Guide/platforms/Apple.md`
@ 9616aff4, read 1 Nov 2026 (rules checked by its author 1 Nov 2026); (2) this agency's earlier rule
lines, Apple Developer pages fetched live 1 Nov 2026 (`docs/v5/research/2026-11-01-aso-protocol-draft.md`).
One ID scheme, the guide's: A01-A09 as in `research.md`; the earlier lines not in the guide are A10-A11.
Earlier IDs: A1 → A01, A2 → A10, A3 → A04, A4 → A08, A5 → A11. A report's check cites its line (A01...);
a check with no line here is "practice". Use with S04-S07; recheck the linked help each live cycle.

## The rules

- **A01 · Creating your product page** (https://developer.apple.com/app-store/product-page/): name 30;
  subtitle 30 (changes only with a new version); keywords "100 characters total, with terms separated by
  commas and no spaces"; promotional text 170, changeable "at any time without having to submit a new
  version", and it "doesn't affect your app's search ranking"; up to 10 screenshots, up to 3 previews of
  up to 30 seconds. Screenshot order should show real functionality.
- **A02 · Platform version information** (https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information):
  keyword field at most **100 bytes** (count UTF-8 bytes: non-ASCII characters take several; C01);
  description 4,000 characters; promotional text 170.
- **A03 · View and edit app information** (https://developer.apple.com/help/app-store-connect/create-an-app-record/view-and-edit-app-information):
  version-specific fields under Distribution, shared ones under App Information; editability depends on
  the version's state; Save does not prove public deployment.
- **A04 · Product page optimization** (https://developer.apple.com/app-store/product-page-optimization/):
  "up to three" treatments against the original; icons, screenshots and previews (no text); one test at a
  time, up to 90 days; wait for "at least 90% confidence"; needs eligibility and review; alternate icons
  need them in the app build.
- **A05 · Metric definitions** (https://developer.apple.com/help/app-store-connect-analytics/reference/metrics-definitions/):
  conversion = (total downloads + qualifying pre-orders) / unique impressions; total downloads include
  redownloads; usage data is opt-in.
- **A06 · PPO analytics** (https://developer.apple.com/help/app-store-connect-analytics/acquisition/product-page-optimization/):
  native estimates are Bayesian; keep the native labels and uncertainty, never replace them with a z-test.
- **A07 · Ratings, reviews and responses** (https://developer.apple.com/app-store/ratings-and-reviews/):
  reply specifically, ask no personal data, prioritise actionable issues, promise no fix engineering has
  not confirmed; the review prompt is an engineering task.
- **A08 · Custom product pages** (https://developer.apple.com/app-store/custom-product-pages/): up to 70
  pages, each with its own screenshots, promotional text and previews; keywords can be assigned so a page
  shows in search; analytics per page. Not a randomised experiment.
- **A09 · Create a PPO test** (https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/create-a-test):
  eligibility, role, treatment share, locales, duration estimate.
- **A10 · Search** (https://developer.apple.com/app-store/search/): ranking uses "text relevance (matches
  for your app's title, subtitle, keywords, and primary category)" and "user behavior"; keywords: "Don't
  repeat any words included in your app name, subtitle, or category"; no plurals of words already used;
  no "Competing app names".
- **A11 · Acquisition sources** (https://developer.apple.com/help/app-store-connect/view-app-analytics/view-acquisition-sources/):
  App Store search ("Includes views and downloads from ads that appear in App Store search results"),
  browse, app referrer, web referrer; unique impressions, product page views, total downloads,
  conversion rate. App Store search includes ads: call it organic only when the customer's ad figures
  cover the same population; otherwise say ads are included (`measurement.md`).

## Metadata (S04, S06)

Limits: A01, A02. Count the exact localised string. No unsupported features, no competing brand names. Record the allocated terms without promising indexing or ranking.

The customer's team publishes: App Store Connect → Apps → the app → Distribution; the intended version
for version-specific fields, App Information for shared ones; confirm locale and editable state; save,
preview, submit through the offered workflow. Record the actual status, then verify the public listing
separately (we read it: `agency-store-reads`).

## Native screenshot test (S05-S07)

One screenshot treatment, the conservative supported case; no description tests assumed.
1. Confirm eligibility, public state and role; Product Page Optimization → create a test.
2. Name it engagement/cycle/locale/hypothesis id. One treatment; treatment traffic 50% for an equal
   split; verify the console's displayed allocation.
3. Only approved localisations. Upload the reviewed treatment; check device variants and review needs;
   keep control assets and metadata unchanged.
4. Duration estimator: record desired improvement, expected traffic, feasibility; capture the settings
   before starting. Creation help says 90 days at most; analytics help mentions extensions: don't rely
   on one without verifying it live.
5. Complete review and start; keep the test id and start time. Read the actual report: metric and
   denominator, estimated rate, confidence, status. Never derive missing native fields from raw counts.
6. At decision time keep the control if inconclusive; applying a treatment is a separate release
   decision, publicly verified.

## Measurement and exceptions

Keep first-time downloads and redownloads apart. Don't substitute product page views or first-time
downloads into Apple's conversion without renaming the metric; record filters and pre-order treatment.
Alternate-icon tests need an app build (the customer's engineers). Screenshot sizes and device needs:
check the current upload panel and specifications before production. A custom page is a different
experience, not randomised evidence. Review rejection, missing permission or an unavailable test sends
S06 back to blocked, with an owner.

**Known conflict:** analytics help and creation help don't describe the same assets and run limits.
Recorded, not merged into the broadest promise: one screenshot test at a time; verify any expansion live.
