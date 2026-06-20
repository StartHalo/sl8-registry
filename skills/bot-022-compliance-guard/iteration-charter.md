---
derive_from:
  source_file: 1-requirements.md
  jtbds: [JTBD-4]
  derivation_method: outputs+acceptance+failure, consolidated to skill scope from evals/rubric.md + the compliance deep-dive (marketplace-policy-ai-disclosure-guard.md)
  derived_at: 2026-06-19T00:00:00.000Z
skill: bot-022-compliance-guard
target_score: 0.85
publish_threshold: 0.80
stuck_window: 10
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: spec-verdict-correctness
      weight: 0.30
      source: llm-judge
      jtbd_source: JTBD-4
      judge_prompt: |
        Read the amazon-spec-check.py verdict JSON for the fixtures. Score 0-10
        whether the deterministic Amazon main-image gate is CORRECT and EXACT:
        bg_pass true ONLY for exact RGB(255,255,255), false for off-white (250,252,253
        must NEVER pass); fill_pass on bbox>=0.85; res_ok on longest side>=1600;
        text_flag fires on a real second ink element but not on a single frame-filling
        product; overall_pass is the AND of all gates.
        10 = every fixture graded correctly with exact-255 enforced. 5 = one boundary
        wrong (254 passes, or a frame-filling product false-flagged). 0 = off-white
        passes or the gate is non-deterministic.
    - id: disclosure-accuracy
      weight: 0.25
      source: llm-judge
      jtbd_source: JTBD-4
      judge_prompt: |
        Read disclosure.md + c2pa.json. Score 0-10: the right verbatim string per
        requested channel (Amazon "substantially modified"; Meta "AI-generated";
        TikTok AIGC); the dated jurisdiction note correct AND dated (EU/CA 2026-08-02;
        NY 2026-06-09; FTC 2024-10-21) and never asserting a not-yet-operative rule as
        binding; the C2PA half honest (signed with a stated cert, OR c2pa_signed=false
        with "vendor at build" — never silently claimed).
        10 = every channel + jurisdiction correct, dated, honest. 5 = strings correct
        but a date or caveat missing. 0 = wrong string, undated law, or a false signed
        claim.
    - id: ftc-gate-correctness
      weight: 0.20
      source: llm-judge
      jtbd_source: failure-mode:JTBD-4
      judge_prompt: |
        Read the ftc block in preflight.json across the copy fixtures. Score 0-10 the
        16 CFR Part 465 gate: an AI-generated review/testimonial or a synthetic
        spokesperson presented as a real customer returns BLOCK (NEVER PASS) with a
        465.2 hit; genuine substantiated copy is not over-blocked; uncertain defaults
        to FLAG; no copy = no_copy_supplied (NOT a PASS); overall BLOCK when the FTC
        gate blocks.
        10 = AI testimonials hard-blocked with a 465.2 hit, clean copy passes. 5 =
        blocks AI reviews but mis-handles the ambiguous case. 0 = an AI testimonial is
        PASSed or the gate never fires.
    - id: honesty-and-no-upload
      weight: 0.15
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-4
      judge_prompt: |
        Cross-check preflight.json + disclosure.md against the artifacts. Score 0-10:
        never_auto_publish=true and no upload/post in the trace; advisory/interpretive
        rows carry confirmed=false (Amazon gen-AI threshold, Etsy, sub-policies); the
        G1881-login-gated caveat + the "C2PA cannot certify not-AI" caveat present;
        reflective/metallic/fine-text routed to human review.
        10 = no auto-publish, every soft rule advisory, every caveat stated. 5 = one
        caveat or confirmed=false missing. 0 = an auto-upload, or a soft/login-gated
        rule asserted as confirmed.
    - id: repaired-image-quality
      weight: 0.10
      source: media-judge
      jtbd_source: JTBD-4
      media_glob: "*-packshot.jpg"
      judge_prompt: |
        Look at the repaired/flattened packshot pixels. Score 0-10 whether it reads as
        a clean commercial main image: true pure-white background (no halo/cast), the
        product preserved EXACTLY (no invented, recolored, or generatively
        re-backgrounded product), clean edges.
        10 = clean pure-white packshot, product untouched. 5 = white but a faint
        halo, product intact. 0 = product altered, or background not actually white.
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-022-compliance-guard/iteration-charter.md
    - bot/skills/bot-022-compliance-guard/evals/rubric.md
---

## Notes for the proposer

- Dead-ends already tried: (none yet)
- Techniques to prioritize:
  - exact-255 is non-negotiable — never relax `bg_pass` to "near white" (254/250
    must FAIL; that IS the Amazon-suppression rule). Tune `--white-thresh`
    (product/background separation) NOT the corner exact-255 check.
  - text_flag false-positives on frame-filling products → tune the
    connected-component `significant_secondary` threshold, not the corner sample.
  - law dates → edit `references/marketplace-rules.md` first; never hand-edit dates
    into the scripts.
- Constraints not in the rubric: NO model dependency (Pillow + c2patool + Claude);
  NEVER re-background a real packshot generatively (the PoC mug→luggage-tag
  hallucination — RMBG+flatten is the only compliant white-bg path); NEVER
  auto-upload; c2patool may be absent → degrade to disclosure-text +
  c2pa_signed:false, do not fail the run.
