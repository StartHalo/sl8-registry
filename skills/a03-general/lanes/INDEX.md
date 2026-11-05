# Lane library

The general agency's lanes (A03): one file per type of lane no service agency owns (a service agency's own are in
its skill folder's `lanes/`). The Plan lane's `plan`
tasks read it when a goal arrives or a review runs: they pick candidate lanes from here, score them,
and open the chosen ones with their seed tasks. A lane opened from an entry names it in its
`library` field.

| Entry | For a goal in | Gauge (the number read) | Who controls the work |
|---|---|---|---|
| `retention-feature.md` | app installs, active users | spec built and live; weekly return and share-link installs | the customer builds |
| `outbound-email.md` | new paying B2B customers | prospects emailed (of N); replies; demos or trials | the customer sends |
| `referral.md` | new paying B2B customers | customers called, introductions (their counts) | the customer |
| `search-and-ai-pages.md` | trials or sales from search | own site cited in N of 20 buyer questions; pages live | we write; the customer pastes |

## How to use an entry

1. **Fit:** read "When it fits" against the goal, the stage and what the customer can do.
2. **Lane object:** write its `scope` for this customer (what it covers and what not), take `why` from "How it moves the goal", `gauge` from "Gauge", `done` and
   `pause` from "Done when / Pause when", and `score` from "Score guidance" (adjusted to this
   customer, with a reason). The rank is set across all of the customer's goal lanes, no ties.
3. **Seed tasks:** add them with `task_added`, giving each a real id (the `S` ids are placeholders),
   setting `lane` to the id you opened the lane with (comms seeds stay `comms`), pointing every
   `follows` at the new ids, giving comms seeds `out: work/comms/<task id>.md`, and replacing
   anything in angle brackets. A `customer` task stays `ready` until the email that
   asks for it goes out, then `waiting`. Recurring reads stay one task (`every`).
4. **Lessons:** read them before the first task; they are what went wrong or right last time.

## The shape of an entry

1. When it fits · 2. How it moves the goal · 3. Gauge · 4. Done when / Pause when · 5. Score
guidance (impact, confidence, control, 1 to 3, with who controls the work) · 6. Seed tasks (a JSON
array valid against the core's `kinds.json`, in `~/.claude/skills/agency-run/knowledge/`) · 7. References · 8. Lessons from our work (each
with where and when it was learned, e.g. "a B2B customer's records, Oct 2026").

Scores: **impact** 3 = can close much of the gap; **confidence** 3 = a figure from a comparable,
1 = unproven; **control** 3 = we do it, 1 = the customer does it; **speed** breaks ties.

## Adding an entry

When a lane of a new type is run, write its entry from the work: the same eight parts, lessons
sourced, "unproven" where there is no evidence, and no customer names, figures or paths anywhere:
every install of this agency gets a copy. Check that the seed-task JSON parses and that each task meets
its kind (`python3 scripts/check.py` in the agency repo). A new entry ships as a new release of this
agency's bot (Factory).
