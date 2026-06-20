---
skill: bot-030-extend-chain
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. The first dimension is a media-judge that grades
# the ACTUAL pixels by sampling keyframes of episode.mp4 (judge_model must be vision-capable;
# media-normalize extracts keyframes via ffmpeg; keyless host-session vision per
# stage-4-test.md). The other two grade the recorded ffprobe verification and the production
# summary (text). This is the Veo 3.1 extend-chain sibling of bot-027-seedance-cinematic and
# bot-028-kling-cinematic — ONE continuous shot, native audio, NO concat (extend returns the
# whole grown video).
dimensions:
  - id: continuous-shot
    weight: 0.50
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "episode.mp4"
    judge_prompt: |
      Look at the extracted keyframes of episode.mp4 in time order. Score 0-10 as a viewer
      whether this is ONE coherent continuous shot with the character held across the whole
      take:
      - the SAME character is recognizable from the FIRST sampled keyframe to the LAST - same
        face/body design, same palette, same outfit/props - no identity drift, no "different
        character", no melting/warping/extra figures. (This Veo pipeline holds identity by
        restating the frozen tokens in every extend hop's prompt; the key risk is drift across
        the seam between the base and an extension.)
      - it reads as ONE unbroken continuous take that DEVELOPS over time (the action and camera
        progress) - NOT a static clip, and NOT separate stitched scenes with hard cuts. A hard
        cut between segments is a failure here (the whole promise is one continuous shot).
      - the look is on-brief for the plan's global header (genre, lighting, style) and the
        subject is large in frame and clearly lit.
      10 = a stranger would say "same character, one continuous shot that develops" with no
      visible seam or cut. 5 = recognizable and mostly continuous but identity drifts at the
      seam, OR the motion is mushy/static, OR a seam reads like a soft cut. 0 = a different-
      looking character across the clip, heavy artifacts, hard cuts, or an incoherent clip that
      does not execute the plan.

  - id: render-verification
    weight: 0.25
    jtbd_source: acceptance-scenario:JTBD-1
    judge_prompt: |
      Read summary.md and the recorded ffprobe verification. Score 0-10 the structural
      correctness of episode.mp4: a video stream AND an audio stream are present (the audio is
      NATIVE Veo audio - Veo generate_audio is default-on, so an audio stream MUST be present
      WITHOUT any added bed); the format duration is GREATER than the base clip duration (every
      successful extend grows the whole returned video - there is NO concat and NO summed-shot
      target here, the episode is the single file the final extend returned). The ffprobe output
      (streams + duration) must actually be recorded, not merely asserted.
      10 = verification recorded and every structural property holds (video + audio present,
      final duration greater than the base). 5 = episode exists but one property deviates and is
      flagged (a hop fell short so only the base or a partial chain was delivered, disclosed as a
      shortfall) OR the ffprobe output is absent. 0 = no episode.mp4, no audio stream, or a
      video that did not grow beyond the base while claiming it did.

  - id: summary-honesty
    weight: 0.25
    jtbd_source: failure-mode:JTBD-1
    judge_prompt: |
      Cross-check summary.md against the artifacts. Score 0-10 production honesty: the summary
      records the base-frame model ACTUALLY used (fal-ai/nano-banana-pro or the image-chain
      fallback), the Veo base slug ACTUALLY used (fal-ai/veo3.1/image-to-video), and each extend
      hop with its slug (fal-ai/veo3.1/extend-video) and its continuation beat; states the final
      continuous duration; gives a cost basis derived from ai-gen estimate (NOT the JSON
      credits_used field, which over-reports); and - critically - states CLEARLY that there is
      NO concat (extend-video returns the WHOLE grown video each hop) and that the audio is
      NATIVE Veo audio (NOT an added room-tone bed), plus the one-line note that this i2v-plus-
      extend-chain architecture differs from Seedance's single-pass reference-to-video and
      Kling's per-shot i2v plus ffmpeg concat and is scored head-to-head in the KB results-log.
      Any hop that fell short MUST be disclosed as a recorded shortfall (which hop, why), never
      papered over.
      10 = the summary is a faithful production log a re-render could rely on; base + hop slugs,
      cost basis, the NO-concat note, the native-audio note, and any shortfall all honest. 5 =
      mostly accurate but the NO-concat note, the native-audio note, a hop shortfall, or the cost
      basis went unstated or used credits_used. 0 = summary missing or contradicts the artifacts
      (claims a concat, claims an added audio bed, claims a length the chain did not reach, or
      fabricates a model/cost).

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-030-extend-chain/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: identity drift ACROSS the seam (base → extension) is the Veo
  failure mode → fix in the HOP PROMPT first: restate the plan's frozen character tokens in
  EVERY hop (aim for >= 80% subject repeat vs the base prompt), and keep "same character, same
  setting, one continuous take, no cut" in the prompt. Keep the character large in frame and
  clearly lit. Only then touch the base motion prompt or the scripts. Per-model mechanics live
  in `references/veo-extend-dialect.md`.
- Hard cut / scene-change feel → a hop must be ONE continuation beat (a move OR an action), not
  a new scene. A scene change inside an extend reads as a cut and breaks the one-shot promise;
  that work belongs to the Kling/Seedance multi-shot siblings, not here.
- The audio is ALWAYS native Veo audio (generate_audio default-on) — never add a music/room-tone
  bed (it doubles up) and never claim a concat; extend-video returns the WHOLE grown video, so
  there is no stitching. Those two are the #1 honesty failures to avoid versus the siblings.
- Constraints not in the rubric: a render costs real credits (the base frame + the base i2v +
  each extend) and several minutes — prefer fixing the composed prompt over re-rendering; trust
  `ai-gen estimate` / `ai-gen balance`, never `credits_used`. A failed generation isn't charged,
  but a needless re-render is. The Veo extend ceiling is ~30s total (8s base + ~3 x 7s hops).
