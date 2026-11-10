---
name: agency-meet
description: Run or file a meeting with the customer, the pull side of the account. The customer sees status, reviews a deliverable, changes the plan or decides. Afterwards every point becomes an event or a task the same day, and the recap goes out. Use for a live meeting, pasted notes, a transcript, or "we're meeting now".
metadata:
  status: core
  version: 1.1.0
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

**After, the same day:**
1. **Transcript:** to `work/meetings/<date>.md`, word for word, with who was there and the channel.
   Quote what they said in its original language with a translation beside it; mark any word you
   are unsure of.
2. **Each point becomes one of:**
   - a `fact` (and ask whether it changes the plan);
   - a `decision` (their words);
   - a task for us (ready);
   - a task for them (customer kind; `due` only if they said one);
   - a change to a lane (`lane_set` with `why` naming the meeting).
3. **Log** a `meeting` event with the transcript path and the number of points.
4. **Recap:**
   - Draft it in `work/meetings/<date>-recap.md`: what we heard, what changes, who does what.
   - It goes out as a comms task with the recap in its refs; the send copies it into
     `artifacts/<customer id>/meetings/` (D91).
   - It counts as that week's update.
5. **Start** our ready tasks in this session.
