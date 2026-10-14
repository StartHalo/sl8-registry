# Commercial workflows (product hero)

Read this file at step 2 to follow the recipe for the chosen path. The background-replacement recipe is in background-path.md (step 9).

## Hero image from product reference

1. Copy the product image from artifacts/attachments/ to artifacts/<project>/source/ and pass it in the run call with `--ref` (steps 4 and 8; there is no separate upload).

2. Start from the routed edit endpoint in plan.json (fal-ai/nano-banana-pro/edit, fallback openai/gpt-image-2/edit). Search with single keywords only as a fallback (step 3).

3. Inspect schema and choose the fields that preserve product identity.
4. Prompt for surface, lighting, crop, and background. Keep the product
   invariant short and exact.

5. Run with `--queue` into artifacts/<project>/final/. Then rename files[0].local_path to final/hero.png and record its manifest row with that path in files (steps 8 and 10).

6. Reject outputs with altered logos, warped packaging, or invented text.

## Text-to-image product concept

Use when no reference exists or the user wants early creative exploration.

1. Read product category, materials, and brand tone from the brief. When they are missing, use the kit's stated defaults (plastic cue, premium).

2. Generate 2 controlled variants by default, 3 or 4 when the brief asks, as separate calls (a, b, c, d).

3. Keep each variant different by one dimension only: background, lighting,
   camera angle, or prop set.

Take the dimension the brief names, otherwise one the brief leaves open. When the brief fixes all four, vary camera height or lens feel inside camera angle (step 5).

4. Do not pick the strongest frame yourself. Deliver every variant with variant_a as the stated default pick (copied to final/hero.png), open the pick-variant text gate with default a, and let the owner choose.
