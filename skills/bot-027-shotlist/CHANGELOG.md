# Changelog

All notable changes to the `bot-027-shotlist` skill.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Added
- Initial authoring (BOT-027 Full Build, Author activity). Covers JTBD-2: phase 2 of the
  cinematic chain, turning the project's story/fight brief + the locked `character-spec.md`
  into a machine-checkable cinematic shot-list at `artifacts/<project-name>/shotlist.md` —
  a global style/look header, the `@Image1`/`@Image2` identity-lock line, 4-6 numbered
  time-coded `[Xs-Ys]:` shots (one camera move + one action each, escalation arc, a slow-mo
  ramp on the key beat, optional inline `[VFX: ...]`) tiling the target duration, and a
  `Total: Ns / K shots / AR. Audio: ...` footer with the positive-constraint suffix. The
  render phase (`bot-027-seedance-cinematic`) composes the whole file into ONE Seedance
  `reference-to-video` prompt.
- `scripts/validate-shotlist.sh` — deterministic structural linter (the phase gate): title +
  global header present; the `@Image1`/`@Image2` identity-lock line present; 4-6 single-line
  time-coded shots that tile `[0..duration]` with no gaps/overlaps (shot 1 at 0s, each start
  = previous end, last end = footer duration ±1s); each shot names a camera move (vocabulary
  match) + a concrete action; no negative-prompt syntax inside a shot; the `Total: Ns / K
  shots / AR.` footer present with N/K/AR agreeing with the time-codes and shot count, plus
  the `Audio:` clause and the positive-constraint suffix. Validated against both worked
  examples (pass) and seeded failures (time-code gaps, K/shot mismatch, duration off by 2s,
  missing identity line, missing camera move, negative-syntax leakage, missing suffix).
- `references/shot-grammar.md` — the C1/C2 multi-shot and E1/E2 fight recipes baked inline,
  the Seedance 5-layer-stack rules (one action + one camera per shot, lighting-first,
  fast-is-dangerous, slow-mo ramp, positive constraints), the camera/lighting vocabularies
  and anti-patterns, the proven render-input shape (Step-0 PoC 2026-06-20, 8.8/10), the
  time-code arithmetic gate, and two fully worked examples (`meadow-robot` story 16:9,
  `obsidian-duel` fight 21:9 using the E2 dark-fantasy header verbatim).
- `evals/evals.json` — 3 objective text evals derived from JTBD-2: shot-grammar + escalation
  arc (story), the E2 fight arc + dark-fantasy header + face-policy, and a defaults-only run
  with the Notes record. `evals/rubric.md` — 3 text dimensions (shot-grammar-and-escalation
  0.40, time-code-arithmetic 0.30, identity-lock-and-audio-footer 0.30; weights sum to
  1.00), target 0.85 / publish 0.80, guardrails (`smoke_install`, `memory_persistence`,
  `output_validator`; forbidden edits to `bot/CLAUDE.md` and this rubric).
- Headless failure handling per the JTBD-2 contract: missing brief → clean `blocked` record
  in state.md (never an invented story); missing `character-spec.md` → route back to phase 1
  (`bot-027-character-bible`); branded/real-person brief → stylized stand-ins (Seedance face
  policy), recorded in `## Notes`.
