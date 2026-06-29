---
name: bot-036-make-continuous-shot
description: "End-to-end maker for ONE continuous shot (over 15s, no cuts) rendered with the Veo 3.1 extend chain — the single author-facing entry point for the continuous-shot channel. From a one-line journey or sustained-moment brief it runs the whole pipeline as a resumable 7-stage project (init, resolve-seed, plan, generate, assemble, verify, deliver) producing episode.mp4 plus an honest summary.md. A thin dispatcher — each stage body lives in references/stage-N-*.md, loaded on demand. It does project setup and reads the persistent token seed kit at artifacts/seed/ (owned by bot-036-update-character, called only to bootstrap on first run). It calls the shared video-toolkit scripts (gen-image.sh for the one base still, verify.sh for the grew-past-base gate) and its own bot-local recipe (gen-extend.sh Veo base plus extend chain, validate-plan.sh). There is NO concat — extend-video returns the FULL grown video each hop. Use it whenever the user gives a continuous-shot brief or asks to make, continue, or resume one."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [video-toolkit, bot-036-update-character]
  inputs:
    - name: brief
      type: chat
      required: true
      description: "The continuous-shot brief — a new journey/sustained-moment topic, a continue-the-channel ask, a reset-character ask, or a character-only ask. Aspect (16:9 default | 9:16) and hop-count (2-3, default 2 → base 8s + 2×7s ≈ 22s) optional."
    - name: seed-kit
      type: x-seed-kit
      required: false
      description: "The persistent TOKEN kit at artifacts/seed/ (seed.manifest.json + style.md + identity.md; kitType token, consumption text-repeat, anchors []). Read at resolve-seed; bootstrapped via bot-036-update-character if absent. No PNGs by design — the base frame is regenerated per project from the frozen tokens."
  outputs:
    - name: episode
      type: video
      path: artifacts/<slug>/episode.mp4
      description: "The finished continuous shot — ONE Veo 3.1 image-to-video base extended by N extend-video hops, each hop returning the FULL grown video (NO concat), native audio throughout. The final extend's file IS the episode; verified with the shared verify.sh --mode grew (duration grew past the base)."
    - name: summary
      type: markdown
      path: artifacts/<slug>/summary.md
      description: "The honest delivery record — model/recipe, token seed kit, base + each extend hop, final duration, native-audio note, NO-concat note, cost, verdict, and every shortfall taken (from video-toolkit's summary template)."
---

# bot-036-make-continuous-shot — make a continuous shot (thin dispatcher)

This is **Layer 3 (the recipe)** for the continuous-shot director — see
`docs/features/video-director-fleet/06-video-bot-architecture.md`. It is the **one
end-to-end author-facing skill**. The persistent look kit (Layer 2) is owned by
`bot-036-update-character`; the model-agnostic mechanics (image driver, verifier, cost,
lint harness) live in the shared **`video-toolkit`** library and are **called, never
copied**. Only the per-model **recipe** (`gen-extend.sh` Veo i2v base + extend chain) and
the **lint rules** (`validate-plan.sh`) are bot-local.

> **One model, one recipe:** this bot binds to **Veo 3.1 image-to-video base + extend
> chain** (`fal-ai/veo3.1/image-to-video` then `fal-ai/veo3.1/extend-video`) over ONE
> nano-banana-pro base still. **There is NO concat** — `extend-video` returns the FULL
> grown video each hop, so the final hop's file IS the episode. There is no runtime model swap.

> **Token kit, text-repeat:** identity is pinned by **5–7 frozen text tokens only** (no
> PNG anchors). The recipe repeats those tokens ≥80% verbatim into the base prompt AND
> every extend hop (`consumption: text-repeat`) — the language-level lock that holds the
> subject across each seam.

## The 7-stage contract

| # | stage | reference | reads | writes | toolkit / recipe call |
|---|---|---|---|---|---|
| 1 | init | `references/stage-1-init.md` | chat brief | `context.md`, `state.md`, `dashboard.html` | — |
| 2 | resolve-seed | `references/stage-2-resolve-seed.md` | `context.md`, `artifacts/seed/` | `seed-snapshot/` | `bot-036-update-character` (bootstrap only) |
| 3 | plan | `references/stage-3-plan.md` | `context.md`, seed-snapshot | `continuous-plan.md` | `scripts/validate-plan.sh` (≤3 fix cycles) |
| 4 | generate | `references/stage-4-generate.md` | `continuous-plan.md`, seed-snapshot | `base-frame.png`, `episode.mp4` | `.claude/skills/video-toolkit/scripts/gen-image.sh` (base still); `scripts/gen-extend.sh` (Veo base i2v + extend chain) |
| 5 | assemble | `references/stage-5-assemble.md` | `episode.mp4` (already grown) | — (zero-concat passthrough) | NONE — extend returned the whole video; nothing to concat |
| 6 | verify | `references/stage-6-verify.md` | `episode.mp4`, base duration | verdict → `state.md` | `.claude/skills/video-toolkit/scripts/verify.sh --mode grew --base <base-dur>` |
| 7 | deliver | `references/stage-7-deliver.md` | `episode.mp4`, verdict | `summary.md` | `.claude/skills/video-toolkit/scripts/cost.sh`, summary template |

Every `state.md` stage row names **this same skill** (`bot-036-make-continuous-shot`). The
runtime loop ("first unfinished row → look up its skill in INDEX.md → run it") therefore
resolves every row to this dispatcher; the **stage** column is the jump target.

