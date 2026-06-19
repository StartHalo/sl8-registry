---
skill: hf-storyboard
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# hf-storyboard is a STRUCTURAL/planning skill: it produces the per-beat build contract
# (03-storyboard.md), not pixels and not HTML. All dimensions read the storyboard markdown
# against 01-concept.md / 02-script.md (and 04-timing.json when present); weights sum to 1.00.
# Rendered-frame quality is graded downstream (hf-render's media-judge rubric). No media-judge here.
dimensions:
  - id: contract-completeness
    weight: 0.40
    jtbd_source: JTBD-1
    judge_prompt: |
      Read 03-storyboard.md against 02-script.md. Score 0-10 on the per-beat BUILD CONTRACT being
      complete and buildable: there is exactly one beat row per script beat, in order; and EVERY
      beat row names (1) at least one registry block/component (or an explicit "hand-author" + a
      named motion rule), (2) a transition out — with the FINAL beat marked "— (final)" and every
      non-final beat naming a real transition (liquid-wipe/flash/iris/push/block-wipe), (3) a track
      layout stating which data-track-index each element sits on, and (4) a frame range given in
      BOTH seconds and frames. 10 = every beat has all four, complete and consistent. 5 = beats
      present but one field is missing on some rows (e.g. no track index, or frames only in seconds).
      0 = beats missing, or rows lack blocks/transitions/tracks so hf-build cannot author from it.

  - id: track-layout-validity
    weight: 0.25
    jtbd_source: JTBD-1
    judge_prompt: |
      Read the track layout + frame ranges against the composition contract (clips & tracks rule).
      Score 0-10 on the layout being renderable: scene content is on the scene track; each overlay
      (caption rail, lower-third, transition) is on its OWN distinct data-track-index so it does not
      time-overlap the scene clip; adjacent same-track clips do not share a boundary (slot durations
      are gapped, e.g. 5.97 for a 6s slot); the composition duration equals the last beat's end. For
      multiple aspect ratios, a separate composition header + layout per orientation with its own
      root size and safe-zone notes. 10 = layout obeys the contract and would lint clean. 5 = mostly
      valid but one overlap/boundary issue or an overlay sharing the scene track. 0 = same-track
      overlaps throughout, or overlays not separated, so it would lint as overlapping_clips_same_track.

  - id: fidelity-of-on-screen-text
    weight: 0.20
    jtbd_source: JTBD-2
    judge_prompt: |
      Compare each beat's on-screen-text column against 02-script.md. Score 0-10: the on-screen text
      is copied VERBATIM from the script's on-screen text (NOT the VO/narration line, NOT paraphrased,
      NOT invented); for data beats the figures and units exactly equal those in the script (no
      rounded-away or fabricated numbers). 10 = every row's text and every figure is faithful. 5 =
      faithful but a VO line leaked in as on-screen text on one beat, or a figure lost its unit. 0 =
      invented copy/numbers, or narration pasted as the on-screen text.

  - id: theming-and-reuse-notes
    weight: 0.15
    jtbd_source: acceptance-scenario:JTBD-1
    judge_prompt: |
      Read the Composition header + Notes-for-hf-build against 01-concept.md. Score 0-10: the header
      records the palette hex and the display/text font families taken from the base concept and the
      root size per requested aspect ratio + duration; the notes flag the emphasis phrases, the
      theming instruction (override block CSS to the concept palette + literal font families), and
      which blocks are reused (bundled) vs added; defaults applied (AR, word-count pacing when no
      04-timing.json) are stated. 10 = a hf-build author has everything needed to theme + reuse-first.
      5 = header present but theming/reuse notes thin or defaults not stated. 0 = no theming carried
      from the concept and no build notes.

guardrails:
  must_pass:
    - smoke_install
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/hf-storyboard/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- The #1 failure is an INCOMPLETE beat row: a beat must carry block + transition-out + track-layout +
  frame-range. If the iterator loosens the table, contract-completeness drops — keep all four columns.
- On-screen text must be the script's on-screen text, never the VO line. A common slip is pasting the
  narration; the rubric's fidelity dimension penalizes it.
- Track-layout validity mirrors hf-build's contract (overlaps + shared boundaries). If a beat's layout
  would lint as overlapping_clips_same_track in hf-build, fix it HERE (gap durations / separate overlay
  tracks), not downstream.
- A different aspect-ratio orientation = a separate header + layout (hf-build re-authors per orientation;
  --resolution cannot rotate). Don't collapse two orientations into one layout.
