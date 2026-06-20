---
name: bot-022-packshot-studio
description: Turn a seller's raw phone snap of a product into a pure-white, RGB-255 Amazon-compliant HERO image plus up to 4 identity-locked alternate angles — fidelity-first. The HERO main-image path is DETERMINISTIC (Bria RMBG to preserve the real product pixels → Pillow exact-255 flatten + ≥85% frame-fill + ≥1600px), never a generative re-background (a generative edit hallucinated a different product in the build PoC). Alternate angles REQUIRE generation (nano-banana-pro re-anchored off the approved hero, capped at ≤4) and EVERY generative output passes a blocking fidelity-qc vision compare before it ships. Use for phase 1 (hero) of a product-photo project, or whenever asked to make a compliant main image, white-background packshot, hero shot, or alternate product angles from a phone photo.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-022
  inputs:
    - name: snap
      type: image
      required: true
      description: artifacts/<product>/inputs/snap.<jpg|png> — the seller's raw phone photo of the real product (clutter, mixed lighting, non-white background are expected). This is the fidelity ground-truth every output is checked against.
    - name: product-name
      type: text
      required: false
      description: Short product name (e.g. a sage-green ceramic mug), from context.md. Used only to label outputs and to anchor the fidelity-qc judge — never to invent detail the snap does not show. Default — inferred from the snap and recorded as an assumption.
    - name: angles
      type: text
      required: false
      description: How many alternate angles to attempt and which (e.g. 3 of side/top/3-4). HARD CAP 4 — the anti-drift SOP. Default 3 = side/top/3-4 (front = the hero). 0 = hero only.
    - name: target-marketplace
      type: text
      required: false
      description: Marketplace whose main-image spec to enforce. Default amazon (the strictest — exact RGB 255,255,255, ≥85% fill, ≥1600px long side, 1:1). Recorded in compliance.json.
  outputs:
    - name: hero
      type: image
      path: artifacts/<product>/01-hero/hero.jpg
      description: The compliant main image — exact RGB(255,255,255) background, ≥85% frame fill, ≥1600px long side, 1:1, sRGB JPEG with metadata stripped. Deterministically produced (Bria RMBG cutout of the REAL snap → Pillow flatten). Pixel-faithful to the product.
    - name: angles-set
      type: image
      path: artifacts/<product>/02-angles/NN-<angle>.jpg
      description: Up to 4 identity-locked alternate angles, each generated off the APPROVED hero and each passed through fidelity-qc + white-bg-enforce. Drifted/failed angles are dropped or flagged, never silently shipped.
    - name: compliance
      type: json
      path: artifacts/<product>/01-hero/compliance.json
      description: enforce_packshot verdict per image — bg_pass (exact-255), fill + fill_pass (≥0.85), res_ok (≥1600px), sampled pixels. The objective gate.
    - name: fidelity-qc
      type: markdown
      path: artifacts/<product>/01-hero/fidelity-qc.md
      description: The vision compare of every generated output vs the original snap (color/shape/label/surface), per-image confidence verdict, and the honest flags (reflective/metallic/fine-text → human review; any drift → drop/flag). The hero (deterministic) records PIXEL-FAITHFUL.
---

# Packshot Studio — compliant hero + identity-locked angles (BOT-022 · phase 1+2)

Turn one raw phone snap into a clean, **pure-white, RGB-255 Amazon-compliant hero
image** plus up to **4 identity-locked alternate angles** — without the model ever
inventing a color, texture, or detail the real product lacks. This is the core skill
of the bot: every other phase (scenes, pre-flight) re-anchors off the approved hero
this skill produces.

This skill runs **headless**. Never ask the user anything: every optional input has
a default below; a missing required input (the snap) is a clean recorded failure,
not a question.

## The architecture (read this first — it is load-bearing)

