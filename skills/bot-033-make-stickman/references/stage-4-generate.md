# Stage 4 — generate (stills, then clips)

Absorbs BOT-013 `stickman-art` (the stills half) and `stickman-clip-assembly` Steps 1–4
(the per-beat i2v half). Two phases: **(A) one pencil still per beat** via the shared image
driver, gated at ≥80%; then **(B) one Seedance i2v clip per still** via the bot-local recipe.

**Reads:** `artifacts/<slug>/01-episode-plan.md`, `artifacts/<slug>/seed-snapshot/`.
**Writes:** `artifacts/<slug>/03-stills/` (+ `stills-log.md`), `artifacts/<slug>/04-clips/`.

> **Resumability:** this stage is set `in-progress` *before* the first paid submit. On resume,
> skip any beat whose `03-stills/NN-*.png` (phase A) or `04-clips/NN-*.mp4` (phase B) already
> exists — per-beat granularity, so a killed session re-spends at most one beat.

---

## Phase A — scene stills (one per beat)

### A.1 — Load the frozen blocks from the snapshot

From `seed-snapshot/seed.manifest.json` read verbatim (do **not** re-derive):
`identity.blocks.STYLE_STACK`, `CHARACTER_BLOCK`, `DISCIPLINE`, `CONSTRAINTS`; the `seed`;
and the hosted **source** anchor URL (the `--ref`, resolved in stage 2). The aspect comes
from the plan header (`16:9` default, `9:16` for Shorts).

### A.2 — Per beat: compose the 5-block still prompt

For each beat in plan order, write the fully-assembled prompt to a file. The frozen blocks
are pasted verbatim; **`scene:` from the plan is the only variable text** (see
`references/still-dialects.md` for the dialect, `references/pdf-patterns.md` for composition
patterns):

```
[1-STYLE]: <STYLE_STACK verbatim>
[2-CHARACTER]: <CHARACTER_BLOCK verbatim>
[3-SCENE]: <scene: field from the beat — the only variable text>
[4-DISCIPLINE]: <DISCIPLINE verbatim>
[5-CONSTRAINTS]: <CONSTRAINTS verbatim>
```

For the (at most one) beat the plan flagged with an in-frame label, replace `[5-CONSTRAINTS]`
with: `Monochrome graphite on white paper only. Single figure. One short word on one object permitted.`

### A.3 — Generate via the SHARED image driver

Call the `video-toolkit` driver — **do not** author or copy a local `gen-image.sh`. The
front anchor is the `--ref` so identity holds (`consumption: ref-image`):

```bash
mkdir -p artifacts/<slug>/03-stills work
# (compose work/still-NN-<slug>.txt as in A.2)
.claude/skills/video-toolkit/scripts/gen-image.sh \
  work/still-NN-<slug>.txt artifacts/<slug>/03-stills NN-<slug>.png \
  --chain "fal-ai/nano-banana-pro,fal-ai/flux-dev,fal-ai/stable-diffusion-v35-large" \
  --aspect-ratio 16:9 \
  --seed <seed> \
  --ref "<hosted source anchor URL>" \
  --max-cost 80
```

- `NN` is the zero-padded beat number (`01`, `02`, …); `<slug>` is the beat slug — together
  they are the stable filename `check-set.sh` looks for.
- Use `--aspect-ratio 9:16` for portrait episodes.
- The chain walks nano-banana-pro (ref-capable, primary) → flux-dev → sd-v3.5-large
  (ref-blind fallbacks; the frozen blocks + seed carry the lock). `gen-image.sh` prints
  `model<TAB>local-path<TAB>hosted-url` — **capture the hosted URL**; phase B and `check-set.sh`
  both need a `fal.media` URL.

### A.4 — Self-check each still (one retry)

After each generation, check (see `references/self-check.md`): exactly one stick figure ·
cap present and unmutated · monochrome pencil on white · one readable action matching the
scene · single-stroke arms/legs (no rounded/thick limbs). One retry budget per still; on a
persistent failure keep the best attempt, mark it FAIL, and log the reason — never drop a
beat silently.

### A.5 — Log to `stills-log.md` (the exact shape check-set.sh parses)

Append one block per beat to `artifacts/<slug>/03-stills/stills-log.md`. The heading and the
`- status:` / `- url:` lines are load-bearing — `check-set.sh` greps them:

