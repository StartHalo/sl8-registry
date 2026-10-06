# Product and commercial prompt craft

The product rules from fal's commercial skill and product-shot recipe, kept in their words. Routing
(which endpoint) lives in the routing table in `SKILL.md`; checks live in its output-check section.

## Prompt build order

Write prompts in this order so commercial intent stays clear:

1. Product invariant: exact object, material, color, packaging, scale.
2. Commercial role: hero image, PDP image, launch teaser, demo shot, social ad.
3. Setting: surface, background, props, environment, distance from product.
4. Lighting: softbox, strip light, rim light, backlight, caustics, practicals.
5. Camera: angle, focal length feel, macro, depth of field, motion if video.
6. Composition: centered, negative space, safe zone, text-free area, platform.
7. Brand tone: premium, clean, clinical, bold, energetic, warm, editorial.
8. Guardrails: preserve logo and packaging, no extra text, no distorted labels.

Do not promise claims like "best", "clinically proven", "50 percent faster",
or celebrity endorsements unless the user provides that copy.

## Prompt template

Apply commercial prompt build order, condensed to product-shot specifics:

```text
[exact product] preserved exactly from the reference image as the only hero
object, [material and color], placed on [surface], [background], [lighting
setup matched to material], [camera angle], [lens feel], [crop],
premium product photography, accurate packaging, no extra text, no warped
label, no extra products
```

## Material-driven lighting

| Material | Lighting recipe |
|----------|----------------|
| **Glass / liquid** | Backlight + thin rim light along edges, transparent caustics, controlled reflections |
| **Polished metal** | Hard strip highlights, dark flags off-camera to control specular |
| **Plastic / matte** | Soft directional key, clean shadow, no over-gloss |
| **Fabric** | Side light to reveal weave, gentle natural folds, accurate color |
| **Food** | Soft directional key, plausible steam/condensation only |
| **Jewelry / small precious** | 100mm macro feel, dark cards behind subject, crisp pinpoint sparkle |

## Background and surface combinations

- **E-commerce PDP**: seamless white or light gray paper, even softbox.
- **Premium beauty**: pale stone, warm beige, single key from upper-left.
- **Athletic / launch**: concrete, high-contrast strobe, slight motion dust.
- **Food editorial**: matte ceramic or natural wood, window-style light, plausible scatter (crumbs, sauce).
- **Tech / minimal**: gradient void, single rim, polished surface reflection.

## Common refinements

If the first output drifts:

- Logo distortion → re-upload at higher resolution; switch to `openai/gpt-image-2/edit` for better text fidelity.
- Wrong material feel → name the lighting recipe specifically (rim + caustics for glass, etc.).
- Background fights the product → simplify to a gradient or single-color void.
- Color shift → mention the exact color in the prompt and add "do not shift product color".
- A logo or label that must survive exactly → do not regenerate it: composite it last with media-photo-editing (HR10).
