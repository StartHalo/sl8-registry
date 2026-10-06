# Video facts, dated

Every number, id, field and default this skill cites, one row each, in the shape of the D2c facts
ledger (§4) of the 2026-10-05 media research program (sl8-pipeline repo, `docs/explore/`): an id,
the endpoint, the fact, its kind, the date it was true, its source and the free command that
re-checks it. A scripted verifier comes in an increment; until then re-check by hand before relying
on a row older than its kind allows (schema and price rows: re-check at first use in a session).

## Contents

- [Sources and kinds](#sources-and-kinds)
- [Rate](#rate)
- [Prices (list)](#prices-list)
- [Schema](#schema)
- [ai-gen](#ai-gen)
- [Behaviour measured on SL8 or claimed by fal](#behaviour-measured-on-sl8-or-claimed-by-fal)
- [Stale and gone](#stale-and-gone)

## Sources and kinds

- **D2 VG:n:** fal's video-generation skill as exported 2026-10-05, line n (its pristine copy is
  in the repo's `studio/media-upstream/fal-agent/` store; it is not installed on this machine).
- **OA:** fal's queue OpenAPI, `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<id>`,
  read 2026-10-05 (D2c) and re-read for every routed id on 2026-10-06 while authoring this skill.
  **REG:** the price text in fal's model registry (`https://fal.ai/api/models?keywords=…`), read
  the same days.
- **T3 #n:** the research program's `T3-sl8-prior-art.md`, fact n (each cites its run).
  **D2c row n / Cn / Bn:** its `D2c-facts-ledger.md` (rows, contradictions, behaviour tests).
  **P1:** its `P1-dialects-prices.md`.
- **Kinds:** `price` (re-check with `ai-gen estimate <id> --params-file p.json --format json`; the
  proxy figure wins), `schema` (re-check with the raw OpenAPI printer in media-ai-gen; `ai-gen
  info` shows a `const` as a default), `cli`, `behaviour` (a run; re-tested only by a paid test,
  whose credits are given).
- Credits = US$ × 250. Only one video price has been checked through the SL8 proxy (Seedance 2.0
  base, 720p, 5 s); every other price below is a **list** price.

## Rate

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| rate-cr-per-usd | all | about 250 credits per US$; one proxy-verified point (Seedance 2.0 720p 5 s = 378 cr = $1.512) | price | 2026-10-05 | P1 "Credits ratio"; D2c §1b | `ai-gen estimate` on any priced id, compare with its list price |

## Prices (list)

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| price-seedance20-base | `bytedance/seedance-2.0/{text,image,reference}-to-video` | token-billed: output height × width × seconds × 24 / 1024 tokens at $0.014 per 1k (480p–1080p), $0.008 per 1k at 4k: 480p 33.6 cr/s, 720p 75.9 ($0.3034), 1080p 170.5 ($0.682), 4k about 389 | price | 2026-10-05 | REG; D2c rows 12–13; P1 §2 | `ai-gen estimate bytedance/seedance-2.0/image-to-video --params-file p.json --format json` (`duration` `"5"`, `resolution` `720p`) |
| price-seedance20-proxy | `bytedance/seedance-2.0/image-to-video` | proxy estimate: 378 cr for 5 s at 720p, audio off | price | 2026-10-05 | `studio/packages/docs/features/ai-gen-v2.1/06-test-results.md:21` via P1 | as above; tolerance 5% |
| price-seedance20-fast | `bytedance/seedance-2.0/fast/*` | $0.0112 per 1k tokens: 480p 26.9 cr/s, 720p 60.5 ($0.2419); a 4 s 480p clip measured 108 cr | price | 2026-10-05 | REG; T3 #30 | estimate at 480p and 720p |
| price-seedance20-mini | `bytedance/seedance-2.0/mini/*` | $0.007 per 1k tokens: 480p 18 cr/s ($0.0721), 720p 38.7 ($0.1547) | price | 2026-10-06 | REG | estimate at 480p and 720p |
| price-seedance-audio | Seedance 2.0 and 2.5, every tier | audio costs nothing extra: the schema says "the cost … is the same regardless" and the token formula has no audio term (fal's skill said +50–100%) | price | 2026-10-05 | D2c row 7, C1; P1 video table | free: estimate with `generate_audio` `true` and `false` (D2c B3) |
| price-seedance-r2v-video | Seedance 2.0 reference-to-video (base, fast, mini) | with `video_urls`, tokens count reference seconds plus output seconds, and the price is multiplied by 0.6 (base 720p $0.1814/s, fast $0.14515/s) | price | 2026-10-06 | REG | estimate with and without a hosted `video_urls` entry |
| price-seedance25 | `bytedance/seedance-2.5/*` | 720p $0.4730/s = 118 cr/s, 1080p $1.164/s = 291; a 30 s `auto` at 720p is about 3,550 cr | price | 2026-10-05 | D2c row 14; P1 §2 | `ai-gen estimate bytedance/seedance-2.5/image-to-video …` |
| price-veo31-fast | `fal-ai/veo3.1/fast` · `/image-to-video` · `/first-last-frame-to-video` | 25 cr/s silent, 37.5 with audio at 720p or 1080p; 75 / 87.5 at 4k | price | 2026-10-06 | D2c row 33; REG | estimate with `generate_audio` both ways |
| price-veo31-full-ref | `fal-ai/veo3.1/reference-to-video` | 50 / 100 cr/s silent / audio; 8 s at 1080p with sound = 800 cr | price | 2026-10-05 | D2c row 34 | estimate |
| price-veo31-extend-ref | `fal-ai/veo3.1/fast/extend-video` · `/fast/reference-to-video` | 25 / 37.5 cr/s, billed on generated seconds | price | 2026-10-06 | D2c row 35; REG | estimate |
| price-veo31-lite | `fal-ai/veo3.1/lite` | 7.5 / 12.5 cr/s at 720p; 12.5 / 20 at 1080p | price | 2026-10-05 | D2c row 36 | estimate |
| price-kling-v3-pro | `fal-ai/kling-video/v3/pro/{text,image}-to-video` | 28 cr/s silent, 42 with audio, 49 with voice control | price | 2026-10-06 | D2c row 46; REG | estimate |
| price-h3 | `minimax/h3/{image,text,reference}-to-video` | 480P 12.5 cr/s, 768P 15 ($0.06, not fal's $0.08), 2K 32.5 (+117% over 768P), 4K 40; reference images: first 5 free, then 20 cr each | price | 2026-10-06 | D2c rows 51, 58, C6; REG | `ai-gen estimate minimax/h3/image-to-video resolution=768P duration:=5 --format json` |
| price-h3max-promo | `minimax/h3-max*` (not routed) | a separate family on a 40% promotion ending 2026-10-15; fal's $0.08 for H3 768P equals H3-Max's post-promotion rate | price | 2026-10-06 (expires 2026-10-15) | P1 §4.8; D2c row 59, C6; REG | estimate |
| price-flux3-flf | `blackforestlabs/flux-3/first-last-frame-to-video` | 42.5 cr/s at 720p, 72.5 at 1080p; no audio differential published; a `/draft` sibling lists 15 cr/s (720p) | price | 2026-10-06 | D2c row 65; REG | estimate |
| price-lucy | `decart/lucy-edit/pro` | 37.5 cr/s at 720p; the listed 480p rate (25) is unreachable (resolution is `const` 720p) | price | 2026-10-06 | D2c rows 74–75; REG | estimate |
| price-ray2-modify | `fal-ai/luma-dream-machine/ray-2/modify` | no published rate | price | 2026-10-05 | D2c row 73 | `ai-gen estimate …` (exit 12 = unpriced) |
| price-ltx-extend | `fal-ai/ltx-2.3/extend-video` | 25 cr/s of new video | price | 2026-10-05 | D2c row 67 | estimate |
| price-seedvr | `fal-ai/seedvr/upscale/video` | 0.25 cr per megapixel of width × height × frames | price | 2026-10-06 | D2c row 79; REG | estimate |
| price-ltx-reframe | `fal-ai/ltx-2.3/reframe` | 25 cr/s at 720p, 50 at 1080p, on the input's duration | price | 2026-10-06 | D2c row 70; REG | estimate |
| price-ray-reframe | `luma/agent/ray/v3.2/reframe` | 15 / 30 / 90 cr/s at 540p / 720p / 1080p, per started source second | price | 2026-10-06 | D2c row 72; REG | estimate |
| price-sonilo | `sonilo/v1.1/video-to-video-sound-effects` | 2.25 cr/s of output, per sample | price | 2026-10-06 | D2c row 80; REG | estimate |
| price-kling-v2a | `fal-ai/kling-video/video-to-audio` | 8.75 cr flat per video | price | 2026-10-06 | D2c row 81; REG | estimate |

## Schema

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| schema-seedance20-duration | Seedance 2.0, all routes and tiers | `duration` string enum `"auto"`, `"4"`–`"15"`, default `"auto"`; `"4s"` is not in it | schema | 2026-10-06 | OA; D2c row 2 | raw OpenAPI check |
| schema-seedance20-aspect | Seedance 2.0, all | `aspect_ratio` `auto` (default), `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16` | schema | 2026-10-06 | OA; D2c row 3 | raw OpenAPI check |
| schema-seedance20-resolution | Seedance 2.0 base vs `/fast/`, `/mini/` | base `480p`/`720p`/`1080p`/`4k`, fast and mini `480p`/`720p`; default `720p` | schema | 2026-10-06 | OA; D2c row 4 | raw OpenAPI check |
| schema-seedance20-bitrate | Seedance 2.0 | `bitrate_mode` `standard` (default)/`high` on base and fast, not mini; `codec` `auto`/`H264`/`H265` (default `auto`) on all | schema | 2026-10-06 | OA; D2c row 5 | raw OpenAPI check |
| schema-seedance-audio-default | Seedance 2.0 and 2.5 | `generate_audio` default `true` on every route | schema | 2026-10-06 | OA; D2c row 6 | raw OpenAPI check |
| schema-seedance-no-negative | Seedance 2.0 and 2.5 | no `negative_prompt` and no moderation or safety field on any route | schema | 2026-10-06 | OA; D2c rows 8–9 | raw OpenAPI check |
| schema-seedance20-end-frame | `bytedance/seedance-2.0/image-to-video` (all tiers) | `end_image_url` optional; `image_url` and `prompt` required | schema | 2026-10-06 | OA; D2c row 10; T3 #26 | raw OpenAPI check |
| schema-seedance20-r2v | `bytedance/seedance-2.0/reference-to-video` (base, fast) | `image_urls` ≤9, `video_urls` ≤3 (2–15 s in total), `audio_urls` ≤3 (≤15 s); only `prompt` required | schema | 2026-10-06 | OA; D2c row 11 | raw OpenAPI check |
| schema-seedance25 | `bytedance/seedance-2.5/image-to-video` | `aspect_ratio` `const` `auto`; `duration` `"auto"`, `"4"`–`"30"`; resolution `480p`/`720p`/`1080p` (no 4k); `prompt` optional; `draft` (=false) | schema | 2026-10-06 | OA; D2c rows 14–15, 17 | raw OpenAPI check |
| schema-veo31-duration | Veo 3.1 fast t2v, i2v, first-last; lite | `duration` `"4s"`/`"6s"`/`"8s"`, default `"8s"`; no 5 s | schema | 2026-10-06 | OA; D2c row 22 | raw OpenAPI check |
| schema-veo31-resolution | Veo 3.1 fast; lite | fast `720p`/`1080p`/`4k`, lite `720p`/`1080p`; default `720p` | schema | 2026-10-06 | OA; D2c rows 23, 36 | raw OpenAPI check |
| schema-veo31-aspect | Veo 3.1 fast | text `16:9`/`9:16` (=16:9); image and first-last add `auto` (=auto) | schema | 2026-10-06 | OA; D2c row 24 | raw OpenAPI check |
| schema-veo31-fields | Veo 3.1 | `negative_prompt` on t2v, i2v, first-last, extend, lite, not on reference; `safety_tolerance` string `"1"`–`"6"` (=`"4"`); `auto_fix` true on t2v and lite, false on image routes, reference and extend | schema | 2026-10-06 | OA; D2c rows 25–27 | raw OpenAPI check |
| schema-veo31-flf | `fal-ai/veo3.1/fast/first-last-frame-to-video` | `first_frame_url` and `last_frame_url` required (not `image_url`) | schema | 2026-10-06 | OA; D2c row 28 | raw OpenAPI check |
| schema-veo31-ref | `fal-ai/veo3.1/fast/reference-to-video` | `duration` `const` `"8s"`; aspect `16:9`/`9:16`, no `auto`; `image_urls` required, no maxItems | schema | 2026-10-06 | OA; D2c row 29 | raw OpenAPI check |
| schema-veo31-extend | `fal-ai/veo3.1/fast/extend-video` | `duration` `const` `"7s"`, `resolution` `const` `"720p"`; aspect `auto`/`16:9`/`9:16` | schema | 2026-10-06 | OA; D2c row 30 | raw OpenAPI check (`ai-gen info` shows both as plain defaults) |
| schema-kling-v3 | `fal-ai/kling-video/v3/pro/{text,image}-to-video` | `duration` `"3"`–`"15"` (=`"5"`); t2v aspect `16:9`/`9:16`/`1:1`; i2v no aspect, `start_image_url` required (aspect 0.4–2.5, ≥300 px, ≤50 MB); `cfg_scale` 0.5; `shot_type` `customize`/`intelligent`; no `resolution`; `generate_audio` true; `prompt` optional | schema | 2026-10-06 | OA; D2c rows 38–40, 44–45 | raw OpenAPI check |
| schema-kling-v3-elements | `fal-ai/kling-video/v3/pro/image-to-video` | `elements[]` objects with `frontal_image_url`, `reference_image_urls`, `video_url`, `voice_id`; element video 3–10.05 s, 24–60 fps, ≤200 MB | schema | 2026-10-05 | OA (`x-fal`); D2c rows 41–42 | raw OpenAPI check |
| schema-kling-v3-negative | Kling v3 pro | `negative_prompt` default `"blur, distort, and low quality"` | schema | 2026-10-06 | OA; D2c row 43 | raw OpenAPI check |
| schema-h3-duration | `minimax/h3/*` | `duration` integer 5–15, default 5; a 4 s ask is rejected | schema | 2026-10-06 | OA; D2c row 49, C10 | raw OpenAPI check |
| schema-h3-resolution | `minimax/h3/*` | `480P`/`768P`/`2K`/`4K`, default `2K`; 2K and 4K upscale a 768P base | schema | 2026-10-06 | OA; D2c row 50 | raw OpenAPI check |
| schema-h3-expansion | `minimax/h3/*` | `prompt_expansion_mode` string, examples `disabled`/`fast`/`balanced`/`quality`, default `balanced`; there is no `enable_prompt_expansion` field | schema | 2026-10-06 | OA; D2c row 52, C5 | raw OpenAPI check |
| schema-h3-other | `minimax/h3/*` | `enable_safety_checker` default true; i2v: `image_url` and `end_image_url` both optional, no aspect field; t2v aspect default `16:9`; r2v aspect default `adaptive`; t2v and i2v take `target_audio_url`, which replaces the soundtrack | schema | 2026-10-06 | OA; D2c rows 53–55, 57 | raw OpenAPI check |
| schema-h3-r2v | `minimax/h3/reference-to-video` | `reference_image_urls` ≤9, `reference_video_urls` ≤3, `reference_audio_urls` ≤3 | schema | 2026-10-06 | OA; D2c row 56 | raw OpenAPI check |
| schema-flux3-flf | `blackforestlabs/flux-3/first-last-frame-to-video` | `prompt`, `start_image_url`, `end_image_url` required; `duration` integer enum 5–20 (=5); resolution `720p`/`1080p` (=720p); aspect `auto`, `21:9`, `2:1`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`; `safety_tolerance` integer 0–4 (=2); `generate_audio` true | schema | 2026-10-06 | OA; D2c rows 61–65 | raw OpenAPI check |
| schema-lucy | `decart/lucy-edit/pro` | `resolution` `const` `720p`; `enhance_prompt` true; `sync_mode` true | schema | 2026-10-06 | OA; D2c rows 74–75 | raw OpenAPI check |
| schema-ray2-modify | `fal-ai/luma-dream-machine/ray-2/modify` | `mode` nine values (=`flex_1`); optional `prompt` and `image_url`; no duration or resolution | schema | 2026-10-06 | OA; D2c row 73 | raw OpenAPI check |
| schema-ltx-extend | `fal-ai/ltx-2.3/extend-video` | `duration` number 2–20 (=5); `mode` `start`/`end` (=end); `context` 1–20, defaulting to the maximum inside a 505-frame limit | schema | 2026-10-05 | OA; D2c row 66 | raw OpenAPI check |
| schema-ltx-reframe | `fal-ai/ltx-2.3/reframe` | aspect `1:1`/`4:5`/`5:4`/`9:16`/`16:9` (=16:9); `720p`/`1080p` (=1080p); no prompt | schema | 2026-10-06 | OA; D2c row 69 | raw OpenAPI check |
| schema-ray-reframe | `luma/agent/ray/v3.2/reframe` | `prompt`, `video_url`, `aspect_ratio` required; aspect `3:4`/`4:3`/`1:1`/`9:16`/`16:9`/`21:9`; `540p` (default)/`720p`/`1080p`; source 10 s or less; optional `duration` `5s`/`10s` | schema | 2026-10-06 | OA; D2c row 71 | raw OpenAPI check |
| schema-topaz-video | `fal-ai/topaz/upscale/video` | `model` 19 values (=`Proteus`); `upscale_factor` 1–4 (=2); `target_fps` optional | schema | 2026-10-06 | OA; D2c row 76 | raw OpenAPI check |
| schema-seedvr-video | `fal-ai/seedvr/upscale/video` | `upscale_mode` `factor` (default)/`target`; `target_resolution` `720p`–`2160p` (=1080p); `upscale_factor` 1–10 (=2) | schema | 2026-10-06 | OA; D2c row 78 | raw OpenAPI check |
| schema-sonilo | `sonilo/v1.1/video-to-video-sound-effects` | `video_url` required; `keep_speech_vocal` default false; `audio_format` `wav`/`mp3`/`aac`/`flac` (=aac); `segments`; returns a muxed video and the audio | schema | 2026-10-06 | OA; D2c row 80 | raw OpenAPI check |
| schema-kling-v2a | `fal-ai/kling-video/video-to-audio` | `background_music_prompt` default "intense car race"; `sound_effect_prompt` default "Car tires screech as they accelerate in a drag race"; `asmr_mode` false; input 3–20 s, ≤100 MB | schema | 2026-10-06 | OA; D2c row 81 | raw OpenAPI check |

## ai-gen

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| cli-video-flags | ai-gen 2.2.0 `video` | `-m` required (no default model); queue by default; `--image`/`--first-frame` fill the first of `image_url`, `start_image_url`, `first_frame_image_url`, `input_image_url`, `first_frame_image`, `image` the schema has; `--last-frame` the first of `end_image_url`, `last_image_url`, `tail_image_url`, `last_frame_image_url`, `end_image`; `--video` → `video_url`; `--audio-file` → `audio_url`; `--ref` → `reference_image_urls`, `image_urls`, `reference_images`, `references` or `elements` | cli | 2026-10-06 | `studio/packages/worker/ai-gen/src/commands/video.ts:42-104`; `shared.ts:357-363` | `ai-gen video --help` |
| cli-veo-flf-no-flag | ai-gen 2.2.0 `video` on Veo first-last | `first_frame_url` and `last_frame_url` are in no candidate list, so `--image` falls back to `image_url`, which the route drops; pass hosted URLs or data URIs in the params file | cli | 2026-10-06 | `shared.ts:342-363` (`pickParamKey` fallback) | read the source, or `--strict-params` (exit 7, not charged) |
| cli-kling-ref | ai-gen 2.2.0 `video` on Kling v3 i2v | `--ref` picks `elements` (its last candidate) and fills it with plain strings, where the route wants objects | cli | 2026-10-06 | `shared.ts:362` | read the source |
| cli-arrays-not-uploaded | ai-gen 2.2.0 | a local path inside a JSON array, `k=v` or the params file is sent as text: `video_urls`, `audio_urls`, `end_image_url` on `run` | cli | 2026-10-05 | media-ai-gen `references/commands.md` "Inputs and uploads"; T2 §3c.1 | — |
| cli-audio-flag | ai-gen 2.2.0 | `--audio on\|off` sets only `generate_audio` | cli | 2026-10-05 | P1 takeaway 3 | `ai-gen video --help` |
| cli-info-const | ai-gen 2.2.0 `info` | prints a `const` as a plain default (Veo extend `duration` `"7s"`) | cli | 2026-10-05 | D2c C11 | `ai-gen info fal-ai/veo3.1/fast/extend-video --format json` |
| cli-estimate-types | ai-gen 2.2.0 `estimate` | does not coerce types the way `run` does: estimate and run from one params file with exact JSON types | cli | 2026-10-05 | P1 hazard 1 | — |
| cli-models-no-price | ai-gen 2.2.0 `models --search` | client-side search with no prices; a cold catalog fetch takes about 2 min | cli | 2026-10-05 | D2b §1 | `ai-gen models --search <q> --format json` |

## Behaviour measured on SL8 or claimed by fal

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| beh-seedance-length | `bytedance/seedance-2.0/*` | a 5 s request returned 4.06 s, twice: `render_dur` comes from ffprobe, not the request | behaviour | 2026-09-23 | T3 #15; D2c row 19, C4 | D2c B1, about 135 cr |
| beh-seedance-fast-ceiling | `bytedance/seedance-2.0/fast/*` | works up to 12 s at 480p and 10 s at 720p; above that a 422 that can sit `IN_PROGRESS` 30 min or more | behaviour | 2026-07-04 | T3 #17; D2c row 18, C3 | D2c B2, 0 cr if refused, exposure about 350 cr |
| beh-seedance-photoreal | Seedance | photoreal human references get refused (fal measured it on 2.5); SL8 routes photoreal faces to Veo | behaviour | 2026-07 | D2c rows 9, 21; T3 §3 (`character-consistent-multishot.md:41-43`) | D2c B4, exposure about 72 cr |
| beh-seedance-44k | Seedance 2.0 | native audio at 44.1 kHz; concatenating mixed rates inflated duration (+0.72 s on 8.2 s) | behaviour | 2026-08 | T3 #27 | D2c B17, local and free |
| beh-ref-order | reference routes | `@Image1` follows `--ref` order; an untagged reference gets averaged | behaviour | ≤2026-09-23 | T3 #20 | — |
| beh-veo-extend | `fal-ai/veo3.1/fast/extend-video` | returns the whole grown video, never a concat; a chain is capped at 30 s; repeat at least 80% of the subject text each hop | behaviour | 2026-06-20 | T3 #25; D2c rows 30, 32 | paid |
| beh-veo-extend-rescale | as above | a 2544×1456 source came back 1920×1080 (fal's claim) | behaviour | ≤2026-10-05 | D2 VG:297-298; D2c row 31 | D2c B9, about 175 cr |
| beh-ltx-context | `fal-ai/ltx-2.3/extend-video` | continues only the last shot; `context` 2 is a working floor (fal's claim) | behaviour | ≤2026-10-05 | D2 VG:361-367; D2c row 68 | paid |
| beh-kling-multishot | Kling | multi-shot rated one star of five on SL8 (a dead end), which weighs against fal's Kling text escape | behaviour | 2026-07 | T3 §3 (`do-not-use.md:32`); D2c row 47, C9 | paid |
| beh-kling-v2a | `fal-ai/kling-video/video-to-audio` | omitting both prompts gives a car chase (fal's claim; the defaults are confirmed in the schema) | behaviour | ≤2026-10-05 | D2 VG:402-406 | D2c B12, about 9 cr |
| beh-motion-floor | any route | a liveness floor of 6 against route noise of about 70 passed an unchanged clip at 69.64 (fal's claim) | behaviour | ≤2026-10-05 | D2 VG:505-507; D2c B16 | local and free |
| beh-credits-used | Seedance i2v | `credits_used` over-reported about 8.4× (908 against 108); `estimate` matched the bill | behaviour | 2026-07-22 | T3 #4 | — |
| beh-declared | any route | a declared 720p came back 864×496, three times | behaviour | ≤2026-09-23 | T3 #16 | every run: media-qc `declared` |
| beh-unknown-dropped | the SL8 proxy | unknown params are dropped silently | behaviour | 2026-07-22 | T3 #1 | D2c B15 invalid-value probe, ≤5 cr |
| beh-charges | the SL8 proxy | a 422 is uncharged; exit 7 can be charged; exit 10 is a charged timeout | behaviour | 2026-08-23 | T3 #7 | — |
| beh-urls-expire | outputs | hosted `*.fal.media` URLs expire: download at once | behaviour | 2026-06 | T3 #12 | — |

## Stale and gone

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| gone-seedance25-tiers | `bytedance/seedance-2.5/fast/*`, `/mini/*` | 404: 2.5 has no `/fast/` or `/mini/` tier (fal's skill pinned flags on "2.5 … at all three tiers"); it has `draft` instead | schema | 2026-10-06 | OA; D2c row 16, C2 | raw OpenAPI check |
| gone-seedance-prefix | `fal-ai/bytedance/seedance-2.0/image-to-video` | 404; the bare `bytedance/…` id is the live one | schema | 2026-10-05 | OA; D2c row 1 | raw OpenAPI check |
| stale-topaz-video-price | `fal-ai/topaz/upscale/video` | fal's $0.01 / $0.02 / $0.08 per second has no listing for this id any more; the routes split into `topaz/upscale/video/{precision,generative,creative}`: precision 2.5 / 5 / 15 cr/s (720p / 1080p / 4K), generative (Starlight) about 30 cr/s up to 1080p; 60 fps doubles | price | 2026-10-06 | D2c row 77; REG | `ai-gen estimate fal-ai/topaz/upscale/video …` |
| stale-h3-768p | `minimax/h3/*` | fal's $0.08/s at 768P is $0.06 (15 cr/s) | price | 2026-10-06 | D2c C6; REG | estimate |
| stale-h3-expansion | `minimax/h3/*` | fal's `enable_prompt_expansion` is `prompt_expansion_mode` | schema | 2026-10-06 | D2c C5; OA | raw OpenAPI check |
| stale-seedance-audio | Seedance | fal's "audio raises the rate 50–100%" holds for Veo (+50% fast, +100% full) and Kling (+50%), not Seedance | price | 2026-10-05 | D2c C1 | estimate pair |
| stale-seedance25-tense | `bytedance/seedance-2.5/*` | fal writes of 2.5 in the past tense; it is live and leading | schema | 2026-10-05 | D2c row 14, stale table | raw OpenAPI check |
