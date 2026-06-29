# Stage 5 — assemble

The single Seedance reference-to-video pass returns **ONE coherent MP4** — the model cut between
shots itself, in-pass. So on the happy path there is **nothing to concat**: assembly is a
**zero-concat passthrough**. The bot does **not** own an `assemble.sh` — the one shared copy
lives in `video-toolkit` and is used only by the **fallback** path (to concat per-shot clips).

**Reads:** `work/<slug>/raw.mp4` (single-call) or `artifacts/<slug>/work-shots/` /
`work/<slug>/clips/` (fallback); the shot-list footer (aspect).
**Writes:** `artifacts/<slug>/episode.mp4`.

---

## Path A — single-call success (default): zero-concat passthrough

`gen-cinematic.sh` already normalized the file (24fps, the planned canvas, H.264/yuv420p + AAC,
faststart) and ffprobe-verified it. The one MP4 **is** the finished cinematic — its cuts are
native to the render, not stitched. Just promote it to the deliverable:

```bash
cp work/<slug>/raw.mp4 artifacts/<slug>/episode.mp4
```

Do **not** run `assemble.sh` here — there is a single clip and a single native audio stream;
concatenation would be a no-op at best and a re-encode at worst. (This mirrors the zero-concat
pattern the Veo-extend bot uses for the same reason: one finished take, no concat.) Proceed to
stage 6, where the shared `verify.sh` produces the canonical verdict.

## Path B — per-shot fallback: concat the clips with the SHARED assembler

The fallback produced one clip per shot. `per-shot-fallback.sh` (the copied recipe) already
concatenated them into `artifacts/<slug>/episode.mp4` itself (its ffmpeg concat is the donor of
the shared `assemble.sh`) — if that ran end-to-end, `episode.mp4` already exists and you proceed
to stage 6.

If instead you have **only the per-shot clips** on disk (e.g. you generated them but want the
architecture-shared assembler so a fix lands once), concat them with the shared `assemble.sh`:

```bash
.claude/skills/video-toolkit/scripts/assemble.sh artifacts/<slug> \
  --clips-dir artifacts/<slug>/work-shots \
  --pattern '*-shot.mp4' \
  --pad-color black \
  --res 720 \
  --aspect <16:9 | 9:16 | 1:1 | 21:9> \
  --roomtone never \
  --verify summed --tol 2 \
  --route cinematic-fallback
```

What each choice means for this recipe:

- **`--pad-color black`** — cinematic letterbox pad is black (unlike the stickman bot's white
  pencil-paper pad).
- **`--roomtone never`** — Seedance i2v clips carry **native** ambient audio, so a brown-noise
  bed would double up. (`per-shot-fallback.sh` itself adds a bed *only* when a shot lacked native
  audio — the same policy, applied per-clip; with the shared assembler we keep `never` and rely
  on the clips' native audio, flagging any silent clip in the summary.)
- **`--verify summed --tol 2`** — the per-shot clips sum to roughly the target duration; the
  summed gate (±2s) is the right check for a concat. (The single-call path uses `range` at
  stage 6 instead — see below.)
- **`--route cinematic-fallback`** — labels the verdict JSON so the run is identifiable.

`assemble.sh` normalizes every clip to a uniform 24fps/H.264/yuv420p canvas, concats in sorted
(`NN-shot`) order, applies the room-tone policy, runs `verify.sh`, and writes
`artifacts/<slug>/episode.mp4`, printing one JSON verdict line.

## Step — capture the route + verdict

- **Path A** writes no verdict here (stage 6 runs `verify.sh`). Record the route =
  `single-call reference-to-video` in the decisions log.
- **Path B** captures the JSON verdict line `assemble.sh` / `per-shot-fallback.sh` printed (it
  feeds stage 6). Record the route = `per-shot fallback (N/K shots)` and WHY the single call was
  abandoned.

A non-zero exit from `assemble.sh` means assembly itself failed (e.g. no clips, ffmpeg error) —
record it and mark stage 5 `blocked`.

## Step — advance the ledger

Mark stage 5 `done`, set stage 6 `verify` `in-progress`. Update the dashboard "Assemble" row to
`✓ done — <route>`. Update `next_action`: "Stage 6 verify — .claude/skills/video-toolkit/scripts/verify.sh on
episode.mp4 (--mode range --min <D-1> --max <D+1> for the single take, or --mode summed for the
fallback); FLAG → record + still deliver."
