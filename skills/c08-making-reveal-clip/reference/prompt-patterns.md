# Prompt patterns for the product reveal

# Commercial prompt patterns

Use these as structure, not filler. Replace bracketed details with the user's
product and platform constraints.

Step 4 fills the Product reveal video template for the motion prompt, and the Product hero image template when the hero frame is generated (step 6 runs it). Both follow the Prompt build order in SKILL.md step 4.

## Product reveal video

```text
[duration] second product reveal of [product], starts with [opening frame],
camera [movement], product rotates or reveals [feature], [lighting change],
[background motion], premium commercial pacing, product remains centered and
undistorted, no text, no logo morphing
```

## Product hero image

```text
[exact product] as the only hero object, [material and color], placed on
[surface], [background], [lighting setup], [camera angle and lens feel],
[composition and crop], premium commercial product photography, clean edges,
accurate packaging, no extra text, no fake labels, no hands unless requested
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

On SL8, no Seedance route has a negative_prompt field. On the final route, write these as positive clauses (for example 'label stays flat and legible as in the frame') and report them as unenforced.
