# Company profile fields

`artifacts/context.md` holds these ten fields and nothing else. The router reads it first on
every job, asks for the required fields when they are missing (or reads them from the website),
and is its only writer (through `scripts/context.mjs`). Never secrets, passwords, or personal data
about the founder's customers.

| Key | Field | Required | Default with "assume for me" |
|---|---|---|---|
| `company` | Company and product name | yes | none: ask |
| `site` | Website | yes | none: ask |
| `what` | What the product does, in one line | yes | read from the website (`--source website`) |
| `buyer` | Who buys: role and type of organisation | yes | read from the website (`--source website`) |
| `price` | Price and billing | no | read from the pricing page; otherwise "not known" |
| `motion` | Sales motion: demo-led, trial-led or hybrid | no | from the website's calls to action; otherwise hybrid |
| `stage` | Paying customers or MRR band | no | early: under 50 paying customers |
| `hours` | Founder hours for marketing each week | no | 5 hours a week |
| `channels` | Channels in use now | no | none known |
| `preferences` | Tone, plan horizon, review cadence | no | plain and direct; 90 days; 90 days |

**Updating.** A value in any request replaces the saved one: "We're demo-led only now" →
`context.mjs set motion "demo-led"`. Say in the reply which fields changed.

**Not profile facts** (they go in the project's `inputs/` or `state.mjs` facts): this period's
goal, budget, figures, competitors, customer notes, an earlier strategy, launch dates.
