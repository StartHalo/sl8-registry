---
name: video-toolkit
description: "Shared library of runtime scripts every SL8 video bot calls — not invoked directly. Holds the ONE copy of: assemble.sh (normalize per-clip videos to a uniform layout, concat in order, mix an optional brown-noise room-tone bed, append a caption card, verify, write episode.mp4); verify.sh (ffprobe a final video and emit one PASS/FLAG JSON verdict by range, summed, or grew duration mode); gen-image.sh (walk a pinned image-model chain to generate one still/keyframe via nano-banana-pro, with per-model arg shaping, the no-resolution-flag quirk, reference-image character lock, and hosted-URL capture); cost.sh (pre-flight ai-gen estimate plus balance snapshot, since per-call credits_used is unreliable); and lint.sh (a plan-lint harness that runs a bot-local rules script and formats a PASS or FAIL verdict). A video bot's make-video dispatcher calls these; the per-recipe generate scripts and lint RULES stay bot-local (one model, one recipe per bot). bash 3.2, no jq."
metadata:
  author: sl8
  version: 1.0.0
  inputs:
    - name: clips
      type: video
      required: false
      description: "For assemble.sh — a directory of per-clip MP4s in sorted (= zero-padded NN) order to normalize and concat into one episode."
    - name: prompt-file
      type: text
      required: false
      description: "For gen-image.sh — a file holding the FULLY assembled image prompt (frozen style/character blocks + scene/view instruction + no-text stack). The toolkit composes nothing; the recipe assembles the prompt."
    - name: plan-and-rules
      type: text
      required: false
      description: "For lint.sh — a recipe plan file (shotlist / keyframe-plan / beat-sheet) plus a bot-local rules script that prints one finding per line."
  outputs:
    - name: episode
      type: video
      path: artifacts/<project>/episode.mp4
      description: "assemble.sh writes the verified, concatenated episode at the project root and prints verify.sh's one-line JSON verdict."
    - name: image
      type: png
      path: artifacts/<project>/<stable-name>
      description: "gen-image.sh writes one still/keyframe at a stable name and prints model TAB local-path TAB hosted-url."
    - name: verdict
      type: text
      description: "verify.sh / assemble.sh / lint.sh each emit ONE machine-readable JSON verdict line on stdout (PASS or FLAG/FAIL) for the recipe to record in state.md and summary.md."
---

# video-toolkit — shared runtime scripts for SL8 video bots

This is the **toolset layer** of the video-bot architecture (see
`docs/features/video-director-fleet/06-video-bot-architecture.md`). Every video bot
(BOT-013 stickman, BOT-027 cinematic, BOT-029 keyframe, BOT-030 continuous, and any
future video bot) installs this skill and calls its scripts from the `make-video`
dispatcher's stages. It exists so the **mechanical, model-agnostic** parts of a video
pipeline — ffmpeg assembly, ffprobe verification, the nano-banana image driver, cost
estimation, the plan-lint harness — live in **one place** and a fix lands once, instead
of being copy-pasted (and drifting) across four bots.

It is a **library skill**: the user never invokes it. It has no opinion about a specific
model, recipe, or seed kit. Those are bot-local (one model + one recipe per bot, by
design — the bot's `make-video` recipe owns `gen-clip.sh` / `gen-cinematic.sh` /
`gen-keyframe-clips.sh` / the extend-chain and the lint **rules**).

## What's in here (and the contract for each)

| script | does | key flags | prints |
|---|---|---|---|
| `scripts/assemble.sh` | normalize → (caption) → concat → room-tone → verify → write `episode.mp4` | `--pad-color`, `--roomtone auto\|always\|never`, `--aspect`, `--res 720\|1080`, `--clips-dir`, `--pattern`, `--caption`, `--verify summed\|range` | verify JSON line |
| `scripts/verify.sh` | ffprobe a final file → one verdict | `--mode range\|summed\|grew`, `--min/--max`, `--summed/--tol`, `--base`, `--require-audio` | verdict JSON line |
| `scripts/gen-image.sh` | walk a pinned image-model chain → one still/keyframe | `--chain`, `--seed`, `--aspect-ratio`, `--ref`, `--max-cost` | `model⇥local⇥url` |
| `scripts/cost.sh` | pre-flight `ai-gen estimate` + `balance` snapshot | `estimate <model> k=v…` / `balance` | cost JSON line |
| `scripts/lint.sh` | run a bot-local rules script over a plan → verdict | `<plan> <rules.sh> [args]` | lint JSON line |

Run any script with no args (or read its header) for the full usage block.

## How a `make-video` dispatcher uses it

The dispatcher resolves the skill's install path (`.claude/skills/video-toolkit/scripts/`)
and calls the scripts from the right stage:

- **plan** stage → `lint.sh <plan> <recipe>/rules.sh` — gate the plan before spending.
- **generate** stage (stills/keyframes) → `gen-image.sh <prompt-file> <out> <name> [--ref …]`.
- **generate** stage (clips) → the **bot-local** recipe script (e.g. `gen-clip.sh`), which
  may call `cost.sh estimate …` first and pass `--max-cost` to gate each paid call.
- **assemble** stage → `assemble.sh <project-dir> [--pad-color …] [--roomtone …] [--verify …]`
  (concat recipes), or `verify.sh <file> --mode grew --base …` directly (zero-concat
  recipes like Veo-extend, which produce one grown take and never concat).

Each script emits ONE JSON verdict line; the recipe records it in `state.md` and the
honesty fields of `summary.md` (`references/summary-template.md`). A FLAG/FAIL verdict is
**deliver-and-disclose**, never a silent withhold.

## What is deliberately NOT here (stays bot-local)

- The **generate recipe** — the per-model call (`gen-clip.sh` Seedance i2v,
  `gen-cinematic.sh` Seedance reference-to-video, `gen-keyframe-clips.sh` Hailuo
  first-last, the Veo extend-chain). One model + one recipe per bot is the design.
- The **lint rules** — what counts as a valid shotlist/keyframe-plan for *this* recipe
  (frozen-token presence, count/duration bands, the no-text stack). `lint.sh` is the
  runner; `rules.sh` is the bot's.
- The **seed kit** and its `seed.manifest.json` — owned by the bot's `update-seed` skill
  (see `07-seed-element-interface.md`).

## Constraints baked in (don't regress)

- **bash 3.2, no `jq`, no GNU `timeout`** — JSON is parsed with `python3`; durations with `awk`.
- **No `--resolution` to nano-banana-pro** — ai-gen rejects it and the chain skips the
  PRIMARY model. `gen-image.sh` accepts the flag for forward-compat but never forwards it.
- **`credits_used` is unreliable** (~8× over-reported) — trust `ai-gen estimate` (pre-flight)
  and `ai-gen balance` deltas only. `cost.sh` wraps exactly those.
- **`ai-gen` `files[]` are objects** — read `files[0].local_path`; hosted URL from `hosted_urls[0]`.
- **Deliver + FLAG**: verifier verdicts never block delivery; they annotate it.

## Provenance

Reconciled from the four bots' drifted copies: `assemble.sh` merges BOT-013's white-pad +
AUTO room-tone + 15–60s range gate with BOT-029's black-pad + always-on bed + summed±2s gate
(every difference is now a flag). `gen-image.sh` merges BOT-027's canonical bible-chain driver
with BOT-013's per-model arg shaping (so a ref-blind diffusion fallback still works). See
`docs/features/video-director-fleet/10-fleet-remediation-plan.md` for the migration that
points each bot at this skill.
