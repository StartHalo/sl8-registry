# Changelog

All notable changes to the `bot-013-stickman-art` skill.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.2] — 2026-06-09
### Fixed

- `scripts/gen-image.sh` + `scripts/check-set.sh` — hosted-URL detection now accepts
  any `*.fal.media` subdomain (the proxy serves `https://v3b.fal.media/...`; the old
  `startswith("https://fal.media")` rejected every real URL — found live in run 1,
  where the bot had to ship wrapper scripts in work/ to proceed).

### Changed

- DEFAULT_CHARACTER_BLOCK pins the torso construction ("one soft solid teardrop
  shape") + an every-image-same-construction closing sentence, fixing run-1 identity
  drift between stills (solid vs line body).


## [v1.0.1] — 2026-06-09
### Fixed

- Frontmatter manifest compliance: `inputs[].type: number` (seed) is not in the
  manifest type vocabulary (markdown/text/json/image/.../x-*) and made the test
  harness skip this skill's manifest.json. Seed is now `type: text` (integer as
  text). No behavior change.


## [v1.0.0] — 2026-06-09
### Fixed

- `scripts/gen-image.sh` — removed the hard `jq` dependency (jq is not installed in the
  sl8-animation sandbox): success/`files[0]` parsing and hosted-URL extraction now use
  `python3`. URL extraction is a recursive walk over the whole parsed response, so a
  `https://fal.media` URL is found whether `.data` is an object or an array of `{url}`
  (the old jq `//` chain masked the regex sweep on array payloads). `finalize()` no
  longer kills the script under `set -e` when the `.webp → .png` ffmpeg conversion
  fails — it logs, removes the orphan source, and the chain walks to the next model;
  the rename is also guarded against `src == dst`. recraft-v3 skip cap raised from
  700 to 950 chars (the real model limit is 1,000); skip-with-log behavior unchanged.
- `scripts/check-set.sh` — beat count is now anchored to `^### Beat N:` headings
  (max N) instead of grepping `beat N` anywhere in the plan, so prose mentions in
  `## Notes` no longer inflate the expected beat count.

### Added

- Initial authoring (v1.0.0) covering BOT-013's JTBD-1 (lock-character, phase 2) and
  JTBD-3 (generate-stills, phase 3) as one skill sharing the frozen prompt blocks,
  image-model fallback chains, and self-check discipline.
- `SKILL.md` — frozen blocks verbatim (STYLE_STACK, DEFAULT_CHARACTER_BLOCK,
  DISCIPLINE_BLOCK, NEGATIVES_BLOCK) plus the two sanctioned variants
  (TEXT_NEGATIVES for labeled assets, TURNAROUND_NEGATIVES for the multi-view sheet);
  pinned chains (stills: flux-dev → flux-pro → recraft-v3 → SD3.5-large; text:
  ideogram/v3 → SD3.5-large); series-project skip logic; base-concept step (≥100
  words, 6 dimensions); stills-log block format; ≥80%-kept gate; headless failure
  rules; state.md ledger updates after each phase.
- `scripts/gen-image.sh` — chain walker: per-model quirk handling (skips recraft-v3
  for >700-char prompts instead of truncating; converts its .webp output via ffmpeg),
  jq URL extraction with regex fallback over the data payload, one retry on a
  missing fal.media URL, prints `model<TAB>local-path<TAB>url` on success.
- `scripts/check-set.sh` — structural phase-3 gate: every plan beat kept or
  recorded-skipped, every kept still has a fal.media URL in its log block, ≥80% kept.
- `references/still-dialects.md` — per-model adjustments and quirks (recraft length
  cap + photo-misread guard, FLUX text weakness, unlisted-but-working ideogram/v3),
  seed discipline, ai-gen 1.1.2 mechanics.
- `references/pdf-patterns.md` — the source PDF's steps 1–6 identity-asset patterns
  rewritten as text-only-prompting templates (source image, turnaround, 3×3
  global-constraints grid, 2×2 grid, individual stills, parked collage-donor).
- `references/self-check.md` — per-asset checklist (figure / cap / style / action /
  text / views) with a one-retry budget and a concrete fix per failure mode.
