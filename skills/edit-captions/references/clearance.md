# Subject-aware clearance

The detail behind SKILL.md step 12, in our words, from WF24-a1 steps 12 to 15 and 18 and the
video-montage caption fine points it cites (research ids in `adaptations/edit-captions.json`). The
four scripts are SL8's: `caption_evidence.py`, `caption_regions.py`, `caption_placement.py` and
`caption_guard.py`, with `burn_captions.py --profile safe`. Nothing here has run on an SL8 Studio
yet (learnings VID-L321). The limits below (2 maps, 2 renders, 0.25 s sampling, the 2% / 14 px
floor) are the approach's constants, not defaults: a kit or brief may not raise them (VID-D548).

## Contents

Cost · What the route proves · Files · The map · Reviewing the regions · Placement and budget · Final
review · UGC and Website lanes

## Cost

Three passes open sheets: clean evidence (6 samples a sheet), region sheets (3 a sheet) and final
evidence (6 a sheet), so N samples cost about 2N/3 reads, and a second map adds N/3. N is about 4.7
samples per caption-second, so 5.9 s of captions was 28 samples and 20 reads; a 30 s clip is about
85 reads. `caption_evidence.py count --srt ...` prints the figure before any frame is cut; over the
default ceiling of 60 reads (VID-D546) use the fixed-geometry route and say clearance was not run.

## What the route proves, and what it does not

- It proves that a reviewer looked at sampled frames of the clean master, boxed every subject the
  captions must not cover, that every caption's real ink (outline, shadow and paper included) was
  placed clear of those boxes, and that the burned file was looked at and passed, all bound by
  sha256 to the exact files.
- It does not track motion. Samples sit at both edges of every caption and at most 0.25 s apart; a
  subject that moves fast, or a cut between two samples, can still slip through. Look at cuts and
  fast movement on purpose, and draw boxes that hold the subject for the whole interval.
- Safe-zone margins and a clean encode say nothing about faces or labels. A placement record is not
  a visual check. Report "sampled at 0.25 s or less", never "frame-by-frame".
- The scripts only check that the review is complete and bound to the files (notes of 12+ characters,
  not identical across a cue). The judgement is the agent's, from the images it opened, so the
  receipt says "self-reviewed"; no detector backs it (VID-L336).

## Files (all under work/<p>/ unless named)

| File | Written by | Holds |
|---|---|---|
| `clean-evidence/evidence.json`, `sheet-NNN.jpg` | `caption_evidence.py prepare` on the clean master | samples per cue (id, time, decoded frame, frame hash), 6 frames a sheet, the video and SRT hashes |
| `protected_regions.json` | the agent | the map (below) |
| `region-evidence/region-evidence.json`, `regions-NNN.jpg`, `region-review-template.json` | `caption_regions.py prepare` | three views per sample, three samples a sheet; the map's version in the budget |
| `region-review.json` | the agent, from the template | per sample: `unprotected_subjects`, `subjects_covered`, `note` |
| `region-review-receipt.json` | `caption_regions.py verify` | verdict `REGIONS_REVIEWED`, bound to video, SRT, map, evidence and review |
| `<out>.captions.json` | `burn_captions.py --profile safe` | verdict `RENDERED` or `CAPTION_INCOMPLETE`, `visual_review` `PENDING`, every ink box with its band |
| `final-evidence/…`, `review.json` | `caption_evidence.py prepare` on the burned file; the agent | per sample: `clear`, `text_ok`, `note` |
| `<out>.caption-review.json` | `caption_evidence.py verify` | verdict `CAPTIONS_REVIEWED`, bound to the delivered file |
| `$CAPTION_GUARD_DIR/<source sha256>.json` | `caption_guard.py` (default `work/caption-guards`) | maps used, the frozen map, render attempts |

## The map: protected_regions.json

```json
{ "video_sha256": "<copied from clean-evidence/evidence.json>",
  "reviewed_duration": 12.48,
  "reviewed_intervals": [{ "start": 0, "end": 12.48 }],
  "regions": [{ "start": 0.0, "end": 6.2, "box": [0.22, 0.08, 0.81, 0.71], "what": "presenter, whole head to chin" }] }
```

