---
name: ai-video-generation
description: "Generate videos using ai-gen CLI with any fal.ai video model via SL8 proxy. Supports text-to-video and image-to-video with curated defaults plus pass-through for any model on fal.ai. Use when user asks to create, generate, or make videos, animations, or motion content. Triggers: video generation, text-to-video, image-to-video, create video, animate image, AI video, minimax, kling, wan, hunyuan."
metadata:
  author: StartHalo
  version: 1.1.0
  tags: video, generation, ai-gen, text-to-video, image-to-video
  category: content-generation
---

# AI Video Generation

## Overview

Generate videos from text prompts or images using the `ai-gen` CLI. Supports two modes:

- **Text-to-video** — Describe a scene and generate a video from scratch
- **Image-to-video** — Animate a static image into a video clip

**All fal.ai video models are supported.** The CLI accepts any fal.ai model ID via `-m`. The tables below are curated recommendations, but you can use any model available on fal.ai by passing its full model ID.

All video models use queue-based generation (jobs take 1-15 minutes). The CLI handles polling automatically.

## Quick Start

### Text-to-video

```bash
ai-gen video "a cat playing piano in a jazz club"
```

### Image-to-video

```bash
ai-gen video --image https://example.com/photo.jpg "the person slowly smiles"
```

## Available Models

**Any fal.ai video model works** — pass the model ID with `-m`. The curated models below have verified credit costs and tested defaults.

### Curated Text-to-Video Models

| Model ID | Speed | Best For |
|----------|-------|----------|
| `fal-ai/kling-video/v3/pro/text-to-video` | ~3-8 min | **Recommended.** Latest Kling, best quality |
| `fal-ai/minimax-video` | ~2-4 min | Fast, good quality |
| `fal-ai/kling-video/v2.5-turbo/pro/text-to-video` | ~2-5 min | Good balance of speed and quality |
| `fal-ai/wan-t2v` | ~1-3 min | Budget option, lightweight |
| `fal-ai/hunyuan-video` | ~10-15 min | High quality, open-source |

### Curated Image-to-Video Models

| Model ID | Speed | Best For |
|----------|-------|----------|
| `fal-ai/kling-video/v3/pro/image-to-video` | ~3-8 min | **Recommended.** Latest Kling, best quality |
| `fal-ai/minimax-i2v` | ~2-4 min | Fast, good quality |
| `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` | ~2-5 min | Good balance of speed and quality |
| `fal-ai/wan-i2v` | ~2-4 min | Budget option |

Credit costs vary by model and duration. Use budget models (wan) for testing.

**Note:** `fal-ai/runway-gen3` (image-to-video) and `fal-ai/kling-video` (v1) are deprecated. Use the versioned endpoints above.

### Discovering More Models

fal.ai hosts 600+ models. The curated list above is a starting point — many more video models are available including Sora 2, Veo 3, Kling v3, Seedance, and others.

**Via CLI:**

```bash
# Search for text-to-video models
ai-gen models --search kling --type video

# Search for any video-related model
ai-gen models --search "video"
```

Curated models are marked with ★ in search results.

**Via fal.ai Models API (no auth required):**

```bash
# List text-to-video models
curl -s "https://api.fal.ai/v1/models?category=text-to-video&status=active&limit=20"

# List image-to-video models
curl -s "https://api.fal.ai/v1/models?category=image-to-video&status=active&limit=20"

# Search by keyword
curl -s "https://api.fal.ai/v1/models?q=kling&status=active"
```

The `endpoint_id` from the API response is the model ID you pass to `-m`.

**Using any discovered model:**

```bash
# Use the full endpoint_id from the API or search results
ai-gen video "a sunset" -m fal-ai/kling-video/v3/pro/text-to-video
ai-gen video --image photo.jpg "animate" -m fal-ai/kling-video/v3/pro/image-to-video
```

The CLI passes the model ID directly to the proxy — no catalog entry needed.

## Usage Examples

### Text-to-video with default model

```bash
ai-gen video "ocean waves crashing on a rocky shore at sunset"
```

### Text-to-video with specific model

```bash
ai-gen video "a timelapse of flowers blooming" -m fal-ai/kling-video/v3/pro/text-to-video
```

### Image-to-video (animate an image)

```bash
ai-gen video --image https://example.com/landscape.jpg "clouds moving across the sky"
```

