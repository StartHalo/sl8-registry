---
skill: bot-026-video-ad
target_score: 0.85
publish_threshold: 0.80
stuck_window: 10
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. The media dims grade the ACTUAL output
# MP4 (sampled frames) viewed against the input hero still (judge_model must be
# vision-capable; keyless host-session vision per stage-4-test.md). The discipline
# dim reads video-qc.md + the note JSON.
dimensions:
  - id: product-identity-vs-input
    weight: 0.35
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "01-ad/base.mp4"
    judge_prompt: |
      View the clip's frames (sample across the duration) next to the input
      inputs/hero.jpg. Score 0-10 on whether it is the SAME PRODUCT as the hero —
      color/finish, shape/proportions, and material all match across the whole clip,
      with NO swap to a different object, no invented prop, and no hallucinated
      variant. This is the #1 dimension — it is the answer to "the model invented a
      different product" and to "Color Not as Described" returns.
      10 = indistinguishably the same product throughout; a buyer would not be
      surprised. 5 = clearly the same product but one attribute drifts mid-clip
      (a shifted color, a softened shape) without a flag. 0 = a different/invented
      product (the luggage-tag failure), wrong color, or fabricated detail.

  - id: motion-safety-no-artifacts
    weight: 0.25
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "01-ad/base.mp4"
    judge_prompt: |
      View the clip in sequence. Score 0-10 on motion discipline + clean rendering:
      exactly ONE slow camera move (push-in / subtle orbit / pull-out / light sweep /
      static), no melted geometry, no jitter, no morphing edges, no compression mush,
      no flicker, no spawned/duplicated objects or limbs; the clip is 9:16 vertical.
      10 = a smooth, single-move, artifact-free commercial clip. 5 = mostly clean but
      a brief warp, a slightly too-busy move, or minor edge morph. 0 = melted geometry
      / heavy jitter / an aggressive move that destabilized the product.

  - id: logo-label-stability
    weight: 0.20
    source: media-judge
    jtbd_source: JTBD-2
    media_glob: "01-ad/base.mp4"
    judge_prompt: |
      Watch the logo/label across the whole clip. Score 0-10 on stability: the logo
      and any label text stay sharp, correctly placed, and unwarped from the first
      frame to the last — no garbled, melted, drifting, or invented text. Text most
      often warps mid-move, so judge the motion, not one frame.
      10 = the logo/label is rock-stable and legible throughout. 5 = legible but it
      softens or drifts slightly during the move. 0 = garbled/melted/invented text or
      a logo that morphs into something else.

  - id: audio-and-format
    weight: 0.10
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "01-ad/base.mp4"
    judge_prompt: |
      Score 0-10 on the deliverable basics: if in-pass audio was requested, there is a
      clean audio track (room tone / soft ambience) with no jarring artifact; the clip
      is a valid 9:16 mp4 of the requested duration; it reads as an ad clip, not a raw
      test. 10 = a clean, audible, correctly-formatted ad clip. 5 = correct format but
      thin/absent audio that was honestly flagged. 0 = wrong aspect, broken file, or a
      jarring audio artifact presented as fine.

  - id: qc-honesty-and-discipline
    weight: 0.10
    source: llm-judge
    jtbd_source: failure-mode:JTBD-1
    judge_prompt: |
      Cross-check video-qc.md + the *.note.json against the artifacts. Score 0-10 on
      honesty + discipline: EVERY clip has a video-qc verdict (pass / drift-dropped /
      low-confidence) with a reason; drifted clips are DROPPED, not shipped; variants
      were fanned out ONLY after the base clip passed QC and each changed one variable;
      any aggressive camera move was auto-substituted and the substitution recorded in
      note.json; reflective/metallic/fine-text products are flagged low-confidence →
      human review; no auto-publish; the clip was downloaded from files[0].local_path
      (not a fal URL) and credits_used was not trusted.
      10 = a faithful, disciplined production log. 5 = mostly honest but a drift or a
      low-confidence class went unflagged, or a variant shipped without a QC verdict.
      0 = the report contradicts the clips (claims identity the frames deny, ships a
      drifted clip, or fans out off a failed base clip).

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-026-video-ad/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- The load-bearing rule: the reachable i2v models have NO geometry lock — identity is
  held by the strict-product prompt (ONE slow safe move) + the BLOCKING video-qc, not
  by the model. If product-identity scores low, first confirm the start frame attached
  (Seedance `--image`→image_url; Kling needs positional `start_image_url`) and that the
  move was not an aggressive one that slipped past the substitution.
- Techniques to prioritize: melted geometry / warped logo → slow the move down
  (push-in or static) and confirm motion-prompt.py substituted any aggressive MOVE
  before touching gen-video.sh; Kling product-mismatch → the start frame did not
  forward, prefer Seedance; identity drift on variants → confirm each variant
  re-anchored off the SAME hero (not a prior clip) and the base clip passed QC first.
- Constraints not in the rubric: video is the most expensive op — confirm the base
  clip PASSES QC before any fan-out; fal URLs expire (use files[0].local_path); ignore
  credits_used (read balance deltas); video-qc is BLOCKING — never ship a drifted clip.
