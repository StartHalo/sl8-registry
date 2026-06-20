# Changelog

All notable changes to the `bot-029-keyframe-plan` skill.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Added
- Initial authoring (BOT-029 Full Build, Author activity). Covers the JTBD: phase 1 of the
  keyframe chain, turning the project's story brief into a machine-checkable **keyframe plan**
  at `artifacts/<project-name>/keyframe-plan.md` that pins BOTH the first and last frame of
  every scene — a `## Style` global style/look header, 5-7 frozen `## Character` tokens
  (face/body/color/eyes/signature), `## Keyframe States` with K+1 numbered standalone state
  images (`State 0`..`State K`), `## Scenes` with K continuity-chained scenes (scene `i`
  animates `state[i-1] -> state[i]`, one motion/transition each), and a
  `Total: K scenes, ~6s each, AR. Audio: ...` footer disclosing an added ambient bed. The
  character is **self-contained in the keyframes** — there is no separate character-bible skill;
  the frozen tokens reused verbatim across the states ARE the identity lock. Pure-LLM phase (no
  generation, no network). The render phase (phase 2) reads this plan, pins each state as a
  frame, and animates each scene between two pinned frames in first-last-frame mode.
- `scripts/validate-keyframe-plan.sh` — deterministic structural linter (the phase gate):
  `# Keyframe Plan:` title + non-empty `## Style`; `## Character` with ≥5 `- <key>: <token>`
  bullets, none empty; `## Keyframe States` numbered contiguously from `State 0`, each with a
  non-empty standalone description; `## Scenes` numbered contiguously from `Scene 1`, each
  declaring its `state (i-1) -> state i` continuity chain + a motion line; the **K+1 states for
  K scenes** arithmetic (states == scenes+1, highest state index == K); the
  `Total: K scenes, ~Ss each, AR` footer + `Audio:` clause with K agreeing with the scene
  count; and a python pass enforcing the **verbatim-token lock** (every frozen Character token
  reappears byte-identical across the states). `bash -n` clean, `chmod +x`. Validated against a
  worked `baby-dragon` plan (pass) and seeded failures (off-by-one K-states-for-K-scenes,
  a broken continuity chain that skips a state, a paraphrased token, a missing footer).
- `references/keyframe-grammar.md` — the B1/B2 first-last-frame recipe baked inline (each state
  is a FULL standalone image; each scene is ONE motion between two pinned frames), the
  continuity-chaining rule (`state[i]` is the end of scene `i` and the start of scene `i+1`, no
  jump cuts), the K+1-states-for-K-scenes arithmetic, the state-sequence arc (dormant -> first
  sign -> emergence -> full form -> payoff) with the distinct-silhouette guidance, the
  anti-pattern table, and a fully worked `baby-dragon` example (5 states / 4 scenes, 16:9 — egg
  -> cracking -> peeking -> standing+wings -> hovering, with the 4 between-state motion prompts).
- `evals/evals.json` — 3 objective, regex-free text evals (the `baby-dragon` reveal at
  scene-count 4, a defaults-only `seedling-sprout` run, and a 5-scene `robot-unfolds` at 9:16);
  visual checks phrased as keyframe sampling. `evals/rubric.md` — 3 TEXT dimensions only
  (keyframe-states-and-arc 0.40, continuity-chain-and-state-arithmetic 0.35,
  frozen-token-lock-and-audio-disclosure 0.25; weights sum to 1.00), no media-judge dim (this
  skill renders nothing), target 0.85 / publish 0.80, stuck_window 5, judge
  `claude-sonnet-4-6`, guardrails (`smoke_install`, `memory_persistence`, `output_validator`;
  forbidden edits to `bot/CLAUDE.md` and this rubric).
- Headless failure handling per the JTBD contract: missing brief → clean `blocked` record in
  state.md (never an invented story); a real-person/realistic-face brief → friendly stylized
  stand-in, recorded in `## Notes`; two beats packed into one scene → split into two scenes plus
  the intermediate state, recorded in `## Notes`.
