---
name: ai-video-generation
description: This skill should be used when generating AI videos using the @starthalo/ai-video CLI. It provides model selection guidance and usage patterns for generating videos with models like Veo, SeeDance, and Hailuo from providers including Google, ByteDance, and MiniMax via Replicate.
---

# AI Video Generation

## Overview

Enable AI-powered video generation using the @starthalo/ai-video CLI tool. This skill provides guidance for selecting appropriate models and generating videos with various providers (Google Veo, ByteDance SeeDance, MiniMax Hailuo). The CLI handles cost estimation, credit validation, and configuration automatically.

## Quick Start

Generate a video with a simple command:

```bash
ai-video generate \
  --prompt "A cinematic drone shot flying over mountains at sunset" \
  --model "bytedance/seedance-1-pro-fast"
```

The CLI will automatically:
- Estimate the cost
- Check your credit balance
- Validate your credentials
- Generate the video
- Upload to storage
- Charge your credits

## Model Selection

Select the appropriate model based on your requirements:

### By Use Case

**Quick Prototyping/Testing** → `bytedance/seedance-1-pro-fast` or `google/veo-3.1-fast`
- Fast generation
- Lower cost (~25-50 credits/second)
- Good for iterations

**Production Quality** → `google/veo-3.1` or `bytedance/seedance-1-pro`
- High quality output
- Professional results
- Best for final deliverables

**General Purpose** → `minimax/hailuo-2.3` or `bytedance/seedance-1-pro-fast`
- Balanced quality/cost
- Tiered pricing (cheaper for longer videos)
- Versatile

**Photorealistic/Professional** → `google/veo-3.1`
- Best quality
- Excellent prompt understanding
- Supports audio generation

**Videos with Audio** → Google Veo models only
- `google/veo-3.1` (enhanced audio)
- `google/veo-3.1-fast`
- Adds flat audio cost (not per-second)

### By Budget

**Low Cost (~25-50 credits/second)**
- `bytedance/seedance-1-pro-fast` (~25 credits/second)
- `minimax/hailuo-2.3` (11+ seconds: ~50 credits/second)
- `google/veo-3.1-fast` (~50 credits/second)

**Medium Cost (~50-100 credits/second)**
- `bytedance/seedance-1-pro` (~50 credits/second)
- `minimax/hailuo-2.3` (6-10 seconds: ~75 credits/second)

**Premium (~100+ credits/second)**
- `google/veo-3.1` (~100 credits/second + audio)
- `minimax/hailuo-2.3` (1-5 seconds: ~100 credits/second)

### By Duration

**Short Clips (1-5 seconds)** - Any model works, consider quality over cost

**Medium Duration (5-15 seconds)** - `bytedance/seedance-1-pro-fast` or `minimax/hailuo-2.3`

**Longer Videos (15-30 seconds)** - `bytedance/seedance-1-pro-fast` (most cost-effective) or `minimax/hailuo-2.3` (benefits from lower tier pricing)

**Reference:** See `references/models.md` for complete model details and tiered pricing.

## Common Usage Patterns

### Social Media Content

**Instagram Reels / TikTok (Vertical):**
```bash
ai-video generate \
  --prompt "Fashion model walking in slow motion, urban background" \
  --model "bytedance/seedance-1-pro-fast" \
  --duration 15 \
  --resolution 1080p \
  --aspect-ratio 9:16
```

**YouTube Shorts (Vertical):**
```bash
ai-video generate \
  --prompt "Quick recipe demonstration, overhead view, vibrant colors" \
  --model "google/veo-3.1-fast" \
  --duration 30 \
  --resolution 1080p \
  --aspect-ratio 9:16
```

**Instagram Feed (Square):**
```bash
ai-video generate \
  --prompt "Product unboxing with smooth camera movement" \
  --model "bytedance/seedance-1-pro-fast" \
  --duration 10 \
  --resolution 1080p \
  --aspect-ratio 1:1
```

**YouTube/Desktop (Widescreen):**
```bash
ai-video generate \
  --prompt "Documentary-style nature footage, aerial view" \
  --model "google/veo-3.1" \
  --duration 20 \
  --resolution 1440p \
  --aspect-ratio 16:9
```

### High-Quality Production

```bash
ai-video generate \
  --prompt "Cinematic establishing shot of modern office building, golden hour lighting, professional cinematography" \
  --model "google/veo-3.1" \
  --duration 10 \
  --resolution 1440p \
  --aspect-ratio 16:9
```

