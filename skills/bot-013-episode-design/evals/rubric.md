---
skill: bot-013-episode-design
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. Anchors at 0 / 5 / 10.
dimensions:
  - id: beat-arc-quality
    weight: 0.35
    jtbd_source: JTBD-2
    judge_prompt: |
      Read 01-episode-plan.md. Score 0-10 whether the beats form a real comic arc:
      a recognizable everyday setup, a complication, escalation, and a VISUAL
      punchline or anticlimax on the final beat — with the scenario concrete enough
      to shoot (a place, a prop, a pressure).
      10 = the arc reads like a good silent skit: each beat raises the stakes and the
      final beat lands a visual joke a viewer gets with the sound off.
      5 = beats are concrete but flat — a sequence of related actions with no
      escalation, or a punchline that is verbal/abstract rather than visual.
      0 = abstract theme, disconnected beats, or no identifiable punchline.

  - id: prompt-composability
    weight: 0.35
    jtbd_source: acceptance-scenario:JTBD-2
    judge_prompt: |
      Score 0-10 whether each beat's fields would compose into clean generation
      prompts downstream: scene block = ONE concrete action + setting + framing
      phrase, written to sit between the frozen character block and discipline
      block without restating either; motion prompt = one action + at most one
      camera move, composable with the clip style lock and negatives.
      10 = every beat composes cleanly; no frozen-block leakage; framing stated.
      5 = most beats compose but one or two pack multiple actions, omit framing,
      or partially restate style/character description.
      0 = scene blocks are full standalone prompts (restating style/character) or
      motion prompts demand cuts/multiple shots the single-shot dialect cannot do.

  - id: format-discipline
    weight: 0.30
    jtbd_source: skill-quality-criteria
    judge_prompt: |
      Score 0-10 the plan's machine-checkability and header completeness: the
      lintable layout (### Beat N: <slug> headings, single-line key: value fields),
      kebab-case unique slugs, durations only 5|10 summing to 15-60s, header
      carrying logline/aspect/target-length/punchline/room-tone, at most one
      quoted UPPERCASE in-frame label across the episode.
      10 = validate-plan.sh passes and every convention is followed.
      5 = plan is readable but one or two conventions drift (a multi-line field,
      a non-kebab slug) — downstream phases would need to guess.
      0 = freeform prose a script cannot parse.

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-013-episode-design/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: tighten worked examples in references/beat-grammar.md before
  touching the workflow steps; the linter is the floor — semantic arc quality is the ceiling.
- Constraints not in the rubric: plan is pure-LLM (no generation cost); keep total plan
  ≤1500 words.
