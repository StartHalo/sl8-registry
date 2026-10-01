# Company profile fields

`artifacts/context.md` holds these eight fields and nothing else: the same fields, labels and
table as the app marketing strategy bot, so a customer who uses both is asked once. The router
reads it first on every job, asks for the required fields when they are missing, and is its only
writer (through `scripts/context.mjs`). Never secrets, passwords, or personal data about the app's
users.

| Key | Field | Required | Default with "assume for me" |
|---|---|---|---|
| `company` | Company name | yes | none: ask |
| `app` | App name and store link(s) | yes | none: ask |
| `what` | What the app does, in one line | yes | read from the store listing (`--source "store listing"`) |
| `model` | Business model | no | free with in-app purchase |
| `platforms` | Platforms | no | Android and iOS |
| `health` | Health-feature category | no | general wellness, no medical claims |
| `markets` | Markets and languages | no | the store listing's market and language |
| `preferences` | Tone and summaries | no | plain and direct tone; no leadership summary |

**Updating.** A value in any request replaces the saved one: "Health-feature category: sleep,
no medical claims" → `context.mjs set health "sleep, no medical claims"`. Say in the reply which
fields changed.

**Not profile facts** (they go in the project): the audience, positioning, voice, colours, type,
competitors, reviews, current brand material, the reason for this brand work.
