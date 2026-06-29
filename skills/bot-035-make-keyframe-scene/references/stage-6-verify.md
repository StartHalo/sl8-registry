# Stage 6 — verify

Reads the verdict the shared assembler already produced (it ran `verify.sh` internally) and
records it. No re-verification logic lives here — the gate is shared. This stage is the
**deliver-and-disclose** decision point.

**Reads:** `artifacts/<slug>/episode.mp4`, the verdict JSON captured at stage 5.
**Writes:** the verdict + any FLAG into `state.md`.

---

## Step 1 — Read the assemble verdict

Take the one JSON verdict line `assemble.sh` printed at stage 5 (from the decisions log). It
carries `duration_s`, `width`, `height`, `has_video`, `has_audio`, `verdict` (`PASS | FLAG`), and
`reasons[]`.

- **`PASS`** → record it; proceed to deliver.
- **`FLAG`** → **record the reasons in `state.md`, still deliver the episode.** A FLAG never
  withholds the MP4 — it is surfaced in `summary.md`'s **Verdict** and **What was compromised**
  sections (stage 7). Typical FLAG reasons: duration off the summed target by more than ±2s, a
  missing audio stream (would mean the ALWAYS-on ambient bed did not attach — investigate), a
  missing video stream.

> Note for this recipe: `has_audio: true` is the **added ambient bed**, NOT native audio — Hailuo
> clips are silent. The verifier only confirms *an* audio stream exists; the honesty about it being
> a non-native added bed is the summary's job (stage 7).

## Step 2 — ffprobe sanity (independent confirmation)

Confirm the delivered file independently of the verdict (cheap, deterministic):

```bash
ffprobe -v error -show_entries stream=codec_type,duration,width,height -of json \
  artifacts/<slug>/episode.mp4
```

Confirm: a video stream exists; an audio stream exists (the added room-tone bed); duration is
within ±2s of the sum of the planned scene durations; width×height matches the planned aspect/res
(1280×720 for 16:9, 720×1280 for 9:16, 720×720 for 1:1). Any discrepancy vs the verdict is itself
a FLAG to disclose (do not silently trust either source over the other).

## Step 3 — Advance the ledger

Mark stage 6 `done`, set stage 7 `deliver` `in-progress`. Write the final verdict (`PASS` or
`FLAG — <reasons>`) into `state.md`. Update `next_action`: "Stage 7 deliver — write summary.md
from the video-toolkit template (disclose the ADDED ambient bed), update dashboard, set status
complete."
