---
name: ai-image-generation
description: This skill should be used when generating AI images using the @starthalo/ai-image CLI. It provides model selection guidance and usage patterns for generating images with models like DALL-E, Stable Diffusion, Imagen, and Flux from providers including OpenAI, Stability AI, Google, and FAL.ai.
---

# AI Image Generation

## Overview

Enable AI-powered image generation using the @starthalo/ai-image CLI tool. This skill provides guidance for selecting appropriate models and generating images with various providers (OpenAI, Stability AI, Google, FAL.ai). The CLI handles cost estimation, credit validation, and configuration automatically.

## Quick Start

Generate an image with a simple command:

```bash
ai-image generate \
  --prompt "A serene mountain landscape at sunset" \
  --model "stability-ai/sdxl"
```

The CLI will automatically:
- Estimate the cost
- Check your credit balance
- Validate your credentials
- Generate the image
- Upload to storage
- Charge your credits

## Model Selection

Select the appropriate model based on your requirements:

### By Use Case

**Quick Prototyping** → `fal-ai/flux-schnell` or `google/imagen-3-fast`
- Fast generation
- Lower cost
- Good for iterations

**Production/High Quality** → `openai/dall-e-3` (hd) or `fal-ai/flux-1-1-pro`
- Best quality
- Detailed results
- Professional use

**General Purpose** → `stability-ai/sdxl` or `openai/dall-e-2`
- Balanced quality/cost
- Versatile
- Good for most needs

**Photorealism** → `google/imagen-3` or `openai/dall-e-3`
- Realistic photos
- Best prompt understanding
- Excellent for product shots

### By Budget

**Low Cost (~50-100 credits/image)**
- `fal-ai/flux-schnell`
- `google/imagen-3-fast`
- `stability-ai/sdxl`

**Medium Cost (~100-200 credits/image)**
- `openai/dall-e-2`
- `fal-ai/flux-dev`
- `google/imagen-3`

**Premium (~200-300+ credits/image)**
- `openai/dall-e-3` (standard and hd)
- `fal-ai/flux-1-1-pro`

**Reference:** See `references/models.md` for complete model details and pricing.

## Common Usage Patterns

### Generate with Specific Dimensions

```bash
ai-image generate \
  --prompt "Product photo of smartphone on marble surface" \
  --model "stability-ai/sdxl" \
  --width 1280 \
  --height 720
```

### Generate Multiple Variations

```bash
ai-image generate \
  --prompt "Fantasy character concept art, elven warrior" \
  --model "stability-ai/sdxl" \
  --num-images 4
```

### High-Quality Production Image

```bash
ai-image generate \
  --prompt "Professional product photo with soft lighting and bokeh background" \
  --model "openai/dall-e-3" \
  --quality hd \
  --width 1792 \
  --height 1024
```

### Social Media Content

**Instagram Post (Square):**
```bash
ai-image generate \
  --prompt "Flat lay of healthy breakfast foods, top-down view" \
  --model "fal-ai/flux-schnell" \
  --width 1024 \
  --height 1024
```

**Instagram Story (Vertical):**
```bash
ai-image generate \
  --prompt "Motivational quote design with nature background" \
  --model "stability-ai/sdxl" \
  --width 1080 \
  --height 1920
```

### Reproducible Results

Use seeds to generate consistent results:

```bash
# Generate with seed
ai-image generate \
  --prompt "Cyberpunk city street at night" \
  --model "stability-ai/sdxl" \
  --seed 12345

# Reuse seed for variations
ai-image generate \
  --prompt "Cyberpunk city street at night" \
  --model "stability-ai/sdxl" \
  --seed 12345 \
  --width 1920 \
  --height 1080
```

## Output Formats

Control output format for different needs:

**Human-readable (default):**
```bash
ai-image generate --prompt "..." --model "..."
```

**JSON for scripting:**
```bash
ai-image generate \
  --prompt "..." \
  --model "..." \
  --output-format json > result.json
```

**Quiet mode (no progress indicators):**
```bash
ai-image generate \
  --prompt "..." \
  --model "..." \
  --quiet
```

## Iterative Workflow

Start fast and cheap, finish with quality:

```bash
# Phase 1: Fast prototyping
ai-image generate \
  --prompt "Futuristic city concept" \
  --model "fal-ai/flux-schnell" \
  --num-images 4

# Phase 2: Refine prompt
ai-image generate \
  --prompt "Detailed futuristic city with neon signs, cyberpunk, night scene" \
  --model "stability-ai/sdxl" \
  --num-images 2

# Phase 3: Final production
ai-image generate \
  --prompt "Cinematic futuristic city, neon signs, cyberpunk aesthetic, rainy night, dramatic lighting, 8k detail" \
  --model "openai/dall-e-3" \
  --quality hd
```

## Troubleshooting

### Insufficient Credits Error

**Error:** "Insufficient credits for generation"

**Diagnostic:**
```bash
# Check your balance
ai-image balance

# Estimate cost for your request
ai-image estimate --model "openai/dall-e-3" --quality hd --num-images 4
```

