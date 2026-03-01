# Supported Image Models

This document lists all supported AI image generation models, their capabilities, and typical pricing.

## Model List

### Stability AI Models

#### stability-ai/sdxl
- **Name**: Stable Diffusion XL
- **Provider**: Stability AI (via Replicate)
- **Quality**: High-quality, versatile image generation
- **Best for**: General purpose image generation, artistic styles
- **Supported resolutions**: 512x512 to 2048x2048
- **Typical cost**: ~50-100 credits per image

#### replicate/sdxl
- **Name**: Stable Diffusion XL (Replicate)
- **Provider**: Replicate
- **Quality**: Similar to stability-ai/sdxl
- **Best for**: General purpose image generation
- **Typical cost**: ~50-100 credits per image

### OpenAI Models

#### openai/dall-e-3
- **Name**: DALL-E 3
- **Provider**: OpenAI (via Replicate)
- **Quality**: Very high quality, excellent prompt understanding
- **Best for**: Detailed, realistic images with complex prompts
- **Quality options**: `standard` or `hd`
- **Standard cost**: ~200 credits per image
- **HD cost**: ~300 credits per image

#### openai/dall-e-2
- **Name**: DALL-E 2
- **Provider**: OpenAI (via Replicate)
- **Quality**: High quality, good for creative images
- **Best for**: Creative and artistic images
- **Typical cost**: ~100 credits per image

### Google Models

#### google/imagen-3
- **Name**: Imagen 3
- **Provider**: Google (via Replicate)
- **Quality**: Photorealistic, excellent text rendering
- **Best for**: Photorealistic images, images with text
- **Typical cost**: ~150 credits per image

#### google/imagen-3-fast
- **Name**: Imagen 3 Fast
- **Provider**: Google (via Replicate)
- **Quality**: Good quality with faster generation
- **Best for**: Quick iterations, prototyping
- **Typical cost**: ~75 credits per image

#### google/imagen-4-fast
- **Name**: Imagen 4 Fast (Beta)
- **Provider**: Google (via Replicate)
- **Quality**: Latest generation, faster
- **Best for**: Latest Google technology, quick generation
- **Note**: Beta model, capabilities may change

### FAL.ai Models (Flux Family)

#### fal-ai/flux-1-1-pro
- **Name**: Flux 1.1 Pro
- **Provider**: FAL.ai
- **Quality**: Professional-grade, highly detailed
- **Best for**: Commercial work, high-quality outputs
- **Typical cost**: ~200-300 credits per image

#### fal-ai/flux-dev
- **Name**: Flux Dev
- **Provider**: FAL.ai
- **Quality**: Development version with good balance
- **Best for**: Development and testing, balanced quality/cost
- **Typical cost**: ~100-150 credits per image

#### fal-ai/flux-schnell
- **Name**: Flux Schnell (Fast)
- **Provider**: FAL.ai
- **Quality**: Fast generation with good quality
- **Best for**: Rapid prototyping, bulk generation
- **Typical cost**: ~50 credits per image

### PrunaAI Models

#### prunaai/flux-fast
- **Name**: Pruna Flux Fast
- **Provider**: PrunaAI (via Replicate)
- **Quality**: Optimized for speed
- **Best for**: High-speed generation
- **Note**: Experimental/newer model

#### prunaai/flux-kontext-fast
- **Name**: Pruna Flux Kontext Fast
- **Provider**: PrunaAI (via Replicate)
- **Quality**: Context-aware generation
- **Best for**: Context-driven image generation
- **Note**: Experimental/newer model

## Model Selection Guide

### By Use Case

**Quick Prototyping**
- fal-ai/flux-schnell
- google/imagen-3-fast
- prunaai/flux-fast

**High Quality / Production**
- openai/dall-e-3 (with hd quality)
- fal-ai/flux-1-1-pro
- google/imagen-3

**General Purpose**
- stability-ai/sdxl
- openai/dall-e-2
- fal-ai/flux-dev

**Photorealism**
- google/imagen-3
- openai/dall-e-3

**Artistic Styles**
- stability-ai/sdxl
- fal-ai/flux-dev

### By Cost

**Low Cost (~50-100 credits)**
- stability-ai/sdxl
- replicate/sdxl
- fal-ai/flux-schnell
- google/imagen-3-fast

**Medium Cost (~100-200 credits)**
- openai/dall-e-2
- fal-ai/flux-dev
- google/imagen-3

**Premium Cost (~200-300+ credits)**
- openai/dall-e-3 (standard and hd)
- fal-ai/flux-1-1-pro

## Common Parameters

All models support these common parameters:

- **prompt** (required): Text description of the image to generate
- **model** (required): Model identifier from the list above
- **width**: Image width in pixels (default: 1024)
- **height**: Image height in pixels (default: 1024)
- **num-images**: Number of images to generate (default: 1)
- **seed**: Random seed for reproducibility (optional)

### Model-Specific Parameters

**OpenAI Models (dall-e-2, dall-e-3):**
- **quality**: `standard` or `hd` (DALL-E 3 only)

**Stability AI / Flux Models:**
- **style**: Style parameter for artistic control (model-specific)

## Important Notes

1. **Model Format**: Always use the full `provider/model` format (e.g., `openai/dall-e-3`, not just `dall-e-3`)

2. **Credit Costs**: Costs shown are approximate. Actual costs may vary based on:
   - Image resolution (higher resolution = higher cost)
   - Number of images generated
   - Quality settings (hd vs standard)

3. **Beta Models**: Models marked as beta may have changing capabilities and pricing

4. **Resolution Limits**: Each model has specific resolution limits. Refer to provider documentation for details.
