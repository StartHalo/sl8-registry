---
name: ai-video-gen
description: Generates AI video clips from text descriptions using the ai-video CLI. Use when the user wants photorealistic footage, cinematic B-roll, lifestyle shots, or any AI-generated video content that doesn't require precise text rendering.
metadata:
  author: sl8
  version: 1.0.0
  type: bot
  inputs:
    - name: description
      type: chat
      required: true
      description: A text description of the footage, B-roll, or cinematic clip to generate.
  outputs:
    - name: clip
      type: video/mp4
      description: An AI-generated video clip from the text description.
---

# AI Video Generation

## Purpose

Generate photorealistic AI video clips from text descriptions using the `ai-video` CLI tool. This skill handles model selection, prompt crafting, and generation for cinematic footage, lifestyle shots, and creative video content.

## Inputs

- **Video description** (required) — what the video should show
- **Duration** (optional) — seconds, default 10
- **Aspect ratio** (optional) — default 9:16 (vertical)
- **Model preference** (optional) — default google/veo-3-fast
- **Resolution** (optional) — default 1080p

## Instructions

### Step 1: Craft the Video Prompt

Transform the user's description into an optimized video prompt. Include:

1. **Camera movement**: drone shot, slow pan, tracking shot, static, dolly zoom
2. **Lighting**: golden hour, dramatic, soft ambient, neon, studio
3. **Subject and action**: what's happening, how subjects move
4. **Mood/style**: cinematic, documentary, professional, artistic
5. **Composition**: framing, depth of field, foreground/background

**Example transformation**:
- User: "coffee shop scene"
- Optimized: "Slow-motion close-up of latte art being poured into a ceramic cup, warm golden lighting, cozy cafe interior with soft bokeh background, professional cinematography, shallow depth of field"

### Step 2: Select Model

| Use Case | Model | Cost | Notes |
|----------|-------|------|-------|
| Default / balanced | `google/veo-3-fast` | ~$0.10-$0.15/sec | Good quality, fast |
| Budget / iteration | `kwaivgi/kling-v2.5-turbo-pro` | ~$0.07/sec | Cheapest, versatile |
| Final production | `google/veo-3.1` | ~$0.20-$0.40/sec | Highest quality + audio |
| Anime / effects | `pixverse/pixverse-v5` | ~$0.30-$1.60/run | 5-8s max duration |

Selection rules:
- If user says "high quality" or "production" → `google/veo-3.1`
- If user mentions audio or music → `google/veo-3.1` (only model with audio)
- If user says "cheap" or "test" → `kwaivgi/kling-v2.5-turbo-pro`
- If user mentions anime or special effects → `pixverse/pixverse-v5`
- Default → `google/veo-3-fast`

### Step 3: Estimate Cost

Before generating, check the cost:

```bash
ai-video estimate --model "google/veo-3-fast" --duration 10
```

### Step 4: Generate Video

```bash
ai-video generate \
  --prompt "<optimized prompt>" \
  --model "<selected-model>" \
  --duration <seconds> \
  --resolution 1080p \
  --aspect-ratio 9:16 \
  --output-format json
```

Parse the JSON output to get the file path.

Move/rename the output file:
```bash
mv <generated-file> artifacts/<project>/clip.mp4
```

### Step 5: Verify and Document

1. Confirm the file exists and has non-zero size
2. Note the model used, duration, cost, and any observations
3. If generation failed, try a fallback model:
   - `google/veo-3-fast` fails → try `kwaivgi/kling-v2.5-turbo-pro`
   - `google/veo-3.1` fails → try `google/veo-3-fast`

## Aspect Ratio Guide

| Platform | Aspect Ratio | Flag |
|----------|-------------|------|
| TikTok / Reels / Shorts | 9:16 | `--aspect-ratio 9:16` |
| YouTube / Desktop | 16:9 | `--aspect-ratio 16:9` |
| Instagram Feed | 1:1 | `--aspect-ratio 1:1` |

## Outputs

- `artifacts/<project>/clip.mp4` — AI-generated video clip

## Quality Criteria

- [ ] Video generated successfully (non-zero file size)
- [ ] Correct aspect ratio and resolution
- [ ] Prompt includes camera, lighting, subject, mood, and composition details
- [ ] Cost estimated before generation
- [ ] Model selection documented
