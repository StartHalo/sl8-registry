# Per-endpoint parameters

These endpoints disagree constantly. Read the block for the route you take. Every block was read
from fal's live OpenAPI or `ai-gen info` on **2026-10-05**; prices are fal list prices × 250 cr/$
on that date and are not proxy quotes. Each figure has a dated row in [facts.md](facts.md).
Re-check before use: `ai-gen info <id> --format json`, the raw OpenAPI check for `const` / `enum`
(HR2), and `ai-gen estimate <id> --params-file <p.json> --format json` for the price.

**How inputs reach a route through ai-gen.** An array of images (`image_urls`) is filled by one
`--ref <file>` per input, in order; a single `image_url` by `--image <file>`. Any other URL field
(`mask_url`, `ref_image_url`) is not a media flag: give it a hosted URL or a data URI in the params
file, never a local path. Sizes, quality and flags go in the params file or as `k=v`.

## Contents

- [OpenAI GPT Image 2](#openai-gpt-image-2)
- [Google Nano Banana Pro and Nano Banana 2](#google-nano-banana-pro-and-nano-banana-2)
- [ByteDance Seedream v5](#bytedance-seedream-v5)
- [FLUX schnell and FLUX.2 klein](#flux-schnell-and-flux2-klein)
- [Recraft vector](#recraft-vector)
- [Ideogram](#ideogram)
- [Qwen image edit](#qwen-image-edit)
- [Bria: remove, replace, expand, eraser, product shot, relight](#bria-remove-replace-expand-eraser-product-shot-relight)
- [Outpaint (image-apps-v2)](#outpaint-image-apps-v2)
- [Upscale: Topaz and SeedVR](#upscale-topaz-and-seedvr)
- [Restore: NAFNet, CodeFormer, DocRes](#restore-nafnet-codeformer-docres)

## OpenAI GPT Image 2

**`openai/gpt-image-2`** — `prompt` required. `image_size` is a preset (`square_hd`, `square`,
`portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9`), `auto`, or `{width, height}`
with both sides multiples of 16, the long edge ≤3840, aspect ≤3:1 and 655,360–8,294,400 pixels;
default `landscape_4_3`. `quality` is `auto`, `low`, `medium` or `high`, **default `high`**.
`num_images` 1–4. `output_format` `png` (default), `jpeg`, `webp`; `background` `auto` (default),
`transparent`, `opaque`. **No seed and no negative prompt.** Token-billed: at 1024², low / medium /
high = **1.5 / 13.25 / 52.75 cr**.

**`openai/gpt-image-2/edit`** — `prompt` and `image_urls` required, **`image_urls` ≤16** (enforced
by the schema). Optional `mask_url`. `image_size` defaults to `auto`; `quality`, `num_images`,
`output_format` and `background` as above. **There is no `input_fidelity` field** (fal's own guide
says to set it; the proxy drops it silently). The edit also bills the input image tokens, so it
costs at least the generation price.

GPT Image 2.5 (`openai/gpt-image-2.5/{sunburst,flare}/…`) is live with two more quality tiers; it is
an unproven pick, see [picks.md](picks.md).

## Google Nano Banana Pro and Nano Banana 2

**`fal-ai/nano-banana-pro`** — `prompt` required; optional `system_prompt`. Size is
**`aspect_ratio` + `resolution`, never `image_size`** (an `image_size` is dropped and a square comes
back). `aspect_ratio`: `auto`, `21:9`, `16:9`, `3:2`, `4:3`, `5:4`, `1:1`, `4:5`, `3:4`, `2:3`,
`9:16`, **default `1:1`, so always set it**. `resolution`: `1K` (default), `2K`, `4K` — upper-case.
`num_images` 1–4; `seed`. `safety_tolerance` is a **string** `"1"`–`"6"` (default `"4"`; 1 is the
strictest). `limit_generations` defaults `true` ("disregard any instructions in the prompt regarding
the number of images"); `enable_web_search` defaults `false`. **37.5 cr per image at 1K or 2K, 75
at 4K; web search +3.75 cr.**

**`fal-ai/nano-banana-pro/edit`** — the same fields plus **`image_urls` required** (no cap in the
schema), and `aspect_ratio` here **defaults to `auto`** (it follows the input). Same price.

**`fal-ai/nano-banana-2`** · **`/edit`** — the same shape with a wider aspect enum (adds `4:1`,
`1:4`, `8:1`, `1:8`; default `auto`), `resolution` `0.5K`/`1K`/`2K`/`4K` (default `1K`) and
`thinking_level` `minimal` or `high`. On `/edit`, `image_urls` is optional and the route also takes
`video_url`, `audio_url` and `pdf_url`. **20 cr at 1K; ×0.75 at 0.5K, ×1.5 at 2K, ×2 at 4K; web
search +3.75 cr; high thinking +0.5 cr.**

## ByteDance Seedream v5

The ids are **unprefixed**: `bytedance/seedream/v5/…`. Seedream rewrites every prompt and the
rewrite cannot be turned off. **No negative prompt; never route text here** (SL8 bans Seedream for
text).

**`bytedance/seedream/v5/pro/text-to-image`** — `prompt` required. `image_size` a preset, `auto_1K`,
`auto_2K` or `{width, height}` with 1024²–2048² pixels; **default `auto_2K`**. `enhance_prompt_mode`
`standard` (default) or `fast`. `num_images` 1–6. `output_format` `jpeg` (default) or `png`.
`enable_safety_checker` defaults `true`. **16.9 cr at ≤1536², 33.75 cr above (the default).**

**`bytedance/seedream/v5/lite/text-to-image`** — `prompt` required; `image_size` presets or
`auto_2K` (default), `auto_3K`, `auto_4K`, 2560×1440 to 4096×4096 pixels; `num_images` and
`max_images` 1–6. **8.75 cr per image.**

**`bytedance/seedream/v5/lite/edit`** — `prompt` and `image_urls` required. Takes **at most 10
references and silently keeps the last 10** (a description limit, not a schema `maxItems`).
`image_size` default `auto_2K`; `num_images` 1–6 **and** `max_images` 1–6 (multi-image fan-out).
**8.75 cr per image.**

## FLUX schnell and FLUX.2 klein

**`fal-ai/flux/schnell`** — the draft route and `ai-gen image`'s default model. `prompt` required;
`image_size` (default `landscape_4_3`); `num_inference_steps` 1–12 (default 4); `guidance_scale`
(default 3.5); `acceleration` `none` (default), `regular`, `high`; `seed`; `num_images` 1–4;
`output_format` `jpeg` (default) or `png`; `enable_safety_checker` defaults `true`. **0.75 cr per
megapixel computed; SL8 measured a 2 cr floor per call.** No text, ever.

**`fal-ai/flux-2/klein/9b`** · **`/edit`** — `prompt` required (`/edit` also `image_urls`);
`image_size` (default `landscape_4_3`); `num_inference_steps` 4–8 (default 4); `seed`;
`num_images` 1–4. **1.5 or 2.25 cr per megapixel** (fal's billing and its prose disagree); `/edit`
bills input and output megapixels at 2.75 cr each. Unvalidated on SL8.

## Recraft vector

**`fal-ai/recraft/v4.1/text-to-vector`** — `prompt` required; `image_size` (default `square_hd`);
`colors` (array of RGB) fixes the palette; `background_color`; `enable_safety_checker` (default
`true`). One image per call; SVG out. **1.75 or 20 cr** (fal's prose $0.007 against its billing
$0.08).

**`fal-ai/recraft/v4/pro/text-to-vector`** — the same fields. **75 cr** (billing $0.30; no prose
price).

## Ideogram

**`ideogram/v4.5`** — `prompt` required; `image_size` presets or one of a fixed list of sizes
(default `square_hd`); `num_images` 1–8; `seed`; `quality` `low`, `medium` (default), `high`;
**`enable_prompt_expansion` defaults `true`** (a rewriter: send `false` when the prompt is
complete). **No negative prompt.** **7.5 / 15 / 55 cr** for low / medium / high; size does not
change the price.

**`fal-ai/ideogram/v3`** — `prompt` required; `rendering_speed` `TURBO`, `BALANCED` (default),
`QUALITY`; **`expand_prompt` defaults `true`**; `negative_prompt`; `style`, `style_codes`,
`color_palette`; `image_urls`; `num_images` 1–8. **7.5 / 15 / 22.5 cr** by speed. SL8 has seen v3
return "Application not found": verify before relying on it.

## Qwen image edit

**`fal-ai/qwen-image-edit`** — the removal route. `prompt` and **`image_url`** required (a single
image: pass it with `--image`). `negative_prompt` (default a single space), `guidance_scale`
(default 4), `num_inference_steps` 2–50 (default 30), `acceleration` (default `regular`),
`num_images` 1–4, `output_format` `png` (default) or `jpeg`, `enable_safety_checker` (default
`true`). **7.5 cr per megapixel.**

## Bria: remove, replace, expand, eraser, product shot, relight

All take a single **`image_url`** (`--image`).

**`fal-ai/bria/background/remove`** — `image_url` only. Returns a transparent-PNG cutout whose
alpha is the mask; pixel-faithful on SL8. **4.5 or 10 cr** (billing $0.018 against prose $0.04).
media-photo-editing runs it and the composite.

**`fal-ai/bria/background/replace`** — `image_url` required; `prompt` or `ref_image_url` for the
new background; `negative_prompt`; **`refine_prompt` defaults `true`** (a rewriter);
**`fast` defaults `true`**; `num_images` 1–4. **10 cr.** Never for a product that must stay
pixel-identical.

**`fal-ai/bria/expand`** — `image_url` and **`canvas_size`** (`[width, height]`) required;
`original_image_size`, `original_image_location` or `aspect_ratio` place the original; `prompt`,
`negative_prompt`, `seed`. **10 cr.**

**`fal-ai/bria/eraser`** — `image_url` and **`mask_url`** required; `mask_type` `manual` (default)
or `automatic`; `preserve_alpha`. **10 cr.**

**`fal-ai/bria/product-shot`** — `image_url` required; `scene_description` or `ref_image_url`;
`placement_type` (default `manual_placement`), `manual_placement_selection` (default
`bottom_center`), `shot_size` (default `[1000, 1000]`); **`optimize_description` defaults `true`**
(a rewriter); **`fast` defaults `true`**; **`original_quality` defaults `false`**; `num_results`
1–4. **10 cr.** An alternate, not a primary: see [picks.md](picks.md).

**`bria/fibo-edit/relight`** — `image_url`, **`light_type`** and **`light_direction`** required.
`light_type` is a fixed enum: `midday`, `blue hour light`, `low-angle sunlight`, `sunrise light`,
`spotlight on subject`, `overcast light`, `soft overcast daylight lighting`, `cloud-filtered
lighting`, `fog-diffused lighting`, `moonlight lighting`, `starlight nighttime`, `soft bokeh
lighting`, `harsh studio lighting`. **10 cr.**

## Outpaint (image-apps-v2)

**`fal-ai/image-apps-v2/outpaint`** — `image_url` required; `expand_left`, `expand_right`,
`expand_top`, `expand_bottom` 0–700 px each (default 0) or `zoom_out_percentage` 0–90 (default 20);
`prompt` (default empty); `num_images` 1–4; `output_format` `png` (default). **8.75 cr per
megapixel.**

## Upscale: Topaz and SeedVR

**`fal-ai/topaz/upscale/image`** — `image_url` required. `model` is an 11-value enum (`Standard V2`
default, `High Fidelity V2`, `Low Resolution V2`, `CGI`, `Text Refine`, `Recovery V2`, the
generative `Wonder`/`Redefine` tiers and others); `upscale_factor` 1–4 (default 2);
**`face_enhancement` defaults `true`** and redraws faces (`face_enhancement_strength` 0.8 by
default): send `false` unless faces need it. `output_format` `jpeg` (default) or `png`. **20 cr up
to 24 MP output** (fal's prose; its billing reads $0.01 per megapixel).

**`fal-ai/seedvr/upscale/image`** — `image_url` required; `upscale_mode` `factor` (default, reads
`upscale_factor` 1–10, default 2) or `target` (reads `target_resolution` `720p`, `1080p` default,
`1440p`, `2160p`); `noise_scale` (default 0.1); `output_format` `jpg` (default), `png`, `webp`.
**0.25 cr per output megapixel.**

Upscaling does not restore missing content: a 4× render of a small source is a clean render of
small-source detail.

## Restore: NAFNet, CodeFormer, DocRes

Pick by the dominant defect; for several defects run them in sequence (denoise → deblur → upscale,
or face-fix → upscale), checking each intermediate before the next.

**`fal-ai/nafnet/deblur`** · **`fal-ai/nafnet/denoise`** — `image_url` required; `seed`. Motion or
focus blur · sensor noise. **5.6 cr per megapixel.**

**`fal-ai/codeformer`** — `image_url` required. `fidelity` (default 0.5): 1.0 preserves identity
best, 0.0 gives the cleanest but most generic face; 0.5–0.7 suits most portraits. **`face_upscale`
defaults `true`** and `upscale_factor` defaults 2: pin both. `only_center_face`, `aligned`.
**0.5 cr per megapixel.**

**`fal-ai/docres`** — `image_url` and **`task` required**: `deshadowing`, `appearance`,
`deblurring` or `binarization` (fal's recipe omits `task`, which the schema rejects). Tuned for
text legibility on scans. **6.25 cr per megapixel.**

Haze has no live route: fal's dehaze endpoint returned no schema on 2026-10-05 ([facts.md](facts.md)).
