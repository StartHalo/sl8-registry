# Stage 5 — assemble

Calls the **shared** ffmpeg assembler. This bot does **not** own an `assemble.sh` — the one
copy lives in `video-toolkit` so a fix lands once. The bot-local part of assembly is only the
*invocation choices* (white pad for pencil-on-paper, native-audio room-tone policy, the
range gate).

**Reads:** `artifacts/<slug>/04-clips/` (the per-beat clips), the plan header (aspect,
punchline).
**Writes:** `artifacts/<slug>/episode.mp4`.

---

## Step 1 — Call the shared assembler

```bash
.claude/skills/video-toolkit/scripts/assemble.sh artifacts/<slug> \
  --clips-dir artifacts/<slug>/04-clips \
  --pad-color white \
  --res 1080 \
  --aspect <16:9 | 9:16> \
  --roomtone auto \
  --verify range --min 15 --max 60 \
  --caption "<punchline from the plan header>" \
  --route stickman
```

What each choice means for this recipe:

- **`--pad-color white`** — the stickman house style is graphite **on white paper**; letterbox
  pad must be white, not the default black.
- **`--res 1080` + `--aspect <…>`** — 1920×1080 for YouTube (`16:9`), 1080×1920 for Shorts
  (`9:16`). Take the aspect from the plan header.
- **`--roomtone auto`** — Seedance i2v clips carry **native** ambient audio, so `auto` resolves
  to **OFF** (it adds a brown-noise bed only when *no* clip had native audio). If every beat
  fell back to a silent `still-segment` (rare), `auto` correctly resolves to ON — that added
  bed must then be disclosed in `summary.md`.
- **`--verify range --min 15 --max 60`** — the stickman episode length gate (15–60s), passed
  through to the shared `verify.sh`. (Concat bots default to `summed`; this recipe uses the
  range gate.)
- **`--caption "<punchline>"`** — append a 2s caption card with the plan's punchline (omit the
  flag if `punchline: none`).
- **`--route stickman`** — labels the verdict JSON so the run is identifiable.

The assembler normalizes every clip to a uniform 24fps/H.264/yuv420p canvas, concats in
sorted (zero-padded `NN`) order, resolves room-tone, appends the caption, runs `verify.sh`,
and writes `artifacts/<slug>/episode.mp4`.

## Step 2 — Capture the verdict

`assemble.sh` prints exactly **one** JSON verdict line on stdout (from `verify.sh`), e.g.
`{"file":"…/episode.mp4","route":"stickman","duration_s":31.0,"width":1920,"height":1080,"has_video":true,"has_audio":true,"verdict":"PASS","reasons":[]}`.
**Capture this line** — stage 6 reads it. A `FLAG` verdict still exits 0 (deliver + flag).
A non-zero exit means assembly itself failed (e.g. no clips, ffmpeg error) — record it and
mark stage 5 `blocked`.

## Step 3 — Advance the ledger

Mark stage 5 `done`, set stage 6 `verify` `in-progress`. Paste the verdict JSON into the
decisions log. Update the dashboard "Assemble episode" row to `✓ done — <duration>s`. Update
`next_action`: "Stage 6 verify — read the assemble verdict; FLAG → record + still deliver;
ffprobe sanity."
