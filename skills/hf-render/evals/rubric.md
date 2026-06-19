---
skill: hf-render
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# hf-render is a VISUAL skill. The dominant dimension is media-judge over the rendered frames
# (the in-session model READS exports/frames/*.png and the MP4 — keyless host-session vision path).
# Weights sum to 1.00. Dimensions trace to 1-requirements.md JTBD rows.
dimensions:
  - id: render-validity
    weight: 0.25
    jtbd_source: JTBD-1
    judge_prompt: |
      Read the render report + ffprobe output. Score 0-10 on a structurally valid render:
      one MP4 per requested aspect ratio at exports/<name>-<ar>.mp4; each is H.264 with the
      correct width/height for its AR/orientation, a real frame rate, and a non-zero duration;
      key frames were extracted to exports/frames/; the render ran locally (no HeyGen cloud/
      lambda/auth) and self-healed Chrome correctly. A different-orientation AR is reported as
      a re-author (routed to hf-build), not silently mis-rendered.
      10 = every requested AR is a verified, correctly-dimensioned MP4 (or correctly routed).
      5 = renders but one dimension/codec/duration check is off, or frames not extracted.
      0 = no MP4, wrong codec, or a stretched/wrong-dimension output.

  - id: legibility
    weight: 0.25
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "exports/"
    judge_prompt: |
      Look at the rendered frames (exports/frames/*.png) and/or the MP4. Score 0-10 on
      legibility and fidelity: the headline and key facts are present and readable, high
      contrast against the background, text fully inside the safe zone for the aspect ratio
      (no clipping at edges, no overlap). For data-viz, the numbers shown EXACTLY match the
      input data and do not jitter (tabular-nums). Nothing on screen is invented.
      10 = every sampled frame is legible, safe-zone-correct, and faithful. 5 = legible but a
      frame clips text at an edge or a number is hard to read. 0 = clipped/illegible text,
      blank/black frames, or fabricated text/numbers.

  - id: composition-quality
    weight: 0.20
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "exports/"
    judge_prompt: |
      Look at the rendered frames. Score 0-10 on composition craft: clear visual hierarchy
      (one dominant element per frame), appropriate density (not empty, not cluttered),
      edge-anchored / grid-aligned layout, and a deliberate use of the frame — NOT a centered
      single element with everything else blank. 10 = each frame reads as designed motion
      graphics. 5 = competent but generic (centered, sparse). 0 = unbalanced, cluttered, or
      a single centered line on an empty frame.

  - id: motion-quality
    weight: 0.15
    source: media-judge
    jtbd_source: acceptance-scenario:JTBD-1
    media_glob: "exports/"
    judge_prompt: |
      Look at frames sampled across time, especially around a scene transition. Score 0-10 on
      motion quality as visible in the frames: evidence of entrances (elements at different
      stages of arriving), varied easing rather than uniform fades, and a real scene transition
      (a wipe/flash/iris/push captured mid-transition), not just cross-dissolves. 10 = clear
      varied motion + a real transition. 5 = motion present but uniform/flat fades only. 0 =
      static frames with no sign of designed motion.

  - id: brand-application
    weight: 0.15
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "exports/"
    judge_prompt: |
      Look at the rendered frames and compare against 01-concept.md. Score 0-10 on brand
      application: the concept's color palette (accent + neutrals, by hex feel) and the
      concept's display/text typography are clearly applied; the look is cohesive across
      scenes. 10 = unmistakably on-brand and consistent. 5 = partially on-brand (palette right
      but default/fallback fonts, or vice-versa). 0 = generic defaults, off-palette, or
      inconsistent scene-to-scene.

guardrails:
  must_pass:
    - smoke_install
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/hf-render/evals/rubric.md
    - bot/skills/hf-render/scripts/render.sh
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- The four media-judge dims grade the EXTRACTED FRAMES — they are only as good as the composition;
  most fixes for legibility/composition/motion/brand belong in hf-build (and its template `:root` tokens),
  not in render.sh. render.sh's job is a valid, verified, self-healing render + frame extraction.
- render.sh quirks already fixed (keep): `--resolution` cannot rotate (different orientation = re-author in
  hf-build); empty CHROME_ARGS under `set -u` needs the `${ARR[@]+...}` idiom; snapshot/extract run from
  inside the composition dir.
- On host the named families (Inter/Outfit/Anton/Fraunces/Space Grotesk) fall back to a system face; in
  sl8-animation they bind via fontconfig — judge brand-application leniently on host, strictly in-sandbox.
