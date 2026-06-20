# Changelog — bot-027-character-bible

All notable changes to the `bot-027-character-bible` skill.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Added
- Initial release (BOT-027 Cinematic Director — Seedance, Full Build). JTBD-1, phase 1 of the
  bible → shotlist → render pipeline: a SINGLE two-phase skill that consolidates BOT-016's two
  bible skills (character-design + reference-sheet).
  - **Phase A (pure-LLM)** — turn the project brief in `context.md` into the locked
    `artifacts/<project-name>/character-spec.md`: 5-7 verbatim Identity Tokens (face → hair →
    eyes → outfit/props), one fixed integer Seed (default 7777), a named Palette with reasoning,
    and frozen STYLE_STACK + CHARACTER_BLOCK, in the stable fleet-contract shape the Seedance
    render (phase 3) and the Kling sibling parse by section name.
  - **Phase B (generation)** — render `reference-sheet.png` (multi-view turnaround) + `hero.png`
    (clean front portrait) of ONE consistent on-brief character via the pinned image chain
    `fal-ai/nano-banana-pro → openai/gpt-image-2 → fal-ai/nano-banana-2`, then Read each PNG for a
    self-check (views present, identity consistent, on-brief, no text). These two images are the
    `@Image1`/`@Image2` cross-shot identity anchors the Seedance `reference-to-video` call reads.
- `scripts/validate-spec.sh` — deterministic structural + no-synonym byte-identity gate
  (comma-tolerant join-equality check of CHARACTER_BLOCK against the locked token list; token
  count, face → hair → eyes ordering, single-integer seed, non-empty frozen blocks, all contract
  sections).
- `scripts/gen-image.sh` — walks the pinned bible chain in order, passes `--aspect-ratio` + `--ref`
  to every model, **omits `--resolution`** (the ai-gen CLI rejects it for these models and skips
  the primary — the BOT-016 fix is baked in), parses `files[0].local_path`, captures the
  `*.fal.media` URL, converts `.webp`→`.png`, retries once on a missing URL, with a missing-ref
  guard that degrades to the language+seed lock.
- `references/trait-lock.md` — recipe A baked inline (no-synonym rule, 5-part frame, token
  ordering/craft, model-agnostic bible template, worked dark-elf + sparse-brief examples), adapted
  for the Seedance-downstream context.
- `references/nbp-dialect.md` — recipe A1 baked inline (the verbatim turnaround + hero prompt
  templates, the prompt-assembly contract, the pinned chain + per-model quirks, the `--resolution`
  fix, seed discipline, ai-gen v2.1.0 CLI mechanics).
- `bible-log.md` per-asset provenance ledger (model + slug, seed, the full verbatim-block prompt,
  fallbacks in order, fal.media URL, self-check verdict).
- Headless failure handling per the JTBD-1 contract (missing brief → clean recorded failure;
  sparse brief → neutral defaults flagged; missing reference → text-only with a flag;
  real-person/branded → stylized stand-in; spec invalid after 3 fix cycles or all models fail →
  clean blocked row, no fabricated asset).
- `evals/evals.json` + `evals/rubric.md` — objective gates from JTBD-1 (full brief→bible run with
  media-judged turnaround + hero, spec-discipline + sparse-default, the reference-image path, and
  the missing-brief clean-failure), graded by skill-creator's grader; 3 rubric dims
  (bible-consistency media-judge 0.45 + spec-discipline 0.30 + log-integrity 0.25).
