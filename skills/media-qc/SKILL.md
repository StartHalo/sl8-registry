---
name: media-qc
description: >-
  Measures delivered media with deterministic scripts and prints the figures, never a verdict word:
  checks, verifies, validates and measures an image or video file's kind (magic bytes against the
  extension), dimensions, aspect, format, real alpha (transparent pixels, not just an alpha
  channel) and bit depth; compares declared vs delivered against the plan, request record or
  manifest; builds a contact sheet of a set for review. Use when: after every generation or edit
  and before delivery; check, verify, validate or measure an image or video; dimensions, size,
  aspect, alpha, transparency, format, wrong extension, empty or corrupt file; declared vs
  delivered; contact sheet. NOT for: generating images (media-image-generation); edits, cutouts or
  composites (media-photo-editing); running models, manifests and gates (media-ai-gen); judging
  taste (the owner's review).
license: SL8 (native)
compatibility: "sl8-image >=1.0.0 (Base 2.0.2); node >=20; ffmpeg and ffprobe (Debian build); no ImageMagick or python needed"
metadata:
  version: 1.0.0
  revision: 2026-10-05a
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
```

## Exit codes

| Exit | Meaning | What you do |
|---|---|---|
| 0 | The file is what was asked | Copy the figures into the manifest row's `measured` and the delivery note |
| 1 | It is not. Each `fails[]` entry starts with its QC code | The item failed: one retry that moves a named lever (HR7), or a debt named in the hand-off (HR15) |
| 2 | Usage error | Fix the command; nothing was measured |
| 3 | Cannot check: nothing declared, no rule for that kind, or a tool missing | Report "not checked" with the printed `error`, never as passed. Declare next time (HR1); report a missing tool, never install it (HR21) |

## When to run which check

| Moment | Run | It catches |
|---|---|---|
| Each generation or local edit lands | `artifact` on the file, then `declared` against its manifest row or request record | The empty download, the wrong kind, the route that ignored the size you asked for (HR3) |
| The brief names a property no record declares | `image` with flags: `--alpha required` for a cutout, `--aspect 4:5`, `--min-long 1600` | The property, measured on the file itself |
| Before delivery | `artifact` on the delivery folder, `declared` for every deliverable, `sheet` of the set into `artifacts/<project>/qc/` | The last figures are the ones the owner reads; the sheet is their review artefact |
| After a retry | The same check, unchanged | Whether the lever moved the figure |

Never change a flag or a tolerance to turn an exit 1 into an exit 0. If a check itself looks wrong,
run the self-test (below) before you trust or distrust its figures.

## Declare first, then assert (HR1)

`declared` compares the file with a `declared` object written **before** the paid call: on the
manifest row (`manifest.mjs add` requires one), in `plan.json`, or in a request record.

```json
{"declared": {"width": 1280, "height": 720, "aspect": "16:9", "format": "png", "alpha": false}}
```

| Field (aliases) | Compared as | Code |
|---|---|---|
| `w`/`width`, `h`/`height` | Exact pixels | IQ-03 |
| `resolution`/`size` | `1280x720` exact, or `720p` = short side 720 | IQ-03 |
| `aspect`/`aspect_ratio` | `W:H`, within `--tol` (default 0.01 = 1%) | IQ-03 |
| `min_long` | Long side at least N px | IQ-03 |
| `format` | png, jpeg (jpg), webp, gif, mp4, mov or webm, read from the magic bytes | IQ-04 |
| `alpha` | `required`/`true`: some pixel is not opaque; `forbidden`/`false`: none is | IQ-05 |
| `duration_s`, `fps`, `audio` | Not compared by 1.0.0; listed under `unchecked` (they arrive with Video Studio) | — |

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
audio) decodes. A folder is walked for those extensions. Figures per file: bytes, magic, codec,
size or duration. An extension with no magic rule is exit 3.

**`image <file> [--w W] [--h H] [--aspect W:H] [--tol 0.01] [--min-long N] [--alpha required|forbidden] [--format png|jpeg|webp|gif]`**
Measures one picture and compares it with the flags you give. With no flags it only measures.

```json
{"check":"image","exit":1,"file":"hero.png","figures":{"bytes":43988,"ext":"png","magic":"png","codec":"png","w":864,"h":496,"long_side":864,"aspect":"54:31","aspect_value":1.7419,"nearest_aspect":"16:9","nearest_off_pct":2.02,"pix_fmt":"rgb24","bit_depth":8,"alpha_channel":false,"real_alpha":false,"alpha_min":255,"transparent_share":0},"compared":[{"field":"aspect","want":"16:9 (1.7778)","got":"54:31 (1.7419)","match":false,"off_pct":2.02,"tol_pct":1}],"fails":["IQ-03 aspect 864x496 = 1.7419 is 2.02% off 16:9 (1.7778); tolerance 1%"],"notes":[],"mediaqc":"1.0.0"}
```

`alpha_channel` says the format can carry alpha; `real_alpha` says some pixel is actually
transparent (`transparent_share` of them, `alpha_min` the lowest value). An RGBA PNG whose pixels
are all opaque has a channel and no real alpha, and fails `--alpha required`.

**`declared --plan plan.json|request.json|manifest.json --file F [--id ID] [--tol 0.01]`**
Measures F like `image` and compares each declared field (table above). It prints the declaration,
where it was found, the `compared` rows and the `unchecked` fields.

**`sheet <file|dir>... --out contact.jpg [--cols N] [--cell 320] [--max 48]`** One contact sheet
by ffmpeg (scale, pad, tile; no text overlay). It prints `out`, `tiles`, `grid`, `wh` and `order`:
the file name of each tile, left to right and top to bottom, so the sheet needs no labels.
Transparency shows as mid grey. An input that does not decode is exit 1 and **no sheet is
written**, because a sheet with a missing tile would hide the file that failed.

## Reporting figures (HR14)

- Write the measured figure next to the asked one, with the check and its exit code: "hero.png is
  864×496 (aspect 1.7419, 2.02% off 16:9), declared 1280×720: `mediaqc declared` exit 1, IQ-03."
- Never write PASS, OK, "verified" or "looks good" for anything a check measures. An exit 0 is
  reported as the figures that matched.
- An exit 3 is reported as "not checked" with its reason, and listed as a debt in the hand-off
  (HR15).
- Put the figures into the manifest row's `measured` block (HR9).
- Composition, likeness, text legibility, realism and cutout edges are not measured here. List them
  as review items for the owner and attach the contact sheet.

## QC codes

| Code | Failure | Raised by |
|---|---|---|
| BQ-01 | Nothing delivered: the file or folder is missing or empty | artifact, image, declared, sheet |
| BQ-02 | Wrong kind: the magic bytes differ from the extension, or the file does not decode | artifact, image, declared, sheet |
| IQ-03 | Wrong size: dimensions, short side, aspect or long side are not as asked | image, declared |
| IQ-04 | Wrong format: the encoded format is not the one asked | image, declared |
| IQ-05 | Wrong alpha: transparency required but absent, or forbidden but present | image, declared |

IQ-01 (geometry drift) and IQ-02 (background not white) are legacy image codes with no check in
1.0.0. A bot that needs them brings its own thresholds; see references/checks.md.

## Self-test (Studio check IMG-T3)

```bash
node $HOME/.agents/skills/media-qc/scripts/selftest.mjs
```

It builds synthetic good and known-bad fixtures with ffmpeg (`scripts/fixtures.sh`), runs every
check on both, and asserts the exit code, the single JSON line and the figures that separate them.
It exits 0 when every case behaves and 1 when a check has stopped telling good from bad. A fixture
this ffmpeg cannot encode (webm, mp3) is printed as `skip`.

## Not in media-qc 1.0.0

- **Video checks** (`streams`, `clipset`, `takes`, `loudness`, `plan-measured`, `motion`, `duck`,
  `endpoints`, `identical`) are not on this machine; they arrive with Video Studio. Until then a
  video gets `artifact` and `declared` (size, aspect, format), and its other figures are reported
  raw from `ffprobe -show_streams`, without a verdict.
- **Bot rules** such as a white ground, subject fill or palette count (Amazon's 255 / 85% / 1600 px)
  are bot parameters, not base checks.
- **Similarity** to a reference image (identity, geometry drift) is owner review in 1.0.0.

## House rules (HR-1.0)

Relies on: HR1 (`declared` reads the declaration), HR3 (a dropped parameter shows only in the
measured file), HR7 (an exit 1 is the failed attempt the retry rule counts), HR8 (the sheet goes to
`artifacts/<project>/qc/`), HR9 (the figures go to the manifest's `measured`), HR13, HR14, HR15 (an
exit 3 or an `unchecked` field is a debt named in the hand-off), HR19 (when to run each check is an
ordered table, not a warning), HR20 (a waived check still runs and its figures are reported), HR21
(a missing tool is exit 3 and a report, never an install) — see media-ai-gen/references/house-rules.md.

Not applicable: HR2, HR4, HR5, HR6, HR12, HR16, HR22 (no model call, credits or prompt: media-qc runs
only local ffprobe and ffmpeg); HR10, HR11 (it measures and never edits a file); HR17, HR18 (no
likeness, voice or claim is judged here; those are owner review items).
