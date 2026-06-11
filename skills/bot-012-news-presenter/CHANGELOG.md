# Changelog — bot-012-news-presenter

All notable changes to this skill. Versions are git tags (`bot-012-news-presenter/vX.Y.Z`); first publish is v1.0.0.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-10
### Added
- Initial all-in-one orchestrator skill: news in (pasted text or URL) -> faithful NewsDoc -> styled MP4, in ONE invocation.
- Thin by design: bundles no Remotion project — it runs the installed granular skills' scripts (`bot-012-news-structure/scripts/extract.mjs`, `bot-012-news-video/scripts/{render.sh,remotion-template}`), so there is zero bundle duplication.
- Declares `references-skills: [bot-012-news-structure, bot-012-news-video]`; handles the structure -> render flow + restyle.
- `evals/evals.json` — 3 end-to-end expectation sets (text->video, url->video, restyle) with media-judge (vision) dimensions.
