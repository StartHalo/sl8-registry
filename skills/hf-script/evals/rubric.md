---
skill: hf-script
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# hf-script is a TEXT/authoring skill (it writes 02-script.md, not pixels). All dimensions read the
# written script + the brief (context.md) it was built from; weights sum to 1.00. There is NO
# media-judge dimension here — on-screen-text fidelity is checked as TEXT; the rendered frames are
# graded downstream by hf-render's media-judge rubric. Dimensions trace to JTBD rows in 1-requirements.md.
dimensions:
  - id: fact-fidelity
    weight: 0.40
    jtbd_source: JTBD-1
    judge_prompt: |
      Read 02-script.md and the brief (context.md) it was written from. Score 0-10 on fidelity:
      every concrete fact in the script (numbers, percentages, currency, names, dates, quotes,
      specific claims) traces to the brief, and the script's provenance table maps each one to its
      source; connective/framing lines carry NO new fact and are marked as framing. Numbers appear
      EXACTLY as the brief gave them (no unrequested rounding, no derived/invented statistics); for a
      data video the figures equal the input data exactly. No invented customers, counts, superlatives,
      offers, or claims.
      10 = every fact traceable, provenance table complete, numbers exact, zero fabrication.
      5 = mostly faithful but one untraceable claim OR a rounded/altered number OR a missing
      provenance row. 0 = invented facts/numbers, or no provenance discipline at all.

  - id: beat-structure
    weight: 0.25
    jtbd_source: JTBD-1
    judge_prompt: |
      Read 02-script.md. Score 0-10 on structure: a named narrative arc (e.g. hook -> context ->
      proof -> payoff/CTA, or a data arc) with ONE focal idea per beat; beat count fits the duration
      (~1 beat per 3-5 s); the hook earns attention in the first ~2 s; the final beat lands a
      payoff/takeaway (no invented CTA). The per-beat table has the expected columns
      (#, seconds, VO line, on-screen text, focal token).
      10 = clear arc, well-cut beats, one idea each, sensible count for the duration.
      5 = beats present but a muddy arc, two facts crammed in a beat, or a weak hook.
      0 = an undifferentiated wall of text or no beat structure.

  - id: distillation-discipline
    weight: 0.20
    jtbd_source: JTBD-1
    judge_prompt: |
      Read 02-script.md. Score 0-10 on the two-layer rule: each beat has BOTH a VO (narration) line
      and a SEPARATE on-screen-text distillation, and the on-screen text is a headline / 1-4 keywords /
      a bare number (with a focal token), NOT the VO sentence copied verbatim. VO is written for the
      ear (short clauses, numbers spoken naturally); on-screen carries the figure form (47%, $1.2M).
      10 = every beat distilled, on-screen text tight (<= ~6 words) and distinct from the VO.
      5 = mostly distilled but one or two beats paste the VO sentence on screen, or on-screen text is
      bloated. 0 = on-screen text is the narration verbatim throughout.

  - id: pacing-and-defaults
    weight: 0.15
    jtbd_source: JTBD-4
    judge_prompt: |
      Read 02-script.md. Score 0-10 on pacing + headless hygiene: per-beat seconds are estimated
      (~vo_words/2.5, floor ~1.2 s) and sum to ~the target duration (default 15 s when the brief is
      silent); the assumptions block states the resolved defaults (duration, audience, narrated/silent)
      and any thin-brief gaps; tone/pacing align to 01-concept.md's mood. For a re-script (changed
      fact), only the changed fact is edited and the arc/other beats are preserved.
      10 = paced and summed, defaults stated, mood-aligned, re-script surgical.
      5 = seconds present but don't sum near target, or defaults not stated. 0 = no pacing and no
      stated assumptions.

guardrails:
  must_pass:
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/hf-script/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- The #1 failure mode is FABRICATION — an untraceable number/claim sinks the run. Build the fact
  inventory + provenance table FIRST (see references/fidelity-rule.md), then write only from it.
- The #2 failure mode is pasting the VO sentence as on-screen text. On-screen = the distillation
  (headline/keyword/number); VO = the sentence. Keep them in separate columns.
- Restyle/re-voice/resize must NOT change facts — only a re-script (changed message) does. If a
  "restyle" smuggles in a new fact, split it (re-script for the fact, then restyle).
- Faithful + shorter beats a padded script with an invented fact every time.
