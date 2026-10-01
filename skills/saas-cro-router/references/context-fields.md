# Company profile fields

`artifacts/context.md` holds these eight fields and nothing else. The router reads it first on
every job, asks for the website when it is missing, and is its only writer (through
`scripts/context.mjs`). Never secrets, passwords, logins, or personal data about the founder's
customers.

| Key | Field | Required | Filled how, if not given |
|---|---|---|---|
| `url` | Website | yes | none: ask |
| `product` | Company and product, in one line | no | read from the home page (`--source site`) |
| `buyers` | Who buys | no | read from the site (`--source site`) |
| `path` | Sales path: demo, free trial, both, freemium | no | read from the site's calls to action (`--source site`) |
| `price` | Price and billing | no | "not known" with "assume for me"; the framing step may read the pricing page into the project |
| `traffic` | Monthly visitors and conversions | no | "not known": the bot takes the low-traffic route |
| `tools` | Tools in place (analytics, recordings, CRM) | no | "none known" |
| `time` | Founder's time for changes | no | "a few hours a week" |

**Updating.** A value in any request replaces the saved one: "Sales path: free trial only" →
`context.mjs set path "free trial only"`. Say in the reply which fields changed.

**Not profile facts** (they go in the project's `inputs/`): figures for a given month, before
and after numbers, interview notes, screenshots, competitors, what was shipped and when.
