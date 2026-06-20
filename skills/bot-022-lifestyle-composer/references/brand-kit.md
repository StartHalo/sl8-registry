# Brand kit — palette / font / logo lock across SKUs

How to carry a brand's established **look** (palette, medium, mood) and **marks**
(logo) across heterogeneous SKUs, using multi-reference conditioning. This is what
makes the bottle in scene 12 feel like the same catalog as the mug in scene 3.

## The reference roles (verified ai-gen 2.1.0 mapping)

- `--image <cutout|hero>` → the SINGULAR `image_url`: **the exact product to feature**.
  Always the approved hero/cutout. One per call.
- `--ref <path|url>` (repeatable) → **multi-reference** conditioning: brand-look
  reference(s), logo. Consumed by `fal-ai/nano-banana-pro` (up to 14 refs). The
  Seedream v4.5 fallback does **not** take refs — `compose-scene.sh` drops them on the
  fallback path and says so in stderr; for brand-look-critical work, stay on
  nano-banana-pro.

Do NOT pass the brand-look as `--image` — that would make the model try to *reproduce
the brand-look image* instead of *your product*. Product = `--image`; look = `--ref`.

## Dual-reference style transfer (the catalog-consistency move)

To apply a brand's palette/medium/mood to a new product, attach a brand-look reference
and add the **brand-look clause** (Line 3 in the scene prompt):

> Match the palette, mood, and rendering style of the brand-look reference.

Command shape (nano-banana-pro):

```bash
compose-scene.sh work/scenes/NN-kitchen-4x3.prompt.txt work/cutout.png 4:3 \
  artifacts/<product>/03-scenes/NN-kitchen-4x3.jpg \
  --ref artifacts/<product>/inputs/brand-look.png
```

The deep-dive's source pattern (Replicate's `[@]img1` convention) is the same idea
expressed as inline tokens; on the `ai-gen` path we express it as a `--ref` attachment
plus the plain-language clause above (no `[@]` token needed — the CLI maps `--ref` to
the model's reference array). Keep the clause directional, not absolute: "match the
palette and mood", not "make it look exactly like the reference" (which fights the
product lock).

## Logo

Attach a logo only when a scene must visibly carry the mark (e.g. a branded banner):

```bash
compose-scene.sh ... --ref artifacts/<product>/inputs/brand-look.png \
                     --ref artifacts/<product>/inputs/logo.png
```

CAUTION — **text fidelity is fragile**:

- nano-banana-pro renders text and logos far better than FLUX/Seedream (FLUX/Seedream
  garble embedded text — KB image-generation-models). For any scene where a logo or
  label must be **legible**, stay on nano-banana-pro and expect `fidelity-qc.py` to be
  strict on the `label` dimension.
- If the logo or label comes back garbled, that is `drift` on `label` → regenerate; if
  it still garbles, FLAG for human review (a designer overlays the real logo). The bot
  never ships an illegible/garbled mark as if it were correct.
- A logo with fine type is a **fine-text class** → likely a `review` verdict by design.

## Palette / font consistency across a catalog

- Use the SAME brand-look reference for every SKU in a campaign so the palette/mood is
  shared — that, plus the per-product hero lock, is the catalog-consistency mechanism.
- Consistency degrades past catalog scale (deep-dive §5: batch drift / halo artifacts
  reported past ~50 SKUs on lower-tier tools). The bot's defense is per-output
  fidelity-qc + the shared brand-look ref, not a promise of pixel-identical batches.
- Fonts: the model will not reliably reproduce a specific brand font in-scene. Treat
  scene typography as placeholder; real copy/fonts are overlaid downstream by a human
  or the listing tool. The bot's negatives already say "No text or watermark unless on
  the product itself" — keep generated text off the scene.

## What stays out of the scene

- No invented product detail (the `--image` is the source of truth; the preset
  describes only the world around it).
- No auto-applied watermark, price, or marketing copy — the bot emits clean scenes;
  disclosure + copy are downstream (phase 4 / human).
- No claim that a scene is C2PA-verified on the fal path (deep-dive §5: C2PA is not
  guaranteed on fal). Provenance is the disclosure skill's job, per output.
