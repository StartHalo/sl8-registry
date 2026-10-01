---
name: app-brand-closing
description: Closes a consumer wellness app's brand project with an honest summary — what was decided, what the person reported about adoption, what stays open, and when to review the brand next — without claiming any result that wasn't supplied. Run by the app brand router for the Close job.
---

# Closing a brand project

Write an honest record of where the brand ended up. The router tells you the project folder.
Work inside `artifacts/<project>/`.

## Read

- `brand-book.md`, `05-guidelines.md` (review cadence and triggers), `state.md`'s open
  decisions, any `reviews/`, and the close request in `inputs/`.

## Write `99-closing.md`

```text
# Closing: <app>, <project>
Closed on <date> · brand book v<N>

## What was decided        (audience, onliness statement, promise, voice words, the look, in brief)
## What you reported       (adoption, launches, reactions: only as the person supplied them;
                            "nothing reported" otherwise)
## What stays open         (open decisions, touchpoints not done, mood boards to commission)
## Next review             (a date from the cadence, and the triggers that bring it forward)
```

Rules:
- Claim no result that wasn't supplied. "Installs after the relaunch: no figure supplied" is
  right; "the new brand increased installs" without a figure is wrong.
- Change nothing that exists: no step file, brand book, deliverable or `state.md`.

## When this skill is done

This skill is one step of a job, never the whole job. When its file is written, hand back to the
app brand router, which marks the project closed. Don't end the job here: don't write the final
reply, `STATUS.md` or `outcome.json`.
