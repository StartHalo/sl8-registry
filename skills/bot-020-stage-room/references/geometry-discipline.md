# Geometry discipline — the rules that keep the bot from moving a wall

This is the *how* of architecture preservation. The bot's #1 risk is the AB-723
failure: a model shifts a window, re-proportions a wall, swaps the floor, invents a
feature the home lacks, or erases a real defect — turning a marketing edit into a
**material misrepresentation**. Three disciplines prevent it — the geometry-preserve
clause (the prompt), single-change-per-turn + re-feed-the-original (the method), and
the geometry-QC blocking gate (every staged image). Plus the defect-honesty rule that
makes the whole thing legal.

## 1 · The no-geometry-lock fact (the load-bearing finding)

**Reachable fal edit models have NO hard geometry lock.** There is no flag, no mask,
no parameter that forces the structure to stay fixed. Structure/color/camera
preservation is **prompt-driven ONLY** — and a generative model is free to re-imagine
the room. The Phase-0 reachability PoC and the sibling BOT-022 build proved this
directly (a "clean up this image" generative edit re-rendered the subject entirely).
A naive "stage this living room" prompt routinely:

- moves or re-proportions a wall,
- adds, moves, or removes a window or door,
- swaps the flooring or wall color,
- nudges the camera / changes the framing,
- or fabricates a structural feature the home does not have.

So the architecture is held two ways and ONLY two ways: **the preserve clause (below)
in the prompt**, and **the blocking geometry-QC (§4) on the output**. Neither alone is
enough — the clause biases the model, the QC catches what the bias misses.

## 2 · The geometry-preserve clause (verbatim — prepend/append to every staging prompt)

The clause is the soul of every staging prompt. It is re-stated at the START and END of
the staging body (bracketing the furniture description), because the model attends most
to the edges of the prompt. Use it **verbatim**:

```
Keep the room structure (walls/windows), only redecorate it with color, material, style
and furniture, and use the same camera view. Keep the same windows, same floor, same wall
color, same camera angle — add furniture only. Do not change cabinets, countertops, or
appliances. Preserve room geometry, walls, windows, floors, and ceiling exactly as in the
source; do not invent or move structure (no added windows/doors).
```

- "Material/style before furniture" — name the preservation first, then what to add.
- The clause is generic to all BOT-020 edit skills (stage / fix / restyle); the
  per-operation prompts in `stage-room-prompts.md` build it in automatically.
- On a `drift` regenerate (see §4), **reinforce** the clause: append it a second time and
  add "do not move or re-proportion any wall, window or door; identical camera; identical
  framing and crop."

## 3 · Single change per turn + re-feed the original (the method)

Because the models have no geometry lock, *how* you call them matters as much as *what*
you say:

- **Re-feed the ORIGINAL each turn.** The conditioning image (`--image` → the model's
  singular `image_url`) is ALWAYS the unaltered original room photo — never a previous
  staged output. Re-anchoring off an edit compounds drift: each generation re-rolls the
  whole image, so chaining edits walks the geometry away from the truth.
- **One change per turn.** Stage the entire furniture set in a SINGLE edit. Do not chain
  "now add a rug → now change the lamp → now add art" — each chained call re-rolls the
  full frame and re-drifts the structure. If the set needs adjusting, re-state the *whole*
  furniture set in one fresh prompt against the original, not an incremental edit on the
  last output.
- **Stage ONE hero angle.** There is no cross-image memory of the furniture you added — a
  second angle of the same room would be furnished *differently* (different sofa, different
  layout), which reads as a different property. Stage the hero angle; if more angles are
  requested, FLAG that the bot stages one consistent hero, not a matched multi-angle set.
- **Bias to restrained, photoreal staging.** Over-furnished rooms read fake and trigger
  buyer backlash ("it looked nothing like that in person"). Prefer a believable,
  broad-appeal set scaled to the room over a maximalist showroom.

## 4 · geometry-QC — the BLOCKING vision gate (every staged image)

`geometry-qc.py` is the honest answer to the no-geometry-lock ceiling. It is a **keyless
`claude -p` vision compare** of the EDITED image against the unaltered ORIGINAL, run on
**every** staged image before it can ship.

```bash
python3 scripts/geometry-qc.py \
  --candidate <staged.jpg> --reference <original.jpg> \
  --out <geometry-qc.md> \
  --expected-change "added furniture and decor / virtual staging" \
  --threshold 0.80
```

- **`--expected-change`** names the INTENDED edit so the judge does **not** flag the
  furniture itself as drift. For this skill it is always `"added furniture and decor /
  virtual staging"`. (Sibling skills pass `"day-to-dusk lighting"`, `"new finishes"`,
  etc.)
