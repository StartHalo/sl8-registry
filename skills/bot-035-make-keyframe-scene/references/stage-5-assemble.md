# Stage 5 — assemble

Calls the **shared** ffmpeg assembler. This bot does **not** own an `assemble.sh` — the one copy
lives in `video-toolkit` so a fix lands once. The bot-local part of assembly is only the
*invocation choices* (black pad, the ALWAYS-on ambient bed because Hailuo is silent, the summed
duration gate).

**Reads:** `artifacts/<slug>/work-scenes/` (the per-scene clips), the plan footer (aspect).
**Writes:** `artifacts/<slug>/episode.mp4`.

---

## Step 1 — Call the shared assembler

```bash
.claude/skills/video-toolkit/scripts/assemble.sh artifacts/<slug> \
  --clips-dir artifacts/<slug>/work-scenes \
  --pattern 'scene-*.mp4' \
  --pad-color black \
  --res 720 \
  --aspect <16:9 | 9:16 | 1:1> \
  --roomtone always \
  --roomtone-db -38 \
  --verify summed --tol 2 \
  --route keyframe
```

What each choice means for this recipe:

- **`--pad-color black`** — the keyframe house style is cinematic; letterbox pad is black (the
  default), unlike the pencil-on-paper bots that pad white.
- **`--res 720` + `--aspect <…>`** — Hailuo renders at 768P/512P; the normalize canvas is 1280×720
  (16:9), 720×1280 (9:16), or 720×720 (1:1). Take the aspect from the plan footer.
- **`--roomtone always`** — Hailuo first-last clips carry **NO native audio** (they are silent), so
  the brown-noise ambient bed is **always added** (never `auto` or `never` here — there is no native
  track to double up). The bed is derived from the plan `Audio:` line. **This added bed MUST be
  disclosed as non-native in `summary.md`.**
- **`--verify summed --tol 2`** — the keyframe-journey length gate: the episode duration must be
  within ±2s of the **sum of the per-scene durations** (the wider tolerance absorbs per-clip
  rounding across many short scenes). (Per-beat bots use the `range` gate; this recipe uses `summed`.)
- **`--route keyframe`** — labels the verdict JSON so the run is identifiable.
- No `--caption` by default (keyframe shorts are wordless reveals; omit it).

The assembler normalizes every clip to a uniform 24fps/H.264/yuv420p canvas, concats in sorted
(zero-padded `NN`) scene order, adds the ambient bed, runs `verify.sh`, and writes
`artifacts/<slug>/episode.mp4`.

## Step 2 — Capture the verdict

`assemble.sh` prints exactly **one** JSON verdict line on stdout (from `verify.sh`), e.g.
`{"file":"…/episode.mp4","route":"keyframe","duration_s":24.0,"width":1280,"height":720,"has_video":true,"has_audio":true,"verdict":"PASS","reasons":[]}`.
**Capture this line** — stage 6 reads it. A `FLAG` verdict still exits 0 (deliver + flag). A
non-zero exit means assembly itself failed (e.g. no clips, ffmpeg error) — record it and mark
stage 5 `blocked`.

## Step 3 — Advance the ledger

Mark stage 5 `done`, set stage 6 `verify` `in-progress`. Paste the verdict JSON into the decisions
log. Update the dashboard "Assemble episode" row to `✓ done — <duration>s`. Update `next_action`:
"Stage 6 verify — read the assemble verdict; FLAG → record + still deliver; ffprobe sanity
(confirm the ADDED ambient audio stream is present)."
