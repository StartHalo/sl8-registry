# brand-review.md: the layout (validate.mjs reads these headings and the findings table)

```markdown
# <App>: brand copy review

- Material: <what was reviewed: the link, attached files, or pasted text> (saved in inputs/material.md)
- Brand rules: <messaging-house.md, voice-rules.md, the team's guide | the store page's promise (assumed)>
- App: <name, store link>

## Findings
| # | Where | Line | Problem | Rule (source) | Severity | Fix |
|---|---|---|---|---|---|---|
| 1 | <field or screen> | "<the line, copied exactly>" | <what goes wrong for the reader> | <the rule> (<source>) | high | <the fix, written out, ready to paste> |

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
- With no claims found, write one row: `| none found | - | - | - | - |`.
