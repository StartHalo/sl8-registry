# Hailuo 02 first-last-frame dialect — the render engine, baked inline

Per-model mechanics for the **pinned-keyframe** render, the keyframe-chain identity lock, the
silent-clips / ambient-bed rule, and failure triage. Baked **inline** here because the runtime
sandbox has **no KB access** — this file IS the source of truth at runtime. The render+assembly
donors are BOT-027 `character-bible` (`gen-image.sh` — the nano-banana-pro chain + hosted-url
capture) and BOT-028 `kling-cinematic` (`gen-kling-cinematic.sh` per-scene walk + `assemble.sh`
normalize → concat → room-tone → ffprobe).

## What makes BOT-029 different (load-bearing for the fleet)

> **Seedance (BOT-027)** does the whole shot-list in ONE `reference-to-video` pass with native
> audio. **Kling (BOT-028)** does N image-to-video calls from per-shot keyframes + concat, with
> a room-tone bed. **Hailuo here (BOT-029)** is the **precise first-last-frame** engine: each
> scene's clip is PINNED on BOTH ends — a START keyframe AND an END keyframe — and Hailuo
> **morphs start → end**. So the journey is a chain of pinned states, and the camera/motion of
> each scene is exactly the interpolation between two frames you control.

That is the headline: **pinned start AND end per scene**. You are not hoping the model lands the
ending — you hand it the ending. The trade is that Hailuo clips are **silent** (an ambient bed is
added at assembly) and the per-scene transition is a morph, not a free-running shot. Disclose this
honestly in `summary.md`; never present the ambient bed as native audio.

## The journey model — K+1 states, K scenes

The phase-1 `keyframe-plan.md` defines **K+1 pinned states** (state 0 … state K) and **K motion
prompts** (one per scene). Scene `i` morphs **state[i] → state[i+1]**. With 4 states you get 3
scenes; with 6 states, 5 scenes. The episode length ≈ `K × SCENE_DURATION` (default `K × 6s`).

## The engine — per state a keyframe, per scene a morph

### (1) The keyframes — nano-banana-pro (image), chained for identity

Generate ALL K+1 keyframes first. The identity lock is two-fold:
- the **FROZEN CHARACTER tokens** (quoted from the plan `Character:` line — never paraphrase a
  locked token; "emerald eyes" stays "emerald eyes") pasted into every keyframe prompt, AND
- **`--ref <state[i-1] local png>`** for every state `i > 0`, so the SAME character literally
  carries forward from the previous keyframe. State 0 has no ref (it establishes the character).

```bash
# state 0 (no ref — establishes the character)
ai-gen image "<look header> A single still keyframe: <state 0 description>. The subject is <FROZEN CHARACTER tokens>, large in frame, clearly lit. No text, no watermark, no logo." \
  -m fal-ai/nano-banana-pro --aspect-ratio <16:9|9:16|1:1> --max-cost 80 --format json

# state i>0 (ref = the PREVIOUS state's local png)
ai-gen image "<...state i description...>" \
  -m fal-ai/nano-banana-pro --aspect-ratio <AR> \
  --ref <state[i-1].png> --max-cost 80 --format json
```

- **NO `--resolution` flag.** nano-banana-pro REJECTS `--resolution` as an unknown option (exit
  non-zero) and the whole image chain falls through, skipping the primary on every run. Proven on
  BOT-016/027. Render at the model default; pass only `--aspect-ratio` (+ `--ref`).
- **Capture BOTH** `files[0].local_path` (the on-disk png — the START upload for Hailuo) **AND**
  `files[0].url` (the HOSTED url — the END-FRAME contract for Hailuo). files[] entries are
  **OBJECTS** — parse with python3, never regex the blob. If `files[0].url` is absent, fall back
  to `hosted_urls[0]`, then walk for the first `*.fal.media` string.
- **Chain fallback:** `fal-ai/nano-banana-pro → openai/gpt-image-2 → fal-ai/nano-banana-2` — all
  three are reference-capable + aspect-ratio-capable, so the chain identity lock survives a
  fallback.
- A keyframe that produces a file but **no hosted url** can still be a scene's START (uploaded via
  `--image`) but **cannot be an END frame**. Record it; the per-scene logic falls back to a still
  segment when a scene's END frame has no url.

### (2) The morph — Hailuo 02 image-to-video (video)

```bash
ai-gen video "<motion prompt i>" \
  -m fal-ai/minimax/hailuo-02/standard/image-to-video \
  --image "<state[i] local png>" \
  "end_image_url=<state[i+1] HOSTED url>" \
  "duration=6" --resolution 768P --max-cost 200 --format json
```

- **`--image` = the START keyframe** (uploaded; a local path is fine — ai-gen uploads it). Hailuo
  treats it as the first frame.
- **`end_image_url=` MUST be the HOSTED url of the END keyframe** (`state[i+1]`). This is the
  whole point of first-last control — the clip MORPHS start → end. A local path will NOT work
  here; it must be the hosted url captured from the END keyframe's generation. Pass it as a
  `key=value` params pass-through (a positional `end_image_url=...` arg), NOT a `--flag`.
