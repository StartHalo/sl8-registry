---
derive_from:
  source_file: 1-requirements.md
  jtbds: [JTBD-1, JTBD-3]
  derivation_method: outputs+acceptance+failure, consolidated to skill scope from evals/rubric.md (2026-06-09 review)
  derived_at: 2026-06-10T00:58:37.789Z
skill: bot-013-stickman-art
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: character-fidelity
      weight: 0.3
      source: media-judge
      jtbd_source: JTBD-1
      media_glob: "02-character/"
      judge_prompt: |
        Look at source.png and turnaround.png (view the actual pixels). Score 0-10:
        ONE extremely minimal stick figure (single-stroke limbs, circle head, dot eyes,
        small cap), hand-drawn pencil-sketch medium (graphite grain, cross-hatch, varied
        line weight) on white/paper background; turnaround shows 3+ views of the SAME
        figure (cap, proportions, stroke style agree).
        10 = both on-style and mutually consistent. 5 = one asset drifts (extra detail,
        photographic shading, views disagree on the cap). 0 = wrong medium, multiple
        inconsistent figures, or unusable anatomy.
    - id: still-set-consistency
      weight: 0.3
      source: media-judge
      jtbd_source: JTBD-3
      media_glob: "03-stills/"
      judge_prompt: |
        Look at ALL beat stills as a set (view the actual pixels). Score 0-10 on series
        consistency and legibility: the SAME capped figure as 02-character/ in every
        still; uniform pencil-sketch style; exactly ONE readable action per still at
        close/medium framing; minimal figure against a realistically rendered
        environment; consistent lighting direction.
        10 = same character, same artist, one story. 5 = recognizable but style or
        proportions wobble, or an ambiguous action. 0 = different characters/styles per
        still, wide illegible shots, anatomy glitches.
    - id: log-integrity
      weight: 0.2
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-3
      judge_prompt: |
        Read stills-log.md and character-spec.md. Score 0-10 the production log: per
        kept still a model + full prompt + fal.media URL + self-check; per skipped beat a
        recorded error; per character asset a model + URL; chain order respected (no
        out-of-chain model names).
        10 = every asset fully accounted for; a re-run could reproduce the set. 5 = log
        present but fields missing on some assets. 0 = log missing, fabricated-looking,
        or models outside the documented chains.
    - id: spec-discipline
      weight: 0.2
      source: llm-judge
      jtbd_source: skill-quality-criteria
      judge_prompt: |
        Compare character-spec.md's frozen blocks against every composed prompt in
        stills-log.md. Score 0-10 verbatim-reuse discipline: character block and style
        stack appear EXACTLY (byte-for-byte) in each prompt; the spec's seed is used;
        scene text varies while frozen text never does.
        10 = perfect verbatim reuse. 5 = meaning preserved but wording paraphrased in
        some prompts. 0 = each prompt re-describes the character/style freely.
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-013-stickman-art/iteration-charter.md
    - bot/skills/bot-013-stickman-art/evals/rubric.md
---

## Notes for the proposer

- Dead-ends already tried: (none yet)
- Techniques to prioritize: fix consistency issues in the FROZEN BLOCKS first (they
  propagate everywhere); per-model quirks belong in references/still-dialects.md.
- Constraints: failed recraft prompts still charge credits; gen-image.sh skips
  recraft above 950 chars by design.
