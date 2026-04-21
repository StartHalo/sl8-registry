---
name: bot-007-restaurant-logo-gen
description: Generates restaurant logo concepts by crafting design-informed, model-specific prompts and producing image variations across multiple AI model families. Use when creating restaurant logos, food brand marks, cafe branding, or any restaurant visual identity.
---

# Restaurant Logo Generation

## Purpose

Create restaurant logo **concept** starting points — not finished brand systems. This skill explores 2-3 divergent design directions, picks one with explicit rationale, generates model-specific prompts informed by restaurant branding principles (category conventions, color psychology, composition styles, iconography), then runs them across multiple AI model families via `ai-gen` to produce diverse variations for comparison. The outputs are references for a human designer to refine and systematize — they are not design tokens or print-ready brand assets.

## Model Landscape (April 2026 — updated per KB 2026-04-14)

KB logo ranking as of 2026-04-14:

1. **Recraft V4 SVG** (`recraft-ai/recraft-v4-svg`) — Native vector output with real SVG paths, design-taste composition, typography as a first-class layout primitive, 10,000-character prompt ceiling. **Primary choice** for any logo deliverable that will be refined in Illustrator/Figma.
2. **Nano Banana Pro** (`google/nano-banana-pro`) — Pixel-perfect text rendering with per-line font specs and in-call translation (Korean/Arabic/etc.). **Text-hero choice** when the restaurant name must be flawless.
3. **Ideogram V3** (`fal-ai/ideogram/v3`) — Strong typography rendering, Design preset for graphic work. Fallback for text-hero when Nano Banana Pro is unavailable on the proxy.
4. **Recraft V3** (`fal-ai/recraft-v3`) — Legacy. Still works on the SL8 proxy. Fallback when V4 is unavailable. Raster output is `.webp` (not a quirk — expected).
5. **FLUX 2 Pro** (`fal-ai/flux-pro`) — Last-resort text fallback (garbles subtitles; only use for non-text mark exploration).

**NOT logo-specialized, do not substitute:** FLUX Dev (blurry), Seedream 5 (photography/illustration focus), photoreal generalists. Midjourney is not available via `ai-gen` and its KB-documented "generic vector stock" failure mode applies anyway.

**Availability caveat:** Recraft V4 and Nano Banana Pro are Replicate IDs and not in the `ai-gen` default catalog as of 2026-04-14 — bot reaches them via model-ID pass-through (`-m recraft-ai/recraft-v4-svg`, `-m google/nano-banana-pro`). The bot must try V4/Nano Banana first and **gracefully fall back** if the proxy returns "Application not found" or similar.

**References:**
- Recraft V4 per-model guide: `kb/wiki/topics/prompting-recraft-v4.md`
- Nano Banana Pro per-model guide: `kb/wiki/topics/prompting-nano-banana-pro.md`
- Universal principles: `kb/wiki/concepts/image-prompt-engineering.md`

## Inputs

- **Restaurant name** (required) — the name of the restaurant
- **Cuisine type** (optional) — defaults to "International"
- **Atmosphere/vibe** (optional) — defaults based on cuisine classification
- **Color preferences** (optional) — defaults based on cuisine + vibe
- **Style preferences** (optional) — e.g., "minimalist", "vintage", "modern". Defaults based on restaurant type

## Instructions

### Step 1: Parse Restaurant Details

**Before doing anything else**, re-read the user's full prompt word-by-word and extract every detail:

```
Parsed from user prompt:
- Restaurant name: [FULL name — never truncate]
- Cuisine: [exact cuisine if given, or "not provided"]
- Atmosphere/vibe: [all atmosphere words, or "not provided"]
- Colors: [color preferences if given, or "not provided"]
- Style: [style preferences if given, or "not provided"]
- Restaurant type: [classify: fine-dining, casual, fast-food, cafe, ethnic-italian, ethnic-japanese, ethnic-mexican, bbq, bakery, bar, or other]
```

**Common mistake**: The user may write "create a logo for 'Sakura Garden' — a cozy Japanese restaurant with zen vibes, warm wood tones." ALL of that is restaurant data. Extract every piece.

### Step 2: Fill Defaults ONLY for "not provided" Fields

| Field | Default (ONLY if "not provided") |
|-------|---------|
| Cuisine | "International" |
| Atmosphere | Based on cuisine (Italian=warm/rustic, Japanese=minimal/zen, BBQ=bold/smoky, Cafe=cozy/artisanal) |
| Colors | Based on cuisine + vibe (see KNOWLEDGE color psychology) |
| Style | Based on restaurant type classification (see KNOWLEDGE composition styles) |
| Image size | square_hd |