### Videos with Audio

Google Veo models support audio generation:

```bash
ai-video generate \
  --prompt "Jazz band performing in dimly lit club, smooth camera pan across musicians, ambient jazz music" \
  --model "google/veo-3.1" \
  --duration 20 \
  --resolution 1080p
```

**Note:** Audio is automatically generated when the prompt suggests audio content. Audio adds a flat cost:
- `google/veo-3.1`: +30 credits
- `google/veo-3.1-fast`: +15 credits

### Reproducible Results

Use seeds to maintain consistent visual style across clips:

```bash
# Scene 1
ai-video generate \
  --prompt "Scene 1: City street at night, neon signs" \
  --model "bytedance/seedance-1-pro-fast" \
  --duration 5 \
  --seed 42

# Scene 2 with same visual style
ai-video generate \
  --prompt "Scene 2: Busy marketplace during day" \
  --model "bytedance/seedance-1-pro-fast" \
  --duration 5 \
  --seed 42
```

### Cost-Effective Long Videos

Use MiniMax for videos over 11 seconds (tiered pricing benefits):

```bash
ai-video generate \
  --prompt "Documentary-style coral reef ecosystem footage, underwater camera" \
  --model "minimax/hailuo-2.3" \
  --duration 20 \
  --resolution 1080p
```

**MiniMax Pricing Tiers:**
- 1-5 seconds: 100 credits/second
- 6-10 seconds: 75 credits/second
- 11+ seconds: 50 credits/second

## Output Formats

Control output format for different needs:

**Human-readable (default):**
```bash
ai-video generate --prompt "..." --model "..."
```

**JSON for scripting:**
```bash
ai-video generate \
  --prompt "..." \
  --model "..." \
  --output-format json > result.json
```

**Quiet mode (no progress indicators):**
```bash
ai-video generate \
  --prompt "..." \
  --model "..." \
  --quiet
```

## Iterative Workflow

Start fast and cheap, finish with quality:

```bash
# Phase 1: Fast prototyping (low cost, low resolution)
ai-video generate \
  --prompt "Ocean waves concept" \
  --model "bytedance/seedance-1-pro-fast" \
  --duration 5 \
  --resolution 480p

# Phase 2: Refine prompt, test at target resolution
ai-video generate \
  --prompt "Slow-motion ocean waves crashing on rocky shore, golden hour lighting" \
  --model "bytedance/seedance-1-pro-fast" \
  --duration 8 \
  --resolution 1080p

# Phase 3: Final production (high quality)
ai-video generate \
  --prompt "Cinematic slow-motion ocean waves crashing on rocky shore at golden hour, dramatic lighting, 4K quality" \
  --model "google/veo-3.1" \
  --duration 15 \
  --resolution 1440p
```

## Troubleshooting

### Insufficient Credits Error

**Error:** "Insufficient credits for generation"

**Diagnostic:**
```bash
# Check your balance
ai-video balance

# Estimate cost for your request
ai-video estimate --model "google/veo-3.1" --duration 15
```

**Solutions:**
1. Use a cheaper model (`bytedance/seedance-1-pro-fast`)
2. Reduce duration (cost scales linearly with duration)
3. For longer videos, use `minimax/hailuo-2.3` (tiered pricing)
4. Add credits to your account

**Note:** Video costs are per-second, so a 30-second video costs 3x a 10-second video.

### Authentication Failed

**Error:** "Authentication failed" or "Invalid API token"

**Diagnostic - Check environment variables:**
```bash
# Required variables
echo $USER_ID
echo $REPLICATE_API_TOKEN  # All video models use Replicate
echo $POLAR_ACCESS_TOKEN   # For billing
echo $GCS_BUCKET_NAME      # For storage
```

**Solutions:**
1. Verify required environment variables are set
2. **Important:** All video models (Google, ByteDance, MiniMax) require `REPLICATE_API_TOKEN`
3. Check token hasn't expired

### Model Not Supported

**Error:** "Model not supported" or "Model doesn't support video generation"

**Solutions:**
1. Verify model name uses `provider/model` format:
   - ✅ `bytedance/seedance-1-pro-fast`
   - ❌ `seedance-1-pro-fast`
2. Check spelling against supported models in `references/models.md`
3. Ensure you're using a video model (not an image model)

