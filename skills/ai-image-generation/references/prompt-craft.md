# Image prompt craft

The single biggest quality lever. Strong prompts read like a **photographer's or art director's
brief** — concrete visual facts — not a list of praise adjectives.

## The build order

State these, roughly in this order, only the ones that matter for the shot:

1. **Subject** — specific, not generic ("a weathered fisherman mending a net", not "a person").
2. **Action / pose** — what they're doing (a continuous verb beats a frozen pose).
3. **Setting** — where, with one anchoring detail that proves it's a real place.
4. **Composition / framing** — close-up, wide, overhead, rule-of-thirds, centered.
5. **Medium / lens** — "35mm photo", "oil painting", "flat vector", "macro", "isometric 3D".
6. **Light** — named source + direction + time ("low side light, overcast afternoon").
7. **Palette / mood** — dominant colors, warm/cool, contrast.
8. **Style target** — a concrete style ("Kodachrome 1970s", "Studio Ghibli cel"), not "beautiful".

## Anti-slop rules (avoid the generic "AI render" look)

- **Facts beat adjectives.** Replace "stunning, hyper-detailed, masterpiece" with the actual visual
  facts (surface, light, lens). Prestige adjectives add nothing the model can render.
- **One style, one era.** Mixing two genres or two eras muddies the output. Commit to one.
- **One variable per iteration.** Fix the `--seed`, then change a single thing (light, palette, lens)
  so you can attribute the difference.
- **Name the imperfections** for realism — vignette, slight grain, shallow depth, a real-camera
  artifact — instead of asking for "realistic".
- **Negative space and composition** are part of the prompt; say where the subject sits.

## Examples

| Weak | Strong |
|---|---|
| "a beautiful sunset" | "wide shot of a salt flat at blue hour, thin pink band on the horizon, mirror-still water, 24mm, cool palette" |
| "a cool logo for a coffee shop" | "flat vector logo, a steaming cup forming a crescent moon, two-color (cream on espresso brown), centered, generous margins" |
| "a realistic portrait" | "editorial headshot, 85mm, soft key 45° camera-left, subtle warm-cool split, shallow depth, visible skin texture and flyaway hairs" |

## Text in images

FLUX is weak at rendering legible text. For logos/posters/UI mockups with words, use an
Ideogram/Recraft/Imagen family and **quote the exact text** in the prompt: `the words "Open Daily"
in a bold grotesque, centered`.

When the `ai-gen-prompting` umbrella skill is installed it carries per-family craft (FLUX vs Imagen
vs Seedream) and the full anti-slop reference; this file is the self-sufficient core.
