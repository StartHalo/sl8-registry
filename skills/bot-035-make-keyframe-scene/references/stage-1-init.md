# Stage 1 — init (project setup)

Absorbs the BOT-029 `onboarding` PROJECT mode. This is **Layer 1** (project setup): per-project
folder isolation + `context.md` (the brief) + `state.md` (the ledger) + the dashboard. It is
**not a skill** — it is the first internal stage of this maker.

**Reads:** the chat brief.
**Writes:** `artifacts/<slug>/context.md`, `artifacts/<slug>/state.md`, `artifacts/dashboard.html`.

---

## Step 1 — Classify the brief (the four intents)

Decide the intent BEFORE touching any file. Routing turns on **the token seed kit at
`artifacts/seed/`**.

| Intent | Signal | Effect on the run |
|---|---|---|
| **character-only** (check first) | "just set up my character", "set up my look", or the brief has **no story** with a before-and-after | **Hand off to `bot-035-update-character` (kit-only route)** — establish/inspect the token kit, then **stop. No short.** Do not write the 7-stage ledger. |
| **reset character** | "reset character", "new character", "change the style", "new look", or the user says they edited `artifacts/seed/style.md` / `identity.md` | Set `reset_seed: true` in `context.md`. If a story is also present, continue as a normal short (stage 2 will run update-character's **reset** — FREE for a token kit). If no story, treat as character-only. |
| **continue series** | a story IS present **and** `artifacts/seed/` already holds a complete token kit and no reset was asked | Normal short; stage 2 = **reuse** (snapshot the existing kit, no re-freeze). |
| **new short** (default) | a story is present and either no kit exists yet or it is incomplete | Normal short; stage 2 bootstraps the kit via update-character on first run. |

For **character-only**, run `bot-035-update-character` now (it owns the only writer of
`artifacts/seed/`) and stop with its `kit-only` completion message. Everything below is for the
three story intents.

---

## Step 2 — Derive the project slug

From the story: kebab-case, 3–30 chars, lowercase, no brands, no real people's names.

- "a baby dragon hatches and takes its first flight" → `dragon-hatch`
- "a logo assembles itself from scattered pieces" → `logo-assemble`
- "a transformation" → too abstract; concretize first via `references/keyframe-grammar.md`, then slug

Create `artifacts/<slug>/`. If the slug collides with an existing project folder, suffix `-2`,
`-3`, … (never overwrite another project).

---

## Step 3 — Write `context.md`

Path: `artifacts/<slug>/context.md` (≤ 2,000 chars). Concretize a vague brief into ONE concrete
before-and-after journey (`references/keyframe-grammar.md`) and record the assumption here.

```
# Context — <slug>

Story: <one concrete before-and-after sentence — the dormant state and the payoff state>
Aspect: 16:9 (default) | 9:16 | 1:1
Scene count (K): 4 (default) | <user-stated, 3-6>
Intent: new-short | continue-series | reset-character
Reset seed: false | true
Created: <YYYY-MM-DD>
Assumptions: <concretization / defaults applied, or "none">
```

---

## Step 4 — Write the 7-stage `state.md`

Path: `artifacts/<slug>/state.md`. **Every stage row's `skill` is
`bot-035-make-keyframe-scene`** (this maker) — the `stage` column is the resume jump target.
Status values: `done` / `in-progress` / `next` / `blocked`.

```markdown
# Project State

project: <slug>
grain: one-folder-per-short
status: in-progress
updated: <YYYY-MM-DD>
skill: bot-035-make-keyframe-scene        # every stage row below is a SECTION of this one skill

## Stages

| # | stage        | skill                        | status      | reads                                  | writes                                      |
|---|--------------|------------------------------|-------------|----------------------------------------|---------------------------------------------|
| 1 | init         | bot-035-make-keyframe-scene  | done        | chat brief                             | context.md, state.md, dashboard.html        |
| 2 | resolve-seed | bot-035-make-keyframe-scene  | next        | context.md, artifacts/seed/            | seed-snapshot/                              |
| 3 | plan         | bot-035-make-keyframe-scene  | next        | context.md, seed-snapshot/             | keyframe-plan.md (validate: PASS)           |
| 4 | generate     | bot-035-make-keyframe-scene  | next        | keyframe-plan.md, seed-snapshot/       | keyframes/, work-scenes/                    |
| 5 | assemble     | bot-035-make-keyframe-scene  | next        | work-scenes/                           | episode.mp4                                 |
| 6 | verify       | bot-035-make-keyframe-scene  | next        | episode.mp4                            | (verdict → this ledger)                     |
| 7 | deliver      | bot-035-make-keyframe-scene  | next        | episode.mp4, verdict                   | summary.md                                  |

next_action: Stage 2 resolve-seed — read artifacts/seed/seed.manifest.json; bootstrap via bot-035-update-character if absent (intent=<intent>, reset_seed=<bool>); snapshot into artifacts/<slug>/seed-snapshot/.

## Decisions log
- <YYYY-MM-DD>: init — intent=<intent>, slug=<slug>, aspect=<ar>, scene-count K=<K>.
```

- **reset-character**: same table; the `resolve-seed` `next_action` notes "run update-character
  RESET (FREE re-freeze, no image-gen) before snapshot".
- **continue-series**: `resolve-seed` `next_action` notes "kit present — REUSE; snapshot only,
  no re-freeze".

---

## Step 5 — Initialise `dashboard.html`

Read `templates/dashboard.html`. Replace `__DASHBOARD_DATA__` with a JSON object describing the
token seed kit (channel) status + this short's stage status. Token kit → there are NO anchor
rows; the kit is the docs + the frozen tokens + the seed:

```json
{
  "channel": [
    {"file": "artifacts/seed/style.md", "status": "✓ ready", "detail": "soft Pixar-style storybook fantasy look"},
    {"file": "artifacts/seed/identity.md", "status": "✓ ready", "detail": "6 frozen CHARACTER tokens (text-weave, no PNGs)"},
    {"file": "artifacts/seed/seed.manifest.json", "status": "✓ ready", "detail": "kitType token · seed 2929"}
  ],
  "episode": {
    "slug": "<slug>",
    "phases": [
      {"phase": "Plan keyframes", "status": "— waiting", "output": ""},
      {"phase": "Generate keyframes", "status": "— waiting", "output": ""},
      {"phase": "Morph scenes (Hailuo)", "status": "— waiting", "output": ""},
      {"phase": "Assemble episode", "status": "— waiting", "output": ""}
    ]
  },
  "history": []
}
```

Write the completed HTML to `artifacts/dashboard.html`.

---

## Step 6 — Advance the ledger

Mark stage 1 `done`, set stage 2 `resolve-seed` `in-progress`, refresh `updated` and
`next_action`. Then continue to stage 2 this session (or stop — a future session resumes from
`state.md`).

**Headless:** never ask for missing inputs. No story at all → character-only handoff. Vague
story → concretize and note it. Bad/empty slug → `short-<YYYY-MM-DD>`.
