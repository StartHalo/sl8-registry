# How to plan a goal

Used by the agency-plan skill when a goal arrives, and for every review. Keep it simple: two or three lanes
done well beat a long list.

## 0. Discovery first (D51)

A plan needs discovery: who they are, the figures we can read, what comparable companies did. Before
planning, check that `work/agency/CUSTOMER.md` and `work/discovery/` cover what this goal needs. If not, add the
discovery tasks and park the plan task on them (`task wait <plan id> --on <discovery task id>`); it
comes back on the pick list when they are done.

## 1. The goal

From X to Y, by a date if one was given, in the words of whoever set it. Read the starting figure
yourself and log it as a `read`. Every goal gets its own plan file, `work/plan/<goal>.md`: the goal,
the sums, the customer's way, the candidates scored, the lanes kept and a not-now line for the rest
(D47).

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

Then add its seed tasks from the library entry, each made executable for this customer:
- **One task per thing the customer receives.** A seed that covers several items (apps, pages,
  products) becomes one task per item when each is built and checked on its own; one task when they
  ship as one piece.
- **Merging or skipping a seed** is written with why in the plan file's lane section, so the next
  review can see it.
- **Every stage, up front.** Each stage's task is written when the lane opens and follows the stage before;
  `task start` refuses one whose `follows` is not done.

**A one-off engagement** (one video, one review) still gets a goal from its parameters: the piece accepted,
and released if it ships, by a date. It is one lane with its seed tasks; the plan file can be a few
lines.

## 6. Tell them

The plan in a few lines (the goal, the lanes and why, what we need from them), in the run's email
with the first checked deliverable (agency-comms). If
the goal itself looks out of reach, say so in it.

## 7. Review

Re-score when a review is due (see how-to-run, "Facts and replanning"). Keep, change, pause or stop a
lane with `lane_set`, and name the reason in `why`.
