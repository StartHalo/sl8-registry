---
derive_from:
  source_file: 1-requirements.md
  jtbds:
    - JTBD-1
  derivation_method: outputs+acceptance+failure
  derived_at: 2026-05-22T17:24:49.123Z
skill: bot-009-manim-ce
target_score: 0.8
publish_threshold: 0.75
stuck_window: 5
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: rendered-video-shape
      weight: 0.1
      source: structural
      jtbd_source: JTBD-1
      assertion: Verify that `artifacts/<project>/<project>.mp4` exists, has a file size greater than 0 bytes, is a parseable H.264 MP4 container (readable by ffprobe without error), and that its duration in seconds falls within ±50% of the requested or intended animation length (e.g., a 30-second request must produce a video between 15 and 45 seconds).
    - id: scene-source-shape
      weight: 0.1
      source: structural
      jtbd_source: JTBD-1
      assertion: Verify that `artifacts/<project>/scene.py` exists, contains the line `from manim import *`, defines at least one class that subclasses `Scene` (directly or transitively via a Manim CE base), contains no import of `manimlib` in any form, and that executing `manim render scene.py` exits with return code 0 without an unhandled Python exception.
    - id: animation-faithfulness-quality
      weight: 0.27
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: This dimension comes from JTBD-1 (Manim CE animated video creation). Watch the rendered MP4 and compare every visual beat against the requested concept description supplied by the user. Score 10 if every named object (shape, arrow, graph, equation), every label, and every ordered transformation or narrative beat specified in the concept appears on-screen in the correct sequence with no beat omitted. Score 5 if roughly half the specified beats are visually present and recognizable but at least one key element — a labeled axis, a specific equation, a required transformation — is absent or appears in the wrong order. Score 0 if the video's content is entirely unrelated to the requested concept, or if the animation consists only of a static title card or blank frames with no meaningful content from the concept.
    - id: legibility-pacing-quality
      weight: 0.22
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: This dimension comes from JTBD-1 (Manim CE animated video creation). Inspect the rendered MP4 frame-by-frame for text clipping, object overlap, and per-beat hold duration. Score 10 if every text element and equation is fully visible within the frame's safe area (no characters cut at edges), no two mobjects overlap such that either becomes unreadable at any frame, and each distinct beat is held on-screen for at least 1.5 seconds before the next transition begins. Score 5 if minor clipping or brief overlap affects at most two moments and most beats are readable, but one or two transitions are so fast (under 0.5 s hold) that a normal viewer could not absorb the information. Score 0 if text is chronically clipped at frame edges, objects persistently overlap making labels unreadable throughout, or the entire animation advances so rapidly that no single beat can be identified by a first-time viewer.
    - id: summary-quality
      weight: 0.1
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: "This dimension comes from JTBD-1 (Manim CE animated video creation). Read `artifacts/<project>/summary.md` and check for four concrete elements: engine name, beat list, quality/aspect statement, and a suggested next edit. Score 10 if the file explicitly contains the string 'Manim Community Edition' or 'Manim CE', lists every storyboard beat in the order they appear in the video (minimum one sentence per beat), states the rendered resolution or quality preset AND the aspect ratio, and provides at least one actionable suggested edit that names a specific scene element and a concrete change (e.g., 'increase hold time on the derivative slide from 1 s to 2 s'). Score 5 if the engine is named and beats are listed but either the quality/aspect statement or the suggested edit is absent or too vague to act on. Score 0 if the engine is not identified by name, no beat list is present, or the file does not exist at the expected path."
    - id: render-error-recovery
      weight: 0.12
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-1
      judge_prompt: "This dimension covers the JTBD-1 acceptance scenario and failure mode for render-error recovery (a first scene draft raises a Manim exception). Inspect the session transcript and final artifacts. Score 10 if the transcript shows the bot (a) reads and quotes or paraphrases at least one specific detail from the Manim traceback (file name, line number, or exception type), (b) edits `scene.py` to address that specific error rather than blanket-deleting animations, (c) successfully re-renders within three attempts, and (d) `artifacts/<project>/<project>.mp4` is present and non-empty in the final artifacts. Score 5 if the bot attempted a targeted fix and re-render but needed more than three attempts, or produced a heavily simplified scene that omits more than half the originally requested beats without noting it in `summary.md`. Score 0 if the bot did not read the traceback, applied no code change, looped on identical broken code, or the final artifacts still lack a rendered MP4."
    - id: concept-missing-empty-fallback
      weight: 0.05
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: This dimension comes from the failure-mode for JTBD-1 where the concept input is missing or empty. Inspect the bot's output when no concept description is provided. Score 10 if the bot emits a user-facing message that (a) explicitly states it cannot proceed without a concept description, (b) asks the user to supply one, and (c) produces no `scene.py`, no MP4, and no invented concept of any kind. Score 5 if the bot requests a concept but also generates a placeholder scene (e.g., a title-only animation labelled 'your concept here') or provides a vague error that does not clearly ask for a concept. Score 0 if the bot silently invents a concept and renders a video without any user-facing prompt, or produces no output whatsoever with no error message explaining why.
    - id: latex-mathtex-fallback
      weight: 0.04
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: "This dimension comes from the failure-mode for JTBD-1 where a `MathTex` call fails LaTeX compilation. Inspect `scene.py` and `summary.md` for evidence of the documented fallback. Score 10 if: (a) the failing `MathTex` constructor call is replaced by `Text` or `MarkupText` for the affected label in `scene.py`, (b) `summary.md` explicitly names the label or expression that failed and states it was replaced with `Text`, and (c) `artifacts/<project>/<project>.mp4` is present and non-empty. Score 5 if the substitution is made in `scene.py` and the video renders but `summary.md` does not mention the substitution, or the note exists but does not identify which label was affected. Score 0 if `scene.py` still contains the failing `MathTex` call unmodified, no fallback was attempted, or the render remains broken with no MP4 produced."
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-009-manim-ce/iteration-charter.md
---

