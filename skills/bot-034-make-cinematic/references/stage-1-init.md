# Stage 1 — init (project setup)

Absorbs BOT-027 `onboarding` PROJECT mode. This is **Layer 1** (project setup): per-project
folder isolation + `context.md` (the brief) + `state.md` (the ledger) + the dashboard. It is
**not a skill** — it is the first internal stage of this maker. There is **no `onboarding`
skill and no `bot/user.md`** in this architecture.

**Reads:** the chat brief.
**Writes:** `artifacts/<slug>/context.md`, `artifacts/<slug>/state.md`, `artifacts/dashboard.html`.

---

## Step 1 — Classify the brief (the four intents)

Decide the intent BEFORE touching any file. Routing turns on **the bible kit at
`artifacts/seed/`**, not on per-project regeneration (the new architecture promotes the bible
to a one-time channel kit — see `docs/features/video-director-fleet/07-seed-element-interface.md`).

| Intent | Signal | Effect on the run |
|---|---|---|
| **bible-only** (check first) | "just set up my character / bible", "lock a character", or the brief has **no story** a character could act out | **Hand off to `bot-034-update-character-bible` (kit-only route)** — establish/inspect the bible kit, then **stop. No cinematic.** Do not write the 7-stage ledger. |
| **reset bible** | "reset the bible / new character / change the style / new look", or the user says they edited `artifacts/seed/style.md` / `identity.md` | Set `reset_seed: true` in `context.md`. If a story is also present, continue as a normal cinematic (stage 2 runs update-character-bible's **reset**). If no story, treat as bible-only. |
| **continue channel** | a story IS present **and** `artifacts/seed/` already holds a complete kit (both anchors present) and no reset was asked | Normal cinematic; stage 2 = **reuse** (snapshot the existing bible, no paid regen). |
| **new cinematic** (default) | a story is present and either no kit exists yet or it is incomplete | Normal cinematic; stage 2 bootstraps the bible via update-character-bible on first run. |

For **bible-only**, run `bot-034-update-character-bible` now (it owns the only writer of
`artifacts/seed/`) and stop with its `kit-only` completion message. Everything below is for
the three cinematic intents.

---

## Step 2 — Derive the project slug

From the story: kebab-case, 3–30 chars, lowercase, no brands, no real people's names.

- "a cheerful little robot's adventure in a sunlit meadow" → `meadow-robot`
- "a dark-elf warrior duels a stone golem at dusk" → `obsidian-duel`
- "make something cool" → too abstract; concretize first (`references/shot-grammar.md`), then slug

Create `artifacts/<slug>/`. If the slug collides with an existing project folder, suffix
`-2`, `-3`, … (never overwrite another project).

---

## Step 3 — Write `context.md`

Path: `artifacts/<slug>/context.md` (≤ 2,000 chars). Concretize a vague story into ONE
concrete premise and record the assumption here.

```
# Context — <slug>

Story: <one concrete premise sentence — the scene, the character's want, the world>
Profile: story (default) | fight
Aspect: 16:9 (default) | 9:16 | 1:1 | 21:9
Duration: 15s (default) | <user-stated, 4-15s>
Shot count: 5 (default) | <user-stated, 4-6>
Reference image: none | <path under inputs/ the user supplied>
Intent: new-cinematic | continue-channel | reset-bible
Reset seed: false | true
Created: <YYYY-MM-DD>
Assumptions: <concretization / defaults applied, or "none">
```

If the user supplied a reference image, copy it into `artifacts/<slug>/inputs/ref.png` and
record that path — stage 2 passes it through to the bible reset as the primary identity anchor.

---

## Step 4 — Write the 7-stage `state.md`

Path: `artifacts/<slug>/state.md`. **Every stage row's `skill` is `bot-034-make-cinematic`**
(this maker) — the `stage` column is the resume jump target. Status values:
`done` / `in-progress` / `next` / `blocked`.

```markdown
# Project State

project: <slug>
grain: one-folder-per-cinematic
status: in-progress
updated: <YYYY-MM-DD>
skill: bot-034-make-cinematic        # every stage row below is a SECTION of this one skill

## Stages

| # | stage        | skill                   | status      | reads                                  | writes                                      |
|---|--------------|-------------------------|-------------|----------------------------------------|---------------------------------------------|
| 1 | init         | bot-034-make-cinematic  | done        | chat brief                             | context.md, state.md, dashboard.html        |
| 2 | resolve-seed | bot-034-make-cinematic  | next        | context.md, artifacts/seed/            | seed-snapshot/                              |
| 3 | plan         | bot-034-make-cinematic  | next        | context.md, seed-snapshot/             | shotlist.md (validate-shotlist: PASS)       |
| 4 | generate     | bot-034-make-cinematic  | next        | shotlist.md, seed-snapshot/            | work/<slug>/raw.mp4 (or clips/)             |
| 5 | assemble     | bot-034-make-cinematic  | next        | work/<slug>/raw.mp4 or clips/          | episode.mp4                                 |
| 6 | verify       | bot-034-make-cinematic  | next        | episode.mp4                            | (verdict → this ledger)                     |
| 7 | deliver      | bot-034-make-cinematic  | next        | episode.mp4, verdict                   | summary.md                                  |

next_action: Stage 2 resolve-seed — read artifacts/seed/seed.manifest.json; bootstrap via bot-034-update-character-bible if absent (intent=<intent>, reset_seed=<bool>); snapshot into artifacts/<slug>/seed-snapshot/.

## Decisions log
- <YYYY-MM-DD>: init — intent=<intent>, slug=<slug>, profile=<story|fight>, aspect=<ar>, duration=<Xs>, shots=<K>.
```

- **reset-bible**: same table; the `resolve-seed` `next_action` notes "run
  update-character-bible RESET (PAID anchor regen) before snapshot".
- **continue-channel**: `resolve-seed` `next_action` notes "kit present — REUSE; snapshot only,
  no regen".

---

## Step 5 — Initialise `dashboard.html`

Read `templates/dashboard.html`. Replace `__DASHBOARD_DATA__` with a JSON object describing
the bible (channel) status + this cinematic's stage status:

```json
{
  "channel": [
    {"file": "artifacts/seed/style.md", "status": "✓ ready", "detail": "Pixar-3D cinematic look"},
    {"file": "artifacts/seed/identity.md", "status": "✓ ready", "detail": "the meadow robot, seed 7777"},
    {"file": "artifacts/seed/anchors/turnaround.png", "status": "— pending | ✓ ready", "detail": "@Image1 reference"},
    {"file": "artifacts/seed/anchors/hero.png", "status": "— pending | ✓ ready", "detail": "@Image2 reference"}
  ],
  "episode": {
    "slug": "<slug>",
    "phases": [
      {"phase": "Plan shot-list", "status": "— waiting", "output": ""},
      {"phase": "Render cinematic", "status": "— waiting", "output": ""},
      {"phase": "Assemble", "status": "— waiting", "output": ""},
      {"phase": "Verify", "status": "— waiting", "output": ""}
    ]
  },
  "history": []
}
```

For **continue-channel**, the two anchor rows show `✓ reusing` with the bible's model/date.
Write the completed HTML to `artifacts/dashboard.html`.

---

## Step 6 — Advance the ledger

Mark stage 1 `done`, set stage 2 `resolve-seed` `in-progress`, refresh `updated` and
`next_action`. Then continue to stage 2 this session (or stop — a future session resumes
from `state.md`).

**Headless:** never ask for missing inputs. No story at all → bible-only handoff. Vague
story → concretize and note it. Bad/empty slug → `cinematic-<YYYY-MM-DD>`. A real-person /
branded premise → keep the premise, swap in a stylized stand-in, note the substitution.
