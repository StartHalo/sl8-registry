---
name: bot-034-make-cinematic
description: End-to-end maker for short multi-scene cinematic videos with native audio — the single author-facing entry point for the cinematic channel. From a one-line story or fight brief it runs the whole pipeline as a resumable 7-stage project (init, resolve-seed, plan, generate, assemble, verify, deliver) and produces episode.mp4 plus an honest summary.md. A thin dispatcher — stage bodies live in references/stage-N-*.md, loaded on demand. It also does project setup (Layer 1) and reads the persistent character-bible seed kit at artifacts/seed/ (owned by bot-034-update-character-bible), calling that skill only to bootstrap the bible on first run. It calls the shared video-toolkit scripts (verify.sh, assemble.sh, cost.sh) and its own bot-local recipe scripts (gen-cinematic.sh — the ONE Seedance reference-to-video call — per-shot-fallback.sh, validate-shotlist.sh). Use it whenever the user gives a cinematic story or fight brief or asks to make, continue, or resume a cinematic.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [video-toolkit, bot-034-update-character-bible]
  inputs:
    - name: brief
      type: chat
      required: true
      description: "The story or fight brief — a new cinematic premise, a continue-the-channel ask, a reset-bible ask, or a bible-only ask. Optional: style (Pixar-3D / live-action / anime), a reference image, length (4-15s, default 15), aspect (16:9 default | 9:16 | 1:1 | 21:9), and story vs fight profile."
    - name: seed-kit
      type: x-seed-kit
      required: false
      description: "The persistent image-anchor character bible at artifacts/seed/ (seed.manifest.json + style.md + identity.md + anchors/{turnaround,hero}.png). Read at resolve-seed; bootstrapped via bot-034-update-character-bible if absent."
  outputs:
    - name: episode
      type: video
      path: artifacts/<slug>/episode.mp4
      description: "The finished multi-scene cinematic MP4 (4-15s) with a native audio stream — built in ONE Seedance reference-to-video pass over the bible turnaround (@Image1) + hero (@Image2), the same character held across every cut."
    - name: summary
      type: markdown
      path: artifacts/<slug>/summary.md
      description: "The honest delivery record — model/recipe, seed kit, shots, audio, cost (ai-gen estimate, never credits_used), verdict, and any fallback taken (from video-toolkit's summary template)."
---

# bot-034-make-cinematic — make a cinematic (thin dispatcher)

This is **Layer 3 (the recipe)** for the cinematic director — see
`docs/features/video-director-fleet/06-video-bot-architecture.md`. It is the **one
end-to-end author-facing skill**. The persistent character bible (Layer 2) is owned by
`bot-034-update-character-bible`; the model-agnostic mechanics (image driver, ffmpeg
assembler, verifier, cost, lint harness) live in the shared **`video-toolkit`** library and
are **called, never copied**. Only the per-model **recipe** (`gen-cinematic.sh` the single
Seedance reference-to-video call, `per-shot-fallback.sh`) and the **lint rules**
(`validate-shotlist.sh`) are bot-local.

> **One model, one recipe:** this bot binds to **Seedance 2.0 reference-to-video**
> (`bytedance/seedance-2.0/fast/reference-to-video`) — the WHOLE multi-scene cinematic is
> rendered in ONE pass, the character carried across cuts from the bible `--ref` images,
> native score + SFX + ambience generated in the same inference. There is no runtime model
> swap and no per-shot generation on the happy path.

> ⚠️ **Single-call recipes are not resumable mid-render** (an honest limit of one-model /
> one-recipe — doc 06 §Tensions). The single ~15-minute reference-to-video call cannot be
> rejoined if a session dies mid-render; it must re-submit (and re-cost). Cap the blast
> radius with `--max-cost` and pre-estimate with `.claude/skills/video-toolkit/scripts/cost.sh`. The documented
> `per-shot-fallback.sh` route degrades to losing at most one shot.

## The 7-stage contract

| # | stage | reference | reads | writes | toolkit / recipe call |
|---|---|---|---|---|---|
| 1 | init | `references/stage-1-init.md` | chat brief | `context.md`, `state.md`, `dashboard.html` | — |
| 2 | resolve-seed | `references/stage-2-resolve-seed.md` | `context.md`, `artifacts/seed/` | `seed-snapshot/` | `bot-034-update-character-bible` (bootstrap/reset only) |
| 3 | plan | `references/stage-3-plan.md` | `context.md`, seed-snapshot | `shotlist.md` | `scripts/validate-shotlist.sh` (≤3 fix cycles) |
| 4 | generate | `references/stage-4-generate.md` | `shotlist.md`, seed-snapshot | `work/<slug>/raw.mp4` (or `work/<slug>/clips/`) | `scripts/gen-cinematic.sh`; on failure `scripts/per-shot-fallback.sh`; `.claude/skills/video-toolkit/scripts/cost.sh` |
| 5 | assemble | `references/stage-5-assemble.md` | `work/<slug>/raw.mp4` or `clips/` | `episode.mp4` | zero-concat passthrough (single call) **or** `.claude/skills/video-toolkit/scripts/assemble.sh` (fallback) |
| 6 | verify | `references/stage-6-verify.md` | `episode.mp4` | verdict → `state.md` | `.claude/skills/video-toolkit/scripts/verify.sh --mode summed` (or range) |
| 7 | deliver | `references/stage-7-deliver.md` | `episode.mp4`, verdict | `summary.md` | `.claude/skills/video-toolkit/scripts/cost.sh`, summary template |

