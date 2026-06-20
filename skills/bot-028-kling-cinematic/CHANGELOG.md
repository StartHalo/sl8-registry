# Changelog — bot-028-kling-cinematic

All notable changes to this skill are documented here. Format follows Keep a Changelog;
versions track the skill's `metadata.version` in `SKILL.md`.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Added
- Initial Kling 3.0 cinematic render engine — the head-to-head sibling of
  `bot-027-seedance-cinematic`, reusing the SAME bible (`bot-027-character-bible`) and
  shot-list (`bot-027-shotlist`) skills unchanged, then rendering with a DIFFERENT engine.
- `scripts/gen-kling-cinematic.sh` — per-shot engine: for each numbered `[Xs-Ys]:` shot it
  generates a start keyframe with nano-banana-pro (the shot scene + the bible's verbatim
  character tokens; `--ref` the reference-sheet + hero; NO `--resolution`), then runs a Kling
  image-to-video call on that keyframe (`-m fal-ai/kling-video/v3/pro/image-to-video`,
  `--image` = start frame, durations snapped to 5s/10s, duration pass-through with a
  retry-without on rejection). Skips a failed shot, continues, exits non-zero only if every
  shot fails (no fabricated MP4).
- `scripts/assemble.sh` — uniform-normalize each clip (24fps, aspect canvas, h264/yuv420p),
  concat in shot order via the demuxer, ALWAYS add a quiet room-tone ambient bed (Kling clips
  are silent), and ffprobe-verify a video stream + an audio stream + a duration within ±1s of
  the summed per-shot durations. Prints a JSON verdict line.
- `references/kling-dialect.md` — the Kling 3.0 engine baked inline (no KB at runtime): the
  C3 Bind-Subject / per-shot mechanic, the E3 fight beat, the keyframe-then-i2v flow, the
  `--image` → `start_image_url` mapping, the silent-clips / room-tone rule, the consistency
  cliff (2–3 distinctive details, large in frame, avoid the darkest lighting), the
  negative-elements anchor, the ai-gen JSON contract (`files[0].local_path`), and the
  Seedance-vs-Kling architectural difference.
- `evals/evals.json` + `evals/rubric.md` — objective, regex-free evals (a render-the-cinematic
  case with materialized bible PNGs, and a missing-bible clean-failure case); a 3-dimension
  rubric (media-judge on `episode.mp4`, render-verification, summary-honesty) with weights
  summing to 1.00, `target_score 0.85`, `publish_threshold 0.80`, and the standard guardrails.

### Notes
- The per-shot Kling i2v + ffmpeg concat path is the PRIMARY path here (it is the only way to
  do Kling multi-shot in the SL8 pipeline), NOT a fallback. The room-tone bed is ALWAYS added
  and must be disclosed as an added ambient bed, NOT native audio — that honesty is the
  load-bearing difference from the Seedance sibling and is scored in the KB results-log.
