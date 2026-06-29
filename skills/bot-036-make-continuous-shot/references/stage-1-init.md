# Stage 1 — init (project setup)

Absorbs BOT-030 `onboarding` PROJECT mode. This is **Layer 1** (project setup): per-project
folder isolation + `context.md` (the brief) + `state.md` (the ledger) + the dashboard. It is
**not a skill** — it is the first internal stage of this maker. There is **no `user.md` and
no onboarding skill** — project setup lives here.

**Reads:** the chat brief.
**Writes:** `artifacts/<slug>/context.md`, `artifacts/<slug>/state.md`, `artifacts/dashboard.html`.

---

## Step 1 — Classify the brief (the four intents)

Decide the intent BEFORE touching any file. Routing turns on **the token seed kit at
`artifacts/seed/`**, not on any PNGs (this is a token kit — there are none).

| Intent | Signal | Effect on the run |
|---|---|---|
| **character-only** (check first) | "just set up my character / subject", "lock my creature", or the brief has **no subject/journey** a continuous shot could follow | **Hand off to `bot-036-update-character` (kit-only route)** — establish/inspect the token kit, then **stop. No shot.** Do not write the 7-stage ledger. |
| **reset character** | "reset character", "new character / creature", "change the style / look", or the user says they edited `artifacts/seed/style.md` / `identity.md` | Set `reset_seed: true` in `context.md`. If a subject is also present, continue as a normal shot (stage 2 runs update-character's **reset** — FREE token re-freeze, no image-gen). If no subject, treat as character-only. |
| **continue channel** | a subject IS present **and** `artifacts/seed/` already holds a complete token kit and no reset was asked | Normal shot; stage 2 = **reuse** (snapshot the existing kit, zero cost). |
| **new shot** (default) | a subject is present and either no kit exists yet or it is incomplete | Normal shot; stage 2 bootstraps the kit via update-character on first run (free token freeze). |

For **character-only**, run `bot-036-update-character` now (it owns the only writer of
`artifacts/seed/`) and stop with its `kit-only` completion message. Everything below is for
the three shot intents.

---

## Step 2 — Derive the project slug

From the subject: kebab-case, 3–30 chars, lowercase, no brands, no real people's names.

- "a fluffy owl gliding over a misty dawn forest" → `dawn-owl`
- "a drift through a neon city at dusk" → `city-drift`
- "something peaceful" → too abstract; concretize first (one continuous journey/moment), then slug

Create `artifacts/<slug>/`. If the slug collides with an existing project folder, suffix
`-2`, `-3`, … (never overwrite another project).

---

## Step 3 — Write `context.md`

Path: `artifacts/<slug>/context.md` (≤ 2,000 chars). Concretize a vague brief into ONE
concrete continuous journey/moment (a glide, a walk, a drift, a flythrough) and record the
assumption here.

```
# Context — <slug>

Subject / journey: <one concrete continuous-motion sentence — a single evolving take>
Aspect: 16:9 (default) | 9:16
Hop count: 2 (default; valid 2-3 → base 8s + N×7s ≈ 22-29s)
Intent: new-shot | continue-channel | reset-character
Reset seed: false | true
Created: <YYYY-MM-DD>
Assumptions: <concretization / defaults applied, or "none">
```

> Friendly, stylized characters/creatures only — never a realistic identifiable human face.
> If the brief names a real person/brand/IP, keep the premise but swap in a stylized stand-in
> and note the substitution in `context.md`.

---

## Step 4 — Write the 7-stage `state.md`

Path: `artifacts/<slug>/state.md`. **Every stage row's `skill` is
`bot-036-make-continuous-shot`** (this maker) — the `stage` column is the resume jump target.
Status values: `done` / `in-progress` / `next` / `blocked`.

```markdown
# Project State

project: <slug>
grain: one-folder-per-shot
status: in-progress
updated: <YYYY-MM-DD>
skill: bot-036-make-continuous-shot   # every stage row below is a SECTION of this one skill

## Stages

| # | stage        | skill                          | status      | reads                                  | writes                                      |
|---|--------------|--------------------------------|-------------|----------------------------------------|---------------------------------------------|
| 1 | init         | bot-036-make-continuous-shot   | done        | chat brief                             | context.md, state.md, dashboard.html        |
| 2 | resolve-seed | bot-036-make-continuous-shot   | next        | context.md, artifacts/seed/            | seed-snapshot/                              |
| 3 | plan         | bot-036-make-continuous-shot   | next        | context.md, seed-snapshot/             | continuous-plan.md (validate-plan: PASS)    |
| 4 | generate     | bot-036-make-continuous-shot   | next        | continuous-plan.md, seed-snapshot/     | base-frame.png, episode.mp4                 |
| 5 | assemble     | bot-036-make-continuous-shot   | next        | episode.mp4                            | (zero-concat passthrough — no writes)       |
| 6 | verify       | bot-036-make-continuous-shot   | next        | episode.mp4, base duration             | (verdict → this ledger)                     |
| 7 | deliver      | bot-036-make-continuous-shot   | next        | episode.mp4, verdict                   | summary.md                                  |

next_action: Stage 2 resolve-seed — read artifacts/seed/seed.manifest.json; bootstrap via bot-036-update-character if absent (intent=<intent>, reset_seed=<bool>); snapshot into artifacts/<slug>/seed-snapshot/.

## Decisions log
- <YYYY-MM-DD>: init — intent=<intent>, slug=<slug>, aspect=<ar>, hop-count=<N>.
```

- **reset-character**: same table; the `resolve-seed` `next_action` notes "run
  update-character RESET (FREE token re-freeze + linter, no image-gen) before snapshot".
- **continue-channel**: `resolve-seed` `next_action` notes "kit present — REUSE; snapshot only,
  no regen".

---

## Step 5 — Initialise `dashboard.html`

Read `templates/dashboard.html`. Replace `__DASHBOARD_DATA__` with a JSON object describing
the token seed kit (channel) status + this shot's stage status. A **token kit has no
anchors** — the channel rows are the manifest, style, and identity tokens:

```json
{
  "channel": [
    {"file": "artifacts/seed/seed.manifest.json", "status": "✓ ready | — pending", "detail": "kitType token, consumption text-repeat, seed <N>"},
    {"file": "artifacts/seed/style.md", "status": "✓ ready", "detail": "<look one-liner>"},
    {"file": "artifacts/seed/identity.md", "status": "✓ ready", "detail": "<5-7 frozen tokens, one-liner>"}
  ],
  "episode": {
    "slug": "<slug>",
    "phases": [
      {"phase": "Plan continuous shot", "status": "— waiting", "output": ""},
      {"phase": "Base frame + base i2v", "status": "— waiting", "output": ""},
      {"phase": "Extend hops (no concat)", "status": "— waiting", "output": ""},
      {"phase": "Verify grew + deliver", "status": "— waiting", "output": ""}
    ]
  },
  "history": []
}
```

For **continue-channel**, the three channel rows show `✓ reusing` with the kit's date.
Write the completed HTML to `artifacts/dashboard.html`.

---

## Step 6 — Advance the ledger

Mark stage 1 `done`, set stage 2 `resolve-seed` `in-progress`, refresh `updated` and
`next_action`. Then continue to stage 2 this session (or stop — a future session resumes
from `state.md`).

**Headless:** never ask for missing inputs. No subject at all → character-only handoff. Vague
subject → concretize into one continuous journey and note it. Bad/empty slug → `shot-<YYYY-MM-DD>`.
