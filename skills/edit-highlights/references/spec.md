# edit-highlights: files, cut spec and report

## Contents
- [Project files](#project-files)
- [brief.json](#briefjson)
- [candidates.json](#candidatesjson)
- [plan and cut spec](#plan-and-cut-spec)
- [Caption defaults](#caption-defaults)
- [Report](#report)

## Project files

| File | Written by | Why it persists |
|---|---|---|
| `artifacts/<p>/run.log` | step 2, one line per run | which method a later reader should trace |
| `artifacts/<p>/plan/brief.json` | step 4 | the declared output (HR1) and the selection mode |
| `artifacts/<p>/plan/transcript.envelope.json` | step 6, the ai-gen JSON envelope | a paid transcript is never bought twice |
| `artifacts/<p>/plan/words.json`, `words.txt` | `words.py normalize`, `text` | source-timed words; never overwritten, kept apart from any edited text |
| `artifacts/<p>/plan/segments.json` | `words.py normalize` exit 3 | sentence-level timing only (step 12) |
| `artifacts/<p>/plan/candidates.json` | step 9 | the review list must outlive the job when approval is required |
| `artifacts/<p>/plan/plan_<k>.json`, `cut_<k>.json` | steps 10 and 13 | the exact edit plan of Reel k; a correction edits these |
| `artifacts/<p>/reels/<title>.mp4` + `.report.json` + `.sheet.jpg` | `cut_reel.py` | the deliverable and its evidence |
| `work/<p>/` | probes, frames, audio, slices | scratch; lost after the job |

## brief.json

```json
{"source": "artifacts/attachments/webinar.mp4", "audience": "…", "goal": "…", "count": 1,
 "length_s": [30, 60], "width": 1080, "height": 1920, "fps": "source", "captions": "auto",
 "selection_mode": "delegated", "recommend_only": false, "language_code": null,
 "keyterms": [], "loudnorm": null, "budget_credits": null, "defaults_used": ["count", "length_s", "size"]}
```

- `captions`: `on`, `off` or `auto` (on only when the source has no usable burned-in captions).
- `selection_mode`: `delegated`, `user-specified` (the customer's ranges, copied verbatim) or
  `approval-required`.
- Sizes: 1080x1920 (default), 1920x1080, 1080x1080, 1080x1350, or even integers 128-1920.
- `budget_credits`: the credit cap for the job; null when none is stated (SKILL.md step 6 says
  what happens then).
- `defaults_used` lists every field the request did not state; the delivery line repeats them.

## candidates.json

One record per candidate (Creative Claw wording, Apache-2.0): “title, goal/audience fit, transcript
excerpt, source ranges, desired length, framing observations, caption-timing provenance and review
status. Preserve an uncertainty note when the transcript or speaker boundary is unclear.”

```json
{"k": 1, "title": "Why the launch slipped", "fit": "…", "excerpt": "…", "ranges": [[612.4, 655.9]],
 "length_s": 43.5, "frames": ["work/p/c1_612.jpg", "work/p/c1_634.jpg", "work/p/c1_655.jpg"],
 "visual_note": "one speaker, centred, slide behind from 640 s", "framing": "pad",
 "caption_timing": "scribe-v2 words, source time", "review": "proposed", "uncertainty": null,
 "rationale": "hook at 612 s, payoff at 652 s", "spare": false}
```

## plan and cut spec

`plan_<k>.json` holds the ordered ranges (source seconds, half-open) and a `meaning_check` sentence
for any reorder or internal removal. `cut_<k>.json` is what `cut_reel.py` reads. The shape follows
the hosted renderer's example with a local source path; caption words stay in source seconds and
are remapped inside the script:

```json
{"video": "/work/src.mp4", "name": "Interview - the useful takeaway",
 "segments": [{"start": 12.1, "end": 15.9, "framing": {"mode": "pad"}},
              {"start": 40.2, "end": 44.8, "framing": {"mode": "pad"}}],
 "width": 1080, "height": 1920,
 "meaning_check": "The aside between the two answers is removed; both are the same speaker's own words.",
 "words_file": "artifacts/p/plan/words.json",
 "captions": {"style": "plain", "words": [{"start": 12.3, "end": 12.7, "text": "Example"},
                                          {"start": 40.4, "end": 40.8, "text": "Takeaway"}]}}
```

A pan (Creative Claw's keyframe example: a 606x1080 window, about 9:16, from a 1920x1080 source):

```json
{"mode": "crop", "width": 606, "height": 1080, "keyframes": [{"time": 0, "x": 400, "y": 0},
                                                             {"time": 2, "x": 700, "y": 0}]}
```

| Field | Rule `cut_reel.py` enforces (exit 1, nothing rendered) |
|---|---|
| `segments` | 1-40; each at least 150 ms; inside the source; no two overlap; at most 300 output seconds |
| two or more ranges | `meaning_check` is required (an internal removal or a reorder) |
| `width`, `height` | even integers 128-1920 |
| `fps` | `source` (default) or 24, 25, 30, 50, 60; each range is quantised to whole output frames |
| `audio_fade_ms` | default 30, at most 100; fades only at a discontinuity and at the two edges |
| `framing` | `pad` (`"background": "blur"` optional), `center_crop`, or `crop` with static `x`,`y` or up to 20 keyframes (not both); a missing `y`, static or in a keyframe, is the vertical centre |
| crop | odd sizes round down to even (405x720 becomes 404x720); width within 2 px of height x W/H; every keyframe and the interpolated path inside the display-oriented frame; keyframe times strictly rising |
| `captions` | `plain` or `karaoke`; words from `words`, `words_file`, else the top-level `words_file`; `time_base` `source` (remapped) or `output` (step 12); 1-10,000 words; `words_per_caption` 3 (1-7); a word with `"unsure": true` leaves its whole line uncaptioned |
| `loudnorm` | `{"I": -14, "TP": -1.5, "LRA": 11}` opt-in, two passes, `linear=true` |

Contiguous ranges (one ends where the next starts, a crop split at a camera cut) get no join fade
and no gap, and a caption word spanning their join is kept and mapped through both. Each range moves by up to half an output frame: never claim sample-exact boundaries.

## Caption defaults

SL8 defaults, not from the method's source (a kit or brief may set others; learnings VID-L371):
Noto Sans bold, size 6.5% of the short side (70 px at 1080), outline 6% of the size; centred,
bottom-anchored; tall outputs (9:16) keep the block's bottom at the lower edge of the middle 60%
of the frame (MarginV = 20% of height), other aspects use 8% of height. A line breaks at the word
limit, a range join, a pause of 0.4 s or more, or a sentence end; it is held through a gap under
0.25 s and shown for at least 0.3 s. Karaoke draws unspoken words white and spoken ones gold.
Chinese and Japanese captions take `"joiner": ""`.

## Report

`<title>.report.json` (`sl8.edit-highlights.report/1`): `source` (display size, rotation, fps,
audio, subtitle streams), `output` and `declared` (size, fps, duration, audio) with
`duration_diff_s` and `one_frame_s`, `segments` (requested and quantised source range, output
range, framing, fades), `joins` (the opening, each join and the ending: `t_out`, four frames 0.1 s
apart from t-0.2 s, a 16 kHz audio slice 1.5 s either side and the `expected_words` fully inside
it), `captions` (count, words used, words dropped for straddling a real cut, lines left uncaptioned,
`caption_events` with `start`, `end`, `text` and `caption_mid_s` per line, and `frame_check_mid_s`:
up to 8 times spread over the Reel for the step 18 frames),
`loudnorm` (measured, type, output), `blackdetect` (0.1 s), `silencedetect` (-45 dB, 0.4 s),
`sheet` (12 frames) and `notes`. The report prints figures; it never says pass.
