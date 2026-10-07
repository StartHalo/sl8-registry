# Method: a store listing, field by field

Apple's product page guidance and App Review Guidelines 2.3, and Google Play's Metadata policy.
The limits and quoted rules are in [rules.md](rules.md); `validate.mjs` counts them.

## What each field does
| Field | Its job |
|---|---|
| Apple name / Play title | the name, plus a few words of promise or search term if the name alone says nothing |
| Apple subtitle | the promise in fewest words; no word repeated from the name |
| Apple promotional text | the current news (a launch, a season); changes without a new version; not indexed |
| Apple keywords | words people search that are not already in the name or subtitle: no "app", no category name, no competitor names, no plurals of a word already there, no spaces after commas |
| Apple description | the first sentence carries the promise ("the most important"); then benefits as short lines; accolades last or in promotional text; no prices |
| Play short description | the promise and the main benefit in one sentence |
| Play full description | the same opening as Apple; Play indexes it, so use the search terms naturally, never as a list or repeated |

## How to work
1. Read both store pages and save the current fields (`inputs/current-listing.md`). Apple's keywords
   and promotional text are not public: write "(not public)" as current and say so under Assumptions.
2. Take the promise from `messaging-house.md` and the voice from `voice-rules.md` when present.
3. Write each field: current, proposed (in a fenced block, exactly the text to paste), reason.
4. List every claim in the proposed copy by [claims-check.md](claims-check.md).
5. For a launch ("what is new"), lead the promotional text with it and give it its own block in the
   descriptions; never put a date the lead did not give.

## Look at the references
`examples/ref-good-*.md` (real listings, with counts) and `examples/ref-bad-1.md` (a listing that
repeats its name and opens with a feature list).
