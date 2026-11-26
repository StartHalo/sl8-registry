# How to plan a goal

Used by the agency-plan skill when a goal arrives, and for every review. Keep it simple: two or three lanes
done well beat a long list.

## 0. Discovery is the first lane (D105)

A goal's first plan opens one discovery lane, rank 1, before any other: the tasks this agency needs to
find out what this goal needs, from `<AGENCY>`'s lanes and Taste and from what `work/agency/CUSTOMER.md`
lacks (the agency-discover skill does research tasks; an agency whose lane starts with its own intake or
audit uses those tasks here and skips them in that lane, with why). Its last task is a summary deliverable,
`work/discovery/summary.md`, the first row of What the customer will receive. None of its tasks waits on
the owner: what only they can give is a customer task beside it. Give the lane its own id, never
`discovery`, and a title in the customer's words; an old engagement's standing `discovery` lane is kept
and worked as an ordinary lane. Then add a `plan` task, "lanes for G1", that `follows` the summary, and
stop: it opens the other lanes from what discovery found. Both run in job one, so job one ends with the
summary in the customer's folder.

## 1. The goal

From X to Y, by a date if one was given, in the words of whoever set it. Read the starting figure
yourself and log it as a `read`. Every goal gets its own plan file, `work/plan/<goal>.md`: the goal,
the sums, what the customer will receive, the customer's way, the candidates scored, the lanes kept and
a not-now line for the rest (D47).

**The customer's way.** A business usually comes with its goal and a way of doing it in mind ("ASO
assessment and reporting"). When they (or the parameters) name it, log it as a `decision` in their
words and open it as a lane first. Scoring ranks it and may add lanes beside it; it never drops it.
If the sums say it can't carry the goal, say so to the customer and run it
anyway unless they say otherwise. If you can't read it, the figure is unknown: say who can give it,
and ask once. Log the goal as a `goal` event carrying the whole goal.

## 2. The sums

Work back from Y to the inputs it needs, stage by stage, with a low and a high estimate from the
customer's own rates or a named benchmark. Examples:
- **An app:** installs = store-page visitors × the share who install.
- **A B2B sale:** paying customers = demos × win rate; demos = replies × booking rate.

Compare the gap with the pace they have without us. If the inputs can't reach Y, say so and say what
would have to change. No number without a basis. Write the sums to `work/plan/<goal>.md`.

## 2a. What the customer will receive

In `work/plan/<goal>.md`, after the goal and the sums, a table headed `What the customer will receive`:
name, format, what makes it acceptable, order. Its first row is discovery's summary. Each row becomes one
`deliverable` task with the row's name as its `title` and its acceptance line as its `done_when`; every
other task exists because a row needs it. An acceptance line never includes the customer's approval: an
approval is its own customer task, so the deliverable lands first and they approve what they can open.

## 3. Candidates

Start from the lanes `bot/setup.md`'s `<AGENCY>` names (`lanes:`, each a file in the agency's skill
folder), its Taste first. Each entry says when it fits, how it moves the goal, its gauge and its seed
tasks.

When no entry fits, find out what worked for others in the same space at the same stage:
1. Study 5–8 comparable companies.
2. Write down the moves most of them share, each with its evidence: verified, reported, or unproven.
3. Afterwards, write the entry you would have wanted as a dated `[<agency>]` line in `work/lessons.md`.

Where the customer stands shapes the candidates:
- **No paying customer yet:** the product and its first sale come first.
- **A person closes each sale:** demos and follow-through.
- **Nobody does:** being found and chosen, and coming back.

## 4. Score and rank

Score each candidate 1–3 on:
- **impact:** how much of the gap it can close;
- **confidence:** how strong the evidence is;
- **control:** how much of it we can move ourselves. A lane only the customer can run scores 1, and
  its work is mostly communication.

Speed breaks ties. Write one line of reason with each score.

Keep the customer's way, then the top candidates up to two or three lanes per goal, **ranked 1, 2, 3 across all of the customer's goals, with no
ties**. Every other candidate gets one line: not now, and why.

## 5. Open each lane

`log lane_opened` with the whole lane:

| Field | Holds |
|---|---|
| `id` | the lane's id |
| `goal` | the goal it serves |
| `title` | its name, required: 1–60 chars the customer could read, with no ids, stage codes or dates (the tool refuses a lane without one) |
| `scope` | one or two plain lines a customer could read: what it covers and what not (which apps, markets, documents, how often) (D48); a path by its steps (entry → form → welcome), not the request's list of pages |
| `why` | the sums that link it to the goal |
| `gauge` | the number that shows it working, with a weekly target |
| `done` | a testable rule for when it's done |
| `pause` | a testable rule for when to pause it |
| `rank` | its place across all goals |
| `score` | the three scores and their reasons |
| `library` | the entry it came from: `<agency>/<entry>`, the path `<AGENCY>` `lanes:` gives for it; an older bare name is that entry in this agency |
| `due` | the plan's date for it, `YYYY-MM-DD`, when the plan has one |
| `state` | `active` |

Then add its seed tasks from the library entry, each made executable for this customer, a deliverable's title still its row's name word for word:
- **One deliverable task per row** of What the customer will receive, titled as the row, and it wins over the seed:
  a row that would cover two stores (or apps, pages) becomes one row per store, each with its own deliverable task.
  What ships inside another deliverable (a roadmap in the report) is part of that row, never a row or a task of its own.
- **Merging or skipping a seed** is written with why in the plan file's lane section, so the next
  review can see it.
- **Every stage, up front.** Each stage's task is written when the lane opens and follows the stage before;
  `task start` refuses one whose `follows` is not done.

**A one-off engagement** (one video, one review) still gets a goal from its parameters: the piece accepted,
and released if it ships, by a date. It is one lane with its seed tasks; the plan file can be a few
lines.

## 6. Tell them

The plan file and the dashboard say it (D102); a message is a comms task when the owner asks for one.
If the goal itself looks out of reach, say so in the job's note.

## 7. Review

Re-score when a review is due (see how-to-run, "Facts and replanning"). Keep, change, pause or stop a
lane with `lane_set`, and name the reason in `why`.
