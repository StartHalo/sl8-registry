# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `stickman-episode-design/vMAJOR.MINOR.PATCH`.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-24
### Added
- Initial publish (v1.0.0) of the redesigned Phase 1 planner. Routes the four user stories (new / series / reset / character-only), bootstraps channel config from templates, writes context.md + state.md + 01-episode-plan.md, and initialises the live dashboard.
- Per-beat `camera:` field carrying a Seedance camera keyword, threaded through to stills and clips.
- state.md phase chain points Phase 2 at the new `stickman-character` skill.
