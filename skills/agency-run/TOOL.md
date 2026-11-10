# The `agency` tool: specification

> **Signed by khalid, 3 Nov 2026 (D75) (amended by D76 and D78, 3 Nov; by D85, 8 Nov: core 1.1.0, items marked **(1.1.0)**).** The one spec of the tool every agency job runs and of the files it owns.
> Every other part reads this, not the code: the core skills, the web app (readiness, the card), Factory
> (run checks, scenario runs) and `agency migrate`. The tool is `scripts/agency.py` beside this file (stdlib Python, built
> in Goal 1); a run of it on 3 Nov checked this spec line by line (`docs/v5/runs/2026-11-03-tool-sim/` in the agency
> repo). Items marked **(new)** were built in phase 1 (`docs/v5/runs/2026-11-03-tool-phase1/`); the rest is the earlier
> behaviour. This file ships beside the code, in `agency-run/`, on every machine.

## 1. Purpose

The tool is the only writer of the account's record: `work/agency/log.jsonl`, `work/agency/now.md` and the customer's
folder. Everything that happened is one event in the log; every command replays the log; there is no other state.

## 2. Sources and outputs

| File | Kind | Written by | Read by |
|---|---|---|---|
| `bot/user.md` | source: the engagement | the owner | the tool (customer, customer id, contact, reply address, Bcc) **(new)**; the agent |
| `work/agency/log.jsonl` | source: everything that happened | the tool | the tool; readiness |
| `work/agency/CUSTOMER.md` | source: what we know of the customer | the agent | the agent (the tool no longer reads it **(new)**) |
| `work/<path>` | source: our work, including each email's draft | the agent | the tool (hashing, sending) |
| `work/agency/now.md` | output: the card | `agency status` | the agent |
| `artifacts/<customer id>/<path>` | output: a checked file shared | a pass | the customer; `check` |
| `work/outbox/<task>.eml` and its copy `artifacts/<customer id>/outbox/<task>.eml` | output: an email waiting for the owner (D57), who gets it from the copy (D78) | `send` | the owner; `check` |
| `/home/user/outcome.json` | output: the job's handover (JM R7) | the agent at the close, after this job's `session` end | the web app; `check` (D82) |

`artifacts/<customer id>/outbox/` holds the owner's drafts with their Bcc header: any customer-facing view of `artifacts/`
leaves `outbox/` out (D67).

After phase 1 no output is read back as a source **(new)**: `send` takes the subject from the draft and attaches the
`work/` files it has verified against their hashes; the card doesn't look at the outbox.

## 3. Layout

The root is `$HOME` (`/home/user` on a machine; a temporary home on Factory's host runs) **(new; today the workspace
folder)**. Fixed paths: `bot/user.md`, `bot/setup.md`, `work/`, `work/agency/{log.jsonl,now.md,CUSTOMER.md}`,
`work/outbox/`, `work/outbox/sent/` **(new)**, `work/recovered/` **(new)**, `artifacts/<customer id>/` **(new; today
`artifacts/`)**. A pass copies `work/<path>` to `artifacts/<customer id>/<path>`, keeping the path under `work/`;
`send` copies `work/outbox/<task>.eml` the same way, to `artifacts/<customer id>/outbox/<task>.eml` (D78). The first
`agency log` creates `work/agency/`.

## 4. Commands

