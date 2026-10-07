# sequence.md: the layout (build.mjs and validate.mjs read these headings and field names)

```markdown
# <Product>: <goal> email sequence

- Product: <name>, <website>
- Goal: <the conversion that ends the sequence>
- Who receives it: <who>
- Sender: <name or role>
- Postal address: <the founder's address, or "placeholder: send your postal address">
- Email tool: <tool, or "none named">

## Storyboard
| # | Purpose | Idea | Send | Call to action |
|---|---|---|---|---|
| 1 | Crucial problem | <one-line idea> | day 0 | <the button text> |
| 2 | … | … | +2 days | … |

Exit: <when a person stops getting it, written as the tool setting>

## Email 1 · <short title>
- Send: day 0
- Purpose: Crucial problem
- Subject: <what they get, or where they are in the series>
- Preview text: <adds a reason to open; not a repeat of the subject>
- Call to action: [<the action, e.g. Connect your first inbox>](<https link on the product's site>)
- Sign-off: <name or {{sender_name}}>, <role>

### Body
Hi {{first_name}},

<one idea, written to one person, in the founder's voice; a useful thing even without the click>

## Email 2 · …
(one section per storyboard row, numbered the same)

## Setup sheet
<how to load it: the email files, delays, the exit rule, which tool adds the footer, the merge tags
for the founder's tool from tool-tokens.md>

## Send checklist
<from send-checklist.md, for this sequence; blocking items first>

## How to tell it worked
<the goal's conversion first, then clicks, replies, unsubscribes and complaints; opens only as a
weak signal>

## Method
Atomic Emails (Jane Portman, Userlist): one email, one idea; purposes and order from the storyboard.
Build and pre-send checks from Litmus's Ultimate Email Checklist.

## Assumptions
- **<Label>:** not given. Assumed <what>. Send <what> to replace it.
```

The purposes are exactly: Crucial problem, Perceived value, Inspiration, Action. Delays are "day 0",
then "+N days" after the previous email. The footer (unsubscribe and postal address) is added by
build.mjs as merge tags: never write it into the body.
