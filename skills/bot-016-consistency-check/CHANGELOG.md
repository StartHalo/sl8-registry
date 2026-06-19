# Changelog — bot-016-consistency-check

All notable changes to the `bot-016-consistency-check` skill.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Added
- Initial release (BOT-016 Full Build). JTBD-3, phase 3: the runtime model Reads the turnaround
  sheet (keyless in-session vision), grades each spec trait token against the pixels, scores identity
  consistency 0–10 with a pass/regenerate verdict (regenerate once, same seed + one tightened
  non-synonym token), then assembles the portable `character-bible.md` manifest indexing the spec,
  sheet, hero, and log with the seed and a downstream-use handoff.
- `scripts/package-bible.sh` (assembles the bible manifest; load-bearing spec + sheet, optional rest)
  + `references/consistency-rubric.md` (per-trait-class checklist, scoring bands, regenerate phrasing).
