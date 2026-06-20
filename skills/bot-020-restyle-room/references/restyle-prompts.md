# Restyle prompts — the verbatim per-operation prompt kit

The *what* of each edit. These are the verbatim prompts carried from the deep-dive's
field-tested sources. The production rule is non-negotiable: **run ONE style / ONE
finish / ONE renovation finish-list per turn, and re-feed the unaltered original between
turns** — never send the multi-style line in production. Append the matching
geometry-preserve clause from `geometry-discipline.md` to every prompt.

All three operations run on `fal-ai/nano-banana-pro` (fallback `fal-ai/qwen-image-edit`)
via `scripts/gen-edit.sh`. The deep-dive's preferred finish-swap engine, **Seedream 5
(`bytedance/seedream-5-lite`)**, is a **model-gap — NOT in the reachable set** — do not
call it.

---

## (a) restyle — whole-room style change → disclosure `--type restyle`

**Source prompt (verbatim, as published — DO NOT send this multi-style line in
production):**

```
Transform this room into modern minimalist, Scandinavian cozy, and luxury contemporary
styles. Keep furniture scale realistic.
```

**Production rule:** run **ONE named style per turn** and re-feed the original between
turns. Rewrite the verbatim line to a single style, e.g.:

```
Restyle this room in a Scandinavian cozy style. Keep furniture scale realistic.
```

Then append the **restyle preserve clause** (`geometry-discipline.md` §2). The named
style comes from the `brief` (e.g. "modern farmhouse", "Scandinavian cozy", "luxury
contemporary"). One style = one turn = one render.

- geometry-QC: `--expected-change "decor/finishes/styling"`.
- disclosure: `--type restyle` (caption **"Digitally Altered"**).

---

## (b) finish/material swap — one named element → disclosure `--type restyle`

**Source prompt (verbatim):**

```
Turn the white floating shelves to light oak, keep everything else the same.
```

**Production rule:** parameterize the named element (the thing being changed and its new
finish) from the `brief` — e.g. "cabinets → light oak", "carpet → wide-plank oak
flooring", "sofa → linen upholstery". The tail **"keep everything else the same"** is the
load-bearing preserve clause in miniature; keep it verbatim, then append the
**finish-swap preserve clause** (`geometry-discipline.md` §2) to reinforce it. One named
element = one turn.

- geometry-QC: `--expected-change "one named finish/material"` (name the element, e.g.
  `"shelves recolored to light oak"`).
- disclosure: `--type restyle` (caption **"Digitally Altered"**).

---

## (c) renovation-concept "after" — fixer mockup → disclosure `--type renovation-concept`

**Source prompt (verbatim, parameterized template):**

```
update wall {WALL_MATERIAL}, floor {FLOOR_MATERIAL}, furniture upholstery {FABRIC};
layout and lighting unchanged; realistic PBR textures
```

**Production rule:** fill the `{WALL_MATERIAL}/{FLOOR_MATERIAL}/{FABRIC}` slots from the
brief's renovation finish list. `layout and lighting unchanged` is the
geometry/lighting guard in the base prompt; append the **renovation preserve clause**
(`geometry-discipline.md` §2) to make the envelope + camera lock explicit.

This is the **highest-risk operation** — a renovation "after" implies a condition that
does NOT exist yet ("DIFFERENT, not better"; the single highest AB-723/MLS
misrepresentation exposure). It carries a **MANDATORY** conceptual label.

- geometry-QC: `--expected-change "renovation finishes (concept) — room envelope +
  camera must hold"`. The `defect_honesty` dimension is especially load-bearing here:
  the "after" may show new finishes but must NOT erase a structural defect or remove a
  permanent fixture.
- disclosure: `--type renovation-concept` (caption **"Conceptual Rendering - Not Actual
  Condition"** — non-removable, the verbatim
  "Conceptual rendering - not the actual current condition." line).

---

## Cross-cutting guards (apply to all three)

- **One change per turn; re-feed the unaltered original each turn.** Never edit a render
  of a render. A second operation is a new turn off the source.
- **No geometry lock** — guard hard against wandering walls, invented windows, a changed
  footprint, a drifting camera, and an over-glamorized "after." All five are
  geometry-QC failure modes.
- **No removal here.** Nano Banana Pro is weak at removal — do NOT use this skill to
  remove a fixture/declutter. Route removal to `bot-020-fix-photo` (Qwen).
- **Defect honesty.** A restyle changes decor/finishes; it must not make a real
  structural defect disappear or remove a permanent fixture. That is "different, not
  better" — STOP + FLAG.
- **AB-723 disclosure defaults ON** for any listing-destined render: stamp + original/
  altered pair + reachable-original link, every time. Renovation-concept additionally
  always carries the non-removable conceptual stamp.
