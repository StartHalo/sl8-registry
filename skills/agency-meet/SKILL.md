---
name: agency-meet
description: Run or file a meeting with the customer, the pull side of the account. The customer sees status, reviews a deliverable, changes the plan or decides. Afterwards every point becomes an event or a task the same day; no recap email. Use for a meeting's hand-off ("From our meeting on …"), a live meeting, pasted notes, a transcript, or "we're meeting now".
metadata:
  status: core
  version: 1.2.0
---

# Meet

**Before** (a few minutes): `agency status` and CUSTOMER.md, nothing else unless a point needs it.
Prepare a short agenda:
- where the goal stands;
- each lane's next move;
- what we need from them;
- any decision only they can make, with two or three options and our recommendation.

**During:** let them drive. They can:
- **see status:** walk the agenda (never the card itself: it is internal);
- **review a deliverable:** open it from `artifacts/<customer id>/`;
- **change the plan:** note what and why;
- **decide:** record their words.

**After, the same day** (a hand-off's request names the meeting's folder: Slate keeps its `notes.md`
and `transcript.md` in `meetings/<folder>/`, read only; the files the customer gave in the call are the
job's attachments; D98, D107):
1. **File:** read `meetings/<folder>/notes.md` and `transcript.md` where they are; copy nothing. An older
   request that says they are in this job's attachments: copy them from `artifacts/attachments/` to
   `work/meetings/<folder>/`, as before. With no hand-off, write the transcript to
   `work/meetings/<date>/transcript.md`, word for word, with who was there and the channel; quote what
   they said in its original language with a translation beside it; mark any word you are unsure of.
2. **Each point** they gave, asked for or decided becomes one of:
   - a file they gave: a `received` whose `ref` is its attachment path, naming the task it answers;
     a file the notes name that no attachment holds is an `error` and an ask;
   - the owner's words: each `The owner said:` line, checked against `transcript.md`, by agency-run's
     rule for the owner's words;
   - a `fact` (and ask whether it changes the plan);
   - a `decision`: their exact words from the transcript, `src` `meetings/<folder>/transcript.md` (or its
     copy; an apostrophe inside the shell's single quotes is written `\u0027`, never reworded);
   - a rule for future work: a dated standing instruction in CUSTOMER.md, in their words;
   - a task for us (ready);
   - a task for them (customer kind; `due` only if they said one);
   - a change to a lane (`lane_set` with `why` naming the meeting).
3. **Log** a `meeting` event: `notes` `meetings/<folder>/notes.md` (or the copy, or with no hand-off the
   transcript's path), `points` the number of points.
   Nothing given, asked for or decided: that event with `points: 0`, and nothing else.
4. **No recap:** no recap file, no comms task and no email because of a meeting; they heard it in
   the call. What the work makes later goes out as usual (agency-comms).
5. **Start** our ready tasks in this session.

A hand-off whose folder a `meeting` event already names (a retry) adds only what is missing.
