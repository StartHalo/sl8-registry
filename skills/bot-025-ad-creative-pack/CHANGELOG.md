# Changelog — bot-025-ad-creative-pack

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Planned
- Full E2E sandbox confirmation on a real seller hero + bullets (host authoring used the
  verified ai-gen syntax contract; the deterministic Pillow paths — `resize-variants.py`,
  `brand-kit.py` — are host-verifiable, the fal text-model calls are not yet
  sandbox-confirmed for this exact `gen-graphic.sh` wiring).
- Smoke-test the `ideogram/v4` slug live (the top build risk — KB recorded
  `fal-ai/ideogram/v3` "Application not found" in April 2026); confirm the
  `rendering_speed=` / Recraft `colors=`+`style=` forwarded-arg syntax on ai-gen 2.1.0.
- Wire the legibility/fidelity verdicts back into the scripts as an automated drop (today
  `gen-graphic.sh` writes the surface + provenance and the bot performs the blocking
  legibility/fidelity QC + drop).
- Optional editable-SVG comparison-chart path via `fal-ai/recraft/v4/text-to-vector`
  (documented in `ad-templates.md` §2 but not yet a default surface).

## [v1.0.0] — 2026-06-20
### Added
- Initial authoring of the core skill (BDLC Author activity, BOT-025 Full Build). Covers
  the deep-dive JTBD: from a product photo + feature bullets + a brand kit, generate a
  pack of legible-text listing & ad graphics (benefit graphic, comparison chart, Amazon
  A+ modules, Meta 1:1/4:5 + TikTok 9:16 variants), each correctly sized and routed
  through compliance-guard — never auto-published.
- `SKILL.md` — the architecture is the routing rule: every text-bearing surface routes to
  a text-specialist model (ideogram/v4 headlines, recraft v3/v4 palette-locked charts +
  SVG, nano-banana-pro text-in-scene + localization); FLUX/Seedream HARD-BLOCKED for
  embedded text. Per-channel sizing is DETERMINISTIC (Pillow from one master). Every final
  creative routes through `bot-022-compliance-guard` (Meta AI-label + C2PA). Headless
  defaults, required-input gate (bullets), declared output paths, state.md ledger update,
  failure-mode table.
- `scripts/gen-graphic.sh` — the routed generator: takes a text-capable slug + prompt +
  optional `--image` hero / `--ref` logo / POSITIONAL `key=value` params
  (rendering_speed=QUALITY, style=, colors=, resolution=), REFUSES any FLUX/Seedream slug
  (exit 2), parses `files[0].local_path` (v2.1.0 objects), writes the surface + raw JSON +
  prompt provenance. Uses the local file (fal URLs expire), `--max-cost` guard.
- `scripts/resize-variants.py` — the DETERMINISTIC per-channel resizer (Pillow, no model,
  self-bootstrap): one master → meta-1-1 1080x1080 / meta-4-5 1080x1350 / tiktok-9-16
  1080x1920 / aplus-std 970x600 / aplus-ovl 970x300, cover-crop or contain-pad, sRGB
  metadata-stripped JPEG, steps quality down to stay under `--max-bytes` (A+ <2MB), emits
  `variants-manifest.json`. Host-verifiable; no generation cost, no text drift.
- `scripts/brand-kit.py` — the brand lock (Pillow self-bootstrap for `stamp`): `resolve`
  turns a brand.json/flags into a Recraft `colors=` palette param + a prepended brand
  clause + a logo `--ref` passthrough + the honest PARTIAL-lock note; `stamp`
  deterministically composites the real logo onto a finished master.
- `references/text-routing.md` — the HARD routing table (model per surface), the
  no-FLUX/Seedream block, the verified ai-gen syntax contract (positional `key=value`,
  `--image`/`--ref`, `files[0].local_path`, ignore `credits_used`), the reachability gate
  + `ideogram/v4` fallback chain (recraft v3 → nano-banana-pro), and the fidelity rule for
  product-bearing surfaces.
- `references/ad-templates.md` — the prompt skeletons (benefit-graphic, comparison-chart,
  A+ module, text-in-scene), the two verbatim practitioner prompts, the master→variants
  flow, and the anti-AI-slop checklist (legibility + non-template).
- `references/compliance-note.md` — the Meta 2026 AI-Content-Label mandate (auto-reject
  without a label), the Amazon A+ hard spec (970×600/970×300, 24px min, RGB, <2MB), the
  honest reach-tax nuance (label to pass policy; no promised % loss), and the per-channel
  handoff to `bot-022-compliance-guard`.
- `evals/evals.json` — 3 objective-gate evals (legible benefit graphic via a text model;
  deterministic per-channel variants at exact sizes; A+ modules to spec + a blocked FLUX
  text route + handoff to the guard, no auto-publish).
- `evals/rubric.md` + `iteration-charter.md` — 5 vision/judge dimensions (text-legibility
  0.35, brand-consistency 0.25, on-channel-sizing 0.20, no-ai-slop-and-fidelity 0.10,
  routing-discipline-and-honesty 0.10; sum 1.00), target_score 0.85, publish_threshold
  0.80, stuck_window 10.

### Decisions
- Text routing is a HARD gate, not a preference — `gen-graphic.sh` refuses FLUX/Seedream
  for text. This is the single most important design decision (text is the deliverable;
  a garbled headline is total failure).
- Per-channel sizing is DETERMINISTIC (Pillow from one master), never per-channel
  regeneration — preserves the exact spelled text and costs zero credits/drift.
- The brand lock is PARTIAL and said so honestly: palette is enforced (Recraft `colors=`);
  font/composition are prompt-level only (the saved kit lives in Recraft Studio, not the
  API). The logo is stamped deterministically by `brand-kit.py stamp`.
- The bot is a checker/generator — every final creative routes through the reused
  `bot-022-compliance-guard` for the Meta AI-label + C2PA; it NEVER auto-publishes.
