# Claims check: what to list for a person to verify

Copy for a consumer app often makes claims without meaning to ("the fastest way", "trusted by
millions", "never miss"). App stores and advertising law limit them. This check **lists claims for
a person to verify**. It never says copy is compliant, and gives no legal, medical or financial
sign-off.

## First, trace every fact to what was read

Every fact in copy this bot writes (a feature, a number, a place, a time, a data source, an award, a
result) must be in the words saved for this job: a page `page.mjs` saved (`sources/`), the request,
an attached file, or `icp.md`. Look each one up there, in the saved words, not from memory of the page.

- Found: keep it, in words that say no more than the source ("see changes instantly" does not become
  "syncs in under a second").
- Not found: cut it, or keep it and list it under Assumptions:
  `- **Unsourced claims:** "<claim>" (<where>): not on the saved pages or in the request. Send proof, or cut it.`
- A feature named with a ranking word is still a ranking ("best price finder", "top picks"): say what
  it does instead ("finds the lowest price it can see").

## Sort every claim into one of four groups

| Group | What it sounds like | What to do |
|---|---|---|
| **Describes the app** | what the app lets a person do, with no promised result: "plan a trip in one screen", "share a list" | fine; keep it concrete |
| **Needs proof** | a number, a ranking, a comparison or a result: "#1", "the best", "2x faster", "1M users", "award-winning", "loved by" | list it: keep only with the source the company holds (the request, a saved page); else rewrite as "describes the app" |
| **Regulated** | health, money, safety or children: "reduces stress", "save £500", "guaranteed", "safe for kids", "accurate to the minute" | list it as high risk: name the rule; rewrite unless the company holds the evidence |
| **Data and privacy** | "we never sell your data", "private by design", "works offline" | list it: check against the app's privacy label and policy |

## Store rules to name when listing

- **Apple App Review Guidelines 2.3 (accurate metadata)**: the listing describes what the app does;
  no other app names, no prices in the metadata, no misleading claims. **2.3.7**: no unverifiable
  rankings or terms such as "best" in the name or subtitle. **1.4.1**: medical claims get closer review.
- **Apple 5.1.1**: privacy claims match the privacy label.
- **Google Play Metadata policy**: no performance or ranking claims ("#1", "best", "top"), no
  testimonials from unattributed users, no prices or promotions in the title, icon or developer
  name, no emoji or all caps in the title (unless part of the brand), no keyword repetition.
- **Google Play Health apps policy**: an app that is not a medical device says so where health
  features could suggest it is.
- **Advertising law** in most markets: claims need evidence the company holds.

Name the rule; never quote it as settled law. Policy pages change: write "check the current
guideline".

## How to write it

For copy this bot wrote (a store listing), each claim with the words that back it:

```markdown
## Claims to verify
| Claim (where) | Source | Group | Rule to check | Keep if | Safer wording |
|---|---|---|---|---|---|
| "<the claim>" (<field>) | "<the backing words, copied exactly>" (<the App Store page, the Google Play page or the request>) | … | … | … | … |
```

Source is copied exactly from a saved page or the request: the validator finds it there. A claim
nothing backs has Source `none` and the `Unsourced claims` line under Assumptions. With no claims
found, write one row: `| none found | - | - | - | - | - |`.

For copy under review, the table has no Source column (`| Claim (where) | Group | Rule to check |
Keep if | Safer wording |`): each claim is quoted exactly as the material has it, or as a fix writes
it for a claim the fix makes. With none found: `| none found | - | - | - | - |`.

End with: "This lists what to verify. It is not legal sign-off."
