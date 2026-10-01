# Company profile fields

`artifacts/context.md` holds these ten fields and nothing else. The router reads it first on
every job, asks for the required fields when they are missing, and is its only writer (through
`scripts/context.mjs`). Never secrets, passwords, or personal data about the founder's contacts.

| Key | Field | Required | Default with "assume for me" |
|---|---|---|---|
| `company` | Company and product name | yes | none: ask |
| `website` | Website | yes | none: ask |
| `what` | What the product does, in one line | yes | read from the website (`--source website`) |
| `buyers` | Who buys it | no | read from the website (`--source website`) |
| `sender` | Sender name, email and reply-to | before sending | never assumed: `[TBD]` in the pack, blocks sending |
| `address` | Postal address (the legal footer) | before sending | never assumed: `[TBD]` in the pack, blocks sending |
| `region` | Region and recipients | no | US (CAN-SPAM), business recipients |
| `brand` | Logo URL and brand colour | no | `logo: none · colour: #1f4e79`. Write as `logo: https://….png · colour: #rrggbb`; the build reads the URL and the hex |
| `voice` | Voice and sign-off | no | plain and direct; signed with the founder's first name |
| `tool` | Email tool | no | none named; neutral merge tokens |

**Updating.** A value in any request replaces the saved one: "Postal address: 12 Main St,
Austin TX 78701" → `context.mjs set address "12 Main St, Austin TX 78701"`. Say in the reply
which fields changed. A new sender, address or brand on a campaign already built rebuilds its emails (the router's
"rebuild" mode); the words don't change.

**Not profile facts** (they go in the campaign's `inputs/`): the goal, segments, offer, contact
lists, figures, results.
