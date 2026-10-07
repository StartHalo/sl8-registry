# Quillo: brand copy review

- Material: the current App Store description (`material-1.md`, pasted in the request)
- Brand rules: `voice-rules.md` (traits: helpful, not bossy · calm, not flat · plain, not clever) and the promise "One list the whole house can trust" (`messaging-house.md`)
- App: Quillo, https://apps.apple.com/app/id000 (fictional)

## Findings
| # | Where | Line | Problem | Rule (source) | Severity | Fix |
|---|---|---|---|---|---|---|
| 1 | Description, first line | "Quillo is the ultimate revolutionary shopping list app that will totally change the way you shop forever!!" | The first line a shopper reads is hype any list app could sign; the promise (one list for the house) is missing | The first sentence carries the promise (Apple product page guidance); plain, not clever (voice-rules.md) | high | "Quillo is one shopping list for the whole house: add it once, and everyone sees it." |
| 2 | Description, second line | "Never forget anything again." | An absolute promise the app cannot keep | No unverifiable claims (Apple App Review Guidelines 2.3) | medium | "Add it when you think of it, and it's on everyone's list." |
| 3 | Error message | "Oops! Something went wrong. Please try again later." | Says nothing about the list; a worried user does not know if it is lost | Calm, not flat: say what happened and what is safe (voice-rules.md) | medium | "We couldn't sync just now. Your list is saved on this phone." |
| 4 | Milestone | "Congratulations!!! You have completed 10 shopping trips! You are a superstar shopper!" | Hype that talks down; three exclamation marks | Helpful, not bossy; words we avoid: superstar (voice-rules.md) | low | "That's 10 shops planned together. Nice work, all of you." |

## Tests on the whole
- **Swap:** fails. Put a rival list app's name on the first two lines and they still work.
- **Hand:** fails. With the name covered, the hype could be any app; the feature list is closer to Quillo.
- **Field:** partly. A reader could say "a shared shopping list" from the second line, not from the first.

## Fix first
1, 2, 3

## Counts
1 high, 2 medium, 1 low

## Claims to verify
| Claim (where) | Group | Rule to check | Keep if | Safer wording |
|---|---|---|---|---|
| "Never forget anything again." (description) | needs proof | Apple 2.3 accurate metadata | never: it is absolute | "Add it when you think of it." |
| "Works offline in the shop" (features) | describes the app | Apple 2.3 | the app works offline | keep |

This lists what to verify. It is not legal sign-off.

## Method
Neumeier's swap, hand and field tests (The Brand Gap) on the whole; each line checked against the brand's voice rules and messages, and the store's metadata rules.

## Assumptions
- None: every input was given.
