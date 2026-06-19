---
skill: bot-016-reference-sheet
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. The first dimension is a media-judge that
# grades the ACTUAL pixels (judge_model must be vision-capable; grading via the keyless
# host-session vision path per stage-4-test.md § Media (vision) grading). The other two
# grade the production log and prompt fidelity (text).
dimensions:
  - id: turnaround-consistency
    weight: 0.50
    source: media-judge
    jtbd_source: JTBD-2
    media_glob: "reference-sheet.png|hero.png"
    judge_prompt: |
      Look at reference-sheet.png AND hero.png together. Score 0-10 whether they lock a
      usable, consistent character bible:
      - reference-sheet.png is a multi-view turnaround showing the requested angles
        (front, three-quarter, side, back by default) of the SAME character — face,
        hair, outfit, and color palette agree across EVERY view, with no drift,
        warping, melted forms, or extra/duplicate figures; clean neutral background;
        no readable text printed in the image.
      - hero.png is a single clean front-facing portrait of that SAME character (one
        figure, on-brief, usable as an i2v start frame), no in-image text.
      - both are on-brief for the character described in the spec's CHARACTER_BLOCK.
      10 = a stranger would say "same character across the whole bible"; all views
      present and consistent; hero is clean and matches the sheet; on-brief; no text.
      5 = right character but one or two views drift (hair/outfit changes between
      angles), OR a view is missing, OR the hero subtly differs from the sheet, OR stray
      text appears. 0 = different characters per view, warped/duplicate anatomy, wrong
      subject vs the brief, illegible sheet, or text plastered across the image.

  - id: log-integrity
    weight: 0.25
    jtbd_source: acceptance-scenario:JTBD-2
    judge_prompt: |
      Read generation-log.md. Score 0-10 the production log's completeness and honesty:
      per asset (reference-sheet.png AND hero.png) it records the producing model (a slug
      from the pinned chain fal-ai/nano-banana-pro -> openai/gpt-image-2 ->
      fal-ai/nano-banana-2 — no out-of-chain names), the seed, the aspect ratio, the
      ref used (a path or "none"), a fal.media URL, any fallbacks taken (in order), the
      full composed prompt, and a self-check verdict. If a model fell back, the
      substitution is recorded (never silent).
      10 = both assets fully accounted for; a re-run could reproduce the bible; chain
      order respected; fallbacks honestly recorded. 5 = log present but fields missing
      on an asset (no URL, no self-check, no fallback note). 0 = log missing,
      fabricated-looking, or names a model outside the documented chain.

  - id: prompt-fidelity
    weight: 0.25
    jtbd_source: skill-quality-criteria
    judge_prompt: |
      Compare character-spec.md's frozen blocks against every composed prompt recorded in
      generation-log.md. Score 0-10 verbatim-reuse discipline: the spec's CHARACTER_BLOCK
      and STYLE_STACK appear EXACTLY (byte-for-byte) in BOTH the sheet prompt and the hero
      prompt — no paraphrase, no synonym substitution, no reordered tokens; the seed from
      the spec is used for both; a "no text in the image" constraint is appended; and the
      reference image (when the spec names a path) is passed as --ref.
      10 = perfect verbatim reuse of both blocks in both prompts, fixed seed, no-text
      appended, ref honored. 5 = meaning preserved but a token paraphrased or reordered in
      one prompt (the drift vector), or the no-text constraint missing. 0 = the prompts
      re-describe the character/style freely, or the seed/ref were dropped.

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-016-reference-sheet/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: identity drift across views is the #1 miss — fix it in the
  PROMPT ASSEMBLY (frozen blocks verbatim + ref on every call + fixed seed), not by
  re-describing the character. The frozen blocks come FROM the spec; this skill must never
  paraphrase them. Per-model quirks (the gpt-image-2 ref flag, the "no text" gotcha) belong
  in references/nbp-dialect.md.
- Constraints not in the rubric: image generations cost credits — a failed generation is
  not charged, but a needless retry-loop is; the script walks the chain once and self-check
  allows exactly ONE retry. Trust ai-gen estimate / balance, never credits_used.
