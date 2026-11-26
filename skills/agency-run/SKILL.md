---
name: agency-run
description: One job for this customer, start to finish. Orient, check, take in the request, do ready tasks in rank order, record, end with the session end. Use whenever a job starts with no other instruction, or the prompt says "run" or "work on it".
metadata:
  status: core
  version: 2.0.0
---

# Run a job

Paths are under `/home/user`. `knowledge/` is this skill's folder (`~/.claude/skills/agency-run/knowledge/`);
the tool is `agency` (its spec: TOOL.md in the `@starthalo/agency` package). Follow `knowledge/how-to-run.md`. In short:

1. **Orient:** `knowledge/operator.md`, `work/agency/CUSTOMER.md`, `agency status` (your view, from the
   log), `agency view tail 30`. No log yet: this is job 1, run the agency-onboard skill first.
2. **Check:** `agency check`. Fix what it reports first, and refine each `WARN title` line with the
   `task_refined` or `lane_set` it prints.
3. **Take in** the request (the owner's words, a reply, "Sent: T61" lines, a meeting's hand-off) and uploads → events, then tasks:
   - "Sent: T61" → `agency send T61 --by owner`.
   - A meeting's hand-off ("From our meeting on …") → the agency-meet skill, its After.
   - The owner's words (`The owner wrote in chat on <date>:`, a call's `The owner said:`) → each `This answers
     the ask "<title>" (task <id>).`: a `received` naming that task (`channel` and `ref` `chat <date>`, or the
     meeting folder), then `agency task done <id>`; a rule → a dated standing instruction in CUSTOMER.md, in their words.
   - A reply or upload that answers an ask → its `received` event names that task (`"task": "<id>"`).
   - Feedback → `work/agency/CUSTOMER.md`.
   - `agency status` logs a `params` event when `bot/user.md` changed (add a plan review when it prints
     "take-in adds a plan review", A10) and a `lane_renamed` for a new release's lane migration (A7).
   - Test each active lane's `done` and `pause` rule; if one holds, `log lane_set` its state with why.
   - A new ask is judged by the parameters (`bot/user.md`), never by a lane's scope: inside them (no extra
     cost, fits the date), take it on and widen the lane's scope if needed; outside them, it is outside this
     engagement (D67): log a `decision`. The job's `note` says which. The close: how-to-run, "The route to met".
4. **Work:** `agency view tasks --open`. Take the first task of its pick list (it is in order:
   running first, then plan, goal lanes by rank, comms) and do it with the agency-task skill.
   Repeat until the pick list is empty (a task stopped by something outside: log an `error` and
   `task wait <id> --on <what>`). Customer tasks are never picked: they wait on the owner.
5. **Messages:** only when a task on the list calls for one (a comms task: the agency-comms skill).
6. **Close:**
   - Write the run file `work/runs/<YYYY-MM-DD>-<n>.md` (n counts the day's runs; D63), a few lines:
     what was done (task ids), how, which skills, any scripts you had to write (each is a skill gap).
   - Each lesson learned this run: a dated line in `work/lessons.md`, tagged `[core]` or `[<agency>]` (A15).
   - Log one `session` event (`phase: end`, `ref` the run file, `summary`: one line on what moved, `note`: one
     sentence for the owner on what moved and whether each change asked this job was taken on or is outside
     what was agreed, in plain words: no ids, stage codes, paths or dates; 200 chars).
   - Its `outcome`: `delivered` if a deliverable landed in the customer's folder this job, else `partial` with
     what moved, or `failed` with why, in `reason`; job one must land discovery's summary (D105; the tool refuses
     its end without one: if none can land, `failed` with why). Then `agency status` and `agency check` (D92).
   - **Any `.eml` in `work/outbox/` not yet sent:** your last message says it is ready in
     `artifacts/<customer id>/outbox/`; it names no person and asks no one to send (D57, D78).

If something fails, log an `error` with what happened, leave the task open with a note, and carry on
with the next task. Never end a job with the check failing.
