---
name: c05-router
description: Starts every job on this bot. Reads the request, the bot's jobs and the project's status, then runs the bot's skills for the job in order, or declines work the bot does not do, and makes sure the job ends with an exact outcome. The Job Guide's call line opens every job with this skill; it is never invoked again inside a job or from a subagent.
---

# Starting a job

Every job on this bot starts here, unless the caller has a very specific reason to override.
This skill does none of the work itself. It decides which of the bot's skills run, in which order and
on which project, runs them, and checks the outcome.

What the bot does is in `bot/setup.md`, and the customer's settings are in `bot/user.md`. CLAUDE.md
has already loaded both; do not open them again. The request follows this skill's call line, unchanged.
It may end with `Label: value` lines for inputs the chat asked for, and an attachments block.

This skill's folder is `${CLAUDE_SKILL_DIR}`: Claude Code fills it in when the skill loads, and also
shows it as "Base directory for this skill". The bot's other skills are in the same parent folder, so a
skill `<id>` is at `${CLAUDE_SKILL_DIR}/../<id>`. Never use a `~/.claude/skills/` path: the bot's
skills are mounted, not installed there.

## 1 · Read the context

1. The request, the `Label: value` lines and the attachments.
2. `<JOBS>` and `<CONSTRAINTS>` in `bot/setup.md`.
3. The projects already in `artifacts/`: for each `artifacts/<project>/STATUS.md`, what the project is,
   its stored context, open decisions and deliverables.

## 2 · Choose the job and the project

- Take the `<JOBS>` row the request fits. If it fits more than one, take the one whose deliverable the
  request names.
- **The project.** If the request names a project, or continues one in `artifacts/` (the same product,
  the same deliverable, an answer to an open decision), use that project. Otherwise the job's first
  skill starts a new one, as it says.
- If no row fits, or `<CONSTRAINTS>` says a person does this work, run nothing and write nothing in
  `artifacts/`. End `failed` (step 4) with one plain sentence: what was asked that this bot does not
  do, and what it does do.
- If the row lists a skill that is not beside this one (`${CLAUDE_SKILL_DIR}/../<id>/SKILL.md` does not exist), run
  nothing. End `failed`, and name the missing skill.
- When only part of a request fits, do that part and end `partial`, naming what was not done.
- When the job's skill ends `partial` because an input it cannot start without is missing, end
  `partial` with no deliverables, and say in `reason` exactly what to send.

## 3 · Run the skills, in order

For each skill the row lists, in the order listed:

1. Invoke it with the Skill tool and follow it to its last step. Do none of its steps yourself.
2. It works from the request, the settings, the attachments, the project's files and whatever the
   skills before it wrote. Every skill of one job writes into the same `artifacts/<project>/` folder.
3. If it ends without producing its output, stop: run no later skill.

Run exactly the skills the row lists. Never add, drop, repeat, reorder or swap one.

**Project status.** Each skill's last step writes the project's status with the script in this
skill's folder: `node ${CLAUDE_SKILL_DIR}/scripts/status.mjs --project <project> --record <job.json>`. It is the only
writer of `artifacts/<project>/STATUS.md`. If a skill ended without that step, run it yourself from
what the job did: the job, the stored context it used, decisions made and still open, and the
deliverables written. The script prints a JSON result; if it prints nothing, the status was not
written, so say so in the outcome's reason.

## 4 · End with an exact outcome

Before finishing, make sure `/home/user/outcome.json` exists and is true to what happened:

```json
{
  "status": "delivered | partial | failed",
  "reason": "one plain sentence, required unless delivered",
  "deliverables": [{ "path": "/home/user/artifacts/<project>/<file>", "title": "what the person would call it" }]
}
```

- `delivered`: every deliverable of the job exists; list each file, at least one.
- `partial`: list what was produced (nothing, when a required input was missing), and say in `reason`
  what was not done and what to send to finish it.
- `failed`: no deliverable; say in `reason` exactly why, in words the person understands.
- List files, not folders: a deliverable that is a folder (for example `emails/`) is listed file by file.
- List what the job made for the person, not its working files (`inputs/`, build or status records), and
  give each a title the person would use.
  List only files that exist. Announce each one with `~/.sl8/bin/report artifact <path>` if it has not
  been announced yet.

Then finish as CLAUDE.md says, and name any listed skill that did not run. Never delete files,
including scratch files in `work/`: the customer's folders are kept as they are.
