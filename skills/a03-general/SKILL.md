---
name: a03-general
description: The general agency's own skill - the lane library, one entry per type of lane no service agency owns (outbound email, referral, retention feature, search and AI pages), each with when it fits, how it moves the goal, its gauge, done and pause rules, score guidance, seed tasks and lessons. Use when a plan task picks, scores or opens lanes for a goal, and for every task of a lane opened from an entry here.
metadata:
  status: draft
  version: 0.1.0
---

# a03-general

The lanes are in `.sl8/bot/.claude/skills/a03-general/lanes/`; `lanes/INDEX.md` says how to use an entry (fit,
the lane object, the seed tasks, the lessons) and the shape of one.

| Entry | Library id |
|---|---|
| `lanes/outbound-email.md` | `general/outbound-email` |
| `lanes/referral.md` | `general/referral` |
| `lanes/retention-feature.md` | `general/retention-feature` |
| `lanes/search-and-ai-pages.md` | `general/search-and-ai-pages` |

Each lane's tasks name the core skills they use (`agency-web-reads`,
`agency-report-pdf`, `agency-store-reads`, `agency-task`, `agency-comms`); this agency has no templates or scripts of its own.
