---
name: bot-020-fix-photo
description: Fix a real-estate listing photo WITHOUT altering the architecture — declutter / object-removal (remove furniture, cars, bins, clutter), day-to-dusk twilight, sky replacement, and exposure/HDR enhancement — one operation per turn, the original re-fed each turn so walls/windows/doors/ceiling/camera are provably unchanged. Removals route to fal-ai/qwen-image-edit (Nano Banana Pro is weak at removal); twilight/sky/enhance route to fal-ai/nano-banana-pro. Every edit passes a BLOCKING geometry-QC vs the unaltered original, a defect-honesty front-stop (NEVER erase a structural defect or permanent fixture — AB-723 "different, not better"), and a mandatory AB-723 disclosure stamp. Use for the 'fix' phase, or whenever asked to "remove the clutter/cars/bins", "make this dusk/twilight", "swap the sky", or "brighten / enhance this listing photo".
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-020
  references-skills: [disclosure-stamp]
  inputs:
    - { name: source-photo, type: image, required: true, description: "artifacts/<listing>/inputs/<photo>.<jpg|png> — the unaltered listing photo to fix (interior or exterior). This is the geometry ground-truth re-fed every turn and re-attached for the geometry-QC compare and the AB-723 disclosure pairing. Missing/unreadable → clean recorded failure, never an invented room." }
    - { name: operation, type: text, required: true, description: "ONE of declutter | twilight | sky | enhance. Exactly one operation per turn (single-change-per-turn SOP). Missing/unrecognized → clean recorded failure, do not guess." }
    - { name: removal-target, type: text, required: false, description: "REQUIRED when operation=declutter — what to remove in plain words (e.g. 'the cars on the driveway and the rubbish bins', 'all the furniture'). MUST name movable clutter only; if it names a structural defect or permanent fixture the defect-honesty rule STOPS the erase. For non-declutter operations this is ignored. Default — none (declutter with no target is a clean recorded failure)." }
    - { name: preserve-note, type: text, required: false, description: "Optional extra geometry/feature to call out explicitly in the preserve clause (e.g. 'keep the bay window and the fireplace exactly'). Default — the standard preserve clause from references/geometry-discipline.md only." }
  outputs:
    - { name: fixed-image, type: image, path: artifacts/<listing>/02-fixed/<op>-<name>.jpg, description: "The fixed photo — same property/architecture as the original, only the intended change applied. Generated single-source off the unaltered original (declutter→qwen-image-edit; twilight/sky/enhance→nano-banana-pro), geometry-QC passed (or kept-best+FLAG), defect-honesty clean." }
    - { name: fix-log, type: markdown, path: artifacts/<listing>/02-fixed/fix-log.md, description: "Per-operation log: model used, prompt, the geometry-QC verdict (pass/drift/review) + per-dim scores, the defect-honesty decision, cost (balance delta), and any FLAG. The honesty record — drift is never silently shipped." }
    - { name: disclosed-set, type: image, path: artifacts/<listing>/02-fixed/disclosed/<name>-disclosed.jpg, description: "The AB-723 disclosure set from disclosure-stamp — the conspicuously-captioned image, the original↔fixed pair (<name>-pair.jpg), and disclosure-assets.md (MLS remark + AB-723 line). Every fix exits as a disclosed set, never a bare altered file." }
---

# Fix Photo — architecture-locked listing-photo fixes (BOT-020 · phase fix)

Fix one real-estate listing photo — **declutter / object-removal, day-to-dusk
twilight, sky replacement, or exposure/HDR enhancement** — so it looks *better, not
different*. The room's architecture is the contract: same walls, windows, doors,
ceiling, floor, built-in fixtures, and the exact camera angle. The model only changes
the one thing the operation asks for; everything structural is held by the
preserve clause and proven by a blocking geometry-QC against the unaltered original.

This skill runs **headless**. Never ask the user anything: every optional input has a
default below; a missing required input (the source photo, the operation, or — for a
declutter — the removal target) is a **clean recorded failure, not a question**.

## The architecture (read this first — it is load-bearing)

