---
skill: bot-029-keyframe-plan
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. Anchors at 0 / 5 / 10.
# keyframe-plan.md is a TEXT output (pure-LLM phase, no media): all three dims read the file.
# No media-judge dimension — this skill renders nothing; the render skill owns the MP4 judge.
dimensions:
  - id: keyframe-states-and-arc
    weight: 0.40
    jtbd_source: JTBD-1
    judge_prompt: |
      Read keyframe-plan.md. Score 0-10 whether the keyframe STATES are real first-last-frame
      keyframing with a clean transformation arc — not a flat sequence. Check: the ## Style
      header pairs a genre with concrete look words (a medium + lighting + a color/palette
      phrase), never bare 'cinematic'/'epic'; ## Character lists 5-7 concrete frozen tokens
      (face/body/color/eyes/signature) for a friendly stylized creature/character with no
      realistic human face; ## Keyframe States lists states numbered contiguously from State 0,
      EACH a FULL STANDALONE image description (character + setting + lighting, no reference to
      other states); the state sequence walks a clean arc (dormant/hidden -> first sign ->
      emergence -> full form -> payoff action) where each state has a visibly distinct
      silhouette from its neighbours so the motion between them is legible.
      10 = the header is concrete, the tokens are specific, every state is a complete
      standalone image, and the states form a vivid distinct-silhouette transformation that
      reads as a directed reveal/morph.
      5 = states are concrete but the arc is flat (two adjacent states look near-identical, or
      one state references another instead of standing alone), or the header/tokens are thin.
      0 = the header is a bare 'cinematic/epic' line, states are not standalone (they say "the
      same character, now bigger"), or there is no identifiable arc — it would render as mush.

  - id: continuity-chain-and-state-arithmetic
    weight: 0.35
    jtbd_source: acceptance-scenario:JTBD-1
    judge_prompt: |
      Read keyframe-plan.md. Score 0-10 the continuity chaining and the K+1-states-for-K-scenes
      arithmetic — the thing the render phase pins frames against. Check: there are exactly K+1
      numbered states (State 0..State K) for the K numbered scenes; ## Scenes has K scenes
      numbered contiguously from Scene 1; EVERY scene declares its chain as 'state (i-1) ->
      state i' (scene 1 = state 0 -> state 1, scene 2 = state 1 -> state 2, ...) so each state
      is the END of one scene AND the START of the next with NO skipped states and NO jump
      cuts; each scene carries exactly ONE motion/transition (one beat the i2v model can
      interpolate between the two pinned frames), not two stacked beats; the Total footer's
      scene count equals the number of scenes and the aspect matches the requested AR.
      10 = exactly K+1 states for K scenes, every scene's chain is the correct contiguous
      'state (i-1) -> state i', one beat per scene, and the footer agrees.
      5 = mostly correct but one scene skips a state, or a scene packs two beats, or the footer
      scene count/aspect disagrees by a small margin.
      0 = the state/scene count is off-by-one (K states for K scenes), scenes skip states
      (jump cuts), or scenes do not declare the chain at all — the render would mis-pair frames.

  - id: frozen-token-lock-and-audio-disclosure
    weight: 0.25
    jtbd_source: skill-quality-criteria
    judge_prompt: |
      Read keyframe-plan.md. Score 0-10 whether the SELF-CONTAINED character is correctly
      locked and the audio footer is honest. Check: the character lives entirely in the
      keyframes — there is NO separate character-bible artifact referenced; every frozen
      ## Character token reappears VERBATIM (byte-identical, no paraphrase — 'amber eyes' stays
      'amber eyes') somewhere in the State descriptions so the creature renders the same in
      every frame; the character is referred to briefly in the scene lines (e.g. 'the dragon')
      rather than re-described in full per scene; no realistic identifiable human face or real
      named person appears (friendly stylized characters/creatures only); the footer's 'Audio:'
      clause names an ambient music bed + gentle SFX and EXPLICITLY discloses it as an ADDED
      ambient bed because the render clips are silent (never claims native audio).
      10 = the character is self-contained, every token is reused verbatim, scenes reference
      not re-describe, no face-policy violation, and the audio is honestly disclosed as an
      added silent-clip bed.
      5 = tokens are locked but one is paraphrased in a state, or a scene re-describes the
      character in full, or the audio clause is present but does not disclose it as added.
      0 = tokens are not reused verbatim (drift), a separate bible is assumed, a realistic
      human face is described, or the audio is claimed as native.

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-029-keyframe-plan/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: tighten the worked baby-dragon example and the distinct-silhouette
  guidance in references/keyframe-grammar.md before touching the workflow steps; the linter
  (scripts/validate-keyframe-plan.sh) is the structural floor — the K+1/K arithmetic, the
  contiguous continuity chain, and the verbatim-token lock are mechanically gated, so the rubric
  ceiling is arc quality (distinct silhouettes, a clean transformation) and the honest audio
  disclosure.
- Constraints not in the rubric: pure-LLM phase (no generation cost, no network); keep the whole
  file ≤1200 words; the character is SELF-CONTAINED in the keyframes (no separate bible); K+1
  states for K scenes; friendly stylized characters/creatures only (no realistic human faces);
  never paraphrase a frozen token; Hailuo clips are silent so the audio bed is always disclosed
  as added.
