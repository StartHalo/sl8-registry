# Changelog — bot-022-packshot-studio

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Planned
- Full E2E sandbox confirmation on a real seller snap (the host tests used stubbed
  `ai-gen`; the deterministic Pillow gate is host-verified, the fal calls are not yet
  sandbox-confirmed for this skill — `research/poc-reachability.md` confirmed the slugs
  + arg syntax live, but not this exact `packshot.sh`/`gen-angles.sh` wiring).
- Optional QC-gated Seedream v4.5 cleanup/relight pass (currently documented in SKILL.md
  Step 1 but not wired into `packshot.sh` — default is no cleanup).
- Wire `fidelity-qc` verdicts back into `gen-angles.sh` as an automated drop (today the
  script emits `angles-manifest.json` and the bot performs the blocking QC + drop).

## [v1.0.0] — 2026-06-19
### Added
- Initial authoring of the core skill (BDLC Author activity, BOT-022 Full Build).
  Covers JTBD-1 (compliant fidelity-true hero) + JTBD-2 (≤4 identity-locked angles):
  phase 1 (hero) + phase 2 (angles).
- `SKILL.md` — the architecture is the load-bearing PoC finding: the HERO main-image
  path is DETERMINISTIC (Bria RMBG on the real snap → Pillow exact-255 flatten), NEVER a
  generative re-background (a generative edit hallucinated a different product in the
  build PoC). Angles REQUIRE generation (nano-banana-pro re-anchored off the approved
  hero), capped at ≤4, each passed through a BLOCKING fidelity-qc vision compare. Headless
  defaults, required-input gate (snap), declared output paths (frontmatter + body),
  state.md ledger update, failure-mode table.
- `scripts/enforce-packshot.py` — the deterministic Amazon gate (Pillow, no model):
  flatten onto EXACT RGB(255,255,255), 8-point corner/edge sample (254 fails), ≥85%
  bbox frame-fill with re-crop/re-pad (never upscales-invents pixels), ≥1600px long-side
  check, 1:1 square, metadata-stripped sRGB JPEG, JSON verdict. Exit 0 pass / 3
  written-but-gate-failed / 2 usage. **Host-verified** on synthetic fixtures (off-white
  250→255 flatten, small-product recrop to ≥0.85, low-res FLAG, metadata strip).
- `scripts/packshot.sh` — the hero pipeline: Bria RMBG (`--image`, preserve real pixels)
  → `enforce-packshot.py`. Parses `files[0].local_path` (v2.1.0 objects), uses the local
  file (fal URLs expire), `--max-cost` guard. Refuses to substitute a generative
  re-background on RMBG failure (records `blocked` + FLAG). Host-verified with a stubbed
  `ai-gen` end-to-end (compliant hero, pass=true, exit 0).
- `scripts/gen-angles.sh` — the angle generator: caps at 4 (anti-drift SOP, drops extras
  + flags), re-anchors EVERY angle off the approved hero with the preserve clause +
  directional lines, `nano-banana-pro --image <hero> resolution=2K` (positional param),
  runs each angle through `enforce-packshot.py`, and emits `angles-manifest.json` for the
  bot's blocking fidelity-qc step. Host-verified with a stubbed `ai-gen` (5→4 cap, manifest
  valid JSON, per-angle enforce rc recorded).
- `references/amazon-image-spec.md` — the exact main-image rules (exact RGB 255,255,255,
  ≥85% fill, ≥1600px, 1:1, no text/logo/watermark), the **G1881-login-gated FLAG**
  (verify-don't-inherit), the off-white-after-re-save warning, the reflective/metallic/
  fine-text low-confidence class.
- `references/fidelity-discipline.md` — the RMBG-not-generative rule (the PoC finding),
  the verbatim preserve clause, the anti-drift SOP (cap-at-4, re-anchor, directional
  language), the fidelity-qc judging rubric (color/shape/label/surface →
  pass/drift-drop/low-confidence), and the verified ai-gen syntax contract (`--image`→
  `image_url`, positional `resolution=2K`, `files[0].local_path`, ignore `credits_used`).
- `evals/evals.json` — 3 objective-gate evals (compliant pixel-faithful hero; ≤4
  identity-locked QC'd angles; low-res/under-fill snap → deliver + honest FLAG, no
  upscale-invent).
- `evals/rubric.md` + `iteration-charter.md` — 5 vision/judge dimensions (product-fidelity
  0.35, white-bg-purity 0.25, identity-lock 0.20, compliance-correctness 0.10,
  fidelity-honesty 0.10; sum 1.00), target_score 0.85, publish_threshold 0.80,
  stuck_window 10.

### Decisions
- The HERO is deterministic (RMBG + Pillow), NOT generative — the single most important
  design decision, driven directly by the build PoC (mug → luggage-tag hallucination).
  A generative model is never allowed to re-background the seller's real product for the
  compliant main image; it is reserved for angles (with a blocking QC gate) and optional
  QC-gated cleanup only.
- `enforce-packshot.py` re-crops/re-pads to hit ≥85% fill but NEVER upscales the product
  pixels — a low-res snap is FLAGGED honestly, never faked to res_ok.
- `gen-angles.sh` emits a manifest rather than calling Claude itself: fidelity-qc needs a
  vision model the bot runs in-session, so the blocking drop/flag is the bot's step, kept
  out of the deterministic script (offline-iterate, sandbox-confirm).
