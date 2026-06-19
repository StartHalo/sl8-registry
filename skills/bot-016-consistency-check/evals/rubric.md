---
skill: bot-016-consistency-check
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. grade-soundness is a media-judge dim: it
# grades the actual sheet pixels against the written verdict (judge_model must be
# vision-capable; grading via the keyless host-session vision path per
# stage-4-test.md § Media (vision) grading).
dimensions:
  - id: grade-soundness
    weight: 0.45
    source: media-judge
    jtbd_source: JTBD-3
    media_glob: "reference-sheet.png"
    judge_prompt: |
      Look at reference-sheet.png, then read consistency-check.md alongside
      character-spec.md. Score 0-10 whether the written grade actually matches what
      the sheet shows. Check each per-trait verdict against the pixels: a token marked
      'consistent' really IS the same across the views (front/three-quarter/side/back);
      a token marked 'drift' really DOES differ in some view or mismatch the spec token;
      a token marked 'absent' really is missing. Then check the overall 0-10 score and
      the pass/regenerate verdict are justified by those per-trait facts (pass at >=7,
      regenerate below).
      10 = every per-trait verdict is correct against the pixels and the overall
      score + pass/regenerate verdict follow from them; a vision expert agrees.
      5 = mostly right but one trait is mis-graded (a real drift called consistent, or
      a consistent trait called drift) OR the overall score/verdict is off by a band.
      0 = the grade contradicts the pixels (passes a clearly drifting sheet, or fails a
      clearly consistent one), or the verdict reads as graded from the spec text /
      filename rather than the image.

  - id: package-completeness
    weight: 0.30
    jtbd_source: JTBD-3
    judge_prompt: |
      Read character-bible.md (and confirm against the project folder). Score 0-10
      whether it is a complete, portable manifest. It must index every bible artifact
      that exists — character-spec.md, reference-sheet.png, hero.png, generation-log.md,
      consistency-check.md — each with its path; state the fixed seed read from the
      spec; and carry the downstream-use paragraph naming hero.png as the front-frame,
      reference-sheet.png as the identity reference, and CHARACTER_BLOCK as the tokens.
      Any optional artifact genuinely missing from disk should be NOTED as missing, not
      omitted silently.
      10 = every artifact indexed with correct paths, seed stated, downstream paragraph
      present and accurate; a director bot could consume the bible from this file alone.
      5 = manifest present but a field is missing (no seed, or an artifact unlisted, or
      the downstream paragraph vague about which file feeds where).
      0 = manifest missing, wrong paths, or no downstream-use guidance.

  - id: honesty
    weight: 0.25
    jtbd_source: failure-mode:JTBD-3
    judge_prompt: |
      Read consistency-check.md and state.md. Score 0-10 the intellectual honesty of
      the verdict. On a genuinely drifting sheet it must recommend 'regenerate' with a
      same-seed, single-tightened-token instruction (the tightened token sharpened, not
      a synonym) and set state.md to re-run phase 2 once — never silently ship a
      drifting bible. On a genuinely consistent sheet it must 'pass' without inventing
      drift to look thorough. After one allowed regenerate that still scores below 7,
      it records the residual drift honestly and stops (no third loop).
      10 = verdict, regenerate instruction (when applicable), and ledger all match the
      real state of the sheet; honest pass and honest regenerate both handled right.
      5 = honest direction but the regenerate instruction is weak (changes more than one
      token, or re-rolls the seed, or paraphrases instead of tightening) or the ledger
      lags the verdict.
      0 = rubber-stamps a drifting sheet as pass, or fabricates drift on a clean sheet,
      or loops past the one allowed regenerate.

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-016-consistency-check/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: the #1 failure is grading from the spec text/filename instead
  of the pixels — reinforce "Read the image" in SKILL.md before touching anything else;
  a fabricated grade tanks grade-soundness AND honesty at once. The regenerate instruction
  must stay single-variable + same-seed + tighten-not-synonym (that is the consistency
  mechanism, not a style choice).
- Constraints not in the rubric: this phase makes NO ai-gen calls (it only Reads the sheet
  and runs package-bible.sh) — a regenerate is a recommendation that phase 2 executes, so
  no image credits are spent here.
