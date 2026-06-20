# Geometry discipline — the rules that keep the room's bones intact

This is the *how* of structure preservation. This skill's #1 risk is **architectural
drift**: a restyle that wanders the walls, invents a window, shifts the camera, or
changes the room's footprint. Its #2 risk is **misrepresentation**: an "after" that
implies a condition the room does not actually have. Four disciplines prevent both — the
no-geometry-lock fact, the verbatim preserve clauses, single-change-per-turn +
re-feed-the-original, and the blocking geometry-QC gate (every render).

## 1 · The no-geometry-lock fact (the load-bearing constraint)

**Reachable fal edit models have NO hard geometry lock.** There is no ControlNet, no
mask, no depth constraint on the fal edit path — the model is free to re-imagine the
room's structure. Nano Banana Pro ranks best at *closest-resemblance,
structure-preserving* edits, which is why it is the engine here, but "best at preserving"
is **not** "locked to preserve." So:

- Structure preservation is **prompt-only** — the preserve clauses below carry the entire
  burden of holding walls / windows / ceiling / footprint / camera.
- That prompt-only preservation is **backstopped by a BLOCKING geometry-QC** (§4): a
  vision compare of the render vs the unaltered original. Prompt discipline reduces
  drift; geometry-QC catches the drift that slips through.
- **Never** rely on the model to "just keep" the structure. If geometry-QC says it
  drifted, it drifted — regenerate once, then keep-best + FLAG.

**Removal is NOT this skill's job.** Nano Banana Pro is weak at removal; do not use this
skill to remove a fixture or declutter — route that to `bot-020-fix-photo` (Qwen).

**Model-gap:** the deep-dive's preferred finish-swap engine is **Seedream 5
(`bytedance/seedream-5-lite`)** — purpose-built for single-element example-pair edits and
the cleaner tool for a finish swap. It is **NOT in the reachable set.** All three
operations here run on `fal-ai/nano-banana-pro` (fallback `fal-ai/qwen-image-edit`),
leaning on the "keep everything else the same" preserve tail. Note Seedream 5 as a
model-gap; do not attempt to call it.

## 2 · The geometry-preserve clauses (verbatim — append to every prompt)

Identity of the room's *structure* is locked by **language + re-attaching the unaltered
original** as the edit input every turn, because the model has no geometry lock. Append
the matching clause to the operation's base prompt.

**Restyle (whole-room) preserve clause — verbatim:**

```
Keep the room's layout, walls, windows, doors, ceiling line, and the camera
angle/framing exactly as in the source; change only the decor, finishes, and styling; do
not move, add, or remove any structural element (no new windows/walls/openings).
```

**Finish-swap (one named element) preserve clause — verbatim:**

```
Change only the named element; keep everything else the same — layout, walls, windows,
ceiling, lighting, camera, and all other furniture unchanged.
```

(The base finish-swap prompt's own tail "keep everything else the same" is the preserve
clause in miniature — load-bearing, not decoration. The clause above reinforces it
explicitly.)

**Renovation-concept ("after") preserve clause — verbatim:**

```
layout and lighting unchanged — preserve walls, windows, doors, ceiling, room
dimensions, and camera/framing exactly; apply ONLY the listed finishes.
```

If geometry-QC returns `drift`, **regenerate once with the preserve clause reinforced**
(e.g. prepend "CRITICAL: the architecture and camera must be identical to the source —"
to the same clause) and re-QC.

## 3 · Single change per turn + re-feed the original (the anti-drift SOP)

Drift compounds across turns. The hard rules:

- **ONE change per turn.** One named style, OR one named finish, OR one renovation finish
  list — never a style change *and* a finish swap *and* a relight in a single call.
- **Re-feed the UNALTERED original each turn.** The edit input is always the source
  photo, never a previous render. Editing a render of a render multiplies drift.
- A second operation on the same room is a **new, independent turn off the original** —
  not a continuation of the last render.
- **Directional / scoped language only:** name the material first, then the change
  ("white floating shelves → light oak"). Anchor with "keep everything else the same",
  "layout and lighting unchanged", "do not change the walls."

## 4 · geometry-QC — the BLOCKING vision gate (every render)

`geometry-qc.py` is the honest answer to the no-geometry-lock ceiling. It is a **keyless
`claude -p` vision compare** of the EDITED image vs the unaltered ORIGINAL, run on every
render. Pass `--expected-change` naming the INTENDED edit so the judge does not flag the
intended change as drift.

```bash
python3 scripts/geometry-qc.py \
  --candidate <edited.jpg> --reference <original.jpg> \
  --out <verdict.json> \
  --expected-change "<what the edit was supposed to change>" \
  --threshold 0.80
```

