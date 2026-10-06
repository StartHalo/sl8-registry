---
name: media-qc
description: >-
  Measures delivered media with deterministic scripts and prints the figures, never a verdict word.
  Pictures: kind by magic bytes against the extension, size, aspect, format, real alpha, bit depth.
  Video: streams fit to deliver and concatenate (codec, pixel format, constant fps, frame count,
  sample rate), clips that disagree before a concat, motion against a frozen control, first and last
  frames against keyframes, declared duration, fps and audio. Audio: sound in every stretch,
  loudness (LUFS, true peak), a duck that dips under the voice and comes back, voiceover takes
  against the plan timing. Also kit copies and contact sheets. Use when: after every generation,
  edit or mix and before delivery; check or measure an image, clip, mix or voiceover; wrong size or
  alpha, frozen clip, wrong fps, silent track, A/V drift, loudness, ducking; declared vs delivered.
  NOT for: generating images (media-image-generation); edits (media-photo-editing); running models,
  manifests and gates (media-ai-gen); taste (owner review).
license: SL8 (native)
compatibility: "sl8-image >=1.0.0 and sl8-video >=1.0.0 (Base 2.0.2); node >=20; ffmpeg and ffprobe 5.1 or later (Debian build: ebur128, tblend, signalstats, ssim); no ImageMagick or python needed"
metadata:
  version: 1.1.0
  revision: 2026-10-06a
  house-rules: HR-1.0
  upstream: native
---

# media-qc: measure the file, print the figures

A quality rule that can be measured is measured here, by a script, not by eye and not by prose
(HR13). Each check answers one question about a file, prints **one JSON line of figures** and sets
an exit code. **You never write PASS** (HR14): you report the figures and the exit code, and taste
goes to the owner.

```bash
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
node $Q artifact artifacts/<project>/<node>/hero.png
node $Q motion artifacts/<project>/clips/shot-01.mp4 --control work/<project>/frozen-01.mp4
```

## Exit codes

| Exit | Meaning | What you do |
|---|---|---|
| 0 | The file is what was asked | Copy the figures into the manifest row's `measured` and the delivery note |
| 1 | It is not. Each `fails[]` entry starts with its QC code | The item failed: one retry that moves a named lever (HR7), or a debt named in the hand-off (HR15) |
| 2 | Usage error | Fix the command; nothing was measured |
| 3 | Cannot check: nothing declared, a take, plan or control missing, no rule for that kind, or a tool missing | Report "not checked" with the printed `error`, never as passed. Declare next time (HR1); report a missing tool, never install it (HR21) |

## When to run which check

| Moment | Run | It catches |
|---|---|---|
| Each generation or local edit lands | `artifact` on the file, then `declared` against its manifest row or request record | The empty download, the wrong kind, the route that ignored the size or length you asked for (HR3) |
| The brief names a property no record declares | `image` with flags: `--alpha required` for a cutout, `--aspect 4:5`, `--min-long 1600` | The property, measured on the file itself |
| Each clip lands | `streams` (its `video_duration_s` is the `render_dur` you record), `motion` against a frozen control, `endpoints` when the route took a first and last frame | A variable frame rate, a still in a video container, a clip that never reached its last frame |
| Before a concat | `clipset` on the clips folder | The clip at another fps, size, pixel format or audio layout, while it is still free to fix |
| The voiceover takes are placed | `plan-measured` on `plan.json` | A typed length, an overrun, a line outside its shot, a long gap or tail, an empty third |
| The mix is made | `duck` (the mix, the bed as mixed, the plan), then `takes`, then `loudness` on the normalised mix | A bed that buries the voice or vanishes, a silent stretch, a programme off target |
| Kit copies are made | `identical` on the copies | A copy that changed, or a link posing as a copy |
| Before delivery | `artifact` on the delivery folder, `declared` for every deliverable, `streams --audio yes` on a final with sound, `sheet` of the set into `artifacts/<project>/qc/` | The last figures are the ones the owner reads; the sheet is their review artefact |
| After a retry | The same check, unchanged | Whether the lever moved the figure |

