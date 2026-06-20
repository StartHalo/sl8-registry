---
skill: bot-029-keyframe-clips
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. The first dimension is a media-judge that grades the
# ACTUAL pixels by sampling keyframes of episode.mp4 (judge_model must be vision-capable;
# media-normalize extracts keyframes via ffmpeg; keyless host-session vision per stage-4-test.md).
# The other two grade the recorded ffprobe verification and the production summary (text).
dimensions:
  - id: journey-coherent
    weight: 0.50
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "episode.mp4"
    judge_prompt: |
      Look at the extracted keyframes of episode.mp4 in time order. Score 0-10 as a viewer
      whether this is one coherent pinned-keyframe journey with the character held:
      - the SAME character is recognizable across EVERY sampled scene - same face/body design,
        same palette, same outfit/props - no identity drift, no "different character per scene",
        no melting/warping/extra figures between scenes;
      - the plan's states are executed as a journey: the keyframes show distinct composed states
        progressing in order (e.g. asleep -> waking -> standing/stretching -> reaching) with each
        scene morphing from one state into the next - it reads as a directed first-last-frame
        journey, NOT one static clip and NOT a random reshuffle;
      - the look is on-brief for the plan's global header (genre, lighting, style).
      10 = a stranger would say "same character across the whole journey" and the scenes land as
      a directed start-to-end progression. 5 = recognizable journey but one scene drifts in
      identity/style, OR the morphs are weak/static (little progression between pinned states),
      OR motion is mushy. 0 = different-looking characters across scenes, heavy artifacts, or an
      incoherent single-blob clip that does not execute the plan's states.

  - id: render-verification
    weight: 0.25
    jtbd_source: acceptance-scenario:JTBD-1
    judge_prompt: |
      Read summary.md and the recorded ffprobe verification. Score 0-10 the structural
      correctness of episode.mp4: a video stream AND an audio stream are present (the audio is
      the added ambient bed - Hailuo clips are silent, so a bed is ALWAYS added); the format
      duration is within +/-2s of the sum of the per-scene durations; the aspect matches the
      planned canvas. The ffprobe output (streams + duration) must actually be recorded, not
      merely asserted.
      10 = verification recorded and every structural property holds (audio present, duration
      within +/-2s of the summed target, aspect correct). 5 = episode exists but one property
      deviates and is flagged (duration just outside +/-2s, or aspect off) OR the ffprobe output
      is absent. 0 = no episode.mp4, no audio stream, or a duration far out of range.

  - id: summary-honesty
    weight: 0.25
    jtbd_source: failure-mode:JTBD-1
    judge_prompt: |
      Cross-check summary.md against the artifacts. Score 0-10 production honesty: the summary
      records, per scene, the start+end keyframe pair and the Hailuo slug ACTUALLY used
      (fal-ai/minimax/hailuo-02/standard/image-to-video), whether each scene rendered as a Hailuo
      first-last morph or fell back to a still segment built from the two keyframes (and why);
      states plainly that the audio is an ADDED ambient bed derived from the Audio line and NOT
      native Hailuo audio; states the verified duration + aspect; gives a cost basis derived from
      ai-gen estimate (NOT the JSON credits_used field, which over-reports); and carries the
      first-last-frame note that each scene is pinned on a START keyframe AND an END keyframe. Any
      verification flag or still-segment fallback is disclosed.
      10 = the summary is a faithful production log a re-render could rely on; the keyframe pairs,
      slug, fallbacks, cost basis, and the non-native ambient bed are all honest. 5 = mostly
      accurate but a still-segment fallback, a verification flag, the non-native-audio disclosure,
      or the cost basis went unstated or used credits_used. 0 = summary missing or contradicts the
      artifacts (claims a Hailuo morph where a still fallback ran, claims native audio, or
      fabricates a model/cost).

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-029-keyframe-clips/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: identity drift / weak morphs across scenes → fix in the PROMPT
  COMPOSITION first (keep the plan's `Character:` tokens VERBATIM in every keyframe prompt; chain
  `--ref state[i-1].png` so the SAME character carries; pass the END keyframe's HOSTED url as
  `end_image_url=` so the morph is truly pinned on both ends; keep the subject large in frame and
  avoid the very darkest lighting) before touching scripts. The first-last-frame path IS the
  point — a still-segment fallback is a degradation, only on failure, and must be disclosed.
  Per-model mechanics live in `references/hailuo-dialect.md`.
- Constraints not in the rubric: a render costs real credits (~one keyframe + one Hailuo i2v per
  scene) and a few minutes — prefer fixing the composed prompt over re-rendering; trust
  `ai-gen estimate` / `ai-gen balance`, never `credits_used` (over-reports ~8× on i2v). A failed
  generation isn't charged, but a needless re-render is. Drop `--resolution` to `512P` to trim
  cost while iterating. NO `--resolution` on the nano-banana-pro IMAGE call (it rejects it and
  skips the primary) — that flag is for the Hailuo VIDEO call only.
