# Changelog — bot-024-tryon-studio

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Planned
- Full E2E sandbox confirmation on a real seller flat-lay + model pair (the host build
  validated `bash -n` / `py_compile` and the JSON-parse helpers; the FASHN/Leffa
  named-arg forwarding via `ai-gen run <slug> KEY=VALUE` is the riskiest line and is not
  yet sandbox-confirmed for this exact `tryon.sh` wiring — smoke-test the slug at build).
- Validate that tryon-qc reliably catches *fabric/fit flattery* (the misrepresentation
  gate) vs merely cosmetic defects — confirm against real accurate-vs-flattered pairs.
- Wire tryon-qc verdicts back into a batch loop with automatic regenerate-once-then-drop
  on `drift` (today the script emits the verdict + the SKILL performs the drop/escalate).
- Verify a fal mirror of FASHN Consistent Models / Product-to-Model before un-parking
  native catalog face-consistency (currently approximated via one nano-banana-pro --ref).

## [v1.0.0] — 2026-06-20
### Added
- Initial authoring of the core skill (BDLC Author activity, BOT-024 Full Build). Covers
  the JTBD: turn a flat-lay/ghost-mannequin garment + a model photo into accurate,
  catalog-ready on-model shots with fabric/print/fit preserved — auto-QC'd, upscaled, and
  never flattering fit or fabric beyond the real garment.
- `SKILL.md` — the architecture: the transfer is the DEDICATED VTON path
  (`fal-ai/fashn/tryon/v1.6` primary, `fal-ai/leffa/virtual-tryon` fallback) called with
  REQUIRED named args `garment_image` + `model_image` via `ai-gen run <slug> KEY=VALUE`
  (NOT `--image`); EVERY try-on passes a BLOCKING tryon-qc vision compare against the real
  garment (fidelity + a separate flattery/misrepresentation gate); upscale only AFTER QC;
  the general-model nano-banana-pro path is a fabric-locked fallback only. Headless
  defaults, required-input gate (garment + model), declared output paths, state.md ledger
  update, failure-mode table. Description carries no angle brackets (skills-publish rule).
- `scripts/tryon.sh` — the try-on call: `ai-gen run fal-ai/fashn/tryon/v1.6
  garment_image=… model_image=… category=… mode=…` with FASHN-specific optionals, Leffa
  fallback (`human_image_url` + `garment_image_url`, category→garment_type), parses
  `files[0].local_path` (v2.1.0 objects), uses the local file (fal URLs expire), writes a
  `.meta.json`, `--max-cost` guard. Refuses to pass a general re-render off as a transfer.
- `scripts/fabric-inject.py` — builds the named-fabric-lock prompt for the general-model
  fallback ONLY: fabric BEFORE style + the APIYI preserve clause; REQUIRES a declared
  fabric and rejects generic terms (`fabric`/`clothing`/`shirt`/…) with exit 2 — the bot
  asks the seller, never invents fabric. Pure string work, no Pillow.
- `scripts/tryon-qc.py` — the BLOCKING gate: a Claude vision compare of the on-model
  output vs the real garment on fabric/print/color/trim/cut_fit/realism, returning
  pass / drift / **flatter** / review. The `flatter` verdict is the misrepresentation
  gate (fabric upgraded, fit slimmed, hem lengthened) and is blocking like drift. Exit
  0/3/4/5 (pass/review/drift/flatter), 2 on no-verdict (block as review). Image paths
  passed to the claude CLI (no pixel decode → no Pillow).
- `scripts/upscale.sh` — lifts a QC-passed sub-2K try-on (FASHN 864x1296 / Leffa
  768x1024) to a marketplace target via `fal-ai/clarity-upscaler` (positional
  `scale_factor=`); copies through if already at target; on upscale failure delivers the
  native-resolution QC-passed image + FLAGS the shortfall (never withholds). Pillow
  self-bootstrap for the long-side read.
- `references/models.md` — the try-on stack, the verified `ai-gen run` named-arg contract
  (the riskiest line), output/cost handling, the PARKED first-party FASHN gap
  (Consistent Models / Product-to-Model / Model Swap — api.fashn.ai only), and the
  cat-vton "Research only" EXCLUSION.
- `references/tryon-discipline.md` — fabric-before-style (the ~8/10-vs-~3/10 lever), the
  IMAGE_SAFETY mannequin/dress-form reframe fallback for apparel/swimwear, the blocking
  tryon-qc rubric (drift vs the flatter misrepresentation gate), and the
  don't-mislead-returns guardrail from the Vinted/BBC dropship-scam backlash.
- `evals/evals.json` — 3 objective-gate evals (FASHN named-arg transfer + QC + upscale;
  the flattery/misrepresentation gate catches a slimmed/upgraded/lengthened garment;
  IMAGE_SAFETY swimwear + missing-fabric honesty).
- `evals/rubric.md` + `iteration-charter.md` — 4 vision/judge dimensions
  (garment-fidelity 0.40, no-flattery 0.25, on-model-realism 0.20, qc-honesty 0.15; sum
  1.00), target_score 0.85, publish_threshold 0.80, stuck_window 10.

### Decisions
- The transfer is the DEDICATED VTON path called with NAMED args via `ai-gen run`, NOT a
  general `--image` re-render — the single most important design decision, because the
  reachable general models have no fidelity lock and would re-imagine the garment.
- The `flatter` verdict is a FIRST-CLASS, blocking verdict distinct from `drift` — a
  flattered-but-pretty try-on is the dangerous output (the returns/fraud axis), so it is
  graded separately from cosmetic defects and escalated, never shipped.
- Upscale runs AFTER QC only — never upscale a drifted/flattered image (it would just
  produce a high-res misrepresentation).
- Native catalog face-consistency (FASHN Consistent Models) is PARKED (first-party
  api.fashn.ai only, not confirmed on fal) and approximated by re-attaching one
  nano-banana-pro `--ref` model image; the face-drift ceiling is flagged, never hidden.
- `cat-vton` is EXCLUDED (fal lists it "Research only" — license risk for a shippable
  commercial bot).
