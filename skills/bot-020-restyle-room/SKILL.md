---
name: bot-020-restyle-room
description: Restyle a dated real-estate room, swap a single finish/material, or render a fixer-upper "after" renovation concept (fal-ai/nano-banana-pro, --image) — keeping the room's layout, walls, windows, doors, ceiling and camera exactly, changing only decor/finishes. One change per turn, the original re-fed each turn; every edit passes a BLOCKING geometry-QC against the unaltered original. Restyle/finish-swap lean "better, not different"; a renovation "after" is inherently different and MUST carry the conspicuous "Conceptual rendering — not the current condition" label. Every altered image is routed through the shared disclosure-stamp skill. Use for the 'restyle' phase, or whenever asked to "restyle this room", "new cabinets/finishes", "change the floor/paint", or "show the renovated / after version".
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-020
  references-skills: [disclosure-stamp]
  inputs:
    - { name: source-photo, type: image, required: true, description: "artifacts/<listing>/inputs/<room>.<jpg|png> — the unaltered listing photo of the room as it actually is (occupied, dated finishes expected). This is the geometry/condition ground-truth every render is QC'd against, kept and re-attached for disclosure pairing — never fabricated." }
    - { name: brief, type: text, required: true, description: "What to render: the named target style (e.g. 'Scandinavian cozy'), OR the named finish/material to swap (e.g. 'cabinets to light oak'), OR the renovation finish list for a concept 'after'. From context.md / the task. A missing brief is a clean recorded failure, not a question." }
    - { name: mode, type: text, required: false, description: "restyle | finish-swap | renovation-concept. Default restyle. restyle = whole-room decor/finish vibe change; finish-swap = one named element only; renovation-concept = a fixer 'after' that implies a not-yet-real condition (highest disclosure risk; forces the conceptual stamp)." }
    - { name: scope, type: text, required: false, description: "What may change. Default 'finishes only, keep layout + structure'. The preserve clause is non-negotiable regardless of scope — walls/windows/ceiling/footprint/camera always hold." }
  outputs:
    - { name: render, type: image, path: artifacts/<listing>/03-restyle/<room>-<mode>.jpg, description: "The restyled / finish-swapped / renovation-concept render — one change per turn, geometry-preserved, geometry-QC-passed (or kept-best + FLAG). Always the SAME room envelope and camera as the source." }
    - { name: restyle-log, type: markdown, path: artifacts/<listing>/03-restyle/restyle-log.md, description: "The per-render record: mode, the named change, the verbatim prompt + preserve clause, the geometry-QC verdict (pass/drift/review) with findings, the defect-honesty check, cost (balance delta), and the disclosure --type used." }
    - { name: disclosed-set, type: image, path: artifacts/<listing>/03-restyle/disclosed/<room>-<mode>-disclosed.jpg, description: "The disclosure-stamp output set (stamped render + original/altered pair + disclosure-assets.md with the MLS remark + AB-723 line). Produced by the shared disclosure-stamp skill — the mandatory final step on every altered render." }
---

# Restyle Room — restyle / finish-swap / renovation concept (BOT-020 · restyle phase)

Turn one listing photo of a **dated or occupied room** into a "show the potential"
render: a whole-room **restyle** into a named style, a single named **finish/material
swap**, or a fixer-upper **renovation "after" concept** — while holding the room's
**walls, windows, ceiling, footprint, and camera EXACTLY as the source**. This is the
restyle phase of the listing-photo studio; it changes the *look of the finishes*, never
the *bones of the room*.

This skill runs **headless**. Never ask the user anything: every optional input has a
default below; a missing **required** input (the source photo, or the brief) is a clean
**recorded failure**, not a question.

## The architecture (read this first — it is load-bearing)

The reachability gate proved the single fact that shapes this whole skill: **reachable
fal edit models have NO hard geometry lock** — there is no ControlNet / mask / depth
constraint on the fal edit path. So a restyle that wanders the walls, invents a window,
shifts the camera, or changes the footprint is *not* prevented by the model. Structure
preservation is **prompt-only** (the verbatim preserve clause in
`references/geometry-discipline.md`) **plus a BLOCKING geometry-QC** vision compare of
the render against the unaltered original. Therefore:

