# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `bot-007-restaurant-logo-gen/vMAJOR.MINOR.PATCH`. `publish-skill.sh` promotes this file automatically: on each publish, `[Unreleased]` becomes `[v<new-version>] — <today>` and a fresh empty `[Unreleased]` section is inserted at the top.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.2.0] — 2026-04-28
### Added
- **Logo Design Vocabulary section** at top of SKILL.md — anatomy (mark, wordmark, lockup, signature, letterform, counterform, ornamental frame, embellishment, stroke weight, negative space, optical alignment), Wheeler's 7 canonical logo types (Wordmark / Lettermark / Pictorial mark / Abstract mark / Mascot / Combination mark / Emblem), universal legibility tests (favicon, B&W, single-mark-clarity), design discipline (golden ratio, gestalt principles), Pentagram method (Paula Scher's research → design kit → liquid identity process). Embedded inline because Sandbox Claude cannot read KB at runtime.
- **Wheeler type declaration** required in Step 3 base concept — every concept must declare which of the 7 types it is (Combination mark default for restaurants; Emblem default for heritage / artisanal categories).
- **Favicon-test + B&W-test self-checks** required in Step 3 base concept — operationalizes legibility considerations that were previously implicit.
- **New Step 8b — Logo Critique Pass** before scoring. Bot evaluates each surviving image against three operationalized legibility tests (favicon test, B&W test, single-mark-clarity test) and records a one-line verdict per test, per surviving model, in `comparison.md` § Per-Model Observations.
- **Design-kit extension considerations** in Step 9 Recommendation — Pentagram-method handoff to the persona's designer (typography system, color palette extension, iconography family, motion, signage scale).
- **Build-time KB cross-reference comments** at every per-model template in Step 5 (`> Build-time KB pointer: see kb/wiki/topics/prompting-recraft-v4.md ...`) so human authors / reviewers always have a path to deeper KB content. Sandbox Claude doesn't read these — they're for build-time editors.
- **2 new charter dimensions** — `logo-vocabulary-internalization` (LLM-judge, weight 0.04, JTBD-1) and `legibility-test-coverage` (LLM-judge, weight 0.03, JTBD-2). Existing 24 weights rebalanced to keep total at 1.00.

### Changed
- **Step 7 fallback discipline hardened to STRICT DROP**. The bot may not invoke models outside the documented 3-slot × 3-fallback table. If all 3 levels fail for a slot, the slot drops, the empty-slot row is logged to `models-used.md`, and the run continues with surviving slots. The SD 3.5 Large incident on 2026-04-27 (v1.1.0 run) — where the bot improvised an out-of-chain model — is now a documented anti-pattern.
- **Per-model templates ~15% deeper inline** — Recraft section names the 5 required slots inline; Nano Banana section names Framework 1 explicitly + the 3 text-rendering rules; Ideogram and FLUX sections name the per-model anti-patterns inline.
- **`logo-concept.md` structure expanded from 7 sections to 8** — new "Logo Classification & Legibility" section (Wheeler type + favicon/B&W self-checks) inserted between Assumptions and Base Concept.
- **Quality criteria checklist updated** with 5 new v1.2.0 items (Wheeler type, favicon self-check, B&W self-check, no-out-of-chain-models, design-kit-extension considerations).

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
