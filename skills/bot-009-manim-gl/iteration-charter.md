---
derive_from:
  source_file: 1-requirements.md
  jtbds:
    - JTBD-2
  derivation_method: outputs+acceptance+failure
  derived_at: 2026-05-22T17:24:49.123Z
skill: bot-009-manim-gl
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
      jtbd_source: JTBD-2
      assertion: Verify that `artifacts/<project>/<project>.mp4` exists, has a file size greater than 0 bytes, is a parseable H.264 MP4 container (readable by ffprobe without error), and that its duration in seconds falls within ±50% of the requested or intended animation length (e.g., a 30-second request must produce a video between 15 and 45 seconds).
    - id: scene-source-shape
      weight: 0.12
      source: structural
      jtbd_source: JTBD-2
      assertion: Verify that `artifacts/<project>/scene.py` exists, contains `from manimlib import *` and no `from manim import *`, defines at least one class subclassing `Scene` or `InteractiveScene` from ManimGL, and uses ManimGL-specific idioms — concretely, any animation that in Manim CE would use `Create` must instead use `ShowCreation`, confirming no CE-only symbol names are present.
    - id: animation-faithfulness-quality
      weight: 0.25
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: This dimension comes from JTBD-2 (ManimGL animated video creation). Watch the rendered MP4 and compare every visual beat against the requested concept description. Score 10 if every named object, label, transformation, and narrative beat specified in the concept appears on-screen in the correct order with no beat omitted. Score 5 if roughly half the specified beats are present and recognizable but at least one key element — a labeled curve, a specific formula, a required transformation — is absent or misordered. Score 0 if the video is entirely unrelated to the requested concept, or if the animation is a static placeholder or blank frames with no content derived from the concept.
    - id: legibility-pacing-quality
      weight: 0.21
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: This dimension comes from JTBD-2 (ManimGL animated video creation). Inspect the rendered MP4 for text clipping at frame edges, overlapping mobjects, and per-beat hold duration. Score 10 if every text element and equation is fully visible within the safe area, no two objects overlap such that either is unreadable at any frame, and each beat is held on-screen for at least 1.5 seconds before the next transition. Score 5 if minor clipping or brief overlap occurs in at most two moments and most beats are readable, but one or two transitions flash by in under 0.5 seconds. Score 0 if text is chronically cut off at the frame boundary, objects persistently overlap making labels unreadable, or the pacing is so fast that no single beat can be processed by a first-time viewer.
    - id: summary-quality
      weight: 0.1
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: This dimension comes from JTBD-2 (ManimGL animated video creation). Read `artifacts/<project>/summary.md` and check for four concrete elements. Score 10 if the file explicitly contains the string 'ManimGL', lists every storyboard beat in the order they appear in the rendered video, states the output quality preset or resolution AND the aspect ratio, and includes at least one actionable suggested edit naming a specific scene element and a concrete change. Score 5 if 'ManimGL' is named and beats are listed but either the quality/aspect statement or the suggested edit is absent or too vague to act on (e.g., 'could improve visuals'). Score 0 if 'ManimGL' does not appear in the file, no beat list is present, or the file does not exist at the expected path.
    - id: render-error-recovery
      weight: 0.1
      source: llm-judge
      jtbd_source: failure-mode:JTBD-2
      judge_prompt: This dimension comes from the failure-mode for JTBD-2 where ManimGL raises an exception during render. Inspect the session transcript for structured recovery. Score 10 if the bot (a) cites at least one concrete detail from the ManimGL traceback (exception class, offending line or symbol), (b) edits `scene.py` using correct ManimGL idioms to address that specific error, (c) re-renders within ≤3 attempts, and (d) on persistent failure simplifies the scene to its core concept beats, notes the simplification in `summary.md`, and successfully renders. Score 5 if the bot attempts a fix but it is non-targeted (e.g., removes all animations rather than the failing call) or the simplification eliminates more than half the originally requested beats without noting it. Score 0 if the bot does not attempt any fix after the initial exception, loops on identical broken code, or abandons the task with no rendered MP4.
    - id: engine-api-purity
      weight: 0.07
      source: llm-judge
      jtbd_source: failure-mode:JTBD-2
      judge_prompt: "This dimension comes from the failure-mode for JTBD-2 where a Manim CE idiom (e.g., `Create` from `manim`) leaks into a ManimGL scene. Inspect `scene.py` across all revisions visible in the transcript. Score 10 if the final `scene.py` is idiomatically pure ManimGL — uses `ShowCreation` (not `Create`), `Tex(R\"...\")` (not `MathTex`), `self.frame` (not `self.camera.frame`) — and if any CE idiom appeared in an earlier draft it was detected and replaced before a successful re-render. Score 5 if the bot corrected the primary CE idiom that caused a failure but other CE symbols remain unreplaced in the final `scene.py`. Score 0 if the final `scene.py` still contains CE-only symbol names or imports `manim`."
    - id: latex-tex-fallback
      weight: 0.05
      source: llm-judge
      jtbd_source: failure-mode:JTBD-2
      judge_prompt: "This dimension comes from the failure-mode for JTBD-2 where a ManimGL `Tex` call fails LaTeX compilation. Inspect `scene.py` and `summary.md` for evidence of the documented fallback. Score 10 if: (a) the failing `Tex` constructor call is replaced by `Text` for the affected label in `scene.py`, (b) `summary.md` explicitly names the label or expression that failed and states it was replaced with `Text`, and (c) `artifacts/<project>/<project>.mp4` is present and non-empty. Score 5 if the substitution is made in `scene.py` and the video renders but `summary.md` does not mention the substitution, or the note is present but does not identify which label was affected. Score 0 if `scene.py` still contains the failing `Tex` call unmodified, no fallback was attempted, or the render remains broken with no MP4 produced."
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-009-manim-gl/iteration-charter.md
---