## Notes for the proposer

- This charter grades the **Manim CE** skill, which implements **JTBD-1** only.
  JTBD-2 (ManimGL) is graded by the sibling `bot-009-manim-gl` charter — do not add
  ManimGL dimensions here.
- Weights prioritise the two quality dimensions a viewer actually feels:
  `animation-faithfulness-quality` (0.27) and `legibility-pacing-quality` (0.22)
  together carry ~half the composite. The structural shape checks are necessary
  gates but capped low — a video that merely exists is not the goal.
- `render-error-recovery` (0.12) is weighted above the other failure modes because
  Manim renders fail often on first draft; disciplined traceback-driven fixing is the
  difference between a working bot and a stuck one.
- Storyboard discipline is the lever for faithfulness and pacing: an iteration that
  improves the storyboard step usually moves both quality dimensions together.

## Mapping: JTBDs → rubric dimensions

| Dimension | JTBD source | Notes |
|---|---|---|
| `rendered-video-shape` | JTBD-1 | structural — MP4 exists, non-empty, plausible duration |
| `scene-source-shape` | JTBD-1 | structural — `scene.py` is valid Manim CE, no `manimlib` |
| `animation-faithfulness-quality` | JTBD-1 | 0–10: depicts the concept with the right objects, labels, sequence |
| `legibility-pacing-quality` | JTBD-1 | 0–10: nothing clipped/overlapping; beats held long enough |
| `summary-quality` | JTBD-1 | 0–10: engine named, beats listed, settings stated, next-edit given |
| `render-error-recovery` | acceptance-scenario:JTBD-1 + failure-mode:JTBD-1 | 0–10: traceback-driven fix and re-render within retry budget |
| `concept-missing-empty-fallback` | failure-mode:JTBD-1 | 0–10: clean error on missing concept, no invented concept |
| `latex-mathtex-fallback` | failure-mode:JTBD-1 | 0–10: failing `MathTex` → `Text`, noted in summary |

JTBD-1 is fully covered. JTBD-2 is out of scope for this skill (see the
`bot-009-manim-gl` charter).
