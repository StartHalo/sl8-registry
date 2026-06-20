# Changelog — bot-022-lifestyle-composer

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Added
- Initial authoring of the skill (BDLC Author activity, BOT-022 Full Build,
  2026-06-19). Covers JTBD-3: drop the approved compliant packshot / RMBG cutout into
  on-brand and seasonal LIFESTYLE scenes for the PDP + ad creative, product identity
  locked, on the GENERATIVE path with a blocking fidelity-qc gate.
- `SKILL.md` — phase-3 (scenes) workflow: engine confirm + cutout prep (Bria RMBG,
  pixel-faithful) → one image per (scene × aspect) with the 4-line scene prompt (verbatim
  identity-lock Line 1, preset Line 2, brand-look Line 3, verbatim photoreal/no-halo
  negatives Line 4) → the BLOCKING fidelity-qc compare against the hero
  (pass→ship / drift→regen-once-then-drop+flag / review→ship+flag) → honest scenes-log.md
  → state.md ledger update. Frontmatter inputs/outputs nested under `metadata:`
  (skills-publish v0.3.0); version 1.0.0.
- `scripts/compose-scene.sh` — composite generator + RMBG cutout maker. Verified ai-gen
  2.1.0 syntax (live PoC 2026-06-19): `--image` → singular `image_url` (the proven
  exact-product anchor), `--ref` (repeatable) → multi-reference (brand-look/logo),
  `--aspect-ratio`, POSITIONAL `resolution=2K` for nano-banana-pro (no `--resolution`
  flag). Pinned chain nano-banana-pro → Seedream v4.5/text-to-image; downloads
  `files[0].local_path` immediately (fal URLs expire); `--max-cost` guard; never
  improvises out-of-chain. `--make-cutout` mode runs Bria RMBG (image_url via `--image`).
- `scripts/fidelity-qc.py` — the shared BLOCKING fidelity gate (also used by
  packshot-studio for alternate angles / any generative edit). Claude vision compare of
  candidate-vs-reference on PRODUCT identity/color/shape/label/surface only; emits a
  strict JSON verdict (pass|drift|review + confidence + dims); downgrades a
  below-threshold pass to review; blocks (review) on a missing/unparseable judgment.
  Exit codes 0/3/4/2 mirror pass/review/drift/block for scripting.
- `references/scene-presets.md` — the style-pack: image-anchored kitchen-morning (default),
  desk-workspace, outdoor-golden-hour, beach-coastal, marble-studio, holiday-seasonal,
  lifestyle-in-use presets with setting/light/props/composition language; aspect-by-channel
  table; drift-resistance tips.
- `references/brand-kit.md` — palette/font/logo lock: `--image` (product) vs `--ref`
  (look/mark) mapping, dual-reference style transfer for catalog consistency, logo/text
  fidelity caveats (route text to nano-banana-pro; garbled mark → human review),
  what-stays-out-of-the-scene rules.
- `references/hero-reference-lock.md` — the identity-lock discipline grounded in the
  load-bearing PoC finding (a generative re-background hallucinated a different product);
  verbatim "maintain its identical appearance" clause; `--image` vs `--ref` table;
  anti-drift across a set; explicit "never use this generative path for the compliant
  main image" boundary.
- `evals/evals.json` — 3 objective evals (JTBD-3 + the blocking-QC rule): full scene set
  with identity/aspect/QC gates; a drift case (luggage-tag swap) that must be dropped, not
  shipped; a reflective/metallic/fine-text case forced to human review.
- `evals/rubric.md` + `iteration-charter.md` — 4 vision/LLM dimensions (product-identity-
  vs-hero 0.40, scene-realism-and-composition 0.25, brand-consistency 0.15,
  qc-gate-and-honesty 0.20; sum 1.00); target_score 0.85, publish_threshold 0.80,
  stuck_window 10.

### Decisions
- **fidelity-qc is a shared, blocking gate authored here.** The deep-dive + PoC make it
  the single most important safety net (the reachable fal edit models have no hard
  fidelity lock). It lives in this skill's `scripts/` and is also called by
  packshot-studio for alternate angles; a below-threshold pass is downgraded to review,
  and an unobtainable judgment blocks (review) rather than silently passing.
- **Product → `--image` (singular), look/logo → `--ref` (multi).** Confirmed live
  2026-06-19; putting the product in `--ref` weakens the identity lock. nano-banana-pro
  takes a POSITIONAL `resolution=` (no `--resolution` flag); the Seedream fallback drops
  refs (noted in stderr).
- **Generative ≠ the compliant main image.** This skill is explicitly scoped to lifestyle
  scenes + value-add; the compliant Amazon main image stays on the deterministic
  RMBG+Pillow path (packshot-studio), never a generative re-background.
- **Prefer the RMBG cutout as the `--image` source** (composites cleaner, fewer halos)
  but always QC against the white-bg hero (the approved anchor).
