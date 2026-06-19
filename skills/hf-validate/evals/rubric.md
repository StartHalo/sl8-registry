---
skill: hf-validate
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# hf-validate is a GATE skill. Three dimensions read the report + lint behavior; one media-judge
# dimension reads the captured snapshot frames to confirm the seek produced real pixels. Weights sum to 1.00.
dimensions:
  - id: strict-gate-correctness
    weight: 0.35
    jtbd_source: JTBD-1
    judge_prompt: |
      Read 05-validation.md and the lint behavior. Score 0-10 on the gate working correctly:
      a clean composition (0 lint errors) is reported PASS and proceeds to snapshot; a
      composition WITH lint errors is reported BLOCKED, names the error code(s), exits
      non-zero, and does NOT claim render-readiness. The error/warning counts are recorded.
      10 = pass/block decision is correct and well-justified in both cases. 5 = decision
      correct but the report omits the counts or the error codes. 0 = a broken composition
      is passed, or a clean one is wrongly blocked.

  - id: snapshots-captured
    weight: 0.25
    jtbd_source: JTBD-1
    judge_prompt: |
      Score 0-10 on the headless seek producing usable key frames: at least one PNG per
      requested timestamp (or 5 evenly-spaced) landed in artifacts/<project>/snapshots/,
      plus a contact-sheet. A clean lint with ZERO captured frames must be treated as a
      failure (BLOCKED), not a pass. 10 = a frame per scene + contact sheet, paths recorded.
      5 = frames captured but fewer than requested, or paths not recorded. 0 = no frames, or
      a no-frames case reported as PASS.

  - id: frame-legibility
    weight: 0.25
    source: media-judge
    jtbd_source: JTBD-1
    media_glob: "snapshots/"
    judge_prompt: |
      Look at the captured snapshot PNGs (and contact-sheet.jpg). Score 0-10 on whether the
      pre-render seek produced REAL, legible frames: text and key facts are visible and
      readable, high contrast, inside the safe zone (not clipped), and the composition is
      themed (not blank/black, not all-default-font). This is the cheap visual confirmation
      before the full render. 10 = every frame legible and on-style. 5 = legible but one
      frame is off (clipped text, wrong/fallback font, thin contrast). 0 = blank/black frames
      or text clipped off-frame.

  - id: report-actionability
    weight: 0.15
    jtbd_source: acceptance-scenario:JTBD-1
    judge_prompt: |
      Read 05-validation.md. Score 0-10 on it being an actionable record: it states the
      composition path, the validation time, the verbatim lint findings, the verdict, the
      frame paths, and (on issues) routes the fix back to hf-build with the specific code.
      10 = a reader knows exactly the state and the next action. 5 = verdict present but
      findings or next-action vague. 0 = no usable record.

guardrails:
  must_pass:
    - smoke_install
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/hf-validate/evals/rubric.md
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- validate.sh was bitten once by passing `$COMP` while cd'd into it (path doubling) — snapshot must run
  from inside the dir targeting `.`. Keep that.
- The strict gate parses `hyperframes lint --json` `.errorCount` — do not loosen it; errors must block.
- frame-legibility shares the same media path as hf-render's media-judge; if frames look wrong here, the
  fix is in hf-build, not in validate.
