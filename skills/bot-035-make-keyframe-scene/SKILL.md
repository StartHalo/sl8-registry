---
name: bot-035-make-keyframe-scene
description: End-to-end maker for pinned-keyframe scene journeys rendered with Hailuo 02 first-last-frame control — the single author-facing entry point for the keyframe channel. From a before-and-after story brief it runs the whole pipeline as a resumable 7-stage project (init, resolve-seed, plan, generate, assemble, verify, deliver) and produces episode.mp4 plus an honest summary.md. A thin dispatcher — stage bodies in references/stage-N-*.md, loaded on demand. It does project setup (Layer 1) and reads the persistent TOKEN seed kit at artifacts/seed/ (owned by bot-035-update-character), calling that skill only to bootstrap the kit on first run. It calls the shared video-toolkit scripts (gen-image.sh for the K+1 keyframes, assemble.sh for concat + ambient bed) and its own bot-local recipe scripts (gen-keyframe-clips.sh Hailuo first-last morph, still-segment.sh, validate-keyframe-plan.sh, lint-seed-tokens.sh). Use it whenever the user gives a keyframe story brief or asks to make, continue, or resume a keyframe short.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [video-toolkit, bot-035-update-character]
  inputs:
    - name: brief
      type: chat
      required: true
      description: "The story brief — a before-and-after / reveal / transformation / morph (a seed blooming, a logo assembling, a creature hatching). A new short, a continue-the-series ask, a reset-character ask, or a character-only ask. Aspect (16:9 default | 9:16 | 1:1) and scene count (3-6, default 4) optional."
    - name: seed-kit
      type: x-seed-kit
      required: false
      description: "The persistent TOKEN kit at artifacts/seed/ (seed.manifest.json kitType token + style.md + identity.md; NO anchors). Read at resolve-seed; bootstrapped via bot-035-update-character if absent."
  outputs:
    - name: episode
      type: video
      path: artifacts/<slug>/episode.mp4
      description: "The assembled pinned-keyframe journey MP4 — per-scene Hailuo 02 first-last morphs (each morphing one nano-banana-pro keyframe into the next, START and END both pinned), concatenated by the shared assemble.sh with an ADDED ambient room-tone bed (Hailuo is silent)."
    - name: summary
      type: markdown
      path: artifacts/<slug>/summary.md
      description: "The honest delivery record — model/recipe, the token kit, the K+1 keyframe pairs, the ADDED (non-native) ambient bed, cost, verdict, and every fallback taken (from video-toolkit's summary template)."
---

# bot-035-make-keyframe-scene — make a pinned-keyframe short (thin dispatcher)

This is **Layer 3 (the recipe)** for the keyframe scene director — see
`docs/features/video-director-fleet/06-video-bot-architecture.md`. It is the **one
end-to-end author-facing skill**. The persistent look kit (Layer 2) is owned by
`bot-035-update-character`; the model-agnostic mechanics (image driver, ffmpeg assembler,
verifier, cost, lint harness) live in the shared **`video-toolkit`** library and are
**called, never copied**. Only the per-model **recipe** (`gen-keyframe-clips.sh` the Hailuo
first-last morph, `still-segment.sh`) and the **lint rules** (`validate-keyframe-plan.sh`,
`lint-seed-tokens.sh`) are bot-local.

> **One model, one recipe:** this bot binds to **Hailuo 02 first-last-frame**
> (`fal-ai/minimax/hailuo-02/standard/image-to-video`): each scene is PINNED on BOTH ends —
> a START keyframe AND an END keyframe — and Hailuo **morphs start → end**. The keyframes are
> nano-banana-pro stills synthesized per project from the frozen TOKENS. There is no runtime
> model swap.

## The 7-stage contract

| # | stage | reference | reads | writes | toolkit / recipe call |
|---|---|---|---|---|---|
| 1 | init | `references/stage-1-init.md` | chat brief | `context.md`, `state.md`, `dashboard.html` | — |
| 2 | resolve-seed | `references/stage-2-resolve-seed.md` | `context.md`, `artifacts/seed/` | `seed-snapshot/` | `bot-035-update-character` (bootstrap only) |
| 3 | plan | `references/stage-3-plan.md` | `context.md`, seed-snapshot | `keyframe-plan.md` | `scripts/validate-keyframe-plan.sh` (≤3 fix cycles) |
| 4 | generate | `references/stage-4-generate.md` | `keyframe-plan.md`, seed-snapshot | `keyframes/`, `work-scenes/` | `.claude/skills/video-toolkit/scripts/gen-image.sh` (keyframes); `scripts/gen-keyframe-clips.sh` (Hailuo morph); `scripts/still-segment.sh` |
| 5 | assemble | `references/stage-5-assemble.md` | `work-scenes/` | `episode.mp4` | `.claude/skills/video-toolkit/scripts/assemble.sh` (`--roomtone always --pad-color black`) |
| 6 | verify | `references/stage-6-verify.md` | `episode.mp4`, verdict | verdict → `state.md` | (reads assemble.sh JSON; `ffprobe`) |
| 7 | deliver | `references/stage-7-deliver.md` | `episode.mp4`, verdict | `summary.md` | `.claude/skills/video-toolkit/scripts/cost.sh`, summary template |

