# Image facts, dated

Every number, id, field and default this skill cites, one row each, in the shape of the D2c facts
ledger (§4) of the 2026-10-05 media research program (sl8-pipeline repo, `docs/explore/`):
an id, the endpoint, the fact, its kind, the date it was true, its source and the free command that
re-checks it. A scripted verifier comes in an increment; until then re-check by hand before relying
on a row older than its kind allows (schema and price rows: re-check at first use in a session).

## Contents

- [Sources and kinds](#sources-and-kinds)
- [Rate](#rate)
- [Prices (list)](#prices-list)
- [Schema](#schema)
- [ai-gen](#ai-gen)
- [Behaviour measured on SL8](#behaviour-measured-on-sl8)
- [Gone](#gone)

## Sources and kinds

- **P1:** the research program's `P1-dialects-prices.md` and `P1-data/` (`ai-gen info` on 43
  endpoints; fal list prices in `fal-public-pricing.json`).
- **OA:** fal's queue OpenAPI, `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<id>`, read
  2026-10-05 while authoring this skill. **PAGE:** the `endpointBilling` object and price prose on
  `https://fal.ai/models/<id>`, read the same day.
- **T3 #n:** the research program's `T3-sl8-prior-art.md`, fact n (each cites its run).
  **D2c row n / Cn:** its `D2c-facts-ledger.md`. **PG:** its provider-guides capture.
- **Kinds:** `price` (re-check with `ai-gen estimate <id> --params-file p.json --format json`; the
  proxy figure wins), `schema` (re-check with the raw OpenAPI check in media-ai-gen; `ai-gen info`
  shows a `const` as a default), `cli`, `behaviour` (a run; re-tested only by a paid test).
- Credits = US$ × 250. Only one price has been checked through the SL8 proxy (Seedance 2.0, not an
  image route); every image price below is a **list** price.

## Rate

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| rate-cr-per-usd | all | about 250 credits per US$; one proxy-verified point (Seedance 2.0 720p 5 s = 378 cr = $1.512) | price | 2026-10-05 | P1 "Credits ratio"; D2c §1b | `ai-gen estimate` on any priced id, compare with its list price |

## Prices (list)

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| price-gpt2-quality | `openai/gpt-image-2` | at 1024²: low 1.5, medium 13.25, high 52.75 cr ($0.006 / 0.053 / 0.211); `high` is the default, about 35× low | price | 2026-10-05 | P1 §2, §4.5 | `ai-gen estimate openai/gpt-image-2 quality=low image_size=square_hd --format json`, then `quality=high` |
| price-gpt2-size | `openai/gpt-image-2` | a 2K or 4K custom `image_size` costs about 2–4× the 1024² price | price | 2026-10-05 | P1 §4.9 | estimate with `image_size` at 2048×2048 and at 1024×1024 |
| price-gpt2-edit | `openai/gpt-image-2/edit` | also bills the input image tokens, so at least the generation price | price | 2026-10-05 | P1 §2 note | estimate the edit and the generation with the same params |
| price-gpt25 | `openai/gpt-image-2.5/{sunburst,flare}/…` | at 1024²: low 1.5, medium 3.3, high 13.2, xhigh 23.4, max 52.7 cr | price | 2026-10-05 | P1 §2 | `ai-gen estimate openai/gpt-image-2.5/sunburst/text-to-image quality=high --format json` |
| price-nbp | `fal-ai/nano-banana-pro` · `/edit` | 37.5 cr per image ($0.15) at 1K or 2K; 4K ×2 = 75 cr; web search +$0.015 = 3.75 cr; measured 38 cr per frame on SL8 (2026-07-22) | price | 2026-10-05 | P1; `fal-public-pricing.json`; T3 #30 | `ai-gen estimate fal-ai/nano-banana-pro resolution=1K aspect_ratio=1:1 --format json` |
| price-nb2 | `fal-ai/nano-banana-2` · `/edit` | 20 cr at 1K ($0.08); 0.5K ×0.75 = 15; 2K ×1.5 = 30; 4K ×2 = 40; web search +3.75; high thinking +0.5 | price | 2026-10-05 | P1; `fal-public-pricing.json` | `ai-gen estimate fal-ai/nano-banana-2 resolution=1K --format json` |
| price-seedream-pro | `bytedance/seedream/v5/pro/text-to-image` | 16.9 cr ($0.0675) up to 1536²; 33.75 cr ($0.135) above, which the default `auto_2K` is | price | 2026-10-05 | P1 §2, §4.5 | estimate with `image_size=auto_1K` and with `auto_2K` |
| price-seedream-lite | `bytedance/seedream/v5/lite/edit` · `/text-to-image` | 8.75 cr per image ($0.035) | price | 2026-10-05 | P1 (edit); PAGE (text-to-image) | `ai-gen estimate bytedance/seedream/v5/lite/text-to-image --format json` |
| price-schnell | `fal-ai/flux/schnell` | $0.003 per MP = 0.75 cr computed; SL8 measured a 2 cr floor per call | price | 2026-10-05 | P1; T3 #6 (2026-07-22) | `ai-gen estimate fal-ai/flux/schnell image_size=square_hd --format json` |
| price-klein9b | `fal-ai/flux-2/klein/9b` | billing $0.006 per MP against prose $0.009: 1.5 or 2.25 cr per MP | price | 2026-10-05 | P1 §4.7 | `ai-gen estimate fal-ai/flux-2/klein/9b --format json` |
| price-klein9b-edit | `fal-ai/flux-2/klein/9b/edit` | prose $0.011 per MP of input and of output: 2.75 cr each | price | 2026-10-05 | fal.ai/api/models listing | estimate with one 1 MP `--ref` |
| price-recraft41-vector | `fal-ai/recraft/v4.1/text-to-vector` | billing $0.08 against prose $0.007: 20 or 1.75 cr | price | 2026-10-05 | P1 §4.7 | `ai-gen estimate fal-ai/recraft/v4.1/text-to-vector --format json` |
| price-recraft41-raster | `fal-ai/recraft/v4.1/text-to-image` | billing $0.035 against prose $0.007: 8.75 or 1.75 cr | price | 2026-10-05 | P1 §4.7 | as above |
| price-recraft4pro-vector | `fal-ai/recraft/v4/pro/text-to-vector` | billing $0.30 = 75 cr; no prose price | price | 2026-10-05 | PAGE | `ai-gen estimate fal-ai/recraft/v4/pro/text-to-vector --format json` |
| price-ideogram45 | `ideogram/v4.5` | low / medium / high $0.03 / 0.06 / 0.22 = 7.5 / 15 / 55 cr; size does not change the price | price | 2026-10-05 | P1 | estimate with `quality=medium` and `quality=high` |
| price-ideogram3 | `fal-ai/ideogram/v3` | TURBO / BALANCED / QUALITY $0.03 / 0.06 / 0.09 = 7.5 / 15 / 22.5 cr | price | 2026-10-05 | fal.ai/api/models listing | estimate with each `rendering_speed` |
| price-grok-image | `xai/grok-imagine-image/v2.0/text-to-image` | 1k medium $0.06 = 15 cr | price | 2026-10-05 | P1 | `ai-gen estimate … --format json` |
| price-mai | `microsoft/mai-image-2.5` | about $0.05 = 12.5 cr per image | price | 2026-10-05 | P1 | as above |
| price-flux3 | `blackforestlabs/flux-3/text-to-image` · `/edit-image` | 1K $0.024 = 6 cr during a launch promotion that ends 2026-10-08; then $0.048 = 12 cr | price | 2026-10-05 (expires 2026-10-08) | PAGE | `ai-gen estimate blackforestlabs/flux-3/text-to-image resolution=1k --format json` |
| price-qwen-edit | `fal-ai/qwen-image-edit` · `fal-ai/qwen-image-edit-plus` | $0.03 per MP = 7.5 cr per MP | price | 2026-10-05 | PAGE | estimate with a 1 MP `--image` |
| price-bria-remove | `fal-ai/bria/background/remove` | billing $0.018 against prose $0.04: 4.5 or 10 cr | price | 2026-10-05 | PAGE | `ai-gen estimate fal-ai/bria/background/remove --format json` |
| price-bria-other | `fal-ai/bria/background/replace` · `/expand` · `/eraser` · `/product-shot`; `bria/fibo-edit/relight` | $0.04 = 10 cr per generation | price | 2026-10-05 | PAGE | estimate each id |
| price-outpaint | `fal-ai/image-apps-v2/outpaint` | $0.035 per MP = 8.75 cr per MP | price | 2026-10-05 | PAGE | estimate with a 1 MP `--image` |
| price-topaz | `fal-ai/topaz/upscale/image` | prose $0.08 up to 24 MP output = 20 cr; billing reads $0.01 per MP | price | 2026-10-05 | PAGE | `ai-gen estimate fal-ai/topaz/upscale/image upscale_factor=2 --format json` |
| price-seedvr | `fal-ai/seedvr/upscale/image` | $0.001 per output MP = 0.25 cr per MP | price | 2026-10-05 | PAGE | as above |
| price-crystal | `clarityai/crystal-upscaler` | billing $0.016 per MP = 4 cr per MP; its prose describes video frame rates | price | 2026-10-05 | PAGE | as above |
| price-codeformer | `fal-ai/codeformer` | $0.0021 per MP, about 0.5 cr per MP | price | 2026-10-05 | PAGE | as above |
| price-nafnet | `fal-ai/nafnet/deblur` · `/denoise` | $0.0225 per MP, about 5.6 cr per MP | price | 2026-10-05 | PAGE | as above |
| price-docres | `fal-ai/docres` | $0.025 per MP = 6.25 cr per MP | price | 2026-10-05 | PAGE | as above (with `task`) |

## Schema

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| schema-gpt2-size | `openai/gpt-image-2` | `image_size` preset, `auto` or `{width, height}`: multiples of 16, long edge ≤3840, aspect ≤3:1, 655,360–8,294,400 px; default `landscape_4_3` | schema | 2026-10-05 | OA; P1 info (schema updated 2026-09-01) | raw OpenAPI check |
| schema-gpt2-quality | `openai/gpt-image-2` · `/edit` | `quality` enum `auto`/`low`/`medium`/`high`, default `high`; `num_images` 1–4; no `seed`, no `negative_prompt` | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-gpt2-edit-fields | `openai/gpt-image-2/edit` | fields: `prompt`*, `image_urls`* (maxItems 16), `mask_url`, `image_size` (=`auto`), `quality`, `background`, `num_images`, `output_format`, `sync_mode`. **No `input_fidelity`** (fal's guide sets it; the proxy drops it silently). The mask field is `mask_url`, not `mask_image_url` | schema | 2026-10-05 | OA; D2c row 88, C7; re-test D2c B15 (≤5 cr) | raw OpenAPI check |
| schema-nbp-aspect | `fal-ai/nano-banana-pro` · `/edit` | `aspect_ratio` 11 values, default `1:1`; on `/edit` default `auto` | schema | 2026-10-05 | OA; P1; D2c row 84 | raw OpenAPI check |
| schema-nbp-resolution | `fal-ai/nano-banana-pro` · `/edit` | `resolution` `1K`/`2K`/`4K`, default `1K`; no `image_size` field | schema | 2026-10-05 | OA; D2c row 83 | raw OpenAPI check |
| schema-nb-flags | Nano Banana Pro and 2, with `/edit` | `limit_generations` default `true`; `enable_web_search` default `false`; `safety_tolerance` string `"1"`–`"6"`, default `"4"`; `seed`; `num_images` 1–4 | schema | 2026-10-05 | OA; P1 | raw OpenAPI check |
| schema-nbp-edit-refs | `fal-ai/nano-banana-pro/edit` | `image_urls` required, no maxItems | schema | 2026-10-05 | OA; P1 §4.6 | raw OpenAPI check |
| schema-nb2 | `fal-ai/nano-banana-2` · `/edit` | `aspect_ratio` 15 values (adds `4:1`, `1:4`, `8:1`, `1:8`), default `auto`; `resolution` `0.5K`–`4K`, default `1K`; `thinking_level` `minimal`/`high`; `/edit` `image_urls` optional plus `video_url`, `audio_url`, `pdf_url` | schema | 2026-10-05 | P1 | raw OpenAPI check |
| schema-seedream-pro | `bytedance/seedream/v5/pro/text-to-image` | `image_size` presets, `auto_1K`, `auto_2K` (default) or `{w,h}` within 1024²–2048²; `enhance_prompt_mode` `standard` (default)/`fast`; `num_images` 1–6; `output_format` `jpeg` (default)/`png` | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-seedream-lite-t2i | `bytedance/seedream/v5/lite/text-to-image` | `image_size` presets or `auto_2K` (default)/`auto_3K`/`auto_4K`, 2560×1440–4096×4096 px; `num_images` and `max_images` 1–6 | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-seedream-lite-edit | `bytedance/seedream/v5/lite/edit` | `image_urls`* ≤10 by description only, keeps the last 10; `image_size` default `auto_2K`; `num_images` and `max_images` 1–6 | schema | 2026-10-05 | P1 §4.6; D2c row 96 | raw OpenAPI check (description) |
| schema-seedream-id | `bytedance/seedream/v5/*` | the unprefixed id is the catalog id; fal's skills write an extra `fal-ai/` prefix, an alias that resolves at fal but is untested through the proxy | schema | 2026-10-05 | D2c rows 94-95, C8; T3 correction | raw OpenAPI check on both forms |
| schema-schnell | `fal-ai/flux/schnell` | `num_inference_steps` 1–12 (=4); `guidance_scale` (=3.5); `acceleration` (=`none`); `image_size` (=`landscape_4_3`); `output_format` `jpeg` (default)/`png`; `enable_safety_checker` =true | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-klein9b | `fal-ai/flux-2/klein/9b` · `/edit` | `num_inference_steps` 4–8 (=4); `image_size` (=`landscape_4_3`); `/edit` requires `image_urls` | schema | 2026-10-05 | OA; P1 | raw OpenAPI check |
| schema-recraft-vector | `fal-ai/recraft/v4.1/text-to-vector` · `fal-ai/recraft/v4/pro/text-to-vector` | `image_size` (=`square_hd`); `colors[]`; `background_color`; `enable_safety_checker` =true; one image per call | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-ideogram45 | `ideogram/v4.5` | `enable_prompt_expansion` =true; `quality` `low`/`medium`/`high` (=`medium`); `num_images` 1–8; `image_size` (=`square_hd`) or fixed sizes; no `negative_prompt` | schema | 2026-10-05 | OA; P1 (schema updated 2026-10-02) | raw OpenAPI check |
| schema-ideogram3 | `fal-ai/ideogram/v3` | `expand_prompt` =true; `rendering_speed` `TURBO`/`BALANCED`/`QUALITY` (=`BALANCED`); `negative_prompt`; `num_images` 1–8 | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-qwen-edit | `fal-ai/qwen-image-edit` | `prompt`* and a single `image_url`*; `negative_prompt` (=" "); `guidance_scale` (=4); `num_inference_steps` 2–50 (=30) | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-bria-remove | `fal-ai/bria/background/remove` | `image_url` only | schema | 2026-10-05 | OA; D2c row 98 | raw OpenAPI check |
| schema-bria-replace | `fal-ai/bria/background/replace` | `image_url`*; `refine_prompt` =true; `fast` =true; `prompt`, `ref_image_url`, `negative_prompt`; `num_images` 1–4 | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-bria-expand | `fal-ai/bria/expand` | `image_url`* and `canvas_size`*; `aspect_ratio`, `original_image_size`, `original_image_location` | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-bria-eraser | `fal-ai/bria/eraser` | `image_url`* and `mask_url`*; `mask_type` `manual` (default)/`automatic` | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-bria-product-shot | `fal-ai/bria/product-shot` | `optimize_description` =true; `fast` =true; `original_quality` =false; `placement_type` =`manual_placement`; `shot_size` =[1000, 1000] | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-fibo-relight | `bria/fibo-edit/relight` | `image_url`*, `light_type`* (13-value enum), `light_direction`* | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-outpaint | `fal-ai/image-apps-v2/outpaint` | `image_url`*; `expand_left/right/top/bottom` 0–700; `zoom_out_percentage` 0–90 (=20) | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-topaz | `fal-ai/topaz/upscale/image` | `model` 11-value enum (=`Standard V2`); `upscale_factor` 1–4 (=2); `face_enhancement` =true; `face_enhancement_strength` =0.8; `output_format` `jpeg` (default)/`png` | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-seedvr | `fal-ai/seedvr/upscale/image` | `upscale_mode` `factor` (default)/`target`; `upscale_factor` 1–10 (=2); `target_resolution` `720p`–`2160p` (=`1080p`) | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-codeformer | `fal-ai/codeformer` | `fidelity` =0.5; `face_upscale` =true; `upscale_factor` =2 | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-nafnet | `fal-ai/nafnet/deblur` · `/denoise` | `image_url`*; `seed` | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-docres | `fal-ai/docres` | `task`* enum `deshadowing`/`appearance`/`deblurring`/`binarization`; fal's recipe example omits it | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-flux3 | `blackforestlabs/flux-3/text-to-image` | `aspect_ratio` 15 values (=`auto`); `resolution` `512sq`/`768sq`/`1k`/`2k`/`4k` (=`1k`); `enable_prompt_expansion` =false; `safety_tolerance` integer 0–4 (=2); `version` const `latest` | schema | 2026-10-05 | OA | raw OpenAPI check |
| schema-sync-mode | most image routes | `sync_mode` =false; `true` returns a data URI and leaves no request history | schema | 2026-10-05 | OA (field description) | raw OpenAPI check |

## ai-gen

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| cli-image-flags | ai-gen 2.2.0 `image` | flags `-m`, `--image`, repeatable `--ref`, `-s/--size` (an `image_size` preset), `--aspect-ratio`, `-n`; **no `--resolution` and no `--image-size`**: everything else goes as `k=v` or in `--params-file` | cli | 2026-10-05 | `studio/packages/worker/ai-gen/src/commands/image.ts:36-41`; T3 #3 | `ai-gen image --help` |
| cli-ref-maps | ai-gen 2.2.0 `image` · `run` | `--ref` fills `image_urls` when the schema has it (else `reference_image_urls`), uploading each file in order; a local path inside a JSON array or a `k=v` value is not uploaded and fails | cli | 2026-10-05 | `image.ts:69-80`; `shared.ts:357-363`; T3 #2 | `ai-gen image --help` |
| cli-default-model | ai-gen 2.2.0 `image` | the default model is `fal-ai/flux/schnell` | cli | 2026-10-05 | `image.ts:36` | `ai-gen image --help` |
| cli-info-const | ai-gen 2.2.0 `info` | prints a `const` as a plain default | cli | 2026-10-05 | D2c C11 | `ai-gen info fal-ai/veo3.1/fast/extend-video --format json` |

## Behaviour measured on SL8

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| beh-unknown-dropped | the SL8 proxy | unknown params are dropped silently: `image_size` on nano-banana-pro was ignored and a square came back | behaviour | 2026-07-22 | T3 #1 | D2c B15 invalid-value probe, ≤5 cr |
| beh-nbp-mug | `fal-ai/nano-banana-pro/edit` | a product edit hallucinated a different product (the mug became a luggage tag) | behaviour | 2026-06-19 | T3 #21 (BOT-022 `poc-reachability.md`) | paid: one product edit, owner judges |
| beh-nbp-removal | `fal-ai/nano-banana-pro/edit` | "WEAK at removal (smears/hallucinates)"; removal routed to `fal-ai/qwen-image-edit` | behaviour | 2026-06 (BOT-020) | T3 #22 | paid, about 20 cr: one removal on both routes |
| beh-bria-faithful | `fal-ai/bria/background/remove` | the cutout was pixel-faithful | behaviour | 2026-06-19 | T3 #21 (BOT-022) | IMG-T5 |
| beh-ref-dilution | edit routes | "1 ref = 7/10 identity; 4 refs = 2/10" | behaviour | 2026-07-04 | T3 #19 | paid |
| beh-refeed-original | edit routes | editing a render of a render multiplies drift; re-feed the unaltered original | behaviour | 2026-06-22 | T3 #23 (BOT-020) | paid |
| beh-gpt2-name | `openai/gpt-image-2` | prints a named character's name unless the prompt says "no text in the image" | behaviour | 2026-06 | T3 #24 (`nbp-dialect.md:100-113`) | paid |
| beh-gemini-negation | Nano Banana | "Negation breaks Gemini image models — rewrite 'no cars' as 'empty street'"; Google's own guides make this weaker | behaviour | 2026-06-24 | T3 #24; PG README finding 5 | paid |
| beh-declared | any route | a declared 720p was delivered at 864×496, three times | behaviour | ≤2026-09-23 | T3 #16 | every run: media-qc `declared` |
| beh-nbp-scores | `fal-ai/nano-banana-pro` · `openai/gpt-image-2/edit` | NBP 9.5/10 on simple text cards and 9/10 on characters; on identity-preserving headshots NBP scored 0/4 twice and gpt-image-2 is first | behaviour | 2026-06 to 07 | T3 §3 (`typography-text-render.md:21-26`; `identity-preserving-headshots.md:18-22,70`) | owner validation pack |
| beh-text-bans | FLUX, Seedream | banned for any text | behaviour | 2026-06 | T3 §3 (BOT-025 `text-routing.md:5-6`) | paid |
| beh-ideogram | Ideogram v3 | headline OCR 0.97 (BOT-025); v3 has returned "Application not found" | behaviour | 2026-06 | T3 §3 (`text-routing.md:19-26,91`) | `ai-gen info fal-ai/ideogram/v3`, then paid |
| beh-discovery | the fal catalog | discovery is advisory: listed ids 404 and unlisted ones serve | behaviour | 2026-06 (BOT-016) | T3 #11; D2c §1c | `ai-gen info <id>` |
| beh-urls-expire | outputs | hosted fal.media URLs expire: download at once | behaviour | 2026-06 (BOT-013, BOT-022) | T3 #12 | — |
| beh-rewriters | Seedream, Grok Imagine | rewrite every prompt and cannot be turned off; Grok no longer returns the rewrite | behaviour | 2026-10-05 | PG README finding 2 | provider guides |

## Gone

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| fact-dehaze-gone | `fal-ai/mix-dehaze-net` | D1's dehaze route: the OpenAPI returns `null` and a catalog search for "dehaze" returns nothing | schema | 2026-10-05 | OA and fal.ai/api/models, this session | raw OpenAPI check |
| fact-seedream45-404 | `fal-ai/seedream-4.5` | 404 | schema | 2026-10-05 | D2c row 94 | raw OpenAPI check |
