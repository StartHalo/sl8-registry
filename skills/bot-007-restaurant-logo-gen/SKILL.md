---
name: bot-007-restaurant-logo-gen
description: Generates restaurant logo concepts by parsing restaurant details, classifying cuisine, composing a 6-dimension base concept (≥100 words), naming the cliché being avoided, then producing model-specific prompts and logo images across multiple AI model families (Recraft V4, Google Nano Banana Pro, Ideogram V3, FLUX) with fallback chains. Use when creating restaurant logos, food-service brand marks, or any cuisine-specific logo concepts.
metadata:
  author: sl8
  version: 1.2.0
  type: bot
---

# Restaurant Logo Generation

## Workflow Checklist

Copy this checklist into your reasoning and tick each item as you complete it. Steps map 1:1 to the numbered Instructions below.

```
Run progress:
- [ ] Step 1  Parse restaurant details (extract every word; clean error if name missing)
- [ ] Step 2  Fill defaults ONLY for fields marked "not provided"
- [ ] Step 3  Compose base concept (≥100 words, all 6 dimensions, declared Wheeler type, favicon + B&W self-checks) → work/base-concept.md
- [ ] Step 4  Anti-cliché statement (named trope + named fresher reference) → work/anti-cliche.md
- [ ] Step 5  Per-model prompts (Recraft V4 / Nano Banana Pro / Ideogram V3 / FLUX 2 Pro) — no copy-paste, single iconography
- [ ] Step 5b Save logo-concept.md (8 required sections) → artifacts/<project-name>/
- [ ] Step 6  Discover models (ai-gen models --type image --format json)
- [ ] Step 7  Generate via 3-slot × 3-fallback chain — STRICT DROP, no out-of-chain improvisation → artifacts/<project-name>/logos/
- [ ] Step 8  Score each surviving image against 9-dimension rubric → work/scoring.md
- [ ] Step 8b Logo critique pass — favicon test, B&W test, single-mark-clarity test verdicts per surviving model → comparison.md § Per-Model Observations
- [ ] Step 9  Write comparison.md (Generation Details, Models Used, Per-Model Observations, 9-dim table, Recommendation, text-rendering disclaimer)
```

## Knowledge Sources (build-time references; not loaded at runtime)

The principles in this skill are distilled from the SL8 knowledge base. The KB pages below are the authoritative sources — if anything in this skill drifts from them, the KB wins:

- `kb/wiki/concepts/image-prompt-engineering.md` — universal prompt principles, base-concept methodology, logo-specific patterns, anti-pattern list
- `kb/wiki/topics/image-generation-models.md` — model catalog, logo model ranking, SL8-proxy availability
- `kb/wiki/topics/prompting-recraft-v4.md` — paragraph-brief structure, SVG variant rules
- `kb/wiki/topics/prompting-nano-banana-pro.md` — five frameworks, text-rendering rules, positive-framing requirement
- BOT-004 `poster-prompt-gen` — sibling structural template (parse → defaults → base concept → per-model prompts → generate → compare)

Inside the E2B sandbox the bot does not have KB access; the cuisine taxonomy and prompt dialects are embedded inline below for self-contained execution.

## Logo Design Vocabulary

The bot must use these terms with precision. Vague substitutes are a quality-loss signal that grading will catch.

### Logo anatomy (the parts of a logo)

- **Mark / symbol** — the iconographic element. Exactly ONE primary mark per logo.
- **Wordmark** — the typographic element bearing the brand name.
- **Tagline** — secondary descriptor below or beside the wordmark.
- **Lockup** — the fixed spatial relationship between mark and wordmark.
- **Signature** — the canonical lockup variant a brand uses as its default.
- **Letterform / counterform** — individual letter shape / negative space inside enclosed letters.
- **Ornamental frame** — enclosing shape on emblems / crests / badges.
- **Stroke weight** — primary mark stroke, secondary detail stroke, typographic stroke; at favicon scale, hairlines disappear first.
- **Negative space** — structural design tool; not leftover.

### Wheeler's 7 Canonical Logo Types

Every concept must declare its Wheeler type in Step 3.

1. **Wordmark (logotype)** — brand name as primary mark; font-based.
2. **Lettermark (monogram)** — stylized initial(s).
3. **Pictorial mark** — recognizable symbol, no text.
4. **Abstract mark** — organic shapes/geometry, no explicit imagery.
5. **Mascot** — character representing the brand.
6. **Combination mark** — wordmark + pictorial/abstract/mascot. **Default for restaurants** unless taxonomy says otherwise — most versatile.
7. **Emblem (badge / crest / seal)** — typography enclosed within a frame. **Default for heritage / artisanal** — BBQ, brewery, traditional Italian, coffee shops.

