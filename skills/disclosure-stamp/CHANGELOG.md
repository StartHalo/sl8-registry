# Changelog — disclosure-stamp

All notable changes to this skill. Versions are git tags (`disclosure-stamp/vX.Y.Z`); no `version:` in frontmatter.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Added
- Initial authoring (BOT-019 re-compliance-guard). Shared bare-name registry skill: stamps the AB-723
  conspicuous "digitally altered" caption on listing media, emits the MLS remark + AB-723 disclosure line,
  and composes the original+altered pairing.
- `scripts/stamp.py` (Pillow caption bar; video → first-frame card + ffmpeg suggestion),
  `scripts/pair.py` (side-by-side ORIGINAL+ALTERED), `scripts/ensure-pillow.sh` (install on sl8-video).
- `references/disclosure-formats.md` — per-alteration-type + per-jurisdiction caption/remark/line templates.
- `evals/evals.json` — 3 cases (stage+original, twilight no-original, video first-frame card).
