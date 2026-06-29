# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `bot-033-update-character/vMAJOR.MINOR.PATCH`.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-28
### Added
- Initial publish (v1.0.0): the image-anchor seed-kit writer for the stickman channel — sets/regenerates/reports the reusable 3-view character + style at artifacts/seed/ (routes: reuse / reset / kit-only). Reset regenerates the anchors via video-toolkit/gen-image.sh with a pixel self-check.
- New-architecture build (re-implements BOT-013 on the shared video-toolkit + 2-skill surface; see docs/features/video-director-fleet/06-12).
