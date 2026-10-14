# Reference-quality examples

# Commercial examples

These are reference-quality prompts. Adapt them to the user's actual product,
files, and selected model schema.

## Skincare serum hero

```text
amber glass skincare serum bottle with matte black dropper, exact label and
packaging preserved from the reference image, standing on pale stone, soft
diffused key light from upper left, thin rim light on glass edges, subtle
water condensation, warm beige background, centered square crop, premium beauty
product photography, no added text, no extra bottles, no warped label
```

For a PDP, read this example through the E-commerce PDP image template. Keep its product invariant, lighting and guardrails; drop the surface and props ('standing on pale stone', 'subtle water condensation'), because the PDP template says no props. The warm beige background becomes the brand-colour cell:

- skeleton: amber glass serum bottle with matte black dropper exactly as in Image 1, the only object, label and packaging unchanged, front-facing, centred, accurate silhouette, soft diffused key light from upper left, thin rim light on the glass edges, high detail, premium clean catalog product photography, plain unlettered surfaces
- white delta: on seamless pure white, full product in frame, realistic soft shadow
- brand-color delta: on seamless warm beige, full product in frame, realistic soft shadow
- close-up delta: close-up crop where the dropper and label fill the frame, on seamless white

The skeleton carries no framing or crop clause, so the close-up cell gets no contradictory instruction.

## Background replacement

```text
preserve the uploaded ceramic coffee mug exactly, replace background with a
bright Scandinavian kitchen counter, soft morning window light from left,
realistic contact shadow and reflection, warm lifestyle product photography,
no new logo, no deformation, no text
```

For a PDP, the kitchen-counter scene belongs to the image/product-lifestyle kit. What carries over is the preservation standard on the pixel-identical path (SKILL.md step 8): the product preserved exactly, a realistic contact shadow, no new logo, no deformation and no text. The background becomes the seamless colour, drawn by composite.py.
