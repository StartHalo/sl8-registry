# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `<skill-name>/vMAJOR.MINOR.PATCH`. `publish-skill.sh` promotes this file automatically: on each publish, `[Unreleased]` becomes `[v<new-version>] — <today>` and a fresh empty `[Unreleased]` section is inserted at the top.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-05-23
### Added
- Initial release of `bot-009-manim-ce` — creates animated explainer videos with Manim Community Edition.
- Six-step workflow: read brief and apply defaults → storyboard → write scene → render headless under `xvfb-run` → verify with bounded fix-and-retry → summary.
- Vendored Manim CE reference material (MIT, from `adithya-s-k/manim_skill`): 23 `rules/` files, 9 `examples/` scenes, 3 scene `templates/`.
- Quality (`low`/`medium`/`high`) and aspect (`landscape`/`portrait`/`square`) controls with documented defaults.
- LaTeX-failure fallback to `Text`, and scene simplification fallback after 3 failed render retries.
