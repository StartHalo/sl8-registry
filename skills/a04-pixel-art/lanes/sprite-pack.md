# Lane: sprite pack

Library id: `sprite-pack`. A pack of small pixel art sprites (characters, items, icons) in one size and
palette, drawn with code from character grids, shared a batch at a time with a sheet the customer can
see at a glance. Everything needed is in `bot/user.md`: the pack list, size, palette limit and style.
We do all the work; the customer only reacts.

## 1. When it fits

- **Fits:** a goal counted in sprites delivered: a game jam, an indie game's first assets, a set of
  brand icons; sizes 8 to 64 pixels; a palette of 32 colours or fewer.
- **Does not fit:** illustration or animation beyond a few frames, sprites over 64 pixels, photo-real
  work, or a brief that needs an image model (Base has none; say so).

## 2. How it moves the goal

sprites accepted = sprites delivered − sprites sent back. Each batch is drawn, checked and shared in the
same job, so every job moves the count unless the pack is done.

## 3. Gauge

- **Lead:** sprites shared, of N in the pack (our record: the pass events).
- **Lag:** sprites accepted (the customer's reply; no reply in 7 days counts as accepted).
- **Weekly target:** the whole pack in the first job if it has 8 or fewer sprites, otherwise 8 per job.

## 4. Done when / Pause when

- **Done when:** every sprite on the pack list is shared and the full sheet has passed; then keep
  (the customer adds sprites, within `user.md`) or close.
- **Pause when:** never for lack of input: the brief is complete by design. A sprite the customer
  sends back is redrawn in the next job.

## 5. Score guidance

- **Impact 3:** the pack is the goal.
- **Confidence 3:** drawn and checked by our own script; no outside dependency.
- **Control 3:** we do it all.
- **Speed 3:** minutes per batch.

## 6. Seed tasks

Ids are stage numbers: open the lane as `sprite-pack` and name its tasks `sprite-pack-S01`, `sprite-pack-S02`...
(the comms seed is `comms-S03`), so the stage the lane has reached is the highest done `S` number.

```json
[
  {"id": "sprite-pack-S01", "lane": "sprite-pack", "kind": "work", "title": "Style sheet and palette",
   "do": "from bot/user.md: the size, the palette (hex, no more colours than allowed), the outline colour, light from the top left; one line per sprite on the pack list saying its silhouette and key colours",
   "refs": ["bot/user.md", "work/agency/CUSTOMER.md"], "skill": "a04-pixel-art", "owner": "us",
   "done_when": "palette within the limit and every pack sprite has a line",
   "out": "work/pixel/style.md"},
  {"id": "sprite-pack-S02", "lane": "sprite-pack", "kind": "deliverable", "title": "Batch 1: the first sprites on the pack list",
   "do": "write work/pixel/batch-1.json (up to 8 sprites, in pack order), render it with scripts/png.py, check it",
   "refs": ["work/pixel/style.md", "bot/user.md"], "follows": "sprite-pack-S01", "skill": "a04-pixel-art", "owner": "us",
   "done_when": "png.py check exits 0; each sprite reads as its name at 1x; only palette colours; evaluator passes",
   "out": "work/pixel/batch-1.png"},
  {"id": "comms-S03", "lane": "comms", "kind": "comms", "title": "Send batch 1",
   "do": "two or three lines: which sprites are in the sheet, the size and palette, what comes next; ask for changes by sprite name",
   "refs": ["work/pixel/batch-1.png"], "follows": "sprite-pack-S02", "skill": "agency-comms", "owner": "us",
   "to": "<customer email, from bot/user.md>", "out": "work/comms/<task id>.md"},
  {"id": "sprite-pack-S04", "lane": "sprite-pack", "kind": "deliverable", "title": "The full sheet",
   "do": "when every pack sprite has passed in a batch: one sheet of the whole pack in pack order (work/pixel/sheet.json), rendered and checked",
   "refs": ["work/pixel/style.md", "bot/user.md"], "follows": "sprite-pack-S02", "skill": "a04-pixel-art", "owner": "us",
   "done_when": "png.py check exits 0 with the pack's sprite count; matches the passed batches; evaluator passes",
   "out": "work/pixel/sheet.png"}
]
```

A pack over 8 sprites adds one batch task per 8 (`batch-2`, ...) when the plan opens the lane. A change the
customer asks for is a new deliverable task `sprite-pack-S02-r<N>` (N counts the rounds from 1) whose spec is
`work/pixel/batch-1-r<N>.json` (batch 1's spec with the changes, and any new sprite added at the end) and whose `out`
is `work/pixel/batch-1-r<N>.png`, followed by a comms task that sends it. Keep these names: the customer slices
sheets by them.

## 7. References

`bot/user.md` (the pack list, size, palette limit, style words), the style sheet, the batch specs in
`work/pixel/`.

## 8. Lessons from our work

- Unproven: no engagement has run yet (written 2026-11-06 for the first test install).
