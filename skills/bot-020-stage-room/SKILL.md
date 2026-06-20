---
name: bot-020-stage-room
description: Virtually stage an EMPTY or SPARSE real-estate listing room photo in a chosen style (modern, mid-century, Scandinavian, farmhouse, contemporary-neutral) WITHOUT moving a wall, inventing a window, or changing the camera. Room structure (walls/windows/doors/ceiling/floor + camera) is held by a verbatim geometry-preserve clause (reachable fal edit models have NO hard geometry lock — preservation is prompt-only), every staged image passes a BLOCKING geometry-QC vision compare against the unaltered original, and the result is routed through the shared disclosure-stamp skill ("Virtually Staged" caption + preserved original + MLS pairing). Uses fal-ai/nano-banana-pro (--image), fal-ai/qwen-image-edit fallback. Use for the 'stage' phase, or whenever asked to "virtually stage this room", "furnish this empty room", "stage this living room in a modern style", or "put furniture in this listing photo".
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-020
  references-skills: [disclosure-stamp]
  inputs:
    - { name: room-photo, type: image, required: true, description: "artifacts/<listing>/inputs/<room>.<jpg|png> — the empty or sparse room photo to stage. This is the geometry ground-truth every staged output is QC'd against and the original re-attached for disclosure pairing. If the room is CLUTTERED (not empty/sparse), declutter to an empty plate FIRST via bot-020-fix-photo (Qwen), then stage." }
    - { name: style, type: text, required: false, description: "The interior style words (e.g. modern transitional, mid-century, Scandinavian, farmhouse). Parameterizes the staging prompt. Default 'contemporary neutral broad-appeal' — the safest broad-buyer-appeal style." }
    - { name: room-type, type: text, required: false, description: "Living room / bedroom / dining room / kitchen — drives the furniture set. Default — inferred from the photo and recorded as an assumption." }
    - { name: style-reference, type: image, required: false, description: "artifacts/<listing>/inputs/<style-ref>.<jpg|png> — an optional furniture/style reference image to anchor the palette and materials. Nano Banana Pro accepts multiple reference images, but the multi-ref forwarding syntax is UNVERIFIED: smoke-test it, else fall back to the text-only style prompt. Default — none (text-only style)." }
  outputs:
    - { name: staged-image, type: image, path: artifacts/<listing>/01-staged/<room>-staged.jpg, description: "The staged room — furniture and decor added in the chosen style, room geometry (walls/windows/doors/ceiling/floor footprint + camera) preserved exactly. Requested aspect honored; resolution >= source." }
    - { name: geometry-qc, type: markdown, path: artifacts/<listing>/01-staged/geometry-qc.md, description: "The blocking vision compare of the staged image vs the unaltered original — per-axis verdict (walls/windows/ceiling/camera/footprint/defect_honesty), confidence, and the honest flags. Any structural drift => FAIL + flag; never silently shipped." }
    - { name: disclosed-set, type: image, path: artifacts/<listing>/01-staged/disclosed/, description: "The disclosure set from disclosure-stamp: <room>-staged-disclosed.jpg (conspicuous 'Virtually Staged' caption), <room>-staged-pair.jpg (original<->staged side-by-side), and disclosure-assets.md (MLS remark + AB-723 line). The staged image NEVER exits as a bare altered file." }
---

# Stage Room — virtual staging, geometry preserved (BOT-020 · stage)

Virtually stage an **empty or sparse** listing room photo in a chosen interior style —
add a believable, restrained, photoreal set of furniture and decor — while holding the
room's **architecture unchanged**: same walls, windows, doors, ceiling, floor footprint,
and camera view. This is the flagship of the listing-photo bot (JTBD-1): the staged image
sells the *space* without misrepresenting the *property*. Every other phase (fix, restyle)
shares the same geometry discipline this skill establishes.

This skill runs **headless**. Never ask the user anything: every optional input has a
default below; a missing required input (the room photo) is a **clean recorded failure,
not a question**.

## The architecture (read this first — it is load-bearing)

The Phase-0 reachability PoC and the sibling BOT-022 build proved the single fact that
shapes this whole skill: **reachable fal edit models have NO hard geometry lock.**
Structure preservation is **prompt-driven only** — a naive "stage this room" prompt
frequently shifts a window, re-proportions a wall, swaps the floor, or invents a
feature the home lacks, turning a marketing edit into an AB-723 *misrepresentation*.
There is no flag that locks geometry. So this skill holds the architecture two ways:

- **Prompt discipline** — every staging prompt carries the verbatim **geometry-preserve
  clause** (`references/geometry-discipline.md`): keep walls/windows/doors/ceiling/floor
  and the camera view exactly as the source, add furniture *only*, invent no structure.
  One change per turn; the **original is re-fed** as the conditioning reference on every
  attempt (never a previous staged output — drift compounds).
