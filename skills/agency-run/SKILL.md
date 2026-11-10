---
name: agency-run
description: One job for this customer, start to finish. Orient, check, take in the request, do ready tasks in rank order, record, end with comms and outcome.json. Use whenever a job starts with no other instruction, or the prompt says "run" or "work on it".
metadata:
  status: core
  version: 1.1.0
---

# Run a job

Paths are under `/home/user`. `knowledge/` is this skill's folder (`~/.claude/skills/agency-run/knowledge/`);
the tool is `agency` (its spec: `TOOL.md` here). Follow `knowledge/how-to-run.md`. In short:

1. **Orient:** `knowledge/operator.md`, `work/agency/CUSTOMER.md`, `agency status` (your view, from the
   log), `agency view tail 30`. No log yet: this is job 1, run the agency-onboard skill first.
2. **Check:** `agency check`. Fix what it reports first, and refine each `WARN title` line with the
   `task_refined` or `lane_set` it prints.
3. **Take in** the request (a reply, notes, "Sent: T61" lines), meeting notes and uploads → events, then tasks:
   - "Sent: T61" → `agency send T61 --by khalid`.
   - A reply or upload that answers an ask → its `received` event names that task (`"task": "<id>"`).
   - An upload in `artifacts/attachments/` → a `received` event whose `ref` is its path; copy it into
     `work/inputs/` when a task works on it.
   - Feedback → `work/agency/CUSTOMER.md`.
   - `agency status` logs a `params` event when `bot/user.md` changed (add a plan review when it prints "take-in adds a
     plan review", A10) and a
     `lane_renamed` for a new release's lane migration (A7).
   - Test each active lane's `done` and `pause` rule; if one holds, `log lane_set` its state with why.
   - A new ask is judged by the parameters (`bot/user.md`), never by a lane's scope: inside them (no extra
     cost, fits the date), agree it with her, widen the lane's scope if needed and do it; outside them,
     tell her it is outside this engagement (D67). Acceptance and the close: how-to-run, "The route to met".
4. **Work:** `agency view tasks --open`. Take the first task of its pick list (it is in order:
   running first, then plan, goal lanes by rank, discovery, comms) and do it with the agency-task skill.
   Repeat until the pick list is empty (a task stopped by something outside: log an `error` and
   `task wait <id> --on <what>`). Customer tasks are never picked: comms asks for them.
5. **Comms, the afterthought of every run (D52):** look back over this run (`agency view tail`):
   what was finished, decided, learned, asked or is stuck. Decide what the customer needs to hear,
   add those comms tasks, and do them now with the agency-comms skill.
6. **Close:**
   - Write the run file `work/runs/<YYYY-MM-DD>-<n>.md` (n counts the day's runs; D63), a few lines:
     what was done (task ids), how, which skills, any scripts you had to write (each is a skill gap).
   - Each lesson learned this run: a dated line in `work/lessons.md`, tagged `[core]` or `[<agency>]` (A15).
   - Log one `session` event (`phase: end`, `ref` the run file, `summary`: one line on what moved, `note`: one
     sentence for the owner on what moved, in plain words: no ids, stage codes, paths or dates; 200 chars).
   - Write `/home/user/outcome.json` in the shape the job contract gives (A16): `delivered` with each file
     this job copied into `artifacts/<customer id>/` (a check pass or a `send`), `partial` with "nothing
     shared this job: <what moved>", or `failed` with why.
   - `agency status` (it writes now.md), then `agency check` (it compares outcome.json with the log).
   - **Any `.eml` in `work/outbox/` not yet sent:** end your last message by asking khalid to send
     it today, naming its copy in `artifacts/<customer id>/outbox/` (D57, D78). Never hold it.

If something fails, log an `error` with what happened, leave the task open with a note, and carry on
with the next task. Never end a job with the check failing.
