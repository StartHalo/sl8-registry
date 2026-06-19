# Changelog — bot-016-reference-sheet

All notable changes to the `bot-016-reference-sheet` skill.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.1] — 2026-06-19
### Fixed
- `gen-image.sh` no longer forwards `--resolution` to the bible chain. Test 2026-06-19 showed the
  ai-gen CLI rejects `--resolution` for `fal-ai/nano-banana-pro` (exit non-zero), which made the
  chain skip the PRIMARY model on every run and fall through to `nano-banana-2`. Every model now
  renders at its own default (16:9 was crisp at default in the Step-0 PoC). SKILL.md + `references/nbp-dialect.md`
  updated to match (the arg is accepted-but-ignored for forward-compat).

## [v1.0.0] — 2026-06-19
### Added
- Initial release (BOT-016 Full Build). JTBD-2, phase 2: read the locked `character-spec.md` and
  generate the multi-view turnaround `reference-sheet.png` (front / three-quarter / side / back of
  ONE consistent character) + a clean `hero.png` front portrait (i2v start frame), pasting the spec's
  STYLE_STACK + CHARACTER_BLOCK verbatim with the fixed seed and (when present) the reference image
  as `--ref`. Records every model + seed + prompt + fallback + fal.media URL in `generation-log.md`.
- `scripts/gen-image.sh` — walks the pinned bible chain `fal-ai/nano-banana-pro → openai/gpt-image-2
  → fal-ai/nano-banana-2` (all reference- and aspect-ratio-capable), with ai-gen v2.1.0 JSON
  mechanics (files[0].local_path via python3, hosted_urls capture, .webp→.png), per-try URL retry,
  and a missing-local-ref guard that degrades to the language+seed lock.
- `scripts/crop-views.sh` (optional ImageMagick angle slicer) + `references/nbp-dialect.md` (recipe
  A1 turnaround + hero templates baked inline, per-model quirks, runtime-confirm notes).
