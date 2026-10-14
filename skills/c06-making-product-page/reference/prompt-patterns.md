# PDP prompt patterns

# Commercial prompt patterns

Use these as structure, not filler. Replace bracketed details with the user's
product and platform constraints.

## Prompt build order

Write prompts in this order so commercial intent stays clear:

1. Product invariant: exact object, material, color, packaging, scale.
2. Commercial role: hero image, PDP image, launch teaser, demo shot, social ad.
3. Setting: surface, background, props, environment, distance from product.
4. Lighting: softbox, strip light, rim light, backlight, caustics, practicals.
5. Camera: angle, focal length feel, macro, depth of field, motion if video.
6. Composition: centered, negative space, safe zone, text-free area, platform.
7. Brand tone: premium, clean, clinical, bold, energetic, warm, editorial.
8. Guardrails: preserve logo and packaging, no extra text, no distorted labels.

Do not promise claims like "best", "clinically proven", "50 percent faster",
or celebrity endorsements unless the user provides that copy.

In SKILL.md step 4, the setting (background) and any crop go into each cell's one delta clause; every other element of the order goes into the skeleton that all cells share word for word.

## E-commerce PDP image

```text
[exact product] centered on seamless [background color], front-facing,
accurate silhouette, even softbox lighting, realistic shadow, high detail,
no props, no decorative text, clean product catalog photography
```

How SKILL.md step 4 uses this template: product, front-facing, accurate silhouette, high detail, lighting and catalog role go into the skeleton. `seamless [background color]`, any crop, 'full product in frame' (full-product cells only) and 'realistic shadow' form each cell's delta clause. 'No props, no decorative text' become positive guardrails (see the negative prompt note below).

## Product material cues

- Glass: backlight, rim light, caustics, transparent edges, controlled
  reflections.
- Metal: strip highlights, hard rim, dark flags, precise specular lines.
- Plastic: softbox, clean shadow, realistic molded edges, no over-gloss.
- Fabric: side light, visible weave, natural folds, accurate color.
- Food: soft directional light, steam or condensation only when plausible.
- Jewelry: macro lens feel, dark cards, crisp sparkle, controlled highlights.

## Negative prompt components

Use only when the selected model supports a negative prompt:

```text
extra text, fake logo, misspelled label, deformed packaging, duplicated
product, cropped product, warped geometry, bad reflections, messy background,
unreadable brand mark, synthetic hands, low resolution
```

On SL8, `fal-ai/nano-banana-pro` and its edit route have no `negative_prompt` field. Turn these components into positive clauses in the skeleton's guardrails ('the only object', 'label and packaging unchanged', 'accurate silhouette', 'plain unlettered surfaces') and note in PROGRESS.md that the model does not enforce the exclusion. 'Cropped product' is handled by the full-product deltas ('full product in frame'), never by the skeleton, because close-up cells crop on purpose.

## Background replacement

```text
keep the uploaded product exactly unchanged, replace only the background with
[environment], match reflections and contact shadows, [lighting direction],
commercial product photography, no product deformation, no added labels
```

On the pixel_identical path (SKILL.md step 8) this pattern is carried out without a prompt: a Bria cutout, then `${CLAUDE_SKILL_DIR}/scripts/composite.py`. [environment] is the seamless `background_color`. The canvas is sized from the cutout's alpha box so the product fills at most 80% of each side and is placed unscaled. The script draws a soft contact shadow (a dark copy of the cutout's alpha at 35% opacity, offset down, GaussianBlur) and layers everything with `alpha_composite`, so edge pixels keep their true colour and alpha. If it ever has to scale the product it prints 'scaled product' on stderr, which step 8 reports as RESAMPLED.
