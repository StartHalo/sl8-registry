# sequence-review.md: the layout (validate.mjs reads these headings and the findings table)

```markdown
# <Product>: sequence review

- Emails reviewed: <n> (<attached files / pasted / the sequence this bot wrote>)
- Goal: <the conversion the emails ask for>
- Product: <name, website>

## Findings
| # | Email | Line | Problem | Rule (source) | Severity | Fix |
|---|---|---|---|---|---|---|
| 1 | 2 | "<the line, copied exactly>" | <what goes wrong for the reader> | <the rule> (<source>) | major | <the fix, written out, ready to paste> |

## What to keep
- <what works, and why to keep it>

## Verify outside the text
- <what reading the text cannot show: one-click unsubscribe headers, SPF/DKIM/DMARC, rendering in dark mode>

## Fix first
<three finding numbers, most important first, e.g. 3, 1, 5>

## Counts
<n> blocker, <n> major, <n> minor

## Method
Litmus's Ultimate Email Checklist and Atomic Emails' one idea per email (Jane Portman, Userlist).

## Assumptions
- **<Label>:** not given. Assumed <what>. Send <what> to replace it.
```

- **Line** is copied exactly from the email (subject, preview text or body), in quotes; for something
  that is missing, quote the nearest line and say what is missing in Problem.
- **Severity:** blocker (do not send until fixed: a broken or missing link, no unsubscribe, a false
  claim, the wrong product), major (works against the goal: no call to action, several competing
  asks, a subject that hides the point), minor (polish).
- One finding per problem; rank by what moves the goal most.
