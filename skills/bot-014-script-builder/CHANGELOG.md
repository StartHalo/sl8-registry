# Changelog — bot-014-script-builder

All notable changes to this skill. Versions are git tags (`bot-014-script-builder/vX.Y.Z`); first publish is v1.0.0.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-11
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-11
### Added
- Initial skill (the Kinetic Text structurer): ingest any short message — announcement, product update, quote, stat, or headline (pasted text or a URL) → a faithful, provenance-tracked MessageDoc; recommend a `style` (one of nine) + a `mood`.
- `scripts/extract.mjs` — readability + JSON-LD URL extractor with a dependency-free regex fallback (degrades, never fabricates).
- `scripts/validate-newsdoc.mjs` — structural validator (headline, beats, verbatim key_phrases).
- `references/` — message anatomy, MessageDoc schema (incl. `recommended_mood`), guardrails, and 9-style + mood selection (distilled from `research/domain-analysis.md`).
- `evals/evals.json` — expectation sets derived from JTBD-1 (pasted message, thin/headline-only, URL ingest).
