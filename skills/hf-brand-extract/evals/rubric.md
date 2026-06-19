---
skill: hf-brand-extract
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# hf-brand-extract is a STRUCTURAL skill (an optional onboarding asset). It produces a brand BLOCK
# in context.md + provenance files, not rendered pixels — so there is NO media-judge dimension.
# All dimensions read context.md, brand-capture.json, and the cutout file. Weights sum to 1.00.
# Dimensions trace to 1-requirements.md JTBD rows (the brand-kit precondition shared by JTBD-1..4).
dimensions:
  - id: brand-block-completeness
    weight: 0.30
    jtbd_source: JTBD-1
    judge_prompt: |
      Read artifacts/<project>/context.md. Score 0-10 on the '## Brand' block being complete and in
      the exact shape concept/build read: it has accent (a 6-digit hex), accentAlt (a 6-digit hex),
      fontPack (exactly one of modern|editorial|bold|tech), and a short label; plus a logo: line when a
      cutout was produced and a source: line for provenance. An existing '## Brand' section is MERGED
      (replaced in place), not duplicated.
      10 = all four core fields present + correct shape (+ logo/source as available). 5 = present but
      missing one field or malformed (e.g. a 3-digit hex, fontPack not in the set). 0 = no brand block,
      or the keys are not the ones concept/build read.

  - id: derived-not-invented
    weight: 0.30
    jtbd_source: JTBD-1
    judge_prompt: |
      Compare the brand block against artifacts/<project>/assets/captures/brand-capture.json. Score
      0-10 on the kit being DERIVED from the capture, not fabricated: the accent + accentAlt are real
      colors that appear in brand-capture.json (and the accent is a saturated brand color, not body
      grey / pure black / pure white); the label comes from the captured name/title/domain. On an
      unreachable source, NOTHING is invented (no '## Brand' block, the failure is recorded in state.md).
      10 = every field traces to the capture (or a clean no-invention failure). 5 = colors trace but the
      accent is a neutral, or accentAlt is a plausible derived shade not in the capture. 0 = invented
      colors/fonts not in the capture, or a fabricated kit on an unreachable source.

  - id: runtime-safe-fonts
    weight: 0.20
    jtbd_source: JTBD-1
    judge_prompt: |
      Score 0-10 on the fontPack being render-safe. The chosen pack must map to the runtime-supported
      families only (Inter, Outfit, Anton, Fraunces, Space Grotesk — plus DejaVu/Comic-Neue), per the
      step-3 mapping table; never a CDN-only font and never a var() family (the build's lint cannot
      resolve var()). The captured fonts should map to the nearest pack (clean sans -> modern; serif ->
      editorial; heavy display -> bold; technical geometric -> tech).
      10 = a runtime-supported pack chosen and the mapping is sensible for the captured fonts. 5 = a
      runtime-supported pack but a questionable mapping. 0 = a non-runtime font family written into the
      block, or a var()/CDN family.

  - id: logo-cutout-and-resilience
    weight: 0.20
    jtbd_source: JTBD-3
    judge_prompt: |
      Score 0-10 on the logo cutout + failure resilience. When a logo was found, a transparent PNG
      exists at artifacts/<project>/assets/cutouts/logo.png (produced by ai-gen bria — files[].local_path,
      not a guessed path) and the block has a logo: line. When bria is unavailable/returns success:false,
      the cutout is skipped, the logo: line is omitted (no fabricated path), and the brand block is STILL
      written (accent/accentAlt/fontPack/label) — the whole extract is not failed over a missing cutout.
      No HeyGen auth/cloud is used anywhere.
      10 = transparent cutout when available, graceful omission + kept block when not. 5 = cutout present
      but a missing-bria run failed the whole extract, or a non-transparent matte. 0 = a fabricated logo
      path, or HeyGen auth/cloud used.

guardrails:
  must_pass:
    - smoke_install
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/hf-brand-extract/evals/rubric.md
    - bot/skills/hf-brand-extract/scripts/bg-remove.sh
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- This is a NON-visual skill — do not add a media-judge dimension; there is no rendered MP4 here. The
  brand block is graded as text/JSON + the transparency of the one logo PNG.
- The two failure paths matter as much as the happy path: (1) an unreachable capture source must be a
  clean recorded failure with NO invented kit (reachability gate); (2) a failed bria must still leave a
  valid brand block (accent/accentAlt/fontPack/label) minus the logo line. Both are in the rubric.
- Keep the brand keys EXACTLY `accent / accentAlt / fontPack / label` (the BOT-014 brand-kit keys) — that
  is the contract concept (`01-concept.md`) and build (`hf-build`) read; renaming them breaks downstream.
- ai-gen v2 quirks (keep): `ai-gen run` takes a POSITIONAL model id; read files[0].local_path from the
  JSON (the matte lands at ~/artifacts/remove-<ts>.png, not a guessed path); trust pricing_api over
  credits_used for cost.
