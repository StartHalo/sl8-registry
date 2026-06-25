# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `stickman-character/vMAJOR.MINOR.PATCH`.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-24
### Added
- Initial publish (v1.0.0) of the new dedicated Phase 2 character skill (extracted from the old stickman-art lock step).
- 3-view character generation via `fal-ai/nano-banana-pro`: source (front) + three-quarter + side-profile as separate `--ref`-anchored images, replacing the single-tile turnaround that caused multi-view drift and model-added watermarks.
- Per-view self-check (single-stroke limbs, consistent cap, no model text/labels/watermark) with one-retry budget and deviation logging.
- Always copies the locked character assets into the episode's `character/` folder so every episode is self-contained.
