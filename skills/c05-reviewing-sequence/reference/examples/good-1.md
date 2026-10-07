# Tallyroom: sequence review

- Emails reviewed: 3 (pasted in the request)
- Goal: trial users start a paid plan
- Product: Tallyroom, https://tallyroom.example

## Findings
| # | Email | Line | Problem | Rule (source) | Severity | Fix |
|---|---|---|---|---|---|---|
| 1 | 3 | "Last chance!!! 50% off ends tonight" | A deadline and a discount the founder did not confirm; "!!!" and "Last chance" read as spam | Facts are right; no spam triggers in subjects (Litmus, content) | blocker | If there is no real offer: "Your Tallyroom trial ends on <the date>: here's what you keep". If the offer is real, state its end date. |
| 2 | 1 | "Check out our features, read our blog, follow us on social media, or book a demo." | Four asks; none gets done | One primary call to action (Atomic Emails) | major | "The one step that makes Tallyroom work: add your team's holiday calendar." Button: "Add your calendar" |
| 3 | 1 | "Learn more" | The button does not say what happens, and has no link | Every link works; the action is named (Litmus, links; Atomic Emails) | blocker | Button "Add your calendar", linked to the calendar settings page |
| 4 | 2 | "Did you know?" | The subject hides the point | The subject says why to open (Litmus, content) | major | "Import your holiday calendar in one step" |
| 5 | 1 | "The Tallyroom Team" | No person to reply to | The sender is a person (Atomic Emails) | minor | Sign as the founder, by name, and send from them |
| 6 | 1 | "Preview: Welcome to Tallyroom!" | The preview text repeats the subject | Preview text adds a reason to open (Litmus, inbox view) | minor | "One step and your team's time off is in one place" |

## What to keep
- Email 2's single tip (import the holiday calendar) is the right idea: one step toward value.
- Every email greets the reader by first name.

## Verify outside the text
- No email shows an unsubscribe link or a postal address: check your tool adds both to every email.
- One-click unsubscribe headers, and SPF, DKIM and DMARC for the sending domain.
- That each email reads well on a phone and in dark mode.

## Fix first
1, 3, 2

## Counts
2 blocker, 2 major, 2 minor

## Method
Litmus's Ultimate Email Checklist and Atomic Emails' one idea per email (Jane Portman, Userlist).

## Assumptions
- **Who receives it:** not given. Assumed new trial users, from the emails. Send who gets them to check the order and timing.
