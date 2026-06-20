---
name: bot-026-video-ad
description: Turn an approved packshot or hero still into a short 9:16 product video ad with ONE tasteful slow camera move and in-pass audio, holding the product identity stable. The reachable image-to-video models have NO geometry lock, so identity is held by a strict-product motion prompt (one slow safe move only, name what stays stable, no extra text) and a BLOCKING video-qc vision pass that confirms the clip shows the REAL input product with a stable logo before any variant fan-out or paid spend. Seedance 2.0 image-to-video is primary (multi-shot, in-pass dual-channel audio, the start frame via --image); Kling 3.0 standard is the logo-stays-sharper alternative (needs start_image_url). Aggressive camera moves melt geometry and are auto-substituted with safe ones. Use for phase 1 (the base clip) of a product-video-ad project, or whenever asked to make a product video ad, animate a packshot, turn a product photo into a TikTok or Reels or Shorts clip, or fan out ad-test video variants.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-026
  inputs:
    - name: hero
      type: image
      required: true
      description: artifacts/<project>/inputs/hero.<jpg|png> — the approved packshot / hero still that is the image-to-video START FRAME and the identity ground-truth every clip is QC'd against. Ideally the compliant hero from the product-photo sibling bot. A missing hero is a clean recorded failure, never an invented product from text.
    - name: product-name
      type: text
      required: false
      description: Short product name/description for the motion prompt (e.g. a matte black water bottle), from context.md. Used only to anchor the prompt and the QC judge — never to invent detail the hero does not show. Default — inferred from the hero and recorded as an assumption.
    - name: engine
      type: text
      required: false
      description: Which i2v engine — seedance (primary, multi-shot + in-pass audio), seedance-fast (cheaper tier), or kling (logo-stays-sharper alt). Default seedance.
    - name: move
      type: text
      required: false
      description: One SAFE camera move — push-in, subtle orbit, gentle pull-out, soft light sweep, or static. Aggressive moves (fast, whip-pan, crash-zoom, shake) are auto-substituted with the closest safe move and the substitution is recorded. Default push-in.
    - name: variants
      type: text
      required: false
      description: How many ad-test variants to fan out after the base clip PASSES video-qc, changing exactly one variable each. Default 0 (base clip only). Fan-out only happens after the base clip passes QC.
    - name: duration
      type: text
      required: false
      description: Clip length in seconds (Seedance 4-15, Kling 3-15). Default 5 — short clips drift less and cost less.
  outputs:
    - name: base-clip
      type: video
      path: artifacts/<project>/01-ad/base.mp4
      description: The 9:16 product video ad — one slow safe camera move, in-pass audio, the real product with a stable logo. Downloaded from files[0].local_path (fal URLs expire). Never auto-published.
    - name: variants-set
      type: video
      path: artifacts/<project>/01-ad/NN-<variant>.mp4
      description: Optional ad-test variants, each changing one variable (camera move / lighting / multi-shot), each generated only after the base clip passed video-qc and each itself passed the blocking video-qc. Drifted variants are dropped/flagged, never shipped.
    - name: video-qc
      type: markdown
      path: artifacts/<project>/01-ad/video-qc.md
      description: The blocking vision compare of every clip vs the input hero (product identity, logo/label stability, motion safety/no-artifacts, audio), per-clip verdict (pass / drift-dropped / low-confidence-human-review) with reasons. The gate that precedes any fan-out or spend.
    - name: video-manifest
      type: json
      path: artifacts/<project>/01-ad/video-manifest.json
      description: Per-clip record emitted by gen-video.sh (out, engine, model, prompt_file, note_file, gen_ok, has_audio, variant, needs_qc). The list the bot reads to run the blocking video-qc on every clip.
---

# Video Ad — packshot still to a QC'd 9:16 product video (BOT-026 · phase 1)

Turn one approved packshot/hero still into a short **9:16 product video ad** — one
tasteful **slow camera move**, in-pass audio, the **real product with a stable logo**
— or a small set of ad-test variants from the same still. The win is **testing
velocity** (cheaply spin a few variants to A/B test), not replacing a film crew for a
hero spot.

