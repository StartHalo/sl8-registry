---
skill: bot-030-continuous-plan
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# Judge dimensions — weights sum to 1.00. Anchors at 0 / 5 / 10.
# continuous-plan.md is a TEXT output (pure-LLM phase, no media): all three dims read the file.
# No media-judge dim — this phase renders no MP4 (the render skill owns the video judge).
dimensions:
  - id: continuity-and-no-cuts
    weight: 0.40
    jtbd_source: JTBD-2
    judge_prompt: |
      Read continuous-plan.md. Score 0-10 whether it describes ONE unbroken, evolving
      continuous shot — not a cut sequence and not a flat single clip. Check: there is
      exactly one Base block (the opening frame + one continuous base motion over ~8s) and
      2-3 Hop lines; each hop CONTINUES the same shot (camera and subject keep moving from
      where the previous segment ended) using continuity language ("The same <subject>",
      "without any cut the shot continues / keeps moving"); each hop adds exactly ONE new
      motion or scenery beat (the shot evolves, it does not jump to a new scene); there are
      NO time-codes, NO shot list, and NO cut-language ("cut to", "next shot", "meanwhile",
      a hard reframe); the camera moves named are continuous (gentle tracking, following
      gimbal, slow push-in, craning rise), never a snap; "fast" is never used unqualified
      across the frame; the global header pairs cinematic-quality look words (a medium +
      lighting + color grading) and is applied to the whole take, not bare "cinematic"/"epic".
      10 = it reads as one breath — one base + 2-3 hops, each a single new beat on a
      continuous camera, no cut-language anywhere, a concrete header carried through.
      5 = mostly one take but a hop stacks two new beats, or a hop is weak on continuity
      language, or the header is thin, or a continuous-camera name is missing on a segment.
      0 = it reads as a cut sequence (time-codes / "cut to" / shot list) or a flat clip with
      no evolution — it would not render as one continuous take.

  - id: subject-repeat-and-identity-lock
    weight: 0.35
    jtbd_source: acceptance-scenario:JTBD-2
    judge_prompt: |
      Read continuous-plan.md. Score 0-10 the identity lock that survives a Veo extend — the
      single most important continuity rule. Check: a CHARACTER block lists 5-7 frozen,
      concrete, visual trait tokens (body shape, color/material, a signature feature, size,
      texture) that are non-overlapping; the Base subject sentence weaves those exact tokens
      in verbatim; and CRITICALLY each Hop re-states the subject description AT LEAST 80
      PERCENT VERBATIM (re-using the frozen tokens and the subject phrasing almost
      word-for-word) and changes ONLY the new beat — because the extend pass sees only the
      trailing frame plus the hop text, any paraphrase of the subject ("the bird" after
      "the friendly fluffy round owl") re-imagines the character and drifts. Also check the
      subject is a friendly STYLIZED character/creature with no realistic identifiable human
      face.
      10 = 5-7 strong frozen tokens, and every hop repeats the subject >=80% verbatim (tokens
      re-stated, only the new beat changed) — identity is locked in language.
      5 = tokens are present but one hop paraphrases part of the subject, or a token is
      vague/overlapping, or only ~half the subject phrasing is repeated in a hop.
      0 = a hop refers to the subject by a generic noun (drift), fewer than 5 or more than 7
      tokens, or a realistic human face is described.

  - id: length-and-audio-footer
    weight: 0.25
    jtbd_source: skill-quality-criteria
    judge_prompt: |
      Read continuous-plan.md. Score 0-10 the footer the render phase greps and the native
      audio. Check: the footer reads "Total: ~Ns (one continuous take, no cuts) / AR." where
      N equals 8 + 7*(number of hops) within 1s (2 hops -> ~22s, 3 hops -> ~29s) and AR is
      16:9 or 9:16 matching the requested aspect; the footer marks it a single continuous
      take; an "Audio:" clause names a native score mood + concrete SFX + an ambience bed (a
      single coherent bed for the whole take, since Veo audio is native to each pass with no
      separate TTS); the positive-constraint suffix is present and includes "one continuous
      shot, no cuts" and "stable picture, no flicker"; no negative "no X" list leaks into the
      Base or a Hop; a Notes section records the hop-count, aspect, and any default applied.
      10 = length matches 8+7*hops exactly, aspect correct, the take is marked continuous, a
      full native-audio clause and the complete no-cut constraint suffix are present, Notes
      records the defaults.
      5 = length off by ~1s or the Audio clause is thin (mood only, no SFX/ambience), or the
      suffix is partial, or Notes omits a default.
      0 = the footer length contradicts the hop count, the aspect is wrong/unsupported, or the
      Audio/constraint footer is missing — the render would mis-length or lose the no-cut lock.

guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-030-continuous-plan/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- Techniques to prioritize: tighten the worked owl example in
  references/continuous-grammar.md before touching the workflow steps; the linter
  (scripts/validate-continuous-plan.sh) is the structural floor — the one-evolving-shot read,
  the >=80%-verbatim subject repeat across hops, and the 8+7*hops length are the ceiling the
  rubric grades.
- Constraints not in the rubric: pure-LLM phase (no generation cost); keep the whole file
  ≤1000 words so the per-pass Veo prompts stay within model limits; Veo supports only 16:9 and
  9:16; friendly stylized characters/creatures only (no realistic human face); never paraphrase
  the subject in a hop (the #1 extend-drift cause).