- The verdict JSON: `{"verdict":"pass|drift|review","confidence":N,"dims":{walls,windows,
  ceiling,camera,footprint,defect_honesty},"findings":"..."}`.

| Dimension | Question |
|---|---|
| **walls** | Same walls in the same places, same proportions? Nothing moved or added. |
| **windows** | Same windows/doors, same count, same positions and sizes? None invented. |
| **ceiling** | Same ceiling height/line/features? No dropped/raised ceiling. |
| **camera** | Same camera position, angle, framing, and crop? No re-perspective. |
| **footprint** | Same room footprint/depth? The space is not larger or re-shaped. |
| **defect_honesty** | No structural defect erased, no permanent fixture removed (§5). |

Exit codes and the action each one drives:

- **pass** (exit 0) — all axes held, only furniture changed → **ship**.
- **drift** (exit 4) — a structural axis moved → **regenerate ONCE** with the reinforced
  preserve clause (§2), then **keep-best + FLAG** the residual drift in `geometry-qc.md`.
  **NEVER silently ship a drift.**
- **review** (exit 3) — the judge is uncertain (reflective glass, complex mullions,
  ambiguous depth) → **ship + FLAG** for a human eye.
- **could-not-judge** (exit 2) — record it; ship the best result with a prominent FLAG; do
  not certify it.

Record every verdict (axis-by-axis, confidence, and the model that produced the asset) in
`geometry-qc.md`. Shipping one honest, geometry-true staged image beats shipping a
prettier one that moved a wall.

## 5 · The defect-honesty rule — AB-723 "better, not different"

California **AB-723** (in force 2026-01-01): undisclosed altered listing media is a
**misdemeanor + DRE discipline**, and MLS rules fine **$500–$5,000** (up to **$10,000** for
material misrepresentation). The hard line is **"better, not different."** Virtual staging
may make the space look *better* — it may **NOT** make it *different*:

- You may **add furniture and decor**, brighten, and style the space.
- You may **NOT erase a structural defect** (a crack, water stain, sagging or stained
  ceiling, missing flooring, visible damage) — staging hides it from the buyer.
- You may **NOT remove a permanent fixture** (a radiator, built-in, support column,
  electrical panel, baseboard heater) — that changes what the property *is*.

If a staging edit would do either, that is the failure `defect_honesty` exists to catch:
**STOP and FLAG** in `geometry-qc.md`, and do not ship the "cleaned" version. The
unaltered original is the anchor of honesty — it is kept, re-attached for the QC and the
disclosure pairing, and **never fabricated**.

## 6 · ai-gen syntax contract (use EXACTLY — do not re-flag as unverified)

`gen-edit.sh` wraps `ai-gen` (2.1.0) so the skill never calls it raw, but the contract it
encodes:

- **`--image <path|url>` → the model's SINGULAR `image_url`** (the single source/edit
  input). NOT `image_urls[]`. The conditioning image is always the unaltered original.
- **`resolution=2K` is a POSITIONAL `key=value` model param** (one of `1K|2K|4K`) and is
  **nano-banana-only** — there is **NO `--resolution` flag** on ai-gen (it errors).
  `gen-edit.sh`'s `--resolution 2K` translates to the positional param and is omitted for
  the Qwen fallback.
- Aspect via `--aspect-ratio` / size presets (`gen-edit.sh `).
- **Outputs:** read `files[0].local_path` from the `--format json` blob (entries are
  **objects**, not strings). The `*.fal.media` URL **expires** — `gen-edit.sh` downloads
  the local file immediately. Never `startswith("https://fal.media")` (the BOT-013 bug).
- **Cost:** ignore the `credits_used` JSON field (over-reports ~8.4×). Read cost from
  `ai-gen estimate <slug>` + `ai-gen balance` deltas; billing lags ~5 min. `--max-cost`
  (in credits) is the per-call guard.
- **Model chain:** `--model fal-ai/nano-banana-pro --fallback fal-ai/qwen-image-edit`. On
  failure the script walks the chain and records which model produced the asset; if all
  chain models fail it exits 1 → record `blocked` + FLAG, **never** substitute an
  out-of-chain model.

## 7 · Why this is honest, not paranoid

The bot is a **checker/generator, never an auto-publisher.** It emits the staged image +
the geometry-QC report + the disclosure set; a human reviews `geometry-qc.md` and ships.
The geometry-preserve clause biases the model, the blocking QC catches the drift the bias
misses, the defect-honesty rule keeps the edit on the legal side of "better not
different," and `disclosure-stamp` makes the publish AB-723-compliant. The agent always
knows exactly what held, what drifted, and what needs a human eye — that trust is the
product.
