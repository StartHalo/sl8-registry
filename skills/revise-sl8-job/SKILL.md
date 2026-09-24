---
name: revise-sl8-job
description: Changes how an SL8 bot does one of its jobs from now on, when the person asks for a lasting change such as dropping a section, adding a field or changing a rule. Finds the skill that does that job, edits it in place with skill-creator, validates it, and records what changed and why. Use when the request is to change how the bot works, not to produce a deliverable. Never changes the platform's standard skills or the bot's setup.
---

# Revising SL8 jobs

This text is the same on every SL8 bot. It changes one of the bot's skills where the harness loads
it, so the next job already works the new way. It produces no deliverable of its own.

The bot's skills live in the root folder the harness reads: `/home/user/.claude/skills/<id>/`, which
is the same folder as `/home/user/.agents/skills/<id>/`. What the bot does, and which skill does each
job, is in `<JOBS>` in `bot/setup.md`, already loaded by CLAUDE.md.

## 1 · Decide whether this is a skill change

State the change in one sentence. Then:

| The request is | Do |
|---|---|
| A lasting change to how a job is done: its steps, sections, rules or checks | Go to §2 |
| A one-off: "this time, leave out X" | Change nothing. Say it applies to one job, so ask for it with that job |
| A value listed under `## Settings` in `bot/user.md` | Change nothing. Name the setting: it is set there, not in a skill |
| Who the bot is, or something `<CONSTRAINTS>` says a person does | Change nothing. The bot's setup is changed by its owner, not by a job |
| A new job the bot does not do yet | Change nothing. A new job is a new skill, and that is built and tested outside the bot |

## 2 · Find the skill

Take the skill from `<JOBS>` that does the job the change is about. Revise only skills named
there. Never revise `run-sl8-job`, `revise-sl8-job` or `skill-creator`.

Before editing, copy the skill's folder to `work/revise-<id>-before/` so it can be restored.

## 3 · Edit it in place, with skill-creator

Invoke `skill-creator` with the Skill tool and follow its guidance for improving an existing skill,
applied to `/home/user/.claude/skills/<id>/`. Do not run its evaluation or benchmark loop here; that
happens where the bot is built.

- Change only what the request asks for, and keep every other rule, step and default.
- Keep the frontmatter `name` exactly as it is.
- Write the change as a rule the skill follows, not as a note about this customer.

## 4 · Validate

Run:

```bash
python3 /home/user/.claude/skills/skill-creator/scripts/quick_validate.py /home/user/.claude/skills/<id>
```

If it reports a missing Python module, check by hand instead: the file opens with a `---` frontmatter
block holding `name` (unchanged) and `description` (under 1,024 characters, no angle brackets), and
nothing else the skill links to has gone missing.

If it fails, fix the skill and run it again. If it still fails, restore the folder from
`work/revise-<id>-before/`, end `failed`, and say why.

## 5 · Record the change

1. Append to `/home/user/.claude/skills/<id>/CHANGELOG.md` (create it if missing):

   ```
   ## <YYYY-MM-DD> — revised on request
   Request: "<the person's words>"
   Changed: <what changed, in one or two lines>
   ```

2. Write `artifacts/revisions/<YYYY-MM-DD>-<id>.md` with the request, the skill, each changed passage
   before and after, and why. This is how the change is seen outside the machine.

## 6 · Finish

Finish as CLAUDE.md says. `delivered` means the skill is changed, validated and recorded, and the
change applies from the next job. Say so in one sentence the person understands.