Every `state.md` stage row names **this same skill** (`bot-035-make-keyframe-scene`). The
runtime loop ("first unfinished row → look up its skill in INDEX.md → run it") therefore
resolves every row to this dispatcher; the **stage** column is the jump target.

---

## Detect / Resume preamble (run this FIRST, every invocation)

1. **Is there an active project?** Look for an `artifacts/<slug>/state.md` whose `status`
   is `in-progress` or `blocked` (SessionStart surfaces it).
   - **Found → RESUME.** Read `state.md`. Find the single `in-progress` row (else the first
     `next`/`blocked` row). Read its `next_action` and every artifact in its `reads` column
     (READ-BEFORE-WRITE). **Jump to that stage's `references/stage-N-*.md` section, run only
     that stage**, then mark it `done`, set the next row `in-progress`, and continue or stop.
   - For the **generate** stage specifically: it is set `in-progress` *before* the paid
     submit; on resume, check whether the expected `keyframes/state-NN.png` (phase A) or
     `work-scenes/scene-NN.mp4` (phase B) already exist and **skip what is already produced**
     (per-state / per-scene granularity — a killed session re-spends at most one in-flight item).
2. **No active project → fresh start.** Run **stage 1 (init)** to classify the brief, derive
   the slug, and write `context.md` + `state.md`, then proceed through the stages in order.

Load only the `references/stage-N-*.md` for the stage you are running (size budget). The deep
recipe dialects are in `references/{keyframe-grammar,hailuo-dialect}.md` — pull them when the
stage body points you there.

---

## Stage map (one line each — the body is the reference file)

- **Stage 1 · init** — classify the brief (new short / continue series / reset character /
  character-only), derive a kebab slug, write `context.md` + a 7-stage `state.md`, init the
  dashboard. Character-only hands off to `bot-035-update-character` (kit-only) and stops.
  → `references/stage-1-init.md`
- **Stage 2 · resolve-seed** — read `artifacts/seed/seed.manifest.json`; bootstrap via
  `bot-035-update-character` if absent; gate `kitType ∈ acceptsKitTypes` (`token`); load the
  frozen tokens / style header / seed; `consumption: text-weave` → the tokens are woven verbatim
  into each keyframe prompt (no `--ref` anchors — token kit); snapshot the kit into
  `seed-snapshot/`. → `references/stage-2-resolve-seed.md`
- **Stage 3 · plan** — write `keyframe-plan.md`: K+1 pinned states (state 0..K) + K
  continuity-chained scenes, the frozen tokens woven **verbatim** into the states; gate with
  `scripts/validate-keyframe-plan.sh` (≤3 fix cycles). → `references/stage-3-plan.md`
- **Stage 4 · generate** — Phase A: synthesize each state's keyframe via the SHARED
  `gen-image.sh` (weave style header + state + frozen tokens; chain `--ref state[i-1]`; capture
  the local png AND the HOSTED url). Phase B: per scene, morph state[i] → state[i+1] with
  `scripts/gen-keyframe-clips.sh` (Hailuo first-last: `--image` start local + `end_image_url`
  end hosted), `still-segment.sh` fallback. → `references/stage-4-generate.md`
- **Stage 5 · assemble** — call the shared `assemble.sh` (black pad, `--roomtone always` since
  Hailuo is SILENT, summed±2s verify, caption off by default). → `references/stage-5-assemble.md`
- **Stage 6 · verify** — read assemble.sh's JSON verdict; on FLAG record it and still deliver;
  `ffprobe` sanity. → `references/stage-6-verify.md`
- **Stage 7 · deliver** — write `summary.md` from the video-toolkit template (disclose the
  ADDED ambient bed as non-native), update the dashboard, set `state.md` `complete`.
  → `references/stage-7-deliver.md`

---

## Honesty & headless rules (apply at every stage)

- **Headless** — never ask the user for a missing input. Concretize a vague brief
  (`references/keyframe-grammar.md`) and note the assumption in `context.md`; if there is
  genuinely no story, route to character-only.
- **Pinned start AND end** — the whole value of this engine is first-last control. Never present
  a scene as free-running; each scene morphs between two keyframes you control.
- **Hailuo is silent** — the ambient bed is ALWAYS added at assembly (`--roomtone always`) and
  is disclosed as an **added bed, NOT native audio** in `summary.md`.
- **Deliver + FLAG** — a FLAG verdict from `assemble.sh` / `verify.sh` never withholds the
  episode; it is disclosed in `summary.md`.
- **Never improvise outside the chain** — every model is pinned in the recipe scripts; on a
  failed scene morph fall back to `still-segment.sh` from the two boundary keyframes and FLAG it.
- **Never leave `state.md` stale** — if a stage advanced, the ledger reflects it before you stop.
- **Cost discipline** — paid stages gate with `--max-cost`; estimate with `.claude/skills/video-toolkit/scripts/cost.sh`;
  trust `ai-gen balance` deltas, never per-call `credits_used`. K+1 keyframes (not 2K) — the END
  keyframe of scene i is the START keyframe of scene i+1.
