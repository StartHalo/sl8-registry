# PDP workflows

# Commercial workflows

## E-commerce batch

1. Build a base prompt with exact product invariants.
2. Create a small matrix: white background, brand-color background, lifestyle,
   scale/detail, packaging close-up.

On SL8 the lifestyle cell is not made here: it is flagged in PROGRESS.md as a hand-off to the image/product-lifestyle kit. If the brief gives no brand colour, skip the brand-color cell and flag the skip. The base prompt is the invariant skeleton of SKILL.md step 4; each cell adds one delta clause.

3. Use consistent output naming: read the downloaded path from `files[0].local_path`, rename the file to `<cell>_<request_id>_a<attempt>.png` under `artifacts/<project>/final/`, and put that path in the manifest row's `files` (SKILL.md step 6).

4. Return a table of output path, concept, endpoint, and notable defects.

On SL8 the table goes in the Pipeline section of `artifacts/<project>/PROGRESS.md`, with request id and credits columns added, backed by `manifest.json`.

Do not generate legal claims, pricing, discounts, or health claims unless the
user supplies the exact copy.

This rule comes from the source's ad creative set and applies to every PDP prompt. Copy the brief supplies is never generated in the image; it is recorded as a debt for media-photo-editing. When a packshot exists, every cell follows the hero-from-reference recipe below, with the PDP template in place of a hero setting.

## Hero image from product reference

1. Pass the product image (`artifacts/<project>/source/<packshot>`) in the same `ai-gen run` call with `--ref` (SKILL.md steps 2 and 6).

2. Start from the routed edit endpoint (`fal-ai/nano-banana-pro/edit`), and search with single keywords only if it fails (SKILL.md step 3).

3. Inspect schema and choose the fields that preserve product identity.
4. Prompt for surface, lighting, crop, and background. Keep the product
   invariant short and exact.

5. Run with `--queue --strict-params` and `-o artifacts/<project>/final/`, rename the file, and write the manifest row (SKILL.md step 6).

6. Reject outputs with altered logos, warped packaging, or invented text.

On SL8 the agent does not reject on its own judgement: such defects are listed for the owner's review on qc/contact.jpg (HR14). Only a measured media-qc failure triggers a retry (SKILL.md step 10).

## Text-to-image product concept

Use when no reference exists or the user wants early creative exploration.

1. Read product category, materials, and brand tone from the brief. If they are missing, infer category and materials from the product name, and use the default brand tone: clean, minimal catalog.

2. Generate 2 to 4 controlled variants if the model supports count.
3. Keep each variant different by one dimension only: background, lighting,
   camera angle, or prop set.

4. Before batch production, take the white base frame from SKILL.md step 6 as the reference (index 0 when several variants were made). The owner judges which frame is strongest from qc/contact.jpg. Variants run only when the brief asks and the budget covers them; the default is 1. For a PDP, prop-set variants do not apply, because the template says no props.