Never change a flag, a tolerance or a control to turn an exit 1 into an exit 0. If a check itself
looks wrong, run the self-test (below) before you trust or distrust its figures.

## Declare first, then assert (HR1)

`declared` compares the file with a `declared` object written **before** the paid call: on the
manifest row (`manifest.mjs add` requires one), in `plan.json`, or in a request record.

```json
{"declared": {"width": 1280, "height": 720, "aspect": "16:9", "format": "mp4", "duration_s": 4, "fps": 24, "audio": "off"}}
```

| Field (aliases) | Compared as | Code |
|---|---|---|
| `w`/`width`, `h`/`height` | Exact pixels | IQ-03 |
| `resolution`/`size` | `1280x720` exact, or `720p` = short side 720 | IQ-03 |
| `aspect`/`aspect_ratio` | `W:H`, within `--tol` (default 0.01 = 1%) | IQ-03 |
| `min_long` | Long side at least N px | IQ-03 |
| `format` | png, jpeg (jpg), webp, gif, mp4, mov or webm, read from the magic bytes | IQ-04 |
| `alpha` | `required`/`true`: some pixel is not opaque; `forbidden`/`false`: none is | IQ-05 |
| `duration_s`/`duration`/`dur_s` | `4` or `"4s"` against the video stream's length, within max(1 s, 10%) (`--dur-tol`) | VQ-03 |
| `fps` | The stream's frame rate, within 0.01 | VQ-03 |
| `audio` | `off`/`false`/`none`/`silent`: no sound; any other value (`true`, `vo+bed`): sound, meaning an audio stream above −60 dB mean | AQ-01 |

On a picture, `duration_s`, `fps` and `audio` are listed under `unchecked`.

**Lookup.** The entry that names the file (`file`, `path`, `output`, `out`, `local_path` or a
`files[]` entry), else an object above it, else the root. `--id` picks the entry instead: an exact
`id` (`hero#2`), else the latest row with that `item`, else the first with that `node`. The JSON
line says where it found the declaration (`where`, `entry`).

**No declaration is exit 3, never 0.** A size that was never written down cannot be checked. Use
`image --aspect W:H` as the fallback that still catches an 864×496 sent back for a 16:9 720p.

## The checks

Full contracts, the good and bad cases each one separates, and every printed figure:
[references/checks.md](references/checks.md).

**`artifact <file|dir>...`** Each file exists, is not empty, its magic bytes match its extension
(png, jpg/jpeg, webp, gif, mp4, mov, webm, wav, mp3), and its first frame (or first second of
audio) decodes. A folder is walked for those extensions. An extension with no magic rule is exit 3.

**`image <file> [--w W] [--h H] [--aspect W:H] [--tol 0.01] [--min-long N] [--alpha required|forbidden] [--format png|jpeg|webp|gif]`**
Measures one picture and compares it with the flags you give. With no flags it only measures.
`alpha_channel` says the format can carry alpha; `real_alpha` says some pixel is actually
transparent (`transparent_share` of them). An RGBA PNG whose pixels are all opaque fails
`--alpha required`.

```json
{"check":"image","exit":1,"file":"hero.png","figures":{"w":864,"h":496,"aspect":"54:31","aspect_value":1.7419,"nearest_aspect":"16:9","nearest_off_pct":2.02,"real_alpha":false},"compared":[{"field":"aspect","want":"16:9 (1.7778)","got":"54:31 (1.7419)","match":false,"off_pct":2.02,"tol_pct":1}],"fails":["IQ-03 aspect 864x496 = 1.7419 is 2.02% off 16:9 (1.7778); tolerance 1%"],"notes":[],"mediaqc":"1.1.0"}
```

**`declared --plan plan.json|request.json|manifest.json --file F [--id ID] [--tol 0.01] [--dur-tol 0.1]`**
Measures F and compares each declared field (table above), printing the declaration, where it was
found, the `compared` rows and the `unchecked` fields.

**`sheet <file|dir>... --out contact.jpg [--cols N] [--cell 320] [--max 48]`** One contact sheet by
ffmpeg (no text overlay); `order` names each tile, left to right and top to bottom. An input that
does not decode is exit 1 and **no sheet is written**.

