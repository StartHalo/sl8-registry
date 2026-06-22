# Changelog — hf-storyboard

All notable changes to this skill. Versions are git tags (`hf-storyboard/vX.Y.Z`); first publish is v1.0.0.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.1] — 2026-06-22
### Changed
- Resolve the pre-installed `hyperframes` global binary (`command -v hyperframes`, with an `npx --yes hyperframes@0.6.112` fallback for host/dev) instead of invoking `npx --yes` on every call. Removes per-invocation npx resolve/download overhead — a production run made 25x `npx --yes hyperframes` calls before discovering the global `/usr/local/bin/hyperframes`.

## [v1.0.0] — 2026-06-19
### Added
- Initial release — Turn the concept + script into a per-beat build contract (registry blocks, scene transition, track layout, frame ranges). Reads 01/02, writes 03-storyboard.md.