### Universal Legibility Tests

Step 8b operationalizes these as tests, not afterthoughts. For each surviving image, record a one-line verdict per test in `comparison.md` § Per-Model Observations.

- **Favicon test (16×16 / 32×32)** — silhouette recognizable; thin strokes don't disappear; characters don't collapse.
- **B&W test** — strip color; logo works through form alone.
- **Single-mark-clarity test** — exactly ONE primary mark visible; no competing secondary marks; no multi-icon ambiguity.

Favicon discipline: 3 colors max (2 better, 1 perfect). Designs simple and uncluttered.

### Design discipline

- **Golden ratio (φ ≈ 1.618)** — proportional system for sizing rectangles and circles. Grid is a guide, not a rule — designer's eye wins on optical alignment vs mathematical alignment.
- **Stroke weight hierarchy** — at favicon scale, hairlines disappear first.
- **Counterform balance** — negative space inside letterforms balances solid counterparts.

### Gestalt principles relevant to logos

- **Closure** — eye completes incomplete shapes (WWF panda).
- **Figure-ground** — mark and background read as intentional shapes (FedEx arrow in negative space).
- **Proximity** — mark + wordmark feel like one unit, not two.
- **Continuity** — baseline alignment between mark and wordmark.
- **Similarity** — repeated shapes/weights bind elements.

### Pentagram method (Paula Scher, professional context)

The bot produces a *concept*; the persona's designer extends it into a kit. Six steps: research → series of solutions → simplify to essence → stretch to limits → output design kit → liquid identity. Three Scher principles: typography as image, serious play, environmental integration. **Step 9's recommendation must mention what kit-extension considerations the designer will need to derive from the chosen direction** (typography system, color palette, motion, iconography family).

## Purpose

Create restaurant logo concepts grounded in the cuisine and vibe. Produce a structured concept document (base concept + anti-cliché statement + per-model prompts), generate one logo image per model family with documented fallback chains, score each output against a 9-dimension rubric, and recommend a single direction. The bot is a concept tool, not a finisher — outputs are directional briefs for the persona's designer, not print-ready assets.

## Inputs

- **Restaurant name** (required) — e.g., `"Ortolano"`, `"Tuck Shop"`. The skill exits non-zero with a clean error if this is missing.
- **Cuisine** (optional) — e.g., `"Italian"`, `"Japanese"`, `"BBQ"`. Defaults to `"International"` (and category falls to "fast casual").
- **Vibe** (optional) — e.g., `"cozy"`, `"upscale"`, `"rustic"`. Defaults from cuisine via the taxonomy below.
- **Color preferences** (optional) — e.g., `"warm earth tones"`, `"#3B2F2F + #F5E6C4"`. Defaults from cuisine + vibe.
- **Style preferences** (optional) — e.g., `"minimalist monogram"`, `"vintage badge"`. Defaults from cuisine + vibe.
- **Layout family** (optional) — `wordmark`, `lockup`, `monogram`, `badge`, `emblem`. Defaults from cuisine.
- **Aspect ratio** (optional) — defaults to `square_hd` (1:1).

## Restaurant Cuisine Taxonomy (used for defaults)

| Cuisine category | Default style direction | Default palette family | Default iconography family | Default layout |
|---|---|---|---|---|
| Fine dining (any cuisine) | Elegant, minimal, serif wordmark | Black + gold, deep navy + cream | Monogram, single architectural motif, crest | Wordmark / monogram |
| Italian (trattoria / pizzeria) | Heritage, hand-engraved, traditional | Deep red + cream, terracotta + olive | Wreath, single ingredient (NOT chef hat / tricolor) | Lockup or emblem |
| Japanese (sushi / ramen) | Brushwork, restrained, asymmetric | Indigo + bone, charcoal + paper white | Single brushstroke mark, hanko-inspired stamp | Lockup or wordmark |
| Mexican / Latin | Vibrant, hand-drawn, folk-art | Sun yellow + chili red + jade | Geometric pattern, single motif (agave, chili) | Badge or emblem |
| BBQ / smokehouse | Rustic, badge, traditional | Charcoal + ember orange, deep red + bourbon | Single tool (cleaver, smokestack), badge | Badge |
| Coffee shop / café | Warm, inviting, illustrative | Cream + coffee brown + accent | Cup OR bean OR steam — pick ONE | Emblem or lockup |
| Bakery / pâtisserie | Charming, hand-lettered | Soft pastel, warm cream + rose | Single baked good, wheat sheaf | Lockup or emblem |
| Fast casual | Energetic, modern, friendly | Bright primary + neutral | Geometric mark, monogram | Lockup or monogram |
| Bar / cocktail lounge | Sophisticated, vintage, art deco | Black + gold, deep green + brass | Linework barware, art-deco geometry | Wordmark or emblem |
| Brewery / taproom | Artisanal, badge-driven | Earthy + amber, charcoal + copper | Hop cone, traditional brewing tool | Badge |
| International / unmatched | Modern, friendly, clean | Two-color contrast, neutral + accent | Geometric mark, monogram | Lockup |