- **A blocking geometry-QC** — every staged image is vision-compared against the
  **unaltered original** by `scripts/geometry-qc.py` before it can ship. `pass` ships;
  `drift` regenerates once with a reinforced clause then keeps-best + FLAGs; `review`
  ships + FLAGs. A `drift` is **never silently shipped**.

**Model routing.** Staging is generative (you cannot photograph furniture that is not
there), so it uses **`fal-ai/nano-banana-pro`** via `scripts/gen-edit.sh` (the proven
`--image` base-edit path). The **`--fallback fal-ai/qwen-image-edit`** is a *conservative
pass* in the same chain — if Nano Banana Pro 404s/fails, the script walks to Qwen and
records which model produced the asset. Never substitute an out-of-chain model.

## When to use

The `stage` row of the project's `state.md` (phase 1 of the listing chain, after
onboarding). Also invoked directly when asked to "virtually stage this room", "furnish
this empty room", "stage this living room in a modern style", "put furniture in this
listing photo", or "make this empty space look lived-in".

This skill **only stages.** If the room is cluttered (not empty/sparse), the bot
declutters it to an empty plate FIRST via **bot-020-fix-photo** (Qwen — Nano Banana Pro
is weak at removal), then stages the clean plate here.

## Read first (READ-BEFORE-WRITE)

Read, in this order:

1. `artifacts/<listing>/context.md` — listing truth (room type, style, target portal,
   which rooms). Optional; defaults below if absent.
2. `artifacts/<listing>/inputs/<room>.<jpg|png>` — the **required** room photo. This is
   the geometry ground-truth and the disclosure anchor. Confirm it exists and is a
   readable image.