- **Slug:** `fal-ai/minimax/hailuo-02/standard/image-to-video` (the `standard` tier). The `pro`
  tier swaps `/standard/` for `/pro/` at a higher cost.
- **Duration:** Hailuo 02 takes **6s or 10s** reliably. Pass it as `duration=6` (or `duration=10`)
  in the params pass-through. If the model rejects the pass-through, retry WITHOUT it (the clip
  runs at the model default — disclose in summary.md).
- **Resolution:** `--resolution 768P` (or `512P` to trim cost). Hailuo DOES accept a resolution
  token here (unlike nano-banana-pro on the image side — do not confuse the two).
- **NO native audio.** Hailuo i2v clips come back **SILENT**. Do NOT expect a score. Audio is
  added at assembly (ambient/room-tone bed).
- **`motion prompt` shape:** describe the MOTION between the two pinned frames — the camera move +
  the subject action that carries state[i] into state[i+1]. Keep it to one camera move + one
  action; keep the subject large in frame; avoid the very darkest lighting. The two keyframes
  already fix the look — the motion prompt only steers the interpolation.
- JSON: the clip is `files[0].local_path` (same OBJECT parse as the image).

## Skip-and-continue (precise control degrades gracefully, never silently)

A scene whose Hailuo morph fails — or whose START local / END hosted url is missing — is **NOT
dropped from the timeline**. We build a **still-segment fallback** from the two boundary
keyframes via ffmpeg so the journey stays K scenes long:
- **both keyframes present** → a `SCENE_DURATION`-second segment that holds state[i], then
  cross-fades (xfade 1s) to state[i+1] — a static "morph stand-in".
- **only one keyframe present** → hold that single still for `SCENE_DURATION` seconds.
- **neither present** → the scene is dropped (recorded).

The run exits non-zero **only if EVERY scene fails** (no Hailuo clip and no still fallback at any
boundary) — a clean recorded failure, never a fabricated MP4. Every still-segment fallback is
disclosed per-scene in `summary.md`.

## Assembly — uniform-normalize → concat → ambient bed (ALWAYS)

Donor: BOT-028 `assemble.sh`.

1. **Normalize every clip to a uniform layout BEFORE concat** (mixed fps/size/SAR/codec is the #1
   concat failure):
   `fps=24,scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p`,
   re-encode `libx264 -crf 20`. Canvas by aspect: `16:9 → 1280x720`, `9:16 → 720x1280`,
   `1:1 → 720x720`. Hailuo clips (and still segments) are silent → attach a silent stereo track
   per clip so every segment has an identical A/V layout for the demuxer.
2. **Concat in scene order** via the demuxer (`-f concat -safe 0 -c copy`); on an edge-case
   stream-copy failure, re-encode the concatenation (slower, always works).
3. **Ambient/room-tone bed — ALWAYS added** (Hailuo clips are silent; there is no native audio to
   double up). Derive a quiet ambience from the plan `Audio:` line: a low brown-noise room tone is
   the safe default — `[1:a]volume=-38dB,pan=stereo|c0=c0|c1=c0[rt]` mixed under the (silent)
   episode track. It is an **added ambient bed, NOT native Hailuo audio** — say so in summary.md.
4. **ffprobe verify:** a video stream present, an audio stream present (the room tone), and the
   format duration within **±2s** of the **sum of the per-scene durations** (the wider tolerance
   absorbs per-clip rounding across many short scenes).

## Cost

- Per scene = the START keyframe image cost (nano-banana-pro) + the Hailuo i2v cost. (The END
  keyframe of scene `i` is the START keyframe of scene `i+1`, so K+1 keyframes total, not 2K.)
  Use `ai-gen estimate` for each, and `ai-gen balance` deltas to confirm — **never** the JSON
  `credits_used` field (it over-reports ~8× on i2v). 1 credit ≈ $0.004.
- A failed generation is not charged, but a needless re-render is — prefer fixing the composed
  prompt over re-rendering. Drop `--resolution` to `512P` or the Hailuo tier to `standard` (the
  default) to trim cost while iterating.

## Slug discipline (pinned 2026-06-20 — re-confirm at build via the reachability gate)

| role | slug | notes |
|---|---|---|
| keyframe (image) | `fal-ai/nano-banana-pro` | NO `--resolution`; `--ref` + `--aspect-ratio` only; capture local_path AND url; chain → `openai/gpt-image-2` → `fal-ai/nano-banana-2` |
| render (video) | `fal-ai/minimax/hailuo-02/standard/image-to-video` | `--image` = START (local ok); `end_image_url=<HOSTED url>` = END (params pass-through, not a flag); silent; 6s/10s; `--resolution 512P|768P`; `/pro/` for the costlier tier |

Confirm reachability with a `-m <slug>` pass-through at build (the reachability gate). A model
that rejects an arg falls THROUGH to the next model in the chain — recorded, never improvised
around.
