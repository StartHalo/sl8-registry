---
name: bot-030-extend-chain
description: Render a validated continuous-plan into ONE continuous shot.mp4 with the Veo 3.1 engine — generate ONE base start frame with nano-banana-pro (the Base scene opening image; the plan FROZEN character tokens), run a Veo image-to-video base call on that frame (native audio; 8s), then for EACH hop run a Veo extend-video call on the PREVIOUS hosted url. extend-video RETURNS THE FULL grown video (base plus every extension so far), NOT a 7s segment, so there is NO concat — the final hop local file IS the finished continuous video. ffprobe-verify one file (a video stream, an audio stream, duration greater than the base) then mv to episode.mp4. This is i2v plus an extend chain with native audio and NO stitching — a DIFFERENT architecture from the Seedance single-pass sibling and the Kling per-shot concat sibling. Run as phase 2, after the continuous-plan, reading continuous-plan.md, whenever episode.mp4 is missing or a re-render is asked.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-030
  inputs:
    - name: continuous-plan
      type: markdown
      required: true
      description: artifacts/<project-name>/continuous-plan.md — the validated continuous plan (a global look header; the frozen CHARACTER tokens identity line; a Base scene opening-image prompt plus a base motion prompt; numbered hop prompts each one continuation beat; an aspect-ratio plus Audio footer). Parsed for the base frame, the base motion, the hop prompts, and the aspect ratio. Absence is a clean recorded failure; no MP4 is ever fabricated.
    - name: aspect-ratio
      type: text
      required: false
      description: Frame aspect for the base frame, the Veo base call, and every extend hop. Veo supports only 16;9 and 9;16. Default is read from the plan footer (else 16;9). Overrides the footer only when explicitly supplied.
    - name: tier
      type: text
      required: false
      description: Cost posture, economy or quality. Default economy (a 720p base; a per-call credit cap). quality raises the resolution toward 1080p. Recorded in summary.md; affects the resolution and the credit cap, not the model slug.
    - name: duration
      type: text
      required: false
      description: Target continuous length in seconds as an integer in text form. Default is the base 8s plus the planned hops (about 7s each, up to a 30s Veo ceiling). Used only to cross-check the assembled total; the real length is whatever the final extend returns.
  outputs:
    - name: episode
      type: video
      path: artifacts/<project-name>/episode.mp4
      description: The finished continuous shot — ONE Veo 3.1 image-to-video base extended by N extend-video hops, each hop returning the FULL grown video (NO concat); native audio throughout (Veo generate_audio default true). The final extend-video local file moved to episode.mp4. ffprobe-verified for a video stream, an audio stream, and a duration greater than the base.
    - name: summary
      type: markdown
      path: artifacts/<project-name>/summary.md
      description: An honest production log — the base frame model, the Veo base slug, each extend hop with its slug and its continuation beat, the final continuous duration, the native-audio note, and per-step plus total cost via ai-gen estimate. States plainly that there is NO concat (extend returns the whole video) and carries the one-line architecture note (i2v plus extend chain) scored head-to-head in the KB results-log. Records any hop shortfall truthfully.
---

# Veo continuous shot — base i2v, then extend the FULL video hop by hop

Render `artifacts/<project-name>/continuous-plan.md` into
`artifacts/<project-name>/episode.mp4` as **ONE continuous shot** with the **Veo 3.1**
engine. This is the third head-to-head sibling of the cinematic-director fleet, and it
uses a **DIFFERENT architecture** from both other siblings.

The defining fact — read it before anything else:

> **Veo's `extend-video` RETURNS THE FULL extended video — base + every extension so far —
> NOT a 7-second segment.** So this skill does **NO concat, ever**. Each hop's output is the
> whole growing video; the **FINAL hop's local file IS the finished continuous episode**.

- **Seedance (BOT-027)** carries the whole shot-list across cuts in ONE `reference-to-video`
  pass with native audio. No per-shot work, no stitching.
- **Kling (BOT-028)** renders each shot as its own image-to-video clip and **ffmpeg-concats**,
  adding a room-tone bed (Kling is silent).
- **Veo here (BOT-030)** renders ONE image-to-video **base**, then **extends** it hop by hop;
  each `extend-video` call returns the WHOLE grown video, so there is **no stitching** and the
  audio is **native** the whole way through.

This skill runs **headless**. Never ask the user anything — missing optional inputs take the
documented defaults; a missing or empty `continuous-plan.md` is a clean, recorded failure. A
hop that fails is NOT fatal — the last good extended video is kept as `episode.mp4` and the
shortfall is recorded honestly. Never fabricate an MP4 and never invent a length the chain
did not actually reach.

Read `references/veo-extend-dialect.md` before composing anything — it carries the Veo 3.1
i2v + extend recipe, the **extend-returns-the-whole-video / no-concat** rule, the
`video_url` = hosted-url mapping, the **>= 80% subject repeat** continuity anchor, the base
i2v native-audio rule, the up-to-30s ceiling, and the `files[0].url` hosted-URL capture — all
baked **inline** (the runtime sandbox has no KB).

