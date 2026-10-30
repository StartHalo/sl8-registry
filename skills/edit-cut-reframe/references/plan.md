# Edit plan, framing and captions

## Contents
- [The edit plan](#the-edit-plan)
- [What the validator refuses and warns](#what-the-validator-refuses-and-warns)
- [Framing per range](#framing-per-range)
- [Captions: inputs, looks and defaults](#captions-inputs-looks-and-defaults)
- [Report and delivery sidecar](#report-and-delivery-sidecar)

## The edit plan

`work/<p>/edit-plan.json` (schema `sl8.edit.plan/1`). `validate_plan.py init` writes it with the
source facts read from `probe.json` only; the agent then fills `segments` and the output fields. The
segment and output fields keep the names of the vendor's cut-and-reframe input (WF26-a1 keeps that
shape as our script contract), so a plan written for it reads the same here.

```json
{ "schema": "sl8.edit.plan/1", "project": "talk-cut", "name": "Interview takeaway 9x16",
  "source": { "path": "work/talk-cut/src/source.mp4", "sha256": "…", "duration_s": 61.2,
              "width": 1920, "height": 1080, "rotation": 0, "avg_frame_rate": "30000/1001",
              "vfr": false, "audio": true, "audio_streams": 1, "audio_stream_used": 0 },
  "operations": ["multicut", "captions"],
  "segments": [
    { "start": 8.4, "end": 13.2, "framing": { "mode": "pad" } },
    { "start": 31.0, "end": 35.6, "framing": { "mode": "crop", "width": 606, "height": 1080, "viewed": true,
      "keyframes": [ { "time": 0, "x": 400, "y": 0 }, { "time": 2, "x": 700, "y": 0 } ] } } ],
  "width": 1080, "height": 1920, "fps": null, "pad_color": "black",
  "audio_fade_ms": 30, "normalize_audio": null,
  "limits": { "min_range_s": 0.15, "max_ranges": 40, "max_output_s": 300, "max_keyframes": 20 },
  "encode": { "vcodec": "libx264", "preset": "medium", "crf": 18, "pix_fmt": "yuv420p", "acodec": "aac", "audio_kbps": 192 },
  "jobs": [ { "step": 5, "model": "fal-ai/elevenlabs/speech-to-text/scribe-v2", "request_id": "…" } ] }
```

| Field | Meaning (default) |
|---|---|
| `segments[]` | Source ranges in **output order**, half-open `[start, end)` in source seconds. Reordering is allowed; duplicates and overlaps are not |
| `segments[].speed` | 1 by default; 0.25 to 4 (`limits.speed_min`, `limits.speed_max`). Video `setpts` takes N = 1/speed; audio `atempo` is chained so each stage stays within 0.5-2.0 |
| `segments[].framing` | `pad` (default), `center_crop`, or `crop` (below). `"viewed": true` with `"viewed_strip": "<an existing strip file>"` records that the range strip was looked at; both are required for `center_crop` and `crop` |
| `width`, `height` | Even integers 128-1920 by default (`limits.min_side`, `limits.max_side`; a 4K order sets `max_side`), independent of the source orientation. 1080x1920 only when the request names nothing |
| `fps` | `null`: the source average rate, made constant (default). 24, 25, 30, 50 or 60. `"source"`: the source's own rational rate (30000/1001 stays 30000/1001) |
| `audio_fade_ms` | 30 (0-100 by default, `limits.max_fade_ms`): a fade at each discontinuity only; a range that continues the previous one in source time gets none |
| `normalize_audio` | `null` (off). On request: `{"target_lufs": -14, "tp": -1.5, "lra": 11}` (two-pass, whole output) |
| `limits` | Defaults a kit, brief or the request may change (say so in the delivery): `min_range_s` 0.15, `max_ranges` 40, `max_output_s` 300, `max_keyframes` 20, `min_side` 128, `max_side` 1920, `speed_min` 0.25, `speed_max` 4, `max_fade_ms` 100. The output fps list (24, 25, 30, 50, 60, `source`) is fixed |
| `jobs[]` | Every fal request id with its step, so a re-run fetches instead of resubmitting |

## What the validator refuses and warns

`validate_plan.py check` (and `cut_reframe.py` before it renders) refuses: a range under 0.15 s, an
empty or negative range, an end past the source, overlapping or duplicated source time, more than 40
ranges or 300 output seconds (the defaults), an odd or out-of-range output size, an fps outside the
list, a fade outside 0-100 ms, a speed outside 0.25-4, a crop rectangle off the output aspect by more
than 1%, a crop that leaves the source at any keyframe (display orientation), keyframes that do not rise
from 0 inside the range or number more than 20, static x/y together with keyframes, and a source file
whose sha256 no longer matches the plan.

With `--words`, it also refuses an edge that falls inside a word and a transcript that is out of order
or ends after the source. It reports each edge's word gap: 0.4 s or more is often a natural edit,
0.15-0.4 s needs a look at the waveform strip, under 0.15 s means keep more context (WF26 enrichment 6;
heuristics, not settings). Without words it says the word check was skipped.

Also refused: a `crop` or `center_crop` without `"viewed": true` and a `viewed_strip` naming a file that
exists (run from the project root); every size, speed and fade bound above is a default in `limits`.

Warnings, not refusals: an odd crop size (rounded down to even, 405x720 becomes 404x720), a source with
sound and more than one range checked without a transcript, and word times from audio that starts at a
different time than the video (shift them by the difference). `check` hashes the source only with
`--verify-source` (`init` and `cut_reframe.py` always do).

## Framing per range

| Mode | Filter `cut_reframe.py` writes | Use when |
|---|---|---|
| `pad` | `scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2:color=<pad_color>` | Content matters or the subject's position is uncertain (the default) |
| `center_crop` | `scale=W:H:force_original_aspect_ratio=increase,crop=W:H` | Only after the range strip shows the subject staying inside the centre crop |
| `crop` static | `crop=w:h:x:y,scale=W:H` (x, y default to centre) | A fixed subject off centre |
| `crop` keyframes | `crop=w=..:h=..:x='<piecewise-linear in t>':y='…',scale=W:H` | A moving subject: up to 20 points, time in seconds from the range start, set from frames looked at |

The crop rectangle is in **source pixels of the displayed orientation** (ffmpeg rotates on decode) and
matches the output aspect. For instance, a 606x1080 rectangle taken from a 1920x1080 source that the probe confirmed sits
close to 9:16 (0.25% off 1080x1920), and the keyframe pair above pans its x from 400 to 700 over 2 s.
Interpolation between points is a straight line, not face tracking: if the speaker leaves the frame on
the contact sheet, add points from more viewed frames or switch the range to `pad`. Never stretch.

## Captions: inputs, looks and defaults

`make_ass.py` (standalone pass) and `remap_captions.py` (inside a cut) write one ASS file, an SRT
sidecar and a JSON report. Inputs: word timings (the Scribe envelope's `raw.words`, `type` "word" only),
an exact script (`--script`: wording from the script, timing from the words; under 0.75 similarity the
script is ignored and the report says so), phrase corrections (`--corrections`), or timed captions
(`--captions` .srt, .vtt or .json `[{start, end, text}]`, used as given, including a supplied translation).

| Look (`--style`) | What it does |
|---|---|
| `clean` (default; `plain` is the same) | White text, black outline, bottom centre |
| `karaoke` | Each word turns to the highlight colour as it is spoken (`\k` per word) |
| `highlight` | The spoken word in the highlight colour, the rest white |
| `bold_pop` | Three words per caption in big capitals, thicker outline |
| `box` | Text on a dark translucent box |
| `one_word` | One word at a time, slightly larger |
| `reveal` | Words appear as they are spoken |
| `cinematic` | Small, light, low |
| `word_box` | Not offered on this machine yet: use `highlight` or `box` |

These are SL8's ASS styles named after the vendor's looks; the vendor's own visuals are not described
in the source, and none of these has been rendered on this machine yet. A look is set only when the
customer describes it. Word-timed looks need word times: with supplied captions they fall back to
`clean`. When speakers overlap or the text runs right to left, keep `clean` unless the frames were reviewed.

Defaults (a kit or brief may set others; knobs `--wpc`, `--font`, `--font-size`, `--color`,
`--highlight`, `--stroke`, `--y-offset`, `--uppercase`):
- **Words per caption:** portrait 3, square 1, landscape 4 (standalone pass); 3, at most 7, inside a cut.
- **Size and place:** font 6.5% of the frame's short side (20-150 px), stroke 3 px; bottom margin
  650/1920 of the height in portrait, 100/1080 in landscape, 12% in square (WF26 enrichment 10, scaled
  to the frame). Never over the speaker's face: check the frames.
- **Timing** (WF26 enrichment 11, a retired source, kept as defaults): a caption holds through gaps
  under 0.35 s, ends 0.15 s after its last word otherwise, shows at least 0.20 s, never overlaps the
  next. Every cue is snapped to output frames (start and end = ceil(t × fps)), so each shows on at least
  one frame and adjacent cues switch once.
- **Text:** emoji are dropped (libass draws no colour emoji); the face follows the script of the text:
  Noto Sans, Noto Sans Hebrew, Noto Sans Arabic, Noto Sans CJK SC, JP or KR (fonts-noto pack).

## Caption pass details (moved from SKILL.md step 11)

- Defaults: white text with an outline, a safe bottom margin, size from the frame, words per
  caption by aspect (portrait 3, square 1, landscape 4), language as detected. A look only when
  the customer describes one: clean, highlight, bold_pop, box, one_word, reveal, cinematic,
  karaoke (plan.md "Captions"); `word_box` is **not offered on this machine yet** (use highlight
  or box). Knobs: font and highlight colour, stroke, words per caption, y offset. Do not
  translate unless asked.
- Spellings: `keyterms` in the Scribe params; corrections `[{from, to}]` after transcription.
- Font: none unless the customer names one. A font file the customer supplies is used through
  `fontsdir`; fonts are never downloaded (HR21), so a named face that is not on the machine and
  not supplied falls back to the Noto face, said in the delivery. Check the face covers the
  script (`fc-list :lang=<code>`) before rendering.
- Choosing a look: with no look named, burn the default clean look. When the customer wants to
  choose, render one preview still per candidate look on a representative frame and deliver them
  beside the default render; a re-burn in another look is local and free, from the uncaptioned
  file. A fix (wording or look) also re-renders from the original uncaptioned video.

## Report and delivery sidecar

`cut_reframe.py` writes, next to its output: `<stem>.cmd.txt` (the exact command), `<stem>.report.json`
(the plan, each range's source and output times and framing, each join's output time with the planned
words either side, the expected and measured duration, the output probe, any loudness measurement, the
captions' dropped straddling words, `declared`, `checks_done`, `checks_not_done`) and
`<stem>.contact.png` (4x3 sheet). A re-run reuses the plan; it never invents a new one.

`validate_plan.py sidecar` writes `artifacts/<p>/final/<name>.json` beside the delivered file:
`{name, file, tags, plan, operations, source_sha256, segments, declared, measured, checks_done,
checks_not_done, edits_not_completed, jobs}`. It refuses when no check is recorded as done. The cut
report's `declared` and `checks_done` are taken only when the delivered file is byte-identical to the
report's output (`cut.mp4`); any other delivery (WebM, GIF, `.m4a`, size cap, bookends, marks, upscale,
or a job with no cut report) needs `--declared '<json>'` for that file and `--done` for each check run on
it. A plan with more than one range needs `--splice-report FILE` or a `--not-done` line naming the
splice review. `--incomplete` names an edit not finished. `tags` is
free text (no fixed vocabulary yet).