**Self-check**: If you are marking 3+ fields as "not provided", re-read the user's prompt — you likely missed details.

### Step 2.5: Explore Divergent Concept Directions

**This step is mandatory.** Before committing to one direction, articulate **2-3 divergent concept directions** in ~40-60 words each. This mirrors the sketch-exploration phase of the canonical logo design process (Think → Sketch → Refine → Digitize → Test) and prevents the bot from defaulting to the first idea that comes to mind.

Each direction MUST vary from the others in at least **two** of these axes:
- Composition style (emblem/badge, wordmark, icon+wordmark, monogram)
- Primary iconography (the specific symbol chosen)
- Typographic personality (classical serif vs modern sans vs script vs custom)
- Palette temperament (warm-rustic vs cool-minimal vs bold-contrast vs monochrome)

**Format** — save to `artifacts/<project-name>/concept-directions.md`:

```markdown
## Concept Directions for [Restaurant Name]

### Direction A — [name the direction, e.g., "Heritage Emblem"]
Composition: [style]. Iconography: [one symbol]. Typography: [style]. Palette: [temperament + 2-3 colors]. Evokes: [1-2 adjectives tied to the restaurant's identity].

### Direction B — [different name]
[same fields, genuinely different]

### Direction C — [different name, optional if 2 strong contrasts already]
[same fields]

### Chosen: [A | B | C]
Rationale: [1-2 sentences tying the choice to the restaurant's parsed details — cuisine, vibe, any explicit preferences. If user provided explicit style signals, the chosen direction MUST align with them.]
```

**Anti-patterns** — reject and regenerate if:
- Directions differ only in color (same composition + same icon + same typography = one direction, not three)
- Rationale is generic ("best fit" without tying to parsed details)
- Chosen direction ignores explicit user signals ("user said minimalist" → chose heritage emblem)

**Quality check**: Each direction should be distinguishable by a designer reading only its ~50 words. If two directions could produce the same logo, merge them and create a third contrast.

### Step 3: Compose the Base Logo Concept

**Takes the chosen direction from Step 2.5 as its starting point.**

**This step is mandatory and must produce 100+ words.** Articulate the full design concept BEFORE writing any model-specific prompts. This forces design thinking and produces better prompts.

Write the base concept covering **6 design dimensions**:

1. **Subject**: "Professional restaurant logo for [full name]" — state the restaurant category and cuisine explicitly
2. **Composition**: Choose ONE composition style (emblem/badge, wordmark, icon+wordmark, monogram) and explain WHY it fits this restaurant category. E.g., "Emblem/badge for Bella Roma because heritage Italian restaurants use circular emblems to convey tradition and authenticity."
3. **Iconography**: Choose ONE specific symbol — not "olive branch or grape vine" but ONE with reasoning. E.g., "Olive branch specifically — represents Tuscan origins, pairs with the warm rustic vibe, and works well in a circular wreath composition." Per Recraft's official guidance, prefer language that **integrates form and meaning**: "letters carved from the wreath", "icon fused as one shape with the wordmark", "negative space cutout within the circle", "text visible through transparent areas".
4. **Typography**: Specify primary font style (serif/sans-serif, weight, spacing) and secondary style. Explain the pairing. E.g., "Primary: bold classical serif for restaurant name (conveys tradition). Secondary: light sans-serif small caps for tagline (modern contrast)."
5. **Color palette**: List 2-3 colors with hex codes AND psychology reasoning. E.g., "Terracotta (#C15A35) — warm, earthy, evokes Italian clay architecture. Olive green (#6B7645) — fresh, natural, connected to Italian cuisine. Cream (#F5F0E8) — clean, warm background."
6. **Mood/Atmosphere**: 2-3 adjectives that capture the restaurant's identity. E.g., "Warm, authentic, refined — reflecting the rustic elegance of a candlelit Italian dining experience."

