---
skill: bot-022-lifestyle-composer
target_score: 0.85
publish_threshold: 0.80
stuck_window: 10
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. The media dimensions grade the ACTUAL
# shipped scene JPEGs against the approved hero (judge_model must be vision-capable;
# keyless host-session vision per stage-4-test.md). Identity-vs-hero is the load-bearing
# dimension: a scene that drifts the product is a failure no matter how pretty the scene.
dimensions:
  - id: product-identity-vs-hero
    weight: 0.40
    source: media-judge
    jtbd_source: JTBD-3
    media_glob: "03-scenes/*.jpg"
    judge_prompt: |
      For each shipped scene, view the actual JPEG and compare the PRODUCT against
      01-hero/hero.jpg (the approved anchor). Judge ONLY the product, not the scene.
      Score 0-10: is it the SAME product — same color, shape/proportions, label/printed
      text/logo, and material/surface? A generative model sometimes hallucinates a
      DIFFERENT product that shares only a color or motif (e.g. a mug rendered as a
      luggage tag) — that is the failure this dimension exists to catch.
      10 = every shipped scene is unmistakably the same product as the hero, label and
      shape intact. 5 = mostly the same product but one scene drifts on shape/label/color
      or invents a detail the real product lacks. 0 = a shipped scene shows a different
      product, or the label/shape is garbled/changed.

  - id: scene-realism-and-composition
    weight: 0.25
    source: media-judge
    jtbd_source: JTBD-3
    media_glob: "03-scenes/*.jpg"
    judge_prompt: |
      View each shipped scene JPEG. Score 0-10 as believable commercial lifestyle
      photography: the product sits naturally in the setting with correct scale, contact
      shadow, and lighting; NO halo / cutout edge artifacts around the product; the
      requested aspect is respected (or its mismatch is flagged); negative space is left
      for copy on banner/ad aspects; it reads as a real photo, not obvious AI-slop.
      10 = every scene is a believable, well-composed lifestyle shot with no halo/edge
      artifacts. 5 = readable lifestyle scenes but one has a visible halo/edge artifact,
      a scale/shadow error, or an over-staged synthetic look. 0 = pasted-on cutouts,
      heavy halos, wrong scale, or incoherent scenes.

  - id: brand-consistency
    weight: 0.15
    source: media-judge
    jtbd_source: JTBD-3
    media_glob: "03-scenes/*.jpg"
    judge_prompt: |
      View the shipped scenes as a set (and the brand-look reference if one was
      attached). Score 0-10 on-brand consistency: the palette and mood are coherent
      across the set and (when a brand-look ref was used) match it; any logo/mark is
      legible and correct (not garbled); typography is kept OFF the scene unless on the
      product itself.
      10 = a cohesive on-brand set; any mark is legible and correct. 5 = mostly coherent
      but the palette wanders across scenes or a mark is slightly off. 0 = inconsistent
      palette/mood across the set, or a garbled logo shipped as if correct.

  - id: qc-gate-and-honesty
    weight: 0.20
    source: llm-judge
    jtbd_source: failure-mode:JTBD-3
    judge_prompt: |
      Cross-check scenes-log.md and the work/scenes/*.qc.json verdicts against the
      shipped 03-scenes/ files. Score 0-10 on the blocking QC gate + production honesty:
      every shipped scene has a fidelity-qc verdict of pass or review (NEVER a drifted
      output shipped); a drift was regenerated once then dropped+flagged (not silently
      shipped); reflective/metallic/fine-text outputs are flagged review for human
      review, never certified; the log lists per scene the preset, model, prompt, aspect,
      and QC verdict; cost is from estimate/balance, not credits_used; no auto-upload.
      10 = the QC gate held and the log is a faithful production record. 5 = mostly
      faithful but one flag (a held output, a halo, a review class) went unmentioned, or
      a low-confidence pass was not downgraded. 0 = a drifted output was shipped, the QC
      gate was skipped, or the log contradicts the artifacts.

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-022-lifestyle-composer/iteration-charter.md
    - bot/skills/bot-022-lifestyle-composer/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: product drifts → strengthen the verbatim Line-1 identity
  clause and REDUCE scene complexity (one setting, few props) in references/scene-presets.md
  BEFORE touching the script; never paraphrase Line 1. Halo/edge artifacts → prefer the
  RMBG cutout as the --image source and stay on nano-banana-pro (Seedream over-saturates
  at high guidance).
- Constraints not in the rubric: this is the GENERATIVE path — fidelity-qc is BLOCKING,
  a drifted output is NEVER shipped to complete a set; reflective/metallic/fine-text is a
  forced human-review class; the compliant Amazon main image is the deterministic
  white-bg path, never this skill. Generation costs fal credits — prefer fixing prompts
  over regenerating sets; never use the CLI default model (always pass -m).
