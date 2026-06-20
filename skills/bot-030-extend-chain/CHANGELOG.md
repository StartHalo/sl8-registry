# Changelog — bot-030-extend-chain

All notable changes to this skill are documented here. Format follows Keep a Changelog;
versions track the skill's `metadata.version` in `SKILL.md`.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Added
- Initial Veo 3.1 continuous-shot RENDER engine — the third head-to-head sibling of the
  cinematic-director fleet (`bot-027-seedance-cinematic`, `bot-028-kling-cinematic`),
  consuming a phase-1 `continuous-plan.md` and rendering ONE continuous shot with a DIFFERENT
  architecture.
- `scripts/gen-extend-chain.sh` — the engine: generate ONE base start frame with
  nano-banana-pro (the Base scene opening image + the plan's frozen character tokens; NO
  `--resolution`), run a Veo `image-to-video` base call on that frame (native audio, 8s),
  capture `files[0].local_path` AND `files[0].url`, then for EACH hop run a Veo `extend-video`
  call on the PREVIOUS hosted url. extend-video RETURNS THE FULL grown video (base + all
  extensions so far), NOT a 7s segment — so there is NO concat; the final hop's local file IS
  the episode. ffprobe-verify one file (a video stream, an audio stream, duration greater than
  the base) → `episode.mp4`. A hop that fails keeps the last good extended video as the episode
  and records the shortfall (never fabricated); only a failed base render exits non-zero.
- `references/veo-extend-dialect.md` — the Veo 3.1 engine baked inline (no KB at runtime): the
  base-frame chain, the `image-to-video` base call (native audio, `--image` → `image_url`,
  `4s/6s/8s`), the `extend-video` hop (`video_url` = the PREVIOUS hosted url,
  extend-returns-the-WHOLE-video / NO concat, up to 30s), the `>= 80%` subject-repeat continuity
  anchor, the `files[0].local_path` + `files[0].url` JSON contract, and the
  Seedance-vs-Kling-vs-Veo architecture table.
- `evals/evals.json` + `evals/rubric.md` — objective, regex-free evals (a render case with a
  materialized `continuous-plan.md`, and a missing-plan clean-failure case); a 3-dimension
  rubric (media-judge on `episode.mp4`, render-verification, summary-honesty) with weights
  summing to 1.00, `target_score 0.85`, `publish_threshold 0.80`, and the standard guardrails.

### Notes
- The defining mechanic is that Veo `extend-video` returns the WHOLE grown video each hop, so
  there is NO concat — and the audio is NATIVE Veo audio (generate_audio default-on), NOT an
  added room-tone bed (that is the Kling sibling). Those two facts are the load-bearing honesty
  difference from the siblings and are scored in the KB results-log.
