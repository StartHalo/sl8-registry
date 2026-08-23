# Changelog

All notable changes to the `cinematic-video` skill.

## [Unreleased]

### Changed — 2026-08-22 (pre-publish, W3 single-home)

- The paid-call contract is no longer restated here. It has one home —
  `video-prompting/SKILL.md` §Paid-call contract — and this workflow links to it.
  Part of the studio-wide W3 fix: the 2026-07-22 S1 remedy had *restated* the contract
  into three skills, which drifted into three partial versions of the rule.
  Seedance-specific triage stays local in `references/seedance-gotchas.md`.
- **Depends on `video-prompting` ≥ v1.0.2**, which is where that section now lives. Do not
  publish this skill against v1.0.1 — the cross-reference would dangle.

### Added — 1.0.0 (E4 promote)

- Initial studio creation workflow: brief → multi-scene cinematic with a LOCKED
  character/style via Seedance reference-to-video (native engine audio, no narration).
  One gated runbook over the domain skills — style-system (identity file / aesthetic
  block), frame-craft (the two bible stills), video-prompting (model routing + camera
  law + the measured r2v envelope), assembly-qc (normalize/concat/QC/contact sheet) —
  owning `plan.json` and the per-step artifact contract (`character/`,
  `shot-plan.json`, `shots/NN/`, `renders/`, `qc/`).
- Promoted from BOT-027 cinematic-director-seedance's three proven bot-local skills
  (`bot-027-character-bible`, `bot-027-shotlist`, `bot-027-seedance-cinematic`; Step-0
  PoC 8.8/10, 2026-06-20): the trait-lock/no-synonym character bible, the time-coded
  one-camera-one-action shot grammar with escalation arcs and the single slow-mo ramp,
  and the @Image1/@Image2 reference-to-video pass with native audio.
  Deltas from the donor: STYLE_STACK folded into style.md's aesthetic block (style has
  one home); bot-local scripts and the pinned image fallback chain dropped (frame-craft
  routes; assembly-qc owns ffmpeg); scene durations capped by video-prompting's
  measured envelope (≤10s @720p / ≤12s @480p) instead of the donor's 15s default;
  state.md phase-ledger machinery replaced by plan.json RESUME reconciliation.
- `references/character-bible.md`, `references/shot-grammar.md`,
  `references/seedance-gotchas.md` — the harvested depth, attributed.
- `evals/evals.json` + `evals/rubric.md` — workflow-contract evals (artifact chain,
  cross-shot character consistency, camera-vocabulary compliance, no
  dialogue/on-screen text, h264+aac delivery, spend honesty).
