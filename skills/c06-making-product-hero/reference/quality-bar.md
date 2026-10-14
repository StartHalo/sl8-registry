# Quality bar (product hero)

Read this file at step 12. Measured items cite their command; the rest go to the owner's review on qc/contact.jpg.

Before returning, check:

- Product shape, logo, material, and color are not invented or distorted.
- The composition leaves enough room for platform crop and optional copy.
- Background props support the product and do not compete with it.
- Any generated text is absent or intentionally controlled.
- Lighting makes sense for the product material.

- Output paths are from `files[].local_path`, not manually curled URLs, and every generation and local step has a manifest row (`manifest.mjs verify` exits 0).

- The product is the only hero object: no extra products, and no hands unless requested (owner review).
- Each variant differs from variant_a in one named dimension only, and variant_a keeps every clause of the brief (owner review against the prompts in the manifest).
- On the background path, pixdiff.py prints max 0 where the cutout's alpha is 255, on final/hero.png and on final/hero-copy.png.
- Copy, when supplied, is composited unclipped and, on the background path, clear of the product bbox (overlay.py exit 0).
- A requested reflection is listed under Known gaps, never claimed; the contact shadow goes to the owner.
- No em dashes in the prompts (`grep -n '—' work/<project>/*.params.json` prints nothing).
- Spend stays within the quoted total, and nothing is spent after a Stop answer (`manifest.mjs budget`, `gate.mjs status`).
- PROGRESS.md has six `## ` sections, and outcome.json exists.

If the result misses product fidelity, switch from text-only generation to a
reference or edit workflow before retrying.
