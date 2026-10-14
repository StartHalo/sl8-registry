# Lifestyle workflow notes (SKILL.md steps 2, 6 and 12)

# Commercial workflows

## Hero image from product reference

In this kit the photo option follows this workflow, with the lifestyle setting in place of the hero surface.

1. Put the product image into the run call with `--ref` (SKILL.md steps 3 and 8). There is no upload step.

2. Start from this kit's routed edit endpoint (SKILL.md step 4). Search only when it is missing, one keyword at a time (SKILL.md step 5).

3. Inspect schema and choose the fields that preserve product identity.
4. Prompt for surface, lighting, crop, and background. Keep the product
   invariant short and exact.

5. Run queued into `artifacts/<project>/final/`, then rename from `files[0].local_path` (SKILL.md steps 8 and 9).

6. Reject outputs with altered logos, warped packaging, or invented text.

## Text-to-image product concept

Use when no reference exists or the user wants early creative exploration.

1. Read product category, materials, and brand tone from the brief. When one is missing, use the kit's defaults table.

2. Generate 2 to 4 controlled variants only when the brief asks for them. The default is 1, because each variant is a separate bill (HR5). Each variant is one ai-gen call (num_images 1), named lifestyle-02 to lifestyle-04, and all quotes are added up before the first submit.

3. Keep each variant different by one dimension only: background, lighting,
   camera angle, or prop set.

4. Deliver every variant; the owner picks the strongest frame.

## Ad creative set

Produce separate assets for:

- Lifestyle frame: human or environmental context.

Do not generate legal claims, pricing, discounts, or health claims unless the
user supplies the exact copy.
