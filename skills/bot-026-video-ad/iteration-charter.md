---
derive_from:
  source_file: 1-requirements.md
  jtbds: [JTBD-1, JTBD-2]
  derivation_method: outputs+acceptance+failure, consolidated to skill scope from evals/rubric.md + the product-video-ad deep-dive (2026-06-20)
  derived_at: 2026-06-20T00:00:00.000Z
skill: bot-026-video-ad
target_score: 0.85
publish_threshold: 0.80
stuck_window: 10
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: product-identity-vs-input
      weight: 0.35
      source: media-judge
      jtbd_source: JTBD-1
      media_glob: "01-ad/base.mp4"
      judge_prompt: |
        View the clip's frames (sampled across the duration) next to inputs/hero.jpg.
        Score 0-10 on whether it is the SAME PRODUCT — color/finish, shape/proportions,
        material — across the whole clip, with NO swap to a different object and no
        invented detail. 10 = indistinguishably the same product throughout. 5 = same
        product but one attribute drifts mid-clip unflagged. 0 = a different/invented
        product (the luggage-tag failure), wrong color, or fabricated detail.
    - id: motion-safety-no-artifacts
      weight: 0.25
      source: media-judge
      jtbd_source: JTBD-1
      media_glob: "01-ad/base.mp4"
      judge_prompt: |
        View the clip in sequence. Score 0-10: exactly ONE slow camera move, no melted
        geometry, jitter, morphing edges, compression mush, flicker, or spawned
        objects; 9:16 vertical. 10 = smooth single-move artifact-free clip. 5 = mostly
        clean but a brief warp / too-busy move. 0 = melted geometry / heavy jitter / an
        aggressive move that destabilized the product.
    - id: logo-label-stability
      weight: 0.20
      source: media-judge
      jtbd_source: JTBD-2
      media_glob: "01-ad/base.mp4"
      judge_prompt: |
        Watch the logo/label across the whole clip. Score 0-10 on stability: logo and
        label text stay sharp, placed, and unwarped from first to last frame — no
        garbled/melted/drifting/invented text (judge the motion, not one frame). 10 =
        rock-stable and legible throughout. 5 = legible but softens/drifts during the
        move. 0 = garbled/melted/invented text or a morphing logo.
    - id: audio-and-format
      weight: 0.10
      source: media-judge
      jtbd_source: JTBD-1
      media_glob: "01-ad/base.mp4"
      judge_prompt: |
        Score 0-10 on deliverable basics: requested in-pass audio present and clean
        (room tone / ambience, no jarring artifact); valid 9:16 mp4 of the requested
        duration; reads as an ad clip. 10 = clean audible correctly-formatted clip. 5 =
        correct format but thin/absent audio that was honestly flagged. 0 = wrong
        aspect, broken file, or a jarring audio artifact presented as fine.
    - id: qc-honesty-and-discipline
      weight: 0.10
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: |
        Cross-check video-qc.md + *.note.json vs the artifacts. Score 0-10 on honesty:
        every clip has a verdict (pass/drift-dropped/low-confidence) with a reason;
        drift DROPPED not shipped; variants fanned out ONLY after the base passed QC,
        one variable each; aggressive moves auto-substituted + recorded;
        reflective/metallic/fine-text flagged → human review; no auto-publish; clip from
        files[0].local_path, credits_used not trusted. 10 = a faithful production log.
        5 = a drift/low-confidence class went unflagged. 0 = the report contradicts the
        frames (claims identity the frames deny, or fans out off a failed base clip).
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-026-video-ad/iteration-charter.md
    - bot/skills/bot-026-video-ad/evals/rubric.md
---

## Notes for the proposer

- Dead-ends already tried: (none yet)
- The load-bearing rule (do NOT propose around it): the reachable i2v models have NO
  geometry lock — identity is held by the strict-product prompt (ONE slow safe move) +
  the BLOCKING video-qc, never by the model. If product-identity scores low, first
  confirm the start frame attached (Seedance `--image`→image_url; Kling needs positional
  `start_image_url`) and that no aggressive move slipped past motion-prompt.py.
- Techniques to prioritize: melted geometry / warped logo → slow the move (push-in or
  static) + verify the aggressive-move substitution BEFORE touching gen-video.sh; Kling
  product-mismatch → the start frame did not forward, prefer Seedance; variant drift →
  confirm each variant re-anchored off the SAME hero and the base clip passed QC first.
- Constraints: video is the most expensive op (confirm base PASSES before fan-out); fal
  URLs expire (use files[0].local_path); ignore credits_used (read balance deltas);
  video-qc is BLOCKING — never ship a drifted clip; never auto-publish.
