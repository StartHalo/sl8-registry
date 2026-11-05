---
name: a02-conversion
description: The conversion agency's own skill - its lane (lanes/conversion-review.md) - the path from the customer's site to a trial, a demo or a sign-up read page by page, a fix sheet with each problem on its exact page, its screenshot and a fix their developer can make without asking, and a weekly re-read that counts the fixes live. Use for every task of a conversion/conversion-review lane.
metadata:
  version: 0.1.0
---

# a02-conversion

The lane is `.sl8/bot/.claude/skills/a02-conversion/lanes/conversion-review.md`: when it fits, how it moves the
goal, its gauge, done and pause rules, score guidance, seed tasks S1-S6 and lessons.

Its tasks use the core's skills, from the image; this agency has no templates or scripts of its own:

| Task | Core skill |
|---|---|
| S1 read the path, desktop and phone, with screenshots | `agency-screenshots` |
| S2 the fix sheet (`work/conversion/fix-sheet-v1.pdf`) | `agency-report-pdf` |
| S3 send it and ask for the before figure | `agency-comms` |
| S6 the weekly re-read: fixes live, of N | `agency-web-reads` |

Never change the customer's site or submit its forms: we read, list and check; their developer changes it.
