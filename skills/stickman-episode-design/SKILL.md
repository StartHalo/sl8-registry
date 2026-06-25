---
name: stickman-episode-design
description: Plans a stickman animation episode from a brief. Routes the request across four user stories (new episode, series continuation, character change, character-only), bootstraps channel config files from templates if absent, writes context.md + state.md + beat-sheet, and initialises the live status dashboard. Use this skill whenever the user provides a stickman episode topic, asks to make a new episode, wants to continue a series, or wants to change the character or style — even if they don't say episode design explicitly.
metadata:
  inputs:
    - name: episode-brief
      type: text
      description: The user's stickman episode topic or request.
  outputs:
    - name: episode-plan
      type: markdown
      path: artifacts/<slug>/01-episode-plan.md
      description: Beat sheet with per-beat scene, motion, duration, and camera keyword.
    - name: project-state
      type: markdown
      path: artifacts/<slug>/state.md
      description: Phase ledger the bot resumes the episode from.
    - name: dashboard
      type: html
      path: artifacts/dashboard.html
      description: Live HTML status dashboard for the channel and episode.
---

# Phase 1 — Episode Design (stickman-episode-design)

Covers: user story routing, channel setup, beat planning, dashboard init.

**Reads:** user brief, `artifacts/character-source.png` (presence check only)
**Writes:** `artifacts/art-direction.md` (if absent), `artifacts/character.md` (if absent),
`artifacts/<slug>/context.md`, `artifacts/<slug>/state.md`,
`artifacts/<slug>/01-episode-plan.md`, `artifacts/dashboard.html`

---

## Step 1 — Route the request

Determine which user story applies from the brief BEFORE touching any file. The routing
decision shapes everything that follows.

### US-4 — Character only (check first)
**Signal:** brief says "just a character", "character sheet", "character only", "no episode",
or simply contains no topic/scenario — nothing a stickman could act out.
**Action:** `mode = character-only`. Skip Steps 5-7 (no beat planning). Proceed through
Steps 2-4, write a one-phase state.md (phase 2 only), initialize dashboard, then stop.
Stickman-art picks up next.

### US-3 — Change character or style
**Signal:** brief contains "reset character", "new character", "different character",
"change the style", "new look", or user says they edited character.md / art-direction.md.
**Action:** `reset_character: true`. Then continue as US-1 (if topic present) or US-4 (if no topic).

### US-2 — Series continuation (same character)
**Signal:** topic is present AND `artifacts/character-source.png` exists AND reset_character
is NOT set.
**Action:** `skip_character: true`. Phase 2 will be marked `skip` in state.md — no regeneration
needed. Plan beats normally.

### US-1 — New episode (default)
**Signal:** topic is present AND `artifacts/character-source.png` does NOT exist.
**Action:** full pipeline. All four phases run.

---

## Step 2 — Bootstrap channel files (copy-if-absent)

Before creating any episode folder, ensure channel-level config files exist:

1. `artifacts/art-direction.md` — if missing, copy verbatim from `templates/art-direction.md`
2. `artifacts/character.md` — if missing, copy verbatim from `templates/character.md`

**Never overwrite files that already exist** — they contain the user's active settings.
If you copy a template, note it: "Created art-direction.md from default template."

---

## Step 3 — Derive project slug

From the topic: kebab-case, 3-30 chars, lowercase, no brands, no real people's names.
- "procrastinating on a work deadline" → `work-deadline`
- "trying to set up new wifi" → `wifi-setup`
- "life" → concretize first (references/ideation.md), then slug

For US-4: slug = `character-<YYYY-MM-DD>`

---

## Step 4 — Write context.md

Path: `artifacts/<slug>/context.md` (max 2,000 chars).

```
# Context — <slug>

Topic: <one concrete scenario sentence>
Aspect: 16:9 (default) | 9:16
Target length: ~30s (default) | <user-stated>
Mode: episode | character-only
Reset character: false | true
Skip character lock: false | true
Created: <YYYY-MM-DD>
```

---

## Step 5 — Write state.md

Path: `artifacts/<slug>/state.md`. Status values: `done` / `next` / `skip` / `blocked`.

**US-1 (new episode):**
```
| # | Phase | Skill | Status | Reads | Writes |
|---|-------|-------|--------|-------|--------|
| 1 | plan-episode | stickman-episode-design | done | brief | context.md, state.md, 01-episode-plan.md, dashboard.html |
| 2 | lock-character | stickman-character | next | character.md, art-direction.md | character-source.png, character-threequarter.png, character-sideprofile.png, character-spec.md, <ep>/character/ |
| 3 | generate-stills | stickman-art | next | 01-episode-plan.md, <ep>/character/character-spec.md | 03-stills/ |
| 4 | clips-and-assembly | stickman-clip-assembly | next | 01-episode-plan.md, 03-stills/stills-log.md | 04-clips/, episode.mp4, 05-summary.md |

next_action: Run stickman-character — lock channel character and copy to episode folder (phase 2).
```

