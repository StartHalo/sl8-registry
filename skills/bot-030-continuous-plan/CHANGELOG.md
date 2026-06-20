# Changelog

All notable changes to the `bot-030-continuous-plan` skill.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Added
- Initial authoring (BOT-030 Full Build, Author activity — phase 1, pure-LLM). Covers JTBD-2:
  turn the project's continuous-motion brief into a machine-checkable one-take plan at
  `artifacts/<project-name>/continuous-plan.md` for a Veo `image-to-video` then `extend-video`
  render — a global one-continuous-take style/look header, a `CHARACTER:` block of 5-7 FROZEN
  verbatim trait tokens, exactly one `Base:` block (opening-frame image description + the base
  8s continuous motion + native audio), 2-3 numbered `Hop N:` continuation prompts (each
  repeating the subject ≥80 percent verbatim and adding only ONE new motion/scenery beat, with
  no cut), and a `Total: ~Ns (one continuous take, no cuts) / AR. Audio: ...` footer with the
  positive-constraint suffix. The render phase composes the file into one BASE Veo
  `image-to-video` call plus `hop-count` `extend-video` calls and concatenates them into ONE
  evolving MP4.
- `scripts/validate-continuous-plan.sh` — deterministic structural linter (the phase gate),
  `set -euo pipefail`, awk core, one machine-readable success line, `bash -n` clean, `chmod +x`.
  Verifies: the `# Continuous-plan:` title + a non-empty global header; a `CHARACTER:` block of
  5-7 frozen tokens; exactly ONE non-empty `Base:` block; 2-3 `Hop N:` lines each carrying
  continuity language, repeating ≥half the CHARACTER tokens verbatim (a structural proxy for the
  ≥80%-verbatim subject-repeat rule), leaking no cut-language (`cut to` / `next shot` /
  `meanwhile`) and not opening with a bare negative; the `Total: ~Ns (one continuous take, no
  cuts) / AR.` footer with `N` agreeing with `8 + 7*hops` (±1s), the `Audio:` clause, and the
  positive-constraint suffix (`one continuous shot, no cuts` AND `stable picture`). Self-tested
  against the worked owl example (pass at 2 and 3 hops) and seeded failures (subject paraphrase
  → drift, cut-language leak, duration off, token-count off, missing suffix, single hop).
- `references/continuous-grammar.md` — the D1 Veo `image-to-video` + `extend-video` recipe baked
  inline (the runtime sandbox has no KB), the ≥80%-subject-repeat continuity rule, the
  "one evolving shot, no cuts" rules, the continuous-camera vocabulary and anti-patterns, the
  length arithmetic (`8 + 7*hops`), the PROVEN render-input shape from the Step-0 PoC
  (2026-06-20, veo3.1 i2v then extend-video), and a fully worked owl example (`dawn-owl`, 2 hops
  ~22s 16:9): base — the owl lifts from a pine and glides over the treetops as mist drifts;
  hop 1 — the same owl glides lower along a winding silver stream as dawn light warms; hop 2 —
  the same owl rises toward the rising sun, wings catching gold.
- `evals/evals.json` — 3 objective, regex-free text evals derived from JTBD-2: the dawn-owl
  story (2 hops 16:9), a 3-hop 9:16 rover, and a defaults-only fox run with the Notes record.
  `evals/rubric.md` — 3 text dimensions (continuity-and-no-cuts 0.40,
  subject-repeat-and-identity-lock 0.35, length-and-audio-footer 0.25; weights sum to 1.00),
  target 0.85 / publish 0.80, stuck_window 5, judge `claude-sonnet-4-6`, guardrails
  (`smoke_install`, `memory_persistence`, `output_validator`; forbidden edits to `bot/CLAUDE.md`
  and this rubric). No media-judge dim — this phase renders no MP4.
- Headless failure handling per the JTBD-2 contract: missing brief → clean `blocked` record in
  state.md (never an invented story); hop-count out of range → clamp to 2-3 and record; aspect
  not 16:9/9:16 → snap to the nearest and record; branded/real-person brief → friendly stylized
  stand-in (no realistic human face), recorded in `## Notes`.
