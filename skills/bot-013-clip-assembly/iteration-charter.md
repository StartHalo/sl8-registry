---
derive_from:
  source_file: 1-requirements.md
  jtbds: [JTBD-4]
  derivation_method: outputs+acceptance+failure, consolidated to skill scope from evals/rubric.md (2026-06-09 review)
  derived_at: 2026-06-10T00:58:37.789Z
skill: bot-013-clip-assembly
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: episode-watchability
      weight: 0.3
      source: media-judge
      jtbd_source: JTBD-4
      media_glob: "episode.mp4"
      judge_prompt: |
        Look at the extracted keyframes of episode.mp4 in sequence (view the actual
        pixels). Score 0-10 as a viewer: the SAME capped minimal stickman throughout;
        pencil-sketch style survives animation (no photoreal lift, no palette shift);
        each beat's action readable; cuts land on beat boundaries; no severe artifacts
        (extra limbs, melting, garbled frames).
        10 = one coherent hand-drawn skit. 5 = recognizable but one beat drifts in
        style/identity or motion is mushy. 0 = different-looking characters per clip,
        heavy artifacts, incoherent sequence.
    - id: clip-fidelity
      weight: 0.2
      source: media-judge
      jtbd_source: JTBD-4
      media_glob: "04-clips/"
      judge_prompt: |
        For each beat clip's keyframes (view the actual pixels), compare against the
        beat's still and planned action. Score 0-10: first frames anchor on the still's
        composition; the single planned action occurs; no invented camera cuts inside a
        single-shot clip.
        10 = every clip is its still brought to life with the planned action. 5 = clips
        relate to stills but motion is generic drift rather than the planned action.
        0 = clips unrelated to stills, wrong actions, or internal cuts/morphing.
    - id: assembly-correctness
      weight: 0.25
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-4
      judge_prompt: |
        Read 05-summary.md and the recorded ffprobe verification. Score 0-10: episode
        duration 15-60s at the planned aspect; beats present in plan order
        (still-as-segment fallbacks included, never dropped); room tone applied per the
        plan's room-tone header; caption-card punchline handled as planned.
        10 = verification recorded and every property matches the plan. 5 = assembled
        but one property deviates without flag or verification absent. 0 = no
        episode.mp4, beats missing/reordered, or duration far out of range.
    - id: summary-honesty
      weight: 0.25
      source: llm-judge
      jtbd_source: failure-mode:JTBD-4
      judge_prompt: |
        Cross-check 05-summary.md against the artifacts. Score 0-10 production honesty:
        every clip lists model + dialect + prompt + duration; every fallback (chain
        walks, still-as-segments, duration deviations) flagged with a reason;
        silent-clip + room-tone audio treatment stated plainly; limitations present;
        nothing claimed that the artifacts contradict.
        10 = a faithful production log. 5 = mostly accurate but a fallback went
        unmentioned. 0 = summary missing or contradicts the artifacts.
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-013-clip-assembly/iteration-charter.md
    - bot/skills/bot-013-clip-assembly/evals/rubric.md
---

## Notes for the proposer

- Dead-ends already tried: (none yet)
- Techniques to prioritize: motion quality -> tune references/clip-dialects.md before
  scripts; identity drift -> check phase-3 stills consistency before blaming i2v.
- Constraints: i2v is slow (~3-6 min/clip) and costs credits; never the CLI default
  video model.
