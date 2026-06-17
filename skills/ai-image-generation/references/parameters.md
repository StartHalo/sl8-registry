# Image parameters

Typed flags map to the model's schema param; raw `key=value` / `key:=<json>` pass anything else.
**`ai-gen info <id>` is the source of truth** for names, types, enums, and defaults — they vary per
family. Use `--strict-params` to fail fast on a typo instead of paying for an upstream rejection.

## Typed flags (mapped + coerced per schema)

| Flag | Maps to (typical) | Notes |
|---|---|---|
| `-s, --size <preset>` | `image_size` | preset enum, e.g. `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9` — the exact set is per-model (`ai-gen info`) |
| `--aspect-ratio <r>` | `aspect_ratio` | e.g. `16:9`, `9:16`, `1:1` (models that take a ratio instead of a preset) |
| `-n, --num-images <n>` | `num_images` | one `files[]` entry per image |
| `--seed <n>` | `seed` | fix it for reproducibility; change one variable at a time |

A model uses **either** an `image_size` preset **or** an `aspect_ratio` — check which with `ai-gen
info`. Passing the wrong one is ignored at best, an exit-7 rejection at worst.

## Common raw params (verify per model)

| Param | What it does |
|---|---|
| `guidance_scale` (a.k.a. `cfg`) | prompt adherence vs creativity; higher = stricter (typical 3–8) |
| `num_inference_steps` | quality/time tradeoff (more steps = slower, diminishing returns) |
| `negative_prompt` | what to avoid (supported by some families) |
| `image_url` / `image_urls` | source for edit / multi-ref models (use the `--image`/`--ref` flags) |

```bash
ai-gen image "a forest path at dawn" -m fal-ai/flux/dev \
  guidance_scale=4.5 num_inference_steps=28 --seed 7 --strict-params --format json
```

## Cost

`ai-gen estimate <id>` before a big batch; image generations are usually cheap (single-digit
credits) but premium models and high `-n` add up. Read the actual `credits_used` from the envelope.