## Instructions

### Step 1: Parse Restaurant Details (JTBD-1 begins)

**Before doing anything else**, re-read the user's full prompt word-by-word and extract every detail into a structured list. The user's prompt often contains ALL the information you need — do not skim it.

Write out the parsed details explicitly:

```
Parsed from user prompt:
- Restaurant name: [FULL name in quotes — never truncate or rephrase]
- Cuisine: [exact cuisine if given, or "not provided"]
- Vibe: [vibe/atmosphere words if given, or "not provided"]
- Color preferences: [exact color spec if given, or "not provided"]
- Style preferences: [exact style words if given, or "not provided"]
- Layout family: [if user named one, e.g., "badge", or "not provided"]
- Aspect ratio: [if user named one, or "not provided"]
- Cuisine category: [classify into ONE row from the taxonomy: fine-dining, italian, japanese, mexican-latin, bbq, coffee, bakery, fast-casual, bar, brewery, international]
```

**Common mistake**: The user may write "Create a logo for 'Ortolano', a fine-dining Italian trattoria in Brooklyn, warm and heritage feel, deep red and cream, no chef hats please." — ALL of that is brief data. Extract every piece. The "no chef hats please" is a user-supplied anti-cliché signal — treat it as one.

If the restaurant name is missing or empty, write `work/error.md` with the message `"Restaurant name is required."` and exit non-zero. Do NOT generate.

### Step 2: Fill Defaults ONLY for Fields Marked "not provided"

Compare your parsed list against the cuisine taxonomy. Only apply a default if the field was explicitly "not provided" in Step 1.

**Self-check**: If you are about to mark 3+ fields as "not provided", re-read the user's prompt again — you likely missed details.

Write out the resolved field set explicitly:

```
Resolved fields:
- Cuisine: [resolved value]
- Cuisine category: [resolved row]
- Vibe: [resolved]
- Color preferences: [resolved — describe but do NOT pick hex codes yet]
- Style preferences: [resolved]
- Layout family: [resolved]
- Aspect ratio: square_hd (default)

Defaults applied (will surface in Assumptions):
- [list every field that came from a default, not the user]
```

### Step 3: Compose the Base Concept (≥100 words, all 6 dimensions, declared Wheeler type)

Write the core creative concept. Save to `work/base-concept.md` BEFORE writing per-model prompts.

The base concept must declare its Wheeler type AND address all 6 dimensions AND pass favicon + B&W self-checks. Aim for ≥100 words; 150–250 is the sweet spot.

```
**Wheeler type:** [Pick ONE of: Wordmark, Lettermark, Pictorial mark, Abstract mark, Mascot, Combination mark, Emblem. Default for restaurants: Combination mark, unless cuisine taxonomy says Emblem (heritage/artisanal) or Wordmark/Monogram (fine dining).]

**Subject:** [What exactly is being created — brand type, layout family, primary mark in one sentence]

**Composition:** [Layout style with rationale — negative space allocation, mark placement relative to brand name, baseline relationship, alignment]

**Style/Aesthetic:** [Artistic direction with named reference — heritage engraving, Bauhaus geometry, mid-century badge, brushwork. Reference real design movements or eras when applicable.]

**Color palette:** [3–4 specific colors with hex codes. Each color named, hex given, and one-line reasoning grounded in cuisine + vibe.]

**Typography:** [Font characteristics — weight, case, serif/sans-serif, treatment, tracking. How does typography interact with the mark? How does the brand name read at favicon scale?]

**Mood/Atmosphere:** [Emotional tone, what the viewer should feel, cultural reference if relevant]

**Favicon-test self-check:** [One sentence — at 32×32, what reads? what disappears? does the silhouette pass?]

**B&W-test self-check:** [One sentence — strip color; does the hierarchy still read? does the mark distinguish from background through form alone?]
```

**Quality target**: The base concept must be **≥100 words**, address all 6 dimensions explicitly, declare its Wheeler type, and include both legibility self-checks. **If your base concept is under 100 words, add more design specificity** before proceeding.

