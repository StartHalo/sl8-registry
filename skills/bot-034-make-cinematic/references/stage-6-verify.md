# Stage 6 — verify

Runs the **shared** verifier on the delivered `episode.mp4` and records the verdict. The bot does
**not** own a `verify.sh` — the one copy lives in `video-toolkit` so the gate logic is identical
across the fleet. This stage is the **deliver-and-disclose** decision point.

**Reads:** `artifacts/<slug>/episode.mp4` (and, for the fallback, the verdict JSON captured at
stage 5).
**Writes:** the verdict + any FLAG into `state.md`.

---

## Step 1 — Run the shared verifier

Pick the mode that matches how the episode was produced:

```bash
# Single-call path (default): ONE reference-to-video take — gate the duration by RANGE around
# the target (±1s), require a native audio stream.
.claude/skills/video-toolkit/scripts/verify.sh artifacts/<slug>/episode.mp4 \
  --mode range --min <duration-1> --max <duration+1> \
  --require-audio yes --route cinematic

# Per-shot fallback path: the concatenated clips sum to ~target — gate by SUMMED (±2s).
.claude/skills/video-toolkit/scripts/verify.sh artifacts/<slug>/episode.mp4 \
  --mode summed --summed <duration> --tol 2 \
  --require-audio yes --route cinematic-fallback
```

`verify.sh` ffprobes the file and prints ONE JSON verdict line, e.g.
`{"file":"…/episode.mp4","route":"cinematic","duration_s":15.0,"width":1280,"height":720,"has_video":true,"has_audio":true,"verdict":"PASS","reasons":[]}`.
It always asserts a video stream; with `--require-audio yes` it asserts a native audio stream too
(the whole point of Seedance reference-to-video is in-pass audio). A failing assertion yields
`FLAG` (deliver + flag) and still exits 0; exit 2 only if the file is missing.

> For the fallback, `assemble.sh` / `per-shot-fallback.sh` already ran `verify.sh` internally —
> you may reuse that captured verdict instead of re-running, but re-running on the final
> `episode.mp4` is the canonical confirmation.

## Step 2 — Interpret the verdict

- **`PASS`** → record it; proceed to deliver.
- **`FLAG`** → **record the reasons in `state.md`, still deliver the cinematic.** A FLAG never
  withholds the MP4 — it is surfaced in `summary.md`'s **Verdict** and **What was compromised**
  sections (stage 7). Typical FLAG reasons: duration outside the gate, missing audio (the native
  audio stream did not arrive — for a single call this normally means the recipe should have
  fallen back; disclose it), missing video stream.

## Step 3 — ffprobe sanity (independent confirmation)

Confirm the delivered file independently of the verdict (cheap, deterministic):

```bash
ffprobe -v error -show_entries stream=codec_type,codec_name -of csv=p=0 artifacts/<slug>/episode.mp4
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 artifacts/<slug>/episode.mp4
```

Confirm: a `video` stream AND an `audio` stream are present and the duration is within the gate.
Optionally sample a few keyframes for an identity self-check (does ONE consistent character hold
across the shots?):

```bash
for ss in 1 5 9 13; do ffmpeg -y -ss $ss -i artifacts/<slug>/episode.mp4 -frames:v 1 work/<slug>/frame-${ss}s.png >/dev/null 2>&1; done
```

A serious miss (identity drift, the shots not executed) is disclosed in `summary.md` — never
hidden — so the user can decide on a re-render. Any discrepancy vs the verdict is itself a FLAG.

## Step 4 — Advance the ledger

Mark stage 6 `done`, set stage 7 `deliver` `in-progress`. Write the final verdict
(`PASS` or `FLAG — <reasons>`) into `state.md`. Update `next_action`:
"Stage 7 deliver — write summary.md from the video-toolkit template, update dashboard, set
status complete."
