# Supported Video Models

This document lists all supported AI video generation models, their capabilities, and typical pricing.

## Model List

### ByteDance Models (SeeDance)

#### bytedance/seedance-1-pro-fast
- **Name**: SeeDance 1 Pro Fast
- **Provider**: ByteDance (via Replicate)
- **Quality**: Good quality with fast generation
- **Best for**: Quick video generation, prototyping
- **Supported durations**: 1-30 seconds
- **Supported resolutions**: 480p, 720p, 1080p, 1440p, 2160p
- **Supported aspect ratios**: 16:9, 9:16, 1:1, 4:3, 3:4
- **Typical cost**: ~25 credits/second
- **Example**: 10-second 1080p video = ~250 credits

#### bytedance/seedance-1-pro
- **Name**: SeeDance 1 Pro
- **Provider**: ByteDance (via Replicate)
- **Quality**: Higher quality, slower generation
- **Best for**: Production-quality videos
- **Supported durations**: 1-30 seconds
- **Supported resolutions**: 480p, 720p, 1080p, 1440p, 2160p
- **Supported aspect ratios**: 16:9, 9:16, 1:1, 4:3, 3:4
- **Typical cost**: ~50 credits/second
- **Example**: 10-second 1080p video = ~500 credits

### Google Models (Veo)

#### google/veo-3-1
- **Name**: Veo 3.1 (Legacy)
- **Provider**: Google (via Replicate)
- **Quality**: High-quality, photorealistic
- **Best for**: Professional video generation
- **Supported durations**: 1-30 seconds
- **Special features**: Audio generation support
- **Supported resolutions**: 480p, 720p, 1080p, 1440p, 2160p
- **Base cost**: ~100 credits/second
- **Audio cost**: +30 credits (if audio enabled)
- **Note**: Legacy model, prefer veo-3.1 (new version)

#### google/veo-3.1
- **Name**: Veo 3.1 (Standard)
- **Provider**: Google (via Replicate)
- **Quality**: High-quality, photorealistic
- **Best for**: Professional video generation with audio
- **Supported durations**: 1-30 seconds
- **Special features**: Enhanced audio generation
- **Supported resolutions**: 480p, 720p, 1080p, 1440p, 2160p
- **Base cost**: ~100 credits/second
- **Audio cost**: +30 credits (if audio enabled)
- **Example**: 10-second 1080p video = ~1030 credits (with audio)

#### google/veo-3.1-fast
- **Name**: Veo 3.1 Fast
- **Provider**: Google (via Replicate)
- **Quality**: Good quality, faster generation
- **Best for**: Quick iterations, testing
- **Supported durations**: 1-30 seconds
- **Special features**: Audio generation support
- **Supported resolutions**: 480p, 720p, 1080p, 1440p, 2160p
- **Base cost**: ~50 credits/second
- **Audio cost**: +15 credits (if audio enabled)
- **Example**: 10-second 1080p video = ~515 credits (with audio)

### MiniMax Models

#### minimax/hailuo-2.3
- **Name**: Hailuo 2.3
- **Provider**: MiniMax (via Replicate)
- **Quality**: High-quality video generation
- **Best for**: General purpose video generation
- **Supported durations**: 1-30 seconds
- **Pricing**: Tiered based on duration
  - 1-5 seconds: 100 credits/second
  - 6-10 seconds: 75 credits/second
  - 11+ seconds: 50 credits/second
- **Supported resolutions**: 480p, 720p, 1080p
- **Example**:
  - 3-second video = 300 credits
  - 8-second video = 600 credits (5×100 + 3×75)
  - 15-second video = 875 credits (5×100 + 5×75 + 5×50)

## Model Selection Guide

### By Use Case

**Quick Prototyping / Testing**
- bytedance/seedance-1-pro-fast
- google/veo-3.1-fast

**Production Quality**
- google/veo-3.1
- bytedance/seedance-1-pro

**General Purpose**
- minimax/hailuo-2.3
- bytedance/seedance-1-pro-fast

**Photorealistic / Professional**
- google/veo-3.1
- google/veo-3-1

