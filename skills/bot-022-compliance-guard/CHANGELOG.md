# Changelog — bot-022-compliance-guard

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Planned
- Sandbox-confirm c2patool: smoke-test `c2patool --version` in sl8-video; if absent,
  finalize the `work/bin/` vendoring path (or file an `e2b-templates/requests.md`
  row to bake it into the template) — currently a build-time confirmation.
- Re-validate the dated rule-pack at build (`references/marketplace-rules.md`): EU
  AI Act Art.50 + CA SB 942 pivot on 2026-08-02; confirm any post-2026-08 changes.
- BOT-023 handoff: this v1 is authored under BOT-022; the canonical owner is the
  future BOT-023 (compliance fleet). Promote ownership + the shared
  `fake-review-gate` / `ad-policy-preflight` siblings when BOT-023 is built.
- Optional: real OCR (tesseract) to replace the connected-component text heuristic
  if the sandbox carries it — currently an advisory heuristic, not OCR.

## [v1.0.0] — 2026-06-19
### Added
- Initial authoring of the SHARED compliance-guard skill (BDLC Author activity,
  BOT-022 Full Build; canonical owner is the future BOT-023). Covers JTBD-4: the
  pre-publish marketplace gate — Amazon spec audit/repair + C2PA stamp + per-channel
  disclosure + the multi-channel/FTC linter. NO model dependency (Pillow + c2patool
  + Claude). Derived from the deep-dive
  `marketplace-policy-ai-disclosure-guard.md`.
- `SKILL.md` — phase-4 pre-flight workflow: read-before-write gate, Step 1 Amazon
  spec audit/repair, Step 2 C2PA read+sign + per-channel disclosure, Step 3
  multi-channel linter + FTC gate; declared output paths (frontmatter + body);
  headless failure-mode table; never-auto-upload + exact-255 + no-generative-rebg
  constraints surfaced.
- `scripts/amazon-spec-check.py` — the deterministic core: 8-point corner/edge
  EXACT RGB(255,255,255) sample (254/off-white FAILS), product-bbox ≥85% fill,
  ≥1600px longest side, a connected-component text/logo/watermark/inset heuristic
  (flags a second ink element separate from the product, does NOT mis-flag a
  frame-filling product), and a conservative flatten-to-pure-white + metadata-strip
  repair (never moves/recolors/invents product pixels). Verified on host (Pillow
  12.x) against good / off-white / watermark / transparent-cutout fixtures.
- `scripts/disclosure-stamp.sh` — c2patool READ provenance (`-d`, looks for the
  `trainedAlgorithmicMedia` digitalSourceType marker) + SIGN a Content Credentials
  manifest (`-m manifest.json -f -o`, dev test-cert unless a production key is
  passed) + WRITE `disclosure.md` (verbatim per-channel strings + dated EU/CA/NY
  jurisdiction note). Smoke-tests c2patool, vendors the prebuilt binary into
  `work/bin/` if absent, and degrades to disclosure-text + `c2pa_signed:false` if
  vendoring fails (the disclosure half always ships). Optional Pillow watermark.
- `scripts/multi-channel-lint.sh` — the single PASS/FIX/BLOCK-per-channel verdict
  over Amazon / Etsy / Meta / TikTok / Shopify reading the spec + C2PA result + the
  dated rule-pack, plus the FTC 16 CFR §465.2 fake-review gate (the `claude` CLI
  judge with the verbatim prompt; defaults to FLAG when uncertain or when `claude`
  is absent; never PASSes an AI-generated testimonial; `no_copy_supplied` when no
  copy is given). Emits `preflight.json` with `never_auto_publish:true` and dated,
  `confirmed:false`-flagged advisory rows. Verified end-to-end on host (the FTC
  judge BLOCKed an AI-generated review with a substantive 465.2 hit).
- `references/marketplace-rules.md` — the DATED, sourced rule-pack: Amazon
  main-image spec (G1881 login-gated → UNVERIFIED), Meta/TikTok/Etsy/Shopify labels,
  FTC §465.2 verbatim + the judge prompt, and EU Art.50 / CA SB 942 / NY SB-8420A
  law with dates and penalties; re-validate-at-build markers throughout.
- `references/disclosure-templates.md` — the verbatim per-channel disclosure strings
  emitted into `disclosure.md`, each dated to source with its advisory caveat, plus
  the C2PA manifest shape.
- `evals/evals.json` — 7 objective gates (good=PASS, off-white=FIX, watermark
  text_flag, cutout repair, per-channel disclosure correctness, FTC BLOCK on AI
  review, full pre-flight no-copy) with fixtures under `evals/fixtures/`.
- `evals/rubric.md` + `iteration-charter.md` — 5 judge dimensions (weights sum to
  1.00): spec-verdict-correctness 0.30, disclosure-accuracy 0.25,
  ftc-gate-correctness 0.20, honesty-and-no-upload 0.15, repaired-image-quality
  0.10; target_score 0.85, publish_threshold 0.80, stuck_window 10.
- `evals/fixtures/` — deterministic test images: good-packshot.jpg (pure-white,
  frame-filling), bad-offwhite.jpg (250-bg, small, 800px), watermark.jpg
  (corner logo), cutout-transparent.png (Bria RMBG-style transparent input).

### Decisions
- **No generative re-background of a real packshot.** The PoC showed a generative
  edit hallucinated a different product (mug → luggage tag); the only compliant
  white-bg path is deterministic RMBG + Pillow exact-255 flatten. `bg_pass` false
  on a generated scene is FLAGGED for upstream RMBG/human review, never auto-fixed
  generatively.
- **exact-255, not near-white.** `bg_pass` is exact (255,255,255); 254/250 fail —
  that is precisely the Amazon silent-suppression rule. Tunable separation lives in
  `--white-thresh`, never in the corner sample.
- **Connected-component text heuristic over naive margin density.** A frame-filling
  product (good for ≥85%) was false-flagged by a margin-density check; the
  second-ink-blob approach flags real watermarks/insets without penalizing fill.
- **c2patool is degradable, not load-bearing.** Absent → vendor → else ship the
  disclosure text + `c2pa_signed:false`. The skill never fails on a missing binary.
- **Advisory rows carry confirmed=false.** Amazon's gen-AI threshold (G1881
  login-gated), Etsy's interpretive rule, and channel sub-policies are emitted as
  advisory; the dated law note never asserts a not-yet-operative rule as binding.
