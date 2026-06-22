---
name: poster-prompt-gen
description: Generates event poster concepts by crafting design-informed, model-specific prompts and producing image variations across multiple AI model families (Recraft, Ideogram, FLUX). Use when creating event posters, concert flyers, conference visuals, or any event promotional imagery.
metadata:
  author: sl8
  version: 2.0.0
  type: bot
  inputs:
    - name: event_details
      type: chat
      required: true
      description: Event name, type, date, venue, vibe, and any must-have text or imagery for the poster.
  outputs:
    - name: poster
      type: image/png
      description: Event poster image variations across multiple AI model families, plus the design-informed prompts used.
---

# Poster Prompt Generation

## Purpose

Create event poster concepts by generating model-specific prompts informed by poster design principles (composition, hierarchy, color theory, typography, style conventions), then running them across multiple AI model families via `ai-gen` to produce diverse variations for comparison.

## Inputs

- **Event name** (required) — the name of the event
- **Event date** (optional) — defaults to "Coming Soon"
- **Event time** (optional) — omitted if not provided
- **Event location** (optional) — omitted if not provided
- **Style preferences** (optional) — e.g., "retro neon", "minimalist", "corporate". Defaults based on event type classification
- **Reference prompts** (optional) — example prompts to extract style patterns from

## Instructions

### Step 1: Parse Event Details

**Before doing anything else**, re-read the user's full prompt word-by-word and extract every detail into a structured list. The user's prompt often contains ALL the information you need — do not skim it.

Write out the parsed details explicitly before proceeding:

```
Parsed from user prompt:
- Event name: [FULL name, e.g., "Live Music at Fireside Lounge" — never truncate]
- Date: [exact date if given, or "not provided"]
- Time: [exact time if given, or "not provided"]
- Location: [full location if given, or "not provided"]
- Style: [all style/atmosphere words, or "not provided"]
- References: [any reference prompts, or "none"]
- Event type: [classify: concert, corporate, community, festival, art, sports, formal, or other]
```

**Common mistake**: The user may write "create a poster for 'Live Music at Fireside Lounge' on March 10, 6 PM at [location]. Style: warm cozy lounge." — ALL of that is event data. Extract every piece. Do NOT shorten "Live Music at Fireside Lounge" to "Live".

### Step 2: Fill Defaults ONLY for Fields Marked "not provided"

Compare your parsed list against the defaults table. Only apply a default if the field was explicitly "not provided" in Step 1.

| Field | Default (ONLY if "not provided" above) |
|-------|---------|
| Date | "Coming Soon" |
| Time | Omitted entirely |
| Location | Omitted entirely |
| Style | Based on event type (see style categories in setup.md KNOWLEDGE) |
| Image size | portrait_4_3 |

**Self-check**: If you are about to mark 3+ fields as "not provided", re-read the user's prompt again — you likely missed details.

### Step 3: Analyze Reference Prompts (if provided)

If the user included reference prompts or style examples:
1. Identify recurring style patterns (color themes, artistic style, mood)
2. Extract specific visual elements or techniques mentioned
3. Incorporate these patterns into the prompt concept while maintaining coherence

If no references provided, skip this step.

### Step 4: Compose the Base Prompt Concept

Create a core creative concept that applies design principles from your KNOWLEDGE:

1. **Composition** — Choose a layout approach: rule of thirds placement, Z-pattern flow, centered symmetric, or asymmetric. Specify where the headline, date/venue, and visual elements are positioned.
2. **Visual hierarchy** — Define the dominance order: what's largest/boldest, what's secondary, what recedes. Use size, weight, and contrast to separate levels.
3. **Color palette** — Select a harmony scheme appropriate to the event type (complementary for energy, analogous for harmony, monochromatic for elegance). Specify 3-4 specific colors.
4. **Typography direction** — Choose font style that matches the event type. Describe weight, case, and relative sizing.
5. **Style/aesthetic** — Match the event type to a poster style category. Reference specific design movements or eras if appropriate.
6. **Mood/atmosphere** — Define the emotional tone, lighting quality, and energy level.

**CRITICAL — Style priority**: The user's style request is the #1 input for art direction. If the user says "warm cozy lounge atmosphere", the poster MUST reflect warmth and intimacy — NOT default to high-energy concert vibes. Only use a default style if the user provided NO style guidance.

**Quality target**: The base concept must be 100+ words and address all 6 design dimensions above.

### Step 5: Generate Model-Specific Prompts

Adapt the base concept into prompts optimized for each model family's strengths:

#### Recraft V3 Prompt
Recraft responds best to **design-specific language** with explicit typographic hierarchy and spatial composition.
```
A [style] poster design for [event].
BACKGROUND: [describe background — color, texture, imagery]
MAIN VISUAL: [describe primary graphic element]
HEADLINE: "[event name]" in [size], [weight], [font style], [color], positioned [placement].
SUBHEADING: "[date/time]" in [style] below the headline.
DETAILS: "[venue]" in [size] at [position].
OVERALL: [design aesthetic, mood]
```

#### Ideogram V3 Prompt
Ideogram excels at **text rendering** — put all text in quotation marks and keep descriptions concise.
```
A [style] event poster. [Background description]. The headline "[EVENT NAME]" in [font description] at [position]. "[Date and venue text]" in [smaller style] at [position]. [Visual elements]. [Aesthetic description].
```