## The render mechanic (read before writing anything)

Veo 3.1 `image-to-video` animates a **single start image** into a clip with **native audio**;
`extend-video` takes the **hosted URL** of an existing Veo video and returns the **whole video
extended**. The cross-hop continuity is therefore two things, and both are this skill's job:

1. **One base frame + one base i2v, native audio.** Compose the Base scene's opening still
   with the plan's verbatim FROZEN character tokens, generate it with nano-banana-pro
   (**no `--resolution` flag** — it is rejected and skips the primary model), then run the
   Veo base i2v on that frame (`--duration 8s`, native audio default-on). Capture the base
   clip's `files[0].local_path` **and** its `files[0].url` (the hosted URL — the first hop's
   `video_url`).
2. **One extend hop per continuation beat, chaining the hosted URL.** Each hop calls
   `extend-video` with `video_url=<previous hosted url>` and the hop's prompt; the response is
   the FULL grown video. Capture its new `files[0].local_path` (the running episode) and
   `files[0].url` (the next hop's `video_url`). Restate the character in every hop prompt
   (>= 80% subject repeat) so identity holds across the seam. NO concat — the final hop's file
   IS the episode.

## Workflow

### 1. Read before writing

Read `artifacts/<project-name>/continuous-plan.md` and `state.md`. From the plan pull the
global look header, the frozen CHARACTER-tokens identity line, the Base scene opening-image
prompt + the base motion prompt, every numbered hop prompt (each one continuation beat), and
the aspect-ratio + `Audio` footer.

**If continuous-plan.md is missing or empty**: do NOT render — record the failure in state.md
and stop. See "Failure handling".

### 2. Resolve inputs and defaults

| input | required | default when absent |
|---|---|---|
| continuous-plan.md | yes | — (clean recorded failure) |
| aspect-ratio | no | read from the plan footer (else `16:9`; Veo allows only `16:9`/`9:16`) |
| tier | no | `economy` (720p base; `quality` raises toward 1080p + the cap) |
| duration | no | base 8s + the planned hops (cross-check only; the real length is what the final extend returns) |

Every default applied and every assumption made gets a bullet in `summary.md`.

### 3. Render — `scripts/gen-extend-chain.sh`

This script is the engine. It parses the plan, then:

1. **Generates ONE base start frame** with nano-banana-pro — the look header + the Base scene
   opening + the frozen character tokens + a "no text, no watermark" tail; `--aspect-ratio
   <AR>`, **NO `--resolution`** (the image chain rejects it). Parses `files[0].local_path`.
2. **Runs the Veo base i2v** on that frame —
   `ai-gen video "<base motion>" -m fal-ai/veo3.1/image-to-video --image <base.png>
   --duration 8s --resolution 720p --aspect-ratio <AR> --max-cost 700 --format json`. Native
   audio (default-on). Captures `files[0].local_path` (the base clip) AND `files[0].url` (the
   hosted URL for the first hop).
3. **For EACH hop, runs Veo extend** on the PREVIOUS hosted URL —
   `ai-gen run fal-ai/veo3.1/extend-video video_url="<prev url>" prompt="<hop prompt>"
   --duration 7s --max-cost 700 --format json`. The response is the FULL grown video. Captures
   the new `files[0].local_path` (the running episode) AND `files[0].url` (the next hop's
   `video_url`). **NO concat.**

Run it from the skill directory:

```bash
ASPECT=<AR> TIER=<economy|quality> \
  bash <skill-dir>/scripts/gen-extend-chain.sh \
  artifacts/<project-name>/continuous-plan.md \
  artifacts/<project-name>
```

It writes the base frame, the base clip, and each grown full-video under
`artifacts/<project-name>/work/`, and prints ONE machine-readable JSON line with the base
duration, the final duration, the hops done, and the verdict. The FINAL extended video is
copied to `episode.mp4`. If a hop fails, the last good extended video is kept as the episode
and the shortfall is recorded; the base render failing (no base frame or no base clip) is the
only non-zero exit (a clean recorded failure, no MP4).

### 4. ffprobe-verify (one file — there is no concat to verify)

The script records the ffprobe verdict on the single final file; confirm it before writing the
summary:

- a **video stream** is present;
- an **audio stream** is present (Veo's **native** audio — NOT an added bed);
- the format **duration** is **greater than the base** (every successful extend grows the
  whole video; if all hops failed, the base is delivered as a FLAG, not a PASS).

A missing audio stream or a video that did not grow is a FLAG, reported prominently in
`summary.md`. There is **no concat and no summed-duration target** here — the episode is a
single file the model returned whole.

### 5. Write `summary.md` (honest production log)

Write `artifacts/<project-name>/summary.md` recording, truthfully:

- **base**: the base-frame model (nano-banana-pro, or the image-chain fallback that produced
  it), the base-frame file, the Veo base slug (`fal-ai/veo3.1/image-to-video`), the base
  duration, and that the base carries **native audio**;
- **each hop**: the extend slug (`fal-ai/veo3.1/extend-video`), the continuation beat (the
  hop prompt / slug), and the running full-video duration after that hop — plus any hop that
  failed (which one, why) and the shortfall it caused;
- **assembly**: state plainly **there is NO concat — extend-video returns the WHOLE grown
  video each hop**; the final continuous duration is what the last extend returned;
- **audio**: **native Veo audio throughout** (NOT an added room-tone bed — that is the Kling
  sibling);
- **cost**: per-step (the base frame image + the base i2v + each extend) and total via
  `ai-gen estimate`, and the `ai-gen balance` delta if available — **never** the JSON
  `credits_used` field (it over-reports);
- the **one-line architecture note**, verbatim:
  `One continuous Veo 3.1 shot — an image-to-video base extended by N extend-video hops, each hop returning the FULL grown video (NO concat); native audio throughout. A different architecture from Seedance's single-pass reference-to-video and Kling's per-shot i2v + ffmpeg concat; scored head-to-head in the KB results-log.`

### 6. Update the ledger

`state.md` is how phases chain — never leave it stale (see "Ledger updates").

## Failure handling (headless)

| situation | action |
|---|---|
| continuous-plan.md missing or empty | Phase cannot run — mark the phase row `blocked`, project `status: blocked`, blocker `render blocked; no continuous-plan.md — run phase 1 (bot-030 continuous-plan) first`. Produce no MP4. Stop. |
| base start frame fails (all 3 image models) | No base — the script exits non-zero; mark the phase `blocked` with the captured errors quoted; produce no MP4. Stop. |
| Veo base i2v fails | No base clip — the script exits non-zero; mark `blocked`; produce no MP4. Stop. |
| Veo base i2v returns no hosted URL | Cannot extend (extend needs `video_url`) — deliver the 8s base as the continuous shot, verdict FLAG, record the shortfall (no hosted URL to chain from). |
| one hop fails / returns no file / does not grow the video | Stop the chain, keep the LAST GOOD extended video as `episode.mp4`, verdict FLAG, record the exact shortfall (which hop, why). Never fabricate the missing length. |
| episode produced but ffprobe FLAGs it (no audio, or no growth) | Deliver the file, mark the run `done` with a prominent FLAG in `summary.md` and a decisions-log note; do NOT silently pass it as clean. |

A clean recorded failure is a correct outcome; a silent or invented one is not.

## Outputs

This phase writes exactly two artifacts (plus intermediates under `work/`):

- `artifacts/<project-name>/episode.mp4` — the finished continuous shot — ONE Veo 3.1
  image-to-video base extended by N extend-video hops, each hop returning the FULL grown video
  (NO concat), native audio throughout. ffprobe-verified for a video stream, an audio stream,
  and a duration greater than the base.
- `artifacts/<project-name>/summary.md` — the honest production log — the base frame model +
  the Veo base slug, each extend hop + its beat, the final continuous duration, the
  native-audio note, the NO-concat note, per-step + total cost via `ai-gen estimate`, the
  architecture note, and any hop shortfall.

No other deliverables. The continuous-plan belongs to phase 1.

## Ledger updates

After the episode is delivered, update `artifacts/<project-name>/state.md`:

- Mark this phase row (`render`) `done`; if it is the last phase, set project `status: complete`.
- Refresh `updated:` to today.
- Rewrite `next_action:` to the imperative for what follows (e.g. review the episode, or — if a
  FLAG was raised — re-run from the last good hosted URL).
- Append a Decisions-log line recording the engine (Veo 3.1 i2v + extend chain, NO concat), the
  native audio, the final duration, the cost basis, and any hop shortfall or FLAG.

On failure, write the `blocked` shape from "Failure handling" instead — a clean recorded
failure is a correct outcome; a silent or invented one is not.

## References

- `references/veo-extend-dialect.md` — the Veo 3.1 engine baked inline (no KB at runtime): the
  base-frame chain, the `image-to-video` base call (native audio, `--image` → `image_url`,
  durations `4s/6s/8s`), the `extend-video` hop (`video_url` = the PREVIOUS hosted URL,
  extend-returns-the-WHOLE-video / NO concat, up to 30s), the >= 80% subject-repeat continuity
  anchor, the `files[0].local_path` + `files[0].url` JSON contract, and the
  Seedance-vs-Kling-vs-Veo architecture table. Load before composing the base or hop prompts.
- `scripts/gen-extend-chain.sh` — base frame (nano-banana-pro) → Veo base i2v → extend chain →
  ffprobe verify → episode.mp4. No concat.
