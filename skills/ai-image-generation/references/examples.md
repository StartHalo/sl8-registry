# AI Image Generation Examples

Common use cases and example commands for the ai-image CLI.

## Basic Usage

### Simple Image Generation

```bash
ai-image generate \
  --prompt "A cute cat sitting on a windowsill" \
  --model "stability-ai/sdxl"
```

### Using Configuration File

```bash
ai-image generate \
  --prompt "Mountain landscape at sunset" \
  --model "openai/dall-e-3" \
  --config .ai-kits.json
```

## Common Use Cases

### 1. Quick Prototyping (Fast + Low Cost)

**Use Case**: Rapidly generate concept images for iteration

**Recommended Models**:
- fal-ai/flux-schnell
- google/imagen-3-fast

**Example**:
```bash
ai-image generate \
  --prompt "Modern minimalist logo design for a tech startup" \
  --model "fal-ai/flux-schnell" \
  --num-images 4
```

### 2. High-Quality Production Images

**Use Case**: Final images for marketing, websites, or professional use

**Recommended Models**:
- openai/dall-e-3 (with hd quality)
- fal-ai/flux-1-1-pro

**Example**:
```bash
ai-image generate \
  --prompt "Professional product photo of a smartphone on a marble surface with soft lighting" \
  --model "openai/dall-e-3" \
  --quality hd \
  --width 1792 \
  --height 1024
```

### 3. Photorealistic Images

**Use Case**: Images that look like real photographs

**Recommended Models**:
- google/imagen-3
- openai/dall-e-3

**Example**:
```bash
ai-image generate \
  --prompt "Photorealistic portrait of a woman in her 30s wearing professional business attire, natural lighting, bokeh background" \
  --model "google/imagen-3" \
  --width 1024 \
  --height 1536
```

### 4. Artistic Styles

**Use Case**: Creative, artistic, or stylized images

**Recommended Models**:
- stability-ai/sdxl
- fal-ai/flux-dev

**Example**:
```bash
ai-image generate \
  --prompt "Abstract watercolor painting of a forest in autumn, vibrant colors, flowing brush strokes" \
  --model "stability-ai/sdxl" \
  --style "watercolor"
```

### 5. Bulk Generation

**Use Case**: Generate multiple variations of an image

**Example**:
```bash
ai-image generate \
  --prompt "Fantasy character concept art, elven warrior with silver armor" \
  --model "stability-ai/sdxl" \
  --num-images 8 \
  --seed 42
```

### 6. Images with Text

**Use Case**: Generate images that include readable text

**Recommended Models**:
- google/imagen-3 (best for text rendering)
- openai/dall-e-3

**Example**:
```bash
ai-image generate \
  --prompt "Movie poster with the title 'Summer Adventure' in bold letters at the top, beach scene background" \
  --model "google/imagen-3"
```

### 7. Social Media Content

**Use Case**: Images sized for social media platforms

**Instagram Post (Square)**:
```bash
ai-image generate \
  --prompt "Colorful flat lay of healthy breakfast foods, top-down view" \
  --model "fal-ai/flux-schnell" \
  --width 1024 \
  --height 1024
```

**Instagram Story (Vertical)**:
```bash
ai-image generate \
  --prompt "Motivational quote design with nature background" \
  --model "stability-ai/sdxl" \
  --width 1080 \
  --height 1920
```

**Twitter/X Header**:
```bash
ai-image generate \
  --prompt "Abstract tech background with geometric patterns, blue and purple gradient" \
  --model "fal-ai/flux-dev" \
  --width 1500 \
  --height 500
```

## Advanced Techniques

### Using Seeds for Reproducibility

Generate the same image multiple times:

```bash
ai-image generate \
  --prompt "Cyberpunk city street at night, neon signs" \
  --model "stability-ai/sdxl" \
  --seed 12345
```

Re-use the same seed to get consistent results, or vary parameters while keeping the seed:

```bash
# Same composition, different sizes
ai-image generate --prompt "..." --model "..." --seed 12345 --width 1024 --height 1024
ai-image generate --prompt "..." --model "..." --seed 12345 --width 1280 --height 720
```

### Combining Multiple Styles

