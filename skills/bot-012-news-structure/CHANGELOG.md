# Changelog — bot-012-news-structure

All notable changes to this skill. Versions are git tags (`bot-012-news-structure/vX.Y.Z`); first publish is v1.0.0.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-10
### Added
- Initial skill: ingest pasted text or a URL → a faithful, provenance-tracked NewsDoc.
- `scripts/extract.mjs` — readability + JSON-LD URL extractor with a dependency-free regex fallback (degrades, never fabricates).
- `scripts/validate-newsdoc.mjs` — structural validator (headline, beats, verbatim key_phrases, known style).
- `references/` — news-anatomy, newsdoc-schema, guardrails, style-selection (distilled from `research/domain-analysis.md`).
- `evals/evals.json` — 3 expectations sets derived from JTBD-1 (pasted release, thin/headline-only, URL ingest).
