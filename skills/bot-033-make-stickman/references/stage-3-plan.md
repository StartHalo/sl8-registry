# Stage 3 — plan (beat sheet)

Absorbs BOT-013 `stickman-episode-design` Steps 6–7. Turns the concrete topic into a
linter-gated beat sheet.

**Reads:** `context.md`, `artifacts/<slug>/seed-snapshot/`.
**Writes:** `artifacts/<slug>/01-episode-plan.md` (gated by `scripts/validate-plan.sh`).

> The file is named `01-episode-plan.md` because the bot-local linter (`validate-plan.sh`)
> and the still gate (`check-set.sh`) key off that exact name. It IS this recipe's `plan.md`.

---

## Step 1 — Concretize, then plan the beat arc

If the topic is at all abstract, lock ONE concrete domestic scenario first — specific place,
specific frustration, specific moment (`references/ideation.md` has the territory map and
worked examples). Then plan the arc:

```
Beat 1 (setup):        stickman in a recognizable situation
Beat 2 (complication): something goes wrong / unexpected
Beat 3 (escalation):   it gets worse or more absurd
Beat 4+ (optional):    further escalation
Last beat (punchline): a VISUAL payoff — an action, not a caption
```

Target **3–8 beats**, each **5s or 10s** only, **15–60s total**. The punchline is an action;
at most one beat may carry a single short in-frame label (a quoted UPPERCASE word on one prop).

## Step 2 — Per-beat fields (exactly four)

Each beat carries exactly `scene` / `motion` / `duration` / `camera`, one line each at
column 1. See `references/beat-grammar.md` for worked examples and anti-patterns.

- **`scene:`** ≥40 chars — environment, figure position, props, lighting direction, framing.
  This is the **only** variable text in the still prompt (stage 4 prepends the frozen
  STYLE/CHARACTER/DISCIPLINE/CONSTRAINTS blocks). **Never** restate the style stack
  (pencil/graphite/cross-hatch) or re-describe the character (cap/dot-eyes/single-stroke) —
  the linter rejects that duplication because it causes drift.
- **`motion:`** ≥20 chars — ONE figure action. The camera move is the `camera:` keyword,
  never duplicated in `motion:`; never define style in `motion:`.
- **`duration:`** exactly `5` or `10` (the Seedance i2v clip-length granularity).
- **`camera:`** a Seedance keyword — `locked-off | slow dolly-in | slow dolly-out |
  slow pan left | slow pan right | arc shot | tracking shot`. Defaults by beat role:
  setup → `locked-off` or `slow dolly-out`; complication → `locked-off`; escalation →
  `slow pan right` or `tracking shot`; punchline → `slow dolly-in`.

## Step 3 — Write `01-episode-plan.md` (the linter's exact shape)

```markdown
# Episode Plan: <slug>
logline: <one sentence — what this episode is about>
aspect: 16:9 | 9:16
target-length: <integer 15-60>
punchline: <≤10 words; the visual/spoken payoff>
room-tone: on | off

## Beats

### Beat 1: <kebab-slug>
scene: <≥40 chars: environment, figure position, props, lighting, framing>
motion: <≥20 chars: ONE figure action>
duration: 5 | 10
camera: <Seedance keyword>

### Beat 2: <kebab-slug>
scene: ...
motion: ...
duration: 5 | 10
camera: ...

### Beat 3: <kebab-slug>
...
```

Header fields are exactly `logline`, `aspect`, `target-length`, `punchline`, `room-tone`
(no others). Beats are numbered consecutively from 1 under a single `## Beats` heading;
slugs are kebab-case and unique (they become the still/clip filenames). `room-tone` describes
whether an ambient bed is desired — but note Seedance carries **native** audio, so assembly
will resolve room-tone OFF regardless (stage 5).

## Step 4 — Validate (≤3 fix cycles)

```bash
scripts/validate-plan.sh artifacts/<slug>/01-episode-plan.md
```

The linter is fully structural (zero LLM judgment): title present; the five header fields
present, non-duplicated, in range; 3–8 beats numbered from 1; per-beat exactly one
scene/motion/duration/camera; `duration ∈ {5,10}`; total 15–60s; scene/motion length bands;
no frozen-style/character duplication; ≤1 in-frame label. It prints itemized `FAIL: …` lines
or `OK: …`.

Fix and re-run up to **3 cycles**. After 3 failed cycles, mark stage 3 `blocked` in
`state.md` with the specific linter error — never proceed to paid generation on an invalid plan.

## Step 5 — Advance the ledger

Mark stage 3 `done` (note "validate-plan: PASS — N beats, Xs total"), set stage 4 `generate`
`in-progress`. Update the dashboard "Plan beats" row to `✓ done (N beats, Xs)`. Update
`next_action`: "Stage 4 generate — one still per beat via gen-image.sh (--ref source anchor),
gate with check-set.sh, then animate each beat with gen-clip.sh."
