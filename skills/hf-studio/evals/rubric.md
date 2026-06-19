---
skill: hf-studio
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# hf-studio is the end-to-end ORCHESTRATOR + a VISUAL skill. It is graded on two things at once:
# (1) did it walk the whole chain correctly and produce every phase artifact with the validate gate
#     honored (process integrity — structural), and
# (2) is the FINAL deliverable an on-brand, legible, faithful MP4 (media-judge over the rendered frames —
#     the in-session model READS exports/frames/*.png and the MP4; keyless host-session vision path).
# Weights sum to 1.00. Dimensions trace to 1-requirements.md JTBD rows.
dimensions:
  - id: chain-completeness
    weight: 0.30
    jtbd_source: JTBD-1
    judge_prompt: |
      Read state.md, 06-summary.md, and the artifacts/<project>/ tree. Score 0-10 on the
      orchestrator walking the full 7-phase chain and producing EVERY phase artifact at its
      contract path: 01-concept.md, 02-script.md, 03-storyboard.md, 04-timing.json (+ assets/
      vo/*.wav when narrated), composition/, 05-validation.md, exports/<name>-<ar>.mp4, and the
      run summary 06-summary.md. Each later phase must have read the upstream artifact it depends
      on (no skipped or fabricated phase). For JTBD-3 the front-end is the clip transcript (concept/
      script are a light preset) — that variant is still complete if every required artifact exists.
      10 = every phase artifact present and consistent; the chain was walked in order. 5 = the MP4
      exists but a mid-chain artifact (e.g. the storyboard or the summary) is missing or stale.
      0 = phases skipped, the MP4 produced with no upstream artifacts, or no deliverable.

  - id: gate-integrity
    weight: 0.20
    jtbd_source: JTBD-1
    judge_prompt: |
      Read 05-validation.md and the render report. Score 0-10 on the orchestrator HONORING the
      pre-render gate and the local/keyless + headless rules: hf-validate reported PASS (0 lint
      errors + key frames captured) BEFORE the render ran (no unvalidated render); the render was
      local (no HeyGen cloud/lambda/auth); a different-orientation AR was treated as a re-author in
      hf-build, not silently mis-rendered; missing optional inputs fell back to documented defaults
      (16:9/context voice/music off/draft) with no runtime prompt, and a missing required brief
      failed cleanly in state.md. 10 = the gate and all rules were honored. 5 = rendered but the
      validate verdict is missing/ambiguous, or a default was applied without recording it.
      0 = rendered an unvalidated/blocked composition, used a cloud/auth path, or prompted the user.

  - id: legibility-fidelity
    weight: 0.20
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "exports/"
    judge_prompt: |
      Look at the final rendered frames (exports/frames/*.png) and/or the MP4. Score 0-10 on
      legibility + fidelity of the DELIVERABLE: the headline and key facts from the brief are
      present, readable, high-contrast, fully inside the safe zone for the aspect ratio (no edge
      clipping, no overlap). Nothing on screen is invented. For a data video (JTBD-2) the numbers
      shown EXACTLY match the input data and do not jitter (tabular-nums). For a multi-AR export,
      each AR is safe-zone-correct. 10 = every sampled frame is legible, safe-zone-correct, and
      faithful. 5 = legible but a frame clips text at an edge or a number is hard to read. 0 =
      clipped/illegible text, blank/black frames, or fabricated text/numbers.

  - id: brand-and-motion-quality
    weight: 0.20
    source: media-judge
    jtbd_source: acceptance-scenario:JTBD-1
    media_glob: "exports/"
    judge_prompt: |
      Look at the rendered frames (and compare against 01-concept.md). Score 0-10 on the
      deliverable being designed motion graphics, not auto-generated: the concept's color palette
      (accent + neutrals) and display/text typography are clearly applied and cohesive across
      scenes (on-brand); the composition shows clear hierarchy + appropriate density, edge-anchored
      / grid-aligned (not a centered single element on an empty frame); and across frames sampled
      near a scene transition the motion shows varied easing + a real transition (a wipe/flash/iris/
      push captured mid-transition), not just uniform cross-fades. 10 = on-brand, composed, and
      visibly varied motion with a real transition. 5 = competent but generic (default fonts, or
      centered/sparse, or only fades). 0 = off-palette/default look, unbalanced, and static.

  - id: reentry-fact-preservation
    weight: 0.10
    jtbd_source: JTBD-4
    judge_prompt: |
      For a re-entry request (restyle / re-voice / resize), score 0-10 on the orchestrator
      re-entering the chain at the EARLIEST phase the change touches and PRESERVING upstream facts:
      a restyle/resize re-enters at build (phase 5) reading the UNCHANGED 02-script.md/03-storyboard.md
      (on-screen text/numbers byte-identical to the prior render); a re-voice re-enters at phase 4;
      a same-orientation re-render at phase 7; a change that implies NEW facts is routed back to
      script (phase 2) and stated, never silently invented. New exports sit beside the originals;
      06-summary.md gains a dated revision note. (For a first-run brief with no re-entry, score this
      dimension on whether the run AVOIDED inventing/altering any user-provided fact.)
      10 = re-entered at the right phase with facts frozen and a note added. 5 = correct output but
      re-derived an upstream phase it didn't need to, or no revision note. 0 = altered the facts on
      a restyle, or silently invented new facts.

guardrails:
  must_pass:
    - smoke_install
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/hf-studio/evals/rubric.md
    - bot/skills/hf-studio/scripts/run.sh
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- hf-studio is a CONDUCTOR — it does not author the concept/script/storyboard or the scene HTML, and it
  does not re-implement validate/render. Most fixes for the media-judge dims (legibility/brand/motion)
  belong DOWNSTREAM in hf-build (and its template `:root` tokens) or hf-concept, not in hf-studio. Fix
  hf-studio only for chain/ordering/gate/re-entry/summary problems.
- `run.sh` is a thin driver over the three sibling scripts (init.sh → validate.sh → render.sh). It STOPS
  after scaffolding (rc 3, "author the scenes") and STOPS if validate BLOCKS (rc 2) — those are correct,
  not bugs. Host-proven end-to-end: scaffold → validate PASS (0 errors) → verified 1920×1080 h264 MP4.
- Re-entry discipline is the cheapest dimension to lose: a restyle/resize must NOT re-run script; facts
  stay byte-identical. A different-orientation AR is a re-author at phase 5, not a render flag.
- On host the named families (Inter/Outfit/Anton/Fraunces/Space Grotesk) fall back to a system face; in
  sl8-animation they bind via fontconfig — judge brand-application leniently on host, strictly in-sandbox.