7. **Anti-cliché statement** (MANDATORY — added per KB research on "generic vector stock" failure mode): Name the trope you are explicitly rejecting. Every restaurant category has a default AI trope:

   - **Italian** → red/white/green tricolor + pizza slice + chef with mustache
   - **Japanese** → geisha or samurai + cherry blossom + kanji
   - **Mexican** → sombrero + chili pepper + agave + taco
   - **BBQ** → silhouetted cow/pig + crossed forks + flames
   - **Cafe** → overhead latte art + coffee cup with heart foam
   - **Bakery** → baguette + wheat stalk + cartoon baker's hat
   - **Bar/Pub** → beer mug + foam + wheat barrel
   - **Fine dining** → elegant silhouetted diner + candle + wine glass

   Write one sentence explicitly rejecting the cliché and describing the fresher angle you chose instead. Example: "NOT the standard tricolor pizza-chef cliché — instead, an engraved olive branch wreath with hand-drawn linework, evoking a Tuscan estate stamp rather than a generic Italian eatery."

   This sentence must appear in your base concept. Per KB Recraft V4 + Superside guidance, it is the single highest-leverage move against AI default tropes.

**Quality check**: If your base concept is under 120 words (the anti-cliché statement bumped the minimum from 100), go back and add specificity. The anti-cliché statement must name a specific trope; "avoid generic elements" does not count.

Save the base concept to `artifacts/<project-name>/logo-concept.md`.

### Step 4: Generate Model-Specific Prompts

Adapt the base concept into model-specific prompts. Each prompt MUST be a full descriptive paragraph (not keywords) adapted to the model's strengths.

**Before writing each prompt — Universal Principles compliance checklist** (from `kb/wiki/concepts/image-prompt-engineering.md`):

- [ ] **Strong verb opener** — "Create", "Design", "Generate", "Craft", "Render"
- [ ] **Natural-language sentences**, not keyword soup ("A circular emblem with..." beats "circular, emblem, restaurant, logo")
- [ ] **Positive framing** — describe what you want, not what you don't. Say "clean white background" not "no clutter". CRITICAL for Nano Banana Pro which breaks on negation.
- [ ] **Double-quote literal text** — wrap the restaurant name in quotes: `"Bella Roma"`, not Bella Roma
- [ ] **Materiality beats generic nouns** — "hand-engraved olive branch with fine linework" beats "olive branch". "Warm terracotta (#C15A35)" beats "warm colors".
- [ ] **State the use case** — "suitable for signage and menus" anchors the model in context
- [ ] **Layer technical + emotional** — composition specs + mood in the same paragraph
- [ ] **Anti-cliché statement from base concept is reflected** in the prompt (not copied verbatim, but present as a rejection of the default trope)

Run the checklist against each prompt before saving.

---

**Recraft V4 SVG** (`recraft-ai/recraft-v4-svg`) — **Primary model.** Per `kb/wiki/topics/prompting-recraft-v4.md`, V4 rewards **paragraphs, not keywords**. Typography is a composition primitive, not an overlay.

Template (adapt the [bracketed] slots):

```
Create a [brand type] logo for "[Restaurant Name]" with [typography description:
weight, case, serif/sans, any treatment], positioned [placement: centered, vertical,
stacked]. The mark itself is [iconography — ONE specific choice, described with
materiality — engraved linework, hand-drawn quality, fine detail] rendered in
[stroke weight/style]. Color palette: [hex colors]. Background: [solid/transparent].
[Structural text-composition rule — e.g., "the brand name acts as the baseline the
olive wreath rests upon", "the ligature-'R' cuts through the vertical centerline"].
Flat vector design, no gradients, no shadows, no texture, clean solid color fills,
suitable for SVG export. Clean lines, intentional composition, professional brand
identity. [Explicit anti-cliché statement from base concept.]
```

- V4 has a 10,000-character prompt ceiling — use paragraphs, not bullets
- Text is a composition primitive — describe how it **relates to** other elements, not "logo with text below"
- Hex colors are respected (`#C15A35`, `#6B7645`)
- Add SVG constraints inline ("flat vector design, no gradients, no shadows, no texture")

**Fallback (V4 unavailable):** Adapt the prompt for Recraft V3 (`fal-ai/recraft-v3`) using the legacy V3 layered format:

```
A [aesthetic] [category] restaurant logo design. BACKGROUND: [solid color].
MAIN VISUAL: [ONE specific iconography described
precisely with form-meaning integration language — "letters carved from",
"fused as one shape", "negative space cutout"]. HEADLINE: "[Restaurant Name]"
in [weight], [style] [serif/sans-serif] type in [color (#hex)], positioned
[placement]. SUBTEXT: "[tagline]" in [smaller style], [color (#hex)],
[placement]. PALETTE: [2-3 colors with hex, e.g., "warm gold and cream
palette (#C9A063, #F5F0E8)"]. OVERALL: [composition style], consistent stroke
width, clean vector-style graphic design, brand identity, suitable for signage
and print.
```
- **Declare aesthetic upfront**: "minimalist", "vintage badge", "line icon", "monoline" — Recraft's docs treat this as a required first descriptor
- Include hex color codes for each color
- Explicitly state composition style (emblem, wordmark, monogram, icon+wordmark)
- For vintage/heritage restaurants: layer ornamental elements like "Est. [year]", "traditional family recipe seal", "ornate decorative border"
- End with: "professional logo, graphic design, brand identity, consistent stroke width"

**Nano Banana Pro** (`google/nano-banana-pro`) — **Text-hero model.** Per `kb/wiki/topics/prompting-nano-banana-pro.md`, Nano Banana Pro uses the Text-to-image framework: **[Subject] + [Action] + [Location/context] + [Composition] + [Style]**, and its text-rendering framework requires quoted literals + per-line font specs.

Template (logo use case):

```
[Subject] A professional [aesthetic] logo for "[Restaurant Name]", a [cuisine]
[restaurant category]. [Action] The brand name is rendered as [ONE iconographic
treatment — e.g., "integrated into a circular olive branch wreath", "floating
above a minimalist fork-and-spoon icon"]. [Location/context] On a [solid color
or transparent] background, centered composition. [Composition] [Medium shot /
centered / vertical stack / emblem layout]. [Style] Professional brand mark
design, [materiality terms: hand-engraved linework, fine detail, clean
typography], suitable for signage, menus, and digital use.

Render the text with the following exact styling:
- "[Restaurant Name]" in a [specific font: weight, style, e.g., "bold classical
  serif", "elegant Didone serif with wide letter-spacing"], [color]

[Explicit anti-cliché statement from base concept — positive framing only, do
NOT use "no" or "without".]
```

- **Positive framing is mandatory** — Nano Banana Pro breaks on negation. Rewrite any "no X" as a positive description. ❌ "no tricolor flag" → ✅ "monochromatic terracotta palette instead of tricolor"
- **Double-quote the restaurant name** and any tagline
- **Per-line font spec** — describe the font with weight, serif/sans, and treatment. "bold classical serif" beats "nice font"
- **Materiality terms** — "hand-engraved linework", "fine stroke detail", "brushed metallic" — these terms shift Nano Banana out of stock-logo territory
- Use the 5-part framework order: Subject → Action → Location → Composition → Style

**Fallback (Nano Banana Pro unavailable):** Adapt for **Ideogram V3** (`fal-ai/ideogram/v3`) using the legacy typography-forward format:

```
[Aesthetic] logo design for "[EXACT RESTAURANT NAME]" [restaurant category].
The company name in [very specific font description: weight, style, spacing,
e.g., "elegant serif typography with wide letter-spacing"], [color]. A
minimalist [ONE iconographic element] [above|integrated|below] the wordmark.
[Optional: tagline in smaller [style] below]. [Background]. Typography-forward
logo design, design style, clean composition.
```
- **Quoted text MUST be ≤4 words** for Ideogram (Nano Banana Pro has no such limit)
- Lead with the restaurant name in quotes
- Limit to 2 text blocks maximum (name + optional tagline)
- Include "design style" cue at the end — Ideogram has a Design preset for graphic work
- End with: "typography logo, text-based design, clean composition"

**Recraft V3 SVG** (`fal-ai/recraft-v3` with `style=vector_illustration`) — Simplified vector structure:
```
A [vector sub-style] logo for [restaurant name]. [Main visual: ONE simple
icon/symbol described as flat geometric shapes — "circular icon", "simple
outline", "contour symbol"]. "[Restaurant Name]" in [bold/clean font style],
[color]. Monoline style, consistent stroke width, works at small sizes,
clean flat vector design, solid color fills, no gradients, no shadows,
no texture, minimal detail, scalable.
```
- SIMPLIFY the raster prompt — vector needs fewer details, cleaner shapes
- Remove texture/shadow/gradient language entirely
- Specify "flat", "solid colors", "monoline", "consistent stroke width", "works at small sizes" — these are Recraft's official icon-quality cues
- Choose vector sub-style matching restaurant category:
  - Heritage Italian → `style=vector_illustration/linocut`
  - Modern/Minimal → `style=vector_illustration/line_art`
  - Bold/BBQ → `style=vector_illustration/bold_stroke`

