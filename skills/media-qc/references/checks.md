# media-qc checks: contracts, cases and figures

## Contents
- [Conventions](#conventions)
- [artifact](#artifact)
- [image](#image)
- [declared](#declared)
- [sheet](#sheet)
- [streams](#streams)
- [clipset](#clipset)
- [motion](#motion)
- [endpoints](#endpoints)
- [takes](#takes)
- [loudness](#loudness)
- [plan-measured](#plan-measured)
- [duck](#duck)
- [identical](#identical)
- [QC codes](#qc-codes)
- [Self-test fixtures (IMG-T3, VID-T3)](#self-test-fixtures-img-t3-vid-t3)
- [Adding a check](#adding-a-check)

## Conventions

- **One JSON line on stdout** per run: `{"check", "exit", …figures…, "fails": [], "notes": [], "mediaqc": "1.1.0"}`.
  `exit` in the JSON always equals the process exit code.
- **Exit codes:** 0 the file is what was asked · 1 it is not · 2 usage · 3 cannot check. When a run
  finds both a failure and something it cannot check, 1 wins.
- **Every `fails[]` entry starts with its QC code** (`BQ-02 hero.png: named .png but the bytes are jpeg`).
  `notes[]` carries what was not compared and why; it never changes the exit code.
- **Dependencies:** node >= 20, ffprobe and ffmpeg. No ImageMagick, python, jq or npm package. It
  runs on an ffmpeg built without `drawtext` (the P2 host had none). The 1.1.0 checks use only
  filters ffmpeg 5.1 has: `ebur128`, `tblend`, `signalstats`, `metadata`, `ssim`, `volumedetect`,
  `atrim`, `concat`. A path argument is a file, not a name searched for.
- **Never a verdict word.** The script prints `match: true|false` per compared field and the figures;
  the exit code is the verdict. The agent reports figures, never PASS (HR14).

## artifact

**Contract.** `artifact <file|dir>...`: every named file, and every file under a named folder with a
known extension (dotfiles skipped, six levels deep), exists, is non-empty, has magic bytes that match
its extension, and decodes: the first video frame for pictures and video, the first second for audio.

| Extension | Magic bytes | Decoded |
|---|---|---|
| png | `89 50 4E 47 0D 0A 1A 0A` | first frame |
| jpg, jpeg | `FF D8 FF` | first frame |
| webp | `RIFF` … `WEBP` | first frame |
| gif | `GIF87a` / `GIF89a` | first frame |
| mp4, m4v | `ftyp` at byte 4 | first frame (first second of audio if no picture) |
| mov | `ftyp`, `moov`, `wide`, `mdat`, `free`, `skip` or `pnot` at byte 4 | as mp4 |
| webm | EBML `1A 45 DF A3` | as mp4 |
| wav | `RIFF` … `WAVE` | first second |
| mp3 | `ID3`, or an MPEG frame sync | first second |

| Separates | Good | Known bad |
|---|---|---|
| Delivered vs not | `square-1024.png` (exit 0) | `empty.png` 0 bytes, a missing path, a folder with no media file (BQ-01) |
| Named vs actual kind | `photo.jpg` (exit 0) | `jpeg-named.png`, JPEG bytes behind a .png name; `text-named.mp4` (BQ-02) |
| Readable vs decodable | `deep-16bit.png` (exit 0) | `truncated.png`: ffprobe reads 1024x1024 and exits 0, the pixels do not decode (BQ-02) |
| Checkable vs not | any table extension | `notes.txt`: no magic rule, exit 3 |

**Figures.** `files` (count); `rows[]` (first 50): `file`, `bytes`, `ext`, `magic` (what the bytes
are: png, jpeg, webp, gif, mp4, mov, webm, wav, mp3, text or unknown), `codec`, `w`, `h`, and for
video and audio `duration_s` and `audio` (`codec rateHz Nch`).

**Why decode.** A header-only read is fooled by a cut-off download: ffprobe reported the truncated
PNG's full size. P2 also found the legacy `image.sh` read content and ignored the extension, so a
JPEG named `.png` passed it; only the legacy `artifact.sh` magic table caught that lie.

## image

**Contract.** `image <file> [--w W] [--h H] [--aspect W:H] [--tol 0.01] [--min-long N]
[--alpha required|forbidden] [--format png|jpeg|webp|gif]`: one picture is measured, and each flag
given is compared. A file that is missing, empty, mis-named or undecodable fails as in `artifact`.

| Flag | Fails when | Code |
|---|---|---|
| `--w`, `--h` | the pixel width or height differs | IQ-03 |
| `--aspect W:H` with `--tol` | \|w/h − W/H\| / (W/H) > tol (default 0.01) | IQ-03 |
| `--min-long N` | the long side is under N | IQ-03 |
| `--format` | the magic bytes are another format (`jpg` means `jpeg`) | IQ-04 |
| `--alpha required` | no pixel has alpha below 255 | IQ-05 |
| `--alpha forbidden` | any pixel has alpha below 255 | IQ-05 |

| Separates | Good | Known bad |
|---|---|---|
| Asked size | `square-1024.png --w 1024 --h 1024` | `wide-864x496.png --w 1280 --h 720` |
| Asked shape | `wide-1280x720.png --aspect 16:9` | `wide-864x496.png --aspect 16:9`: 1.7419, 2.02% off |
| Minimum size | `square-1024.png` with no flag | `square-1024.png --min-long 1600` |
| Real alpha | `cutout-rgba.png --alpha required`: 55.83% transparent | `opaque-rgba.png --alpha required`: channel present, every pixel 255 |
| No alpha allowed | `opaque-rgba.png --alpha forbidden` | `cutout-rgba.png --alpha forbidden` |
| Asked format | `photo.jpg --format jpeg` | `photo.jpg --format png` |

**Figures** (`figures`):

| Figure | Meaning and method |
|---|---|
| `bytes`, `ext`, `magic`, `codec` | size on disk; extension; the format the bytes are; ffprobe's decoder |
| `w`, `h`, `long_side` | pixels, from the first video stream |
| `aspect`, `aspect_value` | reduced ratio (`54:31`) and w/h to 4 decimals |
| `nearest_aspect`, `nearest_off_pct` | the closest of 1:1, 5:4, 4:5, 4:3, 3:4, 3:2, 2:3, 16:10, 10:16, 16:9, 9:16, 21:9, 9:21, and how far off in % |
| `pix_fmt` | ffprobe's pixel format |
| `bit_depth` | the PNG IHDR bit depth; else ffprobe `bits_per_raw_sample`; else read from the pixel format |
| `alpha_channel` | the pixel format carries alpha (rgba, ya8, pal8, yuva …) |
| `real_alpha`, `alpha_min`, `transparent_share` | ffmpeg `format=rgba,alphaextract` to a raw grey plane; node counts the lowest alpha and the share of pixels below 255 |

`compared[]` holds one row per flag: `field`, `want`, `got`, `match`, and for aspect `off_pct` and
`tol_pct`.

## declared

**Contract.** `declared --plan F --file F [--id ID] [--tol 0.01] [--dur-tol 0.1]`: find the
declaration for the file, measure the file as `image` does (a video also gets its duration, fps and
audio), and compare every declared field.

**Lookup, in order.**
1. With `--id`: the object whose `id` equals it (`hero#2`); else the **last** object whose `item`
   equals it (retries share an item, so the last row is the latest attempt); else the first whose
   `node` or `name` equals it.
2. Without `--id`: the first object, in document order, that names the file: a `file`, `path`,
   `output`, `out` or `local_path` key, or a string in `files[]`, equal to the path given or with the
   same base name. `files[]` objects (`{path, sha256, bytes}`) match through their `path`.
3. From that object up to the root, the nearest `declared` object wins. `measured` blocks are never
   read.
4. With no named object: the root's `declared`, else the root's flat fields (a request record such
   as `{"aspect_ratio":"1:1","format":"png"}`).

**Fields** (also in SKILL.md): `w`/`width`, `h`/`height`, `resolution`/`size` (`1280x720`, or `720p`
for the short side), `aspect`/`aspect_ratio`, `min_long`, `format` (png, jpeg/jpg, webp, gif, mp4,
mov, webm), `alpha` (`required`/`true`, `forbidden`/`false`), and from 1.1.0, on a video:

| Field (aliases) | Compared as | Code |
|---|---|---|
| `duration_s`/`duration`/`dur_s` | `4`, `4.5` or `"4s"`, against the **video stream's** duration (not the container's: AAC priming and a deliberate tail lengthen it), tolerance max(1 s, `--dur-tol` × declared), default 10% | VQ-03 |
| `fps` | the stream's `r_frame_rate`, within 0.01 | VQ-03 |
| `audio` | `off`, `false`, `no`, `none`, `silent`, `mute`: the file must carry no sound; any other value (`true`, `on`, `vo+bed`): it must carry sound. Sound is an audio stream whose mean volume is above −60 dB, so a silent track counts as none | AQ-01 |

On a picture these three are listed under `unchecked`. A value the check cannot read
(`resolution: "2K"`, `format: "json"`, `duration: "about 5 s"`) is named in `notes` and not compared.

**Exit 3, never 0, when:** the record does not exist or is not JSON; nothing names the file and the
root declares nothing; the named entry and everything above it declare nothing; `--id` matches
nothing; the declaration holds no field media-qc compares; or it holds only video fields and the file
is a picture. P2 found the
legacy `plan-measured.sh` turned missing evidence into a failure (exit 1). It is not a failure of the
file, and it is not a pass: it is a gap the plan must close (HR1). Three archived runs had "720p" only
in the brief and never in the plan (R04, R08, UC1-r23), so only the aspect check caught their frames,
2.0% off 16:9.

| Separates | Good | Known bad |
|---|---|---|
| Declared vs delivered size | `request-1280x720.json` with `wide-1280x720.png` | the same record with `wide-864x496.png` (IQ-03 on w, h and aspect) |
| A tier | `request-720p.json` with `wide-1280x720.png` | with `wide-864x496.png`: short side 496 |
| Format | `request-jpeg.json` (`jpg`) with `photo.jpg` | with `square-1024.png` (IQ-04) |
| Alpha | `request-cutout.json` with `cutout-rgba.png` | with `opaque-rgba.png` (IQ-05) |
| The right row | `manifest.json --id hero` takes `hero#2` (1280x720) | `manifest.json` with `wide-864x496.png` finds `hero#1` and fails |
| Declared vs nothing to compare | any of the above | `request-none.json`, `request-video-only.json` with a picture, `plan.json` with `photo.jpg`, `broken.json`, a missing record: all exit 3 |
| Video length and rate | `request-video.json` (3 s, 24 fps, `vo+bed`, 4:3, mp4) with `video/av.mp4` | `request-video-8s.json` (8 s, 30 fps) with `av.mp4`: VQ-03 twice |
| Sound declared | `request-video.json` with `av.mp4` (mean −24 dB) | with `silent-track.mp4` (−91 dB) or `moving.mp4` (no stream): AQ-01 |
| Silence declared | `request-video-off.json` (`"4s"`, `off`) with `moving.mp4` | with `av.mp4`: AQ-01 |

**Figures.** `file`, `plan`, `where` (the trail of the `declared` used, such as
`assets[0].declared`), `entry` (the trail of the object that named the file), `declared` (as
written), `figures` (as in `image`; a video adds `duration_s`, `container_duration_s`, `fps`, `audio` and,
when `audio` is declared, `audio_mean_db`), `compared[]` (`duration_s` rows carry `off_s` and `tol_s`),
`unchecked[]`, `fails[]`, `notes[]`.

## sheet

**Contract.** `sheet <file|dir>... --out contact.jpg|png [--cols N] [--cell 320] [--max 48]`: each
input becomes one `cell`×`cell` tile (scaled to fit, letterboxed in `#202020`, transparency
flattened onto `#6b6b6b`), and the tiles are laid out by ffmpeg's `tile` filter with 4 px padding
and a 4 px margin; unused cells are `#101010`. Folders contribute png, jpg, jpeg, webp and gif
files, sorted by name; the output file itself is never a tile. `--cols` defaults to the square root
of the count, rounded up. A video contributes its first frame. Inputs beyond `--max` are left off
and named in `notes`.

The sheet must measure `cols·cell + (cols−1)·4 + 8` by `rows·cell + (rows−1)·4 + 8`; anything else
is a failure (BQ-02).

| Separates | Good | Known bad |
|---|---|---|
| A complete sheet | `set/` (4 mixed pictures) `--cols 2`: 652x652, 4 tiles | `square-1024.png truncated.png`: exit 1, no sheet written |
| A partial last row | 3 files `--cols 2 --cell 200`: 412x412 | `empty.png`: BQ-01 |

**Figures.** `out`, `tiles`, `grid` (`colsxrows`), `cell`, `wh`, `bytes`, `order` (base names, left
to right, top to bottom: the sheet carries no text, so `order` is its legend).

## streams

**Contract.** `streams <video> [--audio yes|no|any] [--fps N] [--vcodec h264|any] [--pix-fmt yuv420p|any]`:
the file is a video fit to deliver and to concatenate. With no flags it asks for h264, yuv420p and
lets audio be either way. It is also where a clip's real length comes from: `video_duration_s` is
what `render_dur` records after render, never the length requested.

| Fails when | Code |
|---|---|
| the codec or pixel format is not the one asked (`yuvj420p` is named as full range) | VQ-02 |
| a dimension is odd; the pixels are not square (SAR not 1:1) | VQ-02 |
| `r_frame_rate` and `avg_frame_rate` differ by more than 0.5% (variable frame rate) | VQ-02 |
| the packet count is more than max(2, 1%) away from duration × fps | VQ-02 |
| the audio is not 44.1 or 48 kHz | VQ-02 |
| `--fps N` and the stream's rate differ by more than 0.01 | VQ-03 |
| `--audio yes` with no audio stream, `--audio no` with one, or the audio and picture lengths more than 0.5 s apart | AQ-01 |

No faststart (`moov` after `mdat`) and mono audio are notes, never failures. A silent audio track
passes: whether it sounds is `takes`' question.

| Separates | Good | Known bad |
|---|---|---|
| Constant rate | `video/av.mp4`: 24/24 fps, 72 of 72 frames | `video/vfr.mp4`, a 24/30/24 fps stream-copy concat: average 26, 156 frames for 144 (it keeps its 6 s, so a length check passes it) |
| Sample rate | `av.mp4`, 48 kHz | `audio96k.mp4` |
| Sound spans the picture | `av.mp4`, 0 s apart | `short-audio.mp4`, 1 s under 3 s: AQ-01 |
| Asked rate and audio | `av.mp4 --audio yes --fps 24` | `--fps 30` (VQ-03); `moving.mp4 --audio yes`; `av.mp4 --audio no` (AQ-01) |
| Pixel format | `av.mp4` yuv420p | `yuv444.mp4` |

**Figures.** `container`, `video_codec`, `w`, `h`, `pix_fmt`, `sar`, `fps`, `fps_avg`, `frames`
(packets counted), `frames_expected`, `video_duration_s`, `container_duration_s`, `audio_codec`,
`sample_rate`, `channels`, `audio_duration_s`, `av_offset_s`, `faststart` (null when the file is not
mp4 or mov).

## clipset

**Contract.** `clipset <clip|dir>...`: every clip agrees with the majority on `codec`, `wh`,
`pix_fmt`, `fps` (`r_frame_rate`), `sar` and `audio` (codec, rate and channels, or `none`), before
the concat. A folder contributes the mp4, m4v, mov and webm files directly inside it, sorted by
name. Each odd clip is named with its field and the majority's value (VQ-01). A tie takes the first
clip's value as the reference and says so in `notes`. One clip is exit 3: nothing to compare it with.

Why before the concat: a stream-copy concat of a 30 fps clip among 24 fps ones keeps its length, so
a duration check passes the cut (P2 §3 item 3); only the inputs show the mismatch, while it is still
free to fix.

| Separates | Good | Known bad |
|---|---|---|
| Matching inputs | `clips-good/`: three 1 s clips | `clips-bad/`: `clip-02.mp4` at 30 fps, named alone: `fps 30/1 (the others 24/1)` |
| Something to compare | three clips | one clip: exit 3 |

**Figures.** `clips`, `majority` (the six fields), `rows[]` (first 50: `file` and the six fields).

## motion

**Contract.** `motion <clip> --control <frozen clip> [--floor F]`: every one-second stretch of the
clip moves more than a still does. ffmpeg decodes every frame at the delivered size; `tblend`
(difference) and `signalstats` give the mean absolute luminance difference of each adjacent pair;
those are summed over every one-second window (fps pairs, sliding by one frame). The figure is the
**minimum** window, never the average: a clip that freezes in its middle passes an average.

The floor comes from the control, measured the same way: **1.5 × the control's highest window**,
and never under 1.0. `--floor F` overrides it (`floor_from` says which). `--control` is required
(exit 2 without it): a fixed floor is how this check once passed a still. A control that cannot be
measured is exit 3.

**Which control.** A locally frozen frame (`ffmpeg -loop 1 -i first-frame.png -t <dur> -r <fps>
-pix_fmt yuv420p frozen.mp4`) reads about 0, so the floor rests at 1.0 and the note says the floor
rests on a local control. That catches a still in a video container and a mid-clip freeze, but
not a route's static shimmer: a generated clip in which nothing moves can still read about 60 to 70
from re-render noise. The control that catches it is a locked static scene **rendered by the same
route** (paid, recorded once per route); against it the floor rises above the shimmer. The fixtures
show both sides of that gap.

| Separates | Good | Known bad |
|---|---|---|
| Live vs still | `video/moving.mp4`, minimum window 62.9 | `still.mp4` (bars): 0, floor 1.0 |
| Minimum vs average | `moving.mp4` | `freeze-mid.mp4`: minimum 0.008 at 1.92 s while the **mean** window, 37.3, is far above the floor |
| Route shimmer, local control | — | `shimmer-static.mp4` against `frozen.mp4`: 59.6 over a floor of 1.0, **exit 0**, with the local-control note (the known gap, kept visible) |
| Route shimmer, route control | `moving-shimmer.mp4` against `route-static.mp4`: 121.9 over 89.5 | `shimmer-static.mp4` against `route-static.mp4`: 59.6 under 89.5 |
| The control is required | `--control` given | no `--control`: exit 2; a missing control: exit 3 |

**Figures.** `w`, `h`, `fps`, `frames`, `window_frames`, `windows`, `min_window`, `min_window_at_s`,
`mean_window`, `max_window`, `control_min_window`, `control_max_window`, `floor`, `floor_from`. The
three to report are `min_window`, `control_max_window` and `floor`: "min 1-second window 62.9,
frozen control 0.0002, floor 1.0".

## endpoints

**Contract.** `endpoints <video> <first.png> <last.png> [--floor 0.8]`: the clip starts on the first
keyframe and ends on the last. The first frame and the video stream's own last frame (decoded from
1.5 s before the stream ends, never seeked from the container's end, which lands past the picture
when the audio runs longer) are compared with both images by ffmpeg `ssim` on 64-px-wide thumbnails
(composition, not grain). Each end must score at least the floor against its own image **and**
score higher against its own image than against the other one (VQ-05). Two keyframes that share a
background score about 0.9 against each other, so a floor alone passes a clip that never left the
first one. When the two images are the same picture, only the floor is compared.

| Separates | Good | Known bad |
|---|---|---|
| Right endpoints | `video/a-to-b.mp4 key-a.png key-b.png`: 0.9998 and 0.9996 | the images swapped: 0.075 each |
| Left the first frame | `a-to-b.mp4` | `stays-a.mp4 key-a.png key-b.png`: the last frame scores 0.075 |
| The closeness rule | `a-to-b.mp4` | `stays-a.mp4 key-a.png key-c.png` (key-c is key-a with one box changed): the last frame scores 0.917, above the floor, yet 0.9999 against key-a: only the closeness rule fails it |

**Figures.** `thumb`, `first_vs_first`, `first_vs_last`, `last_vs_last`, `last_vs_first`,
`images_ssim`, `floor`.

## takes

**Contract.** `takes <file> [--n N] [--floor -50] [--tol 0.5]`: the sound is in the piece. An audio
stream exists; it runs the length of the picture within `--tol` seconds; and each of `--n` equal
stretches has a mean volume (`volumedetect`) above the floor. An audio file alone is measured
without the span (a note says so). Every failure is AQ-01.

A silent AAC track passes a codec check and `streams` at −91 dB: "has audio" is not "has sound"
(P2 `takes.sh`). With `--n` equal to the number of takes, one take stretched over six clips, or
silent gaps around one take, shows as a silent stretch.

| Separates | Good | Known bad |
|---|---|---|
| Sound vs a silent track | `video/av.mp4`: mean −24.1 dB | `silent-track.mp4`: −91 dB |
| A stream at all | `av.mp4` | `moving.mp4`: no audio stream |
| Spans the picture | `av.mp4` | `short-audio.mp4`: 1 s under 3 s |
| Per stretch | `gap-audio.mp4` with `--n 1`: −16.8 dB, exit 0 (the whole-file mean hides the gap) | `gap-audio.mp4 --n 3`: stretch 2 of 3 at −80.3 dB |

**Figures.** `video_duration_s`, `audio_duration_s`, `av_offset_s`, `floor_db`, `stretches[]`
(`from_s`, `to_s`, `mean_db`; null is −inf).

## loudness

**Contract.** `loudness <file> [--target -16] [--tol 1] [--tp -1.5] [--tp-slack 0.2]`: EBU R128 by
ffmpeg `ebur128=peak=true`. The integrated loudness is within `--tol` LU of `--target`, and the true
peak is at most `--tp` plus `--tp-slack` (AQ-03). The defaults are −16 LUFS and −1.5 dBTP
(01-APPROACH §3); a bot or platform sets its own target with the flags. The 0.2 dB slack exists
because loudnorm lands true peak at −1.4 to −1.5, so a strict −1.5 fails a normalised mix on
jitter (P2 §4). No audio stream is AQ-01; a silent file reads −70 LUFS and fails.

| Separates | Good | Known bad |
|---|---|---|
| On target | `audio/mix-16.wav`: −16.0 LUFS | `mix-23.wav`: −7 LU; `mix-14.wav`: +2 LU (the v3 episode was 2 LU hot) |
| A set target | `mix-23.wav --target -23` | `mix-23.wav` at the default |
| True peak | `mix-tp14.wav`: −15.4 LUFS, peak −1.4 dBTP, inside the slack | `mix-peak.wav`: −0.5 dBTP; `mix-tp14.wav --tp-slack 0` |

**Figures.** `integrated_lufs`, `true_peak_dbtp`, `lra_lu`, `target_lufs`, `tol_lu`, `off_lu`,
`tp_max_dbtp`, `tp_slack_db`, `duration_s`.

## plan-measured

**Contract.** `plan-measured <plan.json> [--root DIR] [--tol 0.1] [--max-gap 2.5] [--max-tail 1.5]`:
the timing contract (`plan.json` `rows`: `n`, `start`, `dur`, `vo`, `vo_start`) holds against the
voiceover takes that exist. A row with a non-empty `vo` has a take: its `vo_file` (relative to the
plan's folder, or `--root`), else `audio/vo-NN.<wav|mp3|m4a|aac|flac|ogg|opus>` with NN the row's
`n` in two digits. Each take is measured by ffprobe.

| Fails when (AQ-02) | Why |
|---|---|
| a typed length (`vo_measured_s`, `vo_dur` or `vo_s`) is more than `--tol` from the measured one | the duration was typed, not measured (legacy QC-02) |
| the take is longer than its row's `dur` | an overrun: no later step can make time. An underrun is not a defect |
| `vo_start` is before the row's `start`, or the take ends past the row's end | a line must not open before its picture or run into the next shot |
| a row has no `start` or `dur` | its window was never written |
| the largest silence anywhere (lead-in included) is over `--max-gap` | one long gap is the failure the timing contract exists for |
| the tail is over `--max-tail` | spare seconds pooled at the end |
| a third of the runtime has no speech | the words bunched at one end |

A silence that overlaps a row with an empty `vo` is intended (a shot meant to carry the picture
alone): it is listed in `gaps[]` with `exempt_by_shots` and in `notes`, and never counted. The
runtime is `declared.duration_s`, else the end of the last row. **A missing take is exit 3, never
1**: P2 found the legacy `plan-measured.sh` reported R08 as a failure because the capture lacked
`audio/`; missing evidence is a gap to close, not a fault in the plan. A plan with no rows, or no row
with a `vo`, is exit 3 too.

| Separates | Good | Known bad |
|---|---|---|
| Measured vs typed | `plans/timeline/plan-good.json` (row 1 types 2.2 s; row 2 names its `vo_file`) | `plan-typed.json`: row 2 types 3.0 s for a 2.2 s take |
| Fits its window | `plan-good.json`, 3 s windows | `plan-overrun.json`: a 2.2 s take in a 2 s window |
| Inside its shot | `plan-good.json` | `plan-early.json`: `vo_start` 2.8 for a shot at 3 |
| Spread vs pooled | `plan-good.json`: largest gap 0.8 s, tail 0.5 s | `plan-gap.json`: a 2.8 s gap and a 2.7 s tail |
| Intended silence | `plan-silent-shot.json`: a 2.7 s gap across an empty shot, exempt | — |
| Evidence present | any of the above | `timeline-noaudio/plan.json` (no `audio/`), `plan-norows.json`, a missing plan: exit 3 |

**Figures.** `runtime_s`, `takes`, `rows[]` (`n`, `file`, `measured_s`, `typed_s`, `start`, `dur`,
`vo_start`, `vo_end`), `speech_s`, `coverage_pct`, `lead_s`, `largest_gap_s`, `largest_gap_from_s`,
`tail_s`, `gaps[]`, `thirds` (three booleans). Report the largest gap next to the coverage, always.

## duck

**Contract.** `duck <mix> --bed <bed as mixed> --plan plan.json [--root DIR] [--min-sep 9]
[--max-depth 12] [--sync-tol 1]`: the bed dips under the voice and comes back, measured both ways,
because a one-way check passed a bed muted to silence (fal's video-production skill, VP:512-524).

- **Speech regions** are each take's `[vo_start, vo_start + measured]` from the plan (as
  `plan-measured` finds them), trimmed 0.15 s at each end for the attack. **Bed-only regions** are
  the rest of the timeline kept 0.5 s clear of any speech (release), in pieces of 0.4 s or more.
- `--bed` is the bed **as mixed**: the sidechain-compressed bed, written as its own stem at mix
  time, before the voice is added. The bed before ducking cannot show the duck; given that, the
  note says the bed does not dip.
- Loudness is EBU R128 integrated (`ebur128`) over the joined regions, on the mix and on the stem.
  The stem's gain into the mix is read where the mix is the bed alone, so a mix normalised after
  ducking measures the same.

| Fails when (AQ-04) | Measured as |
|---|---|
| **Bed too loud:** speech is under `--min-sep` (9) LU above the bed under it | speech = the mix over speech regions minus the bed's power there; separation = speech − bed |
| **Bed vanished:** the bed under speech is digital silence, or drops more than `--max-depth` (12) dB below its own bed-only level | depth = the stem's bed-only loudness − its loudness under speech |
| **No bed:** the stem is silent where it plays alone | — |

**Exit 3, never 0, when:** the mix's length is more than `--sync-tol` seconds from the plan's runtime
(the timeline is trusted only when it holds: P2's `vom` false positive on UC1-0910 came from a
29.9 s final against a 32 s plan); a take, the plan or the bed stem is missing; or there is no
bed-only region, so the depth cannot be measured (P2: "R04: cannot (no gaps)").

| Separates | Good | Known bad |
|---|---|---|
| A dip | `plans/timeline/duck/mix-ducked.wav` with `bed-ducked.wav`: speech 22.1 LU over the bed, duck 7.9 dB | `mix-loud.wav` (no duck): 3.2 LU, bed too loud |
| A dip, not a mute | `mix-ducked.wav` | `mix-muted.wav`: digital silence under speech; `mix-deep.wav`: 15 dB, with separation 29.2 (the one-way check passes it) |
| Normalised after the duck | `mix-ducked-norm.wav` (+6 dB): the same 22.1 and 7.9, stem gain 6 dB | — |
| A trusted timeline | `plan-duck.json` (12 s) | `plan-duck-long.json` (15 s against a 12 s mix): exit 3 |

**Figures.** `mix_duration_s`, `plan_runtime_s`, `bed_duration_s`, `speech_regions`, `speech_s`,
`bed_only_regions`, `bed_only_s`, `mix_speech_lufs`, `mix_bed_only_lufs`, `bed_under_speech_lufs`,
`bed_only_lufs`, `bed_in_mix_under_speech_lufs`, `speech_lufs`, `stem_gain_db`, `separation_lu`,
`duck_depth_db`, `min_sep_lu`, `max_depth_db`. The two to report are `separation_lu` against 9 and
`duck_depth_db` against 12.

## identical

**Contract.** `identical <dir> <dir>...`: the copies of a kit were left untouched, and are copies.
Every media file (the `artifact` extensions) at the same relative path in two or more of the
folders must have the same sha256 (BQ-03). A copy must be a copy: a folder that is a link, two
arguments that are the same folder, a media file or folder inside a copy that is a symlink, or a file
hard-linked across copies (one inode) is BQ-03, because each hashes equal without anything having
been copied. At least one file must appear in two copies; files found in one copy only are counted
in `notes`. Fewer than two folders is exit 2; a missing folder is BQ-01.

| Separates | Good | Known bad |
|---|---|---|
| Untouched copies | `kits/kit kits/copy-1 kits/copy-2`: 2 of 2 shared files identical | `kit copy-changed`: one byte of `side.jpg` |
| A copy vs a link | `copy-1` | `copy-link` (a link to `kit`); `copy-hard` (`hero.png` hard-linked) |
| Something copied | `copy-1` | `elsewhere`: no file in common |

**Figures.** `copies`, `shared`, `identical`, `only_in_one`, `files[]` (first 50: `file`, `copies`,
the first 16 hex of `sha256`).

## QC codes

Every `fails[]` entry starts with one of these. BQ is any file, IQ a picture, VQ a video stream, AQ
its sound. **VQ-nn and AQ-nn are machine codes; VC1–VC7 (no dash) are the owner's validation
criteria in 01-APPROACH, and a code never stands in for an owner verdict.** A legacy QC number is
kept in the Origin column so counts carry across runs.

| Code | Failure | Raised by | Origin |
|---|---|---|---|
| BQ-01 | Nothing delivered: missing or empty | every check | legacy base studio, `artifact.sh` |
| BQ-02 | Wrong kind: bytes differ from the extension, it does not decode, or it lacks the stream the check needs | every check | legacy base studio, `artifact.sh` (decode added here) |
| BQ-03 | Copies differ, or are links rather than copies | identical | legacy `identical.sh`; new code in 1.1.0 |
| IQ-01 | Geometry drift: a wall, window or the camera view moved | not checked; owner review | legacy image studio |
| IQ-02 | Background not white: under 98% of the ground within 3/255 of white | not checked; a bot-parameterised measurement is queued | legacy image studio |
| IQ-03 | Wrong size: not the size asked (dimensions, short side, aspect, long side) | image, declared | legacy image studio; aspect and long side added here |
| IQ-04 | Wrong format: the encoded format is not the one asked | image, declared | new in 1.0.0 |
| IQ-05 | Wrong alpha: transparency required but absent, or forbidden but present | image, declared | new in 1.0.0 |
| VQ-01 | Clip set mismatch: a clip differs from the majority on codec, size, pixel format, fps, SAR or audio layout | clipset | legacy QC-01 |
| VQ-02 | Stream defect: codec, pixel format, odd size, non-square pixels, variable frame rate, frame count, audio sample rate | streams | legacy QC-10 |
| VQ-03 | Not the declared length or rate | declared, streams `--fps` | legacy QC-11 (drift), now against the video stream with max(1 s, 10%) |
| VQ-04 | Frozen: the quietest one-second window is under the control's floor | motion | new in 1.1.0 (fal's video-generation motion check, VG:497-507) |
| VQ-05 | Wrong endpoints: the first or last frame is not its keyframe | endpoints | legacy `endpoints.sh`; new code in 1.1.0 |
| AQ-01 | No sound: no audio stream where asked, sound where declared silent, a silent track or stretch, or audio and picture lengths apart | takes, streams, declared | legacy `takes.sh` and QC-10's "audio none"; new code in 1.1.0 |
| AQ-02 | Timing not as planned: typed not measured, overrun, outside its shot, a long gap or tail, an empty third | plan-measured | legacy QC-02 (exit 3 for missing takes, not 1) |
| AQ-03 | Loudness off target: integrated or true peak | loudness | legacy QC-14 |
| AQ-04 | Duck wrong: bed too loud under speech, or vanished (silent, or deeper than 12 dB) | duck | legacy QC-15 (VO buried), made two-way |

## Self-test fixtures (IMG-T3, VID-T3)

`scripts/fixtures.sh <dir>` writes them with ffmpeg, node and POSIX tools; `scripts/selftest.mjs`
builds them in a temporary folder and runs 144 cases in 1.1.0 (exit code, one JSON line, and the
separating figure). Video fixtures are 320x240 at 24 fps; h264 ones need libx264 and are skipped
without it.

| Fixture | What it is | Used to prove |
|---|---|---|
| `square-1024.png`, `wide-1280x720.png`, `photo.jpg`, `still.gif`, `pixel.webp` | Good pictures (the WebP is a fixed 1x1 from bytes, so no encoder is needed) | exit 0 on artifact, image, declared |
| `wide-864x496.png` | The size two signed releases shipped as "720p" | IQ-03 on aspect, size and tier |
| `opaque-rgba.png` / `cutout-rgba.png` | An alpha channel with every pixel opaque / a disc on a transparent ground | IQ-05 both ways |
| `deep-16bit.png` | 16-bit PNG | `bit_depth` 16 |
| `jpeg-named.png`, `text-named.mp4` | Bytes that are not what the name says | BQ-02 |
| `truncated.png` | The first 60% of a PNG | BQ-02 through the decode, where ffprobe alone passes it |
| `empty.png`, `notes.txt` | 0 bytes; no magic rule | BQ-01; exit 3 |
| `clip.mp4`, `clip.mov`, `clip.webm`, `tone.wav`, `tone.mp3` | 1 s containers | artifact's video and audio rows (webm and mp3 are skipped when the encoder is missing) |
| `set/` | 4 pictures of mixed size and format | artifact on a folder; sheet |
| `plans/*.json` | Request records, a plan, media-ai-gen's manifest shape, a broken file, three video declarations | every `declared` lookup path and every exit 3 |
| `video/moving.mp4`, `frozen.mp4`, `still.mp4`, `freeze-mid.mp4` | Motion, a locally frozen control, bars, a 1.5 s mid-clip freeze | motion: VQ-04, minimum vs average |
| `video/route-static.mp4`, `shimmer-static.mp4`, `moving-shimmer.mp4` | Static shimmer (temporal noise on a still) as a route renders it, and motion under it | motion: the local-control gap and the route control that closes it |
| `video/av.mp4`, `vfr.mp4`, `audio96k.mp4`, `short-audio.mp4`, `silent-track.mp4`, `gap-audio.mp4`, `yuv444.mp4` | A good h264/AAC clip and one planted stream defect each | streams, takes, declared |
| `clips-good/`, `clips-bad/` | Three agreeing 1 s clips; the same with `clip-02` at 30 fps | clipset |
| `video/key-a.png`, `key-b.png`, `key-c.png`, `a-to-b.mp4`, `stays-a.mp4` | Two distinct keyframes, a near-twin, a fade from A to B, a clip that stays on A | endpoints, including the closeness rule |
| `audio/mix-16.wav` … `mix-peak.wav` | 1 kHz stereo tones at −16, −23 and −14 LUFS; bursts to −1.4 and −0.5 dBTP | loudness |
| `plans/timeline/` | Three 2.2 s takes in `audio/`, eight plans, and `duck/` (a voice track, four beds as mixed and their mixes, one normalised) | plan-measured and duck |
| `kits/` | A kit, two real copies, a changed copy, a linked folder, a hard link, an unrelated folder | identical |

## Adding a check

A check ships only with its known-bad twin (HR13). For each new subcommand (the queue is in the
studio's learnings):
1. Add the function and its `COMMANDS` and `USAGE` entries in `scripts/mediaqc.mjs`. It returns
   `[exit, figures]`, puts a QC code at the start of every `fails[]` entry, and uses exit 3 for
   missing evidence.
2. Add a good and a known-bad fixture to `scripts/fixtures.sh`.
3. Add cases to `scripts/selftest.mjs` that assert the exit code and the figure that separates them.
4. Add a section here: contract, the good and bad cases, figures, codes.
5. Run the self-test, then check that a deliberately broken copy of the check makes it exit 1. For
   1.1.0 each new check was broken once in a copy (twelve mutations: the VFR test, the clipset
   comparison, the minimum window, the control's floor, the closeness rule, the stretches, the true
   peak, missing takes as exit 3, the gap rule, the vanished-bed rule, the inode test, a silent track
   counted as sound); every one turned a case WRONG and the self-test to exit 1.
