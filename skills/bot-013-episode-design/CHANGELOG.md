# Changelog

All notable changes to the `bot-013-episode-design` skill.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.3] — 2026-06-16
### Changed
- ai-gen v2.1.0 alignment: the `room-tone` header default flips to **off**. The default
  clip engine (Seedance 2.0 fast i2v, in bot-013-clip-assembly) now generates native
  ambient audio, so a brown-noise room-tone bed would double up. Example plans updated to
  `room-tone: off`; the default-table guidance explains when to keep it `on` (silent
  fallback-only episodes). `validate-plan.sh` is unchanged (still accepts `on|off`).

## [v1.0.1] — 2026-06-09
### Changed

- DEFAULT_CHARACTER_BLOCK (frozen, shared with bot-013-stickman-art) now pins the
  torso construction explicitly ("one soft solid teardrop shape") and ends with an
  every-image-same-construction sentence. Run-1 vision grading showed body-construction
  drift between stills (solid vs line torso) because the block was silent on the torso.


## [v1.0.0] — 2026-06-09
### Fixed

- `scripts/validate-plan.sh` — the in-frame-label counter used a `{1,7}` interval
  regex (not portable to the sandbox's default mawk) and admitted digits contrary to
  the documented letters-only quoted-UPPERCASE convention (e.g. `"B2"` counted as a
  label). Replaced with a mawk-safe `match(val, /"[A-Z]+"/)` + `RLENGTH` 4–10 check
  (2–8 letters, quotes included). Also added a non-fatal WARNING when the
  beat-duration total differs from `target-length` by more than 5s — the exit code
  is unchanged; it is a reconciliation nudge, not a lint failure.

### Added

- Initial authoring (BOT-013 Full Build, Author activity). Covers JTBD-2: phase 1 of the
  episode chain, turning the project's topic into a machine-checkable beat-sheet plan at
  `artifacts/<project-name>/01-episode-plan.md` (logline, aspect, ≤10-word punchline,
  room-tone setting, 3–8 beats × {kebab name, scene block, motion prompt, duration 5|10,
  camera note}).
- Stable single-line `key: value` plan layout so the plan is lintable and greppable by
  downstream phases; in-frame text marked via a single quoted-UPPERCASE-word convention.
- `scripts/validate-plan.sh` — deterministic structural linter (header fields, beat
  count 3–8, consecutive numbering, kebab slugs, durations only 5|10 totaling 15–60s,
  punchline presence, frozen-block duplication guards, single-label rule); the phase
  gate for the eval loop.
- `references/beat-grammar.md` — beat arc grammar (setup → complication → escalation →
  visual punchline/anticlimax, loopable endings), the composition contract with the
  frozen prompt blocks reproduced verbatim plus a fully composed still/clip prompt, and
  two complete worked plans (`ikea-deadline` 16:9 ~30s, `snooze-loop` 9:16 ~25s).
- `references/ideation.md` — the six topic territories, the vague-topic concretization
  method with worked mappings, brand/person safety scrub, punchline craft.
- Headless failure handling per the JTBD-2 contract: missing topic → clean `blocked`
  record in state.md (never an invented topic); vague topic → concretize and record the
  assumption in the plan's `## Notes` and the state.md Decisions log.
