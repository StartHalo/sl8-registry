# media-qc checks: contracts, cases and figures

## Contents
- [Conventions](#conventions)
- [artifact](#artifact)
- [image](#image)
- [declared](#declared)
- [sheet](#sheet)
- [QC codes](#qc-codes)
- [Self-test fixtures (IMG-T3)](#self-test-fixtures-img-t3)
- [Adding a check](#adding-a-check)

## Conventions

- **One JSON line on stdout** per run: `{"check", "exit", …figures…, "fails": [], "notes": [], "mediaqc": "1.0.0"}`.
  `exit` in the JSON always equals the process exit code.
- **Exit codes:** 0 the file is what was asked · 1 it is not · 2 usage · 3 cannot check. When a run
  finds both a failure and something it cannot check, 1 wins.
- **Every `fails[]` entry starts with its QC code** (`BQ-02 hero.png: named .png but the bytes are jpeg`).
  `notes[]` carries what was not compared and why; it never changes the exit code.
- **Dependencies:** node >= 20, ffprobe and ffmpeg. No ImageMagick, python, jq or npm package. It
  runs on an ffmpeg built without `drawtext` (the P2 host had none).
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

**Contract.** `declared --plan F --file F [--id ID] [--tol 0.01]`: find the declaration for the
file, measure the file as `image` does, and compare every declared field.

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
mov, webm), `alpha` (`required`/`true`, `forbidden`/`false`). `duration_s`/`duration`/`dur_s`, `fps`
and `audio` are listed under `unchecked` in 1.0.0. A value the check cannot read (`resolution: "2K"`,
`format: "json"`) is named in `notes` and not compared.

**Exit 3, never 0, when:** the record does not exist or is not JSON; nothing names the file and the
root declares nothing; the named entry and everything above it declare nothing; `--id` matches
nothing; or the declaration holds no field 1.0.0 compares (only video fields, say). P2 found the
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
| Declared vs nothing to compare | any of the above | `request-none.json`, `request-video-only.json`, `plan.json` with `photo.jpg`, `broken.json`, a missing record: all exit 3 |

**Figures.** `file`, `plan`, `where` (the trail of the `declared` used, such as
`assets[0].declared`), `entry` (the trail of the object that named the file), `declared` (as
written), `figures` (as in `image`), `compared[]`, `unchecked[]`, `fails[]`, `notes[]`.

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

## QC codes

| Code | Failure | media-qc 1.0.0 | Origin |
|---|---|---|---|
| BQ-01 | Nothing delivered: missing or empty | artifact, image, declared, sheet | legacy base studio, `artifact.sh` |
| BQ-02 | Wrong kind: bytes differ from the extension, or it does not decode | artifact, image, declared, sheet | legacy base studio, `artifact.sh` (decode added here) |
| IQ-01 | Geometry drift: a wall, window or the camera view moved | not checked; owner review | legacy image studio |
| IQ-02 | Background not white: under 98% of the ground within 3/255 of white | not checked; a bot-parameterised measurement is queued | legacy image studio |
| IQ-03 | Wrong size: not the size asked (dimensions, short side, aspect, long side) | image, declared | legacy image studio; aspect and long side added here |
| IQ-04 | Wrong format: the encoded format is not the one asked | image, declared | new in media-qc 1.0.0 |
| IQ-05 | Wrong alpha: transparency required but absent, or forbidden but present | image, declared | new in media-qc 1.0.0 |

The video codes (QC-01 clip mismatch, QC-02 plan-measured, QC-10 streams, QC-11 drift, QC-14
loudness) keep their legacy numbers when their checks arrive with Video Studio.

## Self-test fixtures (IMG-T3)

`scripts/fixtures.sh <dir>` writes them with ffmpeg and node only; `scripts/selftest.mjs` builds
them in a temporary folder and runs 65 cases in 1.0.0 (exit code, one JSON line, and the separating figure).

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
| `plans/*.json` | Request records, a plan, media-ai-gen's manifest shape, a broken file | every `declared` lookup path and every exit 3 |

## Adding a check

A check ships only with its known-bad twin (HR13). For each new subcommand (the Video Studio queue
is in the studio's learnings):
1. Add the function and its `COMMANDS` and `USAGE` entries in `scripts/mediaqc.mjs`. It returns
   `[exit, figures]`, puts a QC code at the start of every `fails[]` entry, and uses exit 3 for
   missing evidence.
2. Add a good and a known-bad fixture to `scripts/fixtures.sh`.
3. Add cases to `scripts/selftest.mjs` that assert the exit code and the figure that separates them.
4. Add a section here: contract, the good and bad cases, figures, codes.
5. Run the self-test, then check that a deliberately broken copy of the check makes it exit 1.
