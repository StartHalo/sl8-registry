---
derive_from:
  source_file: 1-requirements.md
  jtbds: [JTBD-2]
  derivation_method: outputs+acceptance+failure, consolidated to skill scope from evals/rubric.md (2026-06-09 review)
  derived_at: 2026-06-10T00:58:37.789Z
skill: bot-013-episode-design
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: beat-arc-quality
      weight: 0.35
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: |
        Read 01-episode-plan.md. Score 0-10 whether the beats form a real comic arc: a
        recognizable everyday setup, a complication, escalation, and a VISUAL punchline or
        anticlimax on the final beat - with the scenario concrete enough to shoot (a place,
        a prop, a pressure).
        10 = each beat raises the stakes and the final beat lands a visual joke a viewer
        gets with the sound off. 5 = beats concrete but flat - related actions with no
        escalation, or a verbal/abstract punchline. 0 = abstract theme, disconnected beats,
        or no identifiable punchline.
    - id: prompt-composability
      weight: 0.35
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-2
      judge_prompt: |
        Score 0-10 whether each beat's fields compose into clean generation prompts:
        scene block = ONE concrete action + setting + framing phrase, sitting between the
        frozen character and discipline blocks without restating either; motion prompt =
        one action + at most one camera move, composable with the clip style lock and
        negatives.
        10 = every beat composes cleanly, no frozen-block leakage, framing stated.
        5 = one or two beats pack multiple actions, omit framing, or partially restate
        style/character. 0 = scene blocks are standalone prompts or motion prompts demand
        cuts/multiple shots.
    - id: format-discipline
      weight: 0.3
      source: llm-judge
      jtbd_source: skill-quality-criteria
      judge_prompt: |
        Score 0-10 the plan's machine-checkability: lintable layout (### Beat N: <slug>
        headings, single-line key: value fields), kebab-case unique slugs, durations only
        5|10 summing to 15-60s, header carrying logline/aspect/target-length/punchline/
        room-tone, at most one quoted UPPERCASE label across the episode (letters only).
        10 = validate-plan.sh passes and every convention followed. 5 = readable but one
        or two conventions drift. 0 = freeform prose a script cannot parse.
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-013-episode-design/iteration-charter.md
    - bot/skills/bot-013-episode-design/evals/rubric.md
---

## Notes for the proposer

- Dead-ends already tried: (none yet)
- Techniques to prioritize: tighten worked examples in references/beat-grammar.md
  before touching workflow steps; validate-plan.sh is the floor, arc quality the ceiling.
- Constraints: pure-LLM skill (no generation cost); plan <= 1500 words.
