# Changelog — bot-027-seedance-cinematic

All notable changes to the `bot-027-seedance-cinematic` skill.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Added
- Initial release (BOT-027 Full Build). JTBD-3, phase 3 (render): read the cinematic
  `shotlist.md` + the character bible (`reference-sheet.png` + `hero.png`) and render the
  WHOLE multi-scene cinematic in ONE Seedance 2.0 `reference-to-video` call — the bible
  images go in as `--ref` (`@Image1` turnaround, `@Image2` hero), the time-coded shots
  become the prompt body, native score + SFX + ambience are generated in the same pass — then
  ffmpeg-normalize + ffprobe-verify and write an honest `summary.md`. The headline mechanic
  is the PROVEN Step-0 multi-shot PoC path (2026-06-20, 8.8/10).
- `scripts/gen-cinematic.sh` — the single-call render. Issues
  `bytedance/seedance-2.0/<fast|standard>/reference-to-video` with both bible images as
  `--ref`, parses `files[0].local_path` (python3, files[] are OBJECTS), normalizes to 24fps /
  the planned canvas / H.264+AAC / `+faststart`, and ffprobe-verifies (duration ±1s of target
  + a video AND a native audio stream). Prints `model<TAB>path<TAB>url`; non-zero exit ⇒ the
  caller runs the fallback. Env: `DURATION`, `ASPECT`, `TIER`, `RESOLUTION`, `AUDIO`,
  `MAX_COST` (default cap ~1200 cr fast / ~3000 cr standard).
- `scripts/per-shot-fallback.sh` — the documented fallback ONLY (single call errored or
  failed verify). Splits the shot-list into `[Xs-Ys]:` shots, generates one
  `bytedance/seedance-2.0/fast/image-to-video` clip per shot (start frame = `hero.png`),
  normalizes + concats in shot order, adds a quiet room-tone bed only when a shot lacks native
  audio, ffprobe-verifies. Donor: BOT-013 `clip-assembly` (`gen-clip.sh` + `assemble.sh`).
- `references/seedance-dialect.md` — the reference-to-video mechanics baked inline
  (`--ref`→`image_urls`, `@ImageN` addressing, `generate_audio` default-on, the
  duration/resolution envelope, the PROVEN multi-shot prompt template + the verbatim PoC
  example), the per-shot+concat assembly recipes, the cost note (`ai-gen estimate`, never
  `credits_used`), and failure triage.
- `evals/evals.json` (a full shot-list + bible-image fixture eval graded by sampling
  episode.mp4 keyframes — identity-across-shots + shot-list-executed + a coherent multi-scene
  cinematic — plus a missing-bible clean-failure eval) and `evals/rubric.md` (a media-judge
  dim on `episode.mp4` at weight 0.50 + structural ffprobe verification + summary honesty;
  weights sum to 1.00; target 0.85 / publish 0.80).
