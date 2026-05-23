# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `<skill-name>/vMAJOR.MINOR.PATCH`. `publish-skill.sh` promotes this file automatically: on each publish, `[Unreleased]` becomes `[v<new-version>] — <today>` and a fresh empty `[Unreleased]` section is inserted at the top.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-05-23
### Added
- Initial release (v1.0.0): plans the narrative arc and slide outline for a
  presentation. Classifies a deck type from the audience (pitch, tutorial, internal
  update, overview), picks an arc and 2-5 building sections, selects a running
  example, decides the progress indicator (none / percentage / journey-levels), and
  writes a slide-by-slide `artifacts/<project>/outline.md`.
- `references/arc-patterns.md`: ready-made arcs per deck type, generalized from the
  upstream `vibe-to-agentic-framework` skill.

<!--
Section types (Keep a Changelog):
  ### Added      — new capability or output
  ### Changed    — behavior change (prompts, scoring, order of operations)
  ### Fixed      — bug fixes
  ### Deprecated — will be removed in a future version
  ### Removed    — removed feature/flag/output
  ### Security   — security-relevant fix

Only include sections you need. Publishing requires [Unreleased] to have at
least one non-blank bullet under any section header.
-->
