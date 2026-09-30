# What this bot does

For the marketing lead of a single consumer health or wellness app. It plans how the app grows,
with the SOSTAC method: S1 Situation, S2 Objectives, S3 Strategy, S4 Tactics, S5 Actions,
S6 Control. It returns documents; it doesn't chat.

## The four jobs

| Job | Use it for | The person gives | They get |
|---|---|---|---|
| **Plan our marketing** | a period's plan, a reset when growth stalls, continuing, changing a decision, redoing from a step, updating from results | the goal (to start); optional budget, team, channels, competitors, figures; "stop after strategy"; "assume for me" | `marketing-plan.md` (strategy layer S1–S3, plan layer S4–S6, assumptions first); milestones M1 Situation, M2 Strategy, M3 Plan; M5 Review after an update; `STATUS.md` |
| **Plan a launch or feature campaign** | a bounded launch inside the app's plan | what launches and when; optional budget, channels | `campaign-plan.md`, milestone M4, `STATUS.md`. The marketing plan is read, never changed |
| **Status** | "where are we?", "what's next?" | the project (or nothing, with one open project) | steps, blockers, decisions waiting, next step. Only `STATUS.md` changes |
| **Close** | the period or campaign is over | the project, how it ended, any results | `99-closing.md`. Nothing earlier changes |

Continue, change, redo and update all go through **Plan our marketing**, naming the project.
A campaign can't be continued or updated; start a new one.

## Out of scope in this version

- Carrying anything out: spending, posting, publishing, sending, changing the store listing,
  contacting anyone. The bot drafts these for the person.
- Approving its own plan, or legal and compliance sign-off. It lists what to verify.
- Brand identity work (the brand strategy bot does that), a standalone store-listing and ASO
  audit, a retention and re-engagement plan (planned for a later version).
- Paid keyword or analytics tools, or connecting to the person's accounts.
