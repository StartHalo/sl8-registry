---
name: bot-033-make-stickman
description: End-to-end maker for hand-drawn stickman skit episodes — the single author-facing entry point for the stickman channel. From a one-line topic it runs the whole pipeline as a resumable 7-stage project (init, resolve-seed, plan, generate, assemble, verify, deliver) and produces episode.mp4 plus an honest summary.md. It is a thin dispatcher — each stage body lives in references/stage-N-*.md and is loaded on demand. It also does project setup (Layer 1) and reads the persistent seed kit at artifacts/seed/ (owned by bot-033-update-character), calling that skill's generate routine only to bootstrap the kit on first run. It calls the shared video-toolkit scripts (gen-image.sh, assemble.sh) for the model-agnostic work and its own bot-local recipe scripts (gen-clip.sh Seedance image-to-video, validate-plan.sh, check-set.sh, still-segment.sh) for the model-specific work. Use it whenever the user gives a stickman episode topic or asks to make, continue, or resume an episode.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [video-toolkit, bot-033-update-character]
  inputs:
    - name: brief
      type: chat
      required: true
      description: "The episode topic or request — a new episode topic, a continue-the-series ask, a reset-character ask, or a character-only ask. Aspect (16:9 default | 9:16) and target length (15-60s, default ~30s) optional."
    - name: seed-kit
      type: x-seed-kit
      required: false
      description: "The persistent image-anchor kit at artifacts/seed/ (seed.manifest.json + style.md + identity.md + anchors/). Read at resolve-seed; bootstrapped via bot-033-update-character if absent."
  outputs:
    - name: episode
      type: video
      path: artifacts/<slug>/episode.mp4
      description: "The assembled multi-beat stickman episode MP4 (15-60s), built by the shared assemble.sh from per-beat Seedance clips with native ambient audio."
    - name: summary
      type: markdown
      path: artifacts/<slug>/summary.md
      description: "The honest delivery record — model/recipe, seed kit, beats, audio, cost, verdict, and every fallback taken (from video-toolkit's summary template)."
---

# bot-033-make-stickman — make a stickman episode (thin dispatcher)

This is **Layer 3 (the recipe)** for the stickman animator — see
`docs/features/video-director-fleet/06-video-bot-architecture.md`. It is the **one
end-to-end author-facing skill**. The persistent look kit (Layer 2) is owned by
`bot-033-update-character`; the model-agnostic mechanics (image driver, ffmpeg assembler,
verifier, cost, lint harness) live in the shared **`video-toolkit`** library and are
**called, never copied**. Only the per-model **recipe** (`gen-clip.sh` Seedance i2v,
`still-segment.sh`) and the **lint rules** (`validate-plan.sh`, `check-set.sh`) are
bot-local.

> **One model, one recipe:** this bot binds to **Seedance per-beat image-to-video**
> (`bytedance/seedance-2.0/fast/image-to-video`) over nano-banana-pro pencil stills,
> concatenated by ffmpeg. There is no runtime model swap.

## The 7-stage contract

| # | stage | reference | reads | writes | toolkit / recipe call |
|---|---|---|---|---|---|
| 1 | init | `references/stage-1-init.md` | chat brief | `context.md`, `state.md`, `dashboard.html` | — |
| 2 | resolve-seed | `references/stage-2-resolve-seed.md` | `context.md`, `artifacts/seed/` | `seed-snapshot/` | `bot-033-update-character` (bootstrap only) |
| 3 | plan | `references/stage-3-plan.md` | `context.md`, seed-snapshot | `01-episode-plan.md` | `scripts/validate-plan.sh` (≤3 fix cycles) |
| 4 | generate | `references/stage-4-generate.md` | `01-episode-plan.md`, seed-snapshot | `03-stills/`, `04-clips/` | `.claude/skills/video-toolkit/scripts/gen-image.sh`; `scripts/gen-clip.sh`; `scripts/check-set.sh`; `scripts/still-segment.sh` |
| 5 | assemble | `references/stage-5-assemble.md` | `04-clips/` | `episode.mp4` | `.claude/skills/video-toolkit/scripts/assemble.sh` |
| 6 | verify | `references/stage-6-verify.md` | `episode.mp4`, verdict | verdict → `state.md` | (reads assemble.sh JSON; `ffprobe`) |
| 7 | deliver | `references/stage-7-deliver.md` | `episode.mp4`, verdict | `summary.md` | `.claude/skills/video-toolkit/scripts/cost.sh`, summary template |

