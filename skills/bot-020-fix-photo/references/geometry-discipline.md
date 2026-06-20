# Geometry discipline — the rules that keep the bot from changing the house

This is the *how* of architecture-locking. The bot's #1 risk is the failure that
turns a marketing edit into a **misrepresentation**: the model shifts a window,
re-proportions a wall, smears where an object was removed, invents a feature the home
lacks, or — worst — erases a structural defect. Four disciplines prevent it: the
no-geometry-lock fact, the verbatim preserve clause, single-change-per-turn +
re-feed-the-original, and the blocking geometry-QC. The defect-honesty rule (in
SKILL.md Step 2 + the `defect_honesty` QC dim) sits on top of all four.

## 1 · The no-geometry-lock fact (the load-bearing finding)

**The reachable fal edit models have NO hard geometry/feature lock.** Structure
preservation is **prompt-driven only** — there is no model flag, mask, or parameter
that pins the walls/windows/camera. A generative edit is free to re-imagine the scene:
move a window, re-proportion a wall, hallucinate a replacement object where one was
removed, melt a mullion, or invent a feature. (This is the same finding the sibling
BOT-022 build proved when a generative re-background hallucinated a *different
product*.) Therefore preservation is enforced by **language + re-attaching the
unaltered original as the single source**, and **verified** by a blocking vision-QC.
Never trust the model to hold geometry on its own.

## 2 · The geometry-preserve clause (verbatim — append to every prompt)

Identity of the *architecture* across an edit is locked by **language**. Append the
matching clause verbatim to the operation prompt (`gen-edit.sh` takes the full
combined string):

**Standard (declutter — interior or exterior):**

```
keeping the architectural integrity of the room — preserve all walls, windows, doors,
ceiling, floor, built-in fixtures, the camera angle/framing and the room's proportions
exactly; do not invent, move, resize, add or delete any structural element.
```

**Twilight / sky (exterior lighting + sky swaps) — use this clause instead:**

```
Keep the building, architecture, rooflines, windows, doors, landscaping and the exact
camera angle/framing unchanged — only change the time of day / sky. Preserve accurate
reflections and proportions.
```

**Enhance (exposure/white-balance/HDR-tone) — use this clause instead:**

```
pure color/exposure/tone edit only; content must be identical.
```

