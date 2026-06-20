# Changelog — bot-021-i2v-reveals

All notable changes to this skill. Versions are git tags (`bot-021-i2v-reveals/vX.Y.Z`); no `version:` in frontmatter.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Added
- Initial authoring (BOT-021 cinematic-listing-video, `reveals` phase). The OPTIONAL generative i2v
  upsell layered on the deterministic Ken-Burns spine — animates ONE real listing photo as the start
  frame so only the virtual camera moves; never required (the slideshow ships without it).
- `scripts/gen-clip.sh` — motion-only i2v reveal generator: photo→start frame (`--image`→`image_url`),
  Seedance 2.0 fast default → Kling v3 pro fallback, auto-appended anti-warp guard, `--max-cost`
  enforcement, `--still-fallback` degrade to the deterministic still-segment (prints `<model>\t<out>`
  or `still-segment\t<out>`). `scripts/still-segment.sh` — the keyless Ken-Burns fallback.
- `references/reveal-prompts.md` — the verbatim motion-only prompts (push-in 5s, bounded orbit ≤30° 10s,
  aerial/exterior 8s) + the documented anti-warp negative the script appends + the prompt-motion-only rule.
- `references/i2v-discipline.md` — reachable model routing & bare-`bytedance/...` slug discipline, cost
  discipline (balance-delta / `ai-gen estimate`, never `credits_used` ~8.4× high, fal URLs expire →
  download immediately), mandatory vision-grade-for-warp, and the degrade-to-still rule.
- `evals/evals.json` — 3 cases (default push-in hero reveal; orbit + exterior aerial in 9:16;
  push-in then disclosed MLS export via disclosure-stamp).
- Disclosure: first-frame AB-723 card burned by `assemble-listing.sh`; final export routed through the
  shared registry skill `disclosure-stamp` (`--type virtual-staging`) for the MLS remark +
  reachable-original note → `artifacts/<listing>/disclosure.md`. Declares `references-skills: [disclosure-stamp]`.
