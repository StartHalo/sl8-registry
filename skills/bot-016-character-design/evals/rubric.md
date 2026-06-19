---
skill: bot-016-character-design
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. Anchors at 0 / 5 / 10.
# All text dimensions: character-spec.md is a written spec, no media here (the sheet/hero
# are graded in bot-016-consistency-check, not this skill). The deterministic floor is
# scripts/validate-spec.sh; these dimensions grade the quality the validator cannot see.
dimensions:
  - id: token-discipline
    weight: 0.40
    jtbd_source: JTBD-1
    judge_prompt: |
      Read character-spec.md. Score 0-10 the trait-lock discipline that keeps the
      character consistent downstream: 5-7 DISTINCTIVE tokens (each visibly separates this
      character from a generic one — specific materiality, not filler like "brown hair"),
      ordered face -> hair -> eyes -> outfit/props; STYLE_STACK carries only style and
      CHARACTER_BLOCK carries only identity (no cross-contamination); and every token in
      CHARACTER_BLOCK is BYTE-IDENTICAL to its bullet in the Identity Tokens list (the
      no-synonym rule — no paraphrase between list and block).
      10 = 5-7 sharply distinctive tokens, correctly ordered, blocks cleanly separated,
      and every CHARACTER_BLOCK token a verbatim copy of a locked token — zero synonym
      drift; a downstream prompt could paste the blocks and reproduce the same character.
      5 = the lock mostly holds but one or two tokens are generic filler, the ordering
      slips, style words leak into CHARACTER_BLOCK, or one token is paraphrased between the
      list and the block (the drift vector).
      0 = tokens are generic, unordered, or freely re-worded; the blocks would not hold one
      identity across shots.

  - id: spec-completeness
    weight: 0.35
    jtbd_source: acceptance-scenario:JTBD-1
    judge_prompt: |
      Read character-spec.md. Score 0-10 whether it is a complete, honest bible spec: all
      eight contract sections present and populated (Identity Tokens, Seed, Palette,
      STYLE_STACK, CHARACTER_BLOCK, Reference image, Provenance, Downstream use); exactly
      one fixed integer seed; a NAMED palette with a line of reasoning that fits the
      character (not a bare color list); and — where the brief was sparse or a reference
      was missing or a real-person/brand was swapped — a "Defaults applied" note that
      honestly flags every invented or substituted choice.
      10 = every section present and substantive; named palette with apt reasoning; single
      fixed seed; defaults/substitutions all flagged honestly; a creator could trust and
      refine it as-is.
      5 = the spec is usable but one section is thin (palette with no reasoning, an
      unflagged neutral default, a vague Provenance) so a reader cannot fully tell what was
      given vs. invented.
      0 = sections missing or empty, no seed or multiple seeds, or invented detail passed
      off as if it came from the brief.

  - id: downstream-readiness
    weight: 0.25
    jtbd_source: skill-quality-criteria
    judge_prompt: |
      Read character-spec.md as if you were a downstream director bot (BOT-017 Seedance /
      BOT-018 Kling) that must PARSE this file by fixed section name and drive shots from
      it. Score 0-10 whether you could do that unambiguously: the stable section headings
      are exactly as the contract specifies (not renamed/reordered); the frozen blocks are
      single quoted lines you can lift verbatim into a prompt; the seed and the
      Reference-image path are unambiguous; and the Downstream use line tells you which
      file is the front frame vs. the identity reference and that CHARACTER_BLOCK is the
      token source.
      10 = a parser could extract the seed, both frozen blocks, the reference, and the
      downstream-use mapping with zero guessing — the file is a clean machine interface.
      5 = parseable but with friction — a heading is slightly off, a frozen block spans
      lines or lacks quotes, or the Downstream use mapping is implicit.
      0 = freeform prose, renamed/missing sections, or blocks a parser cannot lift cleanly.

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-016-character-design/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: fix consistency issues in the FROZEN-BLOCK composition and the
  token craft first (they propagate to every downstream shot); tighten the worked examples in
  references/trait-lock.md before touching the workflow steps. The validator is the floor —
  distinctive-token quality and honest defaults are the ceiling.
- Constraints not in the rubric: this is a pure-LLM phase (no generation cost, no images);
  character-spec.md ≤ ~1500 words; the section names are a FLEET contract — changing them
  breaks BOT-017/BOT-018, so the rubric never rewards a "nicer" schema.
