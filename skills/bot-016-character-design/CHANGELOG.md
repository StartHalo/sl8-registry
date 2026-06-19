# Changelog — bot-016-character-design

All notable changes to the `bot-016-character-design` skill.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Added
- Initial release (BOT-016 Full Build). JTBD-1, phase 1 of the character-bible chain: turn the
  project brief in `context.md` into the locked `artifacts/<project-name>/character-spec.md` — 5–7
  verbatim Identity Tokens (face → hair → eyes → outfit/props), one fixed integer Seed (default
  7777), a named Palette with reasoning, and frozen STYLE_STACK + CHARACTER_BLOCK — in the stable
  fleet-contract shape downstream director bots parse by section name. Pure-LLM, no generation.
- `scripts/validate-spec.sh` — deterministic structural + no-synonym byte-identity gate
  (comma-tolerant join-equality check of CHARACTER_BLOCK against the locked token list).
- `references/trait-lock.md` — recipe A1/A2/A4 baked inline (no-synonym rule, 5-part frame, token
  ordering/craft, model-agnostic bible template, worked dark-elf + sparse-brief examples).
- Headless failure handling per the JTBD-1 contract (missing brief → clean recorded failure; sparse
  brief → neutral defaults flagged; missing reference → text-only with a flag; real-person/branded →
  stylized stand-in).