- **Every render is ONE change per turn, and the original is re-fed each turn.** Never
  stack a style change and a finish swap and a relight in a single call — drift
  compounds. Re-attach the unaltered source as the edit input every turn, never a
  previous render.
- **Model routing — all three operations use `fal-ai/nano-banana-pro`** (the
  whole-room restyle / structure-preserving engine; it ranked best at
  closest-resemblance structure-preserving edits). The shared `scripts/gen-edit.sh`
  routes through it with `fal-ai/qwen-image-edit` as the in-chain fallback. **Do NOT
  use this skill to REMOVE an element** — Nano Banana Pro is weak at removal; route any
  declutter / object-removal to the sibling `bot-020-fix-photo` (Qwen) skill instead.
- **Every render passes the blocking `geometry-QC`** (`scripts/geometry-qc.py`) before
  it ships — a keyless `claude -p` vision compare of the edited image vs the unaltered
  original on walls / windows / ceiling / camera / footprint / defect-honesty. `pass` →
  ship; `drift` → regenerate once with a reinforced preserve clause, then keep-best +
  FLAG; `review` → ship + FLAG. **Never silently ship a drift.**
- **Model-gap:** the deep-dive's preferred finish-swap engine is **Seedream 5
  (`bytedance/seedream-5-lite`)**, purpose-built for single-element example-pair edits —
  but it is **NOT in the reachable set**. Note it as a model-gap; finish-swap runs on
  `fal-ai/nano-banana-pro` here, leaning hard on the "keep everything else the same"
  preserve tail.

## When to use

The `restyle` row of the project's `state.md`. Also invoked directly when asked to
"restyle this room / make it modern farmhouse / Scandinavian cozy / luxury contemporary",
"change the cabinets to oak", "swap the flooring / upholstery", "show what this room
could look like renovated", or "render a fix-and-flip after concept". For
**declutter / removing furniture or fixtures**, use `bot-020-fix-photo` instead (Nano
Banana Pro is weak at removal).

## Read first (READ-BEFORE-WRITE)

Read, in this order:

1. `artifacts/<listing>/context.md` — listing truth (room name, target style or finish
   list, mode, whether the render is destined for a **live listing**). Optional;
   defaults below if absent.
2. `artifacts/<listing>/inputs/<room>.<jpg|png>` — the **required** source photo. This
   is the geometry/condition ground-truth. Confirm it exists and is a readable image.