- `reviewed_duration` is the file's duration (within 0.3 s); `reviewed_intervals` cover every cue.
- A box is `[left, top, right, bottom]`, fractions 0..1 of the source frame, never of a sheet.
- Protect: the whole face down to the chin and mouth, every fingertip of a visible hand, product
  labels and lids, tutorial step labels, a hook, objects the shot is about, and text already in the
  picture. Split a box at a cut. Make boxes generous: they must hold the subject through the interval.
- `"regions": []` is allowed and means no protected subject in the reviewed footage.
- Never shrink, move or delete a box to make a caption fit, and never reuse boxes from an example
  or another video. Nothing detects a missing face for you.

## Reviewing the regions

Open every `regions-NNN.jpg`. Each row is one sample: clean, boxes drawn, and unprotected (the exact
union of the boxes painted grey, no padding). Look hardest at the unprotected view: a fingertip, an
edge of a mouth or chin, part of a label or lid, or baked text left showing means a box is short.
For each sample, fill `unprotected_subjects` first (what you can still see that needs protecting; an
empty list means only background is left), then `subjects_covered`, then a note on that frame.
Different frames get different notes; a cue whose notes are all identical is refused. Anything
still showing: fix the map (it is your second and last map) and prepare again.

## Placement and budget (`burn_captions.py --profile safe`)

- Default look: `--style bold --no-caps --font-key montserrat --stroke-frac 0.045`, size 2.6% of H,
  label width 70%, never under 2% of H or 14 px; a kit or brief may name another look. An explicit
  paper request uses `--style paper` with a face that covers the text.
- Each caption is shown exactly for its speech (no bridge or tail), so the shown interval is the
  reviewed one. Up to two balanced lines.
- Search order: the low band (ink bottom from 83% of H portrait, 90% landscape, up in 2.5% steps to
  60%), then the upper band (ink top from 12% of H down while the ink stays above 40%), each at
  centre, left and right; 1.5% of H clear around every box shown during the cue; never in the top
  10%; sides 11% of W portrait, 7.5% landscape.
- Budget per clean source (by its sha256, so renaming resets nothing): 2 maps and 2 render
  attempts. The first render attempt freezes the map, even if placement then fails. A render that
  made no file (ffmpeg failed, process gone) is not counted. Never delete the state file to reset it;
  read it with `caption_guard.py status` (`maps_left`, `renders_left`, `latest_render`).
- A caption with no clear position exits 3 (`CAPTION_INCOMPLETE`, with the interval) and a used
  budget exits 3 with `BUDGET_USED` (deliver `latest_render` if it has a receipt, else the clean
  master); neither writes a video. A caption too long for the frame at the floor exits 1: re-chunk it
  from the existing word clock (every word and pause kept), then take new evidence and a new region
  review for the new SRT. Never fall back to the default or faceless profile for a placement failure.

## When the final review fails

| What happened | Do |
|---|---|
| map wrong before the first render | second map |
| `clear` false after a render (the map missed a subject) | not repairable: the map is frozen; clean master with `caption_incomplete` and the frame ids |
| `text_ok` false, or exit 3 on a long caption | one re-chunk or `--fontsize-frac` down to the floor; new clean and region evidence on the same map; the last render |
| `BUDGET_USED` | `latest_render` if reviewed, else the clean master |

## Final review

Take new evidence from the burned file, open every sheet, and fill `review.json` per sample:
`clear` (no caption over a protected subject), `text_ok` (caption present, right words, no clipped
letters, no overlap, readable, on time) and a note. Leave a failed or unseen frame `false` or `null`.
The receipt is written only when every sample passes and the guard shows this file as the source's
latest render. Any change to the video or the SRT voids the receipt: take evidence and review again.

## UGC and Website lanes (WF24-a1 step 15)

- The calling lane sets the caption mode: Subtitles, Hook or Both. Defaults: UGC on-video text off,
  Website UGC captions on; a kit or brief may name another. With text off, generated footage must
  not carry baked text either.
- Look: the guarded command with `--style bold --no-caps --font-key metropolis --fontsize-frac 0.02604 --stroke-frac 0.12`
  in place of the default look's font, size and stroke (about 50 px on a 1920-high frame), up to two
  short lines; keep `--profile safe`, `--protected-regions` and `--region-review`.
- Hook or Both: the hook must already be in the clean master, placed and checked by the caller,
  ending at the first body word. Box it as protected text, and pass its end time to
  `caption_words.py --hook-end <s>` so the words it shows are not captioned a second time.
  A hook-only job has nothing to caption: skip this skill.
