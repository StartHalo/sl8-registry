---
skill: bot-027-character-bible
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. Anchors at 0 / 5 / 10. This is a TWO-PHASE
# skill (lock the spec, then render the bible), so the rubric spans both: a media-judge
# that grades the ACTUAL pixels of the turnaround + hero (judge_model must be
# vision-capable; grading via the keyless host-session vision path per stage-4-test.md
# § Media (vision) grading), plus spec-discipline (the locked spec, text) and
# log-integrity (the production log, text).
dimensions:
  - id: bible-consistency
    weight: 0.45
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "reference-sheet.png|hero.png"
    judge_prompt: |
      Look at reference-sheet.png AND hero.png together. Score 0-10 whether they lock a
      usable, consistent character bible that a downstream video model could read to hold
      ONE identity across many shots:
      - reference-sheet.png is a multi-view turnaround showing the requested angles
        (front, three-quarter, side, back by default) of the SAME character — face,
        hair, outfit, and color palette agree across EVERY view, with no drift, warping,
        melted forms, or extra/duplicate figures; clean neutral background; no readable
        text printed in the image.
      - hero.png is a single clean front-facing portrait of that SAME character (one
        figure, on-brief, usable as an i2v start frame), no in-image text.
      - both are on-brief for the character described in the spec's CHARACTER_BLOCK.
      10 = a stranger would say "same character across the whole bible"; all views
      present and consistent; hero is clean and matches the sheet; on-brief; no text — a
      bible a video model could anchor every shot on. 5 = right character but one or two
      views drift (hair/outfit changes between angles), OR a view is missing, OR the hero
      subtly differs from the sheet, OR stray text appears. 0 = different characters per
      view, warped/duplicate anatomy, wrong subject vs the brief, illegible sheet, or text
      plastered across the image.

  - id: spec-discipline
    weight: 0.30
    jtbd_source: JTBD-1
    judge_prompt: |
      Read character-spec.md. Score 0-10 the trait-lock discipline + completeness that
      keeps the character consistent across every downstream shot: 5-7 DISTINCTIVE tokens
      (each visibly separates this character from a generic one — specific materiality, not
      filler like "brown hair"), ordered face -> hair -> eyes -> outfit/props; STYLE_STACK
      carries only style and CHARACTER_BLOCK carries only identity (no cross-contamination);
      every token in CHARACTER_BLOCK is BYTE-IDENTICAL to its bullet in the Identity Tokens
      list (the no-synonym rule — no paraphrase between list and block); all eight contract
      sections present and populated; exactly one fixed integer seed; a NAMED palette with
      a line of reasoning; and — where the brief was sparse or a reference was missing or a
      real-person/brand was swapped — a "Defaults applied" note that honestly flags every
      invented or substituted choice.
      10 = 5-7 sharply distinctive tokens, correctly ordered, blocks cleanly separated,
      every CHARACTER_BLOCK token a verbatim copy of a locked token (zero synonym drift),
      every section substantive, single fixed seed, named palette with apt reasoning,
      defaults flagged honestly — a downstream prompt could paste the blocks and reproduce
      the same character. 5 = the lock mostly holds but one or two tokens are generic
      filler, the ordering slips, style words leak into CHARACTER_BLOCK, one token is
      paraphrased between list and block, or a section is thin / a default unflagged.
      0 = tokens generic/unordered/freely re-worded, sections missing or empty, no seed or
      multiple seeds, or invented detail passed off as if it came from the brief.

  - id: log-integrity
    weight: 0.25
    jtbd_source: acceptance-scenario:JTBD-1
    judge_prompt: |
      Read bible-log.md. Score 0-10 the production log's completeness, honesty, and
      verbatim-reuse discipline: per asset (reference-sheet.png AND hero.png) it records the
      producing model (a slug from the pinned chain fal-ai/nano-banana-pro ->
      openai/gpt-image-2 -> fal-ai/nano-banana-2 — no out-of-chain names), the seed, the
      aspect ratio, the ref used (a path or "none"), a fal.media URL, any fallbacks taken
      (in order), the full composed prompt, and a self-check verdict; AND the composed
      prompt logged for each asset reuses the spec's CHARACTER_BLOCK and STYLE_STACK EXACTLY
      (byte-for-byte, no paraphrase/synonym/reorder), uses the spec's seed for both, and
      appends a "no text in the image" constraint; AND when the spec names a reference path,
      it is recorded as passed via --ref. If a model fell back, the substitution is recorded
      (never silent).
      10 = both assets fully accounted for, a re-run could reproduce the bible, chain order
      respected, fallbacks honestly recorded, and the frozen blocks appear verbatim in both
      prompts with the fixed seed + no-text + ref honored. 5 = log present but fields missing
      on an asset (no URL, no self-check, no fallback note), OR a token paraphrased/reordered
      in one prompt, OR the no-text constraint missing. 0 = log missing, fabricated-looking,
      names a model outside the documented chain, or the prompts re-describe the
      character/style freely / drop the seed/ref.

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-027-character-bible/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: identity drift across views/shots is the #1 miss — fix it in the
  PROMPT ASSEMBLY (frozen blocks verbatim + ref on every call + fixed seed), not by
  re-describing the character. The frozen blocks come FROM character-spec.md; phase B must never
  paraphrase them. For the spec, fix token craft + the frozen-block composition first (they
  propagate to both bible images AND every Seedance shot downstream). Per-model quirks (the
  gpt-image-2 ref flag, the "no text" gotcha, the no-`--resolution` fix) belong in
  references/nbp-dialect.md.
- Constraints not in the rubric: image generations cost credits — a failed generation is not
  charged, but a needless retry-loop is; gen-image.sh walks the chain once and self-check allows
  exactly ONE retry. Trust ai-gen estimate / balance, never credits_used. The section names are a
  FLEET contract — the Seedance render and the Kling sibling parse them, so the rubric never
  rewards a "nicer" schema. character-spec.md <= ~1500 words.