The build PoC (`research/poc-reachability.md`) proved the single fact that shapes
this whole skill: **reachable fal edit models have no fidelity/geometry lock.** A
real product photo (a sage-green mug) re-backgrounded with a *generative* edit
(`nano-banana-pro --image`) **hallucinated a different product** — the mug became a
leather luggage tag. The same input through **Bria RMBG (`--image`) was
pixel-faithful.** Therefore:

- **The HERO main-image path is DETERMINISTIC.** Run `fal-ai/bria/background/remove`
  on the seller's real snap to get a clean cutout (this preserves the real product
  pixels — it does not re-imagine them), then a local Pillow pass flattens onto an
  EXACT `RGB(255,255,255)` canvas, checks ≥85% frame fill and ≥1600px, and exports a
  metadata-stripped sRGB JPEG. **Never use a generative model to re-background the
  seller's real product for the compliant main image.**
- **Alternate angles REQUIRE generation** (you cannot photograph a back you do not
  have), so they use `nano-banana-pro --image <approved-hero> resolution=2K` — but
  they are **best-effort, capped at ≤4, re-anchored off the approved hero**, and
  **EVERY angle passes a blocking `fidelity-qc`** (a Claude vision compare of
  output-vs-original on product identity/color/shape/label). Drift → drop or FLAG;
  never silently ship.
- Optional photoreal cleanup/relight of the hero (e.g. Seedream v4.5) is permitted
  **only when gated by `fidelity-qc`** — and if it fails QC, fall back to the plain
  RMBG+flatten hero, which is always pixel-faithful.

## When to use

The `hero` (phase 1) and `angles` (phase 2) rows of the project's `state.md`. Also
invoked directly when asked to "make a compliant main image / Amazon hero", "put my
product on white", "clean up this product photo", or "give me side/top/3-4 angles of
this product".

## Read first (READ-BEFORE-WRITE)

Read, in this order:

