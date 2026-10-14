# Background-replacement path (step 9)

Read this file at step 9. The product pixels are never regenerated: the Bria cutout keeps the product as photographed, a generated empty plate supplies the new environment, and composite.py joins them locally.

## The plate prompt

Build it from the Background replacement template in prompt-patterns.md: take its [environment] and [lighting direction], and describe the empty <surface> and <background> seen from the photo's camera height and angle, with the key light from the photo's key-light side, nothing on the surface and no text. The product never enters the plate prompt. Params: the plate block (fal-ai/nano-banana-pro, resolution 2K, aspect_ratio = the declared aspect).

## What composite.py does

- trims the cutout to its alpha bbox and keeps it at native scale;
- sizes the canvas so the product fills about 60% of its height at the declared aspect;
- with `--reserve-top R` (0.2 when copy is supplied), lowers the fill as needed so the product top sits at R times the height or lower, leaving the top band for step 11;
- resizes and centre-crops only the plate, and records plate_scale (above 1 means the 2K plate was up-scaled; the delivery note states the factor);
- draws a blurred contact shadow on the plate, under the product;
- pastes the cutout centred, with its base on the lower-third line;
- writes an RGB PNG and placement.json (bbox, x, y, canvas, effective fill, reserve_top, plate_scale).

Reflections are not synthesized. When the brief asks for one, list 'reflection not produced (composite.py draws a contact shadow only)' under Known gaps.

## What pixdiff.py measures

The max and mean absolute difference between the final and the cutout where the cutout's alpha is 255, and between the final and the original photo when the cutout has the photo's size. Run it on final/hero.png and, after step 11, on final/hero-copy.png. Max 0 is expected. Exit 1 is a measured failure and goes to step 13 (recovery.md, background path).

## Bria replace (brief's explicit instruction only)

fal-ai/bria/background/replace is a generative re-background that may redraw the product. Use it only when the brief orders it: record the HR10 waiver first (step 9), estimate it in step 6 with its own block, run it into final/, and rename and record it in step 10 as item hero, node final. pixdiff.py does not apply; fidelity goes to the owner's review, and the delivery note names the route and the waiver.