**`streams <video> [--audio yes|no|any] [--fps N] [--vcodec h264|any] [--pix-fmt yuv420p|any]`**
h264 and yuv420p by default, even dimensions, square pixels, a constant frame rate, a frame count
that matches duration × fps, 44.1 or 48 kHz audio within 0.5 s of the picture. VQ-02 for the format,
VQ-03 for `--fps`, AQ-01 for sound asked and missing. No faststart is a note.

**`clipset <clip|dir>...`** Every clip agrees with the majority on codec, size, pixel format, fps,
SAR and audio layout; each odd one is named with its field (VQ-01). One clip is exit 3.

**`motion <clip> --control <frozen clip> [--floor F]`** The mean luminance difference of each frame
pair, summed over every one-second window; the **minimum** window is the figure. The floor is 1.5 ×
the control's highest window, never under 1.0 (VQ-04). Build a local control by repeating the clip's
first frame for its duration through the same encode (`ffmpeg -loop 1 -i first.png -t <dur> -r <fps>
-pix_fmt yuv420p frozen.mp4`); it reads about 0 and catches stills and mid-clip freezes, and the
note says the floor rests on it. Route shimmer (a static generated clip reading 60 to 70) is caught
only by a static scene **rendered by the same route** as the control.

**`endpoints <video> <first.png> <last.png> [--floor 0.8]`** SSIM of the first and last frames
against both keyframes; each end must reach the floor and be closer to its own image (VQ-05).

**`takes <file> [--n N] [--floor -50] [--tol 0.5]`** An audio stream exists, spans the picture, and
each of N stretches is above −50 dB mean (AQ-01). A silent AAC track passes a codec check; not this.

**`loudness <file> [--target -16] [--tol 1] [--tp -1.5] [--tp-slack 0.2]`** EBU R128 integrated
loudness within ±1 LU of the target, true peak at most −1.5 dBTP plus 0.2 dB of loudnorm slack
(AQ-03). The target is a bot or platform parameter; −16 LUFS is the default.

**`plan-measured <plan.json> [--root DIR] [--tol 0.1] [--max-gap 2.5] [--max-tail 1.5]`** Each
row's take (`vo_file`, else `audio/vo-NN.*` beside the plan) measured by ffprobe: a typed length
within 0.1 s, no overrun, inside its own shot; then no gap over 2.5 s, no tail over 1.5 s, speech in
every third (AQ-02). A gap across a shot with an empty `vo` is intended silence. **A missing take is
exit 3**, never a failure.

**`duck <mix> --bed <bed as mixed> --plan plan.json [--min-sep 9] [--max-depth 12] [--sync-tol 1]`**
Two ways (AQ-04): speech at least 9 LU above the bed under it (**bed too loud**), and the bed under
speech within 12 dB of its own bed-only level and never digital silence (**bed vanished**). Speech
regions come from the plan's `vo_start` and the measured takes. `--bed` is the **bed as mixed**:
write the sidechain output as its own stem at mix time; the bed before ducking cannot show a duck.
A mix that does not run the plan's length (±1 s) is exit 3: its timeline is not trusted.

**`identical <dir> <dir>...`** Every media file at the same path in two or more copies has the same
sha256, and each copy is a real copy: no linked folder, symlinked file or shared hard link (BQ-03).

## Reporting figures (HR14)

- Write the measured figure next to the asked one, with the check and its exit code: "hero.png is
  864×496 (aspect 1.7419, 2.02% off 16:9), declared 1280×720: `mediaqc declared` exit 1, IQ-03."
- **Motion:** three numbers per clip: "min 1-second window 62.9, frozen control 0.0002, floor 1.0
  (local control)". A clip under the floor is flagged for the fence, not silently rejected.
- **Mix:** the separation against 9 LU, the duck depth against 12 dB, and the programme loudness
  and true peak: "speech 22.1 LU over the bed, duck 7.9 dB, −16.0 LUFS, −1.6 dBTP".
- **Timing:** the largest gap next to the coverage, always: "largest gap 0.8 s, coverage 73%".
- Never write PASS, OK, "verified" or "looks good" for anything a check measures. An exit 0 is
  reported as the figures that matched.