**Videos with Audio**
- google/veo-3.1 (enhanced audio)
- google/veo-3.1-fast
- google/veo-3-1 (legacy)

### By Cost

**Low Cost (~25-50 credits/second)**
- bytedance/seedance-1-pro-fast (~25 credits/second)
- minimax/hailuo-2.3 (11+ seconds: ~50 credits/second)
- google/veo-3.1-fast (~50 credits/second)

**Medium Cost (~50-100 credits/second)**
- bytedance/seedance-1-pro (~50 credits/second)
- minimax/hailuo-2.3 (6-10 seconds: ~75 credits/second)

**Premium Cost (~100+ credits/second)**
- google/veo-3.1 (~100 credits/second + audio)
- google/veo-3-1 (~100 credits/second + audio)
- minimax/hailuo-2.3 (1-5 seconds: ~100 credits/second)

### By Duration

**Short Clips (1-5 seconds)**
- Any model works well
- Consider higher-quality models for short clips

**Medium Duration (5-15 seconds)**
- bytedance/seedance-1-pro-fast (cost-effective)
- minimax/hailuo-2.3 (tiered pricing benefits)
- google/veo-3.1-fast

**Longer Videos (15-30 seconds)**
- bytedance/seedance-1-pro-fast (most cost-effective)
- minimax/hailuo-2.3 (benefits from lower tier pricing)

## Common Parameters

All models support these common parameters:

- **prompt** (required): Text description of the video to generate
- **model** (required): Model identifier from the list above
- **duration**: Video duration in seconds (1-30, default: 10)
- **resolution**: Video resolution (default: 1080p)
  - 480p, 720p, 1080p, 1440p, 2160p
- **aspect-ratio**: Video aspect ratio (default: 16:9)
  - 16:9 (widescreen)
  - 9:16 (vertical/portrait)
  - 1:1 (square)
  - 4:3 (standard)
  - 3:4 (portrait)
- **fps**: Frames per second (optional, model-specific defaults)
- **seed**: Random seed for reproducibility (optional)

### Model-Specific Parameters

**Google Veo Models:**
- Support audio generation (costs extra)
- Higher resolution support up to 2160p
- Best prompt understanding

**ByteDance SeeDance Models:**
- Fastest generation times
- Good balance of quality and cost
- Support all aspect ratios

**MiniMax Hailuo:**
- Tiered pricing (cheaper for longer videos)
- Good for consistent style across clips

## Resolution Guidelines

### Common Resolutions

- **480p (854×480)**: Low quality, fast generation, lowest cost
- **720p (1280×720)**: HD quality, good for web
- **1080p (1920×1080)**: Full HD, standard for most use cases
- **1440p (2560×1440)**: 2K quality, high quality
- **2160p (3840×2160)**: 4K quality, premium quality (highest cost)

### Resolution Recommendations

**Social Media**
- Instagram/TikTok (9:16): 1080p or 720p
- YouTube (16:9): 1080p or 1440p
- Square posts (1:1): 1080p

**Professional Use**
- Marketing videos: 1080p or 1440p
- Presentations: 1080p
- High-end production: 2160p

**Testing/Prototyping**
- 480p or 720p (faster and cheaper)

## Important Notes

1. **Model Format**: Always use the full `provider/model` format (e.g., `bytedance/seedance-1-pro-fast`)

2. **Duration Limits**: All models support 1-30 seconds. Longer videos require multiple generations.

3. **Cost Calculation**:
   - Most models: `credits = base_cost_per_second × duration`
   - Veo models: `credits = (base_cost_per_second × duration) + audio_cost` (if audio enabled)
   - MiniMax: Tiered pricing based on duration ranges

4. **Resolution Impact**: Higher resolution generally means:
   - Longer generation time
   - Higher quality output
   - Same credit cost (cost is per-second, not per-pixel)

5. **Aspect Ratio**: Choose based on intended platform:
   - 16:9: Desktop, YouTube, web
   - 9:16: Mobile, Instagram Stories, TikTok
   - 1:1: Instagram feed, social posts
   - 4:3/3:4: Traditional formats

6. **Audio Generation**: Only Veo models support audio generation. It adds a flat cost per video, not per second.
