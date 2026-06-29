# Stage 6 — verify

Reads the verdict the shared assembler already produced (it ran `verify.sh` internally) and
records it. No re-verification logic lives here — the gate is shared. This stage is the
**deliver-and-disclose** decision point.

**Reads:** `artifacts/<slug>/episode.mp4`, the verdict JSON captured at stage 5.
**Writes:** the verdict + any FLAG into `state.md`.

---

## Step 1 — Read the assemble verdict

Take the one JSON verdict line `assemble.sh` printed at stage 5 (from the decisions log).
It carries `duration_s`, `width`, `height`, `has_video`, `has_audio`, `verdict`
(`PASS | FLAG`), and `reasons[]`.

- **`PASS`** → record it; proceed to deliver.
- **`FLAG`** → **record the reasons in `state.md`, still deliver the episode.** A FLAG never
  withholds the MP4 — it is surfaced in `summary.md`'s **Verdict** and **What was
  compromised** sections (stage 7). Typical FLAG reasons: duration outside 15–60s, missing
  audio (would mean every beat fell back to a silent still-segment), missing video stream.

## Step 2 — ffprobe sanity (independent confirmation)

Confirm the delivered file independently of the verdict (cheap, deterministic):

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=duration,width,height -of json \
  artifacts/<slug>/episode.mp4
```

Confirm: a video stream exists; duration is within 15–60s; width×height matches the planned
aspect/res (1920×1080 for 16:9, 1080×1920 for 9:16). Any discrepancy vs the verdict is itself
a FLAG to disclose (do not silently trust either source over the other).

## Step 3 — Advance the ledger

Mark stage 6 `done`, set stage 7 `deliver` `in-progress`. Write the final verdict
(`PASS` or `FLAG — <reasons>`) into `state.md`. Update `next_action`:
"Stage 7 deliver — write summary.md from the video-toolkit template, update dashboard, set
status complete."
