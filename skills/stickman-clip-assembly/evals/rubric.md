---
skill: bot-013-clip-assembly
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. Media dims grade extracted keyframes of
# the real MP4s (media-normalize samples video via ffmpeg; judge_model must be
# vision-capable; keyless host-session vision per stage-4-test.md).
dimensions:
  - id: episode-watchability
    weight: 0.30
    source: media-judge
    jtbd_source: JTBD-4
    media_glob: "episode.mp4"
    judge_prompt: |
      Look at the extracted keyframes of episode.mp4 in sequence. Score 0-10 as a
      viewer: the SAME capped minimal stickman throughout; pencil-sketch style
      survives animation (no photoreal lift, no palette shift between beats); each
      beat's action is readable; cuts land on beat boundaries; no severe artifacts
      (extra limbs, melting, garbled frames).
      10 = plays as one coherent hand-drawn skit. 5 = recognizable episode but one
      beat drifts in style/identity or motion is mushy. 0 = different-looking
      characters per clip, heavy artifacts, or an incoherent sequence.

  - id: clip-fidelity
    weight: 0.20
    source: media-judge
    jtbd_source: JTBD-4
    media_glob: "04-clips/"
    judge_prompt: |
      For each beat clip's keyframes, compare against the beat's still and planned
      action. Score 0-10 whether the clip animates THAT still doing THAT action:
      first frames anchor on the still's composition; the single planned action
      occurs; no invented camera cuts inside a single-shot clip.
      10 = every clip is its still brought to life with the planned action.
      5 = clips relate to their stills but actions are generic drift/sway rather
      than the planned action, or composition wanders early.
      0 = clips unrelated to stills, wrong actions, or internal cuts/morphing.

  - id: assembly-correctness
    weight: 0.25
    jtbd_source: acceptance-scenario:JTBD-4
    judge_prompt: |
      Read 05-summary.md and the recorded ffprobe verification. Score 0-10 the
      assembly: episode duration 15-60s at the planned aspect; beats present in
      plan order (still-as-segment fallbacks included, never dropped); room tone
      applied per plan setting; caption-card punchline handled as planned.
      10 = verification recorded and every assembly property matches the plan.
      5 = episode assembled but one property deviates without flag (wrong aspect,
      missing room tone) or verification output absent.
      0 = no episode.mp4, beats missing/reordered, or duration far out of range.

  - id: summary-honesty
    weight: 0.25
    jtbd_source: failure-mode:JTBD-4
    judge_prompt: |
      Cross-check 05-summary.md against the artifacts. Score 0-10 production
      honesty: every clip lists model + dialect + prompt + duration; every fallback
      (model chain walks, still-as-segments, duration deviations) is flagged with a
      reason; silent-clip + room-tone audio treatment stated plainly; limitations
      section present; nothing claimed that the artifacts contradict.
      10 = the summary is a faithful production log. 5 = mostly accurate but a
      fallback or deviation went unmentioned. 0 = summary missing or contradicts
      the artifacts (claims audio/models that were not used).

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-013-clip-assembly/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: motion quality issues → tune the motion-prompt anatomy in
  references/clip-dialects.md before touching scripts; identity drift → check that
  phase-3 stills (upstream skill) are consistent before blaming i2v.
- Constraints not in the rubric: i2v is slow (~3-6 min/clip on kling) and costs credits —
  prefer fixing prompts over regenerating sets; never rely on the CLI default video model.
