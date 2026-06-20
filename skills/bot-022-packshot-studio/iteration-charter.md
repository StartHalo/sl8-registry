---
derive_from:
  source_file: 1-requirements.md
  jtbds: [JTBD-1, JTBD-2]
  derivation_method: outputs+acceptance+failure, consolidated to skill scope from evals/rubric.md + research/poc-reachability.md (2026-06-19)
  derived_at: 2026-06-19T00:00:00.000Z
skill: bot-022-packshot-studio
target_score: 0.85
publish_threshold: 0.80
stuck_window: 10
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: product-fidelity-vs-snap
      weight: 0.35
      source: media-judge
      jtbd_source: JTBD-1
      media_glob: "01-hero/hero.jpg"
      judge_prompt: |
        View the hero (and any angle) JPEG next to inputs/snap. Score 0-10 on whether
        it is the SAME PRODUCT — color/finish, shape/proportions, label/text, surface —
        with NO invented detail. 10 = indistinguishably the same product. 5 = same
        product but one attribute drifted unflagged. 0 = a different/invented product
        (the PoC luggage-tag failure), wrong color, or fabricated detail.
    - id: white-bg-purity-and-frame
      weight: 0.25
      source: media-judge
      jtbd_source: JTBD-1
      media_glob: "01-hero/hero.jpg"
      judge_prompt: |
        View the hero. Score 0-10 on commercial main-image quality: clean true-white
        sweep (no halo/cast at the edge), well-centered ~85%+ fill without touching
        edges, 1:1, clean cutout. 10 = upload-ready studio packshot. 5 = compliant but a
        halo / off-center / loose crop. 0 = visible non-white bg, heavy fringing, or
        product touching the edges.
    - id: identity-lock-across-angles
      weight: 0.20
      source: media-judge
      jtbd_source: JTBD-2
      media_glob: "02-angles/"
      judge_prompt: |
        View the angles against the approved hero. Score 0-10 on identity-lock: every
        shipped angle is the same product as the hero (color/proportions/label/material
        hold); only the camera moved; no drift. 10 = a coherent catalog set. 5 = mostly
        consistent but one angle drifts or the camera move is wrong. 0 = different
        products / heavy drift / invented detail across the set.
    - id: compliance-correctness
      weight: 0.10
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-1
      judge_prompt: |
        Read compliance.json (hero + angles). Score 0-10: bg_pass==true with all 8
        samples exactly [255,255,255] (254/250 must fail); fill >= 0.85; res_ok OR an
        honest resolution FLAG; 1:1; metadata-stripped JPEG. 10 = every property correct
        with honest flags. 5 = a gate value missing or a near-white slipped through. 0 =
        no compliance.json, off-white reported as passing, or fabricated res_ok.
    - id: fidelity-honesty-and-discipline
      weight: 0.10
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: |
        Cross-check fidelity-qc.md vs the artifacts. Score 0-10 on honesty: hero
        labelled PIXEL-FAITHFUL (deterministic path, no generative re-background); every
        generated angle has a verdict (pass/drift-dropped/low-confidence) with a reason;
        drift DROPPED not shipped; reflective/metallic/fine-text flagged → human review;
        >4 cap + resolution/fill shortfalls flagged; no auto-upload. 10 = a faithful
        production log. 5 = a drift/low-confidence class went unflagged. 0 = the report
        contradicts the pixels (claims fidelity the pixels deny).
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-022-packshot-studio/iteration-charter.md
    - bot/skills/bot-022-packshot-studio/evals/rubric.md
---

## Notes for the proposer

- Dead-ends already tried: (none yet)
- The load-bearing rule (do NOT propose around it): the compliant HERO is DETERMINISTIC
  — Bria RMBG on the real snap → Pillow exact-255 flatten. NEVER a generative
  re-background (PoC: a generative edit turned a mug into a luggage tag). If fidelity
  scores low, first confirm the hero did not route through a generative edit.
- Techniques to prioritize: angle drift → tighten the preserve clause in
  references/fidelity-discipline.md + verify the angle re-anchored off the APPROVED hero
  (not the snap or a prior angle) BEFORE touching gen-angles.sh; white-bg halo → the RMBG
  cutout edge, not the Pillow flatten (inspect work/hero/ cutout); exact-255 failures →
  deterministic, so a fail means the flatten was skipped or an alpha matte leaked through.
- Constraints: generation costs fal credits and fal URLs expire (use files[0].local_path,
  ignore credits_used, read balance deltas); cap angles at 4; fidelity-qc is BLOCKING.