This skill runs **headless**. Never ask the user anything: every optional input has a
default below; a missing required input (the hero still) is a clean recorded failure,
not a question.

## The architecture (read this first — it is load-bearing)

The reachable image-to-video models have **no geometry/fidelity lock** — the same
finding the sibling product-photo bot proved on images (a generative edit turned a
mug into a luggage tag). On video it is worse: the more the camera or subject
accelerates, the more the model re-imagines edges, labels, and shapes. So:

- **Identity is held by the prompt, not the model.** Every clip uses the
  **strict-product formula** (`[format], [product] on [surface], [one camera move],
  [lighting], [commercial style], keep [logo/label/shape] stable, no extra text, no
  distorted details`) assembled by `motion-prompt.py`, with exactly **ONE slow safe
  camera move**. Aggressive moves (`fast`, whip-pan, crash-zoom, shake) **melt
  geometry** and are auto-substituted (see `references/motion-discipline.md`).
- **Every clip passes a BLOCKING `video-qc`.** A Claude vision pass (`scripts/
  video-qc.md`) confirms the clip shows the **REAL input product** with a **stable
  logo** and **no melted geometry** BEFORE the clip is shown as ready, BEFORE any
  variant fan-out, and BEFORE any paid spend. A `drift` verdict is a blocking drop.
- **The start frame is the identity anchor**, addressed differently per engine:
  Seedance takes it via `--image` (→ `image_url`); Kling **requires `start_image_url`**
  (passed as a positional key=value). A mis-forwarded frame on Kling makes the model
  invent a product — `video-qc` catches it (see `references/seedance-dialect.md`).
- **Never auto-publish.** The bot emits the clip + the QC report + (via the shared
  guard) the disclosure text; a human flips the platform AIGC label and uploads.

## When to use

The `base-clip` (phase 1) and optional `variants` rows of the project's `state.md`.
Also invoked directly when asked to "make a product video ad", "animate this
packshot", "turn my product photo into a TikTok/Reels/Shorts clip", or "give me a few
ad-test video variants from this still".

## Read first (READ-BEFORE-WRITE)

Read, in this order:

