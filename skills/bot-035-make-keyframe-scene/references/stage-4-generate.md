# Stage 4 — generate (keyframes, then scene morphs)

Absorbs the BOT-029 `bot-029-keyframe-clips` engine, split along the new-architecture seam:
**(A) the K+1 keyframes are stills → the SHARED `.claude/skills/video-toolkit/scripts/gen-image.sh`**; **(B) each scene
is a Hailuo first-last morph → the BOT-LOCAL `scripts/gen-keyframe-clips.sh`**. Read
`references/hailuo-dialect.md` before composing anything — it carries the keyframe-chain identity
lock, the `--image` start / `end_image_url` hosted-end mapping, the silent-clips rule, the 6s/10s
duration + 512P/768P resolution, and the still-segment fallback, all baked inline.

**Reads:** `artifacts/<slug>/keyframe-plan.md`, `artifacts/<slug>/seed-snapshot/`.
**Writes:** `artifacts/<slug>/keyframes/` (+ `keyframes-log.md`), `artifacts/<slug>/work-scenes/`.

> **Resumability:** this stage is set `in-progress` *before* the first paid submit. On resume,
> skip any state whose `keyframes/state-NN.png` (phase A) or any scene whose
> `work-scenes/scene-NN.mp4` (phase B) already exists — per-state / per-scene granularity, so a
> killed session re-spends at most one item.

---

## Phase A — synthesize the K+1 keyframes (SHARED gen-image.sh)

The keyframes ARE the pinned states. For each state 0..K, generate one nano-banana-pro still via
the **shared** image driver — **do not** author or copy a local `gen-image.sh`. Two-fold identity
lock: the **frozen tokens woven into the prompt** + **`--ref state[i-1]`** so the SAME character
carries forward.

### A.1 — Load the seed elements from the snapshot

From `seed-snapshot/seed.manifest.json` read verbatim (do **not** re-derive): `identity.tokens`
(the 5–7 frozen tokens), `identity.blocks.STYLE_HEADER`, and the `seed`. The aspect comes from the
plan footer / `context.md` (`16:9` default).

### A.2 — Per state: compose the keyframe prompt (text-weave)

For each `State N:` in the plan, write the fully-assembled prompt to a file. The look header +
frozen tokens are pasted verbatim; the **state description is the variable text**:

```
<STYLE_HEADER verbatim>. A single still keyframe: <State N description from the plan>.
The subject is <the frozen CHARACTER tokens, comma-joined verbatim>, the SAME character throughout
this sequence, large in frame, clearly lit (avoid very dark lighting). No text, no watermark, no logo.
```

### A.3 — Generate via the SHARED image driver (capture local AND hosted URL)

Call the `video-toolkit` driver. **NO `--resolution`** (nano-banana-pro rejects it and the chain
skips the primary — `gen-image.sh` accepts the flag for forward-compat but never forwards it).
For state 0 there is no `--ref`; for every state `i > 0`, pass the PREVIOUS state's **local png**
as `--ref` so the character carries:

```bash
mkdir -p artifacts/<slug>/keyframes work
# (compose work/state-NN.txt as in A.2)
# state 0 — no --ref (establishes the character):
.claude/skills/video-toolkit/scripts/gen-image.sh \
  work/state-00.txt artifacts/<slug>/keyframes state-00.png \
  --chain "fal-ai/nano-banana-pro,openai/gpt-image-2,fal-ai/nano-banana-2" \
  --aspect-ratio 16:9 \
  --seed <seed> \
  --max-cost 80
# state i>0 — chain --ref the PREVIOUS state's local png:
.claude/skills/video-toolkit/scripts/gen-image.sh \
  work/state-NN.txt artifacts/<slug>/keyframes state-NN.png \
  --chain "fal-ai/nano-banana-pro,openai/gpt-image-2,fal-ai/nano-banana-2" \
  --aspect-ratio 16:9 \
  --seed <seed> \
  --ref artifacts/<slug>/keyframes/state-PP.png \
  --max-cost 80
```

- `NN` is the zero-padded state index (`00`, `01`, …); `PP = NN-1`. Use `--aspect-ratio 9:16` or
  `1:1` to match the plan.
- The chain walks nano-banana-pro → gpt-image-2 → nano-banana-2 (all reference- AND
  aspect-capable, so the identity lock survives a fallback). `gen-image.sh` prints
  `model<TAB>local-path<TAB>hosted-url` — **capture BOTH**: the local path is the START upload for
  Hailuo; the **hosted url is the END-frame contract** for Hailuo. A state with a file but no
  hosted url can be a scene's START but **cannot be an END frame**.

