# Render flags, Chrome, and low-memory — the keyless local render path

> Reference for `render.sh`. Confirmed against `hyperframes@0.6.112` and the `sl8-animation` runtime facts
> (2026-06-18). The render is **100% local and keyless** — Chrome + FFmpeg, no HeyGen cloud/lambda/auth.

## The mandated invocation

Per AR, `render.sh` runs (cwd = the composition dir, so `.` is the project):

```bash
hyperframes render . --chrome "$(cat /etc/sl8/chrome-path)" --low-memory-mode --quality <q> --output <out>
```

- `--chrome "$(cat /etc/sl8/chrome-path)"` — the **pinned** Chrome-for-Testing in `sl8-animation`
  (`/etc/sl8/chrome-path` → `/opt/chrome/chrome`). **Self-heal:** if `/etc/sl8/chrome-path` is **absent**
  (host/dev), omit `--chrome` entirely and let hyperframes auto-detect the system Chrome. `render.sh` does
  this automatically. **Never** run `hyperframes browser ensure` (it downloads Chrome) and **never** pass
  HeyGen auth.
- `--low-memory-mode` — **always**, in-sandbox. Pins to **1 worker**, screenshot capture, no auto-worker
  calibration — avoids memory thrash on the ~1.9 GB sandbox. Expect ≈1 s wall per 1 s of 1080p draft.
- `--quality draft|standard|high` — `draft` for previews/iteration (fast); `standard` for finals; `high`
  for archival. Default `draft`.
- `--output <out>` — the MP4 path. `render.sh` writes `<exports>/<name>-<ar-slug>.mp4` (e.g. `teaser-16x9.mp4`).
- Default codec is **h264** in an MP4 container, **30 fps** (override fps with `-f` if a brief demands it).

> `hyperframes doctor` false-negatives on Chrome in the sandbox — **ignore it**; render works with the
> pinned path. Do not gate the render on `doctor`.

## Aspect ratio vs `--resolution` (important)

The composition's **root `data-width`/`data-height` decide its aspect ratio.** `--resolution` only
**rescales within the SAME orientation** (Chrome renders at a higher deviceScaleFactor; the scale must be
an integer multiple and the orientation must match) — e.g. `landscape` 1080p → `landscape-4k`. It **cannot
rotate** a 16:9 composition into 9:16: `outputResolution portrait ... does not match the aspect ratio of
the composition (1920×1080)`.

Therefore:
- **A different aspect ratio is a RE-AUTHORED composition** — `hf-build` sets the root to the target dims
  (e.g. `1080×1920` for 9:16) and you render that natively. This is the JTBD-1/JTBD-4 multi-AR path.
- `render.sh` reads the composition's native dims and: renders the base AR **natively**; passes
  `--resolution <orientation>-4k` only for a 4k token whose orientation matches; and **fails cleanly**
  (with guidance to re-author in `hf-build`) if a requested base AR's orientation differs from the comp.

| AR token | how render.sh handles it (against a comp of matching orientation) | expected dims |
|---|---|---|
| `16:9` | render native (comp is 1920×1080) | 1920×1080 |
| `9:16` | render native (comp must be 1080×1920) | 1080×1920 |
| `1:1` | render native (comp must be 1080×1080) | 1080×1080 |
| `16:9-4k` | `--resolution landscape-4k` (scale up a landscape comp) | 3840×2160 |
| `9:16-4k` | `--resolution portrait-4k` | 2160×3840 |
| `1:1-4k` | `--resolution square-4k` | 2160×2160 |

## Verification (after each render)

`render.sh` verifies each MP4 with `ffprobe` and fails the AR if any check fails:
- `codec_name == h264`
- `width × height` == the expected dims for the AR/orientation
- `r_frame_rate` (fps) and `duration > 0`

Then it extracts a frame per `verify-at` timestamp with `ffmpeg -ss <t> -frames:v 1` into
`<exports>/frames/` — these are the PNGs the session **reads with its own vision** to grade legibility,
composition, motion quality, and brand application (the media-judge gate). Always vision-grade the frames;
never declare done from the filename or file size.

## Audio (when VO/music is present)

If `04-timing.json` / `assets/vo/*.wav` exist and the composition mounts the audio as a **direct child of
the root** (contract §2), the rendered MP4 carries an audio stream. Confirm with
`ffprobe -select_streams a:0 -show_entries stream=codec_name`. A silent render when audio was expected
means the audio wasn't a direct child of the root — fix in `hf-build`. Audio assets come via `ai-gen`
(Kokoro TTS) in `hf-voiceover`; the render itself never calls a model.

## Cost & latency

The render path is **free** (local Chrome + FFmpeg, no credits). Budget ≈1 s wall per 1 s of 1080p draft
video in the sandbox (a 15 s video ≈ 15–20 s render at draft, longer at `standard`/`high` or 4k). Render
`draft` while iterating; switch to `standard` only for the final pass.
