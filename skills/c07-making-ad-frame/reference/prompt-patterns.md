# Commercial prompt patterns (social ad)

# Commercial prompt patterns

Use these as structure, not filler. Replace bracketed details with the user's
product and platform constraints.

## Social ad safe-zone composition

```text
[product] in [scene], subject placed in [left/right/lower third], large clean
negative space on [side] for copy, [platform aspect ratio], strong first-frame
readability, no text generated inside the image
```

Use the next pattern only for the lifestyle frame of an ad creative set, and keep the safe-zone clauses above in it too.

## Product with lifestyle context

```text
[exact product] used in [specific real setting], natural interaction with
[person or environment], product remains sharp and readable, [time of day],
[brand tone], [lens feel], [platform crop], no invented claims, no extra logos
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

This kit's routes (fal-ai/nano-banana-pro, /edit, openai/gpt-image-2, /edit) have no negative_prompt field. Write these components into the prompt's guardrail clause as positive wording, for example 'single intact product, clean background, plain surfaces with no lettering', and note in DELIVERY.md that the exclusion is unenforced.