Per-mode `--expected-change`:

| Mode | `--expected-change` |
|---|---|
| restyle | `"decor/finishes/styling"` |
| finish-swap | `"one named finish/material"` (name the element) |
| renovation-concept | `"renovation finishes (concept) — room envelope + camera must hold"` |

Verdict JSON: `{"verdict":"pass|drift|review","confidence":N,"dims":{walls,windows,
ceiling,camera,footprint,defect_honesty},"findings":"..."}`. Exit codes: `0` pass /
`3` review / `4` drift / `2` could-not-judge.

| Dimension | Question |
|---|---|
| **walls** | Same wall positions/count? No wall moved, added, or removed. |
| **windows** | Same windows in the same places? No window invented or deleted. |
| **ceiling** | Same ceiling line/height? Not raised, dropped, or re-shaped. |
| **camera** | Same viewpoint/framing/crop? The camera did not move. |
| **footprint** | Same room dimensions/proportions? The footprint did not change. |
| **defect_honesty** | Did the edit ERASE a structural defect or REMOVE a permanent fixture? That is "different, not better" — a blocking flag, not a pass. |

Acting on the verdict:

- **pass** → ship.
- **drift** → regenerate ONCE with a reinforced preserve clause (re-feed the unaltered
  original), re-QC, then **keep-best + FLAG** the residual drift. **Never silently ship a
  drift.**
- **review** / **could-not-judge** → ship **with a prominent FLAG**; the bot does not
  certify it.

**The defect-honesty rule (AB-723 "different, not better").** A restyle may change
*decor and finishes*; it may **not** make a real **structural defect** disappear (a
crack, water stain, sagging ceiling) or **remove a permanent fixture** (a radiator, a
load-bearing post, a window). If the edit would do either, **STOP and FLAG** — that is
the misrepresentation line, not a quality nit. `defect_honesty` is a scored dimension; a
low score is blocking. Also flag **over-glamorization** (an "after" so aspirational it
sets expectations the property can't meet) — realistic beats impressive.

## 5 · ai-gen syntax contract (use EXACTLY — do NOT re-flag as unverified)

ai-gen 2.1.0 runs inside the sandbox. `scripts/gen-edit.sh` wraps the single base-edit;
these are the rules it encodes:

- **`--image <path|url>` → the model's SINGULAR `image_url`** (the single source/edit
  input). It is the proven base-edit path. **NOT `image_urls[]`** — that is the wrong key
  for this single-source edit. A local file path works (v2.1.0 uploads it).
- **Model params are POSITIONAL `key=value`** — `resolution=2K` for nano-banana-pro (one
  of `1K|2K|4K`). There is **NO `--resolution` flag** to ai-gen (it errors).
  `gen-edit.sh`'s `--resolution 2K` maps to the positional param **for nano-banana
  only** (qwen does not take it).
- **Aspect** via `--aspect-ratio` (e.g. `source aspect (omit --aspect to preserve it; valid: 16:9|9:16|1:1)` — rooms are landscape) or a
  `-s/--size` preset. `gen-edit.sh`'s `` maps to it.
- **Outputs:** read `files[0].local_path` from the `--format json` blob — entries are
  **objects**, not strings. The `*.fal.media` URL **expires**; `gen-edit.sh` downloads
  the local file immediately. Never `startswith("https://fal.media")` (it rejects every
  real URL — the BOT-013 bug).
- **Cost:** ignore the `credits_used` JSON field (over-reports ~8.4×). Read cost from
  `ai-gen estimate <slug>` + `ai-gen balance` deltas; billing lags ~5 min. Use
  `--max-cost` (in credits) as a per-call guard.
- **Model chain is fixed:** `--model fal-ai/nano-banana-pro --fallback
  fal-ai/qwen-image-edit`. On full-chain failure `gen-edit.sh` exits 1 — record
  `blocked` + FLAG; **never substitute an out-of-chain model.**

## 6 · Why this is honest, not paranoid

The bot is a **renderer + discloser, never an auto-publisher.** It emits files +
reports; a human ships them. The render is geometry-QC'd against the real original,
defect-honesty is a blocking dimension, and every altered render is routed through
`disclosure-stamp` (renovation-concept carries the non-removable "Conceptual Rendering -
Not Actual Condition" stamp; AB-723 disclosure defaults ON for any listing-destined
render). California AB-723 (in force 2026-01-01) makes undisclosed altered listing media
a **misdemeanor** + DRE-discipline risk, with **MLS fines $500–$5,000 (up to $10k for
material misrepresentation)** — so the discipline is the product, not overhead. The
unaltered original is the anchor: kept, re-attached for QC + disclosure pairing, never
fabricated.
