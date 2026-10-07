# brand-review.md: the layout (validate.mjs reads these headings and the findings table)

```markdown
# <App>: brand copy review

- Material: <what was reviewed: a page page.mjs saved (sources/<file>), attached files, text pasted in the request, or the proposed fields of store-listing.md>
- Brand rules: <messaging-house.md, voice-rules.md, the team's guide | the store page's promise (assumed)>
- App: <name, store link>

## Findings
| # | Where | Line | Problem | Rule (source) | Severity | Fix |
|---|---|---|---|---|---|---|
| 1 | <field or screen; a store field with its store, e.g. "App Store subtitle"> | "<the line, copied exactly from the material>" | <what goes wrong for the reader> | <the rule> (<source>) | high | <the fix, written out, ready to paste> |

## Tests on the whole
- **Swap:** <pass | fails | partly>. <why>
- **Hand:** <…>
- **Field:** <…>

## Fix first
<three finding numbers, most important first, e.g. 1, 3, 2>

## Counts
<n> high, <n> medium, <n> low

## Claims to verify
| Claim (where) | Group | Rule to check | Keep if | Safer wording |
|---|---|---|---|---|

This lists what to verify. It is not legal sign-off.

## Method
Neumeier's swap, hand and field tests (The Brand Gap) on the whole; each line checked against the brand's voice rules and messages, and the store's metadata rules.

## Assumptions
- **<Label>:** not given. Assumed <what>. Send <what> to replace it.
```

- Severity is exactly high, medium or low. One finding per problem.
- The line is copied exactly from the material saved for this job; the validator finds it there. A fix to a store
  field fits that field's limit (`node $S/scripts/limits.mjs "<where>" "<fix>"`).
- Part of the material could not be read word for word: review what was read, and add
  `- **Material:** <the part> could not be read word for word, so it was not reviewed. Send it pasted to review it.`
- With no claims found, write one row: `| none found | - | - | - | - |`.
