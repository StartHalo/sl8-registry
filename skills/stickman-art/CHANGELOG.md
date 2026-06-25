# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `stickman-art/vMAJOR.MINOR.PATCH`.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-24
### Added
- Initial publish (v1.0.0) of the redesigned Phase 3 stills generator (character lock removed — now owned by stickman-character).
- Reads the character anchor from the episode's local `character/` folder rather than the artifacts root, so each episode is self-contained.
- `limbs:` (single-stroke, no rounded limbs) self-check added; `camera-keyword` logged per still in stills-log.md for the clip phase.