1. `artifacts/<project>/context.md` — product truth (name, material/color notes,
   target platform, engine, # variants). Optional; defaults below if absent.
2. `artifacts/<project>/inputs/hero.<jpg|png>` — the **required** start frame. This
   is the identity ground-truth every clip is checked against. Confirm it exists and
   is a readable image.

**Required-input gate** (record, don't ask):

- No `inputs/hero.*` on disk → write a failure note in `state.md`
  (`status: blocked`, `next_action: re-run onboarding — inputs/hero missing`) and
  stop. Do **not** invent or generate a product from text alone. If the sibling
  product-photo bot's compliant hero is expected, route the user to produce it first.
- The hero is unreadable / not an image → same clean failure. Do not proceed.

**Defaults for optional inputs:** product name inferred from the hero and recorded as
an assumption; engine `seedance`; move `push-in`; variants `0` (base clip only);
duration `5`; aspect `9:16`.

## Step 0 — Reachability check (attempt, don't gate the engine)

Confirm the engine slug this skill needs is reachable. This is a *reachability
check*, not a switch that changes the pipeline:

```bash
ai-gen info bytedance/seedance-2.0/image-to-video > work/video/seedance-info.json 2>&1 || true
ai-gen info fal-ai/kling-video/v3/standard/image-to-video > work/video/kling-info.json 2>&1 || true
ai-gen balance                                     > work/video/balance-before.txt
```

- If `ai-gen info` errors, attempt the run anyway (the proxy has served models `info`
  could not describe) and let the script record the failure honestly. If the run call
  itself fails, record the phase `blocked` + FLAG — never substitute a different
  product.
- Record the starting balance — cost is read from `ai-gen balance` deltas, **never**
  the `credits_used` JSON field (it over-reports ~8.4× on i2v). See
  `references/seedance-dialect.md`. Video is the most expensive op — confirm the base
  clip PASSES QC before any fan-out.

## Step 1 — The base clip (one slow move, then the BLOCKING QC)

One command builds the strict-product motion prompt, runs the i2v call, and downloads
the mp4 from `files[0].local_path`:

```bash
PRODUCT="<product-name>" ENGINE=seedance MOVE=push-in DURATION=5 ASPECT=9:16 \
scripts/gen-video.sh \
  artifacts/<project>/inputs/hero.jpg \
  artifacts/<project>/01-ad/base.mp4 \
  base
```

What it does (depth in `references/seedance-dialect.md` + `motion-discipline.md`):

1. **Builds the prompt** — `motion-prompt.py` assembles the strict-product formula
   with ONE slow safe move (an aggressive `MOVE` is auto-substituted + recorded in
   `base.mp4.note.json`), the quality suffix, 9:16.
2. **Runs the i2v call** — Seedance `--image <hero>` (→ `image_url`) + `duration=N`,
   in-pass audio native; or Kling with the positional `start_image_url=<hero>` +
   `generate_audio=true`. `--max-cost` guards spend.
3. **Downloads the clip** — copies `files[0].local_path` to `base.mp4` immediately
   (the `*.fal.media` URL expires) and appends to `video-manifest.json` with
   `needs_qc: true`.

Then **run the blocking `video-qc` step (Step 2)** — the clip is NOT ready until it
PASSES. If `gen-video.sh` exits non-zero (engine failed / no file), record the phase
`blocked` + FLAG; do not fan out or spend.

## Step 2 — video-qc (BLOCKING gate on every clip)

Follow `scripts/video-qc.md`. For each clip in `video-manifest.json` with
`needs_qc: true`, do a Claude vision compare of the clip (sample frames) against the
input hero:

- **Product identity** — same product as the hero (color/finish, shape, proportions,
  material)? No swap to a different object, no invented prop/variant.
- **Logo / label stability** — logo/label sharp, correctly placed, unwarped across
  the whole clip? No garbled/melted/drifting text.
- **Motion safety / no artifacts** — one slow move, no melted geometry, jitter,
  morphing edges, compression mush, flicker, or spawned objects?
- **Audio** — if in-pass audio was requested, a clean track with no jarring artifact?
  (Advisory — thin audio is FLAGGED, not a drop.)

Verdict per clip (record in `video-qc.md` with the reason): **pass** (ships, still
never auto-published) / **drift — DROP** (blocking; never shown ready, never fanned
out from, never spent on) / **low-confidence — human review** (reflective / metallic
/ fine-text / fast-subject → ships with a prominent flag). Kling clips get extra
identity scrutiny (a mismatch usually means the start frame did not attach).

Never silently ship a clip that failed QC — that drives both "Color Not as Described"
returns and a Meta "Deceptive Practice" strike, and it is a graded honesty failure.

## Step 3 — Variant fan-out (ONLY after the base clip PASSED, ≤ requested, each QC'd)

Only if `variants > 0` AND the base clip PASSED `video-qc`. Hold the source frame +
the formula constant and change **exactly ONE variable per variant** (the iteration
discipline in `references/motion-discipline.md`):

```bash
# variant A: orbit; B: pull-out; C: lighting swap; D: multi-shot hook arc — change ONE thing each
PRODUCT="<product-name>" ENGINE=seedance MOVE="subtle orbit" DURATION=5 \
scripts/gen-video.sh artifacts/<project>/inputs/hero.jpg \
  artifacts/<project>/01-ad/02-orbit.mp4 orbit
```

- Each variant re-anchors off the **same approved hero** (never off a prior clip —
  drift compounds), and each is itself passed through the blocking `video-qc`.
- A variant that fails QC is **dropped and flagged**, not shipped. The set is
  best-effort: shipping 2 clean variants beats shipping 4 with one drifted clip.

## Step 4 — Hand off to disclosure (the shared guard)

A QC-passed clip is routed to **`bot-022-compliance-guard`** (phase 4 pre-flight) for
the Meta "AI-generated" label + TikTok AIGC toggle text + C2PA stamp + the dated
jurisdiction note. See `references/disclosure-note.md` for the handoff contract: a
`drift`-dropped clip never reaches disclosure; a `low-confidence` clip is routed with
its flag; the bot never auto-applies a platform toggle.

## Outputs

This skill writes exactly these paths (`<project>` = the active product slug) —
declared here and in the frontmatter so paths are never guessed:

- `artifacts/<project>/01-ad/base.mp4` — the 9:16 product video ad (one slow move,
  in-pass audio, real product, stable logo).
- `artifacts/<project>/01-ad/NN-<variant>.mp4` — optional ad-test variants (each QC'd;
  drops/flags recorded).
- `artifacts/<project>/01-ad/video-qc.md` — the per-clip blocking QC report.
- `artifacts/<project>/01-ad/video-manifest.json` — the per-clip record the bot reads
  for the QC gate.

Plus working files under `work/video/` (prompt/note files, raw generations, balance
snapshots, info JSON, optional QC frame extracts) — never under `artifacts/`.

## Update state.md (the ledger is how phases chain)

After the phase completes (or fails), update the project's `state.md` row for
`base-clip` / `variants`: mark `done` (or `blocked` with the reason), refresh
`updated` and `status`, and rewrite `next_action` to the one imperative that is true
now (e.g. "Base clip QC-passed + 2 variants — run phase 4 pre-flight/disclosure" or
"Re-run onboarding: inputs/hero missing"). Then do the Remember step per the bot's
execution loop. Never stop with a stale ledger.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| `inputs/hero.*` missing/unreadable | Record failure in `state.md`, stop. No invented product from text. |
| i2v engine fails / unreachable | Clip cannot be produced → record `blocked` + FLAG. Do NOT substitute a different product or auto-publish a fallback. |
| Generation reported success but no file | Treat as a hard failure for that clip (exit 3) — FLAG, do not fan out or spend. |
| Clip drifts (different product / melted logo) | `video-qc` DROPS it + FLAGS the reason. Re-generate once with push-in/static or the Kling alt; if it drifts again, omit + FLAG. |
| Aggressive camera move requested | `motion-prompt.py` auto-substitutes the closest safe move and records it in `*.note.json`. |
| Kling clip shows a different product | The start frame likely did not attach (Kling needs start_image_url) — re-run preferring Seedance; never ship the mismatch. |
| Reflective / metallic / glass / fine-text product | Clips flagged **low-confidence → human review**; the bot flags, it does not certify. |
| Variants requested but base clip failed QC | Do NOT fan out — fix/re-generate the base clip first. Drift compounds across a set. |
| fal output URL expired | Always use `files[0].local_path` (copied to `base.mp4` immediately); never re-fetch the `*.fal.media` URL. |
| Clip ready but undisclosed | Route through `bot-022-compliance-guard` for the Meta/TikTok label before a human runs it as a paid ad. |

## References

- `references/seedance-dialect.md` — the verified ai-gen 2.1.0 i2v syntax: the engine
  slugs, the per-model start-frame arg (Seedance `--image`→`image_url` vs Kling
  positional `start_image_url`), `duration`/`generate_audio` positional params,
  `files[0].local_path` (objects; URLs expire), ignore `credits_used`, the
  strict-product formula + multi-shot dialect. Read this for the *how* of the call.
- `references/motion-discipline.md` — why only ONE slow move holds the product, the
  SAFE whitelist + the BANNED-and-substituted list, duration/aspect, and the
  change-one-variable variant fan-out loop. Read this for the *how* of motion safety.
- `references/disclosure-note.md` — why an AI product video ad must be labelled (Meta
  undisclosed-UGC = Deceptive Practice; TikTok AIGC) and the handoff contract to the
  shared `bot-022-compliance-guard` for the disclosure pre-flight.
- `scripts/video-qc.md` — the blocking vision-QC procedure (the four dimensions, the
  verdicts, the gating rules) the bot runs on every clip.
