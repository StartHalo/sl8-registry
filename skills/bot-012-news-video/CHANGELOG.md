# Changelog — bot-012-news-video

All notable changes to this skill. Versions are git tags (`bot-012-news-video/vX.Y.Z`); first publish is v1.0.0.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-10
### Added
- Initial skill: render a NewsDoc as a styled news MP4 (4 styles × 3 aspect ratios).
- `scripts/remotion-template/` — a complete, pre-built Remotion project: a shared `engine/` (deterministic fonts, type-scale floors, seeded RNG, pacing, StyleConfig, SafeZone, primitives), four style folders, and per-aspect-ratio `<Composition>` registration (style chosen via props). Built on BOT-006's Remotion patterns + `research/model-evaluation.md`.
- `scripts/render.sh` — version-aligned Remotion install + Chrome-shell ensure + per-AR render + best-effort ffprobe verify.
- `references/` — styles, rendering (troubleshooting), legibility (runtime-lean; full recipes live in `research/`).
- `evals/evals.json` — 4 expectation sets from JTBD-2/3 with media-judge (vision) dimensions.
