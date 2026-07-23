---
name: explainer-video
description: >
  Turns a text brief into a finished explainer video (default 30s, 6 beats, 16:9) through
  the boards-first spine: plan → style → approved frames → measured voice → motion →
  audio-anchored assembly → verified delivery. Use when: "make/create an explainer video",
  "explain X as a video", "turn this brief/article/topic into a video", any
  brief-to-finished-video request. Chain: THE creation workflow — it orchestrates the five
  domain skills (style-system, frame-craft, voice-timing, video-prompting, assembly-qc)
  and owns the project's plan.json + per-step artifacts. NOT for: a single image
  (frame-craft directly), animating one existing still (video-prompting), fixing/mixing an
  existing edit (assembly-qc), or non-explainer deliverables (future workflows).
---

# explainer-video — brief in, verified explainer out

One deliverable, one gated runbook, one `plan.json`. Every step leaves a durable artifact
under `artifacts/<project>/`; a step with no artifact did not happen. Money is spent only
downstream of an approved plan and approved frames.

## Step 0 — Bootstrap

`ai-gen --version` + balance check; resolve mode (below); if `artifacts/<project>/`
exists, RESUME: reconcile `plan.json` against the filesystem (plan is intent, filesystem
is truth) and continue at the first unmet checkpoint. Never redo a step whose artifact
exists and passes its gate.

**Modes.** Collaborative (default when a human is present): gates wait for approval.
Autonomous (headless): gates become checkpoint summaries in the transcript — steps are
NEVER skipped, artifacts are NEVER omitted; QC failures follow the fix path or stop with
the QC code named.

## Step 1 — Plan (`plan.json`) — GATE: approval before any spend

Read the brief; verify factual claims against supplied material (never script facts from
memory). Build `plan.json` per the contract
([`../video-prompting/references/plan-contract.md`](../video-prompting/references/plan-contract.md)):
pick the arc; 6–8 beats for 30s; one teaching line + one 2–6-word HEADLINE per beat
(beat 1 carries the hook — payoff promise, never setup); per-shot scene + closed-vocab
`camera_move` + rich `element_motion`; camera law (no adjacent repeats; `static` only on
the payoff); word budget ≤80 for 30s. All `dur_s`/`vo_measured_s` null at this stage
(QC-02). **Artifact:** `plan.json` (draft → approved).

## Step 2 — Style (`style.md` + style key)

Per [`../style-system/SKILL.md`](../style-system/SKILL.md): shortlist presets by fit (or
compose one), run the bake-off (3–4 cheap frames, human picks by eye — in autonomous mode:
pick the best fit by the preset's "For:" line, note the choice, skip the bake-off spend),
write `style.md`, pin `style-key.png`. **Artifact:** `style.md` (+ bake-off frames when
run). GATE: `style.md` exists before Step 3.

## Step 3 — Frames (the look is born here) — GATE: approved before motion

Per [`../frame-craft/SKILL.md`](../frame-craft/SKILL.md): one keyframe per shot
(`frames/01a.png`, zero-padded), aesthetic block VERBATIM, exact headlines, explicit
`aspect_ratio`. Generate one, check against the quality bar, then batch. Re-roll weak
frames HERE (~25× cheaper than clips). **Artifact:** every `shots[].frame` present +
frame approval noted in the transcript. BARRIER: no clip call until every frame of the
piece is approved.

## Step 4 — Voice (measure, then anchor)

Per [`../voice-timing/SKILL.md`](../voice-timing/SKILL.md): per-block VO
(`audio/vo-01.wav`…), ONE voice from `style.md`; measure every take; write
`vo_measured_s` into the plan; derive every shot's `dur_s` (+ breathing room, within the
clip envelope — re-segment a beat rather than exceed it). **Artifact:** VO files +
the anchored plan. BARRIER: all N takes measured before any clip call (durations depend
on them).

## Step 5 — Motion

Per [`../video-prompting/SKILL.md`](../video-prompting/SKILL.md): one clip per shot from
its APPROVED frame (`clips/01a.mp4`), strict constraints, `dur_s` from the plan,
resolution per budget tier (draft 480p → final 720p), request ids journaled into the
plan. Estimate the full batch first; stay under the run's cap. **Artifact:** every
`shots[].clip` + request ids.

## Step 6 — Assemble & verify

Per [`../assembly-qc/SKILL.md`](../assembly-qc/SKILL.md): input gates QC-01..04 →
audio-anchored assembly (windows from measured VO, hold last frames, duck, loudnorm) →
captions from the authored script if requested → output gates QC-10/11 → frame extraction
→ contact sheet. **Artifacts:** `renders/final.mp4` + `snapshots/contact-sheet.jpg`.

## Step 7 — Deliver

Present the MP4 + contact sheet + one-line cost accounting (estimates vs balance delta).
In collaborative mode the human's eyeball on the sheet is the final gate; targeted
revisions re-enter at the owning step (a weak clip → Step 5 for that shot only; a script
change → Step 4 re-measure → re-anchor).

## Checkpoints (the resume/grader inventory)

Before Step 3: approved `plan.json` + `style.md`. Before Step 5: every frame present +
approved; every `vo_measured_s` set; every `dur_s` derived. Before Step 7: every clip
present; QC-01..04 + QC-10/11 green; contact sheet exists. **A run missing any step
artifact fails its grader regardless of the MP4.** Two identical failures at any paid
step ⇒ change the prompt/params, never retry verbatim.