#### FLUX 2 Pro Prompt
FLUX responds best to **natural language narrative paragraphs** — write descriptively, front-load important elements.
```
A professional [style] poster for [event]. [2-3 sentence narrative description covering the scene, composition, colors, mood, and key visual elements]. The title "[SHORT TEXT]" appears in [font description] at [position]. [Additional atmosphere and layout details].
```

Save all prompts to `artifacts/<project-name>/meta-prompt.md` with this structure:
```
# Meta-Prompt: <Event Name> Poster

## Assumptions
- [List every default or assumption made]

## Base Concept
[The core creative concept — composition, hierarchy, palette, typography, style, mood]

## Model-Specific Prompts

### Recraft V3
[Recraft-optimized prompt]

### Ideogram V3
[Ideogram-optimized prompt]

### FLUX 2 Pro
[FLUX-optimized prompt]

## Design Dimensions Coverage
- Composition: ✓
- Visual hierarchy: ✓
- Color palette: ✓
- Typography: ✓
- Style/aesthetic: ✓
- Mood/atmosphere: ✓
```

### Step 6: Generate Poster Images

Discover available models and generate images:

```bash
# Verify available models
ai-gen models --type image --format json
```

**Primary models (3 families):**

| Priority | Model ID | Family | Prompt Style |
|----------|----------|--------|-------------|
| 1 | `fal-ai/recraft/v3/text-to-image` | Recraft | Design language |
| 2 | `fal-ai/ideogram/v3` | Ideogram | Text-precise |
| 3 | `fal-ai/flux-2-pro` | FLUX | Narrative |

**Fallback models** (if primary unavailable):

| Primary | Fallback | Family |
|---------|----------|--------|
| `fal-ai/recraft/v3/text-to-image` | `fal-ai/recraft/v4/pro/text-to-image` | Recraft |
| `fal-ai/ideogram/v3` | `fal-ai/ideogram/v2` | Ideogram |
| `fal-ai/flux-2-pro` | `fal-ai/flux-pro/v1.1` | FLUX |

**Generate with each model:**

```bash
# Recraft V3
ai-gen image "<recraft-prompt>" -m fal-ai/recraft/v3/text-to-image -s portrait_4_3 -o artifacts/<project-name>/posters/ --format json

# Ideogram V3
ai-gen image "<ideogram-prompt>" -m fal-ai/ideogram/v3 -s portrait_4_3 -o artifacts/<project-name>/posters/ --format json

# FLUX 2 Pro
ai-gen image "<flux-prompt>" -m fal-ai/flux-2-pro -s portrait_4_3 -o artifacts/<project-name>/posters/ --format json
```

After each generation, rename the output file to a descriptive name:
```bash
mv artifacts/<project-name>/posters/<generated-filename> artifacts/<project-name>/posters/<model-family>.jpeg
```

**Error handling**: If a primary model fails, try the fallback. If the fallback also fails, log the error and continue. The task succeeds if at least 1 image is generated.

### Step 7: Create Comparison Summary

Write `artifacts/<project-name>/comparison.md`:

```
# Poster Comparison: <Event Name>

## Generation Details
- **Base concept**: [1-sentence summary of creative direction]
- **Size**: portrait_4_3
- **Date generated**: YYYY-MM-DD
- **Prompting approach**: Model-specific prompts adapted from shared base concept

## Models Used

| Model | Family | File | Credits | Speed | Notes |
|-------|--------|------|---------|-------|-------|
| [model] | [family] | posters/[name].jpeg | [credits] | [time] | [observation] |

## Per-Model Observations

### Recraft V3
[How this model interpreted the design — strengths, weaknesses, text rendering quality]

### Ideogram V3
[How this model interpreted the design — strengths, weaknesses, text rendering quality]

### FLUX 2 Pro
[How this model interpreted the design — strengths, weaknesses, text rendering quality]

## Text Rendering Disclaimer
AI image generation models cannot reliably render text. Text visible in these poster images is approximate and likely contains errors. Among the models used, Recraft and Ideogram typically render text more accurately than FLUX, but none are guaranteed accurate. These images are visual concepts and mood boards — not print-ready designs. For production use, overlay accurate text using a design tool (Figma, Canva, Photoshop).

## Total Credits Used
[Sum of credits for successful generations]
```

## Outputs

Save all deliverables to `artifacts/<project-name>/`:
- `artifacts/<project-name>/meta-prompt.md` — Base concept + model-specific prompts with assumptions and design coverage
- `artifacts/<project-name>/posters/<model-family>.jpeg` — Generated poster image(s), one per model family
- `artifacts/<project-name>/comparison.md` — Model comparison with per-model observations and text rendering disclaimer

## Quality Criteria

- [ ] Base concept is 100+ words and covers all 6 design dimensions (composition, hierarchy, color, typography, style, mood)
- [ ] 3 model-specific prompts generated (Recraft, Ideogram, FLUX)
- [ ] At least 1 image generated successfully (target: 3 from 3 families)
- [ ] Each prompt is adapted to its model's strengths (not copy-pasted)
- [ ] All assumptions documented in meta-prompt.md
- [ ] comparison.md includes per-model observations
- [ ] comparison.md includes text rendering disclaimer
- [ ] All files saved to the correct project folder structure
