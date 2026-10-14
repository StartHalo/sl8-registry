# Reveal and hero-frame recipes

# Commercial workflows

## Text-to-image product concept

Use when no reference exists or the user wants early creative exploration.

1. Read product category, materials, and brand tone from the brief; when missing, infer them from the product name and use brand tone premium.

2. Generate 2 to 4 controlled variants if the model supports count.
3. Keep each variant different by one dimension only: background, lighting,
   camera angle, or prop set.

4. Pick the strongest frame before moving to video: with one variant (the default) it is the hero; with budgeted variants, animate the one the brief names, otherwise hero-a, and list the others for the owner's pick.

## Product reveal video

1. Create a still hero frame or upload the user's approved product frame.

2. Confirm the routed image-to-video endpoint with `ai-gen info` and the raw OpenAPI printer (SKILL step 2), and inspect `duration`, `aspect_ratio`, image
   input, seed, and motion controls.

3. Keep motion simple: push-in, turntable, parallax, reveal, pour, unwrap.

4. Run async, then fetch with `ai-gen result <request-id>` (SKILL step 7).

5. If the product changes shape, reduce motion and strengthen identity
   constraints.
