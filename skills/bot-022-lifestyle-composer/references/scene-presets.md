# Scene presets — the lifestyle style-pack

Image-anchored scene presets for `compose-scene.sh`. Each preset gives the **Line 2**
scene language (setting + light + props + composition) for the 4-line scene prompt
(anatomy in `SKILL.md` Step 2.1). Line 1 (the verbatim identity lock) and Line 4 (the
verbatim photoreal/no-halo negatives) are constant across all presets. Compose, never
paraphrase Line 1.

The product is always conditioned by the `--image` cutout/hero — the preset describes
the **world around** the product, not the product itself. Never write product detail
into a preset (no "with a glossy red lid" unless that is the real product) — inventing
detail is what `fidelity-qc.py` rejects.

## How to use

1. Pick a preset that matches the brand/season/channel (default: `kitchen-morning`,
   one neutral on-brand scene).
2. Paste its **Scene line** as Line 2. Optionally specialize the bracketed slots
   (`[product noun]`, `[prop]`) from `context.md`, but keep them generic — the model
   gets the product from the `--image`, not the words.
3. Pick the aspect per channel (table below). Render one image per (preset × aspect).
4. Always run `fidelity-qc.py` on the output before it ships.

## Aspect by channel

| Channel | Aspect | Note |
|---|---|---|
| Amazon / Shopify PDP secondary | `4:3` or `1:1` | square is safest on marketplaces |
| Collection / hero banner | `16:9` or `3:2` | leave negative space one side for copy |
| Meta / TikTok / Stories ad | `9:16` | vertical; keep product in the upper-center safe zone |
| Pinterest / tall PDP | `3:4` | |

`--aspect-ratio` accepts the nano-banana-pro set: `21:9 16:9 3:2 4:3 5:4 1:1 4:5 3:4
2:3 9:16`. If a model ignores the requested aspect, keep the output if QC passes and
FLAG the mismatch (a human can crop).

## Presets

### kitchen-morning (default, neutral on-brand)
> Scene: Place this product on a sunlit marble kitchen counter, soft morning window
> light from the left, a small eucalyptus sprig and a folded linen napkin to one side,
> shallow depth of field, generous negative space on the right for text overlay.

Good for: food, beverage, kitchenware, wellness, home goods. PDP 4:3 / 1:1.

### desk-workspace
> Scene: Place this product on a clean modern wood desk beside a laptop edge and a
> ceramic coffee cup, bright diffused daylight, minimal Scandinavian styling, soft
> shadow, calm muted palette.

Good for: tech accessories, stationery, office, supplements. PDP 4:3, banner 16:9.

### outdoor-golden-hour
> Scene: Place this product outdoors on a weathered wooden surface at golden hour, warm
> low sun backlight with a gentle lens flare, soft bokeh of greenery behind, natural
> long shadow.

Good for: outdoor, beverage, beauty, lifestyle. Ad 9:16, banner 16:9. NOTE: strong
backlight can wash label text — if the product has fine text, expect a `review` verdict
and prefer `desk-workspace` or `kitchen-morning`.

### beach-coastal
> Scene: Place this product on clean pale sand near the waterline, bright midday
> coastal light, soft out-of-focus turquoise sea and sky behind, a few smooth pebbles
> as props.

Good for: summer/seasonal, beverage, beauty, swimwear adjacents. Ad 9:16.

### marble-studio (premium minimal)
> Scene: Place this product on a polished white-and-grey marble pedestal against a soft
> gradient studio backdrop, controlled even softbox light, crisp contact shadow, luxe
> minimal styling, lots of negative space.

Good for: premium/beauty/jewelry-adjacent, when "elevated but not a plain packshot".
PDP 1:1, banner 3:2.

### holiday-seasonal (swap the season)
> Scene: Place this product on a cozy wooden table styled for [season — e.g. winter
> holidays: pine sprigs, warm string-light bokeh, a knitted throw / autumn: dried
> leaves, warm amber light / spring: fresh blossoms, bright airy light], warm inviting
> mood, festive but uncluttered, negative space for a seasonal message.

Good for: seasonal campaigns. Set `[season]` from `context.md`. Ad 9:16, banner 16:9.

### lifestyle-in-use (with a person)
> Scene: Create a lifestyle image showing a [target customer] using this product in a
> [setting], natural candid moment, soft natural light, the product clearly featured
> and in focus.

Good for: demonstrating use. CAUTION: people + apparel/swimwear can trip the
`IMAGE_SAFETY` filter (deep-dive §5) — if rejected, reframe to product-on-prop /
hands-only, or skip + FLAG. Always QC: people scenes drift the product most.

## Drift-resistance tips (carry into Line 2)

- Keep the scene **simple** — one setting, one or two props. Busy scenes invite the
  model to reinterpret the product.
- Do not ask the model to change the product's angle AND the whole scene at once;
  alternate angles are the `multi-angle` skill's job, off the white hero.
- For `seedream-v4.5` (the fallback), keep effective guidance modest — it
  over-saturates / shows edge artifacts at high guidance (deep-dive §5: guidance_scale
  > 10 → ~40% artifacts). Prefer nano-banana-pro for anything text-bearing.
- If two scenes of the same product disagree on the product, the hero anchor is being
  under-weighted — strengthen Line 1 ("identical appearance: same color, label,
  proportions, and material") and reduce scene complexity, then regenerate.
