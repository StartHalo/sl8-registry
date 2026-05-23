# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `<skill-name>/vMAJOR.MINOR.PATCH`. `publish-skill.sh` promotes this file automatically: on each publish, `[Unreleased]` becomes `[v<new-version>] — <today>` and a fresh empty `[Unreleased]` section is inserted at the top.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-05-23
### Added
- Initial release of `bot-009-manim-gl` — creates animated explainer videos with ManimGL, the OpenGL-based 3Blue1Brown engine (`manimlib` import, `manimgl` CLI).
- Six-step workflow: read brief and apply defaults → storyboard → write scene → render headless under `xvfb-run` → verify with bounded fix-and-retry → summary.
- Original ManimGL reference material: 5 `reference/` docs covering scenes and mobjects, animations, Tex and text, camera and 3D, and the CLI / rendering pipeline.
- Original `examples/` set: 4 self-contained ManimGL scenes (shapes and text, equation walkthrough, function plot, animated 3D camera).
- Quality (`low`/`medium`/`high`) and aspect (`landscape`/`portrait`/`square`) controls with documented defaults.
- Headless rendering guidance: every render is wrapped in `xvfb-run -a` because ManimGL is OpenGL-only; interactive mode (`self.embed()`, `checkpoint_paste()`, `-se`) is explicitly disabled for headless operation.
- LaTeX-failure fallback to `Text`, and scene simplification fallback after 3 failed render retries.
- Routing guidance so this skill triggers only on explicit ManimGL requests, leaving `bot-009-manim-ce` as the default engine.