**Common mistakes to avoid in ALL prompts:**
- Do NOT use keyword lists ("logo, restaurant, elegant, professional")
- Do NOT say "olive branch or grape vine" — pick ONE from your base concept
- Do NOT include more than 2 text elements (name + optional subtitle)
- Do NOT copy the same prompt across models — each must be adapted

Save all three prompts (Recraft raster, Recraft SVG, Ideogram) with the base concept to `artifacts/<project-name>/logo-prompt.md`.

### Step 5: Generate Logo Images (with fallback chains)

Generate at least 3 outputs from 2 different model families. The primary path uses the KB 2026-04-14 ranking: Recraft V4 SVG + Nano Banana Pro. Each model has a documented fallback. **Record which actual model ID succeeded for each output** — the comparison.md must list the real model used, not the attempted one.

Initialize tracking:
```bash
mkdir -p artifacts/<project-name>/logos
# Create a models-used log file
echo "# Model IDs used for this run" > artifacts/<project-name>/models-used.md
```

**5a. Vector / design-taste channel — Recraft V4 SVG → V3 fallback chain**

Try V4 SVG first:
```bash
ai-gen image "<recraft-v4-svg-prompt>" -m recraft-ai/recraft-v4-svg -s square_hd -o artifacts/<project-name>/logos
```

If the call fails (model not found, auth error, etc.), fall back to V3 with the vector style parameter:
```bash
# Select sub-style by restaurant category:
# Heritage/Italian/Bakery → style=vector_illustration/linocut
# Modern/Japanese/Fine Dining → style=vector_illustration/line_art
# BBQ/Sports/Bold → style=vector_illustration/bold_stroke
# General/Default → style=vector_illustration

ai-gen image "<recraft-v3-svg-prompt>" -m fal-ai/recraft-v3 -s square_hd -o artifacts/<project-name>/logos style=vector_illustration/linocut
```

Record which succeeded:
```bash
echo "- Vector channel: recraft-ai/recraft-v4-svg (primary) OR fal-ai/recraft-v3 with style=vector_illustration (fallback)" >> artifacts/<project-name>/models-used.md
```

**5b. Raster / design-taste channel — Recraft V4 → V3 fallback chain**

```bash
# Try V4 raster
ai-gen image "<recraft-v4-prompt>" -m recraft-ai/recraft-v4 -s square_hd -o artifacts/<project-name>/logos
# Fallback: V3 raster
ai-gen image "<recraft-v3-prompt>" -m fal-ai/recraft-v3 -s square_hd -o artifacts/<project-name>/logos
```

**5c. Text-hero channel — Nano Banana Pro → Ideogram V3 → FLUX Pro fallback chain**

```bash
# Try Nano Banana Pro (pixel-perfect text, positive framing mandatory)
ai-gen image "<nano-banana-pro-prompt>" -m google/nano-banana-pro -s square_hd -o artifacts/<project-name>/logos
# Fallback 1: Ideogram V3
ai-gen image "<ideogram-prompt>" -m fal-ai/ideogram/v3 -s square_hd -o artifacts/<project-name>/logos
# Fallback 2 (last resort): FLUX Pro
ai-gen image "<flux-pro-prompt>" -m fal-ai/flux-pro -s square_hd -o artifacts/<project-name>/logos
```

**Cost note (from KB):** Recraft V4 SVG is $0.08, V4 Pro SVG is $0.30, V4 raster is $0.04, V4 Pro raster is $0.25. Nano Banana Pro pricing is not documented on the Replicate source — assume premium tier. Ideogram V3 and V3-family Recraft are the cheap fallbacks. Under default depth, three successful generations should cost under $0.50.

**Error handling rules:**

1. **Try the primary model first** — don't skip ahead to the fallback
2. **On failure, try once more** with the primary (transient errors are common)
3. **On second failure, cascade to the fallback** and record the substitution
4. **Never skip all models in a channel** — if the vector channel fails entirely, the run fails loudly; don't silently produce only 2 outputs

**Known issues (as of 2026-04-14):**
- Recraft V4 / Nano Banana Pro may not be registered on the `ai-gen` proxy yet — fallbacks are the safety net
- `fal-ai/ideogram/v3` has intermittent "Application not found" errors
- Do NOT use `fal-ai/flux-dev` for logos — blurry output, text misspellings
- Recraft raster outputs `.webp` (expected, not a quirk); SVG variants output `.svg`

