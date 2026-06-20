---
derive_from:
  source_file: 1-requirements.md
  jtbds: [JTBD-3]
  derivation_method: outputs+acceptance+failure, consolidated to skill scope from evals/rubric.md (2026-06-19 author)
  derived_at: 2026-06-19T00:00:00.000Z
skill: bot-022-lifestyle-composer
target_score: 0.85
publish_threshold: 0.80
stuck_window: 10
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: product-identity-vs-hero
      weight: 0.40
      source: media-judge
      jtbd_source: JTBD-3
      media_glob: "03-scenes/*.jpg"
      judge_prompt: |
        For each shipped scene, view the actual JPEG and compare the PRODUCT against
        01-hero/hero.jpg (the approved anchor). Judge ONLY the product, not the scene.
        Score 0-10: same product — color, shape/proportions, label/text/logo, material?
        A generative model can hallucinate a DIFFERENT product sharing only a color or
        motif (a mug rendered as a luggage tag) — catch that.
        10 = every shipped scene is unmistakably the same product. 5 = one scene drifts
        on shape/label/color or invents a detail. 0 = a different product or garbled
        label/shape shipped.
    - id: scene-realism-and-composition
      weight: 0.25
      source: media-judge
      jtbd_source: JTBD-3
      media_glob: "03-scenes/*.jpg"
      judge_prompt: |
        View each shipped scene. Score 0-10 as believable commercial lifestyle photo:
        natural scale, contact shadow, lighting; NO halo/cutout-edge artifacts; aspect
        respected (or flagged); negative space for copy on banner/ad aspects; not
        AI-slop.
        10 = believable, well-composed, no halo. 5 = readable but one halo/scale/shadow
        error or over-staged look. 0 = pasted-on cutouts, halos, wrong scale.
    - id: brand-consistency
      weight: 0.15
      source: media-judge
      jtbd_source: JTBD-3
      media_glob: "03-scenes/*.jpg"
      judge_prompt: |
        View the scenes as a set (+ brand-look ref if attached). Score 0-10: palette/mood
        coherent across the set and matching the brand-look ref; any logo/mark legible and
        correct (not garbled); typography kept off the scene unless on the product.
        10 = cohesive on-brand set, marks correct. 5 = palette wanders or a mark slightly
        off. 0 = inconsistent palette or a garbled logo shipped as correct.
    - id: qc-gate-and-honesty
      weight: 0.20
      source: llm-judge
      jtbd_source: failure-mode:JTBD-3
      judge_prompt: |
        Cross-check scenes-log.md + work/scenes/*.qc.json against the shipped 03-scenes/
        files. Score 0-10: every shipped scene has a fidelity-qc verdict pass|review
        (NEVER a shipped drift); drift was regenerated once then dropped+flagged;
        reflective/metallic/fine-text flagged review (never certified); log lists per
        scene preset/model/prompt/aspect/QC verdict; cost from estimate/balance not
        credits_used; no auto-upload.
        10 = the gate held and the log is faithful. 5 = one flag unmentioned or a
        low-confidence pass not downgraded. 0 = a drift shipped, gate skipped, or log
        contradicts artifacts.
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

## Notes for the proposer

- Dead-ends already tried: (none yet)
- Techniques to prioritize:
  - **Product drift** (the #1 dimension, weight 0.40) → strengthen the verbatim Line-1
    identity clause and REDUCE scene complexity (one setting, few props) in
    `references/scene-presets.md` before touching `compose-scene.sh`. Never paraphrase
    Line 1. Re-attach the SAME hero anchor; never chain scene-N off scene-(N-1).
  - **Halo / edge artifacts** → prefer the RMBG cutout (`work/cutout.png`) as the
    `--image` source over the white-bg hero, and stay on nano-banana-pro (Seedream
    over-saturates / shows edge artifacts at high guidance — keep it modest).
  - **Garbled label/logo** → stay on nano-banana-pro for text-bearing scenes (FLUX/
    Seedream garble text); a still-garbled mark is `review`, never shipped as correct.
- Constraints (not all in the rubric):
  - This is the **generative** path; `fidelity-qc.py` is **BLOCKING** — a drifted output
    is NEVER shipped to "complete" a set. Reflective/metallic/fine-text is a forced
    human-review class.
  - The compliant Amazon main image is the **deterministic** white-bg path (RMBG +
    Pillow exact-255), NEVER this skill. Do not re-background the real product
    generatively for the main image.
  - Generation costs fal credits and time — prefer fixing prompts over regenerating
    whole sets. Always pass `-m`; never use the CLI default model. Ignore `credits_used`;
    read cost from `ai-gen estimate` + `ai-gen balance` deltas. fal URLs expire — use the
    local file.
