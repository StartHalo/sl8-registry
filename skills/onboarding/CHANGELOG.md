# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `<skill-name>/vMAJOR.MINOR.PATCH`. `publish-skill.sh` promotes this file automatically on each publish.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-04
### Added
- Initial release (onboarding): the shared default onboarding skill for every bot. GLOBAL mode writes `bot/user.md` (user identity, captured once); PROJECT mode writes `artifacts/<project>/context.md` (the per-project brief) and initializes `state.md` (the phase ledger) so project-style bots start their resumable multi-phase loop. Project-agnostic — derives the phase chain from the bot's `INDEX.md` + `references/project-files.md`.
