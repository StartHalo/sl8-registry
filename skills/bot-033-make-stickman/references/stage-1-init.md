# Stage 1 — init (project setup)

Absorbs BOT-013 `stickman-episode-design` Steps 1–5 and 8. This is **Layer 1** (project
setup): per-project folder isolation + `context.md` (the brief) + `state.md` (the ledger)
+ the dashboard. It is **not a skill** — it is the first internal stage of this maker.

**Reads:** the chat brief.
**Writes:** `artifacts/<slug>/context.md`, `artifacts/<slug>/state.md`, `artifacts/dashboard.html`.

---

## Step 1 — Classify the brief (the four intents)

Decide the intent BEFORE touching any file. These are the new-architecture successors of
BOT-013's US-1/2/3/4 — but routing now turns on **the seed kit at `artifacts/seed/`**, not
on flat-root PNGs.

| Intent | Signal | Effect on the run |
|---|---|---|
| **character-only** (check first) | "just set up my character", "character sheet only", or the brief has **no topic** a stickman could act out | **Hand off to `bot-033-update-character` (kit-only route)** — establish/inspect the seed kit, then **stop. No episode.** Do not write the 7-stage ledger. |
| **reset character** | "reset character", "new character", "change the style", "new look", or the user says they edited `artifacts/seed/style.md` / `identity.md` | Set `reset_seed: true` in `context.md`. If a topic is also present, continue as a normal episode (stage 2 will run update-character's **reset**). If no topic, treat as character-only. |
| **continue series** | a topic IS present **and** `artifacts/seed/` already holds a complete kit (anchors present) and no reset was asked | Normal episode; stage 2 = **reuse** (snapshot the existing kit, no paid regen). |
| **new episode** (default) | a topic is present and either no kit exists yet or it is incomplete | Normal episode; stage 2 bootstraps the kit via update-character on first run. |

For **character-only**, run `bot-033-update-character` now (it owns the only writer of
`artifacts/seed/`) and stop with its `kit-only` completion message. Everything below is for
the three episode intents.

---

## Step 2 — Derive the project slug

From the topic: kebab-case, 3–30 chars, lowercase, no brands, no real people's names.

- "procrastinating on a work deadline" → `work-deadline`
- "trying to set up new wifi" → `wifi-setup`
- "life" → too abstract; concretize first via `references/ideation.md`, then slug

Create `artifacts/<slug>/`. If the slug collides with an existing project folder, suffix
`-2`, `-3`, … (never overwrite another project).

---

## Step 3 — Write `context.md`

Path: `artifacts/<slug>/context.md` (≤ 2,000 chars). Concretize a vague topic into ONE
concrete domestic scenario (`references/ideation.md`) and record the assumption here.

```
# Context — <slug>

Topic: <one concrete scenario sentence>
Aspect: 16:9 (default) | 9:16
Target length: ~30s (default) | <user-stated, 15-60s>
Intent: new-episode | continue-series | reset-character
Reset seed: false | true
Created: <YYYY-MM-DD>
Assumptions: <concretization / defaults applied, or "none">
```

---

## Step 4 — Write the 7-stage `state.md`

Path: `artifacts/<slug>/state.md`. **Every stage row's `skill` is `bot-033-make-stickman`**
(this maker) — the `stage` column is the resume jump target. Status values:
`done` / `in-progress` / `next` / `blocked`.

```markdown
# Project State

project: <slug>
grain: one-folder-per-episode
status: in-progress
updated: <YYYY-MM-DD>
skill: bot-033-make-stickman        # every stage row below is a SECTION of this one skill

## Stages

| # | stage        | skill                 | status      | reads                                  | writes                                      |
|---|--------------|-----------------------|-------------|----------------------------------------|---------------------------------------------|
| 1 | init         | bot-033-make-stickman | done        | chat brief                             | context.md, state.md, dashboard.html        |
| 2 | resolve-seed | bot-033-make-stickman | next        | context.md, artifacts/seed/            | seed-snapshot/                              |
| 3 | plan         | bot-033-make-stickman | next        | context.md, seed-snapshot/             | 01-episode-plan.md (validate-plan: PASS)    |
| 4 | generate     | bot-033-make-stickman | next        | 01-episode-plan.md, seed-snapshot/     | 03-stills/, 04-clips/                       |
| 5 | assemble     | bot-033-make-stickman | next        | 04-clips/                              | episode.mp4                                 |
| 6 | verify       | bot-033-make-stickman | next        | episode.mp4                            | (verdict → this ledger)                     |
| 7 | deliver      | bot-033-make-stickman | next        | episode.mp4, verdict                   | summary.md                                  |

next_action: Stage 2 resolve-seed — read artifacts/seed/seed.manifest.json; bootstrap via bot-033-update-character if absent (intent=<intent>, reset_seed=<bool>); snapshot into artifacts/<slug>/seed-snapshot/.

## Decisions log
- <YYYY-MM-DD>: init — intent=<intent>, slug=<slug>, aspect=<ar>, target=<Xs>.
```

- **reset-character**: same table; the `resolve-seed` `next_action` notes "run
  update-character RESET (PAID anchor regen) before snapshot".
- **continue-series**: `resolve-seed` `next_action` notes "kit present — REUSE; snapshot only,
  no regen".

---

## Step 5 — Initialise `dashboard.html`

Read `templates/dashboard.html`. Replace `__DASHBOARD_DATA__` with a JSON object describing
the seed kit (channel) status + this episode's stage status:

```json
{
  "channel": [
    {"file": "artifacts/seed/style.md", "status": "✓ ready", "detail": "pencil-sketch graphite"},
    {"file": "artifacts/seed/identity.md", "status": "✓ ready", "detail": "cap, circle head, teardrop body"},
    {"file": "artifacts/seed/anchors/character-source.png", "status": "— pending | ✓ ready", "detail": ""},
    {"file": "artifacts/seed/anchors/character-threequarter.png", "status": "— pending | ✓ ready", "detail": ""},
    {"file": "artifacts/seed/anchors/character-sideprofile.png", "status": "— pending | ✓ ready", "detail": ""}
  ],
  "episode": {
    "slug": "<slug>",
    "phases": [
      {"phase": "Plan beats", "status": "— waiting", "output": ""},
      {"phase": "Generate stills", "status": "— waiting", "output": ""},
      {"phase": "Animate clips", "status": "— waiting", "output": ""},
      {"phase": "Assemble episode", "status": "— waiting", "output": ""}
    ]
  },
  "history": []
}
```

For **continue-series**, the three anchor rows show `✓ reusing` with the kit's model/date.
Write the completed HTML to `artifacts/dashboard.html`.

---

## Step 6 — Advance the ledger

Mark stage 1 `done`, set stage 2 `resolve-seed` `in-progress`, refresh `updated` and
`next_action`. Then continue to stage 2 this session (or stop — a future session resumes
from `state.md`).

**Headless:** never ask for missing inputs. No topic at all → character-only handoff. Vague
topic → concretize and note it. Bad/empty slug → `episode-<YYYY-MM-DD>`.
