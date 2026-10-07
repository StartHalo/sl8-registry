# voice-rules.md: the layout (validate.mjs reads these headings and tables)

```markdown
# <App>: voice rules

- App: <name>, <store link>
- Promise: "<one line>" (from messaging-house.md | assumed from the store page)
- Copy rewritten: <where the before lines come from: pasted in the request, attached files, or the store page page.mjs saved (sources/<file>)>

## Traits

### 1. <X>, not <Y>
- Means: <one sentence>
- Do: "<a real line for this app>"
- Don't: "<the same line gone wrong>"

### 2. …

## Tone by moment

| Moment | Tone | Example line |
|---|---|---|
| First open | … | "…" |
| Reminder | … | "…" |
| Error | … | "…" |
| Milestone | … | "…" |
| Store listing | … | "…" |
| Social | … | "…" |

## Rewrites

| # | Where | Before | After | Trait |
|---|---|---|---|---|
| 1 | <screen or field, e.g. "App Store subtitle", "Error message"> | "<copied exactly from the request, an attached file or a saved page>" | "<rewritten>" | <trait> |

## Words

- Use: <word>, <word>, …
- Avoid: <word>, <word>, … (say <instead> where it helps)

## Method

One voice, tone that flexes by moment (Mailchimp Content Style Guide), traits written "X, not Y" with a do and a don't line each.

## Assumptions

- **<Label>:** not given. Assumed <what>. Send <what> to replace it.
```

- Keep the six moment names exactly as written. When every input was given: `- None: every input was given.`
- A rewrite of a store field names it in Where ("App Store name", "App Store subtitle", "Promotional text",
  "Google Play short description") and its after fits that field's limit: `node $S/scripts/limits.mjs "<where>" "<after>"`.
- With no copy saved word for word (no page opened, none sent): one line under Rewrites, `- None: no copy could be
  read word for word.`, and the `Copy to rewrite` Assumptions line says what to send.
