# Veo 3.1 image-to-video + extend-video dialect — the render engine, baked inline

The per-model mechanics for the ONE-continuous-shot extend chain. Baked **inline** here
because the runtime sandbox has **no KB access** — this file IS the source of truth at
runtime. Source: the 2026-06-20 Veo PoC (base i2v 4.1MB then extend 6.9MB — the extend
returning the FULL grown video), the BOT-030 `research/{model-evaluation,prompt-engineering}.md`,
and the fal `fal-ai/veo3.1/image-to-video` + `fal-ai/veo3.1/extend-video` param schemas
captured live in the PoC `run.log`.

## The headline mechanic (PROVEN — use exactly this)

Veo 3.1 builds ONE continuous shot as a **base image-to-video** clip + a chain of
**extend-video** hops. The defining fact, and the whole reason this is a different
architecture from the Seedance and Kling siblings:

> **`extend-video` RETURNS THE FULL extended video — base + every extension so far — NOT a
> 7-second segment.** So there is **NEVER a concat**. Each hop's output is the whole growing
> video; the FINAL hop's local file IS the finished continuous episode.

```
base frame (nano-banana-pro)
   │  ai-gen video … -m fal-ai/veo3.1/image-to-video --image base.png
   ▼
base.mp4 (8s, native audio) ── hosted url ─┐
                                           │  ai-gen run fal-ai/veo3.1/extend-video
                                           │    video_url=<base url> prompt=<hop1>
                                           ▼
                          full video (≈15s)  ── hosted url ─┐   ← the WHOLE 15s, not a 7s piece
                                                            ▼  ai-gen run … video_url=<that url>
                                            full video (≈22s)  ← the WHOLE 22s
                                                   …
                                            FINAL full video  → mv to episode.mp4  (NO concat)
```

## (1) The base start frame — nano-banana-pro

ONE opening still for the Base scene, with the plan's FROZEN character tokens, large in
frame, clearly lit.

```bash
ai-gen image "<look header> A single cinematic opening frame: <base scene> The subject is <CHARACTER tokens>, large in frame, clearly lit. No text, no watermark, no logo." \
  -m fal-ai/nano-banana-pro --aspect-ratio <16:9|9:16> --max-cost 80 --format json
```

- **NO `--resolution` flag** — nano-banana-pro REJECTS it (exits non-zero) and the whole
  image chain falls through to the fallback, skipping the primary model. Never pass it.
- Chain fallback (availability only): `fal-ai/nano-banana-pro -> openai/gpt-image-2 ->
  fal-ai/nano-banana-2`. All three take `--aspect-ratio`.
- JSON contract (v2.1.0): the local file is **`files[0].local_path`** (files[] entries are
  OBJECTS, not strings — parse with python3); the hosted URL is **`files[0].url`** (a
  `*.fal.media` URL; `hosted_urls[0]` is the fallback field). Capture **both**.

## (2) Base image-to-video — `fal-ai/veo3.1/image-to-video` (native audio)

```bash
ai-gen video "<base motion prompt>" \
  -m fal-ai/veo3.1/image-to-video \
  --image <base.png> \
  --duration 8s --resolution 720p --aspect-ratio <16:9|9:16> \
  --max-cost 700 --format json
```

- **`--image` maps to `image_url`** (the CLI uploads the local file). Required.
- **`duration` is one-of `4s | 6s | 8s` (default `8s`)** — note the trailing `s`. We use
  `8s` (the longest base; the chain then extends it).
- **`resolution` one-of `720p | 1080p | 4k` (default `720p`)**. `aspect_ratio` one-of
  `auto | 16:9 | 9:16` (default `auto`) — Veo only supports 16:9 and 9:16; an off-ratio
  input image is letterboxed by the model.
- **Native audio: `generate_audio` defaults to TRUE.** The base MP4 arrives WITH a native
  audio stream (the score/SFX Veo invents for the scene). Do NOT add a music bed — it would
  double up. This is the load-bearing difference from the Kling sibling (which is silent and
  needs an added room-tone bed).
- Capture **`files[0].local_path`** (the base clip) AND **`files[0].url`** (the HOSTED url —
  this is what the FIRST extend hop consumes as `video_url`).

## (3) Each extend hop — `fal-ai/veo3.1/extend-video` (returns the FULL video)