**Solutions:**
1. Use a cheaper model (`fal-ai/flux-schnell` or `google/imagen-3-fast`)
2. Reduce number of images (`--num-images 1`)
3. Use standard quality instead of HD
4. Add credits to your account

### Authentication Failed

**Error:** "Authentication failed" or "Invalid API token"

**Diagnostic - Check environment variables:**
```bash
# Required variables
echo $USER_ID
echo $REPLICATE_API_TOKEN  # For most models
echo $OPENAI_API_KEY       # For DALL-E models
echo $POLAR_ACCESS_TOKEN   # For billing
echo $GCS_BUCKET_NAME      # For storage
```

**Solutions:**
1. Verify required environment variables are set
2. Check tokens haven't expired
3. For OpenAI models: ensure `OPENAI_API_KEY` is set
4. For other models: ensure `REPLICATE_API_TOKEN` is set

### Model Not Supported

**Error:** "Model not supported" or "Model doesn't support image generation"

**Solutions:**
1. Verify model name uses `provider/model` format:
   - ✅ `openai/dall-e-3`
   - ❌ `dall-e-3`
2. Check spelling against supported models in `references/models.md`
3. Ensure you're using an image model (not a video model)

### Storage Upload Failed

**Error:** "Failed to upload to GCS"

**Diagnostic - Check GCS variables:**
```bash
echo $GCS_BUCKET_NAME
echo $GCS_PROJECT_ID
echo $GOOGLE_APPLICATION_CREDENTIALS  # Path to credentials file
```

**Solutions:**
1. Verify GCS environment variables are set
2. Check credentials file exists and is accessible
3. Ensure service account has write permissions to bucket

## Best Practices

1. **Start Fast, Finish Slow** - Use cheap models for iteration, premium for finals

2. **Match Model to Use Case** - Different models excel at different things:
   - Text in images → `google/imagen-3`
   - Artistic styles → `stability-ai/sdxl`
   - Photorealism → `google/imagen-3` or `openai/dall-e-3`
   - Speed → `fal-ai/flux-schnell`

3. **Use Seeds for Consistency** - When you find a good composition, reuse the seed

4. **Detailed Prompts Work Better** - Include lighting, camera angles, style details

5. **Quality vs Cost Trade-off** - Standard quality is often sufficient; reserve HD for truly important images

6. **Batch When Possible** - Generate multiple images in one command (`--num-images 4`)

7. **Check Costs for Bulk** - For large batches, estimate first to avoid surprises

## Environment Variables Reference

The CLI requires these environment variables (should already be configured in your environment):

**Required for all operations:**
- `USER_ID` - Your Polar.sh user ID
- `POLAR_ACCESS_TOKEN` - Polar.sh API token
- `POLAR_ORGANIZATION_ID` - Your organization ID
- `GCS_BUCKET_NAME` - Google Cloud Storage bucket
- `GCS_PROJECT_ID` - GCP project ID

**Required based on model provider:**
- `REPLICATE_API_TOKEN` - For Stability AI, Google, FAL models
- `OPENAI_API_KEY` - For DALL-E models
- `GOOGLE_API_KEY` - For direct Google API access (optional)
- `FAL_KEY` - For FAL.ai models (optional)

**Optional:**
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to GCS credentials file
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)

## Reference Documentation

Detailed documentation in `references/` directory:

- **`references/models.md`** - Complete model catalog with:
  - Full list of 9+ supported models
  - Detailed capabilities and best use cases
  - Pricing information for each model
  - Selection guide by use case and budget

- **`references/configuration.md`** - Environment setup guide:
  - Complete list of environment variables
  - Provider-specific requirements
  - Configuration precedence rules
  - Security best practices

- **`references/examples.md`** - Advanced examples:
  - Social media optimization workflows
  - Batch processing patterns
  - Complex prompt engineering
  - Cost optimization strategies

Load these files when you need:
- Detailed model comparison
- Environment troubleshooting
- Advanced usage patterns
- Specific use case examples

## Quick Command Reference

```bash
# Basic generation
ai-image generate --prompt "..." --model "stability-ai/sdxl"

# With dimensions
ai-image generate --prompt "..." --model "..." --width 1280 --height 720

# Multiple images
ai-image generate --prompt "..." --model "..." --num-images 4

# High quality
ai-image generate --prompt "..." --model "openai/dall-e-3" --quality hd

# With seed
ai-image generate --prompt "..." --model "..." --seed 42

# Check balance
ai-image balance

# Estimate cost
ai-image estimate --model "..." --num-images 4

# JSON output
ai-image generate --prompt "..." --model "..." --output-format json

# Quiet mode
ai-image generate --prompt "..." --model "..." --quiet
```

## Important Notes

1. **Model Format:** Always use `provider/model` format (e.g., `openai/dall-e-3`, not just `dall-e-3`)

2. **Automatic Validation:** The CLI automatically checks credits before generation - no need to manually check balance unless troubleshooting

3. **Cost Varies by Model:** Check `references/models.md` for current pricing

4. **Resolution Limits:** Each model has specific resolution limits - refer to model documentation

5. **Environment Required:** All environment variables must be configured before using the CLI
