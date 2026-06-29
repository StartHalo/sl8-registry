# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `bot-036-make-continuous-shot/vMAJOR.MINOR.PATCH`.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-29
### Added
- Initial publish (v1.0.0): the end-to-end make-continuous-shot dispatcher over Veo 3.1 image-to-video base + extend-video (zero concat — extend returns the full grown take). Repeats the frozen token seed kit ≥80% per hop (text-repeat); reuses the shared video-toolkit (gen-image + verify --mode grew); resumable.
- New-architecture build (re-implements BOT-030 on the shared video-toolkit + 2-skill surface; see docs/features/video-director-fleet/06-12).