The bot's PoC and the sibling BOT-022 build proved the fact that shapes this whole
skill: **the reachable fal edit models have NO hard geometry lock.** Structure/feature
preservation is **prompt-only** — a generative edit is free to shift a window,
re-proportion a wall, smear where an object was removed, or invent a feature the home
lacks. There is no model flag that locks geometry. So preservation is enforced two
ways, in order:

1. **The geometry-preserve clause** is prepended to every prompt, and the **unaltered
   original is re-fed as the single source** on every turn (never an earlier edit —
   drift compounds). One operation per turn.
2. **A blocking geometry-QC** (`scripts/geometry-qc.py`, a keyless `claude -p` vision
   compare of the edited image vs the unaltered original) is the backstop. drift →
   regenerate once with a reinforced clause → keep-best + FLAG. **NEVER silently ship
   a drift.**

**Model routing (operation-routed — locked set):**

| operation | model | why |
|---|---|---|
| `declutter` / object-removal | `fal-ai/qwen-image-edit` | Nano Banana Pro is **WEAK at removal** — it smears/hallucinates where objects were. Qwen-Image-Edit is the removal engine. |
| `twilight` (day-to-dusk) | `fal-ai/nano-banana-pro` | Best at day/night-pair relighting; strongest structure preservation in edit comparisons. |
| `sky` (sky replacement) | `fal-ai/nano-banana-pro` | Same — lighting/sky swaps preserve geometry better than content removal. |
| `enhance` (exposure/WB/HDR-tone) | `fal-ai/nano-banana-pro` | Pure color/exposure/tone, content identical. |

`scripts/gen-edit.sh` runs one single-source ai-gen base-edit and picks the right
model via its `--model`/`--fallback` flags; the syntax contract (`--image` →
SINGULAR `image_url`, `files[0].local_path`, positional `resolution=2K` for
nano-banana only, cost via `ai-gen balance` deltas) lives in
`references/geometry-discipline.md`.

## When to use

The `fix` row of the listing's `state.md`. Also invoked directly when asked to
"remove the clutter / cars / bins / furniture", "make this dusk / twilight", "replace
the sky / swap the dull sky for a sunset", or "brighten / HDR / enhance this listing
photo" — anything that changes what is *in* a photo or its *lighting*, not the
architecture (staging an empty room is `bot-020-stage-room`; restyle/renovation is
`bot-020-restyle-room`).

## Read first (READ-BEFORE-WRITE)

Read, in this order:

1. `artifacts/<listing>/context.md` — listing truth (address slug, which photos,
   which fixes requested, any keep-features). Optional; defaults below if absent.
2. `artifacts/<listing>/inputs/<photo>.<jpg|png>` — the **required** source photo.
   This is the geometry ground-truth. Confirm it exists and is a readable image.

