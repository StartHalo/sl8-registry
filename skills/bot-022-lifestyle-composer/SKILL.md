---
name: bot-022-lifestyle-composer
description: Drop the approved compliant packshot (or its RMBG cutout) into on-brand and seasonal LIFESTYLE scenes for the PDP and ad creative — product identity locked. This is the GENERATIVE path (fal-ai/nano-banana-pro with the cutout passed via --image as the exact-product reference, plus an optional brand-look via --ref; Seedream v4.5 fallback), so it carries a MANDATORY blocking fidelity-qc gate on every output (a Claude vision compare of the scene against the cutout on product identity/color/shape/label — drop or FLAG drift; the reachable fal edit models have no hard fidelity lock, and a generative re-background once turned a mug into a luggage tag). Use for phase 3 (scenes) of a product project, or whenever asked to make lifestyle scenes, composite the product into a setting, generate seasonal/on-brand backdrops, or build PDP/ad-size scene variants.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-022
  inputs:
    - name: hero
      type: image
      required: true
      description: artifacts/<product>/01-hero/hero.jpg — the APPROVED, fidelity-QC-passed compliant hero (the single identity anchor). The hero is attached as the exact-product reference on EVERY scene. A clean RMBG cutout (work/cutout.png) is preferred as the --image source when present (transparent, composites cleaner); the hero is the fidelity-qc baseline either way.
    - name: scene-brief
      type: text
      required: false
      description: Which scenes/seasons + channel/aspect to render, from context.md. Defaults — one neutral on-brand scene; channel PDP 4:3 + ad 9:16; pick presets from references/scene-presets.md. Headless — never ask; record the default taken in scenes-log.md.
    - name: brand-look
      type: image
      required: false
      description: artifacts/<product>/inputs/brand-look.png — a brand "look" reference (palette/medium/mood) passed via --ref for dual-reference style transfer so the look carries across heterogeneous SKUs. Optional; absent → scene preset language carries the look. See references/brand-kit.md.
    - name: logo
      type: image
      required: false
      description: artifacts/<product>/inputs/logo.png — brand logo, passed as an additional --ref only when a scene must carry the mark legibly (route text-bearing surfaces carefully; see references/brand-kit.md). Optional.
  outputs:
    - name: scenes
      type: image
      path: artifacts/<product>/03-scenes/NN-<scene>-<aspect>.jpg
      description: One image per (scene × requested aspect), in scenes-log order. Every file shipped here has PASSED fidelity-qc; a drifted output is dropped (regenerated) or, if it cannot be recovered, FLAGGED and held out of the shipped set.
    - name: scenes-log
      type: markdown
      path: artifacts/<product>/03-scenes/scenes-log.md
      description: Per scene — preset used, model + effective chain, the composed prompt (file), aspect, fidelity-qc verdict (pass/drift + confidence), and any flag (held output, halo/edge artifact, human-review class). Honest production log; cost from estimate+balance, never credits_used.
---

# Lifestyle Scene Composer (BOT-022 · phase 3)

Take the **approved** hero and place that exact product into believable on-brand /
seasonal lifestyle scenes for the PDP and ad creative — kitchen, desk, outdoor,
golden-hour, holiday — with the product's identity **locked** across the whole set.
Unlike the hero and angle paths, this path is **generative**: a model reinterprets
the scene around the product. That is acceptable for *lifestyle* (the backdrop is
allowed to be synthetic) but it is exactly where the product silently drifts — so
**every output passes a blocking fidelity-qc compare against the hero before it
ships**. The load-bearing PoC finding for this bot: a generative re-background of a
real product once hallucinated a *different* product (a mug became a leather luggage
tag). fidelity-qc is the gate that catches that.

This skill runs **headless**. Never ask the user anything: every optional input has a
default below; a missing required input is a clean recorded failure, not a question.

## Overview

