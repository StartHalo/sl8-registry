---
skill: bot-027-seedance-cinematic
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. The first dimension is a media-judge that grades
# the ACTUAL pixels by sampling keyframes of episode.mp4 (judge_model must be vision-capable;
# media-normalize extracts keyframes via ffmpeg; keyless host-session vision per
# stage-4-test.md). The other two grade the recorded ffprobe verification and the production
# summary (text).
dimensions:
  - id: episode-cinematic
    weight: 0.50
    source: media-judge
    jtbd_source: JTBD-3
    media_glob: "episode.mp4"
    judge_prompt: |
      Look at the extracted keyframes of episode.mp4 in time order. Score 0-10 as a viewer
      whether this is one coherent multi-scene cinematic with the character held:
      - the SAME character is recognizable across EVERY sampled shot - same face/body design,
        same palette, same outfit/props - no identity drift, no "different character per
        shot", no melting/warping/extra figures between cuts;
      - the shot-list is executed: the keyframes show distinct shots with shot variety and
        camera movement (e.g. establishing -> medium -> tracking -> climax -> close-up) and
        an escalation arc - it reads as a directed cinematic, NOT one static clip;
      - the look is on-brief for the shot-list's global header (genre, lighting, style).
      10 = a stranger would say "same character across the whole cinematic" and the shots
      land as a directed sequence with a clear arc. 5 = recognizable cinematic but one shot
      drifts in identity/style, OR the cuts are weak/static (little shot variety), OR motion
      is mushy. 0 = different-looking characters across shots, heavy artifacts, or an
      incoherent single-blob clip that doesn't execute the shot-list.

  - id: render-verification
    weight: 0.25
    jtbd_source: acceptance-scenario:JTBD-3
    judge_prompt: |
      Read summary.md and the recorded ffprobe verification. Score 0-10 the structural
      correctness of episode.mp4: a video stream AND an audio stream are present (native
      in-pass audio for the single-call route; native-or-room-tone for the fallback); the
      format duration is within +/-1s of the shot-list's target; the aspect matches the
      planned canvas. The ffprobe output (streams + duration) must actually be recorded, not
      merely asserted.
      10 = verification recorded and every structural property holds (audio present, duration
      within +/-1s, aspect correct). 5 = episode exists but one property deviates and is
      flagged (duration just outside +/-1s, or aspect off) OR the ffprobe output is absent.
      0 = no episode.mp4, no audio stream, or a duration far out of range.

  - id: summary-honesty
    weight: 0.25
    jtbd_source: failure-mode:JTBD-3
    judge_prompt: |
      Cross-check summary.md against the artifacts. Score 0-10 production honesty: the summary
      records the producing model + slug ACTUALLY used (a bytedance/seedance-2.0 slug - the
      reference-to-video tier for the single call, or the image-to-video slug for the
      fallback); states the render route taken (single-call reference-to-video vs per-shot +
      ffmpeg concat) and, if the fallback ran, WHY the single call was abandoned; recaps the
      shot-list as executed; states the verified duration + aspect; and gives a cost basis
      derived from ai-gen estimate (NOT the JSON credits_used field, which over-reports). Any
      verification flag, missing-audio shot, or room-tone bed added in the fallback is
      disclosed.
      10 = the summary is a faithful production log a re-render could rely on; route, model,
      cost basis, and any fallback/flag all honest. 5 = mostly accurate but a fallback, a
      verification flag, or the cost basis went unstated or used credits_used. 0 = summary
      missing or contradicts the artifacts (claims the single-call route when the fallback
      ran, claims audio that is absent, or fabricates a model/cost).

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-027-seedance-cinematic/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: identity drift / weak cuts across shots → fix in the PROMPT
  COMPOSITION first (pass BOTH bible images as `--ref` so @Image1/@Image2 are bound; keep the
  shot-list's trait tokens VERBATIM; the "maintain the EXACT same character identity" line
  present; ≤6 shots) before touching scripts. The single-call `reference-to-video` route is
  the proven path (PoC 8.8/10) — the per-shot fallback is a degradation, only on failure, and
  must be disclosed. Per-model mechanics live in `references/seedance-dialect.md`.
- Constraints not in the rubric: a render costs real credits (~908 cr ≈ $3.63 @ 720p/15s
  fast) and ~2-5 min — prefer fixing the composed prompt over re-rendering; trust
  `ai-gen estimate` / `ai-gen balance`, never `credits_used`. A failed generation isn't
  charged, but a needless re-render is. Drop to 480p to halve cost while iterating.
