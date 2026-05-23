# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `<skill-name>/vMAJOR.MINOR.PATCH`. `publish-skill.sh` promotes this file automatically: on each publish, `[Unreleased]` becomes `[v<new-version>] — <today>` and a fresh empty `[Unreleased]` section is inserted at the top.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-05-23
### Added
- Initial release (v1.0.0): builds and revises a self-contained single-file HTML
  slide deck. Create mode turns a narrative outline into an `index.html` with inline
  CSS/JS, keyboard navigation, an auto-computed slide count, and an optional progress
  or journey bar. Revise mode adds, removes, reorders, or restyles slides in an
  existing deck and runs the renumbering protocol.
- `templates/index.html`: a topic-agnostic working starter deck.
- `references/structure.md`: slide format, navigation, the renumbering protocol, and
  the verification checklist — generalized from the upstream `presentation-structure`
  skill.
- `references/styling.md`: theme variables and the CSS component-class vocabulary —
  generalized from the upstream `presentation-styling` skill.

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
