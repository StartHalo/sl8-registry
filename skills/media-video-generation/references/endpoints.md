# Per-endpoint parameters

These endpoints disagree constantly. Read the block for the route you take.

The blocks below are fal's, moved here from `SKILL.md` (fal export 2026-10-05), with SL8's
corrections in place. Every field and default was read from fal's live OpenAPI on
2026-10-05 (re-read 2026-10-06). **Prices are fal list prices × 250 cr/$, not proxy quotes**:
before every paid call run `ai-gen estimate <id> --params-file <p.json> --format json` on the
exact payload and use its figure. Each figure has a dated row in [facts.md](facts.md). Re-check
fields before use: `ai-gen info <id> --format json`, then the raw OpenAPI printer in
media-ai-gen for every `const` and `enum` (HR2).

## Contents

- [How inputs reach a route through ai-gen](#how-inputs-reach-a-route-through-ai-gen)
- [Seedance 2.0: the primaries and their first fallback](#seedance-20-the-primaries-and-their-first-fallback)
- [Veo 3.1: fast, reference, extend, lite](#veo-31-fast-reference-extend-lite)
- [Kling v3 pro](#kling-v3-pro)
- [MiniMax H3](#minimax-h3)
- [Flux 3 first and last frame](#flux-3-first-and-last-frame)
- [Restyle: Lucy edit pro and Ray 2 modify](#restyle-lucy-edit-pro-and-ray-2-modify)
- [Extend: LTX 2.3](#extend-ltx-23)
- [Upscale: Topaz and SeedVR](#upscale-topaz-and-seedvr)
- [Reframe: LTX 2.3 and Ray 3.2](#reframe-ltx-23-and-ray-32)
- [Sound for a clip: Sonilo and Kling video-to-audio](#sound-for-a-clip-sonilo-and-kling-video-to-audio)

## How inputs reach a route through ai-gen

A local file reaches a route only through a media flag, which uploads it inside the call. Use
`ai-gen video` for anything with frames: `--last-frame` exists only there. A local path inside a
JSON array, a `k=v` value or the params file is sent as text and fails (a 422, which may be
charged). Where no flag reaches a field, put a hosted URL from an earlier result
(`hosted_urls[0]`, used promptly) or a data URI of 3 MB or less in the params file.

| Route | Flag → field | No flag reaches |
|---|---|---|
| Seedance 2.0 image-to-video (base, `/fast/`, `/mini/`) | `--image` or `--first-frame` → `image_url`; `--last-frame` → `end_image_url` | — |
| Seedance 2.0 reference-to-video | one `--ref` per image → `image_urls` (≤9), in `@Image1` order | `video_urls`, `audio_urls` |
| Veo 3.1 fast image-to-video | `--image` → `image_url` | — |
| Veo 3.1 fast first-last-frame | none: `--image` falls back to `image_url`, which this route drops | `first_frame_url`, `last_frame_url` (both required) |
| Veo 3.1 fast reference-to-video | `--ref` → `image_urls` | — |
| Veo 3.1 fast extend | `--video` → `video_url` | — |
| Kling v3 pro image-to-video | `--image` → `start_image_url`; `--last-frame` → `end_image_url`. **Never `--ref` here**: it fills `elements` with bare file strings where the route wants objects | element members (`frontal_image_url`, `reference_image_urls`, `video_url`) |
| MiniMax H3 image-to-video | `--image` → `image_url`; `--last-frame` → `end_image_url` | `target_audio_url` |
| MiniMax H3 reference-to-video | `--ref` → `reference_image_urls` (≤9) | `reference_video_urls`, `reference_audio_urls` |
| Flux 3 first-last-frame | `--first-frame` → `start_image_url`; `--last-frame` → `end_image_url` | — |
| Lucy edit, LTX extend and reframe, Ray reframe, Topaz, SeedVR, Sonilo, Kling video-to-audio | `--video` → `video_url` | — |
| Ray 2 modify | `--video` → `video_url`; `--image` → `image_url` (style reference) | — |

## Seedance 2.0: the primaries and their first fallback

**`bytedance/seedance-2.0/text-to-video` · `/image-to-video` ·
`/reference-to-video`**, and their `/fast/` and `/mini/` siblings — the primaries
and their first fallback. `prompt` required on all of them; `image_url` also
required on the image routes. **`duration` is a string enum of bare integers** —
`"auto"` (default) and `"4"` through `"15"`, one per second. Note the shape: it is
`"4"`, **not** `"4s"`. Veo's `"4s"` spelling 422s here, and a pre-flight that
checks the field *name* will not catch it (HR2). Past 15s leaves this family
entirely. `aspect_ratio` is the widest enum in the table and is identical on all
three routes: `auto`, which is the default, plus `21:9`, `16:9`, `4:3`, `1:1`,
`3:4` and `9:16`. On an image route the default inherits the source frame's own
ratio rather than imposing one. `generate_audio` **defaults
`true`** on every tier. **No `negative_prompt` field exists** on any of them.
First-and-last-frame is this same image-to-video endpoint with the optional
`end_image_url` added — unlike Flux 3, where both ends are required.
Reference-to-video carries `image_urls`, `video_urls` and `audio_urls` as separate
arrays (at most 9, 3 and 3; reference videos 2–15 s in total, audio 15 s or less).

**The tiers differ in exactly two ways, and one of them is a routing decision.**
`resolution` on the **base** routes is `480p`, `720p`, `1080p` or `4k`, default
`720p` — these are the only primaries here that reach 4k. On both `/fast/` and
`/mini/` it is `480p` or `720p` only, so *a request above 720p cannot be served by
the fallback column* — it stays on base or leaves the family. `bitrate_mode`
(`standard` default, or `high`) exists on base and `/fast/` but **not on
`/mini/`**; it raises quality at the same resolution, and therefore the bill.
Everything else — duration enum, aspect enum, audio default, required fields — is
identical across all three, which is why `/fast/` needs no prompt rewriting.
**A third difference is measured, not in the schema:** `/fast/` fails above 12 s at
480p and above 10 s at 720p, with a 422 that can sit `IN_PROGRESS` for 30 minutes or
more, although its enum advertises 15 (SL8, 2026-07-04). A longer clip stays on base.

**Rates are not published in the OpenAPI schema for any Seedance tier.** Price the
exact payload with `ai-gen estimate` before quoting, and never carry a figure over
from a route this one replaced. A quote with a stale rate is worse than no quote: it
reads as verified. The dated list rates: base 33.6 cr/s at 480p, 75.9 at 720p, 170.5
at 1080p and about 389 at 4k; `/fast/` 26.9 at 480p and 60.5 at 720p; `/mini/` 18 at
480p and 38.7 at 720p. One proxy quote is on record: base, 720p, 5 s = 378 cr.
**Audio costs nothing extra on any Seedance tier**: the schema says the cost is the
same either way and the price formula (output pixels × seconds) has no audio term.
**Reference video is billed too:** with `video_urls`, reference-to-video counts the
reference seconds plus the output seconds, at 0.6× the rate.

## Veo 3.1: fast, reference, extend, lite

**`fal-ai/veo3.1/fast` · `/image-to-video` · `/first-last-frame-to-video`** —
no longer primary for any row; kept because it is the only 1080p/4k route here
with `negative_prompt` support, and the extend fallback's source.
`prompt` required. `duration` is a **string enum**: `"4s"`, `"6s"`, `"8s"`,
default `"8s"`. `resolution`: `720p`, `1080p` or `4k`, default `720p`. Aspect
on text-to-video is `16:9` or `9:16`; the image routes add `auto` and default
to it. `negative_prompt` accepted. `safety_tolerance` is a **string** `"1"`–`"6"`
(default `"4"`). `generate_audio` **defaults `true`**. `auto_fix` defaults
`true` on text-to-video, `false` on the image routes. Image routes need
`image_url`; first-last needs `first_frame_url` and `last_frame_url`, which no
ai-gen media flag fills (see the table above).
**25 cr/s silent, 37.5 cr/s with audio at 720p or 1080p; 75/87.5 at 4k.**

**`fal-ai/veo3.1/fast/reference-to-video`** — `image_urls` (array) and `prompt`
required, `duration` a **`const` of `"8s"`** — this route makes 8-second clips
and nothing else, so any other length belongs elsewhere — aspect `16:9` or
`9:16` with no `auto`, and **no `negative_prompt` at all**. `generate_audio`
**defaults `true`**. Same rates as above. The non-fast
`fal-ai/veo3.1/reference-to-video` is the identical shape at **50/100 cr per
second** — an 8s 1080p clip with sound is **800 cr**. Use it only on request.

**`fal-ai/veo3.1/fast/extend-video`** — the fallback, and a narrow one.
`video_url` and `prompt` required. `duration` and `resolution` are both OpenAPI
**`const`** values — `"7s"` and `"720p"` — so this route adds exactly seven
seconds at 720p and can do nothing else. Any extend for a different length, or
above 720p, goes straight to `fal-ai/ltx-2.3/extend-video`; reach for this one
only when the source is Veo's own output and +7s at 720p is acceptable, where
it continues natively. **Note what that precondition now means:** the generation
primaries are Seedance, so a clip this skill produced itself is *not* Veo output
and this fallback does not apply to it. It is for a Veo clip the user brings in,
or one made deliberately via the Veo row. For everything else the extend fallback
is effectively `fal-ai/ltx-2.3/extend-video` alone — if that route is down, say so
rather than sending a Seedance clip here. `aspect_ratio` is `auto`, `16:9` or `9:16` (default
`auto`) — never use it to get a vertical "for free": that re-renders the whole
source through the model, and the aspect change belongs to reframe. Extend
re-encodes the entire file either way — a source that is not exactly 16:9 comes
back rescaled (a 2544x1456 input returns 1920x1080), so even the untouched
seconds are not bit-identical. `negative_prompt` accepted. `generate_audio`
**defaults `true`**. You pay for the new seconds only: **25 cr/s silent,
37.5 cr/s with audio.**
**`fal-ai/veo3.1/lite`** is the draft lane: same `"4s"`/`"6s"`/`"8s"` duration
enum as fast, `resolution` only `720p` or `1080p` (**no 4k**),
`negative_prompt` accepted, `generate_audio` again **`true`**, at **7.5 cr/s
silent and 12.5 cr/s with audio at 720p**.

## Kling v3 pro

**`fal-ai/kling-video/v3/pro/text-to-video` · `/image-to-video`** — `duration`
is a **string enum of every integer from `"3"` to `"15"`**, default `"5"`: the
route for anything past 8 seconds. Text aspect is `16:9`, `9:16` or square
`1:1`; the image route has **no aspect field at all** and derives shape from
`start_image_url` (plus optional `end_image_url`, and an `elements` array whose
objects carry `reference_image_urls`, `frontal_image_url`, `video_url` and
`voice_id` — those four are element members, not top-level fields).
`negative_prompt` **ships with a non-empty default** —
`blur, distort, and low quality` — so replace it rather than appending.
`cfg_scale` 0.5; `shot_type` `customize` or `intelligent`; **no `resolution`
field**. `generate_audio` **defaults `true`**. **28 cr/s silent, 42 cr/s with
audio, 49 cr/s with voice control.**

## MiniMax H3

**`minimax/h3/image-to-video` · `/text-to-video` · `/reference-to-video`** —
`duration` is a plain **integer, bounded 5–15**, default `5` — a 4s ask is a
422, not a short clip. `resolution` is `480P`,
`768P`, `2K` or `4K` (2K and 4K upscale a 768P base) and **defaults to `2K`** — 32.5 cr/s rather than the 15 cr/s
you likely budgeted, so send `768P` explicitly unless 2K was asked for.
`prompt_expansion_mode` **defaults `"balanced"`** and rewrites your prompt
(`"disabled"`, `"fast"`, `"balanced"` or `"quality"`): send `"disabled"` when the prompt is
complete (media-h3-prompter writes it whole). There is no `enable_prompt_expansion` field on
any H3 route; the proxy drops it silently and the prompt is rewritten anyway (HR3).
`enable_safety_checker` also defaults `true`. The image route takes `image_url`
plus optional `end_image_url` and has **no aspect field**; text and reference
routes do, reference defaulting to `adaptive`. Reference takes three arrays —
`reference_image_urls` (max 9), `reference_video_urls` and
`reference_audio_urls` (max 3 each). **No
audio flag exists on any H3 route.** **12.5 cr/s at 480P, 15 cr/s at 768P, 32.5 cr/s at 2K,
40 cr/s at 4K; first 5 reference images free, 20 cr each after.**

## Flux 3 first and last frame

**`blackforestlabs/flux-3/first-last-frame-to-video`** — `start_image_url` and
`end_image_url` both required. `duration` is an **integer enum from 5 to 20**,
default `5`; `resolution` is `720p` or `1080p`; the aspect enum is the widest
here, covering `auto`, ultrawide, wide, square and both verticals.
`safety_tolerance` is an **integer** (default `2`), unlike Veo's string.
`generate_audio` **defaults `true`**. **42.5 cr/s at 720p, 72.5 cr/s at 1080p.**

## Restyle: Lucy edit pro and Ray 2 modify

**`decart/lucy-edit/pro`** — `video_url` and `prompt` required. The `resolution`
enum holds **only `720p`**, so the cheaper 480p tier in the price list is not
reachable here. `enhance_prompt` **defaults `true`** and rewrites a restyle
instruction that was probably already exact — send `false` when it is precise.
`sync_mode` **defaults `true`**, blocking rather than queuing; send `false` for
anything beyond a few seconds — on this machine always, since every paid call runs
`--queue`. **37.5 cr/s at 720p.**

**`fal-ai/luma-dream-machine/ray-2/modify`** — `video_url` required, `prompt`
and an `image_url` style reference optional. The lever is `mode`, a nine-value
enum: `adhere_1`–`adhere_3` stay close to the source, `flex_1`–`flex_3` (default
`flex_1`) allow moderate change, `reimagine_1`–`reimagine_3` change the most. No
duration or resolution field — it follows the source. No published rate: run
`ai-gen estimate` first; if it exits 12 the route is unpriced and would run uncapped, so
open a gate rather than submit (media-ai-gen).

## Extend: LTX 2.3

**`fal-ai/ltx-2.3/extend-video`** — the general-purpose extend and the primary.
`video_url` required, `prompt` optional. `duration` is a plain **number,
bounded 2–20**, default `5` — the only extend route that honours an arbitrary
length. `mode` is `start` or `end` (default `end`) — also the only route here
that can prepend footage *before* a clip. `context` (1–20) sets how many source
seconds condition the continuation, and it is the only adherence lever this
route has — there is no cfg or mode-style control. Two consequences. Set
`context` so it covers only the final shot: if the source has an internal cut,
a window spanning the cut feeds the model a montage and invites it to cut
again. And when an extension wanders — an uninvited camera move, the subject
drifting out of frame, a fresh cut — the retry is `context` lowered (2 is a
working floor) plus a prompt that pins the camera explicitly ("locked, no
pull-back, no zoom, no reveal"), not the same payload resubmitted.
**25 cr/s of new video.**

## Upscale: Topaz and SeedVR

**`fal-ai/topaz/upscale/video`** — `video_url` required, `upscale_factor` number
default `2`. `model` is a 19-value enum, default `Proteus`; the `Starlight`
family is the detail-synthesis tier and `Gaia 2` bills at half price. Optional
`target_fps` (16–60) — pushing past 30 doubles the bill. **fal no longer lists a
price for this id** (2026-10-05): Topaz split into `topaz/upscale/video/precision`,
`/generative` and `/creative`, where precision lists 2.5 cr/s to 720p, 5 to 1080p
and 15 at 4K, and Starlight moved to `/generative` at about 30 cr/s up to 1080p.
Estimate this id before quoting; exit 12 means unpriced, so take the SeedVR fallback.

**`fal-ai/seedvr/upscale/video`** — `video_url` required. `upscale_mode` is
`factor` (default, reads `upscale_factor`) or `target` (reads
`target_resolution`: `720p`, `1080p`, `1440p` or `2160p`, default `1080p`).
**0.25 cr per megapixel of `width × height × frames`** — check the frame count
before submitting, not the running time.

## Reframe: LTX 2.3 and Ray 3.2

**`fal-ai/ltx-2.3/reframe`** — `video_url` required. Aspect options are square,
`4:5`, `5:4`, and both `9:16` / `16:9`, defaulting to widescreen; `resolution`
is `720p` or `1080p` and **defaults to `1080p`, double the price**. There is
**no prompt field here** — a user instruction about what should fill the new
edges cannot be carried on this route, so either accept the model's own
extension or switch to the Ray fallback, which does take one. **25 cr/s at
720p, 50 cr/s at 1080p, billed on the input's duration.**

**`luma/agent/ray/v3.2/reframe`** — `video_url`, `prompt` **and** the aspect
field are all **required**; the prompt is not optional here. Its aspect enum
adds portrait `3:4`, landscape `4:3` and `21:9` over LTX's, but **drops `4:5`
and `5:4`** — a 4:5 job cannot fall back here. The source must be **10 s or
less**. `resolution` is
`540p`, `720p` or `1080p`, default `540p`; optional `source_position` places the
original inside the new frame. **15 cr/s at 540p, 30 cr/s at 720p, 90 cr/s at
1080p, billed per started second of source.**

## Sound for a clip: Sonilo and Kling video-to-audio

**`sonilo/v1.1/video-to-video-sound-effects`** — `video_url` required, `prompt`
optional (describe the sound, not the picture), `segments` to time individual
effects, `audio_format` default `aac`. `keep_speech_vocal` defaults `false`: pin it
(HR4), `true` when the source's speech must survive; what `false` does to speech is
unmeasured on SL8. **2.25 cr/s of output per sample.**

**`fal-ai/kling-video/video-to-audio`** — `video_url` required, and **both
prompt fields ship with content-bearing defaults**: `background_music_prompt` is
`intense car race`, `sound_effect_prompt` is `Car tires screech as they
accelerate in a drag race`. Send both explicitly every time — omitting them does
not mean silence, it means a car chase. `asmr_mode` defaults `false`. **8.75 cr
flat per video.**
