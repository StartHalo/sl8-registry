# Changelog — bot-020-fix-photo

All notable changes to this skill. Versions are git tags (`bot-020-fix-photo/vX.Y.Z`); no `version:` in frontmatter.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.1] — 2026-06-20
### Fixed
- Fix `scripts/gen-edit.sh`: omit `--aspect-ratio` by default so the model preserves the SOURCE framing — the prior `landscape_4_3` default was an invalid ai-gen enum (valid: 16:9|9:16|1:1) that made `fal-ai/nano-banana-pro` fail and silently fall back to qwen on every call; also surface the failing model's error-log tail.
- Fix `scripts/geometry-qc.py`: use the `@<path>` + `--allowedTools Read` claude vision pattern (the in-sandbox `claude` CLI has no `--image` flag).

## [v1.0.0] — 2026-06-20
### Added
- Initial authoring (BOT-020 listing-photo-studio). Fixes a listing photo — declutter/object-removal (fal-ai/qwen-image-edit), day-to-dusk twilight, sky replacement, enhancement (fal-ai/nano-banana-pro) — architecture untouched, no structural defect erased, AB-723-disclosed.
- `scripts/gen-edit.sh`, `scripts/geometry-qc.py` (shared; defect-honesty front-stop + blocking geometry-QC).
- `references/geometry-discipline.md`, `references/fix-prompts.md`, `evals/evals.json` (3 cases).
