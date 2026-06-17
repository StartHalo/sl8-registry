---
name: ai-video-generation
description: "Generate video with the ai-gen CLI — text-to-video, image-to-video, first-to-last-frame, reference-to-video, and extend — across the full fal.ai catalog (Veo, Seedance, Kling, Wan, Hailuo, Luma, and more) via the SL8 proxy. Use when the user asks to create, generate, make, or animate a video, clip, reel, short, or motion graphic, or to bring a still image to life. Triggers: make a video/clip, text-to-video, image-to-video, animate this image, reel/short, drone shot, cinematic clip, veo, seedance, kling, wan, hailuo, luma."
license: MIT
metadata:
  author: sl8
  category: media
  tags: video, generation, text-to-video, image-to-video, ai-gen, fal
  references-skills: [ai-gen]
---

# AI Video Generation

## Purpose

Generate video with `ai-gen video`. This skill covers **model choice, the video job branches,
prompt/motion craft, and parameters**; the CLI mechanics (queue lifecycle, output envelope, exit
codes, inputs) live in the **`ai-gen`** skill — load it for the contract.

**Two things are always true for video:**
1. **`-m <model>` is required** — there is no default video model (`ai-gen video "x"` alone exits 2).
   Pick one from the catalog.
2. **Video runs through the queue** (1–15 min). `ai-gen` auto-polls; or submit with `--async` and
   fetch later with `ai-gen result <request-id>`.

## Pick the job

| The user has / wants | Branch | Inputs |
|---|---|---|
| A described scene, no source image | **text-to-video** | prompt only |
| A still image to animate | **image-to-video** | `--image <path\|url>` |
| A defined start and end frame | **first-to-last-frame** | `--first-frame` + `--last-frame` |
| Several reference images (subjects/poses) | **reference-to-video** | repeatable `--ref` (`@Image1`…) |
| An existing clip to continue | **extend** | `--video <path\|url>` |

```bash
# text-to-video
ai-gen video "drone shot flying low over a misty pine forest at dawn" -m fal-ai/veo3.1/fast/text-to-video --duration 5

# image-to-video (animate a still) — describe the MOTION, not the image
ai-gen video "the toy robot slowly raises its arm and waves" -m bytedance/seedance-2.0/image-to-video --image still.png --audio on --duration 5

# first → last frame
ai-gen video "smooth transition between the two compositions" -m <model> --first-frame a.png --last-frame b.png

# reference-to-video
ai-gen video "@Image1 walks toward @Image2 in a cozy living room" -m bytedance/seedance-2.0/reference-to-video --ref a.png --ref b.png --duration 5

# extend an existing clip
ai-gen video "continue the camera push-in" -m <extend-model> --video clip.mp4 --duration 5
```

## Choose a model

Video models differ a lot in capability (i2v? reference? native audio? duration caps?) and **cost**.
Browse, then confirm:
```bash
ai-gen models --category image-to-video --format json
ai-gen models --search veo
ai-gen info fal-ai/veo3.1/fast/image-to-video     # params, duration enum, audio support, est. credits
```
See `references/model-picks.md` for the family map (Veo, Seedance, Kling, Wan, Hailuo, Luma — by
capability). A model that exits 6 was declined by the proxy → pick another.

## Estimate before you submit

Video is expensive (often 100–2000+ credits) and cost scales with resolution × duration. **Always
estimate or guard:**
```bash
ai-gen estimate bytedance/seedance-2.0/image-to-video --resolution 1080p --duration 10
ai-gen video "..." -m <id> --image a.png --max-cost 500    # aborts (exit 13) if over budget
```

## Motion & cinematography

For image-to-video, the prompt should describe the **motion and camera**, not re-describe the image.
Keep motions achievable (a pan, a gentle gesture) over complex multi-action choreography. See
`references/prompt-craft.md`. The forthcoming `cinematic-video` skill adds shot-language/lighting/
continuity grammar for directing video models.

## Parameters

```bash
ai-gen video "..." -m <id> --image a.png --duration 5 --resolution 720p --aspect-ratio 16:9 --audio on
```
- `--duration` — **string on most video families** (Veo/Seedance/Kling); `ai-gen info` shows the
  allowed values. `--resolution` (`480p`/`720p`/`1080p`), `--aspect-ratio` (`16:9`/`9:16`), `--audio
  on|off` (native audio where supported), `--seed`. Names/enums are per-model — **`ai-gen info` is
  the truth**; `--strict-params` catches typos. Details: `references/parameters.md`.

## Read the output & queue flow

A completed job returns a single video: `files[0].local_path` + `hosted_urls[0]` (URLs **expire** —
persist). For long renders, submit `--async`, keep the `request_id`, and `ai-gen result <id> -o ./out`
when done. A timeout is exit 10 (job still running) — recover with `result`. See the `ai-gen` skill's
`references/queue-lifecycle.md` and `references/json-contract.md`.

## Iterate cheap → final

1. Block the shot on a fast/low-res model + short `--duration` to lock prompt and motion.
2. Reuse the source still's `hosted_urls[0]` across attempts (don't re-upload).
3. Re-render the winner at target resolution/duration on the quality model; estimate first.

## Quality criteria

- [ ] `-m` was set from `ai-gen models`/`info`; cost was estimated or guarded with `--max-cost`.
- [ ] For i2v, the prompt describes **motion/camera**, not the image contents.
- [ ] Inputs resolved (≤ 3 MB local else a URL); `@ImageN` matched the `--ref` order; caps respected.
- [ ] Output read from `files[0].local_path` / `hosted_urls[0]`; video persisted (URLs expire).
- [ ] Queue handled: `--async` jobs fetched via `result`; timeouts (exit 10) recovered, not retried blind.
