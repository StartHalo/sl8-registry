# Ledgerline: trial-path review

- Product: Ledgerline, https://ledgerline.example
- Path reviewed: home → sign-up → first invoice (as the home page describes it)
- Pages read: 3, saved in pages/
- Traffic: not given: treated as low traffic

## The path
| Step | URL | Section | Label | What the visitor meets (quoted) |
|---|---|---|---|---|
| 1 | https://ledgerline.example/ | hero | green | "Send your first invoice in two minutes" |
| 2 | https://ledgerline.example/pricing | plan table | green | "Starter $0.40 an invoice" |
| 3 | https://ledgerline.example/signup | form | yellow | "Company size" and "Phone number", both required |
| 4 | after sign-up | first screens | not seen | "Connect your timesheet. Pick a client. Send." is all the site says |

## What was checked
| Step | Done how | Found |
|---|---|---|
| Technical | fetch facts for the three pages: links, forms, viewport, titles | every page has the same title "Ledgerline"; two labels lead to sign-up ("Start free trial", "Get started"); the form posts and has a submit |
| Heuristic | the five lenses on home, pricing and sign-up | relevance and clarity good on home; friction on the form (four required fields); value gap on pricing (one plan has no price) |
| Digital analytics | not given | the step that loses most cannot be named; kit and the test design job cover it |
| Mouse tracking | not done: kit item "Recording setup" | — |
| Qualitative | not done: kit item "Interview script" | — |
| User testing | not done: kit item "Five-user test" | — |

## Ranked changes
| ID | Page (URL, section) | Now (quoted) | Change | Evidence | Bucket | PXL |
|---|---|---|---|---|---|---|
| C1 | https://ledgerline.example/signup, form | "Phone number" | remove the phone field from sign-up; ask for it later if sales needs it | required before first value (Bowling Alley: yellow); friction lens | Just Do It | 6 |
| C2 | https://ledgerline.example/signup, form | "Company size" | move company size to after the first invoice is sent | required before first value; nothing on the path uses it | Just Do It | 6 |
| C3 | https://ledgerline.example/, hero | "Get started" | use one label for one action: "Start free trial" everywhere | two labels for the same sign-up link (fetch facts) | Just Do It | 4 |
| C4 | https://ledgerline.example/pricing, plan table | "Agency Contact us" | show the Agency price, or "from $X a month" | the only plan without a price; value and friction lenses | Hypothesize | 4 |
| C5 | https://ledgerline.example/pricing, hero | "Simple pricing for growing teams" | name the cost: "From $0.40 an invoice, no seat fees" | the headline says nothing the table does not; relevance lens | Hypothesize | 4 |

## PXL scores
| ID | Above the fold (1) | Noticeable in 5 s (2) | Adds or removes (2) | High-traffic page (1) | User testing (1) | Qualitative (1) | Analytics (1) | Mouse tracking (1) | Ease (0–3) | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| C1 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 3 | 6 |
| C2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 3 | 6 |
| C3 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 3 | 4 |
| C4 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 1 | 4 |
| C5 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 3 | 4 |

## What this review cannot show
- What is above the fold or noticeable in five seconds: no screenshots, so those PXL questions score 0.
- How the pages look and work on a phone, and their speed.
- Every screen after sign-up (step 4): the bot never signs in.
- Which step loses the most people: no figures were given.

## Research kit
### Interview script
Five customers from the last year, 10 minutes each: 1. What was happening when you started looking
for an invoicing tool? 2. What almost stopped you from signing up? 3. What did you compare us with?
4. What would you tell a colleague this does for you? 5. Was anything on our website confusing or
missing? Send back one paragraph per person, in their words (settles C4 and C5).
### Five-user test
Five agency owners who do not know Ledgerline, watched over screen share: 1. "Find out what this
costs for an agency of 12." 2. "Start a trial", stopping before submitting. 3. "Tell me in one
sentence what this does." Send back where each hesitated and what they said (settles C3 and C4).
### Recording setup
Add a free session-recording tool; exclude the sign-up form's fields. After two weeks watch 15
recordings of visitors who reached the sign-up page and note where they stopped. Send back one line
per recording (settles C1 and C2).

## Method
ResearchXL (Peep Laja, CXL; Speero 2022) with its five buckets; PXL order (weights in the PXL table
header); Bowling Alley labels (Wes Bush, ProductLed). Pages read as HTML text, no browser.

## Assumptions
- **Path:** not given. Assumed from the home page's main sign-up button to the first step the site describes. Send the path you care about (for example home, demo, first invoice) to replace it.
- **Traffic:** not given. Assumed low traffic, so nothing is in the Test bucket. Send visits and trials for the last month to replace it.
- **Customer voice:** not given. Assumed none; the interview script collects it. Send support emails, reviews or call notes to replace it.
- **Screenshots:** not given. Assumed none; the fold, looks and screens after sign-up are not checked. Send phone and desktop screenshots of the sign-up and the first three screens to replace it.
