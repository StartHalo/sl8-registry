# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `bot-007-restaurant-logo-gen/vMAJOR.MINOR.PATCH`. `publish-skill.sh` promotes this file automatically: on each publish, `[Unreleased]` becomes `[v<new-version>] — <today>` and a fresh empty `[Unreleased]` section is inserted at the top.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.1.0] — 2026-04-27
### Changed
- **Full skill rebuild from scratch** under the same `bot-007-restaurant-logo-gen` name. The previous v1.0.0 release was authored against an earlier process; the published-version line continues at v1.1.0+ for the rebuild while the registry tag for v1.0.0 remains immutable.
- Replaced ad-hoc concept with a documented **6-dimension base concept methodology** (≥100 words; subject / composition / style / palette-with-hex / typography / mood). Self-check enforced inside the skill.
- Added an **explicit anti-cliché statement step** with named-trope + named-fresher-reference structure. Persisted to `work/anti-cliche.md` AND embedded in `logo-concept.md`.
- Replaced single-prompt approach with **per-model dialect templates**: Recraft V4 paragraph brief, Nano Banana Pro five frameworks (positive-framed), Ideogram V3 ≤2 quoted blocks, FLUX 2 Pro narrative no-subtitles. Copy-paste across models is rejected.
- Added the **single-iconography rule**: scans each prompt for `\bor\b` between two icon options and rejects multi-icon ambiguity.
- Replaced ad-hoc model selection with a documented **3-slot × 3-fallback chain**: vector / text-hero / artistic, with V4 SVG → V4 raster → V3 → FLUX Schnell, Nano Banana → Ideogram → FLUX 2 Pro, FLUX 2 Pro → FLUX Schnell. Hard ceiling: 9 attempts.
- Replaced 6-dimension scoring with **9-dimension scoring rubric**: text rendering, composition, style match, color accuracy, iconography, mark singularity, freshness/cliché-resistance, scale-down legibility, overall. Freshness column requires substantive cliché-honored vs cliché-violated verdict per model.
- Added **11-row cuisine taxonomy** (fine dining / Italian / Japanese / Mexican-Latin / BBQ / coffee / bakery / fast casual / bar / brewery / international) with default style direction, palette family, iconography family, and layout per cuisine.
- Added **comparison.md required structure**: Generation Details (with SVG-handling status), Models Used, Per-Model Observations (≥1 strength + ≥1 weakness per surviving model), 9-dim Scoring table, single-named Recommendation, Text-Rendering Disclaimer (literal phrase enforced).

### Added
- `iteration-charter.md` derived from `1-requirements.md` JTBD contracts via `derive-charter.ts`. 24 dimensions covering 14 outputs + 2 edge-case acceptance scenarios + 8 failure modes. Weights rebalanced to 1.00 with anti-cliché + base-concept + per-model-dialect carrying 0.28 cumulative weight. Validated by `charter-validate.ts`.
- `forbidden_edits` includes `bot/CLAUDE.md` and the charter itself — autoresearch cannot self-tune the rubric.
