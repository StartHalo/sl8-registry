---
name: run-sl8-job
description: Runs every job on an SL8 bot the same way. Matches the request to one of the jobs listed in the bot's setup and runs the skills that job lists, one or several, in the order listed, declining work the bot does not do. The platform opens every job with this skill; it is never chosen from the skill list and never invoked again inside a job or from a subagent.
---

# Running SL8 jobs

Every job on this bot starts here, and this text is the same on every SL8 bot. It does none of the
work: it chooses which of the bot's jobs was asked for and runs that job's skills in order.

What the bot does is in `bot/setup.md`, and the customer's settings are in `bot/user.md`. CLAUDE.md
has already loaded both; do not open them again. The job text follows this skill: a first line
`skill: <id>` (the skill the person or the chat chose, or `none`), then the request, then any
attachments.

## 1 · Choose one job

Read `<JOBS>` in `bot/setup.md`.

- If the first line names a skill, take the job whose **first** skill it is. If more than one job
  starts with it, take the one the request fits. If none does, or `<JOBS>` is missing, run that
  skill alone: the person chose it.
- If the first line says `none`, take the job the request fits.
- If the job lists a skill that is not in `.claude/skills/`, run nothing. End `failed`, and name the
  missing skill.

If no job fits, or `<CONSTRAINTS>` in `bot/setup.md` says a person does this, run nothing and
write nothing. End `failed`, and say what this bot does.

When only part of a request fits, do that part and name what was not done.

## 2 · Run the skills, in order

For each skill the job lists, in the order listed:

1. Invoke it with the Skill tool and follow it to its last step. Do none of its steps yourself.
2. It works from the request, the settings, the attached files, and whatever the skills before it
   wrote. Every skill of one job writes into the same `artifacts/<project>/` folder.
3. If it ends without producing its output, stop: run no later skill.

Run exactly the skills the job lists. Never add, drop, repeat, reorder or swap one.

## 3 · Finish

Finish as CLAUDE.md says, and name any listed skill that did not run.