**CRITICAL — User input priority**: The user's stated cuisine, vibe, color, and style guidance is the #1 input for art direction. If the user says "warm and heritage feel, deep red and cream", the concept MUST reflect warmth and heritage with a deep-red + cream palette — NOT default to whatever the cuisine taxonomy suggests. Defaults only fill gaps.

### Step 4: Write the Anti-Cliché Statement

Save to `work/anti-cliche.md` AND embed in `logo-concept.md`. The statement has two halves:

```
**Avoided trope**: [Name the standard cliché for this cuisine. Be specific. Example for Italian: "the standard tricolor flag + pizza-chef + spaghetti-loop cliché."]

**Fresher reference**: [Name a non-obvious reference to substitute. Example for Italian: "a 19th-century Tuscan estate seal with hand-engraved olive press iconography on aged-paper cream."]
```

Use the cuisine taxonomy's anti-cliché section in setup.md `<KNOWLEDGE>`. If the user supplied an anti-cliché signal in Step 1 (e.g., "no chef hats please"), incorporate it explicitly.

**Self-check**: A weak anti-cliché statement just says "avoid generic". A strong one names the *specific* trope (e.g., "the bean + steam-swirl + cup trinity") AND the *specific* substitute (e.g., "a single hand-thrown stoneware mug rendered in linework").

### Step 5: Generate Model-Specific Prompts (JTBD-1 completes)

Adapt the base concept into prompts optimized for each model family's strengths. Never copy-paste across models — that is the #1 logo-prompt anti-pattern.

#### Recraft V4 SVG / V4 Raster Prompt

> **Build-time KB pointer:** see `kb/wiki/topics/prompting-recraft-v4.md` for full paragraph-brief depth, SVG variant rules, "type as composition primitive" technique, and per-variant cost/speed/resolution tables. Sandbox Claude can't read KB at runtime, so the essentials are embedded below.

Recraft V4 rewards **paragraph briefs** with text as a composition primitive. 200–500 words is the sweet spot; the model accepts up to 10,000 characters. Five required slots in every paragraph brief: (1) visual hierarchy + composition structure, (2) material properties + lighting conditions, (3) typography placement + styling, (4) color palette + mood, (5) design constraints (stroke weights, accent colors, style references). **Anti-pattern:** keyword-list prompts. **Anti-pattern:** treating typography as overlay — describe how text *relates* to the rest of the composition, not "logo with text below".

Structure (5 required slots):

```
Create a [layout family] logo for [brand name], a [cuisine + vibe] restaurant. The mark itself is [ONE specific iconography choice — never "X or Y"] rendered in [stroke weight / linework style / treatment]. The composition uses [layout description: negative space allocation, mark placement, baseline relationship]. [Brand name] is set in [typography spec: family / weight / case / treatment / tracking], positioned [exact placement]. The brand name acts as the baseline the icon rests on / the icon sits inside the wordmark / [other structural-typography relationship].

Color palette: [hex codes with named roles — e.g., "#3B2F2F (espresso brown) for linework, #F5E6C4 (aged-paper cream) for background, #7A8B5C (muted olive) as the single accent on the wreath leaves"]. Background: [solid/gradient/transparent]. [Material/lighting if applicable: "hand-engraved linework", "letterpress impression texture"]. Heritage/[other named aesthetic] aesthetic. Clean lines, professional brand identity.

[Anti-cliché statement: "NOT the [trope] cliché. Reference instead [substitute]."]
```

For the SVG variant (`recraft-ai/recraft-v4-svg`), append: `Flat vector design, no gradients, no shadows, no texture, clean solid color fills, suitable for SVG export.`

#### Nano Banana Pro Prompt

> **Build-time KB pointer:** see `kb/wiki/topics/prompting-nano-banana-pro.md` for the full five frameworks (text-to-image, multimodal, editing, real-time search, text rendering + localization), per-line font spec syntax, type-as-shape technique, and conversational editing patterns.

Nano Banana Pro uses Google's five frameworks. Use **Framework 1 (text-to-image)** for new logos: `[Subject] + [Action] + [Location/context] + [Composition] + [Style]`. Positive framing only — Gemini-family models break on negation. Iterate conversationally for refinements (follow-up edits are first-class in this model). Text rendering rules: (a) wrap exact strings in quotes, (b) specify font per line, (c) add "translate the text into [language]" as a final instruction for non-Latin co-rendering.

Structure:

```
[Subject] A [layout family] logo for [brand name], a [cuisine + vibe] restaurant. [Action] The mark [is composed/centered/aligned/etc.]. [Location/context] [Background description — color, texture, material]. [Composition] [Layout family + alignment + negative space rules]. [Style] [Aesthetic + style references + cultural anchor].

Render the brand name "[BRAND NAME]" in [per-line font spec: weight, case, family, e.g., "high-contrast didone serif, all-caps, generous letterspacing, weight medium"]. [If a tagline exists]: render the tagline "[tagline]" in [smaller font spec].

The composition uses the palette [hex codes with role descriptions]. [Anti-cliché statement, positive-framed: "An olive branch wreath with hand-engraved linework, instead of any chef-hat or tricolor motif." NOT "no chef hats and no tricolor."]
```

**Rules:**
- Wrap the literal restaurant name in **double quotes**.
- **Positive framing only** — replace "no X" with "Y instead of any X-like motif".
- One font spec per line of rendered text.
- If non-Latin script needed (e.g., Japanese kanji co-rendered with Latin name), state both with separate font specs.

#### Ideogram V3 Prompt

> **Build-time KB pointer:** see `kb/wiki/topics/image-generation-models.md` § Ideogram catalog row. KB does NOT yet have a dedicated `prompting-ideogram.md` (flagged as backflow candidate row 7 in `research/kb-backflow-candidates.md`); essentials embedded inline below.

Ideogram V3 excels at quoted text rendering but garbles ≥3 quoted text blocks. Use ≤2 text blocks. Lead with the brand name in quotes. End with `typography logo, text-based design` to trigger Ideogram's typographic mode. Hex codes respected.

Structure:

```
A [style] logo for a [cuisine + vibe] restaurant. Brand name "[BRAND NAME]" in [font description] at [position]. [Optional secondary text in quotes at smaller size — only if essential, otherwise omit]. [Iconography: ONE choice] [positioning relative to text: above / below / left / inside]. [Color spec with hex codes]. [Anti-cliché reference]. Typography logo, text-based design.
```

#### FLUX 2 Pro Prompt

> **Build-time KB pointer:** see `kb/wiki/topics/image-generation-models.md` § FLUX catalog rows. KB does NOT yet have a dedicated `prompting-flux.md` (flagged as backflow candidate row 6 in `research/kb-backflow-candidates.md`); essentials embedded inline below.

FLUX 2 Pro garbles secondary text — use the primary brand name only, no subtitles. Use a 2–3 sentence narrative paragraph (NOT keyword list, NOT structured framework). Front-load the most important elements (subject + composition come first). End with `artistic logo concept, creative design, brand mark` to trigger artistic mode. **Anti-pattern:** including a tagline like "EST. 1972" or "Italian Trattoria" as secondary text — FLUX will produce gibberish for it. Save the descriptor for Recraft / Nano Banana / Ideogram prompts where text rendering is reliable.

Structure:

```
A professional [style] logo concept for a [cuisine + vibe] restaurant called "[BRAND NAME]". [2–3 sentences narrative description covering composition, palette, mood, key visual elements — front-load the most important elements]. The title "[SHORT BRAND NAME ONLY]" appears in [font description] at [position]. [Aesthetic closer with material/lighting language]. [Anti-cliché reference]. Artistic logo concept, creative design, brand mark.
```

#### Single Iconography Rule (applies to all four prompts)

Before saving `logo-concept.md`, scan each prompt for the regex `\bor\b` between two icon options (e.g., "olive branch or grape vine", "chef hat or pizza"). If found, **reject the draft**, pick ONE, and rewrite. This is enforced — the bot does not produce multi-icon prompts.

### Step 5b: Save logo-concept.md

Write `artifacts/<project-name>/logo-concept.md` with this structure (8 required sections — the new "Logo Classification & Legibility" block was added in v1.2.0):

```markdown
# Logo Concept: <Restaurant Name>

## 1. Assumptions
- [List every default or assumption made — every "not provided" field that fell to a default, plus any rejection of multi-icon ambiguity, plus any cultural-substitution log entries]

## 2. Logo Classification & Legibility
**Wheeler type:** [The declared Wheeler type from Step 3 — one of: Wordmark, Lettermark, Pictorial mark, Abstract mark, Mascot, Combination mark, Emblem]
**Favicon-test self-check:** [The one-sentence verdict from Step 3]
**B&W-test self-check:** [The one-sentence verdict from Step 3]

## 3. Base Concept
[The 6-dimension base concept block from Step 3, ≥100 words]

## 4. Anti-Cliché Statement
**Avoided trope**: [from Step 4]
**Fresher reference**: [from Step 4]

## 5. Recraft V4 Prompt
[The Recraft prompt from Step 5]

## 6. Nano Banana Pro Prompt
[The Nano Banana Pro prompt from Step 5]

## 7. Ideogram V3 Prompt
[The Ideogram prompt from Step 5]

## 8. FLUX 2 Pro Prompt
[The FLUX prompt from Step 5]
```

