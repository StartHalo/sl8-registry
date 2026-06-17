# Image models — pick by use case

The catalog is live (~1,300 endpoints) and changes. **Treat the ids below as a starting map, not a
fixed list** — confirm with `ai-gen models --search <name>` / `ai-gen info <id>` (status, params,
credits) before relying on one. Don't paste ids from memory into production without a check.

## By job

| Job | Reach for | Why |
|---|---|---|
| Fast draft / iterate cheaply | `fal-ai/flux/schnell` | seconds, low cost — the default; lock composition here |
| High-quality general | `fal-ai/flux/dev`, `fal-ai/flux/pro` | sharper detail, better prompt adherence |
| Photoreal | flux pro / `fal-ai/imagen*` / Seedream families | strongest "real photo" look (see `ai-gen-prompting` for the anti-AI-look checklist) |
| Text *in* the image (logos, posters, UI) | Ideogram, Recraft, Imagen families | reliable in-image typography (FLUX is weaker at text) |
| Illustration / vector / flat design | `fal-ai/recraft/v3` and similar | style-controllable, clean vector-ish output |
| Image **edit** / inpaint | nano-banana edit, flux edit/redux, Seedream edit | instruction-driven edits; verify it's an *edit* model |
| **Multi-reference** (subject + style/garment/face) | reference/edit models with `reference_image_urls` | address inputs as `@Image1`… ; cap from the schema |
| Cheap second pass | a lighter/"lite" variant of the family | trim cost on bulk variations |

## How to choose, concretely

```bash
# browse a capability
ai-gen models --category text-to-image --format json | jq -r '.models[].endpoint_id' | head -30
ai-gen models --search ideogram
ai-gen models --search edit

# confirm the one you picked
ai-gen info fal-ai/flux/dev            # is it active? what params/enums? est. credits?
```

## Tier discipline

- **Draft on `flux/schnell`**, finalize on a premium model — don't burn premium credits exploring.
- A model that errors **exit 6** was declined by the proxy (removed/blocked/unpriced) → pick another
  via `ai-gen models --search`.
- For text-in-image, prefer an Ideogram/Recraft/Imagen family over FLUX.
- For edits, the model must support an image input — `ai-gen info` shows whether it takes
  `image_url`/`image_urls`; a text-to-image model will reject `--image`.

When the `fal-model-catalog` umbrella skill is installed, it carries the maintained, curated picks;
this file is the self-sufficient fallback.