### A.4 — Log to `keyframes-log.md` (the contract for phase B)

Append one block per state to `artifacts/<slug>/keyframes/keyframes-log.md`. The `- local:` /
`- url:` lines are load-bearing — phase B reads them to pin each scene:

```markdown
## State NN
- status: kept | failed
- model: <model used>
- local: keyframes/state-NN.png        ← the START upload for the scene that begins here
- url: <fal.media hosted URL>          ← the END-frame contract for the scene that ENDS here
- self-check: tokens=PASS silhouette=PASS lit=PASS
- notes: <deviations / failure reason, or "none">
```

A state whose whole image chain failed gets `- status: failed` with empty local/url (its adjacent
scenes will fall back to a still segment).

### A.5 — Advance the dashboard

Update the "Generate keyframes" row: `⟳ running — N/(K+1)` → `✓ done (K+1 keyframes, M with URLs)`.

---

## Phase B — morph each scene (BOT-LOCAL gen-keyframe-clips.sh — Hailuo first-last)

For each scene `i` (0..K-1) in order, run ONE Hailuo first-last morph with the **bot-local**
recipe script (the one model, one recipe for this bot — `references/hailuo-dialect.md` carries the
dialect). Output to `work-scenes/scene-NN.mp4`.

### B.1 — Compose the motion prompt to a file

```
<the plan's Scene i motion/transition line — one transformation + one optional camera move>.
The subject stays the SAME character, large in frame, stable picture, no flicker, no identity drift.
```

The two pinned keyframes already fix the look — the motion prompt only steers the interpolation.

### B.2 — Call the recipe (Hailuo first-last morph)

`--image` = the START keyframe's **local png** (`state[i]`); `end_image_url` = the END keyframe's
**HOSTED url** (`state[i+1]`, from `keyframes-log.md`):

```bash
mkdir -p artifacts/<slug>/work-scenes
RESOLUTION=768P HAILUO_MAX_COST=200 \
  scripts/gen-keyframe-clips.sh \
    work/scene-NN.txt \
    artifacts/<slug>/keyframes/state-NN.png \
    "<state[i+1] HOSTED fal.media url from keyframes-log>" \
    <duration 6|10> \
    artifacts/<slug>/work-scenes/scene-NN.mp4
```

- `gen-keyframe-clips.sh` runs `fal-ai/minimax/hailuo-02/standard/image-to-video`, is queue-aware
  (15-min timeout, one retry on timeout, one retry without the `duration=` pass-through), and
  prints `model<TAB>out-path`. Hailuo clips are **SILENT** — the ambient bed is added at assembly.
- Default scene duration is **6s** (Hailuo takes 6s or 10s reliably). `RESOLUTION=512P` trims cost.
- Estimate first with `.claude/skills/video-toolkit/scripts/cost.sh estimate fal-ai/minimax/hailuo-02/standard/image-to-video duration=<d> resolution=768P` if asked.

### B.3 — Fallback: still-segment from the two boundary keyframes

If a scene's Hailuo morph fails (`gen-keyframe-clips.sh` exits non-zero), or its START local /
END url is missing, build a "morph stand-in" from the two boundary keyframes so the journey stays
K scenes long, and **FLAG it** for the summary:

```bash
ASPECT=16:9 scripts/still-segment.sh \
  artifacts/<slug>/keyframes/state-NN.png \
  artifacts/<slug>/keyframes/state-MM.png \
  <duration> \
  artifacts/<slug>/work-scenes/scene-NN.mp4
```

`MM = NN+1`. It cross-fades the two stills (or holds the single available one) and outputs the same
24fps/black-pad/H.264/silent layout `assemble.sh` normalizes to, so concat never special-cases it.
If a scene has no keyframe at either boundary, it is dropped (recorded). If EVERY scene fails (no
Hailuo clip and no still fallback anywhere), mark stage 4 `blocked` — produce no MP4.

### B.4 — Advance the ledger

Mark stage 4 `done` (note "K scenes: G Hailuo morphs, S still-segments; K+1 keyframes"), set
stage 5 `assemble` `in-progress`. Update the dashboard "Morph scenes (Hailuo)" row to
`✓ done (G morphs, S still-segments)`. Update `next_action`: "Stage 5 assemble —
video-toolkit/assemble.sh over work-scenes/ (black pad, --roomtone always since Hailuo is silent,
summed±2s verify)."
