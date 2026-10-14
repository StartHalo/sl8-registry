# Commercial prompt patterns (product hero)

Read this file at step 5. Use the Product hero image template on the text and edit paths. Use the Background replacement template's environment and lighting direction for the empty plate (background-path.md). Take the lighting from the material cue for the product's material.

Use these as structure, not filler. Replace bracketed details with the user's
product and platform constraints.

## Product hero image

```text
[exact product] as the only hero object, [material and color], placed on
[surface], [background], [lighting setup], [camera angle and lens feel],
[composition and crop], premium commercial product photography, clean edges,
accurate packaging, no extra text, no fake labels, no hands unless requested
```

## Background replacement

```text
keep the uploaded product exactly unchanged, replace only the background with
[environment], match reflections and contact shadows, [lighting direction],
commercial product photography, no product deformation, no added labels
```

## Product material cues

- Glass: backlight, rim light, caustics, transparent edges, controlled
  reflections.
- Metal: strip highlights, hard rim, dark flags, precise specular lines.
- Plastic: soft diffused key light, clean shadow, realistic molded edges, no over-gloss.
- Fabric: side light, visible weave, natural folds, accurate color.
- Food: soft directional light, steam or condensation only when plausible.
- Jewelry: macro lens feel, dark cards, crisp sparkle, controlled highlights.

## Negative prompt components

Use only when the selected model supports a negative prompt:

```text
extra text, fake logo, misspelled label, deformed packaging, duplicated
product, cropped product, warped geometry, bad reflections, messy background,
unreadable brand mark, synthetic hands, low resolution, softbox, light stand,
reflector, backdrop edge, studio equipment
```

On SL8 only fal-ai/bria/background/replace takes negative_prompt. fal-ai/nano-banana-pro, its edit route, openai/gpt-image-2 and its edit route, and the FLUX draft routes have no such field, so write each component as a positive clause (single product fully in frame, clean geometry, intact packaging, clean background, sharp detail, no studio equipment in frame (no softboxes, stands, reflectors or backdrop edges)), and note in the delivery note that these exclusions are unenforced.