1. `artifacts/<product>/context.md` — product truth (name, material/color notes,
   target marketplace, # angles). Optional; defaults below if absent.
2. `artifacts/<product>/inputs/snap.<jpg|png>` — the **required** raw snap. This is
   the fidelity ground-truth. Confirm it exists and is a readable image.

**Required-input gate** (record, don't ask):

- No `inputs/snap.*` on disk → write a failure note in `state.md`
  (`status: blocked`, `next_action: re-run onboarding — inputs/snap missing`) and
  stop. Do **not** invent or generate a product from text alone.
- The snap is unreadable / not an image → same clean failure. Do not proceed.

**Defaults for optional inputs:** product name inferred from the snap and recorded
as an assumption; target marketplace `amazon` (strictest); angles `3` = `{side,
top, 3/4}` (hard cap 4; `0` = hero only); aspect `1:1` for hero + angles.

## Step 0 — Reachability check (attempt, don't gate the engine)

Confirm the two slugs this skill needs are reachable. This is a *reachability
check*, not a switch that changes the pipeline:

```bash
ai-gen info fal-ai/bria/background/remove   > work/hero/bria-info.json   2>&1 || true
ai-gen info fal-ai/nano-banana-pro          > work/hero/nbp-info.json    2>&1 || true
ai-gen balance                              > work/hero/balance-before.txt
```

- Bria RMBG is the deterministic hero engine; nano-banana-pro is the angle engine.
  Both were verified active in the PoC. If `ai-gen info` errors, attempt the run
  anyway (the proxy has served models `info` could not describe) and let the script
  record the failure honestly.
- Record the starting balance — cost is read from `ai-gen balance` deltas, **never**
  the `credits_used` JSON field (it over-reports). See
  `references/fidelity-discipline.md`.

## Step 1 — The compliant HERO (deterministic, pixel-faithful)

One command does the whole hero path — Bria RMBG on the real snap, then the Pillow
exact-255 flatten + frame-fill + resolution gate:

```bash
scripts/packshot.sh \
  artifacts/<product>/inputs/snap.jpg \
  artifacts/<product>/01-hero/hero.jpg \
  artifacts/<product>/01-hero/compliance.json
```

What it does (depth in `references/amazon-image-spec.md` + `fidelity-discipline.md`):

1. **RMBG the REAL snap** — `ai-gen image "" -m fal-ai/bria/background/remove
   --image <snap> -o work/hero --format json` → a transparent-PNG cutout that
   **preserves the real product pixels** (the PoC proved this is pixel-faithful).
   Parses `files[0].local_path` (entries are objects); the `*.fal.media` URL
   expires, so the local file is used immediately.
2. **Pillow enforce** — `enforce-packshot.py` flattens the cutout onto an EXACT
   `RGB(255,255,255)` canvas, samples 8 corner/edge points (must all be `255,255,255`
   — `254` fails Amazon), measures the product bbox fill (must be ≥0.85), checks the
   long side is ≥1600px, and writes a metadata-stripped sRGB JPEG + the
   `compliance.json` verdict.

The hero is recorded in `fidelity-qc.md` as **PIXEL-FAITHFUL (deterministic RMBG +
flatten — no generative re-background)** — it does not need an LLM QC pass because no
model re-imagined the product.

**If the fill check fails (<0.85)** the product is too small in the snap: re-crop
tighter (the script re-centers + re-pads to put the bbox at ≥85%) and re-run the
gate. **If after re-crop it still fails**, deliver the best result and FLAG it in
`fidelity-qc.md` (`fill below 0.85 — re-shoot closer or crop`); never withhold.

**If the snap quality is too poor for a clean RMBG cutout** (halo, cut-off product),
disclose it — do not paper over it with a generative re-background.

### Optional: photoreal cleanup (ONLY when QC-gated)

If the brief asks for a studio relight/cleanup beyond the plain cutout, you MAY run a
Seedream v4.5 pass with the preserve-clause prompt
(`references/fidelity-discipline.md`), but it is **gated by `fidelity-qc`**: compare
the cleaned hero vs the snap; on any drift fall back to the deterministic
RMBG+flatten hero (always pixel-faithful). Default is **no cleanup** — the plain
compliant hero ships.

## Step 2 — Alternate angles (generative, capped ≤4, every one QC'd)

Only after the hero PASSES the gate. Angles are generated off the **approved hero**
(the single identity anchor) — never off the raw snap, never off each other:

```bash
scripts/gen-angles.sh \
  artifacts/<product>/01-hero/hero.jpg \
  artifacts/<product>/02-angles \
  "side,top,3/4" \
  "<product-name>"
```

The script (depth in `references/fidelity-discipline.md`):

- Caps the angle list at **4** (drops extras with a flag) — the anti-drift SOP:
  "Never generate more than 4 new angles without checking consistency. AI drifts."
- For each angle, composes a directional prompt that changes **only the camera** and
  holds everything else, with the preserve clause + anchor ("the exact same product
  as the attached reference; preserve color, label and proportions; do not invent
  detail; same studio white background; same lighting"), and generates:

  ```bash
  ai-gen image "<directional line>; <preserve clause>" \
    -m fal-ai/nano-banana-pro --image artifacts/<product>/01-hero/hero.jpg \
    --aspect-ratio 1:1 resolution=2K -o work/angles --format json --max-cost 60
  ```

  (`--image` → `image_url`, the proven base-edit path; `resolution=2K` is a
  POSITIONAL model param — there is no `--resolution` flag; `--max-cost` is in
  credits.)
- Runs each generated angle through **`white-bg-enforce`** (`enforce-packshot.py`) so
  every angle is also exact-255 compliant, then through **`fidelity-qc`** (Step 3).
- An angle that fails fidelity-qc is **dropped and flagged** (re-anchoring drift), not
  shipped. The set is best-effort: shipping 2 good angles beats shipping 4 with a
  drifted one.

## Step 3 — fidelity-qc (blocking gate on every GENERATED image)

For each generated image (angles, and the optional cleaned hero — **not** the
deterministic hero), do a Claude vision compare of the output against the original
snap (and the approved hero, for angles):

- Look at both images. Is it the **same product**? Check color, shape/proportions,
  label/text, and surface/material. No invented reflection, texture, prop, or detail.
- Verdict per image: **pass** (ships) / **drift — drop** (the product changed —
  e.g. the PoC luggage-tag swap) / **low-confidence — human review** (reflective,
  metallic, glass, jewelry, or fine printed text — known low-confidence classes).
- Record every verdict in `fidelity-qc.md` with the reason. A `drift` verdict is a
  **blocking** drop; a `low-confidence` verdict ships **with a prominent flag**.

Never silently ship a generated image that failed QC — that is the failure that
drives "Color Not as Described" returns, and it is a graded honesty failure.

## Outputs

This skill writes exactly these paths (`<product>` = the active product slug) —
declared here and in the frontmatter so paths are never guessed:

- `artifacts/<product>/01-hero/hero.jpg` — the compliant, pixel-faithful main image.
- `artifacts/<product>/01-hero/compliance.json` — the enforce_packshot verdict.
- `artifacts/<product>/01-hero/fidelity-qc.md` — the fidelity report (hero =
  pixel-faithful; each angle's verdict + flags).
- `artifacts/<product>/02-angles/NN-<angle>.jpg` — up to 4 identity-locked angles
  (each exact-255 + QC-passed; drops/flags recorded).

Plus working files under `work/hero/` and `work/angles/` (RMBG cutouts, raw
generations, balance snapshots, info JSON) — never under `artifacts/`.

## Update state.md (the ledger is how phases chain)

After the phase completes (or fails), update the project's `state.md` rows for
`hero` / `angles`: mark `done` (or `blocked` with the reason), refresh `updated` and
`status`, and rewrite `next_action` to the one imperative that is true now (e.g.
"Hero compliant + 3 angles QC-passed — run phase 3 scenes" or "Re-run onboarding:
inputs/snap missing"). Then do the Remember step per the bot's execution loop. Never
stop with a stale ledger.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| `inputs/snap.*` missing/unreadable | Record failure in `state.md`, stop. No invented product. |
| Bria RMBG fails / unreachable | Hero cannot be produced compliantly → record `blocked`, FLAG. Do NOT substitute a generative re-background (it hallucinates — PoC). |
| Frame fill <0.85 after re-crop | Deliver best result + FLAG (`re-shoot closer`); never withhold. |
| Long side <1600px | Deliver + FLAG resolution; Pillow does not upscale-invent detail. |
| Generated angle drifts (≠ the product) | `fidelity-qc` drops it + FLAGS the reason. Ship the good ones. |
| Reflective / metallic / glass / fine-text product | Generated outputs flagged **low-confidence → human review**; the deterministic hero still ships. |
| Angle list >4 requested | Cap at 4, drop extras with a flag (anti-drift SOP). |
| fal output URL expired | Always use `files[0].local_path` (the saved local file); never re-fetch the `*.fal.media` URL or `startswith("https://fal.media")`. |
| Optional cleanup pass fails QC | Fall back to the deterministic RMBG+flatten hero (always pixel-faithful). |

## References

- `references/amazon-image-spec.md` — the exact main-image rules the gate enforces
  (exact RGB 255,255,255, ≥85% fill, ≥1600px, 1:1, no text/logo/watermark), the
  G1881-login-gated flag, and the off-white-after-re-save warning. Read this for the
  *what* of compliance.
- `references/fidelity-discipline.md` — the preserve clause (verbatim), the
  RMBG-not-generative rule (the PoC finding), the anti-drift SOP (cap-at-4,
  re-anchor, directional language), the ai-gen syntax contract (`--image` →
  `image_url`, positional `resolution=2K`, `files[0].local_path`, ignore
  `credits_used`), and the fidelity-qc judging rubric. Read this for the *how* of
  fidelity.
