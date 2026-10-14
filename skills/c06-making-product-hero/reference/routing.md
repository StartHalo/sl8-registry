# Model routing (product hero)

Read this file at step 2. On SL8 this kit runs the Studio defaults that SL8 has measured, with fal's pick as the named alternative. Step 2 writes the route and fallback to plan.json.

| Path | Route | Fallback | Why |
|---|---|---|---|
| Text, realistic or stylized | fal-ai/nano-banana-pro | openai/gpt-image-2, quality=high | Nano Banana Pro is SL8's incumbent for stills (37.5 cr against 52.75). fal puts gpt-image-2 first for premium realistic and stylized stills; the two have not been compared on SL8 (IMG-L29). The test run uses nano-banana-pro |
| From product photo | fal-ai/nano-banana-pro/edit | openai/gpt-image-2/edit, when label or packaging text or geometry must hold | fal's and the Studio's first pick: fast, strong product fidelity |
| Background replacement | fal-ai/bria/background/remove, plus a fal-ai/nano-banana-pro empty plate (2K) and a local composite | fal-ai/bria/background/replace, only on the brief's instruction (HR10 waiver, named in the delivery note) | only a cutout composite keeps the product pixels unchanged; a generative re-background redraws the product |
| Fast draft | fal-ai/flux/schnell | fal-ai/flux-2/klein/9b (fal's draft pick) | the only draft model SL8 has verified (about 2 cr); never the final delivery |

Resolution is 1K by default; 2K only when the final must carry small readable detail, priced first. fal's own order follows, kept as the alternatives. In this kit exact copy is never generated (HR10): the text-heavy line below only says when 2K is worth its price.

- Text-heavy ads, labels, posters, UI mockups, packaging copy, and
  infographics: use `openai/gpt-image-2` at `quality=high`. Prefer 2K or 4K
  when the final must carry small readable details. Treat this as expensive.
- Premium realistic stills: use `openai/gpt-image-2`.
- Premium stylized stills: use `openai/gpt-image-2`, then
  `fal-ai/nano-banana-pro`, then `fal-ai/nano-banana-2`.
- Fast draft stills: use `fal-ai/flux-2/klein/9b`.
- Image edits: use `fal-ai/nano-banana-pro/edit`, then
  `openai/gpt-image-2/edit`, then `fal-ai/bytedance/seedream/v5/lite/edit`.
- Product fidelity: use `fal-ai/nano-banana-pro`, `fal-ai/nano-banana-2`, or
  `fal-ai/bytedance/seedream/v5/lite/text-to-image`; use the matching edit
  endpoint when a product reference image exists.

On SL8, fal-ai/nano-banana-2 and both Seedream v5 lite routes are not routed: they are unmeasured on SL8, and the fal-ai/ prefixed Seedream ids have drifted (Seedream v5 now lives at bytedance/seedream/v5/...).

### Fast draft images

Use for quick concepts, mood options, rough composition, and cheap iteration.

- `fal-ai/flux-2/klein/9b`

Do not use fast draft output as final commercial delivery unless the user asks.

On SL8 the draft route is fal-ai/flux/schnell, and draft output is final only when the brief says so; otherwise nothing goes to final/.
