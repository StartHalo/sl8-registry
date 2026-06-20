---
name: bot-029-keyframe-clips
description: Render a pinned-keyframe journey into one episode.mp4 with Hailuo 02 first-last-frame control. Phase 2 (the RENDER engine); phase 1 wrote keyframe-plan.md with K+1 pinned states, K motion prompts, an aspect ratio, and an Audio line. For each state 0..K, generate a keyframe with nano-banana-pro carrying the FROZEN character tokens and chaining --ref state[i-1] so the SAME character carries; capture both the local png AND its hosted url. For each scene i, run Hailuo image-to-video that MORPHS state[i] into state[i+1] — --image is the start, end_image_url is the hosted url of the end keyframe — so START and END are both pinned. A failed scene falls back to a still segment from the two keyframes (never dropped); exit non-zero only if every scene fails. Then uniform-normalize, concat, ALWAYS add an ambient bed (Hailuo is silent), and ffprobe-verify. Run whenever episode.mp4 is missing or a re-render is asked; reads keyframe-plan.md.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-029
  inputs:
    - name: keyframe-plan
      type: markdown
      required: true
      description: artifacts/<project-name>/keyframe-plan.md — the pinned-keyframe plan from phase 1. Carries a look header; a Character line (the FROZEN identity tokens); an Aspect ratio line; K+1 numbered pinned states (State 0..K, each a still description); K motion prompts (Motion 0..K-1, the camera and action between consecutive states); and an Audio line. Parsed for the states, the motion prompts, the aspect ratio, the character tokens, and the Audio line. Absence is a clean recorded failure; no MP4 is ever fabricated.
    - name: aspect-ratio
      type: text
      required: false
      description: Frame aspect for the keyframes, the Hailuo calls, and the normalize canvas. Default is read from the plan Aspect line; common values are 16:9, 9:16, 1:1. Overrides the plan only when explicitly supplied.
  outputs:
    - name: episode
      type: video
      path: artifacts/<project-name>/episode.mp4
      description: The assembled pinned-keyframe journey — per-scene Hailuo first-last-frame clips, each morphing one nano-banana-pro keyframe into the next (start AND end pinned), uniform-normalized at 24fps on the aspect canvas with h264 and yuv420p, concatenated in scene order, with a subtle added ambient room-tone bed (NOT native audio). ffprobe-verified for a video stream, an audio stream, and a duration near the sum of scene durations.
    - name: summary
      type: markdown
      path: artifacts/<project-name>/summary.md
      description: An honest production log — per-scene keyframe pair plus the Hailuo slug; the added ambient bed stated plainly as non-native; per-scene and total cost via ai-gen estimate; any still-segment fallback that stood in for a failed scene; and the note that this is precise first-last-frame control with a pinned START and a pinned END per scene.
---

# Keyframe clips — render the pinned-keyframe journey with Hailuo first-last-frame

Render `artifacts/<project-name>/keyframe-plan.md` into `artifacts/<project-name>/episode.mp4`
with the **Hailuo 02** first-last-frame engine. This is BOT-029 **phase 2** — the RENDER engine.
Phase 1 wrote the plan; this phase turns it into video.

The whole point of this engine is **precise first-last-frame control**: each scene's clip is
PINNED on BOTH ends — a START keyframe AND an END keyframe — and Hailuo **morphs start → end**.
You are not hoping the model lands the ending; you hand it the ending. That is what separates
BOT-029 from its fleet siblings:

- **Seedance (BOT-027)** carries the whole shot-list in ONE pass with native audio.
- **Kling (BOT-028)** renders N per-shot keyframe-then-i2v clips and concats, with a room-tone bed.
- **Hailuo here (BOT-029)** pins EVERY scene boundary on both sides and morphs between them — a
  chain of K+1 controlled states, K morphs.

Hailuo clips are **silent**, so an ambient bed is added at assembly. Never present that bed as
native audio — disclose it honestly in `summary.md`.

This skill runs **headless**. Never ask the user anything: a missing optional input takes the
documented default; a missing or empty `keyframe-plan.md` is a clean, recorded failure (no MP4).

Read `references/hailuo-dialect.md` before composing anything — it carries the keyframe-chain
identity lock, the `--image` start / `end_image_url` hosted-end mapping, the silent-clips /
ambient-bed rule, the morph behaviour, the `files[0].url` capture, the 6s/10s duration and 768P
resolution, and the still-segment fallback, all baked **inline** (the runtime sandbox has no KB).

## The render mechanic (read before writing anything)

The plan defines **K+1 pinned states** (state 0 … state K) and **K motion prompts**. Scene `i`
morphs **state[i] → state[i+1]**. Two things make the journey hold together, and both are this
skill's job:

