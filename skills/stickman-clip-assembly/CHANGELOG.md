# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `stickman-clip-assembly/vMAJOR.MINOR.PATCH`.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-24
### Added
- Initial publish (v1.0.0) of the redesigned Phase 4 clips + assembly skill.
- Duration routing: ≤15s tries Seedance reference-to-video multi-shot; >15s uses per-beat image-to-video directly (the standard path, not a fallback).
- KB layered i2v prompt stack ([Camera] / [Action] / [Subject] / [Constraints]); reads the character spec from the episode's local `character/` folder.
- Honest 05-summary.md production log (approach, models, fallbacks, credits, limitations).