## Notes for the proposer

- This charter grades the **ManimGL** skill, which implements **JTBD-2** only.
  JTBD-1 (Manim CE) is graded by the sibling `bot-009-manim-ce` charter — do not add
  Manim CE dimensions here.
- Weights mirror the CE charter so the two engines are held to the same bar, with one
  deliberate difference: `scene-source-shape` (0.12) and `engine-api-purity` (0.07)
  are weighted slightly higher because ManimGL's API diverges from Manim CE's and
  CE-idiom leakage is the most likely correctness failure for this skill.
- `animation-faithfulness-quality` (0.25) and `legibility-pacing-quality` (0.21) are
  the viewer-felt quality levers — improving the storyboard step moves both.
- ManimGL renders headless only via `xvfb-run`; interactive mode is never used.

## Mapping: JTBDs → rubric dimensions

| Dimension | JTBD source | Notes |
|---|---|---|
| `rendered-video-shape` | JTBD-2 | structural — MP4 exists, non-empty, plausible duration |
| `scene-source-shape` | JTBD-2 | structural — `scene.py` is valid ManimGL, no `manim` import |
| `animation-faithfulness-quality` | JTBD-2 | 0–10: depicts the concept with the right objects, labels, sequence |
| `legibility-pacing-quality` | JTBD-2 | 0–10: nothing clipped/overlapping; beats held long enough |
| `summary-quality` | JTBD-2 | 0–10: ManimGL named, beats listed, settings stated, next-edit given |
| `render-error-recovery` | failure-mode:JTBD-2 | 0–10: traceback-driven fix and re-render within retry budget |
| `engine-api-purity` | failure-mode:JTBD-2 | 0–10: idiomatic ManimGL, no CE-idiom leakage |
| `latex-tex-fallback` | failure-mode:JTBD-2 | 0–10: failing `Tex` → `Text`, noted in summary |

JTBD-2 is fully covered. JTBD-1 is out of scope for this skill (see the
`bot-009-manim-ce` charter).
