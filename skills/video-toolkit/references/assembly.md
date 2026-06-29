# Assembly & verification — how the toolkit's ffmpeg/ffprobe path works

Background for anyone editing `assemble.sh` / `verify.sh`. The runtime contract is in
each script's header; this explains *why* it's shaped that way.

## Why normalize BEFORE concat (always re-encode each clip first)

The concat **demuxer** (`-f concat -c copy`) is fast but fragile: it stream-copies, so
every input must share identical codec parameters — fps, resolution, SAR, pixel format,
and audio layout. Real model output violates this constantly (a still-segment fallback is
a different size than an i2v clip; one clip is silent, the next has native audio). Mixed
params are the **#1 concat failure**. So `assemble.sh` re-encodes every clip to one
uniform target first (`fps=24`, scaled+padded to the canvas, `yuv420p`, AAC 48k stereo),
*then* concats. The uniform pass is what makes the demuxer reliable.

## The audio-layout trick

Every normalized segment gets a stereo audio track even if the source was silent
(`anullsrc` for silent clips, the native track for clips that have one). Identical A/V
stream layout across all segments is required by the demuxer. `NATIVE_AUDIO` counts how
many clips arrived with real audio — that count drives `--roomtone auto`.

## Room-tone policy (`--roomtone`)

- `auto` (default): add a −38 dB brown-noise bed **only if NO clip had native audio**
  (avoids dead silence on an all-silent episode; avoids doubling on models with native
  audio). This is BOT-013's original behavior.
- `always`: add the bed regardless — for models that are **always silent** (Hailuo,
  Kling). BOT-029's original behavior. The bed is an **added ambient bed, not native
  audio** — the recipe MUST disclose that in `summary.md`.
- `never`: never add it — for models with **native audio** (Seedance, Veo) where a bed
  would double up.

## Concat fallback

If the stream-copy demuxer still trips on an edge case, `assemble.sh` falls back to a
single uniform **re-encode** of the concatenation (slower, but always works). This is the
last line of defense; normalize-first should make it rare.

## Verification modes (`verify.sh --mode`)

The four bots verified differently; the toolkit makes the mode a flag:

- `range` — `--min <= duration <= --max`. Use for a fixed target window (BOT-013: 15–60 s).
- `summed` — `|duration − summed| <= --tol`. Use when the episode length is the sum of the
  planned clip durations (concat bots; `assemble.sh` computes `summed` from the normalized
  clips and defaults `--tol 2`).
- `grew` — `duration > --base`. Use for the **extend** recipe (BOT-030 Veo), where the
  proof is that the grown take is longer than the base clip — there is no concat to sum.

A verdict is **PASS** only if the duration check AND the stream checks pass; otherwise
**FLAG**. FLAG still exits 0 — deliver the video and report the reason loudly. Exit 2 is
reserved for "the file isn't even readable" (a real assembly failure).

## Canvas sizes (`--aspect` × `--res`)

| aspect | `--res 720` | `--res 1080` |
|---|---|---|
| 16:9 | 1280×720 | 1920×1080 |
| 9:16 | 720×1280 | 1080×1920 |
| 1:1 | 720×720 | 1080×1080 |

BOT-013 rendered to the 1080 canvas; BOT-029 to the 720 canvas. Pick per recipe; the pad
color (`--pad-color`, default black; `white` for pencil-on-paper stickman) letterboxes any
clip whose native aspect differs.
