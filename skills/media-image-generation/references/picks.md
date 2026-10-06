# Image picks, dated

Which endpoint serves which intent, with the evidence for each choice. **Picks are judgements, not
facts** (D2c C9): each row carries the date it was set, what fal's own skills said, and what SL8's
runs measured. The routing table in `SKILL.md` is the snapshot of the `primary` and `fallback` rows
below; this file is where a pick changes, as a new dated row, never as a silent edit.

Every id below resolved against fal's live OpenAPI on 2026-10-05. Prices and fields per route are in
[endpoints.md](endpoints.md); every number has a dated row in [facts.md](facts.md).

## Contents

- [How to read a row](#how-to-read-a-row)
- [Generation](#generation)
- [Edits](#edits)
- [Utilities: background, outpaint, upscale, restore](#utilities-background-outpaint-upscale-restore)
- [Unproven on SL8 (as of 2026-10-05)](#unproven-on-sl8-as-of-2026-10-05)
- [Rejected or gone](#rejected-or-gone)

## How to read a row

- **D1 said:** fal's public skills (`fal-ai-community/skills`, pin 9ca85041, 2026-05-13), with the
  pristine file and line under `studio/media-upstream/fal-community/`.
- **SL8 evidence:** T3 (`T3-sl8-prior-art.md`) by fact number or section, and D2c
  (`D2c-facts-ledger.md`) by row, both in the 2026-10-05 media research program (sl8-pipeline repo,
  `docs/explore/`). "No SL8 run" means nobody here has measured it.
- **Status:** `primary` · `fallback` · `alternate` (verified id, no SL8 run, use when the brief
  names it or both picks fail) · `unproven on SL8 (as of 2026-10-05)` (provider currency, never a
  primary until a paid test) · `rejected` · `gone`.

## Generation

| Intent | Endpoint | As of | D1 said | SL8 evidence | Status |
|---|---|---|---|---|---|
| Photoreal still | `fal-ai/nano-banana-pro` | 2026-10-05 | second for realism (model-routing:52; realism:33) | first for stills on SL8 (T3 §3, medium strength); 38 cr per frame measured (T3 #30) | primary |
| Photoreal still | `openai/gpt-image-2` `quality=high` | 2026-10-05 | first: "Best general-purpose photoreal" (realism:32; model-routing:50; commercial:120) | never re-tested against NBP on SL8 (T3 §3) | fallback |
| Photoreal still | `fal-ai/nano-banana-2` | 2026-10-05 | "Strong cheaper alternative" (model-routing:53; realism:34) | no SL8 run | alternate |
| Photoreal still | `bytedance/seedream/v5/lite/text-to-image` | 2026-10-05 | "Best for Asian subjects and Asian-language signage realism" (realism:35, written with an extra `fal-ai/` prefix) | Seedream banned for any text on SL8 (T3 §3) | alternate, never with text |
| Same real person from a reference | `openai/gpt-image-2/edit` | 2026-10-05 | "For consistent characters, use `openai/gpt-image-2` first" (model-routing:79-80) | first for identity-preserving headshots, ★★★, one subject; NBP "0/4 twice" (T3 §3) | primary |
| Same real person from a reference | `fal-ai/nano-banana-pro/edit` | 2026-10-05 | identity-preserving edit (image-to-image.md:11) | as above | fallback |
| Stylized, illustration, anime | `fal-ai/nano-banana-pro` | 2026-10-05 | gpt-image-2, then NBP, then NB2 (commercial:121-122; model-routing:50-53) | characters 9/10 (T3 §3) | primary |
| Stylized, illustration, anime | `openai/gpt-image-2` | 2026-10-05 | first (as above) | no head-to-head on SL8 | fallback |
| Stylized, illustration, anime | `fal-ai/ideogram/v3` · `fal-ai/recraft/v4/pro/text-to-image` · `xai/grok-imagine-image` | 2026-10-05 | listed for anime and stylized (text-to-image.md:53-63) | Ideogram v3 has returned "Application not found" (T3 §3) | alternate |
| Lettering as part of the art | `fal-ai/nano-banana-pro` | 2026-10-05 | text-heavy work: gpt-image-2 `quality=high` first, NBP second (model-routing:29-43) | 9.5/10 on simple text cards (T3 §3); exact copy is composited, never generated (HR10) | primary |
| Lettering as part of the art | `openai/gpt-image-2` `quality=high` | 2026-10-05 | first (as above) | prints a named character's name unless told "no text in the image" (T3 #24) | fallback |
| Lettering as part of the art | `ideogram/v4.5` with `enable_prompt_expansion=false` | 2026-10-05 | v3 listed for stylized (text-to-image.md:21) | Ideogram scored OCR 0.97 on headlines in BOT-025 (v3 era, T3 §3) | alternate |
| Vector illustration or icon | `fal-ai/recraft/v4.1/text-to-vector` | 2026-10-05 | `fal-ai/recraft/v4/text-to-vector` and `/v4/pro/text-to-vector` (text-to-image.md:65-68) | Recraft V4 for SVG logos and palette-locked charts (T3 §3); 4.1 is the newest id in P1 | primary |
| Vector illustration or icon | `fal-ai/recraft/v4/pro/text-to-vector` | 2026-10-05 | as above | no SL8 run; 75 cr | fallback |
| Fast draft | `fal-ai/flux/schnell` | 2026-10-05 | not listed | the only draft model SL8 verified, about 2 cr (T3 §3); ai-gen's default model | primary |
| Fast draft | `fal-ai/flux-2/klein/9b` | 2026-10-05 | the draft pick (model-routing:59; commercial:123) | "unvalidated by SL8" (D2c row 93) | fallback |
| Fast draft | `fal-ai/flux-2/klein/4b` | 2026-10-05 | listed (text-to-image.md:29) | no SL8 run | alternate |

## Edits

| Intent | Endpoint | As of | D1 said | SL8 evidence | Status |
|---|---|---|---|---|---|
| Single edit | `fal-ai/nano-banana-pro/edit` | 2026-10-05 | first (model-routing:68; commercial:124) | incumbent; but one product edit "hallucinated a different product" (T3 #21) | primary |
| Single edit | `openai/gpt-image-2/edit` | 2026-10-05 | second (model-routing:69) | no head-to-head on SL8 | fallback |
| Single edit | `bytedance/seedream/v5/lite/edit` | 2026-10-05 | third (model-routing:70, with the extra prefix) | ≤10 refs, keeps the last 10 (P1) | alternate |
| Single edit | `fal-ai/nano-banana-2/edit` · `fal-ai/flux-2/klein/9b/edit` | 2026-10-05 | identity-preserving; cheap edits (image-to-image.md:12, 30) | no SL8 run | alternate |
| Multi-reference composite | `openai/gpt-image-2/edit` | 2026-10-05 | "up to 16 input images" (image-to-image.md:20) | "1 ref = 7/10 identity; 4 refs = 2/10" (T3 #19): send the fewest | primary |
| Multi-reference composite | `fal-ai/nano-banana-pro/edit` | 2026-10-05 | second (image-to-image.md:21) | as above | fallback |
| Multi-reference composite | `fal-ai/qwen-image-edit-plus` | 2026-10-05 | listed (image-to-image.md:23) | no SL8 run | alternate |
| Inpaint a masked region | `openai/gpt-image-2/edit` + `mask_url` | 2026-10-05 | "best for both mask-based and instruction-based" (image-to-image.md:37) | no SL8 run | primary |
| Inpaint a masked region | `fal-ai/nano-banana-pro/edit` | 2026-10-05 | instruction-based edits (image-to-image.md:11) | no mask field | fallback |
| Remove an object | `fal-ai/qwen-image-edit` | 2026-10-05 | not listed; D1 lists a Qwen remove-element LoRA (image-to-image.md:62) | "route removal here" (T3 #22; D2c row 99) | primary |
| Remove an object | `fal-ai/bria/eraser` | 2026-10-05 | first eraser (image-to-image.md:60) | needs a `mask_url` | fallback |
| Remove an object | `fal-ai/qwen-image-edit-plus-lora-gallery/remove-element` | 2026-10-05 | listed (image-to-image.md:62) | no SL8 run | alternate |
| Relight | `fal-ai/nano-banana-pro/edit` | 2026-10-05 | edits cover "relighting" (model-routing:65-68; image-to-image.md:77) | no SL8 run | primary |
| Relight | `bria/fibo-edit/relight` | 2026-10-05 | first relight row (image-to-image.md:71) | fixed 13-value `light_type` | fallback |
| Product in a styled scene | `fal-ai/nano-banana-pro/edit` | 2026-10-05 | "fast, strong product fidelity" (product-shot:35; commercial:124-128) | the mug became a luggage tag (T3 #21, 2026-06-19): D2c row 87 "partly contradicted (fidelity)"; the owner checks fidelity | primary |
| Product in a styled scene | `openai/gpt-image-2/edit` | 2026-10-05 | "best for text-on-packaging accuracy" (product-shot:36) | no SL8 run | fallback |
| Product in a styled scene | `fal-ai/bria/product-shot` | 2026-10-05 | packaging fidelity (image-to-image.md:94) | no SL8 run; rewriter on by default | alternate |

## Utilities: background, outpaint, upscale, restore

| Intent | Endpoint | As of | D1 said | SL8 evidence | Status |
|---|---|---|---|---|---|
| Background remove or replace | `fal-ai/bria/background/remove` + local composite | 2026-10-05 | first (image-to-image.md:50) | pixel-faithful (T3 #21, BOT-022); run by media-photo-editing | primary |
| Background remove or replace | `fal-ai/bria/background/replace` | 2026-10-05 | listed (image-to-image.md:51) | "Never route a compliance main image through a generative re-background" (T3 #21) | fallback |
| Background remove | `fal-ai/birefnet/v2` | 2026-10-05 | listed (image-to-image.md:53) | no SL8 run | alternate |
| Outpaint or expand | `fal-ai/bria/expand` | 2026-10-05 | first (image-to-image.md:43) | no SL8 run | primary |
| Outpaint or expand | `fal-ai/image-apps-v2/outpaint` | 2026-10-05 | second (image-to-image.md:44) | no SL8 run | fallback |
| Upscale | `fal-ai/topaz/upscale/image` | 2026-10-05 | first premium upscale (image-to-image.md:105) | no SL8 run; `face_enhancement` on by default | primary |
| Upscale | `fal-ai/seedvr/upscale/image` | 2026-10-05 | listed (image-to-image.md:107) | no SL8 run | fallback |
| Upscale | `clarityai/crystal-upscaler` | 2026-10-05 | listed (image-to-image.md:106) | no SL8 run; fal's price prose describes video | alternate |
| Restore: blur | `fal-ai/nafnet/deblur` | 2026-10-05 | dispatch by defect (image-restoration:15) | no SL8 run | primary |
| Restore: noise | `fal-ai/nafnet/denoise` | 2026-10-05 | (image-restoration:16) | no SL8 run | primary |
| Restore: damaged face | `fal-ai/codeformer` | 2026-10-05 | (image-restoration:18) | no SL8 run | primary |
| Restore: document scan | `fal-ai/docres` | 2026-10-05 | (image-restoration:19), example omits the required `task` | no SL8 run | primary |
| Restore: any defect | `fal-ai/nano-banana-pro/edit` | 2026-10-05 | "clean up artifacts, sharpen edges" (image-to-image.md:114) | no SL8 run | fallback |

## Unproven on SL8 (as of 2026-10-05)

Provider currency from the provider guides (`PG-provider-guides/README.md`, finding 10, in the same
research program) and P1. None is a primary until a paid test with the owner's judgement promotes it.

| Family | Endpoint | As of | Provider says | Price (list) | Status |
|---|---|---|---|---|---|
| GPT Image 2.5 | `openai/gpt-image-2.5/sunburst/text-to-image` · `/flare/text-to-image` · `/sunburst/edit` | 2026-10-05 | current OpenAI image model (2026-09-08 snapshots); adds `xhigh` and `max` quality | 13.2 cr at `high`, 1024² | unproven on SL8 (as of 2026-10-05) |
| Nano Banana 2 | `fal-ai/nano-banana-2` · `/edit` | 2026-10-05 | Google's default image model | 20 cr at 1K | unproven on SL8 (as of 2026-10-05) |
| FLUX 3 Image | `blackforestlabs/flux-3/text-to-image` · `/edit-image` | 2026-10-05 | new; BFL's guide replaces FLUX.2's | 6 cr at 1K (launch promotion to 2026-10-08), then 12 | unproven on SL8 (as of 2026-10-05); no text until tested |
| Seedream 5 pro | `bytedance/seedream/v5/pro/text-to-image` | 2026-10-05 | rewrites every prompt, cannot be disabled | 16.9 / 33.75 cr | unproven on SL8 (as of 2026-10-05); no text |
| Ideogram 4.5 | `ideogram/v4.5` | 2026-10-05 | Magic Prompt rewriter on by default; no negative prompt | 7.5 / 15 / 55 cr | unproven on SL8 (as of 2026-10-05) |
| Recraft 4.1 | `fal-ai/recraft/v4.1/text-to-image` | 2026-10-05 | no rewriter; colours as a weighted list | 1.75 or 8.75 cr | unproven on SL8 (as of 2026-10-05) |
| Grok Imagine 2.0 | `xai/grok-imagine-image/v2.0/text-to-image` | 2026-10-05 | rewrites every prompt; the rewrite is no longer returned | 15 cr at 1k medium | unproven on SL8 (as of 2026-10-05) |
| MAI-Image 2.5 | `microsoft/mai-image-2.5` | 2026-10-05 | no guide; about 1 MP out | about 12.5 cr | unproven on SL8 (as of 2026-10-05) |

## Rejected or gone

| What | As of | Why |
|---|---|---|
| `fal-ai/seedream-4.5` | 2026-10-05 | 404; the v4.5 id is `fal-ai/bytedance/seedream/v4.5/…` and the current generation is v5 (D2c row 94, C8) |
| `bytedance/seedream-5-lite` | 2026-10-05 | a Replicate id: UPSTREAM_NOT_FOUND on fal (T3 §3) |
| D1's haze-removal endpoint | 2026-10-05 | returned no OpenAPI schema and no catalog hit ([facts.md](facts.md), `fact-dehaze-gone`) |
| `fal-ai/nano-banana-pro/edit` for removal | 2026-10-05 | "WEAK at removal (smears/hallucinates)" (T3 #22) |
| Any generative route for a pixel-identical packshot | 2026-10-05 | the mug became a luggage tag (T3 #21); cutout and composite instead |
| FLUX (schnell, FLUX.2) and Seedream for any text | 2026-10-05 | banned for text on SL8 (T3 §3, BOT-025 `text-routing.md:5-6`) |