```markdown
## Beat NN — <beat-slug>
- status: kept | skipped
- model: <model used>
- local: 03-stills/NN-<beat-slug>.png
- url: <fal.media hosted URL>      ← the i2v contract for phase B
- camera: <camera keyword from the beat>
- seed: <seed used>
- self-check: figure=PASS cap=PASS style=PASS action=PASS limbs=PASS
- notes: <deviations / failure reason, or "none">
```

A beat with no usable still gets `- status: skipped` (so the gate counts it correctly).

### A.6 — Gate the still set (≥80%)

```bash
scripts/check-set.sh artifacts/<slug>
```

It verifies every plan beat has a kept still (with a `fal.media` URL) or a recorded skip, and
that **≥80%** of beats are kept. On `FAIL`, mark stage 4 `blocked` in `state.md` recording
which beats failed; do not animate an under-threshold set.

Update the dashboard "Generate stills" row: `⟳ running — N/total` → `✓ done (N kept, M failed)`.

---

## Phase B — animate each beat (Seedance i2v)

For each kept still in beat order, generate one clip with the **bot-local** recipe script
(the one model, one recipe for this bot — `references/seedance-dialect.md` and
`references/clip-dialects.md` carry the dialect). Output to `04-clips/NN-<slug>.mp4`.

### B.1 — Compose the clip prompt to a file

```
A stick figure hand-drawn pencil sketch animation.   ← the "Video style lock" from style.md
[Camera]: <camera keyword from the beat>.
[Action]: <motion: field from the beat>.
[Subject]: the stickman — single-stroke arms and legs, minimal construction, baseball cap.
Maintain exact character proportions and cap. Avoid identity drift, jitter, rounded limbs.
[Constraints]: Monochrome pencil sketch on white. Sharp clarity, stable picture, no blur, no ghosting.
NO MUSIC, ONLY AMBIENT SOUND. NO TALKING.
```

### B.2 — Call the recipe (Seedance image-to-video)

```bash
mkdir -p artifacts/<slug>/04-clips
CLIP_ASPECT=16:9 CLIP_RESOLUTION=720p CLIP_AUDIO=on \
  scripts/gen-clip.sh \
    work/clip-NN-<slug>.txt \
    "<fal.media still URL from stills-log>" \
    <duration 5|10> \
    artifacts/<slug>/04-clips/NN-<slug>.mp4
```

- The image input is the hosted still URL (v2.1.0 also accepts the local still path).
- `gen-clip.sh` walks `bytedance/seedance-2.0/fast/image-to-video` →
  `fal-ai/kling-video/v3/pro/image-to-video`, is queue-aware (15-min timeout, one retry on
  timeout, one retry without the `duration=` pass-through), and prints `model<TAB>out-path`.
  Seedance generates **native ambient audio** (`CLIP_AUDIO=on`). Use `CLIP_ASPECT=9:16` for Shorts.
- max-cost is the script's default gate (360cr for 4–7s). Estimate first with
  `.claude/skills/video-toolkit/scripts/cost.sh estimate bytedance/seedance-2.0/fast/image-to-video duration=<d> resolution=720p` if asked.

### B.3 — Fallback: still-as-segment

If every model in the chain fails for a beat (`gen-clip.sh` exits non-zero), make a Ken-Burns
segment from the LOCAL still so the episode keeps the beat, and **FLAG it** for the summary:

```bash
ASPECT=16:9 scripts/still-segment.sh \
  artifacts/<slug>/03-stills/NN-<slug>.png <duration> \
  artifacts/<slug>/04-clips/NN-<slug>.mp4
```

It outputs the same 24fps/canvas/H.264/silent layout `assemble.sh` normalizes to, so concat
never special-cases it. Record every still-segment beat in the decisions log (it is disclosed
in `summary.md`).

### B.4 — Advance the ledger

Mark stage 4 `done` (note "N beats: K i2v, M still-segment"), set stage 5 `assemble`
`in-progress`. Update the dashboard "Animate clips" row to `✓ done (K i2v, M still-segment)`.
Update `next_action`: "Stage 5 assemble — .claude/skills/video-toolkit/scripts/assemble.sh over 04-clips/ (white pad,
1080, roomtone auto, range-verify 15–60s, caption = punchline)."