### Step 6: Discover Available Models (JTBD-2 begins)

```bash
ai-gen models --type image --format json > work/models-available.json
```

Parse the JSON to confirm which model IDs from the chains below are reachable on the current SL8 proxy. If discovery fails (non-zero exit), assume the default chain and log the discovery failure under `models-used.md`.

### Step 7: Generate Logo Images via Fallback Chains

Three slots, three fallback levels each. Walk the chain top-down per slot until one model succeeds OR all three levels fail.

**Slot 1 — Vector / Design-Taste**
| Level | Model ID | Family | Notes |
|---|---|---|---|
| 1 | `recraft-ai/recraft-v4-svg` | Recraft | Native SVG; primary |
| 2 | `recraft-ai/recraft-v4` | Recraft | WebP raster fallback |
| 3 | `fal-ai/recraft-v3` | Recraft (legacy) | PNG; legacy fallback |

**Slot 2 — Text-Hero**
| Level | Model ID | Family | Notes |
|---|---|---|---|
| 1 | `google/nano-banana-pro` | Google Gemini | Pixel-perfect text; primary |
| 2 | `fal-ai/ideogram/v3` | Ideogram | Strong text fallback |
| 3 | `fal-ai/flux-pro/v1.1` | FLUX | Last-resort fallback (text approximate) |

**Slot 3 — Artistic / Illustrative**
| Level | Model ID | Family | Notes |
|---|---|---|---|
| 1 | `fal-ai/flux-pro/v1.1` | FLUX 2 Pro | Artistic primary |
| 2 | `fal-ai/flux-schnell` | FLUX | Cheap fast fallback |
| 3 | (slot drops if both fail) | — | — |

