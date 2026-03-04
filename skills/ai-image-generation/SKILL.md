---
name: ai-image-generation
description: "Generate images using ai-gen CLI with FLUX, Stable Diffusion, Ideogram, Recraft and 7+ models via SL8 proxy. Use when user asks to create, generate, or make images, illustrations, photos, art, or visual content. Triggers: image generation, text-to-image, create image, generate picture, AI art, flux, stable diffusion, ideogram, recraft."
metadata:
  author: StartHalo
  version: 1.0.0
  tags: image, generation, ai-gen, flux, stable-diffusion
  category: content-generation
---

# AI Image Generation

## Overview

Generate images from text prompts using the `ai-gen` CLI. Supports 7 curated models including FLUX (fastest), Stable Diffusion 3.5, Ideogram (best text rendering), and Recraft (illustration style). All generation happens via the SL8 service proxy.

Use this skill when the user asks to create, generate, or make any kind of image, illustration, photo, artwork, or visual content.

## Quick Start

```bash
ai-gen image "a sunset over mountains with golden light"
```

This uses the default model (`fal-ai/flux-schnell`) and saves the image to the current output directory.

## Available Models

| Model ID | Credits | Speed | Best For |
|----------|---------|-------|----------|
| `fal-ai/flux-schnell` | 2 | ~5s | **Recommended.** Fastest generation, good quality |
| `fal-ai/flux-dev` | 13 | ~15s | High-quality general purpose |
| `fal-ai/flux-pro` | 20 | ~30s | Premium quality, fine details |
| `fal-ai/flux-realism` | 18 | ~20s | Photorealistic images |
| `fal-ai/ideogram-v2` | 10 | ~10s | Text rendering in images, logos, design |
| `fal-ai/stable-diffusion-v35-large` | 8 | ~10s | Open-source, good balance |
| `fal-ai/recraft-v3` | 12 | ~15s | Illustration and vector-style |

Credit costs are at default 1024x1024 resolution. Higher resolutions cost more.

## Usage Examples

### Basic generation (default model)

```bash
ai-gen image "a cute cat sitting on a windowsill"
```

### Choose a specific model

```bash
ai-gen image "a portrait photograph" -m fal-ai/flux-realism
```

### Custom image size

```bash
ai-gen image "a wide landscape" -s landscape_16_9
```

### Generate multiple images

```bash
ai-gen image "abstract art" -n 4
```

### Pass model-specific parameters

```bash
ai-gen image "a forest path" -m fal-ai/flux-dev guidance_scale=7.5 num_inference_steps=30
```

### Use a JSON params file

```bash
ai-gen image --params-file request.json -m fal-ai/flux-pro
```

Where `request.json` contains:
```json
{
  "prompt": "a cyberpunk cityscape at night",
  "image_size": "landscape_16_9",
  "num_images": 2
}
```

### Reproducible output with seed

```bash
ai-gen image "a red rose" --seed 42
```

## Size Options

Use `-s` or `--size` to set the image dimensions:

| Size | Dimensions | Aspect Ratio |
|------|-----------|--------------|
| `square_hd` | 1024x1024 | 1:1 (high quality) |
| `square` | 512x512 | 1:1 |
| `portrait_4_3` | 768x1024 | 3:4 |
| `portrait_16_9` | 576x1024 | 9:16 |
| `landscape_4_3` | 1024x768 | 4:3 |
| `landscape_16_9` | 1024x576 | 16:9 |

Default is model-dependent (typically 1024x1024).

## Prompt Engineering Tips

### Be specific and descriptive
- **Good:** "A golden retriever puppy playing in autumn leaves, soft afternoon sunlight, shallow depth of field, professional photography"
- **Weak:** "a dog"

### Style keywords
- **Photorealistic:** "photograph", "DSLR", "35mm lens", "bokeh", "natural lighting"
- **Illustration:** "digital illustration", "concept art", "watercolor", "oil painting"
- **Design:** "flat design", "vector art", "minimalist", "isometric"
- **3D:** "3D render", "octane render", "unreal engine", "ray tracing"

### Composition
- Specify camera angle: "aerial view", "close-up", "wide shot", "eye-level"
- Describe lighting: "golden hour", "studio lighting", "dramatic shadows", "backlit"
- Set mood: "moody", "vibrant", "pastel", "high contrast"

### Text in images
Use `fal-ai/ideogram-v2` for images that need readable text — it handles text rendering far better than other models.

```bash
ai-gen image "a coffee shop sign reading 'Morning Brew' in elegant script" -m fal-ai/ideogram-v2
```

## Advanced Parameters

Pass any model-specific parameter as `key=value` after the prompt:

```bash
ai-gen image "a landscape" guidance_scale=7.5 num_inference_steps=28
```

Common advanced parameters:
- `guidance_scale` — How closely to follow the prompt (higher = more literal, default varies by model)
- `num_inference_steps` — Number of denoising steps (higher = more detail, slower)
- `seed` — Random seed for reproducible results (also available via `--seed`)

### Params file

For complex configurations, use `--params-file`:

```bash
ai-gen image --params-file params.json
```

Use `-` to read from stdin:

```bash
echo '{"prompt": "a sunset", "image_size": "landscape_16_9"}' | ai-gen image --params-file -
```

## Output Handling

### Default behavior
Images are downloaded to the output directory (default: `/home/user/artifacts` in sandbox, or current directory locally).

### URL only (no download)

```bash
ai-gen image "a sunset" --url-only
```

### JSON output

```bash
ai-gen image "a sunset" --format json
```

Returns:
```json
{
  "success": true,
  "files": ["./image-20260303-120000.jpg"],
  "model": "fal-ai/flux-schnell",
  "credits_used": 2,
  "data": { }
}
```

### Custom output directory

```bash
ai-gen image "a sunset" -o ./my-images
```

## Troubleshooting

### Authentication error
```
Error: Missing session token
```
Ensure `SL8_SESSION_TOKEN` is set in the environment.

### Insufficient credits
```
Error: Insufficient credits
```
The account doesn't have enough credits for the selected model. Try a cheaper model like `fal-ai/flux-schnell` (2 credits).

### Request timeout
```
Error: Request timed out
```
Use `--timeout` to increase the timeout (in milliseconds):
```bash
ai-gen image "a detailed scene" --timeout 120000
```

### Model not found
```
Error: Model not found
```
Check the model ID with `ai-gen models --type image` to list available image models.

## Related Skills

- **ai-video-generation** — Generate videos from text prompts or images using `ai-gen video`
