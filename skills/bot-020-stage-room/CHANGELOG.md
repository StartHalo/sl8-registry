# Changelog — bot-020-stage-room

All notable changes to this skill. Versions are git tags (`bot-020-stage-room/vX.Y.Z`); no `version:` in frontmatter.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Added
- Initial authoring (BOT-020 listing-photo-studio). Virtually stages an empty/sparse room photo in a chosen style (fal-ai/nano-banana-pro, --image base-edit), room geometry preserved by the verbatim geometry-preserve clause + a blocking geometry-QC, and routed through the shared disclosure-stamp ("Virtually Staged").
- `scripts/gen-edit.sh` (single-source ai-gen base-edit + model routing + fallback), `scripts/geometry-qc.py` (blocking keyless-claude architecture-integrity vision gate).
- `references/geometry-discipline.md`, `references/stage-room-prompts.md`, `evals/evals.json` (3 cases).