### Duration Exceeds Maximum

**Error:** "Duration exceeds maximum"

**Solutions:**
1. Maximum duration is 30 seconds per generation
2. Split longer videos into multiple generations
3. Use same seed across clips to maintain visual consistency

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
3. Videos are larger files; ensure sufficient storage quota
4. Ensure service account has write permissions to bucket

## Best Practices

1. **Start Fast, Finish Slow** - Use fast/cheap models for iteration, premium for finals

2. **Duration Sweet Spots:**
   - ByteDance: Any duration works well
   - MiniMax: 11+ seconds gets best per-second pricing
   - Veo: 10-15 seconds balances quality and cost

3. **Resolution Strategy** - Test at 480p/720p, produce at 1080p/1440p

4. **Aspect Ratio Planning** - Know your target platform before generating:
   - 16:9 for YouTube, desktop
   - 9:16 for TikTok, Instagram Stories
   - 1:1 for Instagram feed

5. **Prompt Engineering** - Include camera angles, lighting, and movement details

6. **Audio Consideration** - Only Veo models support audio; factor flat audio cost into budget

7. **Use Seeds for Consistency** - Maintain visual style across multiple clips

8. **Cost Awareness** - Always remember duration = cost (scales linearly)

## Environment Variables Reference

The CLI requires these environment variables (should already be configured in your environment):

**Required for all operations:**
- `USER_ID` - Your Polar.sh user ID
- `REPLICATE_API_TOKEN` - Replicate API token (required for ALL video models)
- `POLAR_ACCESS_TOKEN` - Polar.sh API token
- `POLAR_ORGANIZATION_ID` - Your organization ID
- `GCS_BUCKET_NAME` - Google Cloud Storage bucket
- `GCS_PROJECT_ID` - GCP project ID

**Optional:**
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to GCS credentials file
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)

**Important:** Even though models are named with provider prefixes (google/, bytedance/), they all use the Replicate API. You only need `REPLICATE_API_TOKEN`, not individual provider tokens.

## Reference Documentation

Detailed documentation in `references/` directory:

- **`references/models.md`** - Complete model catalog:
  - 6 supported models with detailed descriptions
  - Tiered pricing for MiniMax
  - Audio costs for Veo models
  - Selection guide by use case, budget, and duration

- **`references/configuration.md`** - Environment setup:
  - Complete list of environment variables
  - Provider-specific requirements (all use Replicate)
  - Troubleshooting environment issues

- **`references/examples.md`** - Advanced examples:
  - Social media optimization workflows
  - Batch processing patterns
  - Multi-resolution workflows
  - Cost optimization strategies

Load these files when you need:
- Detailed model comparison and tiered pricing
- Environment troubleshooting
- Advanced usage patterns
- Platform-specific optimizations

## Quick Command Reference

```bash
# Basic generation
ai-video generate --prompt "..." --model "bytedance/seedance-1-pro-fast"

# With duration and resolution
ai-video generate --prompt "..." --model "..." --duration 15 --resolution 1080p

# Vertical for social media
ai-video generate --prompt "..." --model "..." --aspect-ratio 9:16

# With seed for consistency
ai-video generate --prompt "..." --model "..." --seed 42

# Check balance
ai-video balance

# Estimate cost
ai-video estimate --model "..." --duration 20

# JSON output
ai-video generate --prompt "..." --model "..." --output-format json

# Quiet mode
ai-video generate --prompt "..." --model "..." --quiet
```

## Important Notes

1. **Single Provider:** All video models (Google, ByteDance, MiniMax) use Replicate as the API provider. Only need `REPLICATE_API_TOKEN`.

2. **Duration = Cost:** Video generation costs scale linearly with duration. A 30-second video costs 3x a 10-second video.

3. **Automatic Validation:** The CLI automatically checks credits before generation - no need to manually check balance unless troubleshooting.

4. **Audio = Extra Cost:** Veo models add flat audio cost (not per-second) if prompt suggests audio.

5. **Resolution ≠ Cost:** Higher resolution doesn't increase credits, but may increase generation time.

6. **Tiered Pricing:** MiniMax Hailuo uses tiered pricing - longer videos get lower per-second rates.

7. **Maximum Duration:** All models support 1-30 seconds max per generation.

8. **Model Format:** Always use `provider/model` format (e.g., `bytedance/seedance-1-pro-fast`).
