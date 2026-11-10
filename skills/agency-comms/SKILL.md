---
name: agency-comms
description: Decide what the customer should hear and when, have it written with agency-email, get it checked, and send it. Runs last in every session, and for every comms-kind task (updates, deliverable notices, questions, follow-ups, meeting recaps).
metadata:
  status: core
  version: 1.1.0
---

# Comms

You decide. khalid is not in between. These are the comms decisions (what to send, when), kept
here only (D56); how an email is written is the agency-email skill's (D68). Standing instructions
in `work/agency/CUSTOMER.md` win over both.

**What a customer hears over an engagement:** first, at the end of the run that made the plan, the
plan in a few lines and the first checked deliverable; each deliverable in our next email; each week
while any lane runs, an email that opens with the engagement in three lines (each goal and where it
stands, with its number; what we did this week; what's next and what we need), then the files (D71;
a meeting recap counts as that week's); the close when a goal is met. **Every email of theirs is answered in our next one,** each question by a line; an ask outside
the engagement's parameters (spend, a new goal, past the goal's date) is told to them plainly as
outside this engagement, and logged as a `decision` (D67).

1. **What changed** this session: `agency view tail 50`, `agency status` (goals, health, waits, "to
   send"), and `agency view tasks --open` (open comms tasks, "to send", and the customer tasks "to ask").
2. **Decide** whether the customer should hear anything today:
   - **Send for:** a deliverable is ready, there is progress, or they wrote to us. Our asks ride
     along in one of those, never alone (a FOLLOW UP excepted). After a deliverable, ask once what
     was unclear or missing.
   - **A red goal** is said in the next customer email in one line: where it stands and what we need
     from them to change it.
   - **Don't send:** a fourth email we start in 7 days (a reply to theirs doesn't count) unless it is
     urgent: something broken, a risk to them, a deadline (D74); nor to chase a paused lane, or to
     follow up on something with no date given and not yet a week old. Follow up only when they gave
     a date, or a week after you asked (`view tasks --open` marks these FOLLOW UP), never on a question never sent.
   - **Bundle** everything not urgent into the next email: one comms task carries every file in its
     refs and every ask needed then; drop the others with why "bundled into T<n>". When asks queue,
     the rank-1 lane's ask goes first, then the goal's own figure.
   - **Say what a lane covers from its `scope`** (`view lane <id>`), never in new words of your own.
   - **Scope:** never state or extend scope (how many videos, pages, markets) unless `bot/user.md` or a
     logged decision says it.
3. **Write it** with the agency-email skill to `work/comms/<task>.md` (the subject on line 1, then
   the body exactly as it will go). Customer text never names khalid (D67).
4. **Task:** a comms task with `to`, `out` (the draft) and `refs`: exactly the `work/` files (or
   folders of them) that go to them. Nothing internal: no notes, checks or sums. A weekly update is
   a recurring `work` task that adds that week's comms task; a comms task never recurs (D61).
5. **Check** it with the agency-evaluate skill, and `agency task done <id> --check pass`. The pass
   fingerprints the draft and the refs; `send` copies the refs into `artifacts/<customer id>/` (D91) and
   refuses anything changed since (D60). Re-check anything checked more than a week ago.
6. **Send:** `agency send <id>`. It writes the checked text as `work/outbox/<id>.eml` and the same file in
   `artifacts/<customer id>/outbox/` (D78), from and Reply-To the reply address in `bot/user.md`, Bcc from
   `bot/user.md`, the files attached (D70) and the Slate Agency signature with its logo (D68). Until the email
   service exists, khalid sends it from there (D57): never hold it; ask him to send it today, at the close. When
   the next request says "Sent: <id>": `agency send <id> --by khalid`, which logs `sent` once.
   - **A send made another way** (khalid's own mail, WhatsApp, a folder share) is logged as `sent`
     with `by: khalid` and the tasks it carried (`tasks`); each carried task is checked after the fact.
7. **Asks:** only after the email went, each customer task it asked becomes `waiting`:
   `agency task wait <id> --on customer` (the tool sets the date; how-to-run says when to give `--due`, D67).
   An ask to approve a file names it in `approve`: the file's `artifacts/<customer id>/…` path (passed; this email shares it) for the customer, the
   sample in `work/` for the owner; an ask of the owner waits `--on khalid`.