If a `preserve-note` is supplied (e.g. "keep the bay window and the fireplace
exactly"), append it to the clause. Name the geometry first, then the change — the
preserve clause comes after the operation verb but is the part the model must obey.

## 3 · Single-change-per-turn + re-feed the original

Two non-negotiable SOPs:

- **ONE operation per turn.** Never combine declutter + twilight (or any two) in a
  single prompt — each operation is its own `gen-edit.sh` call. A "declutter +
  twilight" request is **two turns**.
- **Re-feed the UNALTERED ORIGINAL every turn.** Every edit's `--image` source is the
  original photo in `inputs/`, **never** a previous edit. Drift compounds when edits
  are chained; the original is the single geometry anchor for every operation AND for
  the geometry-QC compare AND for the AB-723 disclosure pairing. The original is
  **kept, re-attached, and never fabricated** — it is the anchor the whole skill turns
  on.

## 4 · ai-gen syntax contract (the `gen-edit.sh` interface — use EXACTLY)

`gen-edit.sh` is the one single-source base-edit wrapper. It runs:

```
ai-gen image "<prompt>" -m <model> --image <src> -o <work> --format json \
  --aspect-ratio <r> --max-cost <n> [resolution=2K]   # 2K positional, nano-banana only
```

Hard rules (verified live on ai-gen 2.1.0 — do NOT re-flag these as unverified):

- **`--image <path|url>` → the model's SINGULAR `image_url`** (NOT `image_urls[]`).
  This is the proven single-source base-edit path. A local file path works (v2.1.0
  uploads it).
- **`resolution=2K` is a POSITIONAL `key=value` model param** — for `nano-banana-pro`
  only (one of `1K|2K|4K`). **There is NO `--resolution` flag at the ai-gen layer**
  (`gen-edit.sh`'s own `--resolution 2K` flag passes it through as the positional only
  for nano-banana; for qwen it is ignored). Never pass `--resolution` to `ai-gen`
  directly — it errors.
- **`gen-edit.sh` model chain:** `--model` is the primary, `--fallback` the next in
  the chain. On a full-chain failure it exits 1 → record `blocked` + FLAG; **never
  substitute an out-of-chain model** (declutter must not silently fall to nano-banana —
  Qwen is the removal engine; nano-banana is weak at removal).
- **Outputs:** `gen-edit.sh` reads `files[0].local_path` from the `--format json` blob
  (entries are **objects**, not strings) and downloads it immediately — the
  `*.fal.media` URL **expires**. On success it prints `<model>\t<out>` to stdout
  (record the model in `fix-log.md`). Never `startswith("https://fal.media")` (it
  rejects every real URL).
- **Cost:** ignore the `credits_used` JSON field (over-reports ~8.4×). Read cost from
  `ai-gen estimate <slug>` + `ai-gen balance` deltas; billing lags ~5 min. Use
  `--max-cost` (in credits) as a per-call guard.

## 5 · geometry-QC — the BLOCKING vision gate (every edit)

`scripts/geometry-qc.py` is the architecture-integrity backstop: a **keyless `claude
-p` vision compare** of the EDITED image vs the **unaltered original**. It is the
honest answer to the no-geometry-lock ceiling — run it on **every** edit.

```bash
python3 scripts/geometry-qc.py --candidate <edited.jpg> --reference <original.jpg> \
  --out <verdict.json> --expected-change "<what the edit was supposed to change>" \
  --threshold 0.80
```

The `--expected-change` string names the INTENDED edit so the judge does not flag it
as drift (`"removed clutter/objects"`, `"day-to-dusk lighting / time of day"`, `"sky
replaced"`, `"exposure/color/tone only, no content change"`).

Verdict JSON:

```json
{"verdict":"pass|drift|review","confidence":N,
 "dims":{"walls":N,"windows":N,"ceiling":N,"camera":N,"footprint":N,"defect_honesty":N},
 "findings":"..."}
```

| dim | question |
|---|---|
| **walls** | Same walls, same positions/proportions? Nothing moved, added, or removed. |
| **windows** | Same windows/doors — count, size, placement, mullions? None invented, moved, or melted. |
| **ceiling** | Same ceiling height/line/features? No re-proportioning. |
| **camera** | Same camera angle/framing/crop? No re-shoot, no perspective change. |
| **footprint** | Same room footprint/flooring extent? No square-footage change. |
| **defect_honesty** | Were any STRUCTURAL DEFECTS (crack/stain/sag/damage) or PERMANENT FIXTURES (radiator/vent/outlet/built-in) erased? A low score = a "different, not better" misrepresentation. |

Exit codes → action:

- **0 = pass** → ship (record verdict + per-dim scores in `fix-log.md`).
- **4 = drift** → **regenerate ONCE** off the unaltered original with a **reinforced
  preserve clause** (repeat the clause; add the specific drifted axis from `findings`,
  e.g. "do NOT move or resize the bay window"); re-run QC; then **keep-best + FLAG**
  (ship the better of the two with a prominent FLAG). **NEVER silently ship a drift.**
- **3 = review** → ship **with a prominent FLAG** (the judge could not certify it; the
  bot does not certify it either).
- **2 = could-not-judge** → treat as `review` + FLAG.

**`defect_honesty` is a hard backstop:** if it is low, **STOP and FLAG** regardless of
the overall verdict — erasing a structural defect or a permanent fixture is the AB-723
"different, not better" line, never overridden by a high geometry score. The Step-2
defect-honesty front-stop catches it earlier; this dim is the safety net.

## 6 · Why this is honest, not paranoid

AB-723 (in force 2026-01-01) makes undisclosed/altered listing media a **misdemeanor +
DRE discipline**, with MLS fines **$500–$5,000** (up to **$10,000** for material
misrepresentation). The rule is "**better, not different**": declutter movable items,
dusk the sky, swap the sky, brighten — fine; erase a structural defect, remove a
permanent fixture, move a wall, or invent square footage — misrepresentation. The bot
is a **generator/discloser, never an auto-publisher**: it emits the fixed image + the
geometry-QC verdict + the AB-723 disclosure set; a human ships them. The unaltered
original is the anchor — kept, re-attached for QC + the disclosure pairing, never
fabricated. That honesty is the product.