1. **K+1 keyframes, character chained.** Generate each state's keyframe with nano-banana-pro from
   the FROZEN CHARACTER tokens (quoted verbatim from the plan's `Character:` line), and for every
   state `i > 0` pass `--ref state[i-1].png` so the SAME character carries forward. Capture BOTH
   the local png (the START upload) AND the hosted url (the END-frame contract). **No
   `--resolution`** on the image call — nano-banana-pro rejects it and skips the primary.
2. **K Hailuo morphs, then stitch.** For each scene, run Hailuo i2v with `--image` = the START
   keyframe (local) and `end_image_url=` = the END keyframe's HOSTED url. Hailuo morphs start →
   end. Normalize every clip, concat in scene order, and add an ambient bed (the clips are silent).

## Workflow

### 1. Read before writing

Read `artifacts/<project-name>/keyframe-plan.md` and `state.md`. From the plan pull: the look
header, the `Character:` line (the FROZEN identity tokens), the `Aspect ratio:` line, every
numbered `State N:` description (state 0 … state K), every `Motion N:` prompt (motion 0 … K-1),
and the `Audio:` line (the ambient bed source).

**If keyframe-plan.md is missing or empty**: do NOT render — record the failure in state.md and
stop. **If fewer than 2 states parse** (no state 0 + state 1): the plan is malformed — record the
failure and stop. Never fabricate an MP4.

### 2. Resolve inputs and defaults

| input | required | default when absent |
|---|---|---|
| keyframe-plan.md | yes | — (clean recorded failure) |
| aspect-ratio | no | read from the plan `Aspect ratio:` line (else `16:9`) |
| scene-duration | no | `6` (Hailuo takes 6s or 10s reliably) |
| resolution | no | `768P` (`512P` to trim cost) |

Every default applied and every assumption made gets a bullet in `summary.md`.

### 3. Render — `scripts/gen-keyframe-clips.sh`

This script is the engine. It parses the plan, then:

1. **Generates the K+1 keyframes** with nano-banana-pro — the look header + the state description
   + the FROZEN character tokens + a "no text, no watermark" tail, `--aspect-ratio <AR>`, **NO
   `--resolution`**, and `--ref state[i-1].png` for every state after the first. It captures BOTH
   `files[0].local_path` and `files[0].url` (python3; files[] are OBJECTS). Chain fallback
   `fal-ai/nano-banana-pro → openai/gpt-image-2 → fal-ai/nano-banana-2`.
2. **Renders each scene** with Hailuo first-last:

   ```bash
   ai-gen video "<motion prompt i>" \
     -m fal-ai/minimax/hailuo-02/standard/image-to-video \
     --image "<state[i] local png>" \
     "end_image_url=<state[i+1] HOSTED url>" \
     "duration=6" --resolution 768P --max-cost 200 --format json
   ```

   `--image` uploads the START; `end_image_url=` MUST be the END keyframe's HOSTED url — Hailuo
   morphs start → end. Parse `files[0].local_path`. A scene whose Hailuo call fails (or whose
   start-local / end-url is missing) gets a **still-segment fallback** built from the two boundary
   keyframes via ffmpeg (so the journey stays K scenes long), recorded. If EVERY scene fails (no
   clip and no still at any boundary), the script exits non-zero and writes no episode.

Run it from the skill directory:

```bash
ASPECT=<AR> SCENE_DURATION=<6|10> RESOLUTION=<512P|768P> \
  bash <skill-dir>/scripts/gen-keyframe-clips.sh \
  artifacts/<project-name>/keyframe-plan.md \
  artifacts/<project-name>
```

It writes the keyframes under `artifacts/<project-name>/keyframes/`, the per-scene clips under
`artifacts/<project-name>/work-scenes/`, and prints a machine-readable JSON line naming the
scenes produced (`generated` Hailuo morphs + `stills` fallbacks). Then, unless `NO_ASSEMBLE=1`,
it execs `assemble.sh`.

### 4. Assemble — `scripts/assemble.sh`

Normalize each per-scene clip to a uniform layout (24fps, the aspect canvas, h264/yuv420p),
concat them in scene order via the demuxer, and add the ambient bed:

```bash
ASPECT=<AR> AUDIO_DESC="<the plan Audio: line>" \
  bash <skill-dir>/scripts/assemble.sh artifacts/<project-name>
```

- Hailuo clips are SILENT, so the bed is **always added**. The bed is a quiet ffmpeg ambience
  derived from the plan `Audio:` line — `anoisesrc` brown-noise at a low volume (a "room tone").
  It is an **added ambient bed, NOT native audio** — state that plainly in `summary.md`.
- Writes `artifacts/<project-name>/episode.mp4` and prints a JSON verdict line (file, duration,
  scenes, audio=roomtone, verdict).

`gen-keyframe-clips.sh` may call `assemble.sh` itself at the end (one combined run), or you run
them in two steps — both are supported; the scripts are idempotent on a clean `work-scenes/`.

### 5. ffprobe-verify

The assemble step records the ffprobe verdict; confirm it before writing the summary:

- a **video stream** is present;
- an **audio stream** is present (the ambient bed);
- the format **duration** is within **±2s** of the **sum of the per-scene durations**.

A missing video stream or a wildly-off duration is a FLAG, reported prominently in `summary.md`.
A small wobble inside ±2s passes. Never discard a usable episode over a sub-second wobble —
deliver and flag.

### 6. Write `summary.md` (honest production log)

Write `artifacts/<project-name>/summary.md` recording, truthfully:

- **per scene**: the START and END keyframe pair (the two state pngs), the keyframe model
  (nano-banana-pro, or the chain fallback that produced it), the Hailuo slug
  (`fal-ai/minimax/hailuo-02/standard/image-to-video`), the scene duration, and whether the scene
  rendered as a Hailuo morph or fell back to a still segment (and why);
- **assembly**: the uniform-normalize parameters, the concat, and the **ambient bed — explicitly
  "an added ambient ambience derived from the Audio: line, NOT native Hailuo audio"**;
- **verification**: the ffprobe verdict (video stream, audio stream, duration vs the summed
  target), with any FLAG called out;
- **cost**: per-scene and total via `ai-gen estimate` (the keyframe image cost + the Hailuo i2v
  cost per scene; K+1 keyframes, not 2K), and the `ai-gen balance` delta if available — **never**
  the JSON `credits_used` field (it over-reports);
- the **one-line architecture note**, verbatim:
  `Precise first-last-frame control — a pinned START AND a pinned END per scene, morphed by Hailuo 02; scored head-to-head in the KB results-log.`

### 7. Update the ledger

`state.md` is how phases chain — never leave it stale (see "Ledger updates").

## Failure handling (headless)

| situation | action |
|---|---|
| keyframe-plan.md missing or empty | Phase cannot run — mark the phase row `blocked`, project `status` `blocked`, blocker `render blocked; no keyframe-plan.md — run phase 1 first`. Produce no MP4. Stop. |
| fewer than 2 states parse from the plan | The plan is malformed — mark `blocked`, blocker `render blocked; fewer than 2 pinned states in keyframe-plan.md — re-run phase 1`. Stop. |
| one scene's Hailuo call fails, OR its start-local / end-url is missing | Build a still-segment fallback from the two boundary keyframes (hold + cross-fade), record it, continue. The journey stays K scenes long. |
| a scene has no keyframe at either boundary | That scene is dropped (recorded). The run continues with the scenes that have at least one boundary keyframe. |
| EVERY scene fails (no Hailuo clip and no still fallback anywhere) | No usable episode — the script exits non-zero; mark the phase `blocked` with the captured errors quoted; produce no MP4. Stop. |
| episode produced but ffprobe FLAGs it (no video / duration far off) | Deliver the file, mark the run `done` with a prominent FLAG in `summary.md` and a decisions-log note; do NOT silently pass it as clean. |

A clean recorded failure is a correct outcome; a silent or invented one is not.

## Outputs

This phase writes exactly two artifacts (plus per-state keyframes under `keyframes/` and per-scene
clips under `work-scenes/`):

- `artifacts/<project-name>/episode.mp4` — the assembled pinned-keyframe journey: per-scene Hailuo
  first-last-frame clips, each morphing one nano-banana-pro keyframe into the next (start AND end
  pinned), uniform-normalized (24fps, aspect canvas, h264/yuv420p), concatenated in scene order,
  with a subtle **added** ambient room-tone bed (NOT native audio). ffprobe-verified for a video
  stream, an audio stream, and a duration near the sum of scene durations.
- `artifacts/<project-name>/summary.md` — the honest production log: per-scene keyframe pair +
  Hailuo slug, the concat, the ambient bed (stated as an added bed, NOT native), the ffprobe
  verdict, per-scene + total cost via `ai-gen estimate`, any still-segment fallback, and the
  one-line note that this is precise first-last-frame control (pinned START AND END per scene).

No other deliverables. The keyframe plan belongs to phase 1.

## Ledger updates

After the episode is delivered, update `artifacts/<project-name>/state.md`:

- Mark this phase row (`render`) `done`; if it is the last phase, set project `status` `complete`.
- Refresh `updated` to today.
- Rewrite `next_action` to the imperative for what follows (e.g. review the episode, or — if a
  FLAG was raised — re-render the flagged scene).
- Append a Decisions-log line recording the engine (Hailuo first-last-frame morph + concat), the
  ambient bed, the cost basis, and any still-segment fallback or FLAG.

On failure, write the `blocked` shape from "Failure handling" instead — a clean recorded failure
is a correct outcome; a silent or invented one is not.

## References

- `references/hailuo-dialect.md` — the Hailuo 02 engine baked inline: the K+1-states / K-morphs
  journey model, the nano-banana-pro keyframe chain (`--ref` identity carry, the `files[0].url`
  hosted capture, NO `--resolution`), the `--image` start / `end_image_url` hosted-end mapping,
  the 6s/10s duration + 768P resolution, the silent-clips / ambient-bed rule, the still-segment
  fallback, the cost note (`ai-gen estimate`, never `credits_used`), and the slug discipline.
  Load before composing keyframes or motion prompts.
- `scripts/gen-keyframe-clips.sh` — the K+1 keyframes (nano-banana-pro chain) + K Hailuo
  first-last morphs engine, with the still-segment skip-and-continue fallback.
- `scripts/assemble.sh` — uniform-normalize → concat → ambient bed → ffprobe verify.