```bash
ai-gen run fal-ai/veo3.1/extend-video \
  video_url="<PREVIOUS HOSTED url>" \
  prompt="<hop prompt>" \
  --duration 7s --max-cost 700 --format json
```

- **`video_url` is the HOSTED url of the PREVIOUS step** (the base url for hop 1, then the
  prior hop's url for hop 2, …). It is a `video_url`, **not** a local file — extend-video
  cannot take a local path. If a step returns no hosted url, the chain CANNOT continue;
  keep the last good video as the episode and record the shortfall (never fabricate).
- **`prompt` is required** — the continuation beat for the next stretch of the SAME take.
- **`duration` default `7s`** (free-form string; we send `7s`, retry with bare `7` if the
  model rejects the `s` form). Veo extends **up to 30s total** across the chain — keep
  base(8s) + hops within that ceiling (8 + 7 + 7 ≈ 22s is safe; a 4th 7s hop reaches the cap).
- **`generate_audio` defaults TRUE** — the extension carries native audio too, continuous
  with the base. Still NO concat, NO added bed.
- **The response is the WHOLE grown video** (base + all extensions so far), NOT a 7s piece.
  Capture the new **`files[0].local_path`** (the running full episode) AND **`files[0].url`**
  (the NEXT hop's `video_url`). The video duration must GROW each hop — if it does not grow,
  treat the hop as not-applied and keep the last good (do not regress).

## Continuity — keep the subject across the seam (>= 80% subject repeat)

Veo extend continues the SAME scene and camera by default; the risk is identity drift across
the seam. Two anchors hold it:

1. **Restate the character in EVERY hop prompt** — the same frozen tokens as the base, plus
   "same character, same setting, one continuous take, no cut". Aim for **>= 80% subject
   repeat** between the hop prompt and the base prompt (the model holds identity far better
   when the subject description recurs nearly verbatim).
2. **One camera intent per hop** — a single continuation beat (a move OR an action), not a
   scene change. A hard scene change inside an extend reads as a cut and breaks the "one
   continuous shot" promise; route distinct scenes to the Kling/Seedance multi-shot siblings,
   not here.

## ai-gen JSON contract (v2.1.0) — read both fields, never regex the blob

- `files[]` entries are **OBJECTS**: `files[0].local_path` (the path on disk),
  `files[0].url` (the hosted `*.fal.media` URL). Parse with python3.
- `hosted_urls[0]` is the fallback hosted-URL field if `files[0].url` is absent.
- **Cost**: use `ai-gen estimate` + `ai-gen balance` deltas. **Never** the JSON
  `credits_used` field — it over-reports (~8x high on Veo-class i2v). A failed generation is
  not charged; a needless re-render is.

## Veo vs the siblings — the architecture note (disclose in summary.md)

| | engine | how the shot is built | audio | stitching |
|---|---|---|---|---|
| Seedance (BOT-027) | reference-to-video | whole shot-list in ONE pass | native | none |
| Kling (BOT-028) | per-shot i2v | one clip per shot | added room-tone bed | ffmpeg concat |
| **Veo (BOT-030)** | **i2v + extend chain** | **ONE base + N extend hops, each returning the FULL video** | **native** | **NONE (extend returns the whole video)** |

The one-line note for `summary.md`, verbatim:

> One continuous Veo 3.1 shot — an image-to-video base extended by N extend-video hops, each
> hop returning the FULL grown video (NO concat); native audio throughout. A different
> architecture from Seedance's single-pass reference-to-video and Kling's per-shot i2v +
> ffmpeg concat; scored head-to-head in the KB results-log.

## Failure triage (headless — clean recorded failure, never a fabricated MP4)

| situation | action |
|---|---|
| continuous-plan.md missing or empty | Phase cannot run — `blocked`, no MP4, stop. |
| base frame chain fails (all 3 image models) | No base — exit non-zero, no MP4, record it. |
| base i2v fails | No base clip — exit non-zero, no MP4, record it. |
| base i2v returns no hosted url | Cannot extend (extend needs `video_url`) — deliver the 8s base as the continuous shot, FLAG, record the shortfall. |
| a hop fails / returns no file / returns no growing video | Stop the chain, keep the LAST GOOD extended video as `episode.mp4`, FLAG, record the exact shortfall (which hop, why). Never fabricate the missing length. |
| episode produced but ffprobe FLAGs it (no audio, or no growth) | Deliver the file, mark FLAG prominently in summary.md + state.md. |
