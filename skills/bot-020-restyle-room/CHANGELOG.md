# Changelog — bot-020-restyle-room

All notable changes to this skill. Versions are git tags (`bot-020-restyle-room/vX.Y.Z`); no `version:` in frontmatter.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.1] — 2026-06-20
### Fixed
- Fix `scripts/gen-edit.sh`: omit `--aspect-ratio` by default so the model preserves the SOURCE framing — the prior `landscape_4_3` default was an invalid ai-gen enum (valid: 16:9|9:16|1:1) that made `fal-ai/nano-banana-pro` fail and silently fall back to qwen on every call; also surface the failing model's error-log tail.
- Fix `scripts/geometry-qc.py`: use the `@<path>` + `--allowedTools Read` claude vision pattern (the in-sandbox `claude` CLI has no `--image` flag).

## [v1.0.0] — 2026-06-20
### Added
- Initial authoring (BOT-020 listing-photo-studio). Restyles a dated room / swaps a finish / renders a fixer-upper "after" concept (fal-ai/nano-banana-pro), layout+structure preserved; renovation mode forces the conspicuous "Conceptual rendering — not the current condition" label.
- `scripts/gen-edit.sh`, `scripts/geometry-qc.py` (shared).
- `references/geometry-discipline.md`, `references/restyle-prompts.md`, `evals/evals.json` (3 cases).
