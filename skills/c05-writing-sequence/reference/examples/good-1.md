# Fernway: trial to paid email sequence

- Product: Fernway, https://fernway.example
- Goal: trial users start a paid plan
- Who receives it: new trial users
- Sender: Dana, founder
- Postal address: placeholder: send your postal address
- Email tool: none named

## Storyboard
| # | Purpose | Idea | Send | Call to action |
|---|---|---|---|---|
| 1 | Crucial problem | The one step that makes Fernway useful: connect the support inbox | day 0 | Connect your inbox |
| 2 | Crucial problem | Answer a customer from Fernway, so the team stops working in two places | +1 day | Reply from Fernway |
| 3 | Perceived value | Saved replies turn the questions you answer every week into one click | +2 days | Write your first saved reply |
| 4 | Inspiration | Why Dana built Fernway after losing customer emails in a shared login | +3 days | See how teams set it up |
| 5 | Action | The trial ends soon: what you keep on a paid plan | +4 days | Choose a plan |

Exit: remove a person from the sequence when they start a paid plan.

## Email 1 · Connect your inbox
- Send: day 0
- Purpose: Crucial problem
- Subject: One step before Fernway can help: connect your inbox
- Preview text: It takes a minute, and every reply after it lands in one place
- Call to action: [Connect your inbox](https://fernway.example/settings/inbox)
- Sign-off: Dana, founder of Fernway

### Body
Hi {{first_name}},

Thanks for starting a Fernway trial. Fernway only becomes useful once your support emails arrive in
it, so the one thing to do today is connect the inbox your customers write to.

If anything stops you, reply to this email and I'll help you set it up.

## Email 2 · Reply from Fernway
- Send: +1 day
- Purpose: Crucial problem
- Subject: Answer your next customer from Fernway
- Preview text: One reply is enough to see the whole conversation in one place
- Call to action: [Reply from Fernway](https://fernway.example/inbox)
- Sign-off: Dana

### Body
Hi {{first_name}},

When the team answers some emails in Fernway and some in the old inbox, nobody knows what was said.
Answer your next customer from Fernway, and the whole conversation stays with the ticket.

## Email 3 · Saved replies
- Send: +2 days
- Purpose: Perceived value
- Subject: Turn the answer you write every week into one click
- Preview text: Saved replies keep your best answer ready for the whole team
- Call to action: [Write your first saved reply](https://fernway.example/saved-replies/new)
- Sign-off: Dana

### Body
Hi {{first_name}},

Most teams answer the same few questions every week. Write your best answer once as a saved reply,
and anyone on the team can send it, edited for the customer, in one click.

## Email 4 · Why I built Fernway
- Send: +3 days
- Purpose: Inspiration
- Subject: Why I built Fernway
- Preview text: A shared password, a lost email, and an angry customer
- Call to action: [See how teams set it up](https://fernway.example/guides/setup)
- Sign-off: Dana

### Body
Hi {{first_name}},

Before Fernway, our team shared one support login. An email got answered twice, another not at all,
and a customer left. Fernway is what I wanted then: one inbox where everyone sees who is answering.

## Email 5 · Your trial ends soon
- Send: +4 days
- Purpose: Action
- Subject: Your Fernway trial ends soon: here's what you keep
- Preview text: Your inbox, saved replies and history stay when you choose a plan
- Call to action: [Choose a plan](https://fernway.example/billing)
- Sign-off: Dana

### Body
Hi {{first_name}},

Your trial ends soon. When you choose a plan, your connected inbox, saved replies and every
conversation stay exactly as they are.

If you're not sure Fernway fits, reply and tell me why: I read every answer.

## Setup sheet
Create a five-step sequence in your email tool, triggered when a trial starts. For each step, choose
"code your own" or "custom HTML", paste `emails/<nn>-….html`, add the matching `.txt` as the
plain-text version, and set the delay from the storyboard. Set the exit: remove a person when they
start a paid plan. Your tool adds the unsubscribe link and your postal address: replace
`{{unsubscribe_url}}` and `{{postal_address}}` with its own tags (see the merge-tag table), and give
`{{first_name}}` a fallback such as "there".

## Send checklist
- Blocking: send your postal address to replace the placeholder.
- Send a test of every email to yourself; open it on a phone and a desktop, and in dark mode.
- Click every link and button; check the merge tags became real values.
- Check SPF, DKIM and DMARC for the domain you send from, and that your tool adds one-click unsubscribe.

## How to tell it worked
The share of trial users who start a paid plan, compared with before the sequence. Then clicks on
each email's call to action, replies, unsubscribes and complaints. Opens are inflated by Apple Mail
Privacy Protection, so read them only as a weak signal.

## Method
Atomic Emails (Jane Portman, Userlist): one email, one idea; purposes and order from the storyboard.
Build and pre-send checks from Litmus's Ultimate Email Checklist.

## Assumptions
- **Offers and resources:** not given. Assumed the setup guide on the site. Send any offer (a setup call, a trial extension) to add it.
- **Postal address:** not given. Left as a placeholder. Send your postal address to replace it.
- **Email tool:** not given. Assumed none: neutral merge tags. Send your tool's name to get its tags.
- **Number of emails:** not given. Assumed 5 (Atomic Emails' recipe). Send a number to change it.
