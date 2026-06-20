---
skill: bot-022-packshot-studio
target_score: 0.85
publish_threshold: 0.80
stuck_window: 10
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. The media dims grade the ACTUAL output
# JPEGs viewed against the original snap (judge_model must be vision-capable; keyless
# host-session vision per stage-4-test.md). The compliance dim reads compliance.json.
dimensions:
  - id: product-fidelity-vs-snap
    weight: 0.35
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "01-hero/hero.jpg"
    judge_prompt: |
      View the hero (and any angle) JPEG next to the original inputs/snap. Score 0-10
      on whether it is the SAME PRODUCT as the snap — color/finish, shape/proportions,
      label/text, and surface/material all match, with NO invented reflection, texture,
      prop, or detail the real product lacks. This is the #1 dimension — it is the
      answer to "Color Not as Described".
      10 = indistinguishably the same product; a buyer would not be surprised on
      arrival. 5 = clearly the same product but one attribute drifted (a slightly
      shifted color, a softened label) without a flag. 0 = a different/invented product
      (the PoC luggage-tag failure), wrong color, or fabricated detail.

  - id: white-bg-purity-and-frame
    weight: 0.25
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "01-hero/hero.jpg"
    judge_prompt: |
      View the hero. Score 0-10 on commercial main-image quality: the background reads
      as a clean true-white sweep (no halo, no gradient, no color cast at the product
      edge); the product is well-centered and fills the frame generously (~85%+) without
      touching the edges; 1:1 square; clean cutout edges.
      10 = a crisp studio packshot, ready to upload. 5 = compliant but a visible halo,
      an off-center product, or a slightly loose/tight crop. 0 = visible non-white
      background, heavy halo/fringing, or the product touching/cropped at the edges.

  - id: identity-lock-across-angles
    weight: 0.20
    source: media-judge
    jtbd_source: JTBD-2
    media_glob: "02-angles/"
    judge_prompt: |
      View the angle JPEGs in sequence against the approved hero. Score 0-10 on
      identity-lock: every shipped angle is the SAME product as the hero — color,
      proportions, label position, and material hold across the set; the camera moved
      (side/top/3-4) but nothing else did; no angle drifted to a different look.
      10 = a coherent catalog set of one product from several angles. 5 = mostly
      consistent but one angle drifts in color/proportion or the requested camera move
      is wrong. 0 = angles look like different products, heavy drift, or invented detail
      across the set.

  - id: compliance-correctness
    weight: 0.10
    source: llm-judge
    jtbd_source: acceptance-scenario:JTBD-1
    judge_prompt: |
      Read compliance.json (hero + each angle). Score 0-10 on the deterministic gate:
      bg_pass==true with all 8 samples exactly [255,255,255] (a 254/250 must fail);
      fill >= 0.85; res_ok (long side >= 1600px) OR an honest resolution FLAG when the
      snap lacked the pixels; 1:1 square; metadata-stripped JPEG.
      10 = every property recorded and correct, with honest flags where a gate could not
      be met from the input. 5 = compliant but a gate value is missing or a near-white
      sample slipped through unflagged. 0 = no compliance.json, an off-white background
      reported as passing, or a fabricated res_ok on a low-res input.

  - id: fidelity-honesty-and-discipline
    weight: 0.10
    source: llm-judge
    jtbd_source: failure-mode:JTBD-1
    judge_prompt: |
      Cross-check fidelity-qc.md against the artifacts. Score 0-10 on honesty: the hero
      is labelled PIXEL-FAITHFUL via the deterministic RMBG+flatten path (no generative
      re-background claimed); EVERY generated angle has a fidelity-qc verdict
      (pass/drift-dropped/low-confidence) with a reason; drifted angles are DROPPED, not
      shipped; reflective/metallic/fine-text products are flagged low-confidence → human
      review; the >4-angle cap and any resolution/fill shortfall are flagged; nothing is
      claimed that the artifacts contradict; no auto-upload occurred.
      10 = a faithful, disciplined production log. 5 = mostly honest but a drift or a
      low-confidence class went unflagged, or one angle shipped without a QC verdict.
      0 = the report contradicts the artifacts (claims fidelity that the pixels deny, or
      shows a drifted/different product as passing).

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-022-packshot-studio/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- The load-bearing rule: NEVER let a generative model re-background the real product
  for the compliant hero — the PoC proved it hallucinates (mug → luggage tag). The hero
  is deterministic (Bria RMBG + Pillow flatten). If fidelity scores low, check that the
  hero path did NOT route through a generative edit before blaming the prompt.
- Techniques to prioritize: low product-fidelity on angles → tighten the preserve clause
  + confirm the angle re-anchored off the APPROVED hero (not the snap); low white-bg
  purity → the issue is usually the RMBG cutout edge (halo), not the Pillow flatten —
  inspect work/hero/rmbg cutout; compliance failures on exact-255 → the gate is
  deterministic, so a fail means the flatten was skipped or the source had an alpha matte.
- Constraints not in the rubric: generation costs fal credits and outputs expire — prefer
  fixing prompts over regenerating; cap angles at 4; ignore credits_used (read balance
  deltas). fidelity-qc is BLOCKING — never ship a drifted generated image.
