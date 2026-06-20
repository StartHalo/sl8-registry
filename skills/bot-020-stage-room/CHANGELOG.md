# Changelog — bot-020-stage-room

All notable changes to this skill. Versions are git tags (`bot-020-stage-room/vX.Y.Z`); no `version:` in frontmatter.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.1] — 2026-06-20
### Fixed
- Fix `scripts/gen-edit.sh`: omit `--aspect-ratio` by default so the model preserves the SOURCE framing — the prior `landscape_4_3` default was an invalid ai-gen enum (valid: 16:9|9:16|1:1) that made `fal-ai/nano-banana-pro` fail and silently fall back to qwen on every call; also surface the failing model's error-log tail.
- Fix `scripts/geometry-qc.py`: use the `@<path>` + `--allowedTools Read` claude vision pattern (the in-sandbox `claude` CLI has no `--image` flag).

## [v1.0.0] — 2026-06-20
### Added
- Initial authoring (BOT-020 listing-photo-studio). Virtually stages an empty/sparse room photo in a chosen style (fal-ai/nano-banana-pro, --image base-edit), room geometry preserved by the verbatim geometry-preserve clause + a blocking geometry-QC, and routed through the shared disclosure-stamp ("Virtually Staged").
- `scripts/gen-edit.sh` (single-source ai-gen base-edit + model routing + fallback), `scripts/geometry-qc.py` (blocking keyless-claude architecture-integrity vision gate).
- `references/geometry-discipline.md`, `references/stage-room-prompts.md`, `evals/evals.json` (3 cases).
