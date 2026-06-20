---
name: bot-024-tryon-studio
description: Turn a seller's flat-lay or ghost-mannequin garment photo plus a model photo into catalog-ready on-model shots with the fabric, print, buttons and fit preserved. The transfer runs on the dedicated VTON endpoint fal-ai/fashn/tryon/v1.6 (Leffa fallback) called with REQUIRED named args garment_image plus model_image via "ai-gen run" — never --image. EVERY try-on output passes a BLOCKING tryon-qc vision compare against the real garment that catches both drift (a changed/different garment) AND flattery (a cheap fabric rendered luxe, a fit slimmed, a hem lengthened — the misrepresentation that drives returns), then is upscaled to marketplace resolution. Use to make on-model / virtual try-on photos, put a flat-lay garment on a model, or produce catalog model shots from a product photo.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-024
  inputs:
    - name: garment
      type: image
      required: true
      description: artifacts/<project>/inputs/garment.<jpg|png> — the seller's real flat-lay or ghost-mannequin/dress-form photo of the garment (or the supplier product photo). This is the fidelity ground-truth every try-on is checked against. A cluttered background is fine (optionally cleaned with Bria RMBG first).
    - name: model
      type: image
      required: true
      description: artifacts/<project>/inputs/model.<jpg|png> — the model photo (or base-body image) the garment is put onto. Re-use the same model image across a catalog to approximate face-consistency. Required for the VTON path (FASHN model_image / Leffa human_image_url).
    - name: fabric
      type: text
      required: false
      description: The declared fabric type (e.g. ribbed cotton, washed denim, silk satin), from context.md. REQUIRED only for the general-model fallback path (it raises texture fidelity ~3/10 to ~8/10); the bot ASKS for it there and never invents it. The dedicated VTON path takes no prompt.
    - name: category
      type: text
      required: false
      description: Garment category — tops, bottoms, one-pieces, or auto. Default auto. Maps to FASHN category and to Leffa garment_type (tops to upper_body, bottoms to lower_body, one-pieces to dresses).
    - name: variants
      type: text
      required: false
      description: How many on-model variants to attempt (pose/model/background). Default 2. Each is generated, QC'd, and upscaled independently; failed ones are dropped/flagged, never silently shipped.
    - name: target-marketplace
      type: text
      required: false
      description: Marketplace whose image resolution to target on upscale. Default amazon (recommends 2000px+ on the long side). Recorded in the QC report.
  outputs:
    - name: tryon-set
      type: image
      path: artifacts/<project>/01-tryon/NN-<variant>.png
      description: The QC-passed on-model try-on variants, upscaled to marketplace resolution. Each one was checked against the real garment (fabric/print/color/trim/cut-fit) and is NOT flattered beyond the real item. Drifted or flattered variants are dropped/escalated, not shipped.
    - name: qc-report
      type: markdown
      path: artifacts/<project>/01-tryon/qc-report.md
      description: The per-variant tryon-qc verdict (pass / drift-dropped / flatter-escalated / low-confidence-review) with a reason, plus any resolution shortfall flag and the don't-mislead escalation note. The honest production log.
    - name: tryon-meta
      type: json
      path: artifacts/<project>/01-tryon/NN-<variant>.png.meta.json
      description: Per-variant generation metadata — which model produced it (FASHN primary or Leffa fallback), category, mode, and the source garment/model images. Read to audit the run.
---

# Try-On Studio — flat-lay garment to catalog-ready on-model shots (BOT-024)

Turn a seller's **flat-lay / ghost-mannequin garment photo** plus a **model photo**
into accurate, catalog-ready **on-model shots** with the fabric, print, buttons and fit
preserved — so an apparel seller multiplies on-model catalog shots without booking a
model + photographer reshoot. The hard constraint, baked in from line one: a try-on
cuts returns **only when accurate**, so this skill refuses to flatter fit or fabric
beyond the real garment (the Vinted/BBC dropship-scam anti-pattern).

This skill runs **headless**. Never ask the user anything that has a default below; a
missing required input (garment or model) is a clean recorded failure, not a question.
The one exception: on the general-model fallback path, a missing **fabric** is asked
for, never invented — inventing fabric is the misrepresentation we refuse.

## The architecture (read this first — it is load-bearing)

Reachable fal generative models have **no hard fidelity lock** — a VTON model can smooth
a cheap knit into a luxe one, straighten a print, slim a fit, or lengthen a hem. That is
the exact failure that becomes fraud at the limit. So:

- **The transfer is the dedicated VTON path, not a general re-render.**
  `fal-ai/fashn/tryon/v1.6` (Leffa fallback) transfers the garment pixels onto the
  model. It is called with **REQUIRED named args** `garment_image` + `model_image` via
  **`ai-gen run <slug> KEY=VALUE ...`** — NOT `--image` (which only sends the singular
  `image_url`). This is the riskiest single line; `references/models.md` has the exact
  contract.