**US-2 (series continuation):** same table but phase 2 = `skip`, note = "character-source.png
detected — copying existing assets to <ep>/character/". `next_action`: Run stickman-art — generate
stills (phase 3). Note: stickman-character still copies channel assets to `<ep>/character/` even
when skipping generation.

**US-3 (reset):** same as US-1 but phase 2 note = "reset_character=true — will archive
existing assets before regenerating".

**US-4 (character only):** single phase:
```
| 2 | lock-character | stickman-character | next | character.md, art-direction.md | character-source.png, character-threequarter.png, character-sideprofile.png, character-spec.md |
next_action: Run stickman-character — generate channel character (phase 2).
```

---

## Step 6 — Plan the beats (episode modes only; skip for US-4)

### Concretize the topic first

Turn any abstract topic into ONE concrete domestic scenario: specific place, specific
frustration, specific moment. See references/ideation.md for territory map and examples.

### Beat arc

```
Beat 1 (setup):       stickman in a recognizable situation
Beat 2 (complication): something goes wrong / unexpected
Beat 3 (escalation):  it gets worse or more absurd
Beat 4+ (optional):   further escalation
Last beat (punchline): visual payoff — action, not a caption
```

Target: 3–8 beats. Duration: 5s or 10s per beat only. Total: 15–60s.

### Each beat has exactly 5 fields

```markdown
## Beat 01 — <beat-slug>
scene: <≥15 words: environment, figure position, props, lighting direction, framing>
motion: <ONE figure action; e.g. "stickman slumps forward">
duration: 5s | 10s
camera: <Seedance camera keyword — locked-off | slow dolly-in | slow dolly-out | slow pan left | slow pan right | arc shot | tracking shot>
```

Default camera keywords by beat role:
- Setup / establishing: `locked-off` or `slow dolly-out`
- Complication / reaction: `locked-off`
- Escalation: `slow pan right` or `tracking shot`
- Punchline / payoff: `slow dolly-in`

### Composition contract

`scene:` is the ONLY variable text in the still prompt. Style, character, discipline,
and constraints are frozen in character-spec.md — never put them in the plan.

`motion:` is the ONLY variable text in the clip prompt. ONE figure action maximum.
Camera movement is defined by the `camera:` keyword — never duplicate it in `motion:`.
Never define style in motion.

### Write 01-episode-plan.md

```markdown
# Episode Plan — <slug>
logline: <one sentence what this episode is about>
aspect: 16:9 | 9:16
target: ~Xs
punchline: "<≤10 words>" | none
room-tone: <ambient sound description, e.g. "quiet office hum, distant keyboard clicks">

## Beat 01 — <beat-slug>
scene: <≥15 words: environment, figure position, props, lighting direction, framing>
motion: <ONE figure action; e.g. "stickman opens laptop and stares at blank screen">
duration: 5s | 10s
camera: <Seedance keyword — e.g. "locked-off" | "slow dolly-in">

## Beat 02 — <beat-slug>
...
```

See references/beat-grammar.md for worked examples and anti-patterns.

---

## Step 7 — Validate

Run `scripts/validate-plan.sh <project-dir>`. Up to 3 fix cycles if it fails. After
3 failed cycles, mark phase 1 `blocked` in state.md with the specific error.

---

## Step 8 — Initialize dashboard.html

Read `templates/dashboard.html`. Replace `__DASHBOARD_DATA__` with a JSON object:

```json
{
  "channel": [
    {"file": "artifacts/art-direction.md", "status": "✓ ready", "detail": "pencil-sketch graphite"},
    {"file": "artifacts/character.md", "status": "✓ ready", "detail": "cap, circle head, teardrop body"},
    {"file": "artifacts/character-source.png", "status": "— not yet", "detail": ""},
    {"file": "artifacts/character-threequarter.png", "status": "— not yet", "detail": ""},
    {"file": "artifacts/character-sideprofile.png", "status": "— not yet", "detail": ""}
  ],
  "episode": {
    "slug": "<slug>",
    "phases": [
      {"phase": "Plan beats", "status": "✓ done", "output": "01-episode-plan.md (N beats, Xs)"},
      {"phase": "Generate stills", "status": "— waiting", "output": ""},
      {"phase": "Animate clips", "status": "— waiting", "output": ""},
      {"phase": "Assemble episode", "status": "— waiting", "output": ""}
    ]
  },
  "history": []
}
```

For US-2: character-source.png, character-threequarter.png, and character-sideprofile.png status = "✓ reusing" with model/date detail.
For US-4: episode section is absent; only channel section shown.

Write the completed HTML to `artifacts/dashboard.html`.

---

## Headless operation

Never ask the user for missing inputs. If the topic is absent, mark phase 1 `blocked`
and record the failure reason in state.md. If the topic is vague, concretize it using
references/ideation.md and note the assumption in context.md.