> **Why stage 5 is a passthrough:** the contract stage is `assemble`, but this recipe is
> **zero-concat** — `gen-extend.sh` already produced the single grown `episode.mp4` at
> stage 4. So stage 5 does NOT call `assemble.sh`; it records "no concat (extend returns
> the whole video)" and hands the grew-gate to stage 6's shared `verify.sh --mode grew`.

---

## Detect / Resume preamble (run this FIRST, every invocation)

1. **Is there an active project?** Look for an `artifacts/<slug>/state.md` whose `status`
   is `in-progress` or `blocked` (SessionStart surfaces it).
   - **Found → RESUME.** Read `state.md`. Find the single `in-progress` row (else the first
     `next`/`blocked` row). Read its `next_action` and every artifact in its `reads` column
     (READ-BEFORE-WRITE). **Jump to that stage's `references/stage-N-*.md` section, run only
     that stage**, then mark it `done`, set the next row `in-progress`, and continue or stop.
   - For the **generate** stage specifically: it is set `in-progress` *before* the paid
     submit, with the expected output path in `next_action`. On resume, check whether
     `episode.mp4` already exists (or `work/base.mp4` / `work/full-after-hop-NN.mp4`) and
     **skip what is already produced** — `gen-extend.sh` re-runs from the base when no clip
     exists, and a killed session loses at most the in-flight hop. Single-call mid-render is
     not rejoinable (see Honesty rules); `--max-cost` caps the blast radius.
2. **No active project → fresh start.** Run **stage 1 (init)** to classify the brief, derive
   the slug, and write `context.md` + `state.md`, then proceed through the stages in order.

Load only the `references/stage-N-*.md` for the stage you are running (size budget). The
deep prompt dialects are in `references/{continuous-grammar,veo-extend-dialect}.md` — pull
them when the stage body points you there (they are baked **inline** because the runtime
sandbox has no KB access).

---

## Stage map (one line each — the body is the reference file)

- **Stage 1 · init** — classify the brief (new shot / continue channel / reset character /
  character-only), derive a kebab slug, write `context.md` + a 7-stage `state.md`, init the
  dashboard. Character-only hands off to `bot-036-update-character` (kit-only) and stops.
  → `references/stage-1-init.md`
- **Stage 2 · resolve-seed** — read `artifacts/seed/seed.manifest.json`; bootstrap via
  `bot-036-update-character` if absent; gate `kitType ∈ acceptsKitTypes` (`token`); load
  style/identity tokens/seed; `consumption: text-repeat` → the frozen tokens are repeated
  into the base + every hop; snapshot the kit into `seed-snapshot/`. **No anchors, no paid
  regen.** → `references/stage-2-resolve-seed.md`
- **Stage 3 · plan** — write the continuous-plan (look header, the seed's 5–7 frozen
  CHARACTER tokens verbatim, one Base block = opening-frame image + 8s base motion + native
  audio, 2–3 Hop continuation prompts each repeating the subject ≥80% verbatim, the
  Total/Audio/constraint footer), gate with `scripts/validate-plan.sh` (≤3 fix cycles).
  → `references/stage-3-plan.md`
- **Stage 4 · generate** — compose the base-frame prompt from the look header + Base scene +
  the frozen tokens, generate the ONE base still via the shared `gen-image.sh`, then run
  `scripts/gen-extend.sh` (Veo base i2v on that still → extend hops, each returning the FULL
  grown video → `episode.mp4`). → `references/stage-4-generate.md`
- **Stage 5 · assemble** — **zero-concat passthrough**: confirm `episode.mp4` exists (the
  extend chain produced it whole), record "no concat — extend returns the whole video", do
  NOT call `assemble.sh`. → `references/stage-5-assemble.md`
- **Stage 6 · verify** — run the shared `verify.sh --mode grew --base <base-dur> --route
  veo-extend`; the proof is the grown take is longer than the base. On FLAG record it and
  still deliver. → `references/stage-6-verify.md`
- **Stage 7 · deliver** — write `summary.md` from the video-toolkit template, update the
  dashboard, set `state.md` `complete`. → `references/stage-7-deliver.md`

---

## Honesty & headless rules (apply at every stage)

- **Headless** — never ask the user for a missing input. Concretize a vague brief into ONE
  concrete continuous journey/moment and note the assumption in `context.md`; if there is
  genuinely no subject, route to character-only.
- **Deliver + FLAG** — a FLAG verdict from `verify.sh` (or a `gen-extend.sh` shortfall) never
  withholds the episode; it is disclosed in `summary.md`.
- **Never improvise outside the chain** — every model is pinned in the recipe script; on
  total base failure there is no episode (a clean recorded failure, never a fabricated MP4);
  a failed hop keeps the last good extended video and FLAGs the shortfall.
- **No concat, ever** — `extend-video` returns the whole grown video; never run `ffmpeg`
  concat or `assemble.sh`. If you find yourself reaching for concat, you have misread the recipe.
- **Single-pass not mid-render-resumable** — a Veo base/extend call (~15 min headless) cannot
  be rejoined if a session dies mid-call; it re-submits (re-cost). Cap with `--max-cost`;
  per-hop granularity means a killed session loses at most one hop.
- **Never leave `state.md` stale** — if a stage advanced, the ledger reflects it before you stop.
- **Cost discipline** — paid stages gate with `--max-cost`; estimate with `.claude/skills/video-toolkit/scripts/cost.sh`;
  trust `ai-gen balance` deltas, never per-call `credits_used` (~8× over-reported on Veo-class i2v).
