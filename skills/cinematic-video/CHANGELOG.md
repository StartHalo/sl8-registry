# Changelog

All notable changes to the `cinematic-video` skill.

## [Unreleased]

### Changed — 1.2.0 (2026-08-23) — the character bible moved out, and the sheet is now graded

`references/character-bible.md` was workflow-local, so the identity craft was **trapped inside
one workflow**: a second workflow could not cite it without copying it, and a copy drifts. It is
now the domain skill [`character-bible`](../character-bible/SKILL.md) and this workflow links to
it. Domain knowledge has one home — the studio rejects the "self-contained, duplicate the docs"
convention precisely because drift killed the upstream project that used it.

- **Step 2 cites `../character-bible/SKILL.md`** instead of a local reference. No craft changed
  in the move; the file is the same lock, the same no-synonym rule, the same two stills.
- **The sheet approval is now a grade, not a look.** Step 2 said "READ the pixels before
  approving". It now runs `character-bible`'s vision-graded consistency check: a per-trait
  verdict against the rendered image, an overall 0–10 score, pass at ≥7, and a single
  same-seed regenerate on a miss. That check came from BOT-016, which had the more rigorous of
  the studio's two identity self-checks and no path in until this promotion. "It looked fine"
  was the same class of self-report as R05's `QC-13 identity: PASS`.

### Fixed — 1.1.0 (2026-08-23) — the identity law was unenforceable, and self-contradicting

R05, this workflow's first autonomous end-to-end run, shipped a render carrying **1 of 5**
identity tokens. The cause was in the skill, not the run: Step 2 freezes a whole
`CHARACTER_BLOCK` and calls it verbatim law, while Step 3 — and `references/shot-grammar.md`,
in both its prompt template and its validation checklist — told the agent to use
"2–3 verbatim tokens". Three places prescribed a subset. The agent complied exactly.

- **Step 3 is now a copy operation, not a writing task.** The identity line carries the whole
  frozen block, pasted from `character/spec.md`. The old wording is named in-file as the
  defect so it cannot quietly return.
- **A free pre-spend identity gate in Step 4.** Before any paid submit, assert the block
  appears character-for-character in every `shots/NN/prompt.txt`; non-zero exit means STOP.
  This is the last point where the identity law is enforceable for free — past it, the remedy
  is a re-render already paid for.
- **QC-13 split into its two halves.** Mechanical (re-run the gate, quote the exit code) and
  visual (a human's call). R05's `shots.md` reported "QC-13 identity: PASS" while the strings
  were wrong, because it was looking at pictures. QC-13 may no longer be reported PASS without
  the gate's result beside it.
- `references/shot-grammar.md` corrected in both places.

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