**Per slot, run** (substituting the slot's surviving prompt):

```bash
ai-gen image "<prompt-for-this-model>" \
  -m <model_id> \
  -s square_hd \
  -o artifacts/<project-name>/logos/ \
  --format json
```

After each successful generation, rename the output to `<slot>-<family>.<ext>` so the comparison can reference it stably:

```bash
mv artifacts/<project-name>/logos/<generated-filename> \
   artifacts/<project-name>/logos/<slot>-<family>.<ext>
```

Where `<slot>` ∈ `{vector, text, artistic}` and `<family>` ∈ `{recraft, recraft-v3, nano-banana, ideogram, flux, flux-schnell}`.

**SVG handling**: When `recraft-ai/recraft-v4-svg` is used, request `output_format=svg` if the proxy honors pass-through. If the proxy normalizes to PNG/WebP, log the substitution in `comparison.md § Generation Details`: "SVG requested; proxy returned raster; downstream design tooling cannot use this output as a vector source."

**STRICT FALLBACK DISCIPLINE — no out-of-chain improvisation.** Walk the documented chain top-down per slot. The bot must NOT invoke models outside this table. If all 3 levels fail for a slot:

- Write an empty-slot row to `models-used.md` listing all 3 attempted models with their failure reasons
- Log the slot exhaustion in `comparison.md § Generation Details` with text: *"Slot `<slot>` chain exhausted — `<model 1>`, `<model 2>`, `<model 3>` all failed. Slot drops; comparison covers `<N>` of 3 slots."*
- **Proceed with surviving slots** — do NOT pick alternates from outside this table

The SD 3.5 Large incident on 2026-04-27 (v1.1.0 run) — where the bot improvised `fal-ai/stable-diffusion-v35-large` after slot 2's chain exhausted — is a documented anti-pattern. The improvised output happened to score highest, which masked the discipline violation. v1.2.0 hard-enforces strict drop. If you find yourself considering an out-of-chain model, the slot drops instead.

**Hard ceiling**: 9 model attempts total (3 slots × 3 levels). After 9 failed attempts across all slots, the run still produces `comparison.md` documenting the failure (see Step 9 alternate path) and exits non-zero.

### Step 8: Score Each Surviving Image (9-Dimension Rubric)

Save scoring to `work/scoring.md`. Rate each surviving model output 1–5 on each of the 9 dimensions:

| Dimension | What it measures |
|---|---|
| Text rendering | Brand name legibility; presence of typos / character mangling |
| Composition | Balance, hierarchy, negative space, alignment |
| Style match | How closely the output matches the requested style direction |
| Color accuracy | How closely the output matches the requested hex palette |
| Iconography | Whether the iconography is *the one* chosen and rendered well |
| Mark singularity | Exactly ONE primary mark, no overlapping competing elements |
| Freshness / cliché resistance | Did the output drift into the avoided trope, or honor the anti-cliché statement? |
| Scale-down legibility | Would this read at favicon size (32×32)? |
| Overall | Holistic — is this a starting point a designer can use? |

For Freshness: **explicitly name** whether each output drifted into the avoided cliché OR honored the anti-cliché statement. One sentence of justification per model. This is the autoresearch loop's anchor; vague Freshness scoring breaks the ratchet.

### Step 8b: Logo Critique Pass (Universal Legibility Tests)

Before writing the comparison summary, evaluate each surviving image against three operationalized legibility tests. Record a one-line verdict per test, per surviving model. These verdicts feed into `comparison.md § Per-Model Observations` (Step 9).

**Three tests:**

1. **Favicon test (32×32 / 16×16 readability)** — Imagine the silhouette at 32×32 px. What reads? What disappears? Does the mark's silhouette pass? Verdict format: *"Passes / fails / partial — [one-sentence justification naming what reads or what disappears]"*. Example: *"Passes — the olive bough silhouette is recognizable at 32×32; the wordmark drops away gracefully but the mark stands alone"*.

2. **B&W test (monochrome readability)** — Strip color in your mind. Does the hierarchy still read? Does the mark distinguish from the background through form alone? Verdict format same as above. Example: *"Partial — wordmark and mark hierarchy still read in B&W, but the espresso linework against cream background loses its tonal separation; the wreath becomes a flat shape"*.

3. **Single-mark-clarity test** — Is exactly ONE primary mark visible? No competing secondary marks? No multi-icon ambiguity in the rendered image (vs the prompt)? Verdict format same. Example: *"Fails — Recraft V3 added a small spandrel medallion that reads as a chef-hat figure, creating a secondary mark that competes with the primary olive bough"*.

The Step 8b verdicts strengthen the Step 8 9-dim scoring by giving operational criteria to the otherwise-subjective Freshness, Mark Singularity, and Scale-down Legibility dimensions.

### Step 9: Write the Comparison Summary

Write `artifacts/<project-name>/comparison.md`:

```markdown
# Logo Comparison: <Restaurant Name>

## Generation Details
- **Base concept**: [1-sentence summary of creative direction]
- **Avoided trope**: [from Step 4]
- **Fresher reference**: [from Step 4]
- **Aspect ratio**: square_hd
- **Date generated**: YYYY-MM-DD
- **SVG request status**: [if Recraft V4 SVG was used: "SVG honored" / "Proxy normalized to <format> — vector source unavailable"]

## Models Used

| Slot | Model attempted | Status | File | Credits | Notes |
|---|---|---|---|---|---|
| vector | recraft-ai/recraft-v4-svg | success / failed (fell back) | logos/vector-recraft.svg | [credits] | [observation] |
| text-hero | google/nano-banana-pro | success / failed (fell back to ideogram) | logos/text-ideogram.png | [credits] | [observation] |
| artistic | fal-ai/flux-pro/v1.1 | success | logos/artistic-flux.jpeg | [credits] | [observation] |

(Mirror `models-used.md` content here at higher level; `models-used.md` has the full attempt log including failed attempts.)

## Per-Model Observations

### <Model Family 1>
**Strengths**: [≥1 strength sentence]
**Weaknesses**: [≥1 weakness sentence]
**Favicon test**: [Step 8b verdict: passes / fails / partial — one-sentence justification]
**B&W test**: [Step 8b verdict]
**Single-mark-clarity test**: [Step 8b verdict]

### <Model Family 2>
**Strengths**: [≥1]
**Weaknesses**: [≥1]
**Favicon test**: [Step 8b verdict]
**B&W test**: [Step 8b verdict]
**Single-mark-clarity test**: [Step 8b verdict]

### <Model Family 3>
**Strengths**: [≥1]
**Weaknesses**: [≥1]
**Favicon test**: [Step 8b verdict]
**B&W test**: [Step 8b verdict]
**Single-mark-clarity test**: [Step 8b verdict]

## 9-Dimension Scoring

| Dimension | <Model 1> | <Model 2> | <Model 3> |
|---|---|---|---|
| Text rendering | X/5 | X/5 | X/5 |
| Composition | X/5 | X/5 | X/5 |
| Style match | X/5 | X/5 | X/5 |
| Color accuracy | X/5 | X/5 | X/5 |
| Iconography | X/5 | X/5 | X/5 |
| Mark singularity | X/5 | X/5 | X/5 |
| Freshness / cliché resistance | X/5 — [1-sentence justification naming whether the output honored or violated the anti-cliché statement] | X/5 — [...] | X/5 — [...] |
| Scale-down legibility | X/5 | X/5 | X/5 |
| Overall | X/5 | X/5 | X/5 |

## Recommendation

**Recommended direction**: [SINGLE model name and one-sentence rationale referencing the scoring table — e.g., "Recraft V4 SVG — highest combined Composition (5/5) + Freshness (5/5) and the only output that produced a true vector path the designer can pick up."]

**Design-kit extension considerations** (Pentagram-method handoff to the persona's designer): [List 3–5 things the designer will need to derive from the chosen direction to produce a complete brand kit — e.g., "(1) Typography system: pair the Cormorant Garamond all-caps with a humanist sans for body copy; (2) Color palette extension: add a tertiary cool tone for digital UI accents; (3) Iconography family: extend the olive bough mark into a small set of menu-section icons; (4) Motion: define how the wreath leaves animate on web hover; (5) Signage scale: confirm linework holds up at 36-inch storefront width."]

## Text Rendering Disclaimer

AI image generation models cannot reliably render text. Text visible in these logo images is approximate and likely contains errors. Among the models used, Nano Banana Pro and Ideogram V3 typically render text more accurately than FLUX. These images are visual concepts — not print-ready designs. For production use, overlay accurate text using a design tool (Figma, Illustrator, or — for SVG outputs — directly edit the vector paths).

## Total Credits Used
[Sum of credits for successful generations]
```

**Failure path**: If 0 images were produced (all 9 attempts failed), still write `comparison.md` with a `## Run Failed` header summarizing which models were attempted and the error per attempt. Exit non-zero.

## Outputs

Save all deliverables to `artifacts/<project-name>/`:

- `artifacts/<project-name>/logo-concept.md` — Wheeler classification + favicon/B&W self-checks + base concept + anti-cliché statement + per-model prompts with assumptions documented (8 required sections)
- `artifacts/<project-name>/logos/<slot>-<family>.<ext>` — Generated logo image(s), one per surviving slot
- `artifacts/<project-name>/models-used.md` — Manifest of every model attempt with status (success / failure / fallback) and model ID
- `artifacts/<project-name>/comparison.md` — 9-dimension scoring table with per-model observations, recommendation, text-rendering disclaimer

## Quality Criteria

- [ ] Base concept is ≥100 words and explicitly addresses all 6 dimensions (subject, composition, style/aesthetic, color palette, typography, mood)
- [ ] **Wheeler type declared** in base concept — one of: Wordmark, Lettermark, Pictorial mark, Abstract mark, Mascot, Combination mark, Emblem (v1.2.0)
- [ ] **Favicon-test self-check** present in base concept with one-sentence verdict (v1.2.0)
- [ ] **B&W-test self-check** present in base concept with one-sentence verdict (v1.2.0)
- [ ] Color palette names ≥3 specific colors with hex codes
- [ ] Anti-cliché statement names ≥1 specific trope avoided AND ≥1 fresher reference substituted
- [ ] Each per-model prompt uses the documented dialect for that model family (paragraph for Recraft, framework for Nano Banana, ≤2 quoted blocks for Ideogram, narrative for FLUX) — no copy-paste across models
- [ ] Exactly ONE primary mark / iconography choice per prompt (no "X or Y" ambiguity)
- [ ] ≥1 image generated successfully (target: 3 from 3 families)
- [ ] **No out-of-chain models invoked** — only models from the documented Step 7 fallback table appear in `models-used.md` (v1.2.0 strict-drop discipline)
- [ ] `models-used.md` logs every model attempt with status and ID; if a slot drops, all 3 attempted models are listed with failure reasons
- [ ] `comparison.md` 9-dimension scoring table populated for every surviving model
- [ ] **Per-Model Observations include favicon-test, B&W-test, and single-mark-clarity-test verdicts per surviving model** (v1.2.0 Step 8b output)
- [ ] Per-Model Observations section names ≥1 strength + ≥1 weakness per surviving model
- [ ] Freshness column has substantive 1-sentence-per-model justification naming cliché-honored or cliché-violated status
- [ ] Recommendation block names a SINGLE primary direction with rationale referencing the scoring table
- [ ] **Recommendation block lists ≥3 design-kit-extension considerations** for the persona's designer (Pentagram-method handoff) (v1.2.0)
- [ ] Text-rendering disclaimer present (literal phrase: "AI image generation models cannot reliably render text")
- [ ] All files saved to the correct project folder structure under `artifacts/<project-name>/`