**Required-input gate (record, don't ask):**

- No `inputs/<photo>` on disk → write a failure note in `state.md`
  (`status: blocked`, `next_action: re-run onboarding — inputs/<photo> missing`) and
  stop. Do **not** invent or generate a property from text alone.
- The photo is unreadable / not an image → same clean failure.
- `operation` missing or not one of `declutter|twilight|sky|enhance` → clean recorded
  failure (`next_action: specify operation`). Do not guess the operation.
- `operation=declutter` with no `removal-target` → clean recorded failure
  (`next_action: declutter needs a removal-target`). Never erase by guessing.

**Defaults for optional inputs:** `removal-target` — none (declutter without one is a
recorded failure, above); `preserve-note` — the standard preserve clause only; aspect
— inherit the source photo's aspect (exteriors are usually `source aspect (omit --aspect to preserve it; valid: 16:9|9:16|1:1)`); output
name — derived from the source filename.

## Step 0 — Reachability check (attempt, don't gate the engine)

Confirm the two slugs this skill needs are reachable. This is a *reachability check*,
not a switch that changes the pipeline:

```bash
ai-gen info fal-ai/qwen-image-edit   > work/fix/qwen-info.json    2>&1 || true
ai-gen info fal-ai/nano-banana-pro   > work/fix/nbp-info.json     2>&1 || true
ai-gen balance                       > work/fix/balance-before.txt
```

- Qwen-Image-Edit is the removal engine; nano-banana-pro is the twilight/sky/enhance
  engine. If `ai-gen info` errors, **attempt the run anyway** (the proxy has served
  models `info` could not describe) and let `gen-edit.sh` record the failure honestly.
  If every model in the chain fails, the edit is `blocked` + FLAG — never substitute
  an out-of-chain model (see `references/geometry-discipline.md`).
- Record the starting balance — cost is read from `ai-gen balance` deltas, **never**
  the `credits_used` JSON field (it over-reports ~8.4×).

## Step 1 — The edit (ONE operation per turn, re-feed the original)

Run exactly **one** operation against the **unaltered original** (never a prior edit).
Pick the verbatim prompt for the operation from `references/fix-prompts.md` and append
the matching geometry-preserve clause from `references/geometry-discipline.md`
(interior/exterior preserve clause for declutter; the twilight/sky clause for
those; the enhance clause for enhance; plus the `preserve-note` if supplied).

**(a) declutter / object-removal → `fal-ai/qwen-image-edit`** (Nano Banana Pro is weak
at removal — removals route to Qwen):

```bash
scripts/gen-edit.sh \
  "remove the cars on the driveway, and the rubbish bins next to the house, improve the overall photo quality — keeping the architectural integrity of the room — preserve all walls, windows, doors, ceiling, floor, built-in fixtures, the camera angle/framing and the room's proportions exactly; do not invent, move, resize, add or delete any structural element." \
  artifacts/<listing>/inputs/<photo>.jpg \
  artifacts/<listing>/02-fixed/declutter-<name>.jpg \
  --model fal-ai/qwen-image-edit  --max-cost 60 --work work/fix
```

(For an interior declutter use the interior removal prompt + interior preserve clause
from the references; for an exterior use the exterior pair, as shown above.)

**(b) twilight / day-to-dusk → `fal-ai/nano-banana-pro`:**

```bash
scripts/gen-edit.sh \
  "Convert this daytime photo to a beautiful dusk/twilight scene. dramatic sunset sky, turn on all interior and exterior lights — Keep the building, architecture, rooflines, windows, doors, landscaping and the exact camera angle/framing unchanged — only change the time of day / sky. Preserve accurate reflections and proportions." \
  artifacts/<listing>/inputs/<photo>.jpg \
  artifacts/<listing>/02-fixed/twilight-<name>.jpg \
  --model fal-ai/nano-banana-pro  --resolution 2K --max-cost 60 --work work/fix
```

**(c) sky replacement → `fal-ai/nano-banana-pro`:**

```bash
scripts/gen-edit.sh \
  "replace the sky with a sunset — Keep the building, architecture, rooflines, windows, doors, landscaping and the exact camera angle/framing unchanged — only change the time of day / sky. Preserve accurate reflections and proportions." \
  artifacts/<listing>/inputs/<photo>.jpg \
  artifacts/<listing>/02-fixed/sky-<name>.jpg \
  --model fal-ai/nano-banana-pro  --resolution 2K --max-cost 60 --work work/fix
```

**(d) enhancement (exposure / white-balance / HDR-tone, content identical) →
`fal-ai/nano-banana-pro`:**

```bash
scripts/gen-edit.sh \
  "improve the overall photo quality — lift exposure and apply an HDR-style enhancement (balanced highlights/shadows, accurate white balance, natural color), without changing any content of the scene — pure color/exposure/tone edit only; content must be identical." \
  artifacts/<listing>/inputs/<photo>.jpg \
  artifacts/<listing>/02-fixed/enhance-<name>.jpg \
  --model fal-ai/nano-banana-pro  --resolution 2K --max-cost 60 --work work/fix
```

`gen-edit.sh` prints `<model>\t<out>` on success (record the model in `fix-log.md`);
on a full-chain failure it exits 1 → record `blocked` + FLAG, never substitute an
out-of-chain model. It downloads `files[0].local_path` (fal URLs expire). For multiple
fixes (e.g. "declutter + twilight"), run them as **separate turns**, each off the
unaltered original — never chain one edit into the next.

## Step 2 — defect-honesty (FRONT-STOP, before the QC)

Before (and as part of) every declutter/removal, apply the **defect-honesty rule** —
this is the soul of "better, not different":

- A removal must **NEVER** erase a **STRUCTURAL DEFECT** (crack, water stain, mold,
  sag, damage, settling) or remove a **PERMANENT FIXTURE** (radiator, vent, outlet,
  built-in cabinet, HVAC unit). Those are part of what the property *is*.
- If the `removal-target` (or anything the edit would visibly erase) is a defect or a
  permanent fixture — **not movable clutter** — **STOP the erase and FLAG it** in
  `fix-log.md` (`defect-honesty: BLOCKED — '<target>' is a structural defect/permanent
  fixture; erasing it is AB-723 'different, not better' misrepresentation`). Do not
  ship the erase. Erasing it is a **misdemeanor + DRE discipline + civil liability**.
- Movable clutter (cars, bins, furniture, personal items, debris) is fine to remove.

The geometry-QC `defect_honesty` dim (Step 3) is the **backstop**; this front-stop is
the first line. When in doubt whether the target is clutter vs a fixture/defect, treat
it as a fixture and FLAG — under-removing is honest, over-removing is misrepresentation.

## Step 3 — geometry-QC (blocking gate on every edit)

Every edit passes a blocking architecture-integrity compare against the **unaltered
original**:

```bash
python3 scripts/geometry-qc.py \
  --candidate artifacts/<listing>/02-fixed/<op>-<name>.jpg \
  --reference artifacts/<listing>/inputs/<photo>.jpg \
  --out artifacts/<listing>/02-fixed/<op>-<name>.qc.json \
  --expected-change "<the intended change for this op>" \
  --threshold 0.80
```

Use the `--expected-change` that names the INTENDED edit so the judge does not flag it
as drift:

| operation | `--expected-change` |
|---|---|
| `declutter` | `"removed clutter/objects"` |
| `twilight` | `"day-to-dusk lighting / time of day"` |
| `sky` | `"sky replaced"` |
| `enhance` | `"exposure/color/tone only, no content change"` |

Verdict JSON: `{"verdict":"pass|drift|review","confidence":N,"dims":{walls,windows,
ceiling,camera,footprint,defect_honesty},"findings":"..."}`. Exit 0 pass / 3 review /
4 drift / 2 could-not-judge. Act on it:

- **pass** → ship (record the verdict + per-dim scores in `fix-log.md`).
- **drift** (exit 4) → **regenerate ONCE** off the unaltered original with a
  **reinforced preserve clause** (repeat the clause, add the specific drifted axis from
  `findings`, e.g. "do NOT move or resize the window"); re-run geometry-QC. Then
  **keep-best + FLAG** — ship the better of the two with a prominent FLAG in
  `fix-log.md`. **NEVER silently ship a drift.**
- **review** (exit 3) → ship **with a prominent FLAG** (the judge could not certify;
  the bot does not certify it either).
- **could-not-judge** (exit 2) → treat as `review` + FLAG.

**The defect-honesty dim is a hard backstop:** if `dims.defect_honesty` is low — i.e.
the edit appears to have erased a structural defect or removed a permanent fixture —
**STOP and FLAG**, regardless of the overall verdict. That is the AB-723 "different,
not better" line; it is never overridden by a high geometry score.

## Step 4 — disclosure (mandatory final step on EVERY altered image)

Every fix is a **material alteration** of the real property (lighting/content edits) →
AB-723 disclosure is **REQUIRED**. Route the fixed image through the shared
**`disclosure-stamp`** skill (read its `SKILL.md`; it is deterministic Pillow and
never publishes). These are real-property edits → disclose-**as-altered**, NOT a
conceptual label:

```bash
python3 scripts/stamp.py \
  --media artifacts/<listing>/02-fixed/<op>-<name>.jpg \
  --type <declutter|twilight|sky|restyle> \
  --out artifacts/<listing>/02-fixed/disclosed/<name>-disclosed.jpg

python3 scripts/pair.py \
  --altered artifacts/<listing>/02-fixed/disclosed/<name>-disclosed.jpg \
  --original artifacts/<listing>/inputs/<photo>.jpg \
  --out artifacts/<listing>/02-fixed/disclosed/<name>-pair.jpg
```

then write `artifacts/<listing>/02-fixed/disclosed/disclosure-assets.md` (the MLS
remark + the AB-723 line + pairing order), per `disclosure-stamp`'s
`references/disclosure-formats.md`.

**`--type` mapping for this skill** (caption per `disclosure-stamp`):

| operation | `--type` | caption it yields |
|---|---|---|
| `declutter` | `declutter` | "Digitally Altered" |
| `twilight` | `twilight` | "Digitally Altered" |
| `sky` | `sky` | "Digitally Altered" |
| `enhance` | `restyle` | "Digitally Altered" (enhance is still an altered image) |

A fix that is `blocked` (full-chain failure) or held by the defect-honesty front-stop
is not disclosed (there is no compliant altered image to ship) — the block + FLAG in
`fix-log.md` is the deliverable.

## Outputs

This skill writes exactly these paths (`<listing>` = the active listing slug, `<op>` =
the operation, `<name>` = derived from the source filename) — declared here and in the
frontmatter so paths are never guessed:

- `artifacts/<listing>/02-fixed/<op>-<name>.jpg` — the fixed photo (geometry-QC passed
  or kept-best+FLAG; defect-honesty clean).
- `artifacts/<listing>/02-fixed/fix-log.md` — per-operation log: model, prompt,
  geometry-QC verdict + per-dim scores, defect-honesty decision, cost (balance delta),
  FLAGs.
- `artifacts/<listing>/02-fixed/disclosed/<name>-disclosed.jpg` +
  `<name>-pair.jpg` + `disclosure-assets.md` — the AB-723 disclosure set.

Plus working files under `work/fix/` (raw generations, QC verdict JSON, balance
snapshots, info JSON) — never under `artifacts/`.

## Update state.md (the ledger is how phases chain)

After the phase completes (or fails), update the listing's `state.md` `fix` row: mark
`done` (or `blocked` with the reason), refresh `updated` and `status`, and rewrite
`next_action` to the one imperative that is true now (e.g. "Driveway decluttered +
exterior dusked, both geometry-QC passed and disclosed — handoff to summary" or
"Re-run onboarding: inputs/<photo> missing" or "Declutter BLOCKED — target is a
structural defect; ask the agent"). Then do the Remember step per the bot's execution
loop. Never stop with a stale ledger.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| `inputs/<photo>` missing/unreadable | Record failure in `state.md`, stop. No invented property. |
| `operation` missing / not in `{declutter,twilight,sky,enhance}` | Clean recorded failure (`specify operation`). Do not guess. |
| `declutter` with no `removal-target` | Clean recorded failure (`declutter needs a removal-target`). Never erase by guessing. |
| Removal target IS a structural defect / permanent fixture | **defect-honesty STOP + FLAG** — do not erase. AB-723 "different, not better" (misdemeanor + DRE discipline). |
| All models in the chain fail / unreachable | `gen-edit.sh` exits 1 → record `blocked` + FLAG. Do NOT substitute an out-of-chain model. |
| geometry-QC `drift` (exit 4) | Regenerate ONCE off the unaltered original with a reinforced preserve clause → keep-best + FLAG. Never silently ship a drift. |
| geometry-QC `review` (exit 3) / could-not-judge (exit 2) | Ship with a prominent FLAG; the bot does not certify it. |
| `defect_honesty` dim low even on a pass verdict | STOP + FLAG — the defect/fixture backstop overrides the overall score. |
| Multiple fixes requested (e.g. declutter + twilight) | Run as SEPARATE turns, each off the unaltered original. Never chain edits. |
| fal output URL expired | Always use `files[0].local_path` (`gen-edit.sh` handles this); never re-fetch the `*.fal.media` URL. |

## References

- `references/geometry-discipline.md` — the geometry-preserve discipline: the verbatim
  preserve clause (interior/exterior + twilight/sky + enhance variants), the
  no-geometry-lock fact, single-change-per-turn + re-feed-the-original, the ai-gen
  syntax contract (`--image` → singular `image_url`, positional `resolution=2K`,
  `files[0].local_path`, ignore `credits_used`), and the geometry-QC rubric
  (walls/windows/ceiling/camera/footprint/defect_honesty → pass/drift/review). Read
  this for the *how* of architecture-locking.
- `references/fix-prompts.md` — the verbatim per-operation prompts (declutter interior
  + exterior, twilight, sky, enhance) with the negative guards. Read this for the
  exact prompt text to feed `gen-edit.sh`.
