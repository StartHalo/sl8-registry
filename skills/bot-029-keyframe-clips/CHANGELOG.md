# Changelog — bot-029-keyframe-clips

All notable changes to the `bot-029-keyframe-clips` skill.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Added
- Initial release (BOT-029 phase 2, the RENDER engine). JTBD-1, render the pinned-keyframe
  journey from `keyframe-plan.md` (the K+1 pinned states + K motion prompts + aspect + Audio
  line written by phase 1) into one `episode.mp4` with **Hailuo 02 first-last-frame** control —
  each scene is pinned on a START keyframe AND an END keyframe, and Hailuo morphs start → end.
- `scripts/gen-keyframe-clips.sh` — the engine. Parses the plan (K+1 `State N:` descriptions, K
  `Motion N:` prompts, the `Character:` tokens, the `Aspect ratio:` line, the `Audio:` line).
  Generates the K+1 keyframes with `nano-banana-pro` (the FROZEN character tokens in every
  prompt, **NO `--resolution`**, `--ref state[i-1].png` chained so the SAME character carries),
  capturing BOTH `files[0].local_path` and `files[0].url` (python3; files[] are OBJECTS). Then
  for each scene runs `fal-ai/minimax/hailuo-02/standard/image-to-video` with `--image` = the
  START keyframe (local) and `end_image_url=` = the END keyframe's HOSTED url, `duration=6`,
  `--resolution 768P`. A failed scene (or a missing start-local / end-url) falls back to a
  ffmpeg still-segment built from the two boundary keyframes (hold + 1s cross-fade) so the
  journey stays K scenes long; the run exits non-zero only if EVERY scene fails. Image chain
  fallback `fal-ai/nano-banana-pro → openai/gpt-image-2 → fal-ai/nano-banana-2`. Env knobs
  `ASPECT`, `SCENE_DURATION` (6|10), `RESOLUTION` (512P|768P), `KF_MAX_COST`, `HAILUO_MAX_COST`,
  `HAILUO_MODEL`, `IMG_CHAIN`, `NO_ASSEMBLE`.
- `scripts/assemble.sh` — uniform-normalize every per-scene clip (24fps, aspect canvas,
  h264/yuv420p), concat in scene order via the demuxer, ALWAYS add a quiet brown-noise ambient
  room-tone bed (Hailuo clips are silent — the bed is added, NOT native), and ffprobe-verify (a
  video stream, an audio stream, and a duration within ±2s of the summed scene durations).
  Donor: BOT-028 `kling-cinematic/assemble.sh`.
- `references/hailuo-dialect.md` — the Hailuo 02 first-last-frame engine baked inline: the
  K+1-states / K-morphs journey model, the nano-banana-pro keyframe chain (`--ref` identity
  carry, the `files[0].url` hosted capture, NO `--resolution`), the `--image` start /
  `end_image_url` hosted-end mapping, the 6s/10s duration + 512P/768P resolution, the
  silent-clips / ambient-bed rule, the morph behaviour, the still-segment fallback, the cost note
  (`ai-gen estimate`, never `credits_used`), and the pinned slug discipline.
- `evals/evals.json` (a full keyframe-plan fixture eval graded by sampling `episode.mp4`
  keyframes — identity-across-scenes + states-executed-as-a-journey + a coherent pinned-keyframe
  journey — plus a missing-plan clean-failure eval) and `evals/rubric.md` (a media-judge dim on
  `episode.mp4` at weight 0.50 + structural ffprobe verification + summary honesty; weights sum
  to 1.00; target 0.85 / publish 0.80).