**Required-input gate (record, don't ask):**

- No `inputs/<room>.*` on disk → write a failure note in `state.md`
  (`status: blocked`, `next_action: re-run onboarding — source room photo missing`) and
  stop. Do **not** invent or generate a room from text alone — a fabricated "original"
  has no anchor for QC or disclosure pairing and is itself a misrepresentation risk.
- No `brief` (no named style / finish / renovation list) → same clean failure
  (`next_action: re-run onboarding — restyle brief missing`). Do not guess a style.
- The source photo is unreadable / not an image → same clean failure. Do not proceed.

**Defaults for optional inputs:** `mode` = `restyle`; `scope` = `finishes only, keep
layout + structure`; if `context.md` does not say the render is for a live listing,
default the **AB-723 disclosure ON** anyway (safer; a concept that touches a live
listing without disclosure is a misdemeanor).

## Step 0 — Reachability check (attempt, don't gate the engine)

Confirm the slug this skill needs is reachable. This is a *reachability check*, not a
switch that changes the pipeline:

```bash
ai-gen info fal-ai/nano-banana-pro   > work/restyle/nbp-info.json   2>&1 || true
ai-gen info fal-ai/qwen-image-edit   > work/restyle/qwen-info.json  2>&1 || true
ai-gen balance                       > work/restyle/balance-before.txt
```

- `fal-ai/nano-banana-pro` is the engine for all three operations; `fal-ai/qwen-image-edit`
  is the in-chain fallback. If `ai-gen info` errors, attempt the run anyway (the proxy
  has served models `info` could not describe) and let `gen-edit.sh` record any failure
  honestly (blocked + FLAG; never substitute an out-of-chain model).
- Record the starting balance — cost is read from `ai-gen estimate` + `ai-gen balance`
  deltas, **never** the `credits_used` JSON field (it over-reports ~8.4×). See
  `references/geometry-discipline.md`.

## Step 1 — The restyle / finish-swap / renovation-concept edit

Pick the operation from `mode` and run **exactly one change this turn**, re-feeding the
**unaltered original** as the source. Use the verbatim per-operation prompt from
`references/restyle-prompts.md` plus the matching geometry-preserve clause from
`references/geometry-discipline.md`. The shared `scripts/gen-edit.sh` does the single
ai-gen base-edit (`--image` → the model's SINGULAR `image_url`, downloads
`files[0].local_path` because fal URLs expire):

**(a) restyle** — whole-room style change. Run **ONE named style per turn** (never the
multi-style line — see the prompts reference):

```bash
scripts/gen-edit.sh \
  "Restyle this room in a Scandinavian cozy style. Keep furniture scale realistic. \
<RESTYLE PRESERVE CLAUSE — see references/geometry-discipline.md>" \
  artifacts/<listing>/inputs/<room>.jpg \
  artifacts/<listing>/03-restyle/<room>-restyle.jpg \
  --model fal-ai/nano-banana-pro --fallback fal-ai/qwen-image-edit \
  --aspect landscape_4_3 --max-cost 60 --resolution 2K --work work/restyle
```

**(b) finish-swap** — one named element only. Parameterize the named element; the tail
**"keep everything else the same"** is the load-bearing preserve clause:

```bash
scripts/gen-edit.sh \
  "Turn the white floating shelves to light oak, keep everything else the same. \
<FINISH-SWAP PRESERVE CLAUSE — see references/geometry-discipline.md>" \
  artifacts/<listing>/inputs/<room>.jpg \
  artifacts/<listing>/03-restyle/<room>-finish-swap.jpg \
  --model fal-ai/nano-banana-pro --fallback fal-ai/qwen-image-edit \
  --aspect landscape_4_3 --max-cost 60 --resolution 2K --work work/restyle
```

**(c) renovation-concept** — a fixer "after" that implies a not-yet-real condition.
Fill the `{WALL_MATERIAL}/{FLOOR_MATERIAL}/{FABRIC}` slots from the brief's finish list;
the **room envelope + camera MUST hold**:

```bash
scripts/gen-edit.sh \
  "update wall {WALL_MATERIAL}, floor {FLOOR_MATERIAL}, furniture upholstery {FABRIC}; \
layout and lighting unchanged; realistic PBR textures. \
<RENOVATION PRESERVE CLAUSE — see references/geometry-discipline.md>" \
  artifacts/<listing>/inputs/<room>.jpg \
  artifacts/<listing>/03-restyle/<room>-renovation-concept.jpg \
  --model fal-ai/nano-banana-pro --fallback fal-ai/qwen-image-edit \
  --aspect landscape_4_3 --max-cost 60 --resolution 2K --work work/restyle
```

`resolution=2K` is a POSITIONAL nano-banana-only param (there is no `--resolution`
*flag* to ai-gen; `gen-edit.sh` maps `--resolution 2K` to it for nano-banana only). On
success `gen-edit.sh` prints `<model>\t<out>`; if every model in the chain fails it
exits 1 — record `blocked` + FLAG, never substitute an out-of-chain model.

**One change per turn.** A second operation on the same room is a **new turn that
re-feeds the unaltered original**, never the previous render. Record the prompt, model
used, and cost (balance delta) in `restyle-log.md`.

## Step 2 — geometry-QC (blocking gate on every render)

Every render passes the blocking architecture-integrity gate before it ships — a keyless
vision compare of the edited image vs the unaltered original. Pass `--expected-change`
so the judge does NOT flag the intended edit as drift:

```bash
python3 scripts/geometry-qc.py \
  --candidate artifacts/<listing>/03-restyle/<room>-<mode>.jpg \
  --reference artifacts/<listing>/inputs/<room>.jpg \
  --out work/restyle/<room>-<mode>-qc.json \
  --expected-change "<see per-mode below>" \
  --threshold 0.80
```

Per-mode `--expected-change` (names the INTENDED edit so it is not mistaken for drift):

- **restyle** → `"decor/finishes/styling"`
- **finish-swap** → `"one named finish/material"` (name the element, e.g. `"shelves recolored to light oak"`)
- **renovation-concept** → `"renovation finishes (concept) — room envelope + camera must hold"`

Verdict JSON: `{verdict, confidence, dims:{walls,windows,ceiling,camera,footprint,
defect_honesty}, findings}`. Act on it:

- **pass** (exit 0) → ship. Record in `restyle-log.md`.
- **drift** (exit 4 — walls wandered, window invented, footprint changed, camera moved,
  or over-glamorized "after") → **regenerate ONCE** with a *reinforced* preserve clause
  (re-feed the unaltered original), re-QC, then **keep-best + FLAG** the residual drift
  in `restyle-log.md`. Never silently ship a drift.
- **review** (exit 3) / **could-not-judge** (exit 2) → ship **with a prominent FLAG**;
  the bot does not certify it.

**The defect-honesty rule (AB-723 "different, not better"):** if the edit would **erase
a structural defect** (a crack, water stain, sagging ceiling) or **remove a permanent
fixture** (a radiator, a load-bearing post, a window), **STOP and FLAG** — that is
"different, not better," the misrepresentation line. A restyle may change *decor and
finishes*; it may not make a real defect disappear. `geometry-qc.py` scores
`defect_honesty`; a low score is a blocking flag in `restyle-log.md`.

## Step 3 — disclosure (mandatory final step on EVERY altered render)

Route every altered render through the shared **`disclosure-stamp`** skill (installed at
runtime — read its `SKILL.md`). It is deterministic (Pillow), never publishes, and is
the one stamping skill every SL8 listing-visual bot reuses. Use the `--type` that
matches the operation:

- **restyle** and **finish-swap** → `--type restyle` (caption **"Digitally Altered"**).
- **renovation-concept** → `--type renovation-concept` (caption **"Conceptual Rendering -
  Not Actual Condition"** — MANDATORY, non-removable; this is the concept-vs-claim line).

```bash
python3 scripts/stamp.py \
  --media artifacts/<listing>/03-restyle/<room>-<mode>.jpg \
  --type <restyle|renovation-concept> \
  --out artifacts/<listing>/03-restyle/disclosed/<room>-<mode>-disclosed.jpg

python3 scripts/pair.py \
  --altered artifacts/<listing>/03-restyle/disclosed/<room>-<mode>-disclosed.jpg \
  --original artifacts/<listing>/inputs/<room>.jpg \
  --out artifacts/<listing>/03-restyle/disclosed/<room>-<mode>-pair.jpg
```

Then write `artifacts/<listing>/03-restyle/disclosed/disclosure-assets.md` (the MLS
remark + the AB-723 disclosure line + pairing order), per disclosure-stamp's reference.
The unaltered original is the anchor: it is kept and re-attached for the pair, and the
AB-723 line carries a slot for the agent to host it at a public, login-free URL.

**The concept-vs-claim line (load-bearing).** Restyle + finish-swap lean **"better, not
different"** (lower risk — a real room made to look better). **Renovation "after" is
inherently "DIFFERENT, not better"** — it implies a condition that does NOT exist yet,
the single highest AB-723/MLS misrepresentation exposure of any image use case. So
renovation-concept (and any finish-change concept) **MUST** carry the verbatim,
non-removable stamp **"Conceptual rendering - not the actual current condition."** And
because the AB-723 disclosure defaults **ON** for any listing-destined render, every
render that could touch a **live listing** additionally carries the AB-723 disclosure +
a reachable link to the unaltered original. Secondary risk: an **over-glamorized "after"**
sets expectations the property can't meet (buyer backlash) **even when disclosed** —
geometry-QC flags over-glamorization; keep the render realistic.

## Outputs

This skill writes exactly these paths (`<listing>` = the active listing slug, `<room>` =
the room name, `<mode>` = restyle|finish-swap|renovation-concept) — declared here and in
the frontmatter so paths are never guessed:

- `artifacts/<listing>/03-restyle/<room>-<mode>.jpg` — the geometry-preserved,
  QC-passed render (or kept-best + FLAG).
- `artifacts/<listing>/03-restyle/restyle-log.md` — per-render record: mode, the named
  change, verbatim prompt + preserve clause, geometry-QC verdict + findings,
  defect-honesty check, cost (balance delta), disclosure `--type`.
- `artifacts/<listing>/03-restyle/disclosed/<room>-<mode>-disclosed.jpg` +
  `<room>-<mode>-pair.jpg` + `disclosure-assets.md` — the disclosure-stamp output set
  (the mandatory final step).

Plus working files under `work/restyle/` (info JSON, raw generations, balance snapshots,
QC verdict JSON) — never under `artifacts/`.

## Update state.md (the ledger is how phases chain)

After the phase completes (or fails), update the project's `state.md` `restyle` row:
mark `done` (or `blocked` with the reason), refresh `updated` and `status`, and rewrite
`next_action` to the one imperative that is true now (e.g. "Restyle render QC-passed +
disclosed — proceed to next phase" or "Re-run onboarding: source room photo missing").
Then do the Remember step per the bot's execution loop. Never stop with a stale ledger.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| `inputs/<room>.*` missing/unreadable | Record failure in `state.md`, stop. No invented room — a fabricated original has no QC/disclosure anchor. |
| `brief` missing (no style/finish/renovation list) | Record `blocked` (`restyle brief missing`), stop. Do not guess a style. |
| All models in the gen-edit.sh chain fail | Record `blocked` + FLAG; never substitute an out-of-chain model. |
| geometry-QC = drift | Regenerate ONCE with a reinforced preserve clause (re-feed original), re-QC, keep-best + FLAG. Never silently ship a drift. |
| geometry-QC = review / could-not-judge | Ship + prominent FLAG; the bot does not certify it. |
| Edit would erase a structural defect / remove a permanent fixture | STOP + FLAG (AB-723 "different, not better"). A restyle changes decor, not real defects. |
| Asked to REMOVE an element (declutter/object removal) | Wrong skill — route to `bot-020-fix-photo` (Qwen). Nano Banana Pro is weak at removal. |
| Over-glamorized "after" (buyer-backlash risk) | geometry-QC flags it; keep the render realistic, never aspirational beyond the brief. |
| renovation-concept missing the conceptual stamp | Blocking — never ship a renovation render without `--type renovation-concept` ("Conceptual Rendering - Not Actual Condition"). |
| Render destined for a live listing | AB-723 disclosure defaults ON — stamp + pair + reachable-original link, always. |
| fal output URL expired | `gen-edit.sh` already downloads `files[0].local_path`; never re-fetch the `*.fal.media` URL. |

## References

- `references/geometry-discipline.md` — the geometry-preserve discipline: the verbatim
  per-mode preserve clauses, the no-geometry-lock fact, single-change-per-turn +
  re-feed-the-original, the ai-gen syntax contract (`--image` → `image_url`, positional
  `resolution=2K`, `files[0].local_path`, ignore `credits_used`), and the geometry-QC
  rubric. Read this for the *how* of structure preservation.
- `references/restyle-prompts.md` — the verbatim per-operation prompts (restyle,
  finish-swap, renovation "after" template) and the one-change-per-turn production rule
  (never send the multi-style line in production). Read this for the *what* of each edit.
