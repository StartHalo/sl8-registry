---
skill: bot-028-kling-cinematic
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. The first dimension is a media-judge that grades
# the ACTUAL pixels by sampling keyframes of episode.mp4 (judge_model must be vision-capable;
# media-normalize extracts keyframes via ffmpeg; keyless host-session vision per
# stage-4-test.md). The other two grade the recorded ffprobe verification and the production
# summary (text). This is the Kling per-shot sibling of bot-027-seedance-cinematic.
dimensions:
  - id: episode-cinematic
    weight: 0.50
    source: media-judge
    jtbd_source: JTBD-3
    media_glob: "episode.mp4"
    judge_prompt: |
      Look at the extracted keyframes of episode.mp4 in time order. Score 0-10 as a viewer
      whether this is one coherent multi-shot cinematic with the character held across cuts:
      - the SAME character is recognizable across EVERY sampled shot - same face/body design,
        same palette, same outfit/props - no identity drift, no "different character per
        shot", no melting/warping/extra figures between cuts. (In this Kling pipeline the
        identity rests on the shared bible keyframes + verbatim tokens, NOT a single in-model
        lock - so cross-shot drift is the key risk to watch for.)
      - the shot-list is executed: the keyframes show distinct shots with shot variety and
        camera movement (e.g. establishing -> tracking -> close-up) and an escalation arc -
        it reads as a directed cinematic, NOT one static clip;
      - the look is on-brief for the shot-list's global header (genre, lighting, style), and
        the subject is large in frame and clearly lit (Kling's consistency band).
      10 = a stranger would say "same character across the whole cinematic" and the shots
      land as a directed sequence with a clear arc. 5 = recognizable cinematic but one shot
      drifts in identity/style, OR the cuts are weak/static (little shot variety), OR motion
      is mushy. 0 = different-looking characters across shots, heavy artifacts, or an
      incoherent clip that doesn't execute the shot-list.

  - id: render-verification
    weight: 0.25
    jtbd_source: acceptance-scenario:JTBD-3
    judge_prompt: |
      Read summary.md and the recorded ffprobe verification. Score 0-10 the structural
      correctness of episode.mp4: a video stream AND an audio stream are present (the audio is
      the ADDED room-tone bed - Kling clips are silent, so an audio stream MUST be present from
      the bed); the format duration is within +/-1s of the summed per-shot durations; the
      aspect matches the planned canvas. The ffprobe output (streams + duration) must actually
      be recorded, not merely asserted.
      10 = verification recorded and every structural property holds (video + audio present,
      duration within +/-1s of the summed shots, aspect correct). 5 = episode exists but one
      property deviates and is flagged (duration just outside +/-1s, or aspect off, or a shot
      was skipped) OR the ffprobe output is absent. 0 = no episode.mp4, no audio stream, or a
      duration far out of range.

  - id: summary-honesty
    weight: 0.25
    jtbd_source: failure-mode:JTBD-3
    judge_prompt: |
      Cross-check summary.md against the artifacts. Score 0-10 production honesty: the summary
      records the per-shot keyframe model ACTUALLY used (fal-ai/nano-banana-pro or the
      image-chain fallback that produced it) AND the Kling slug ACTUALLY used
      (fal-ai/kling-video/v3/pro/image-to-video, or the /standard/ tier); states the per-shot
      route (one keyframe + one Kling image-to-video call per shot, then ffmpeg concat); recaps
      the shots as executed (and any shot that was skipped, and why); states the verified
      duration + aspect; gives a cost basis derived from ai-gen estimate (NOT the JSON
      credits_used field, which over-reports); and - critically - states CLEARLY that the audio
      is an ADDED room-tone ambient bed, NOT native Kling audio, plus the one-line note that
      this per-shot Kling + concat architecture differs from Seedance's single-pass
      native-audio render and is scored head-to-head in the KB results-log.
      10 = the summary is a faithful production log a re-render could rely on; per-shot route,
      models, cost basis, the room-tone-not-native disclosure, and any skipped shot/flag all
      honest. 5 = mostly accurate but the room-tone-not-native disclosure, a skipped shot, a
      flag, or the cost basis went unstated or used credits_used. 0 = summary missing or
      contradicts the artifacts (claims native Kling audio, claims a Seedance-style single pass,
      claims audio that is absent, or fabricates a model/cost).

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-028-kling-cinematic/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: identity drift ACROSS shots is the Kling failure mode (no single
  in-model lock like Seedance) → fix in the KEYFRAME COMPOSITION first: pass BOTH bible images
  as `--ref` on every per-shot keyframe, keep the shot-list's trait tokens VERBATIM, keep the
  character LARGE in frame and avoid the very darkest lighting (Kling's consistency cliff), and
  keep distinctive details to 2-3. Only then touch the motion prompt or the scripts. Per-model
  mechanics live in `references/kling-dialect.md`.
- Weak cuts / static feel → check the motion prompt leads with the camera move then the action
  (the C3 Elements order), one camera + one action per shot. Snap durations to 5 or 10s.
- The audio is ALWAYS an added room-tone bed (Kling clips are silent) — never claim native
  audio; that is the #1 honesty failure to avoid versus the Seedance sibling.
- Constraints not in the rubric: a render costs real credits (per shot = the keyframe image
  cost + the Kling i2v cost) and several minutes — prefer fixing the composed prompt over
  re-rendering; trust `ai-gen estimate` / `ai-gen balance`, never `credits_used`. A failed
  generation isn't charged, but a needless re-render is. Drop the Kling tier to `/standard/`
  to trim cost while iterating.
