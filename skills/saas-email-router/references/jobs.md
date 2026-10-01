# What this bot does

For the founder of a small SaaS. Give it the product and a campaign goal; it plans, designs and
builds the whole email campaign, ready to load into any email tool. The founder presses send.
It follows Atomic Emails (Jane Portman, Userlist): S1 Gather insights, S2 Gather resources and
offers, S3 Write the idea pool, S4 Build the storyboard, S5 Write the copy; then, from Litmus's
workflow, S6 Design and build the emails, S7 Pre-send QA, S8 Package and hand off, S9 Measure and
iterate. It returns files; it doesn't chat.

## What you get

| | |
|---|---|
| Every email written | yes: subject, preview text, body, button, sign-off, optional P.S. |
| Finished HTML for every email, plus plain text | yes, on one branded (or plain) layout |
| The sequence planned | yes: which emails, order, delays, who gets them, when someone drops out |
| Contact lists | a prospect list it builds (organisations that fit, with contacts published on their own sites), or your own CSV split into one file per segment; it never buys lists or guesses addresses |
| Setup in your email tool | a setup sheet says what to set; you import |
| Sending | never: you press send |

## Job 2: Prospect list

Organisations that fit your customer profile in an area you name, each with one contact the
organisation publishes on its own website and the page it came from: `prospects/<slug>/prospects.csv`
and `prospects.md` (what to verify before sending). You give: who and where ("K-12 private schools
in Ohio"), optionally how many (default 25, at most 100) and the role. Add "then a campaign for
them" to go straight on to a campaign.

## Job 1: Email campaign

| Mode | Use it for | You give | You get |
|---|---|---|---|
| start | a new campaign, any goal | the product (website) and the goal; optional offer, list (CSV), number of emails, style, voice sample, "stop after storyboard", "assume for me" | M1 Campaign plan, M2 Campaign pack, `pack/` (HTML, text, preview, contacts, setup sheet, send checklist), `STATUS.md` |
| continue | approve the plan, or change it and build | the campaign, and the change if any | M2 and `pack/` |
| change emails | rewrite named emails | the campaign, which emails, what to change | a new pack version; the earlier one kept in `versions/` |
| results | after you sent it | the campaign and your figures | M3 Results review: against the goal first, at most 3 changes |
| status | "where are we?" | the campaign (or nothing, with one open) | steps, blockers, decisions, next step; only `STATUS.md` changes |
| close | the campaign is over | the campaign, how it went | `99-closing.md`; nothing earlier changes |

## Out of scope in this version

- Sending, scheduling or uploading emails, or connecting to an email tool or its API.
- Buying, renting or enriching contacts, guessing addresses, data brokers; contacting prospects.
- Changing DNS records or the website (the send checklist says what to set).
- Legal sign-off on consent or compliance (the checklist lists what the region's law asks).
- Wider marketing strategy, site conversion work, emails in one tool's own tag syntax, preview
  images, onboarding triggered by in-app events.