**Rename files** after generation for clarity. Use the model family and variant in the filename so the comparison can reference them:
```bash
mv artifacts/<project-name>/logos/<generated-recraft-svg>.svg artifacts/<project-name>/logos/logo-recraft-vector.svg
mv artifacts/<project-name>/logos/<generated-recraft-raster>.webp artifacts/<project-name>/logos/logo-recraft-raster.webp
mv artifacts/<project-name>/logos/<generated-text-hero>.png artifacts/<project-name>/logos/logo-text-hero.png
```

### Step 6: Create Comparison Summary

Write `artifacts/<project-name>/comparison.md` covering:

1. **Overview**: Restaurant name, cuisine, vibe, and the design direction from the base concept

2. **Models-used manifest** — list the actual model IDs that produced each output, not the attempted ones. Copy from `artifacts/<project-name>/models-used.md`. Example:

   | Channel | Attempted | Succeeded | Fallback triggered? |
   |---|---|---|---|
   | Vector / design-taste | recraft-ai/recraft-v4-svg | recraft-ai/recraft-v4-svg | No |
   | Raster / design-taste | recraft-ai/recraft-v4 | fal-ai/recraft-v3 | Yes — V4 not on proxy |
   | Text-hero | google/nano-banana-pro | fal-ai/ideogram/v3 | Yes — Nano Banana Pro not on proxy |

3. **Scoring table** — rate each output on **9 dimensions** (1-5 scale, 45-point max):

   | Dimension | Vector | Raster | Text-hero | Notes |
   |-----------|--------|--------|-----------|-------|
   | Text rendering | /5 | /5 | /5 | Is the restaurant name legible and correctly spelled? |
   | Composition | /5 | /5 | /5 | Clean, balanced, appropriate for logo use? |
   | Style match | /5 | /5 | /5 | Does it match the restaurant category conventions? |
   | Color accuracy | /5 | /5 | /5 | Does it match the requested/defaulted palette? |
   | Scalability | /5 | /5 | /5 | Would it work at favicon size AND signage size? |
   | Small-size legibility | /5 | /5 | /5 | Mental 16px favicon test — does the key shape still read? Score 5 if the silhouette is unambiguous at that size; 1 if it becomes a blob. |
   | Memorability | /5 | /5 | /5 | 5-second redraw test — after a brief glance, could a viewer redraw the core shape from memory? Score 5 for simple iconic marks, 1 for dense/busy compositions. |
   | Freshness / cliché resistance | /5 | /5 | /5 | Does this feel like a creative choice, or a default AI trope? Score 5 if the anti-cliché statement from the base concept is visibly honored in the output. Score 1 if the output looks like it could appear in any AI-logo-generator gallery. This is the dimension most directly tied to Step 3's anti-cliché requirement. |
   | Overall | /5 | /5 | /5 | Would the owner want to use this direction? |

3. **Per-model analysis**: For each generated logo:
   - What the model produced (describe the actual output specifically)
   - Strengths (be specific: "nails the terracotta palette" not "good colors")
   - Weaknesses (be specific: "subtitle text garbled" not "some issues")
   - Color drift (did the model match the requested colors or drift?)

4. **Recommendation**: Which logo best captures the restaurant's identity and why. Reference the scoring table.

5. **Recommended Next Steps** — append this block verbatim (customizing only the brand-system caveat wording if useful):

   ```markdown
   ## Recommended Next Steps

   These AI-generated logos are concept starting points, not a finished brand system. Before using any of them:

   1. **Trademark check** — Save the preferred logo, then run a reverse image search at https://images.google.com to check for trademark conflicts or unintended associations. This is industry-standard practice and takes under a minute.
   2. **Small-size test** — View the winner at 16px (favicon size) and imagine it on signage 10 feet away. If the key shape survives both ends, the bones are solid. If it becomes a blob at 16px, simplify before committing.
   3. **Motion test** — 2026 brands increasingly use animated logos. Ask yourself: does the core shape have enough structure to survive being animated? If it relies on texture or fine detail, it won't.
   4. **Vectorize the winner** — Raster outputs (PNG/WebP) are not print-ready at any meaningful size. The Recraft SVG output is already vector; for Ideogram/FLUX raster outputs, plan to retrace in Illustrator. Retracing AI output in Illustrator is now a standard designer workflow (per r/graphic_design community consensus, 2026).
   5. **Design-system caveat** — AI outputs do not preserve typography, spacing, or color logic when extended to other brand assets (menus, business cards, signage, social templates). Treat the winning logo as a reference image, not a source of design tokens. For a full brand system, a human designer needs to extract the typography pairing, spacing grid, and color ramps manually.
   ```

