# How to run a customer

The method for every job. Tool: `agency` (`agency -h` lists its commands; its spec is
TOOL.md in the `@starthalo/agency` package). Codes in its messages and in events (D31, R4, K1 …) name the
decisions behind a rule; you don't need them to work.

## The session

The steps are the agency-run skill. This file is the guidance behind them. End every session with a
`session` event: one line of what moved.

## Tasks

**A task must be executable** before it is `ready`: a clear scope, achievable, and a "done when" you
can test (D62). It needs a clear `do`, the files to read (`refs`, or `follows` for the task whose
output it builds on), its skill, and where its output goes. The tool refuses a task without
`done_when`, except customer and comms tasks. If any is missing, refine it first (`log task_refined`).

**The seven kinds** (`kinds.json`, beside this file) decide the checks:

| Kind | For | Notes |
|---|---|---|
| `work` | our own work: research, drafts, analysis | output in `work/` |
| `deliverable` | what the customer will get | built in `work/`; done only with an evaluator pass |
| `read` | a live figure | logs a `read` with a number; a read on a goal's metric updates the goal |
| `customer` | what only they can do | `due` only if they gave a date |
| `comms` | any email: update, notice, question, follow-up | `to`, `out` (the email text), `refs` (exactly what goes out); evaluated |
| `plan` | planning a goal, reviewing lanes | the agency-plan skill |
| `meeting` | a meeting | the agency-meet skill: notes and transcript read in `meetings/<folder>/`, every point an event or a task; no recap email (D98, D107) |

**States:** `ready` → `running` → `done`; or `waiting` (on someone: `task wait <id> --on customer`),
`blocked` (on another task: `task wait <id> --on <task id>`), `dropped` (with why).

**Guidance lines:**
- A customer task waits on the owner from when it is added: `task wait <id> --on customer` (3 working days;
  `--due` only for a date they named, D67); it is never picked. When its date passes, wait it again with a
  new date and say so in the job's note: one follow-up for each overdue ask.
- A task is done with its evaluator pass. Only deliverable and comms tasks take a pass (`--check pass` is
  refused on other kinds); a deliverable's pass lands its output in `artifacts/<customer id>/` (D99). An evaluator fail is recorded with
  `task done <id> --check fail --why <note>`; the task stays open. Closing on a check made earlier,
  give its date: `--checked YYYY-MM-DD`.
- A recurring task (`every: daily`, a weekday or `monthly`) stays one task. Close each run with `task done`
  (a `read` naming the task also counts). The pick list leaves it out until its next day; a missed
  run comes back in the next session. An update is written only when the owner asks for one (D108); the
  tool refuses `every` on comms and deliverable tasks (D61).
- **A check that fails twice:** stop picking the task this session: `task wait <id> --on <who or
  what supplies the missing piece>` (the wait shows in the dashboard; the finding is in the check note).
  Start it again when that arrives (take-in).
- **A blocked task** comes back on the pick list, marked "released", once the task it waits on is
  done or dropped (or, if that one recurs, has run since). Start it then; if its blocker was dropped,
  refine or drop it first.
- **Feedback or a change request on something landed:** log it as `received`; add a new deliverable
  task for the next version (`follows` the old one, output in a new `v2/` folder). A done task is never
  reopened, and every passed version stays in their folder (D100). A new version says what it removed
  since the one they have, and why. A question, a correction or "too long" about something we gave
  them is also a quality miss: add a dated line to the Lessons of the skill that made it.
- **You decide** most things (which lane, what a task becomes, what to send): log it as a `decision`
  with `by: agent` and the reason.
- **A task that needs a human sense** (listening, a style call): measure what you can, say what you
  could not judge in the check note and the job's note, and add a `[core]` line to `work/lessons.md`.
- Work the pick list until it is empty before the close; only a task cut off (it waits on someone, or the job's 6 hours run out) keeps where it stopped in a `work/` file named in its notes.
- **Stopped by something outside** (the network, a missing account): log an `error`, then
  `task wait <id> --on <what> --due <when it can be checked>`; it returns to the pick list that day.
- An event's `t` is when it happened; the log is in the order you learned things, so a meeting
  filed late sits after newer events.
- When an event follows someone's decision, its `why` names it ("the customer's reset, 21 Oct").
- No corrections: a later event about the same thing replaces the earlier one. If it happened before
  you learned of it, say so in the text.
- Errors are logged and kept: they stop the next session repeating them.

## Facts and replanning

A new goal's plan opens its discovery lane first (D105; how-to-plan §0). After logging a fact, ask: does it change a goal, or which lane should come first? If yes, add a
`plan` task to review the lanes. The pick list puts plan tasks first. Other reasons to review: a lane's
read-out, a gauge flat for two weeks, a customer's new ask, every twelve weeks, **an active goal lane
with no open task left, and a goal that reached its target or passed its date**. **The route to
met:** acceptance is the customer saying the work is fine, or acting on it and raising nothing within
the agreed wait. "The fixes are live, take a look" gets the re-check and the ask
"shall we close this?" (a customer task). At acceptance, log it as `received` (and as a `read` when the
goal's metric is acceptance) (D67).

**At take-in, two events come from the tool, not from you:** when `bot/user.md` differs from the
last `params` event, `agency status` logs a new one; when it prints "take-in adds a plan review", review the plan
against it (a `plan` task, A10).
When the agency's release renames a lane (`lanes/migrations.json`), `agency status` logs a
`lane_renamed` and the old id resolves to the new one (A7); nothing else is rewritten.

## Messages

Write one only when a task calls for it (D102); the rules are in the agency-comms skill, and standing
instructions in `work/agency/CUSTOMER.md` win over them.

## The dashboard (dashboard.json)

The tool rewrites `work/agency/dashboard.json` after every event; `agency status` also prints your full view and the customer-safe card.
Never write the dashboard by hand (it is refused). To change it, log the event that changes the truth (D92).

A figure nobody has given yet is "unknown", with who can give it (a `customer` task). A `read`
updates a goal only when its `what` is the goal's `metric`, word for word, with a number; a `goal`
event restates the current `figure`.

## Health, by numbers

**Behind** = (needed − pace) ÷ needed, where pace is the gain per day over the last 5 or more days
of reads, and needed is the gain per day from today's figure to the target by its date.

- **Green:** at most 5% behind.
- **Amber:** 5–15% behind, or something we depend on more than 3 working days late.
- **Red:** more than 15% behind, or the customer unhappy.
- **Unknown:** no figure or no date: judge by the week's lead measures instead, and say so.

The card works this out from the reads. A customer unhappy makes a goal red whatever the numbers:
log it as a `fact`.
