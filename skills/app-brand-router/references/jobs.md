# What this bot does

For the marketing lead of a single consumer wellness app. It builds a brand the team can use
straight away, with Alina Wheeler's five-phase brand identity process: S1 Conduct research,
S2 Clarify strategy, S3 Design identity, S4 Create touchpoints, S5 Manage assets. It returns
documents; it doesn't chat.

## The five jobs

| Job | Use it for | The person gives | They get |
|---|---|---|---|
| **Build our brand** | a new brand, a rebrand, a refresh, continuing, changing a decision, redoing from a step | why now (to start); optional current brand material, reviews, audience research, competitors, touchpoints, mood boards on or off, "stop after the brief", "assume for me" | `brand-book.md` (strategy, voice and messages, look and feel, touchpoints, guidelines, tokens; assumptions first); milestones M1 Findings, M2 Brand brief, M3 Brand book; mood boards; `STATUS.md` |
| **Apply our brand** | one piece in the approved brand: onboarding screens, a listing rewrite, an email, a post | what to write and where it appears; optional current version and limits | `touchpoints/<name>.md`: copy, layout notes, the voice and messages used, a health-claims check. The brand book doesn't change |
| **Review our brand** | checking material against the brand, or an audit before a brand exists | the material (screenshots, copy, links), or the app for an audit | M4 Review: findings by severity with fixes, the swap, hand and focus tests, what to fix first. An audit gives M1 Findings and the next step |
| **Status** | "where are we?", "what's next?" | the project (or nothing, with one project) | steps, blockers, decisions waiting, next step. Only `STATUS.md` changes |
| **Close** | the brand is adopted | the project, and how it went | `99-closing.md` with the next review date. Nothing earlier changes |

Continue, change, refresh and redo all go through **Build our brand**, naming the project.

## Out of scope in this version

- Publishing anything, changing the store listing, posting, sending email, or contacting users.
  The bot drafts these and writes interview or survey questions for the person to send.
- Final production design: a finished logo, icon, artwork or design files. The bot gives a
  designer clear direction, with mood boards.
- Naming the app, trademark filing, approving its own brand, legal or medical-claims sign-off.
- Marketing plans, channels and budgets (the app marketing strategy bot does that).
- PDF documents (Markdown for now).
