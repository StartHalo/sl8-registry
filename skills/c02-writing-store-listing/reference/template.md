# store-listing.md: the layout (validate.mjs reads these headings and the fenced blocks)

````markdown
# <App>: store-listing copy

- App: <name>, <store links>
- Market and language: <…>
- What is new: <the launch, or "no launch: a refresh">
- Brand rules: <messaging-house.md and voice-rules.md | assumed from the store page>

## Apple App Store

### Name
- Current: "<as on the store page>"
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
| Claim (where) | Group | Rule to check | Keep if | Safer wording |
|---|---|---|---|---|

This lists what to verify. It is not legal sign-off.

## Method
Apple's product page guidance and App Review Guidelines 2.3; Google Play's Metadata policy and listing limits.

## Assumptions
- **<Label>:** not given. Assumed <what>. Send <what> to replace it.
````

- Keep the field headings exactly as written. A field that is empty today: `- Current: (none)`; not public: `- Current: (not public)`.
- The Proposed block holds only the text to paste: no quotes, no notes.
- With no claims found, write one row: `| none found | - | - | - | - |`.
