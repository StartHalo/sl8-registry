---
name: stickman-studio
description: End-to-end stickman episode producer — the main entry point for making a complete stickman video. Runs all four phases in sequence without stopping — plan beats (stickman-episode-design), lock character (stickman-character), generate stills (stickman-art), then animate and assemble (stickman-clip-assembly). Handles US-1 (new episode), US-2 (series continuation with existing character), and US-3 (character reset). For US-4 (character-only commission with no episode), use stickman-character directly. Use this skill when the user gives a topic and wants a finished stickman video in one go.
metadata:
  inputs:
    - name: episode-brief
      type: text
      description: The episode topic; the bot then runs all four phases end to end.
  outputs:
    - name: episode
      type: video
      path: artifacts/<slug>/episode.mp4
      description: The finished stickman episode MP4.
    - name: production-summary
      type: markdown
      path: artifacts/<slug>/05-summary.md
      description: The honest production summary for the episode.
---

# Stickman Studio — Full Episode Producer

Orchestrates all four phases for a complete episode. Each phase is a full skill
invocation — read the referenced SKILL.md and execute it completely before moving on.

**Writes:** all artifacts across phases 1–4 (see per-phase skills for detail)

---

## Before starting

Check for an existing in-progress episode:

1. Look for any `artifacts/<slug>/state.md` with `status: in-progress` or `status: blocked`
2. If found: **this is a RESUME** — read state.md, find the `in-progress` or first `next` row,
   and continue from there rather than starting over
3. If not found: this is a new episode — proceed to Phase 1

---

## Phase 1 — Plan the episode

Read `.claude/skills/stickman-episode-design/SKILL.md` and execute it in full.

This determines the user story (US-1/2/3/4), bootstraps channel files, derives the
project slug, writes context.md + state.md + 01-episode-plan.md, and initialises
dashboard.html.

**After Phase 1:** you have a slug, a beat sheet, and a seeded state.md.

---

## Phase 2 — Lock character and copy to episode folder

Read `.claude/skills/stickman-character/SKILL.md` and execute it in full.

The skill checks for existing `artifacts/character-source.png` and routes automatically:
- **Not present** (US-1): generate source.png → threequarter.png → sideprofile.png → spec.md
- **Present, no reset** (US-2): skip generation — copy existing assets only
- **Present, reset=true** (US-3): archive existing assets, then generate fresh set

**Either way:** the skill always copies all character assets to `artifacts/<slug>/character/`
so the episode folder is self-contained before Phase 3 runs.

Do not proceed to Phase 3 until `<ep>/character/character-spec.md` exists.

---

## Phase 3 — Generate scene stills

Read `.claude/skills/stickman-art/SKILL.md` and execute it in full.

Prerequisite: `<ep>/character/` must be populated (Phase 2 must be complete).

Generates one pencil-sketch scene still per beat. Each still uses `--ref character-source.png`
from `<ep>/character/character-spec.md` for visual consistency. Self-checks every still
for single-stroke limbs, cap, style, and action. Gates the set at ≥80% before proceeding.

**After Phase 3:** stills-log.md is ready with hosted fal.media URLs and camera keywords.

---

## Phase 4 — Animate clips and assemble episode

Read `.claude/skills/stickman-clip-assembly/SKILL.md` and execute it in full.

Routes by total episode duration:
- **≤15s** → tries Seedance reference-to-video (multi-shot)
- **>15s** → per-beat i2v directly (standard path for all typical episodes)

Assembles all clips into `<ep>/episode.mp4` via ffmpeg. Writes 05-summary.md with
honest production log (fallbacks, deviations, model used per beat).

---

## Delivery

After Phase 4 completes, summarise the episode:

```
Episode complete: <slug>
  Deliverable: artifacts/<slug>/episode.mp4
  Duration: Xs | Aspect: 16:9 | Beats: N
  Character: artifacts/<slug>/character/ (self-contained copy)
  Production log: artifacts/<slug>/05-summary.md
  Dashboard: artifacts/dashboard.html
  Fallbacks: <none | list>
```

State.md `status` is set to `complete` by the clip-assembly skill. No further action needed.

---

## Error handling

- If any phase is blocked (gate fail, model error, missing input): stop, update state.md
  with `blocked` status and specific `next_action` for the human to resolve, then surface
  the issue clearly. Do not improvise outside the documented fallback chains.
- On resume: always read state.md first — never re-run a phase already marked `done`.