- **Engine:** `fal-ai/nano-banana-pro` (primary — up to 14 refs, holds geometry +
  brand text best, 2K/4K), with `fal-ai/bytedance/seedream/v4.5/text-to-image` as the
  photoreal fallback. The hero/cutout is attached as `--image` (the singular
  `image_url`, the *proven* edit path — verified live 2026-06-19); brand-look / logo
  attach as `--ref` (multi-reference). See `references/hero-reference-lock.md`.
- **Identity is held by language + reference attachment**, not a hard geometry lock —
  so the verbatim "maintain its identical appearance" clause is mandatory and
  `fidelity-qc` is the safety net (`references/scene-presets.md`,
  `references/brand-kit.md`).
- **fidelity-qc is BLOCKING.** A Claude vision compare of every scene against the
  hero on product identity/color/shape/label. `pass` → ships; `drift` → regenerate
  once with re-anchored language, then drop + FLAG. Reflective/metallic/fine-text and
  any product the QC can't confidently clear are **forced to human review** — flagged,
  never certified.
- **Honesty is graded.** `scenes-log.md` records every model, prompt, QC verdict, and
  flag. Never hide a held output, a halo artifact, or a drift.

## When to use

- The `scenes` row in the project's `state.md` (phase 3, after an approved hero
  exists). Also invoked directly: "make lifestyle scenes", "composite the product
  into a kitchen / on the beach / seasonal scene", "build PDP and ad-size variants",
  "put it on a marble counter at golden hour".
- **Not** for the compliant Amazon main image — that is the *deterministic* white-bg
  path (`packshot-generate` → `white-bg-enforce`, phase 1). Never use this generative
  path to re-background the seller's real product for the compliant main image.

## Read first (READ-BEFORE-WRITE)

1. `artifacts/<product>/context.md` — product truth (material/color, brand, target
   scenes/season, channel/aspect overrides).
2. `artifacts/<product>/state.md` — confirm phase 1 (hero) is `done`; this phase
   re-anchors off its output.