Every `state.md` stage row names **this same skill** (`bot-033-make-stickman`). The runtime
loop ("first unfinished row → look up its skill in INDEX.md → run it") therefore resolves
every row to this dispatcher; the **stage** column is the jump target.

---

## Detect / Resume preamble (run this FIRST, every invocation)

1. **Is there an active project?** Look for an `artifacts/<slug>/state.md` whose `status`
   is `in-progress` or `blocked` (SessionStart surfaces it). 
   - **Found → RESUME.** Read `state.md`. Find the single `in-progress` row (else the first
     `next`/`blocked` row). Read its `next_action` and every artifact in its `reads` column
     (READ-BEFORE-WRITE). **Jump to that stage's `references/stage-N-*.md` section, run only
     that stage**, then mark it `done`, set the next row `in-progress`, and continue or stop.
   - For the **generate** stage specifically: it is set `in-progress` *before* the paid
     submit; on resume, check whether the expected `03-stills/NN-*.png` / `04-clips/NN-*.mp4`
     already exist and **skip what is already produced** (per-beat granularity — a killed
     session loses at most one in-flight beat).
2. **No active project → fresh start.** Run **stage 1 (init)** to classify the brief, derive
   the slug, and write `context.md` + `state.md`, then proceed through the stages in order.

Load only the `references/stage-N-*.md` for the stage you are running (size budget). The
deep prompt dialects are in `references/{beat-grammar,ideation,still-dialects,self-check,
seedance-dialect,clip-dialects,pdf-patterns}.md` — pull them when the stage body points you there.

---

## Stage map (one line each — the body is the reference file)

- **Stage 1 · init** — classify the brief (new episode / continue series / reset character /
  character-only), derive a kebab slug, write `context.md` + a 7-stage `state.md`, init the
  dashboard. Character-only hands off to `bot-033-update-character` (kit-only) and stops.
  → `references/stage-1-init.md`
- **Stage 2 · resolve-seed** — read `artifacts/seed/seed.manifest.json`; bootstrap via
  `bot-033-update-character` if absent; gate `kitType ∈ acceptsKitTypes`; load style/identity/
  seed; `consumption: ref-image` → the source anchor is the `--ref`; snapshot the kit into
  `seed-snapshot/`. → `references/stage-2-resolve-seed.md`
- **Stage 3 · plan** — plan 3–8 beats (5s|10s each, 15–60s total; scene/motion/duration/
  camera), gate with `scripts/validate-plan.sh` (≤3 fix cycles). → `references/stage-3-plan.md`
- **Stage 4 · generate** — per beat: compose the 5-block still prompt from the frozen seed
  blocks + the beat scene, generate via the shared `gen-image.sh` driver (`--ref` the hosted
  source anchor), self-check, log, gate with `scripts/check-set.sh` (≥80%); then animate each
  beat with `scripts/gen-clip.sh` (Seedance i2v), `still-segment.sh` fallback.
  → `references/stage-4-generate.md`
- **Stage 5 · assemble** — call the shared `assemble.sh` (white pad, 1080, roomtone auto →
  OFF since Seedance carries native audio, range-verify 15–60s, caption = punchline).
  → `references/stage-5-assemble.md`
- **Stage 6 · verify** — read assemble.sh's JSON verdict; on FLAG record it and still deliver;
  `ffprobe` sanity. → `references/stage-6-verify.md`
- **Stage 7 · deliver** — write `summary.md` from the video-toolkit template, update the
  dashboard, set `state.md` `complete`. → `references/stage-7-deliver.md`

---

## Honesty & headless rules (apply at every stage)

- **Headless** — never ask the user for a missing input. Concretize a vague topic
  (`references/ideation.md`) and note the assumption in `context.md`; if there is genuinely
  no topic, route to character-only.
- **Deliver + FLAG** — a FLAG verdict from `check-set.sh` / `assemble.sh` / `verify.sh` never
  withholds the episode; it is disclosed in `summary.md`.
- **Never improvise outside the chain** — every model is pinned in the recipe scripts; on
  total failure fall back to `still-segment.sh` and FLAG the beat.
- **Never leave `state.md` stale** — if a stage advanced, the ledger reflects it before you stop.
- **Cost discipline** — paid stages gate with `--max-cost`; estimate with `.claude/skills/video-toolkit/scripts/cost.sh`;
  trust `ai-gen balance` deltas, never per-call `credits_used`.
