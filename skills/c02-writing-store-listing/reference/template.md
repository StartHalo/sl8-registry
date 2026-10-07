# store-listing.md: the layout (validate.mjs reads these headings and the fenced blocks)

````markdown
# <App>: store-listing copy

- App: <name>, <store links>
- Market and language: <…>
- What is new: <the launch, or "no launch: a refresh">
- Brand rules: <messaging-house.md and voice-rules.md | assumed from the store page>
- Sources: <the pages page.mjs saved (sources/<file>), the request>

## Apple App Store

### Name
- Current: "<the field's words, copied exactly from the saved page>"
- Proposed:
```text
<the text to paste>
```
- Reason: <one or two sentences>

### Subtitle
### Promotional text
### Keywords
### Description
(each the same three lines: Current, Proposed in a fenced block, Reason)

## Google Play

### Title
### Short description
### Full description
(the same three lines)

## Claims to verify
| Claim (where) | Source | Group | Rule to check | Keep if | Safer wording |
|---|---|---|---|---|---|

This lists what to verify. It is not legal sign-off.

## Method
Apple's product page guidance and App Review Guidelines 2.3; Google Play's Metadata policy and listing limits.

## Assumptions
- **<Label>:** not given. Assumed <what>. Send <what> to replace it.
````

- Keep the field headings exactly as written. Current is the field's words in quotes, copied exactly from the page
  page.mjs saved (for a description, its first paragraph); the validator finds them there. A field that is empty
  today: `- Current: (none)`; Apple's promotional text and keywords, which the web page does not show:
  `- Current: (not public)`; a page that did not open: `- Current: (not read)`.
- The Proposed block holds only the text to paste: no quotes, no notes.
- Source is the words on a saved page or in the request that back the claim, copied exactly, with where they are:
  `"see changes instantly" (App Store page)`. A claim nothing backs: `none`, and an `- **Unsourced claims:**` line
  under Assumptions ([claims-check.md](claims-check.md)). With no claims found, write one row:
  `| none found | - | - | - | - | - |`.