**Required-input gate (record, don't ask):**

- No `inputs/<room>.*` on disk → write a failure note in `state.md` (`status: blocked`,
  `next_action: re-run onboarding — inputs/<room> missing`) and stop. Do **not** invent
  or generate a room from text alone.
- The photo is unreadable / not an image → same clean failure. Do not proceed.
- The room is clearly **cluttered** (not empty/sparse) → record that this needs
  `bot-020-fix-photo` declutter first; stage the empty plate it produces, or FLAG and
  stage the hero angle with a note that occupants/clutter may bleed through.

**Defaults for optional inputs:** style → `contemporary neutral broad-appeal` (safest
broad-buyer-appeal); room-type → inferred from the photo and recorded as an assumption;
style-reference → none (text-only style); aspect → match the source aspect; resolution →
`2K` (Nano Banana Pro only). Multi-angle: stage **ONE hero angle** — there is no
cross-image memory of the added furniture, so a second angle would furnish the room
differently. If multiple angles are requested, stage the hero and FLAG the rest.

## Step 0 — Reachability check (attempt, don't gate the engine)

Confirm the slug this skill needs is reachable. This is a *reachability check*, not a
switch that changes the pipeline:

```bash
ai-gen info fal-ai/nano-banana-pro   > work/stage/nbp-info.json    2>&1 || true
ai-gen info fal-ai/qwen-image-edit   > work/stage/qwen-info.json   2>&1 || true
ai-gen balance                       > work/stage/balance-before.txt
```

- Nano Banana Pro is the staging engine; Qwen-Image-Edit is the conservative fallback.
  If `ai-gen info` errors, **attempt the run anyway** (the proxy has served models `info`
  could not describe) and let `gen-edit.sh` record the failure honestly.
- Record the starting balance — cost is read from `ai-gen estimate` + `ai-gen balance`
  deltas, **never** the `credits_used` JSON field (it over-reports ~8.4×). See
  `references/geometry-discipline.md`.

## Step 1 — Stage the room (one change per turn, re-feed the original)

Stage the **hero angle** off the unaltered original. The prompt = the staging body
(style-parameterized) **plus the verbatim geometry-preserve clause**
(`references/stage-room-prompts.md` + `references/geometry-discipline.md`):

```bash
scripts/gen-edit.sh \
  "Stage this empty <room-type> photo. Preserve the room geometry, walls, windows, floors, and ceiling exactly as in the source image. Add a <STYLE> furniture set <see references/stage-room-prompts.md for the full default 'modern' body>. Style: <STYLE>. Lighting: warm natural daylight from the existing window, soft shadows, no harsh contrast. Photorealistic real estate listing photography. Keep the room structure (walls/windows), only redecorate it with color, material, style and furniture, and use the same camera view. Keep the same windows, same floor, same wall color, same camera angle — add furniture only. Do not change cabinets, countertops, or appliances. Preserve room geometry, walls, windows, floors, and ceiling exactly as in the source; do not invent or move structure (no added windows/doors)." \
  artifacts/<listing>/inputs/<room>.jpg \
  artifacts/<listing>/01-staged/<room>-staged.jpg \
  --model fal-ai/nano-banana-pro \
  --fallback fal-ai/qwen-image-edit \
  --aspect landscape_4_3 \
  --max-cost 60 \
  --resolution 2K \
  --work work/stage
```

Discipline (depth in `references/geometry-discipline.md`):

- **Re-feed the ORIGINAL each turn.** `--image` maps to the model's SINGULAR `image_url`
  (NOT `image_urls[]`). The conditioning image is always the unaltered original — never a
  previous staged output (re-anchoring off an edit compounds drift).
- **One change per turn.** Stage the furniture set in a single edit; do not chain
  "now add a rug, now change the lamp" — each chained edit re-rolls the whole image and
  drifts geometry. Re-state the full furniture set in one prompt instead.
- **Bias to restrained, photoreal staging.** Over-furnished rooms read fake and trigger
  buyer backlash. Prefer a believable, broad-appeal set scaled to the room.
- **Style-reference variant** (only if a `style-reference` image was supplied): use the
  style-anchored prompt in `references/stage-room-prompts.md`. Nano Banana Pro's multi-ref
  forwarding is **UNVERIFIED** — smoke-test it; if it errors, **fall back to the text-only
  style prompt** and record the fallback in `geometry-qc.md`.
- `gen-edit.sh` prints `<model>\t<out>` on success; on failure (all chain models 404/err)
  it exits 1 — record `blocked` + FLAG, do **not** substitute an out-of-chain model.
- `resolution=2K` is POSITIONAL and **nano-banana-only** (the script omits it for the Qwen
  fallback); `files[0].local_path` is downloaded because fal URLs expire.

## Step 2 — geometry-QC (blocking gate on every staged image)

Before the staged image can ship, vision-compare it against the **unaltered original**.
The `--expected-change` string names the INTENDED edit so the judge does not flag the
*furniture itself* as drift:

```bash
python3 scripts/geometry-qc.py \
  --candidate artifacts/<listing>/01-staged/<room>-staged.jpg \
  --reference artifacts/<listing>/inputs/<room>.jpg \
  --out artifacts/<listing>/01-staged/geometry-qc.md \
  --expected-change "added furniture and decor / virtual staging" \
  --threshold 0.80
```

Interpret the verdict (exit 0 pass / 3 review / 4 drift / 2 could-not-judge):

- **pass** — walls/windows/ceiling/camera/footprint all held, only furniture changed →
  **ship**.
- **drift** (exit 4) — a wall moved, a window was added/moved, the camera/footprint
  shifted → **regenerate ONCE** (re-run Step 1 with the geometry-preserve clause
  *reinforced* — append the clause a second time / add "do not move or re-proportion any
  wall, window or door; identical camera"), then **keep-best + FLAG** the residual drift
  in `geometry-qc.md`. **NEVER silently ship a drift.**
- **review** (exit 3) — the judge is uncertain (reflective glass, complex window mullions,
  ambiguous depth) → **ship + FLAG** for a human eye in `geometry-qc.md`.
- **could-not-judge** (exit 2) — record it and ship the best result with a prominent FLAG;
  do not certify it.

**The defect-honesty rule (AB-723 "better, not different").** Virtual staging may make the
space look *better* — it may **NOT** make it *different*. If the edit would **erase a
structural defect** (a crack, water stain, sagging ceiling, missing flooring) or **remove a
permanent fixture** (a radiator, built-in, support column, electrical panel), that is a
material misrepresentation — **STOP and FLAG** in `geometry-qc.md`, do not ship the
"cleaned" version. Staging adds furniture; it does not hide the property's real condition.
`geometry-qc.py`'s `defect_honesty` dim surfaces this — treat a defect-honesty failure as a
hard FLAG.

## Step 3 — disclosure (mandatory on the staged image)

Virtual staging is a **MATERIAL ALTERATION** → AB-723 disclosure is **REQUIRED**. Route the
QC'd staged image through the shared **disclosure-stamp** skill (read its `SKILL.md`; it is
deterministic Pillow and never publishes). The staged image must NEVER exit as a bare
altered file. Use `--type virtual-staging` (→ the "Virtually Staged" caption):

```bash
python3 scripts/stamp.py \
  --media artifacts/<listing>/01-staged/<room>-staged.jpg \
  --type virtual-staging \
  --out artifacts/<listing>/01-staged/disclosed/<room>-staged-disclosed.jpg

python3 scripts/pair.py \
  --altered artifacts/<listing>/01-staged/disclosed/<room>-staged-disclosed.jpg \
  --original artifacts/<listing>/inputs/<room>.jpg \
  --out artifacts/<listing>/01-staged/disclosed/<room>-staged-pair.jpg
```

Then write `artifacts/<listing>/01-staged/disclosed/disclosure-assets.md` (the conspicuous
caption + the ready-to-paste MLS remark + the AB-723 disclosure line, per disclosure-stamp's
templates). AB-723 also requires a **reachable, login-free original** placed **adjacent** to
the altered version — surface that in `disclosure-assets.md` (the `ACTION REQUIRED` note if no
hosting URL was supplied). The unaltered original is the anchor: it is kept, re-attached for
the QC + the pairing, and never fabricated.

## Outputs

This skill writes exactly these paths (`<listing>` = the active listing slug, `<room>` = the
room slug) — declared here and in the frontmatter so paths are never guessed:

- `artifacts/<listing>/01-staged/<room>-staged.jpg` — the staged room, geometry preserved.
- `artifacts/<listing>/01-staged/geometry-qc.md` — the blocking geometry-QC verdict
  (per-axis, confidence, flags; the model that produced the asset; any drift/review FLAG).
- `artifacts/<listing>/01-staged/disclosed/<room>-staged-disclosed.jpg` — the "Virtually
  Staged"-captioned image (from disclosure-stamp).
- `artifacts/<listing>/01-staged/disclosed/<room>-staged-pair.jpg` — the original↔staged
  side-by-side (from disclosure-stamp).
- `artifacts/<listing>/01-staged/disclosed/disclosure-assets.md` — MLS remark + AB-723 line
  + pairing order (from disclosure-stamp).

Plus working files under `work/stage/` (raw generations, info JSON, balance snapshots,
smoke-test output) — never under `artifacts/`.

## Update state.md (the ledger is how phases chain)

After the phase completes (or fails), update the project's `state.md` row for `stage`: mark
`done` (or `blocked` with the reason), refresh `updated` and `status`, and rewrite
`next_action` to the one imperative that is true now (e.g. "Living room staged
(geometry-QC pass) + disclosed — run phase 2 fix-photo" or "Re-run onboarding: inputs/<room>
missing"). Then do the Remember step per the bot's execution loop. Never stop with a stale
ledger, and never leave a staged image without its disclosure set.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| `inputs/<room>.*` missing/unreadable | Record failure in `state.md` (`blocked`), stop. No invented room from text. |
| Room is cluttered, not empty/sparse | Declutter to an empty plate via bot-020-fix-photo (Qwen) FIRST, then stage; or stage hero + FLAG that clutter may bleed through. |
| Nano Banana Pro 404s / fails | `gen-edit.sh` walks to the `--fallback` Qwen-Image-Edit (conservative pass); record which model produced the asset. All chain models fail → `blocked` + FLAG, never an out-of-chain model. |
| geometry-QC = drift (exit 4) | Regenerate ONCE with the reinforced preserve clause → keep-best + FLAG residual drift. NEVER silently ship a drift. |
| geometry-QC = review (exit 3) | Ship + FLAG for human review in `geometry-qc.md`. |
| geometry-QC = could-not-judge (exit 2) | Ship best result + prominent FLAG; do not certify. |
| Edit would erase a structural defect / remove a permanent fixture | STOP + FLAG (AB-723 "better not different" — defect-honesty). Do not ship the "cleaned" version. |
| Over-furnished / fake-looking result | Re-run with a restrained, broad-appeal furniture set scaled to the room. |
| Style-reference multi-ref forwarding errors | Fall back to the text-only style prompt; record the fallback in `geometry-qc.md`. |
| Multiple angles requested | Stage ONE hero angle (no cross-image furniture memory); FLAG that other angles would furnish differently. |
| fal output URL expired | `gen-edit.sh` downloads `files[0].local_path`; never re-fetch the `*.fal.media` URL. |
| Disclosure step skipped/failed | The staged image must NEVER ship bare — re-run disclosure-stamp; if it fails, record `blocked` + FLAG (an undisclosed altered image is an AB-723 misdemeanor). |

## References

- `references/geometry-discipline.md` — the geometry-preserve discipline: the verbatim
  preserve clause (prepend/append to every staging prompt), the no-geometry-lock fact,
  single-change-per-turn + re-feed-the-original, the ai-gen syntax contract (`--image` →
  `image_url`, positional `resolution=2K`, `files[0].local_path`, ignore `credits_used`), the
  AB-723 "better not different" / defect-honesty rule, and the geometry-QC rubric. Read this
  for the *how* of preservation.
- `references/stage-room-prompts.md` — the verbatim per-operation staging prompts: the default
  `modern` body (parameterize the style words), the style-anchored multi-ref variant, and the
  geometry-preserve clause. Read this for the *what* of the prompt.
