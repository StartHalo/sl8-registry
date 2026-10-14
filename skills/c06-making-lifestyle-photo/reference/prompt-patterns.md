# Lifestyle prompt patterns (SKILL.md step 6)

# Commercial prompt patterns

Use these as structure, not filler. Replace bracketed details with the user's
product and platform constraints.

In this kit (SKILL.md step 6), generated-scene fills Product with lifestyle context. The photo option uses Background replacement as written, plus only the setting, time of day, brand tone, lens feel and platform crop clauses of the lifestyle pattern. The product is never altered. Apply the material cue that fits the product to the lighting clause.

## Product with lifestyle context

```text
[exact product] used in [specific real setting], natural interaction with
[person or environment], product remains sharp and readable, [time of day],
[brand tone], [lens feel], [platform crop], no invented claims, no extra logos
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

On SL8, neither fal-ai/nano-banana-pro (with its edit route) nor openai/gpt-image-2 (with its edit route) has a negative_prompt field; confirm this in step 5. Turn the relevant components into positive guardrail clauses, for example "label stays exactly as in the reference, single product, full product in frame".
