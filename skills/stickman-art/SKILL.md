---
name: stickman-art
description: Generates per-episode scene stills for the stickman animator (Phase 3 only). Reads the episode beat plan and the episode's own local character folder — which is populated by stickman-character before this skill runs. Produces one 16:9 pencil-sketch scene still per beat using --ref character-source.png for visual consistency, logs results to stills-log.md, and gates the set at 80 percent or above. Phase 2 (character lock) is now handled exclusively by stickman-character. Use this skill for stickman scene still generation.
metadata:
  inputs:
    - name: episode-plan
      type: markdown
      description: The beat sheet (01-episode-plan.md) to illustrate, one still per beat.
    - name: character-spec
      type: markdown
      description: Frozen character spec from the episode's character folder, with the --ref anchor URL.
  outputs:
    - name: scene-stills
      type: image
      description: One pencil-sketch scene still per beat, character-consistent via --ref.
    - name: stills-log
      type: markdown
      path: artifacts/<slug>/03-stills/stills-log.md
      description: Per-still status, hosted URL, camera keyword, seed, and self-check results.
---

# Phase 3 — Generate Stills (stickman-art)

**Reads:** `<ep>/01-episode-plan.md`, `<ep>/character/character-spec.md`

**Writes:** `<ep>/03-stills/`, `<ep>/03-stills/stills-log.md`, `artifacts/dashboard.html`

> **Prerequisite:** `<ep>/character/` must exist and contain character-spec.md and
> character-source.png. This folder is populated by stickman-character (Phase 2) before
> Phase 3 runs. If it's missing, stop and surface the issue.

---

## Step 3.1 — Read inputs

- `<ep>/01-episode-plan.md` — beat list (required)
- `<ep>/character/character-spec.md` — frozen blocks + seed + ref anchor (required)

Extract from spec: STYLE, CHARACTER, DISCIPLINE, CONSTRAINTS, SEED, hosted URL for `--ref`.

The blocks from spec are used verbatim in every prompt. Do not re-derive them.

---

## Step 3.2 — Per beat: compose base concept

For each beat in plan order, write a ≥100-word base concept covering:
1. Subject — who, what, where
2. Composition — framing, spatial layout (use the `camera:` keyword from the beat plan)
3. Style — pencil-sketch on white (from STYLE block)
4. Mood — emotional tone derived from the beat arc position
5. Props/environment — specifics from the scene field
6. Action — what the figure is doing and what that communicates

This ensures the final prompt has enough design intent to push against generic output.

---

## Step 3.3 — Compose 5-block still prompt

```
[1-STYLE]: <STYLE verbatim from spec>
[2-CHARACTER]: <CHARACTER verbatim from spec>
[3-SCENE]: <scene: field from plan — the only variable text>
[4-DISCIPLINE]: <DISCIPLINE verbatim from spec>
[5-CONSTRAINTS]: <CONSTRAINTS verbatim from spec>
```

For text-bearing beats (if plan flags a label): replace [5-CONSTRAINTS] with:
"Monochrome graphite on white paper only. Single figure. One short word on one object permitted."

---

## Step 3.4 — Generate the still

```bash
ai-gen image -m fal-ai/nano-banana-pro \
  --ref <hosted character-source.png URL from <ep>/character/character-spec.md> \
  --aspect-ratio 16:9 \
  --seed <seed from spec> \
  --output <ep>/03-stills/ \
  --format json \
  --max-cost 80 \
  "<5-block prompt>"
```

Aspect ratio: `--aspect-ratio 16:9` for landscape; `--aspect-ratio 9:16` for portrait.

Model chain (walk in order, never skip):
1. `fal-ai/nano-banana-pro` (primary — ref-capable)
2. `fal-ai/flux-dev` (fallback — ref-blind, drop `--ref`)
3. `fal-ai/stable-diffusion-v35-large` (last resort — ref-blind)

---

## Step 3.5 — Self-check

After each generation:
- Exactly one stick figure? (fail → retry)
- Cap present and unmutated? (fail → retry)
- Monochrome pencil sketch on white? (fail → retry)
- One readable action matching the scene? (fail → retry)
- Single-stroke arms and legs — no rounded limbs? (fail → retry)

One retry budget per still. If still failing after retry: keep best attempt, mark FAIL,
note reason. Never drop a beat silently.

---

## Step 3.6 — Log to stills-log.md

After each still (pass or fail), append to `<ep>/03-stills/stills-log.md`:

```markdown
## Beat NN — <beat-slug>
status: PASS | FAIL
model: <model used>
local: 03-stills/NN-<beat-slug>.png
url: <fal.media hosted URL>  ← this is the i2v contract for phase 4
camera-keyword: <from beat plan — e.g. "slow dolly-in">
seed: <seed used>
self-check:
  figure: PASS | FAIL
  cap: PASS | FAIL
  style: PASS | FAIL
  action: PASS | FAIL
  limbs: PASS | FAIL
notes: <any deviations or failure reason>
```

The hosted URL is non-negotiable — phase 4 needs it for i2v input.
The camera-keyword is logged here so phase 4 can pull it for the animation prompt.

---

## Step 3.7 — Update dashboard.html

After each beat: update the "Generate stills" row in the episode table:
`⟳ running — N / total` then `✓ done (N kept, M failed)` when complete.

---

## Step 3.8 — Gate the still set

Run `scripts/check-set.sh <project-dir>`.
Gate: ≥80% of planned beats kept with valid fal.media URLs.
If gate fails: mark phase 3 `blocked`, record in state.md which beats failed.

---

## Step 3.9 — Update state.md

Mark phase 3 `done`. Set phase 4 `in-progress`. Update `next_action`:
"Run stickman-clip-assembly — animate clips and assemble episode (phase 4)."
