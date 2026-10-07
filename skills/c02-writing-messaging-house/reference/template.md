# messaging-house.md: the layout (validate.mjs reads these headings)

```markdown
# <App>: messaging house

- App: <name>, <store link>
- Positioning: <one line> (from icp.md | from the request | assumed from the store page)
- Sources: <the pages page.mjs saved (sources/<file>), the request, icp.md>

## Brand promise
<one line>

## Pillars

### 1. <short pillar name>
- Message: <one sentence a copywriter could paste>
- Proof: <a fact> (source: <the App Store page | the Google Play page | the request | icp.md | <URL>>, "<the words there, copied exactly>")

### 2. <name>
- Message: …
- Proof: … (source: …)

### 3. <name>
- Message: …
- Proof: … (source: …)

## By audience
| Audience | Lead with |
|---|---|
| <audience> | Pillar <n>: <the first words> |

## Boilerplate
<three or four sentences>

## Method
A message house: one umbrella promise, three pillars with proof under each, a boilerplate (Pragmatic Institute, Atlassian, Umbrex), after Covello's message mapping.

## Assumptions
- **<Label>:** not given. Assumed <what>. Send <what> to replace it.
```

- One `- Proof:` line per proof point; every one ends with `(source: <where>, "<the words>")`, the words copied
  exactly from a page page.mjs saved, the request or icp.md: the validator finds them there.
- A fact in the promise, a message or the boilerplate that no proof point backs: cut it, or add
  `- **Unsourced claims:** "<claim>" (<where>): not on the saved pages or in the request. Send proof, or cut it.`
- When every input was given: `- None: every input was given.`