The CLI auto-selects an image-to-video model when `--image` is provided. Override with `-m`:

```bash
ai-gen video --image https://example.com/portrait.jpg "the person blinks and smiles" -m fal-ai/kling-video/v3/pro/image-to-video
```

### Set video duration

```bash
ai-gen video "a bird flying over a lake" -d 10
```

### JSON output

```bash
ai-gen video "a dancing robot" --format json
```

### Pass model-specific parameters

```bash
ai-gen video "a waterfall" -m fal-ai/minimax-video aspect_ratio=16:9
```

## Queue-Based Generation

All video models use queue-based processing. When you submit a job:

1. The CLI submits the request and receives a job ID
2. It automatically polls for status updates, showing progress in the terminal
3. When complete, the video is downloaded

Typical wait times range from 1-15 minutes depending on the model and server load.

### Checking job status manually

If a job was interrupted, use `ai-gen status` to check on it:

```bash
ai-gen status <request-id>
```

The request ID is shown in JSON output or in error messages if polling is interrupted.

## Prompt Engineering Tips

### Describe motion explicitly
- **Good:** "A woman walking along a beach, waves lapping at her feet, camera tracking alongside her"
- **Weak:** "a woman at the beach"

### Camera movement keywords
- "Camera slowly pans left/right"
- "Drone shot flying over"
- "Dolly zoom"
- "Static shot" (for stability)
- "Tracking shot following"

### Scene description
- Describe the setting, lighting, and atmosphere
- Mention the time of day: "golden hour", "midnight", "overcast afternoon"
- Specify art style: "cinematic", "anime", "documentary style"

### Duration guidance
- 5 seconds (default): Good for single actions, short loops
- 10 seconds: Better for sequences with multiple actions
- Longer durations may reduce quality on some models

### Image-to-video tips
- Use high-quality source images (at least 720p)
- The prompt should describe the **motion**, not the image content
- Simpler motions (camera pan, gentle movement) produce better results than complex actions
- Provide the image via a publicly accessible URL

## Advanced Parameters

Pass any model-specific parameter as `key=value` after the prompt:

```bash
ai-gen video "a sunset" aspect_ratio=16:9 cfg_scale=7.0
```

### Params file

For complex configurations, use `--params-file`:

```bash
ai-gen video --params-file video-request.json
```

Where `video-request.json` contains:
```json
{
  "prompt": "a timelapse of a city from day to night",
  "duration": 10
}
```

Use `-` to read from stdin:

```bash
echo '{"prompt": "ocean waves", "image_url": "https://example.com/sea.jpg"}' | ai-gen video --params-file -
```

## Output Handling

### Default behavior
Videos are downloaded to the output directory (default: `/home/user/artifacts` in sandbox, or current directory locally).

### URL only (no download)

```bash
ai-gen video "a sunset" --url-only
```

### JSON output

```bash
ai-gen video "a sunset" --format json
```

Returns:
```json
{
  "success": true,
  "file": "./video-20260303-120000.mp4",
  "model": "fal-ai/minimax-video",
  "request_id": "abc123",
  "data": { }
}
```

### Custom output directory

```bash
ai-gen video "a sunset" -o ./my-videos
```

## Troubleshooting

### Authentication error
```
Error: Missing session token
```
Ensure `SL8_SESSION_TOKEN` is set in the environment.

### Queue timeout
Video generation can take up to 15 minutes. If the CLI times out, use `--timeout` to increase the limit:
```bash
ai-gen video "a complex scene" --timeout 900000
```

### Image URL not accessible
```
Error: Model requires 'image_url'
```
For image-to-video, provide a publicly accessible image URL with `--image`. Local file paths are not supported — upload the image first and use the URL.

### Model requires image_url
If you use an image-to-video model without `--image`, you'll get:
```
Error: Model requires 'image_url'. Use --image <url> or choose a text-to-video model.
```

### Insufficient credits
```
Error: Insufficient credits
```
Try a budget model like `fal-ai/wan-t2v` which uses fewer credits.

### Model not found
```
Error: Model not found
```
Check the model ID with `ai-gen models --type video` to list curated models, or `ai-gen models --search <query> --type video` to search all fal.ai models.

## Related Skills

- **ai-image-generation** — Generate images from text prompts using `ai-gen image`
