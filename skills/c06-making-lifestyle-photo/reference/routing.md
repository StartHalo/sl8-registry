# Routing lines behind the model choice (SKILL.md step 4)

# Routing lines behind the model choice

These are fal's routing lines, which this kit's model choice comes from. The SL8 choice and its reasons are in SKILL.md, Model choice.

### Premium still images

Use for commercial stills, realistic product scenes, editorial photography,
cinematic keyframes, and high-quality visual concepts.

- More realistic output: `openai/gpt-image-2`.
- High-quality styled output: `openai/gpt-image-2`.
- One step down: `fal-ai/nano-banana-pro`.
- Strong cheaper alternative: `fal-ai/nano-banana-2`.

### Fast draft images

Use for quick concepts, mood options, rough composition, and cheap iteration.

- `fal-ai/flux-2/klein/9b`

Do not use fast draft output as final commercial delivery unless the user asks.

## Image editing

Use for background replacement, relighting, cleanup, object changes, product
placement, outfit changes, character edits, and multi-image composition.

1. `fal-ai/nano-banana-pro/edit`
2. `openai/gpt-image-2/edit`
3. `fal-ai/bytedance/seedream/v5/lite/edit`

For product fidelity, also consider:

- `fal-ai/nano-banana-pro`
- `fal-ai/nano-banana-2`
- `fal-ai/bytedance/seedream/v5/lite/text-to-image`
- `fal-ai/nano-banana-2/edit`

On SL8:

- A job with a product photo and a reference scene is a multi-reference composite. It goes to `openai/gpt-image-2/edit` first (the Studio's multi-reference row).
- The draft route is `fal-ai/flux/schnell`. It is used only by the test harness, to make a fixture.
- The Seedream v5 lite ids live unprefixed (`bytedance/seedream/v5/lite/edit`, `bytedance/seedream/v5/lite/text-to-image`); the `fal-ai/` prefixed ids above drifted.
- Seedream and `fal-ai/nano-banana-2` (with its edit route) are not used by this kit, because their SL8 price is unmeasured. If a brief names one, estimate first (HR5).