- **EVERY try-on output passes a BLOCKING `tryon-qc`** — a Claude vision compare against
  the real garment that grades fidelity (fabric/print/color/trim/cut-fit/realism) AND a
  separate **misrepresentation gate** (was the garment flattered?). `pass` ships;
  `drift` is dropped; `flatter` is escalated to the seller; `review` ships only with a
  flag. Never silently ship a try-on that failed QC.
- **Upscale comes AFTER QC.** FASHN renders at 864x1296 and Leffa at 768x1024 — below
  Amazon's 2000px recommendation — so a QC-passed variant is upscaled via
  `fal-ai/clarity-upscaler`. Never upscale a drifted/flattered image (it just makes a
  high-res misrepresentation).
- **The general-model path (nano-banana-pro) is the fallback only** — used when a VTON
  endpoint refuses the category, or to approximate catalog face-consistency. There the
  prompt is fabric-locked via `fabric-inject.py` (fabric before style + the preserve
  clause), and the IMAGE_SAFETY mannequin-reframe handles filter rejections.

## When to use

The `tryon` phase of the project's `state.md`. Also invoked directly when asked to
"make on-model / virtual try-on photos", "put this flat-lay garment on a model",
"generate catalog model shots from my product photo", or "show this on a model".

## Read first (READ-BEFORE-WRITE)

Read, in this order:

1. `artifacts/<project>/context.md` — garment truth (name, declared fabric, category,
   model notes, target marketplace, # variants). Optional; defaults below if absent.
2. `artifacts/<project>/inputs/garment.<jpg|png>` — the **required** real garment photo
   (the fidelity ground-truth). Confirm it exists and is a readable image.
3. `artifacts/<project>/inputs/model.<jpg|png>` — the **required** model photo. Confirm
   it exists and is a readable image.

**Required-input gate** (record, don't ask):

- No `inputs/garment.*` OR no `inputs/model.*` on disk -> write a failure note in
  `state.md` (`status: blocked`, `next_action: re-run onboarding — garment/model
  missing`) and stop. Do not invent a garment or a model from text alone.

**Defaults for optional inputs:** category `auto`; variants `2`; target marketplace
`amazon`; fabric — asked for only if the general-model fallback is reached.

## Step 0 — Reachability check (attempt, don't gate the engine)

Confirm the try-on slugs are reachable. This is a reachability *check*, not a switch:

```bash
ai-gen info fal-ai/fashn/tryon/v1.6      > work/tryon/fashn-info.json  2>&1 || true
ai-gen info fal-ai/leffa/virtual-tryon   > work/tryon/leffa-info.json  2>&1 || true
ai-gen balance                           > work/tryon/balance-before.txt
```

- FASHN is the primary; Leffa is the fallback (both in `tryon.sh`'s chain). If
  `ai-gen info` errors, attempt the run anyway (the proxy has served models `info` could
  not describe) and let the script record the failure honestly.
- Record the starting balance — cost is read from `ai-gen balance` deltas, **never** the
  `credits_used` JSON field (it over-reports). See `references/models.md`.
- Optional: if the garment flat-lay is busy, clean it first with
  `ai-gen image "" -m fal-ai/bria/background/remove --image <garment> -o work/tryon
  --format json` and use the cutout as the garment.

## Step 1 — The try-on (dedicated VTON path)

For each variant, run `tryon.sh` — FASHN v1.6 primary, Leffa fallback, named args:

```bash
scripts/tryon.sh \
  artifacts/<project>/inputs/garment.jpg \
  artifacts/<project>/inputs/model.jpg \
  work/tryon/01-raw.png \
  auto quality
```

It calls `ai-gen run fal-ai/fashn/tryon/v1.6 garment_image=<garment>
model_image=<model> category=auto mode=quality ...` (positional key=value — the named
args FASHN requires), parses `files[0].local_path` (objects in v2.1.0; the `*.fal.media`
URL expires so the local file is used immediately), and writes a `.meta.json`. On a
FASHN failure it falls through to Leffa (`human_image_url` + `garment_image_url`). If
BOTH fail, the variant is FLAGGED + skipped — do not substitute a general re-render as
the catalog shot without a passing QC.

**General-model fallback (only when a VTON endpoint refuses the category):** build the
fabric-locked prompt and use nano-banana-pro:

```bash
PROMPT="$(python3 scripts/fabric-inject.py --fabric "<declared fabric>" \
          --garment "<garment name>" --model-desc "<model description>")"
ai-gen image "$PROMPT" -m fal-ai/nano-banana-pro \
  --image artifacts/<project>/inputs/garment.jpg \
  --ref  artifacts/<project>/inputs/model.jpg \
  --aspect-ratio 3:4 resolution=2K -o work/tryon --format json --max-cost 60
```

`fabric-inject.py` REQUIRES a declared fabric (it rejects generic terms) — if none is
known, ASK the seller, never invent it. On an IMAGE_SAFETY rejection, reframe to the
garment on a mannequin/dress form (`references/tryon-discipline.md` §2) and retry.

## Step 2 — tryon-qc (BLOCKING gate on every try-on)

For each generated try-on, run the blocking vision compare against the **real garment**
(and the model reference, for face-consistency):

```bash
python3 scripts/tryon-qc.py \
  --candidate work/tryon/01-raw.png \
  --garment   artifacts/<project>/inputs/garment.jpg \
  --model-ref artifacts/<project>/inputs/model.jpg \
  --out       work/tryon/01-qc.json
```

It grades fabric/print/color/trim/cut_fit/realism and returns a verdict:

- **pass** (exit 0) -> proceed to upscale + ship.
- **drift** (exit 4) -> the garment changed -> **drop**; regenerate once (different
  seed/mode) then drop+flag if it drifts again.
- **flatter** (exit 5) -> the **misrepresentation gate**: same garment but rendered more
  flattering than the real item (fabric upgraded, fit slimmed, hem lengthened, wrinkles
  removed) -> **do NOT ship as a catalog truth-claim; escalate to the seller**.
- **review** (exit 3) -> mangled hands / warped print / fine-print / face uncertain /
  low confidence -> ship ONLY with a prominent flag; never certify.

Record every verdict in `qc-report.md` with the reason. The `flatter` verdict is
blocking, not advisory — a flattered image is the dangerous one because it is pretty and
wrong (the don't-mislead-returns guardrail, `references/tryon-discipline.md` §4).

## Step 3 — Upscale (only a QC-passed variant)

Lift the sub-2K VTON output to marketplace resolution — never before QC:

```bash
scripts/upscale.sh work/tryon/01-raw.png artifacts/<project>/01-tryon/01-<variant>.png 2000 2
```

It copies through if the image already meets the long-side target, else upscales via
`fal-ai/clarity-upscaler` (positional `scale_factor=`). If the upscale fails it delivers
the QC-passed native-resolution image and FLAGS the resolution shortfall — never
withholds.

## Outputs

This skill writes exactly these paths (`<project>` = the active garment/job slug):

- `artifacts/<project>/01-tryon/NN-<variant>.png` — the QC-passed, upscaled on-model
  variants (drift dropped, flattery escalated, never silently shipped).
- `artifacts/<project>/01-tryon/NN-<variant>.png.meta.json` — per-variant generation
  metadata (model used, category, mode, source images).
- `artifacts/<project>/01-tryon/qc-report.md` — the per-variant verdict + reasons,
  resolution flags, and the don't-mislead escalation note.

Plus working files under `work/tryon/` and `work/upscale/` (raw try-ons, QC JSON,
balance snapshots, info JSON) — never under `artifacts/`.

## Update state.md (the ledger is how phases chain)

After the phase completes (or fails), update the project's `state.md` `tryon` row: mark
`done` (or `blocked` with the reason), refresh `updated` and `status`, and rewrite
`next_action` to the one imperative that is true now (e.g. "2 try-on variants QC-passed +
upscaled — run compliance-guard pre-flight + AI disclosure" or "Re-run onboarding:
inputs/model missing"). Then do the Remember step per the bot's execution loop. Never
stop with a stale ledger.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| `inputs/garment.*` or `inputs/model.*` missing/unreadable | Record failure in `state.md`, stop. No invented garment/model. |
| FASHN + Leffa both fail / unreachable | FLAG the variant + skip; record `blocked`. Do NOT substitute a general re-render as the catalog shot without a passing QC. |
| General-model fallback but no declared fabric | ASK the seller for the fabric; never invent it (`fabric-inject.py` rejects generic terms). |
| IMAGE_SAFETY rejects the general-model try-on | Reframe to the garment on a mannequin/dress form + retry; a category that keeps refusing is FLAGGED, never forced. |
| try-on DRIFTS (different/changed garment) | tryon-qc drops it; regenerate once (seed/mode), then drop+flag. Ship the good ones. |
| try-on FLATTERS (fabric/fit/hem idealized) | tryon-qc `flatter` -> ESCALATE to the seller; never ship as a catalog truth-claim. |
| Mangled hands / warped print / fine-print / uncertain face | tryon-qc `review` -> ship with a prominent flag; do not certify. |
| Upscale fails | Deliver the QC-passed native-resolution image + FLAG the <2000px shortfall; never withhold. |
| fal output URL expired | Always use `files[0].local_path` (the saved local file); never re-fetch the `*.fal.media` URL. |

## References

- `references/models.md` — the try-on stack (FASHN v1.6 / Leffa / nano-banana-pro /
  clarity-upscaler), the verified named-arg contract (`ai-gen run <slug> KEY=VALUE`, NOT
  `--image`), the output/cost handling, the parked first-party FASHN gap, and the
  cat-vton exclusion. Read this for the *what* of the stack.
- `references/tryon-discipline.md` — fabric-before-style (the ~8/10-vs-~3/10 lever), the
  IMAGE_SAFETY mannequin-reframe fallback, the blocking tryon-qc rubric (drift vs the
  flatter misrepresentation gate), and the don't-mislead-returns guardrail from the
  Vinted/BBC backlash. Read this for the *how* of fidelity.