6. **Disclaimer**: "These logos are AI-generated **concept** starting points, not brand system tokens. The bot explores directions; a human designer refines and systematizes. For print-ready materials, plan to retrace the winning concept in Illustrator (or start from the Recraft SVG output)."

### Step 7 (Optional): Brand System Expansion

Only run this step if the user explicitly asks for a "brand system", "logo plus assets", or "full identity". Skip otherwise — it triples cost and runtime.

For the highest-scoring logo direction from Step 6, generate supporting brand elements using Recraft V3 with palette and style locked to the base concept:

1. **Icon mark** — the iconography alone, no wordmark, square format, transparent background
2. **Pattern tile** — a repeating background pattern using the same iconographic element
3. **Color swatch card** — the 2-3 hex colors as a labeled palette card

Save under `artifacts/<project-name>/brand-system/`. Add a "Brand System" section to `comparison.md` describing how the assets work together.

## Outputs

Save all deliverables to `artifacts/<project-name>/`:

- `artifacts/<project-name>/concept-directions.md` — 2-3 divergent concept directions with chosen direction and rationale (Step 2.5)
- `artifacts/<project-name>/logo-concept.md` — Base concept (7 dimensions including anti-cliché statement)
- `artifacts/<project-name>/logo-prompt.md` — Model-specific prompts with universal-principles compliance notes
- `artifacts/<project-name>/models-used.md` — Model-ID manifest: attempted vs succeeded per channel, fallbacks triggered
- `artifacts/<project-name>/logos/logo-recraft-vector.svg` — Vector output (V4 SVG preferred, V3 SVG fallback)
- `artifacts/<project-name>/logos/logo-recraft-raster.webp` — Raster output (V4 preferred, V3 fallback)
- `artifacts/<project-name>/logos/logo-text-hero.png` — Text-hero output (Nano Banana Pro preferred, Ideogram V3 fallback, FLUX Pro last resort)
- `artifacts/<project-name>/comparison.md` — 9-dimension scoring + models-used manifest + Recommended Next Steps

## Quality Criteria

**Exploration phase:**
- [ ] `artifacts/<project>/concept-directions.md` exists with 2-3 genuinely divergent directions (vary in ≥2 axes: composition, iconography, typography, palette)
- [ ] Chosen direction has explicit rationale tied to parsed details

**Base concept phase:**
- [ ] `artifacts/<project>/logo-concept.md` is 120+ words covering 7 dimensions (bumped from 6; added anti-cliché per KB)
- [ ] Base concept includes an explicit anti-cliché statement naming a **specific** trope being rejected (not a generic "avoid clichés")
- [ ] Base concept chooses ONE specific icon (not alternatives)

**Prompt phase:**
- [ ] Each model prompt passes the Universal Principles compliance checklist (strong verb opener, natural-language sentences, positive framing for Nano Banana, double-quoted literal text, materiality terms, stated use case)
- [ ] Recraft prompt (V4 or V3) uses paragraph brief with typography as composition primitive and hex color codes
- [ ] Nano Banana Pro prompt uses the 5-part framework (Subject + Action + Location + Composition + Style) with per-line font specs and positive framing only
- [ ] Fallback prompts prepared so the bot can cascade without re-prompting

**Generation phase:**
- [ ] At least 3 images across at least 2 different channels (vector / raster / text-hero)
- [ ] `artifacts/<project>/models-used.md` records the model ID that actually produced each image
- [ ] Fallback reasons noted when cascade triggered

**Comparison phase:**
- [ ] Comparison includes the Models-used manifest table (attempted / succeeded / fallback)
- [ ] Comparison includes the 9-dimension scoring table (1-5, 45-point max) — new dimension is **Freshness / cliché resistance**
- [ ] Comparison includes the "Recommended Next Steps" block verbatim (trademark, small-size, motion, vectorize, design-system caveat)
- [ ] Per-model analysis is specific (not generic praise)
- [ ] Recommendation is actionable

**Housekeeping:**
- [ ] All files saved to the correct project folder
- [ ] Defaults and assumptions documented in logo-prompt.md
