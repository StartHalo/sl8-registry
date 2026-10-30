# edit-highlights: review checklist and recovery

## Contents
- [The ten-item checklist](#the-ten-item-checklist)
- [What a result may say](#what-a-result-may-say)
- [Recovery](#recovery)

## The ten-item checklist

Creative Claw's checklist (create-reels 5.4.2, Apache-2.0), kept as written: “Quality checklist:
standalone meaning; compelling honest opening; complete payoff; no clipped initial/final sounds; no
accidental missing word; natural breath/handoff; no distracting crop jump; captions in safe areas
with correct script shaping; original audio audible; dimensions/fps/duration correct. A technical
report passing cannot tick perceptual checks on your behalf.”

Each item, the evidence this machine has for it, and where the result goes (`checklist` in the
Reel's report, one entry per item):

| # | Item | Evidence on this machine |
|---|---|---|
| 1 | Standalone meaning | the agent's reading of the Reel's words (the joins' `expected_words` and the plan) and the contact sheet |
| 2 | Compelling honest opening | the opening's frames and its re-transcribed slice |
| 3 | Complete payoff | the ending's frames and slice |
| 4 | No clipped initial/final sounds | each join's slice re-transcribed and compared (`words.py compare`): a clipped consonant shows as a wrong or missing token |
| 5 | No accidental missing word | the same comparison, for every word inside each slice |
| 6 | Natural breath/handoff | not checkable by the agent (it cannot hear breath, music or room tone); the gap class and handoff flags from `words.py bounds` are the only figures |
| 7 | No distracting crop jump | the boundary frames and the contact sheet |
| 8 | Captions in safe areas with correct script shaping | frames at caption midpoints: the block inside the middle 60% on 9:16, glyphs drawn (no empty boxes), right-to-left text in order |
| 9 | Original audio audible | `silencedetect` and `media-qc streams --audio yes` figures |
| 10 | Dimensions/fps/duration correct | `output` against `declared`, and `duration_diff_s` against `one_frame_s` |

Without word timings (the sentence-level branch), items 4 and 5 and the caption placement in 8 are
recorded **not run**, never passed.

## What a result may say

- A figure from a script (items 9 and 10, the comparisons of 4 and 5): copy the figures and the
  exit code (HR13, HR14).
- An item the agent judges by eye or by reading (1, 2, 3, 7, 8): `observed` with one line of what
  was seen, or `fail` with the defect and its time. Never `pass`: taste goes to the owner's review.
- An item the agent cannot judge (6, and 4 or 5 when no slice could be transcribed): `not
  checkable`, with the reason. A human spot check is the honest backstop; say so in the delivery.

## Recovery

The result-to-action table, retargeted to the two things that can fail here: the local render and
the scribe-v2 calls.

| Result | Next action |
|---|---|
| `cut_reel.py` exit 1, spec refused (range out of bounds, crop outside the frame, odd size, missing meaning check) | Correct that field in `cut_<k>.json` and rerun; nothing paid was spent |
| `cut_reel.py` exit 2 (a tool, filter, encoder or font missing) | Stop with the preflight message; never install (HR21) |
| ai-gen exit 9 (429, 5xx, a queued job that failed) | Check the manifest and the envelope first; one retry with the same model (it counts as the attempt, HR7); a second failure goes to the sentence-level fallback gate (SKILL.md step 12) |
| ai-gen exit 10 (timeout) | Already charged: `ai-gen result <request id> --format json`, never resubmit (HR6) |
| ai-gen exit 2 with 413 (audio too large) | Chunked transcription is not offered on this machine yet: transcribe a stated part of the source (SKILL.md step 6) |
| ai-gen exit 7 or another 4xx (bad input) | Stop; say which input is wrong and what would fix it |
| ai-gen exit 5, a balance or access block | Explain it; `ai-gen balance` and `ai-gen estimate` for the budget answer; do not resubmit |
| `ai-gen estimate` exit 12 (no price for the model) | A model a kit names may be unpriced: open a spend gate with the facts-row price if one exists, else stop; never run an unpriced model inside a budget (same rule as the wizper fallback, SKILL.md step 12) |
| ai-gen exit 13 (over `--max-cost`) | Nothing was submitted: open a spend gate with the quote (HR5, HR12) |
| A timeout or lost response of any kind | Check the known output first; resume before re-rendering or resubmitting |
