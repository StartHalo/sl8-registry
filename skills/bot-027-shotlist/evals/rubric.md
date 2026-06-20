---
skill: bot-027-shotlist
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. Anchors at 0 / 5 / 10.
# shotlist.md is a TEXT output (pure-LLM phase, no media): all three dims read the file.
dimensions:
  - id: shot-grammar-and-escalation
    weight: 0.40
    jtbd_source: JTBD-2
    judge_prompt: |
      Read shotlist.md. Score 0-10 whether the shots are real cinematic shot grammar with
      a genuine escalation arc — not a flat single clip cut into pieces. Check: each
      [Xs-Ys]: shot names exactly ONE camera move AND ONE concrete action (subject motion
      separated from camera motion); the global header pairs 'cinematic' with concrete look
      words (lighting + color grading + a medium/film reference), never bare 'cinematic' or
      'epic'; the arc escalates per the profile (story: wide establishing -> tighter ->
      climax -> resolve; fight: standoff -> first clash -> escalation -> counter -> final
      strike); exactly one slow-motion ramp lands on the key beat (story climax / fight
      final strike); 'fast' is never used unqualified across the whole frame.
      10 = every shot is one-camera-one-action, the header is concrete, the arc clearly
      escalates and resolves, and a single slow-mo ramp sits on the right beat — it reads
      like a directed sequence.
      5 = shots are concrete but the arc is flat (a list of related actions with no rising
      stakes), or one or two shots pack two actions / two camera moves, or the ramp is
      missing or on the wrong beat.
      0 = the header is a bare 'cinematic/epic' line, shots stack motion ambiguously, or
      there is no identifiable arc — it would render as mush.

  - id: time-code-arithmetic
    weight: 0.30
    jtbd_source: acceptance-scenario:JTBD-2
    judge_prompt: |
      Read shotlist.md. Score 0-10 the time-code arithmetic and footer agreement — the
      thing the render phase greps. Check: there are 4-6 numbered time-coded [Xs-Ys]:
      shots; they tile [0..duration] with NO gaps and NO overlaps (shot 1 starts at 0s,
      each shot's start equals the previous shot's end, the last shot ends at the target
      duration); the 'Total: Ns / K shots / AR.' footer's N equals the last time-code, K
      equals the number of written shots, and AR matches the requested aspect.
      10 = shots tile perfectly start-to-end and the Total footer's N / K / AR all agree
      with the time-codes and the shot count.
      5 = mostly correct but one boundary is off by a second, or the footer's shot count or
      aspect disagrees with the shots by a small margin.
      0 = gaps/overlaps in the time-codes, the codes don't reach the target duration, or
      the footer numbers contradict the shots — the render would mis-time or drop beats.

  - id: identity-lock-and-audio-footer
    weight: 0.30
    jtbd_source: skill-quality-criteria
    judge_prompt: |
      Read shotlist.md against the character-spec.md the project locked. Score 0-10 whether
      the bible is correctly pinned and the audio/constraint footer is complete. Check: an
      identity line names @Image1 (turnaround) and @Image2 (hero), references the character
      by name with at least one VERBATIM identity token from the spec (no paraphrase —
      'emerald eyes' stays 'emerald eyes'), and instructs to maintain the EXACT same
      identity in every shot; the character is referred to as 'the <Name>' in shots rather
      than re-described in full each time; no realistic identifiable human face is described
      (stylized characters/creatures only); the footer carries an 'Audio:' clause naming a
      native score mood + concrete SFX + an ambience bed, plus the positive-constraint
      suffix ('avoid identity drift ... stable picture, no flicker'); no negative 'no X'
      list leaks into a shot line.
      10 = identity line is exact and verbatim-tokened, character is referenced not
      re-described, the Audio clause and full constraint suffix are present, no face-policy
      or negative-prompt violations.
      5 = identity is locked but a token is paraphrased, or the Audio clause is thin (mood
      only, no SFX/ambience), or the suffix is partial.
      0 = no @Image identity line, the character is re-described per shot (drift risk), a
      realistic human face is described, or the Audio/constraint footer is missing.

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-027-shotlist/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: tighten the worked story + fight examples in
  references/shot-grammar.md before touching the workflow steps; the linter
  (scripts/validate-shotlist.sh) is the structural floor — escalation-arc quality and the
  verbatim identity lock are the ceiling the rubric grades.
- Constraints not in the rubric: pure-LLM phase (no generation cost); keep the whole file
  ≤1200 words so the composed render prompt stays within model limits; stylized
  characters/creatures only (Seedance restricts realistic human faces); never paraphrase a
  locked identity token.
