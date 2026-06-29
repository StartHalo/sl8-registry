# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `bot-033-make-stickman/vMAJOR.MINOR.PATCH`.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-28
### Added
- Initial publish (v1.0.0): the end-to-end make-stickman dispatcher (init → resolve-seed → plan → generate → assemble → verify → deliver) turning a topic into a finished pencil-sketch stickman episode MP4 over Seedance per-beat image-to-video. Reuses the shared video-toolkit (assemble/verify/gen-image); resumable via state.md; reads the image-anchor seed kit at artifacts/seed/.
- New-architecture build (re-implements BOT-013 on the shared video-toolkit + 2-skill surface; see docs/features/video-director-fleet/06-12).
