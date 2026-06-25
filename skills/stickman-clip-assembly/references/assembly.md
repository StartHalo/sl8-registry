# Episode assembly — ffmpeg recipes explained + failure triage

`scripts/assemble.sh` runs the whole pipeline below. This file explains each
step so failures can be triaged without reverse-engineering the script.
Everything targets ffmpeg/ffprobe 5.1.9 (the sl8-animation template).

## Pipeline

```
04-clips/*.mp4 ──normalize──▶ tmp/norm/NNN.mp4 ──(+caption card)──▶ concat ──(+room tone)──▶ episode.mp4 ──ffprobe──▶ JSON verdict
```

## 1. Normalize (uniform re-encode BEFORE concat)

Generated clips arrive from different models with different fps, resolutions,
SARs, and encoder settings — and the concat demuxer assumes uniform streams.
Mixed parameters are the #1 concat failure, so every clip is re-encoded first:

```
fps=24,
scale=W:H:force_original_aspect_ratio=decrease,   # fit inside the canvas
pad=W:H:(ow-iw)/2:(oh-ih)/2:color=white,          # letterbox in paper white
setsar=1, format=yuv420p                          # square pixels, universal pixel format
```

- Canvas: 16:9 → 1920x1080, 9:16 → 1080x1920 (from `--aspect`, default 16:9 —
  always pass the plan's aspect).
- Encode: libx264, crf 20, preset medium, `+faststart` (moov atom up front —
  YouTube/preview friendly).
- **Audio uniformity:** every segment gets an identical audio layout (aac,
  48kHz stereo). Silent clips (all current i2v models) get an `anullsrc` track
  cut to video length with `-shortest`; clips that already carry audio (a
  routed Seedance model) keep it, re-encoded to the same spec. This is why
  concat never has stream-layout mismatches.

`still-segment.sh` deliberately produces output matching these settings, so a
fallback segment concats exactly like a real clip.

## 2. Caption card (optional punchline)

A 2s paper-white card appended after the final beat — the punchline as a
written line, in the genre's "hand-written aside" tradition:

```
ffmpeg -f lavfi -i "color=c=0xFAF6EE:s=WxH:d=2:r=24" \
       -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" \
       -vf "drawtext=textfile=caption.txt:fontfile=<font>:fontcolor=0x3A3A3A:fontsize=W/22:x=(w-text_w)/2:y=(h-text_h)/2,format=yuv420p" ...
```

- `textfile=` (not `text=`) sidesteps drawtext's escaping rules — quotes,
  colons and `%` in a punchline would otherwise break the filter.
- Font: the script probes a list of common DejaVu paths (italic serif first —
  the closest "hand-written" approximation reliably present in the sandbox).
  True handwriting fonts aren't installed; this is an approximation, which the
  summary should not oversell.
- No usable font → the card is **skipped with a warning**, the episode still
  ships, and the omission goes in 05-summary.md.

## 3. Concat (demuxer, beat order)

```
file 'tmp/norm/001.mp4'
file 'tmp/norm/002.mp4'
...
ffmpeg -f concat -safe 0 -i list.txt -c copy episode-concat.mp4
```

Order = lexicographic over the normalized names, which mirror the zero-padded
`NN-` clip names = beat order. After uniform normalization, stream-copy concat
is fast and lossless.

## 4. Room tone (default ON)

```
[1:a] volume=-38dB, pan=stereo|c0=c0|c1=c0 [rt];
[0:a][rt] amix=inputs=2:duration=first:normalize=0 [a]
```
with input 1 = `anoisesrc=colour=brown:r=48000:a=1.0`.

Why: the current i2v models are silent, and hard digital silence reads as
"broken video" on phones; a barely-audible brown-noise bed (−38dB ≈ room
ambience) approximates the format's ambient-sound convention. Why
`normalize=0`: amix otherwise halves both inputs — harmless under silence, but
it would duck real ambient audio from a Seedance clip. Video is `-c:v copy`
here (audio-only change, no quality loss). `--no-roomtone` skips this step
entirely (right choice when clips carry native ambient audio).

The bed is an **honesty item**: 05-summary.md must say "clips are silent; room
tone added at assembly" — never imply generated sound design.

## 5. Verification (ffprobe, JSON verdict)

```
ffprobe -show_entries format=duration ...   # duration_ok: 15 ≤ s ≤ 60
ffprobe -show_entries stream=width,height   # aspect_ok: matches planned canvas
```

The script prints one JSON line:
`{"file":..,"duration_s":..,"width":..,"height":..,"duration_ok":..,"aspect_ok":..,"roomtone":..,"verdict":"PASS|FLAG","reasons":[..]}`

**FLAG ≠ failure.** The episode is delivered either way (exit 0); the verdict
and reasons go prominently into 05-summary.md and the project's state.md.

## Failure triage

| Symptom | Likely cause | Fix |
|---|---|---|
| concat error: "Non-monotonous DTS" / codec mismatch | a segment escaped normalization or odd encoder timestamps | the script auto-falls back to a re-encode concat (`-c:v libx264 -c:a aac`) — slower, always works |
| episode under 15s | beats skipped in phase 3/4, or short model-default durations (dropped `duration=` param) | **deliver + FLAG** — never pad with fake content; list the cause in 05-summary.md; the user decides on a re-render |
| episode over 60s | plan over-budget or model overshot durations | deliver + FLAG; suggest trimming the longest beat in a re-render |
| wrong aspect in verdict | `--aspect` not passed (defaulted to 16:9) while the plan says 9:16 | re-run assemble.sh with the plan's aspect — normalize re-runs cheaply from 04-clips/ |
| caption card missing from episode | no usable font, or drawtext render failed | warning was printed; episode ships without the card; disclose it |
| audio pops at cuts | mixed audio sample formats slipped through | re-run — normalization pins aac/48k/stereo; if persistent, assemble with `--no-roomtone` and inspect per-clip audio |
| `amix ... Option 'normalize' not found` | older ffmpeg than 5.1 (wrong template) | this skill requires sl8-animation (ffmpeg 5.1.9); check `ffmpeg -version` |

## Re-renders are cheap

Everything assembly needs lives on disk (`04-clips/`, the plan, this script).
Re-running `assemble.sh` with different flags (`--no-roomtone`, corrected
`--aspect`, new `--caption`) touches no generation credits — prefer a re-assembly
over a re-generation whenever the clips themselves are fine.