Use detailed prompts to combine artistic styles:

```bash
ai-image generate \
  --prompt "Art nouveau poster design combined with cyberpunk aesthetics, featuring a female robot, flowing organic lines meet geometric circuits" \
  --model "fal-ai/flux-1-1-pro"
```

### Negative Prompts (Model Dependent)

Some models support negative prompts in the prompt itself:

```bash
ai-image generate \
  --prompt "Beautiful landscape photograph, sharp focus, high detail. NOT: blurry, low quality, distorted" \
  --model "stability-ai/sdxl"
```

## Checking Costs Before Generation

### Estimate Command

Always check costs before generating expensive images:

```bash
# Check cost for single image
ai-image estimate \
  --model "openai/dall-e-3" \
  --quality hd

# Check cost for multiple images
ai-image estimate \
  --model "stability-ai/sdxl" \
  --num-images 10
```

### Check Balance

Verify you have sufficient credits:

```bash
ai-image balance

# JSON output for scripting
ai-image balance --output-format json
```

## Output Formats

### Text Output (Default)

Human-readable output:

```bash
ai-image generate --prompt "..." --model "..."
```

### JSON Output

For scripting and automation:

```bash
ai-image generate \
  --prompt "..." \
  --model "..." \
  --output-format json > result.json
```

### Table Output

Formatted table view:

```bash
ai-image balance --output-format table
```

### Quiet Mode

Suppress progress indicators:

```bash
ai-image generate \
  --prompt "..." \
  --model "..." \
  --quiet
```

## Common Workflows

### Development Workflow

1. Estimate costs:
```bash
ai-image estimate --model "fal-ai/flux-schnell" --num-images 5
```

2. Generate test images (fast model):
```bash
ai-image generate \
  --prompt "Your test prompt" \
  --model "fal-ai/flux-schnell" \
  --num-images 5 \
  --quiet
```

3. Refine prompt and generate final (high-quality model):
```bash
ai-image generate \
  --prompt "Your refined prompt" \
  --model "openai/dall-e-3" \
  --quality hd
```

### Batch Processing Workflow

Generate multiple images with different prompts:

```bash
#!/bin/bash
PROMPTS=(
  "Prompt 1"
  "Prompt 2"
  "Prompt 3"
)

for prompt in "${PROMPTS[@]}"; do
  ai-image generate \
    --prompt "$prompt" \
    --model "stability-ai/sdxl" \
    --output-format json >> results.jsonl
done
```

## Troubleshooting Common Issues

### Insufficient Credits

**Error**: "Insufficient credits"

**Solution**:
```bash
# Check balance
ai-image balance

# Estimate cost
ai-image estimate --model "..." --num-images X

# Use a cheaper model
ai-image generate --prompt "..." --model "fal-ai/flux-schnell"
```

### Model Not Supported

**Error**: "Model not supported" or "Model doesn't support image generation"

**Solution**:
- Verify model name format: `provider/model`
- Check spelling of model name
- Consult `references/models.md` for supported models
- Ensure you're using an image model (not a video model)

### Authentication Failed

**Error**: "Authentication failed"

**Solution**:
```bash
# Verify configuration
cat .ai-kits.json

# Check provider credentials match the model
# - For openai/dall-e-* models: need providers.openai.apiKey
# - For stability-ai/* models: need providers.replicate.apiToken
# - For google/* models: need providers.replicate.apiToken or providers.google.apiKey
```

### Generation Timeout

**Error**: "Generation timed out"

**Solution**:
- Some models take longer than others
- Try a faster model for testing
- Check provider status pages for outages
- Retry the request

## Pro Tips

1. **Start Fast, Finish Slow**: Use fast/cheap models for iteration, then use premium models for final outputs

2. **Use Seeds Strategically**: When you find a good composition with a seed, reuse it with different prompts or parameters

3. **Batch Operations**: Generate multiple images in one command to save time

4. **Monitor Costs**: Always estimate before bulk operations

5. **Model Selection**: Different models excel at different things - experiment to find the best fit

6. **Prompt Engineering**: Spend time crafting detailed, specific prompts for better results

7. **Quality vs Cost**: Standard quality is often sufficient; reserve HD for truly important images
