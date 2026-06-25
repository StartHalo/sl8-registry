# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `stickman-studio/vMAJOR.MINOR.PATCH`.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-24
### Added
- Initial publish (v1.0.0) of the end-to-end orchestrator (renamed from the former stickman-produce).
- Runs all four phases in sequence — episode-design → character → stills → clip-assembly — without stopping; resumes from state.md when an episode is in progress.
- Handles US-1 (new episode), US-2 (series continuation), and US-3 (character reset); defers US-4 (character only) to stickman-character.
