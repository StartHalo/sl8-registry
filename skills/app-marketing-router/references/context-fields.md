# Company profile fields

`artifacts/context.md` holds these eight fields and nothing else. The router reads it first on
every job, asks for the required fields when they are missing, and is its only writer (through
`scripts/context.mjs`). Never secrets, passwords, or personal data about the app's users.

| Key | Field | Required | Default with "assume for me" |
|---|---|---|---|
| `company` | Company name | yes | none: ask |
| `app` | App name and store link(s) | yes | none: ask |
| `what` | What the app does, in one line | yes | read from the store listing (`--source "store listing"`) |
| `model` | Business model | no | free with in-app purchase |
| `platforms` | Platforms | no | Android and iOS |
| `health` | Health-feature category | no | general wellness, no medical claims |
| `markets` | Markets and languages | no | the store listing's market and language |
| `preferences` | Tone, plan horizon, leadership summary | no | plain and direct; 90 days; no summary |

**Updating.** A value in any request replaces the saved one: "Business model: subscription" →
`context.mjs set model "subscription"`. Say in the reply which fields changed.

**Not profile facts** (they go in the project's `inputs/`): this period's goal, budget, team,
channels in use, competitors, figures, launch dates.