| Command | Does |
|---|---|
| `agency log <ev> '<json>'` | Validates and appends one event (§5). A task is validated against `kinds.json` and the replayed plan; a lane only on its `state` (its fields are checked by `check`); `t` and `by` default to now and `agent`. Refuses a `sent` whose `id` is in the log, a non-number `read` of a goal's metric, `every` on a comms or deliverable task, and **(new)** a `new-skill` task, a `skill_built` event and a date that isn't YYYY-MM-DD. **(1.1.0)** Refuses an event that carries `job`, a goal lane opened without a title, a title that breaks R1 or is only "…", a stage name that breaks any of R1–R6, bad `stages`, a `caused_by` or `received.task` naming an unknown task, a bad `approve`, and a day note that breaks any of R1–R6 (§11) |
| `agency task start <task>` | Prints the `do`, the "done when", the skill and the files to read (refs, the `follows` task's output and notes); logs `task_started` with `refs_read` |
| `agency task done <task> [--out P] [--check pass\|fail] [--checked DATE] [--why TEXT]` | Logs `task_done`. A deliverable or comms task can't be done without a pass. **Pass** (those two kinds only; refused on a folder `out`): hashes each covered file (the `out`; for comms its refs and its draft), copies each except the comms draft to the customer's folder, then logs. **(new)** An `out` outside `work/` is refused. **Fail**: logs `task_refined` `{check: "fail", notes}`; the task stays open |
| `agency task wait <task> --on WHO\|TASK [--due DATE]` | On a task id: `blocked`; otherwise `waiting`. `WHO` is `customer:<name>` for an ask of the customer |
| `agency task drop <task> --why TEXT` | Logs `task_dropped`; withdraws its shared files unless a `sent` lists them or another task's pass covers them |
| `agency view tail [N] \| lane ID \| tasks [--open] \| facts \| skills` | Read-only, plain text; `tasks --open` is the pick list (§7) |
| `agency status` | Replays the log; prints the operator's full view; writes `now.md`, the customer-safe card (§9) **(new)**; logs `params` when `user.md` differs from the last one, in a label or in a `## ` section's text (a sha256 per section, D83) **(new)**; logs a `lane_renamed` for each entry of the bot's `lanes/migrations.json` not yet logged, matched on `from`, `to`, `release` **(new)**; **(1.1.0)** then, once and only where absent, a `lane_set` with the standard title of each standing lane without one and a `lane_set` with the `stages` of each lane whose `library` the bot's `lanes/stages.json` names (§6); and reports the live list (§12) |
| `agency check [--fix]` | The session check (§8); `--fix` **(new)** moves a shared file with no event, and a file under `artifacts/` outside `<customer id>/` and `attachments/` (its path kept, D83), to `work/recovered/` and drops a truncated last log line, logging each as an `error`. **(1.1.0)** Prints a `WARN title:` line per title finding and a `WARN stages:` line per library it cannot use (§11); warnings never change the exit code |
| `agency send <task>` | Sends exactly a checked comms task's refs, after its own checks: every ref in `work/` and unchanged since the pass (hashes); every shared copy equal to its hash **(new)**; a check older than 7 days is refused ("re-check first"); the cap (§10). With no email service it writes `work/outbox/<task>.eml` (From and Reply-To `Slate Agency <reply address>`, Bcc from `user.md` **(new: today `<customer>+agency@`, no Reply-To, Bcc from CUSTOMER.md or `AGENCY_BCC`)**; the files attached) and the same file in `artifacts/<customer id>/outbox/`, where the owner gets it (D78), and logs nothing. SMTP and Drive branches are removed **(new)** |
| `agency send <task> --by khalid` | Logs the owner's send as `sent`; moves the `.eml` to `work/outbox/sent/` **(new)** and its copy to `artifacts/<customer id>/outbox/sent/` (D78). Refused if already sent |
| `agency migrate <workspace or bundle.tar> [--goal G] [--dry-run]` **(new)** | Runs on the install's machine (contract §9: the owner copies the bundle into `work/import/`, D78); copies a v5 workspace into it byte for byte; refuses an install that already has a log; `--dry-run` prints what it would copy |
| `agency --version` **(new)** | Prints the core's version (`agency-run/VERSION`, semver), which readiness compares with a bot's `core:` |

Every command skips a truncated last log line with a warning (a lost machine), so a job can always orient; the first command that appends drops it first and logs its text as an `error` **(new)**.
Output: exit 0 on success; 1 when refused or when `check` finds a problem; 2 on a usage error. A refusal is one line on
stderr saying what to do; `check` prints one `FAIL` line per problem on stdout, then a summary. Never asks a question.

## 5. Events

One JSON object per line. Replay follows the file order; `t` is when the thing happened (it may be earlier than the line
before it, lld §2). Common fields: `t`, `ev`, `by` (`agent` · `khalid` · `customer:<name>`), and **(1.1.0)** `job`: the execution id of
the job that wrote it, which the tool stamps from `SL8_JOB` (`[A-Za-z0-9_-]{1,64}`) on every event it appends, and
only the tool (an `agency log` that carries it is refused). Without `SL8_JOB` (Factory, an older Slate) there is none.

| `ev` | Required fields | Optional |
|---|---|---|
| `onboarded` | `customer` | |
| `params` **(new)** | the `user.md` labels and values (`params`), and `sections`: a sha256 per `## ` section of its text (D83) | |
| `fact` | `text`, `src` | |
| `goal` | `goal` (the whole goal, §6) | |
| `lane_opened` | `lane` (the whole lane) | |
| `lane_set` | `lane`, `set` (changed fields; `null` removes one), `why` | |
| `lane_renamed` **(new)** | `from`, `to`, `release` | |
| `task_added` | `task` (the whole task) | |
| `task_refined` | `task` (`id` and the changed fields; `null` removes one) | `why` |
| `task_started` | `task`, `refs_read` | |
| `task_waiting` | `task`, `on` | `due` (`null` keeps the earlier one) |
| `task_done` | `task` | `out`, `check`, `checked_at`, `hashes` (sha256 by `work/` path, set by a pass), `why` (the evaluator's note) |
| `task_dropped` | `task`, `why` | |
| `read` | `what`, `value`, `src` | `task` (a recurring task: its run) |
| `sent` | `id` (unique), `task` (or `tasks` for a send made outside the tool), `by`, `to`, `subject`, `files` (shared paths), `text_ref` | |
| `received` | `from`, `channel`, `ref` | **(1.1.0)** `task`: the task the reply answers (it must exist) |
| `meeting` | `notes`, `points` | |
| `decision` | `words`, `src` | |
| `error` | `text` | `task` |
| `session` | `phase` (start · end) | `summary`, `ref`; **(1.1.0)** `note` (end): one sentence for the owner on what moved, refused unless it passes R1–R6 (§11) |
| `skill_built` · `skill_proven` | history only: replayed, never added **(new)** | |

Rules: events are never edited; an old event's `artifacts/X` (from a migrated workspace) replays as
`artifacts/<customer id>/X` **(new)**; a later event about the same thing replaces the earlier one; a read keeps its value, so a
replay never re-reads the world; a core release replays every earlier event shape (fixture logs in `agency-run/tests/`
**(new)**).

## 6. The plan: the log replayed

- **Goal:** `id`, `text`, `metric`, `from`, `to`, `by` (date), `state`, `figure` (`value`, `at`, `src`; `value` may be
  `null`: unknown), `part_of` (optional).
- **Lane:** `id`, `goal`, `title`, `scope`, `rank` (one number across the goal lanes, no ties), `state` (planned · active ·
  paused · stopped · done), `why`, `gauge`, `done`, `pause`, `score` (impact, confidence, control, speed, why),
  `library`; a standing lane (discovery, plan, comms) has `standing: true`. A `lane_renamed` makes the old id resolve to
  the new **(new)**. **(1.1.0)** `title` is required on a goal lane (1–60 chars) and can't be removed; a standing lane
  opened without one gets "Discovery", "Plan" or "Messages". `due` (YYYY-MM-DD). `stages`: `[{id: "S01", name}]`, at
  most 20, ids unique and ascending, names 1–40 chars, written by `status` from the bot's
  `.sl8/bot/.claude/skills/*/lanes/stages.json` (`{"<library id>": [stages]}`); an older bare `library` name is
  `<agency>/<name>` with the agency `bot/setup.md`'s `<AGENCY>` `id:` gives, or, with none, the one key ending in `/<name>`. A library id twice in one file, or in
  two files with different stages, is skipped with a `WARN stages:` line; identical copies count as one.
- **Task:** `id`, `lane`, `kind`, `title` (written so the customer could read it), `do`, `refs`, `follows`, `skill`,
  `owner` (us · customer · khalid), `done_when`, `out`, `to` (comms), `send_id`, `due`, `every`, `on`, `check`, `hashes`,
  `checked_at`, `last_run`, `state` (ready · running · waiting · blocked · done · dropped), `notes`. **(1.1.0)** `title`
  1–120 chars when given; `caused_by`: the task that led to this one (it must exist); `approve`: the file a customer or
  owner task asks them to approve, which must exist: for `owner: customer` under `artifacts/<customer id>/` (only
  what a pass or a send shared), for `owner: khalid` under `work/` (a sample stays out of the customer's folder).
- **Stage:** a lane whose file names stage tasks (ids `<lane>-S<nn>`) is at the stage of its latest done stage task; a
  lane without stage tasks has no stage. **(1.1.0)** Its name is the matching entry of the lane's `stages`, else the id;
  the card prints the id when the name breaks any of R1–R6.
- **Kinds** (`kinds.json`): `work`, `deliverable` (checked), `read`, `customer` (never picked), `comms` (checked),
  `plan`, `meeting`; `new-skill` replays in old logs only.

## 7. The pick list (`view tasks --open`)

In order: running tasks; `plan` tasks; goal lanes by rank; discovery; comms. Left out and listed apart: customer tasks
("to ask" until their email goes; "FOLLOW UP" once past due, or a week after asking with no date); waiting and blocked
tasks (a blocked task returns, marked "released", when its blocker is done or dropped); tasks in a lane that isn't
active; recurring tasks not due. Then "to send": checked comms not yet sent, and done deliverables no send carries ("NOT
SENT").

## 8. The check (`agency check`)

1. **Valid:** every open task has a known kind and the fields its kind needs; the standing lanes exist; every active goal
   lane has its goal, scope, gauge, done, pause and rank; every `work/` ref of an open task exists (except an output a task
   it follows or waits on has yet to make).
2. **Checked:** nothing in `artifacts/<customer id>/` that no pass, `sent` or email in `work/outbox/` covers, and
   nothing under `artifacts/` outside it and `attachments/` (agency#88, D83); every task a
   send carried had a pass; every shared copy equal to its pass hash **(new)**, and a waiting email's copy equal to its
   `work/outbox/` file (D78); and, once `outcome.json` exists, it isn't `partial` while this job (the events since the
   previous job's `session` end) shared a file still there: a pass's copy, or the owner's copy of the email `send`
   wrote for a comms task passed this job (D82).
3. **Replays:** the log replays. A truncated last line (a lost machine) is reported **(new: today every command refuses
   the log)**; `check --fix` drops it and logs an `error`.

4. **(1.1.0) Warnings** (exit code unchanged): `WARN title: <where>: <rule>: <the command that fixes it>` for R2–R6 in
   the titles of active goal lanes, their stage names and open tasks, and in the last day note, and R1 for an active
   goal lane with no title (the standing lanes are exempt); `WARN stages: …` for a stage library the tool skips.

Any failure becomes the session's first task; agency-run refines each `WARN title` with the command it prints.

## 9. The card (`now.md`)

`agency status` writes `now.md` customer-safe (there is no customer login, D76), so it holds only what the customer may read
**(new)**:

```
# <customer> · <date> <time> UTC
Goal: <text> by <date> · <figure> (<date>) · on track | behind | well behind | not yet known
Our work:
  <lane title> · <state> · <stage name, else its id, if it has one> · now: <title of its running or next task>
We're waiting on you for:
  <title of a customer task already asked> (asked <date>, by <due>)
Last email: <date> · <subject>
```

**(1.1.0)** The waiting list is `open_asks`' customer list: the waiting tasks of kind `customer`, or waiting `on:
customer:<name>`. `open_asks` is the one rule Slate shares (its owner list: the open tasks the owner owns, the tasks
waiting `on: khalid`, and the emails in `work/outbox/` waiting for the owner).

Left out, though today's card prints them: the "Printed by" line, the standing lanes, focus and next, the last session's
summary, the goal figure's source, anything to send or ask, NOT SENT, FOLLOW UP, our own blocks, health hints, internal
ids and `customer:<name>` forms, and every name from the agency side. The operator's full view is what `status` prints.

## 10. Email cap and guards

**Cap:** at most 2–3 emails we start per week per agency: `send` counts the `sent` events of the last 7 days whose
subject doesn't start with "Re:", plus the emails waiting in `work/outbox/` **(new)**; an urgent email is allowed past it.

**Guards:** Base's deny rules refuse Write and Edit on `work/agency/log.jsonl` and `work/agency/now.md` **(new)**;
`agency-hook` refuses Write and Edit on `artifacts/` and shell writes to all three, only where `bot/setup.md` names
`<AGENCY>` (no readable setup.md: nothing), so other Studios' skills still save to `artifacts/` (D76) **(new: today it guards the log and card at the workspace root, by
file name)**; `check` catches the rest, including an edited shared copy **(new)**.

## 11. Title rules (1.1.0, D85 4 A)

One set, shared with Slate's customer-safe check; the cases are `tests/fixtures/title-rules.json`.

| Rule | Found when the text … |
|---|---|
| R1 | is empty, or longer than its limit (lane 60, stage name 40, task 120, day note 200) |
| R2 | contains a plan id with a digit or hyphen as a word, equals a plain-word id exactly (case-sensitive: "Plan" passes for lane `plan`), or contains `T<n>` |
| R3 | contains a stage code `S<n>` or `S<nn>` |
| R4 | contains `customer:` or an internal path (`work/…`, `artifacts/…`, `/home/user`, `log.jsonl`, `CUSTOMER.md`, …) |
| R5 | contains a raw ISO date or time |
| R6 | contains the owner's name as a word ("Khalida" passes) |

Lengths count Unicode code points, as Slate's port does (`[...text].length`).

On write the tool refuses R1 on the titles an event writes (and a title that is only "…", the fix lines' stand-in), a
goal lane opened without a title, and R1–R6 on stage names and on a day note (`session.note`), both new fields that
reach the customer's card or the owner's job card. Everything else is a `check` warning (§8), so a library's older seed titles
("S01 Intake: …") are still accepted.

## 12. The live list (1.1.0, D85 3 A)

On a Slate job (`SL8_JOB` set and `$SL8_DIR/emit.mjs` there; `SL8_DIR` defaults to `$HOME/.sl8`), after every appended
`task_*` event and at each `status`, the tool reports the agency tasks this job works: the tasks with a
`task_started`, `task_waiting` or `task_done` whose `job` is this job, in first-touch order, each as
`{key, title, status}`: `key` is the task id (an opaque match key; no reader shows it, and it reaches nothing a
customer reads), `title` the task's title (at most 120 chars), `status` `in_progress` (running), `completed` (done,
or a recurring task done this job) or `pending` (waiting, blocked, ready); a dropped task is left out, and so is one
without a title. At most 30 steps: the running ones, then the most recent. It runs
`node $SL8_DIR/emit.mjs agency-plan` with `{"steps": [...]}` on stdin, only when the list differs from the last one
reported in this job (a sha256 of the job id and the list in `$SL8_DIR/agency-plan.last`, written after the emitter
exits 0, so a new job's first report always goes), with a 2 s timeout; any failure
is ignored, so a missing, failing or slow emitter never stops a command. At orient the first report is the empty list.
