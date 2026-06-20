---
derive_from:
  source_file: pipeline/personas/ecommerce-seller/deep-dives/listing-and-ad-creative-pack.md
  jtbds: [JTBD-1]
  derivation_method: outputs+acceptance+failure, consolidated to skill scope from evals/rubric.md + the deep-dive (2026-06-20)
  derived_at: 2026-06-20T00:00:00.000Z
skill: bot-025-ad-creative-pack
target_score: 0.85
publish_threshold: 0.80
stuck_window: 10
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: text-legibility
      weight: 0.35
      source: media-judge
      jtbd_source: JTBD-1
      media_glob: "0*/*.png"
      judge_prompt: |
        View each generated text surface and READ the on-image text. Score 0-10 on
        legibility: every headline/label/cell word correctly spelled, complete, readable
        at thumbnail; no garbled/duplicated/invented letterforms. 10 = every word crisp
        and correct small. 5 = mostly legible, one label garbled. 0 = a garbled headline
        / pervasive gibberish (the FLUX/Seedream failure the routing rule prevents).
    - id: brand-consistency
      weight: 0.25
      source: media-judge
      jtbd_source: JTBD-1
      media_glob: "0*/*.png"
      judge_prompt: |
        View the surfaces against the brand kit. Score 0-10: brand palette actually
        applied (Recraft colors= / brand clause), type reads as the requested font (or a
        close clean sans — partial lock), logo space/stamp respected. 10 = unmistakably
        on-brand. 5 = palette right, font/logo off. 0 = off-palette, no brand application.
    - id: on-channel-sizing
      weight: 0.20
      source: media-judge
      jtbd_source: JTBD-2
      media_glob: "04-variants/*.jpg"
      judge_prompt: |
        View the variants + variants-manifest.json. Score 0-10: meta-1-1 exactly
        1080x1080, meta-4-5 1080x1350, tiktok-9-16 1080x1920; RGB sRGB under 2MB; key
        text not clipped (contain/pad where needed); deterministic resize preserved the
        master's text. 10 = every channel exact, under size, text intact. 5 = sizes right
        but a crop clips the headline. 0 = wrong dimensions or text re-generated per channel.
    - id: no-ai-slop-and-fidelity
      weight: 0.10
      source: media-judge
      jtbd_source: failure-mode:JTBD-1
      media_glob: "0*/*.png"
      judge_prompt: |
        View the surfaces. Score 0-10 on conversion-grade quality vs AI-slop: varied
        intentional layout (not the centered-icon-row template), real product hero used
        where product-bearing and it is the SAME product (no drift), no invented props/
        text, no template sameness. 10 = polished, varied, product-faithful. 5 = competent
        but template-y / one product-bearing surface drifted. 0 = AI-slop or a drifted product.
    - id: routing-discipline-and-honesty
      weight: 0.10
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-1
      judge_prompt: |
        Cross-check gen provenance + qc.md + the run trace. Score 0-10: every text surface
        routed to a text-capable model and NONE to FLUX/Seedream (gen-graphic.sh refuses);
        qc.md has a per-surface verdict with drops/flags stated; the partial-brand-lock +
        predicted-performance-not-promised caveats present; handed to compliance-guard,
        never auto-published. 10 = correct routing, honest QC, no auto-upload. 5 = routing
        right, a caveat dropped. 0 = text on FLUX/Seedream, an auto-publish, or QC lies.
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-025-ad-creative-pack/iteration-charter.md
    - bot/skills/bot-025-ad-creative-pack/evals/rubric.md
---

## Notes for the proposer

- Dead-ends already tried: (none yet)
- The load-bearing rule (do NOT propose around it): text-bearing surfaces route ONLY to
  text-capable models (ideogram/v4 / recraft v3-v4 / nano-banana-pro). FLUX/Seedream
  garble embedded text — `gen-graphic.sh` refuses them. If legibility scores low, first
  confirm the surface routed to a text model and the prompt said "no spelling errors /
  no garbled text" BEFORE touching the script.
- Techniques to prioritize: low legibility → `rendering_speed=QUALITY` (Ideogram) +
  shorter headline/labels + confirm the fallback chain did not silently drop to a weaker
  engine; sizing fails → deterministic, so a wrong dimension = wrong channel key or a
  clipped crop, switch `--mode cover` ↔ `contain`, never regenerate; brand off → the brand
  clause must be PREPENDED and `colors_param` passed POSITIONAL (font is prompt-level only).
- Constraints: generation costs fal credits + fal URLs expire (files[0].local_path,
  ignore credits_used, balance deltas); per-channel sizing is DETERMINISTIC; product-
  bearing surfaces take a blocking fidelity compare; NEVER auto-publish — hand to
  compliance-guard; the ideogram/v4 slug is the top reachability risk (fallback chain in
  references/text-routing.md §4).
