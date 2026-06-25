---
skill: bot-013-stickman-art
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. Two media-judge dims grade the actual
# pixels (judge_model must be vision-capable; grading via the keyless host-session
# vision path per stage-4-test.md § Media (vision) grading).
dimensions:
  - id: character-fidelity
    weight: 0.30
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "02-character/"
    judge_prompt: |
      Look at source.png and turnaround.png. Score 0-10 whether they lock a usable
      character: ONE extremely minimal stick figure (single-stroke limbs, circle
      head, dot eyes, small cap), hand-drawn pencil-sketch medium (graphite grain,
      cross-hatch, varied line weight) on white/paper background; the turnaround
      shows 3+ views of the SAME figure (cap, proportions, stroke style agree).
      10 = both assets on-style and mutually consistent; turnaround views clearly
      the same character. 5 = right idea but one asset drifts (extra detail on the
      figure, photographic shading, views disagree on the cap). 0 = wrong medium
      (color/photo), multiple inconsistent figures, or unusable anatomy.

  - id: still-set-consistency
    weight: 0.30
    source: media-judge
    jtbd_source: JTBD-3
    media_glob: "03-stills/"
    judge_prompt: |
      Look at ALL beat stills as a set. Score 0-10 on series consistency and
      legibility: the SAME capped figure as 02-character/ in every still; uniform
      pencil-sketch style across the set; each still reads as exactly ONE action at
      close/medium framing; minimal figure against a realistically rendered
      environment; consistent lighting direction.
      10 = a stranger would say "same character, same artist, one story".
      5 = character recognizable but style/proportions wobble between stills, or a
      still is ambiguous about its action.
      0 = different characters/styles per still, wide illegible shots, or anatomy
      glitches (extra limbs, melted forms).

  - id: log-integrity
    weight: 0.20
    jtbd_source: acceptance-scenario:JTBD-3
    judge_prompt: |
      Read stills-log.md (and character-spec.md). Score 0-10 the production log's
      completeness: per kept still a model + full prompt + fal.media URL + self-check;
      per skipped beat a recorded error; per character asset a model + URL; chain
      order respected (no out-of-chain model names).
      10 = every asset fully accounted for; a re-run could reproduce the set.
      5 = log present but fields missing on some assets (no URL, no self-check).
      0 = log missing, fabricated-looking, or models outside the documented chains.

  - id: spec-discipline
    weight: 0.20
    jtbd_source: skill-quality-criteria
    judge_prompt: |
      Compare character-spec.md's frozen blocks against every composed prompt in
      stills-log.md. Score 0-10 verbatim-reuse discipline: character block and
      style stack appear EXACTLY (byte-for-byte) in each prompt; the seed from the
      spec is used; scene text varies while frozen text never does.
      10 = perfect verbatim reuse everywhere. 5 = meaning preserved but wording
      paraphrased in some prompts (the drift vector). 0 = each prompt re-describes
      the character/style freely.

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-013-stickman-art/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: fix consistency issues in the FROZEN BLOCKS first (they
  propagate everywhere); per-model quirks belong in references/still-dialects.md.
- Constraints not in the rubric: image generations cost credits — failed recraft prompts
  still charge; keep prompts under recraft's limit or skip recraft (the script already does).
