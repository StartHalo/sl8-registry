# Lane library

The pixel art agency's lanes (A04): one file per type of lane. The Plan lane's `plan` tasks read it when a goal
arrives: they open the lane that fits, with its seed tasks. A lane opened from an entry names it in its `library` field.

| Entry | For a goal in | Gauge (the number read) | Who controls the work |
|---|---|---|---|
| `sprite-pack.md` | sprites delivered and accepted | sprites accepted, of N in the pack | we draw; the customer accepts |

## How to use an entry

1. **Fit:** read "When it fits" against the goal.
2. **Lane object:** write its `scope` for this customer, take `why`, `gauge`, `done`, `pause` and `score` from the entry.
3. **Seed tasks:** add them with `task_added`, giving each a real id (the `S` ids are placeholders), setting `lane`
   to the id you opened the lane with (comms seeds stay `comms`), pointing every `follows` at the new ids, giving comms
   seeds `out: work/comms/<task id>.md`, and replacing anything in angle brackets.
4. **Lessons:** read them before the first task.

Every entry has the same eight parts as the core's lane entries; check its seed JSON with `python3 scripts/check.py`
in the agency repo.