3. `artifacts/<product>/01-hero/hero.jpg` — the APPROVED identity anchor. Also
   `01-hero/fidelity-qc.md` (the hero's known low-confidence classes carry forward).
4. `artifacts/<product>/inputs/brand-look.png` and `logo.png` — if present.

**Required-input gate** (record, don't ask):

- `01-hero/hero.jpg` missing, or the hero's `fidelity-qc.md` says the hero itself
  failed/was held → there is no approved anchor; write a blocked note in `state.md`
  (`next_action: re-run phase 1 — approved hero missing`) and stop. Never composite
  off an unapproved hero.
- No scene brief → use the defaults (one neutral on-brand scene; PDP 4:3 + ad 9:16);
  record the default taken in `scenes-log.md`.

## Steps

### Step 1 — Confirm the engine + cutout

Smoke-confirm the engine is reachable and prep the cleanest source for compositing:

```bash
ai-gen info fal-ai/nano-banana-pro >/dev/null && echo "nano-banana-pro reachable"
ai-gen estimate fal-ai/nano-banana-pro    # cost reference (NOT credits_used)
```

- Prefer a transparent **cutout** as the `--image` source — it composites cleaner
  (no background to fight). If `work/cutout.png` does not exist, make one from the
  hero with Bria RMBG (pixel-faithful, verified):

  ```bash
  scripts/compose-scene.sh --make-cutout artifacts/<product>/01-hero/hero.jpg work/cutout.png
  ```

  If RMBG is unreachable, fall back to passing `01-hero/hero.jpg` directly as
  `--image` (it has a true-white background already) — note the fallback in the log.
- The hero (`01-hero/hero.jpg`) is **always** the fidelity-qc baseline, regardless of
  which file was passed as `--image`.

### Step 2 — One image per (scene × aspect)

For each requested scene preset and each requested aspect, in `scenes-log` order:

**2.1 Compose the scene prompt.** Save it to
`work/scenes/NN-<scene>-<aspect>.prompt.txt`. Anatomy (depth in
`references/scene-presets.md`):

- **Line 1 — identity lock, verbatim, always first:**

  > Using the attached image as the exact product to feature — maintain its identical appearance: same color, label, proportions, and material. Do not add, remove, or invent any product detail.

- **Line 2 — the scene**, from the preset (setting + light + props + composition),
  e.g. *"Place this product on a sunlit marble kitchen counter, soft morning window
  light, a eucalyptus sprig to one side, generous negative space on the right for
  text overlay."* For an ad/banner aspect, keep negative space for copy.
- **Line 3 — brand-look clause** only when `--ref brand-look.png` is attached
  (`references/brand-kit.md`): *"Match the palette, mood, and rendering style of the
  brand-look reference."*
- **Line 4 — negatives, verbatim:**

  > Photoreal commercial product photography, not illustration. No text or watermark unless on the product itself. No halo or cutout edge artifacts; the product sits naturally in the scene with correct contact shadow and scale.

Why verbatim line 1: the hero/cutout is the anchor the model conditions on, and the
"maintain its identical appearance" clause is the only identity discipline the
reachable models honor — paraphrasing it is how drift starts (the deep-dive's #1
failure).

**2.2 Generate** via the composer (walks nano-banana-pro → Seedream v4.5; attaches
the cutout as `--image` and brand-look/logo as `--ref`; downloads the local file
immediately because fal URLs expire; `--max-cost` guard):

```bash
scripts/compose-scene.sh \
  work/scenes/NN-<scene>-<aspect>.prompt.txt \
  work/cutout.png \
  <aspect e.g. 4:3|9:16|1:1|16:9> \
  artifacts/<product>/03-scenes/NN-<scene>-<aspect>.jpg \
  [--ref artifacts/<product>/inputs/brand-look.png] [--ref artifacts/<product>/inputs/logo.png]
```

On success it prints `model<TAB>path` — record the model that produced each scene. Its
stderr discloses anything the log must carry (a model that ignored an aspect, a
fallback walk). Env knobs: `SCENE_RESOLUTION` (2K default; 4K for hero banners),
`SCENE_MAX_COST`, `SCENE_CHAIN`.

**2.3 fidelity-qc — the blocking gate.** Compare the scene against the hero:

```bash
scripts/fidelity-qc.py \
  --candidate artifacts/<product>/03-scenes/NN-<scene>-<aspect>.jpg \
  --reference artifacts/<product>/01-hero/hero.jpg \
  --out work/scenes/NN-<scene>-<aspect>.qc.json
```

It writes a verdict JSON (`{verdict: pass|drift|review, confidence, findings, dims:{identity,color,shape,label,surface}}`).

- `verdict: pass` (confidence ≥ threshold) → the scene ships; record the verdict.
- `verdict: drift` → the product changed (different shape/label/color, or it became a
  different product). **Do not ship it.** Regenerate ONCE with a re-anchored prompt
  (strengthen line 1, reduce scene reinterpretation), then re-QC. If it still drifts,
  **drop the output** (move it to `work/scenes/rejected/`) and FLAG the scene in the
  log as unrecoverable drift.
- `verdict: review` (reflective/metallic/fine-text, or low confidence) → ship the
  output but **FLAG it for human review** in the log; never certify it.

A scene with no `pass` (or `review`) output is held out of the shipped set, plainly
flagged — never silently shipped.

### Step 3 — Write scenes-log.md (honesty is graded)

Write `artifacts/<product>/03-scenes/scenes-log.md`. Never hide a held output, a
drift, a halo artifact, or a human-review flag — the seller decides what to publish
based on this file. Cost from `ai-gen estimate` + `ai-gen balance` deltas, never the
over-reporting `credits_used`.

```markdown
# Scenes Log — <product>

Anchor: 01-hero/hero.jpg (approved) · source for --image: work/cutout.png (RMBG) | hero.jpg
Engine: fal-ai/nano-banana-pro · fallback: fal-ai/bytedance/seedream/v4.5/text-to-image

## Scenes
| file | preset | aspect | model | fidelity-qc | flags |
| 03-scenes/01-kitchen-4x3.jpg | kitchen-morning | 4:3 | fal-ai/nano-banana-pro | pass (0.91) | none |
| 03-scenes/02-golden-hour-9x16.jpg | outdoor-golden-hour | 9:16 | fal-ai/nano-banana-pro | review (0.74) | metallic surface → human review |
| (held) 03-kitchen-4x3 | kitchen-morning | 4:3 | seedream-v4.5 | drift (0.38) | product shape changed; regen drifted again → DROPPED |

## Notes
- prompts: work/scenes/NN-*.prompt.txt · QC verdicts: work/scenes/NN-*.qc.json
- cost: ai-gen balance delta ≈ <n> cr (credits_used ignored)
- <every held/dropped output, halo artifact, aspect ignored by a model, human-review class — plainly>
```

### Step 4 — Update state.md (the ledger is how phases chain)

Update the `scenes` row: mark `done` (or `blocked` with the reason), refresh
`updated`/`status`, and rewrite `next_action` to the one imperative that is true now
(e.g. "Run phase 4: pre-flight + disclosure on the scene set" or "Re-run phase 1:
approved hero missing"). Then do the Remember step per the bot's execution loop.
Never stop with a stale ledger.

## Outputs

This skill writes exactly these paths (`<product>` = the active product slug) —
declared here and in the frontmatter so paths are never guessed:

- `artifacts/<product>/03-scenes/NN-<scene>-<aspect>.jpg` — one shipped scene per
  (preset × aspect), zero-padded `NN` in `scenes-log` order; every shipped file
  passed (or is review-flagged by) fidelity-qc.
- `artifacts/<product>/03-scenes/scenes-log.md` — the honest production log.

Plus working files under `work/scenes/` (prompts, QC JSONs, rejected drifts) and
`work/cutout.png` — never under `artifacts/`.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| `01-hero/hero.jpg` missing / hero not approved | Record `blocked` in `state.md`, stop. Never composite off an unapproved hero. |
| RMBG cutout unreachable | Pass `01-hero/hero.jpg` directly as `--image`; note the fallback. |
| nano-banana-pro fails for a scene | Next model in chain (Seedream v4.5), in order. Never out-of-chain. |
| All models fail for a scene | Skip that (scene × aspect) + FLAG; the rest of the set still ships. |
| fidelity-qc verdict `drift` | Regenerate once re-anchored; still drift → drop to `work/scenes/rejected/` + FLAG. Never ship drift. |
| fidelity-qc verdict `review` (reflective/metallic/fine-text/low-confidence) | Ship + FLAG for human review; never certify. |
| Model ignores requested aspect | Keep the output if QC passes; FLAG the aspect mismatch (a human can crop). |
| `IMAGE_SAFETY` rejection (apparel/people in scene) | Reframe to product-on-prop / no-person; if still rejected, skip + FLAG. |
| fal output URL expired | Never read the URL — `compose-scene.sh` downloads `files[0].local_path` immediately. |

## References

- `references/scene-presets.md` — the style-pack: image-anchored kitchen / desk /
  outdoor / golden-hour / marble / holiday-seasonal presets, each with setting +
  light + props + composition language and the aspect notes for PDP vs ad. **Read
  this to pick and compose a scene.**
- `references/brand-kit.md` — palette / font / logo lock: how to attach brand-look and
  logo as `--ref` for dual-reference style transfer, and how to keep the look
  consistent across heterogeneous SKUs without garbling label text.
- `references/hero-reference-lock.md` — the identity-lock discipline: generate the
  hero first (phase 1), then attach it as the exact-product reference on every scene
  with the verbatim "maintain its identical appearance" clause; why `--image`
  (singular `image_url`) is the proven anchor and `--ref` is multi-reference.