- An exit 3 is reported as "not checked" with its reason, and listed as a debt in the hand-off
  (HR15).
- Put the figures into the manifest row's `measured` block (HR9).
- Composition, likeness, text legibility, realism, continuity across cuts and cutout edges are not
  measured here. List them as review items for the owner and attach the contact sheet.

## QC codes

| Code | Failure | Raised by |
|---|---|---|
| BQ-01 | Nothing delivered: the file or folder is missing or empty | every check |
| BQ-02 | Wrong kind: the bytes differ from the extension, it does not decode, or it lacks the stream asked | every check |
| BQ-03 | Copies differ, or are links rather than copies | identical |
| IQ-03 | Wrong size: dimensions, short side, aspect or long side are not as asked | image, declared |
| IQ-04 | Wrong format: the encoded format is not the one asked | image, declared |
| IQ-05 | Wrong alpha: transparency required but absent, or forbidden but present | image, declared |
| VQ-01 | Clip set mismatch before a concat | clipset |
| VQ-02 | Stream defect: codec, pixel format, odd size, non-square pixels, variable frame rate, frame count, sample rate | streams |
| VQ-03 | Not the declared or asked duration or fps | declared, streams |
| VQ-04 | Frozen: a one-second window under the control's floor | motion |
| VQ-05 | Wrong endpoints: first or last frame is not its keyframe | endpoints |
| AQ-01 | No sound where asked, sound where declared silent, a silent stretch, or audio and picture apart | takes, streams, declared |
| AQ-02 | Timing not as planned | plan-measured |
| AQ-03 | Loudness or true peak off target | loudness |
| AQ-04 | Duck wrong: bed too loud, or vanished | duck |

VQ-nn and AQ-nn are machine codes; VC1–VC7 are the owner's validation criteria, and a code never
stands in for an owner verdict. IQ-01 and IQ-02 are legacy image codes with no check yet; the legacy
QC-nn number behind each video and audio code is in references/checks.md.

## Self-test (Studio checks IMG-T3, VID-T3)

```bash
node $HOME/.agents/skills/media-qc/scripts/selftest.mjs
```

It builds synthetic good and known-bad fixtures with ffmpeg (`scripts/fixtures.sh`), runs every
check on both, and asserts the exit code, the single JSON line and the figures that separate them
(144 cases). It exits 0 when every case behaves and 1 when a check has stopped telling good from
bad. A fixture this ffmpeg cannot encode (webm, mp3, h264) is printed as `skip`.

## Not in media-qc 1.1.0

- **Route-rendered motion controls** are not recorded yet: each costs one short static render per
  route (VID-T5). Until a route has one, the floor rests on a local control and the delivery note
  says so.
- **Unplanned cuts inside a clip** (a scene-cut count), **labelled or video-sampled contact sheets**
  and **similarity to a reference** (identity, geometry drift) are owner review; they are queued in
  the studio's learnings.
- **Bot rules** such as a white ground, subject fill or palette count (Amazon's 255 / 85% / 1600 px)
  are bot parameters, not base checks.

## House rules (HR-1.0)

Relies on: HR1 (`declared` and `plan-measured` read what was declared; a missing declaration or take
is exit 3), HR3 (a dropped parameter shows only in the measured file), HR7 (an exit 1 is the failed
attempt the retry rule counts), HR8 (the sheet goes to `artifacts/<project>/qc/`), HR9 (the figures
go to the manifest's `measured`), HR13, HR14, HR15 (an exit 3 or an `unchecked` field is a debt
named in the hand-off), HR19 (when to run each check is an ordered table, not a warning), HR20 (a
waived check still runs and its figures are reported), HR21 (a missing tool is exit 3 and a report,
never an install) — see media-ai-gen/references/house-rules.md.

Not applicable: HR2, HR4, HR5, HR6, HR12, HR16, HR22 (no model call, credits or prompt: media-qc runs
only local ffprobe and ffmpeg); HR10, HR11 (it measures and never edits a file); HR17, HR18 (no
likeness, voice or claim is judged here; those are owner review items).
