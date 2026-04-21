# Changelog

All notable changes to `bot-007-restaurant-logo-gen` are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are tagged in `StartHalo/sl8-registry` as `bot-007-restaurant-logo-gen/vMAJOR.MINOR.PATCH`.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-04-21
### Added
- Initial registry release of the BOT-007 Restaurant Logo Generator skill.
- Generates restaurant logo concepts across three AI model families with design-informed, model-specific prompts.

### Changed
- Skill consolidates three development iterations (internal v2.0 → v2.2):
  - **v2.0** (2026-04-13): carryover from BOT-005 validated work; 2 JTBDs, baseline prompt template, 8/8 tests passed in 399.9s.
  - **v2.1** (2026-04-14): added divergent concept-direction exploration phase, expanded scoring to 8 dimensions, added "Recommended Next Steps" block; process-only changes; 8/8 tests passed in 443.1s.
  - **v2.2** (2026-04-15): KB-anchored model selection and per-model prompt templates; first iteration that changes prompt substance (not just workflow); 8/8 tests passed in 519.3s.

### Internal details (v2.2, shipped as v1.0.0)
- **Fallback chains** wired into model selection:
  - Vector channel: `recraft-ai/recraft-v4-svg` → `fal-ai/recraft-v3` (style=vector_illustration)
  - Raster channel: `recraft-ai/recraft-v4` → `fal-ai/recraft-v3`
  - Text-hero channel: `google/nano-banana-pro` → `fal-ai/ideogram/v3` → `fal-ai/flux-pro`
- **Per-model prompt templates** from `kb/wiki/topics/`:
  - Recraft uses the paragraph-brief style from `prompting-recraft-v4.md`.
  - Nano Banana Pro uses the 5-part framework (Subject + Action + Location + Composition + Style) from `prompting-nano-banana-pro.md`, positive framing only.
- **Universal Principles compliance checklist** from `kb/wiki/concepts/image-prompt-engineering.md`: strong-verb opener, natural-language sentences, positive framing, double-quoted literal text, materiality over generic nouns, explicit use case.
- **Anti-cliché discipline** in the base-concept step: the bot names the specific trope being rejected and picks a fresher reference before prompting.
- **9-dimension comparison scoring** — adds Freshness / cliché resistance as the ninth dimension.
- **`models-used.md` manifest** — records the exact model IDs that produced each image, so fallback cascades are visible in the artifact set.

### Outputs (stable)
- `artifacts/<project-name>/concept-directions.md`
- `artifacts/<project-name>/logo-concept.md`
- `artifacts/<project-name>/logo-prompt.md`
- `artifacts/<project-name>/logos/` (logo variations: SVG + raster + text-hero)
- `artifacts/<project-name>/comparison.md`
- `artifacts/<project-name>/models-used.md`
