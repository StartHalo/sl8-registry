---
name: agency-comms
description: Decide what the customer should hear and when, have it written with agency-email, get it checked, and send it. Use for every comms-kind task (updates the owner asks for, deliverable notices, questions, follow-ups).
metadata:
  status: core
  version: 1.2.0
---

# Comms

You decide. khalid is not in between. These are the comms decisions (what to send, when), kept
here only (D56); how an email is written is the agency-email skill's (D68). Standing instructions
in `work/agency/CUSTOMER.md` win over both.

**When a message is written** (a task calls for one, D102): the plan in a few lines with the first
deliverable; each deliverable named; an update when the owner asks for one (D108), opening with the
engagement in three lines (each goal and where it stands, with its number; what we did this week; what's
next and what we need), then the files (D71); the close when a goal is met. **Every email of theirs is answered in our next one,** each question by a line; an ask outside
the engagement's parameters (spend, a new goal, past the goal's date) is told to them plainly as
outside this engagement, and logged as a `decision` (D67).

1. **What changed** this session: `agency view tail 50`, `agency status` (goals, health, waits, "to
   send"), and `agency view tasks --open` (open comms tasks, "to send", and the customer tasks "to ask").
2. **Decide** whether the customer should hear anything today:
   - **Send for:** a task or the owner's request that calls for a message (D102): a deliverable to name,
     progress, a reply to theirs. Asks are customer tasks; an email carries them only when one is
     written. After a deliverable, ask once what was unclear or missing.
   - **A red goal** is said in one line in the job's note, and in any email written: where it stands
     and what we need from them to change it.
   - **Don't send:** a fourth email we start in 7 days (a reply to theirs doesn't count) unless it is
     urgent: something broken, a risk to them, a deadline (D74); nor to chase a paused lane, or to
     follow up on something with no date given and not yet a week old. An overdue ask (FOLLOW UP) is
     waited again with a new date and named in the job's note (how-to-run); an email only when a task or the request asks. Never an email because of a meeting: they heard it in the call (D98).
   - **Bundle** everything not urgent into the next email: one comms task carries every file in its
     refs and every ask needed then; drop the others with why "bundled into T<n>". When asks queue,
     the rank-1 lane's ask goes first, then the goal's own figure.
   - **Say what a lane covers from its `scope`** (`view lane <id>`), never in new words of your own.
   - **Scope:** never state or extend scope (how many videos, pages, markets) unless `bot/user.md` or a
     logged decision says it.
3. **Write it** with the agency-email skill to `work/comms/<task>.md` (the subject on line 1, then
   the body exactly as it will go). Customer text never names khalid (D67).
4. **Task:** a comms task with `to`, `out` (the draft) and `refs`: exactly the `work/` files (or
   folders of them) that go to them. Nothing internal: no notes, checks or sums; a comms task never
   recurs (D61).
5. **Check** it with the agency-evaluate skill, and `agency task done <id> --check pass`. The pass
   fingerprints the draft and the refs; each ref is a landed deliverable (D99: a file only this email would
   carry becomes a deliverable task first), and `send` refuses anything changed since (D60). Re-check anything checked more than a week ago.
6. **Send:** `agency send <id>`. It writes the checked text as `work/outbox/<id>.eml` and the same file in
   `artifacts/<customer id>/outbox/` (D78), from and Reply-To the reply address in `bot/user.md`, Bcc from
   `bot/user.md`, the files attached (D70) and the Slate Agency signature with its logo (D68). Slate sends it
   from there (D57; the owner asks for it or sees it in the Inbox); never hold it. When
   the next request says "Sent: <id>": `agency send <id> --by owner`, which logs `sent` once.
   - **A send made another way** (the owner's own mail, WhatsApp, a folder share) is logged as `sent`
     with `by: owner` and the tasks it carried (`tasks`); each carried task is checked after the fact.
7. **Asks:** each ask to the owner is a customer task that waits from when it is added:
   `agency task wait <id> --on customer` (the tool sets the date; how-to-run says when to give `--due`, D67).
   An ask to approve a file names it in `approve`: its `artifacts/<customer id>/…` path (landed).
