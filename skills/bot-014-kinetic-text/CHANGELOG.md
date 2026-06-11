# Changelog — bot-014-kinetic-text

All notable changes to this skill. Versions are git tags (`bot-014-kinetic-text/vX.Y.Z`); first publish is v1.0.0.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-11
### Added
- Initial all-in-one orchestrator skill: any short message (pasted text or URL) -> faithful MessageDoc -> styled animated-text MP4 with a background score, in ONE invocation.
- Thin by design: bundles no Remotion project — it runs the installed granular skills' scripts (`bot-014-script-builder/scripts/extract.mjs`, `bot-014-text-animator/scripts/{render.sh,remotion-template}`), so there is zero bundle duplication.
- Declares `references-skills: [bot-014-script-builder, bot-014-text-animator]`; handles the structure -> render flow + restyle/resize/re-score.
- `evals/evals.json` — 3 end-to-end expectation sets (message->video, url->video, restyle+re-score) with media-judge (vision) dimensions incl. an audio-stream check.