Every `state.md` stage row names **this same skill** (`bot-034-make-cinematic`). The runtime
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
     submit, with the expected output path in `next_action`. On resume, **if
     `work/<slug>/raw.mp4` (or the fallback episode) already exists, skip re-submit and go to
     assemble**; else re-run `scripts/gen-cinematic.sh`. The single reference-to-video call is
     **not** rejoinable mid-render — a session killed *during* the call re-submits the whole
     call (this is the one-recipe consequence; `--max-cost` caps the re-spend).
2. **No active project → fresh start.** Run **stage 1 (init)** to classify the brief, derive
   the slug, and write `context.md` + `state.md`, then proceed through the stages in order.

Load only the `references/stage-N-*.md` for the stage you are running (size budget). The
deep prompt dialects are in `references/{shot-grammar,seedance-dialect}.md` — pull them when
the stage body points you there.

---

## Stage map (one line each — the body is the reference file)

- **Stage 1 · init** — classify the brief (new cinematic / continue channel / reset bible /
  bible-only), derive a kebab slug, write `context.md` + a 7-stage `state.md`, init the
  dashboard. Bible-only hands off to `bot-034-update-character-bible` (kit-only) and stops.
  → `references/stage-1-init.md`
- **Stage 2 · resolve-seed** — read `artifacts/seed/seed.manifest.json`; bootstrap via
  `bot-034-update-character-bible` if absent; gate `kitType ∈ acceptsKitTypes`; load
  style/identity/seed + the two anchors; `consumption: ref-image` → turnaround = `@Image1`
  (`--ref` 1), hero = `@Image2` (`--ref` 2); snapshot the kit into `seed-snapshot/`.
  → `references/stage-2-resolve-seed.md`
- **Stage 3 · plan** — write a numbered, time-coded `shotlist.md` (a global style header, the
  `@Image1`/`@Image2` identity-lock line, 4–6 `[Xs-Ys]:` shots tiling [0..duration], an
  escalation arc + one slow-mo ramp, a `Total:`/`Audio:` footer), gate with
  `scripts/validate-shotlist.sh` (≤3 fix cycles). → `references/stage-3-plan.md`
- **Stage 4 · generate** — compose the multi-shot render prompt (the shotlist VERBATIM), then
  render the WHOLE cinematic in ONE Seedance reference-to-video call with `scripts/gen-cinematic.sh`
  (turnaround `--ref` 1, hero `--ref` 2; `--max-cost`-gated; pre-estimate with `cost.sh`). On
  failure → `scripts/per-shot-fallback.sh` (per-shot i2v + concat). → `references/stage-4-generate.md`
- **Stage 5 · assemble** — single-call path: the one MP4 is the finished take → **zero-concat
  passthrough** to `episode.mp4` (no concat; native cuts). Fallback path: concat the per-shot
  clips with the shared `.claude/skills/video-toolkit/scripts/assemble.sh` (`--roomtone never`, Seedance carries
  native audio). → `references/stage-5-assemble.md`
- **Stage 6 · verify** — run the shared `.claude/skills/video-toolkit/scripts/verify.sh --mode summed` (or `range`)
  on `episode.mp4`; on FLAG record it and still deliver. → `references/stage-6-verify.md`
- **Stage 7 · deliver** — write `summary.md` from the video-toolkit template, update the
  dashboard, set `state.md` `complete`. → `references/stage-7-deliver.md`

---

## Honesty & headless rules (apply at every stage)

- **Headless** — never ask the user for a missing input. Concretize a vague brief (defaults in
  `references/shot-grammar.md`) and note the assumption in `context.md`; if there is genuinely
  no story, route to bible-only.
- **Deliver + FLAG** — a FLAG verdict from `validate-shotlist.sh` / `verify.sh` never withholds
  the cinematic; it is disclosed in `summary.md`.
- **Stylized characters/creatures only** — no real, identifiable people, brands, or copyrighted
  characters (also respects Seedance's face policy). Swap in a stylized stand-in and note it.
- **Never improvise outside the chain** — the model is pinned in `gen-cinematic.sh`; on a
  single-call failure fall back to `per-shot-fallback.sh` and disclose the route. A wholesale
  engine swap is STOP-and-ask.
- **Never paraphrase a locked token** — the bible's frozen STYLE_STACK / CHARACTER_BLOCK and
  trait tokens are pasted byte-identical into the shotlist and the render prompt; paraphrase is
  the #1 cross-shot drift vector.
- **Never leave `state.md` stale** — if a stage advanced, the ledger reflects it before you stop.
- **Cost discipline** — the single render gates with `--max-cost`; estimate with
  `.claude/skills/video-toolkit/scripts/cost.sh`; trust `ai-gen estimate` + `ai-gen balance` deltas, never per-call
  `credits_used` (it over-reports ~8×).
