# Timing contract: why it exists, and stages 1, 1b and 5

Read this before stage 1, and again at stage 5. It is media-video-production's spine. The rows live
in `artifacts/<project>/plan.json` `rows` (the shape is in media-ai-gen's
`references/gates-and-manifest.md`), and every later stage reads them from there. The provenance of
each file (endpoint, request id, prompt, credits, sha256) is the manifest's job, not the plan's.

## Contents
- [What this exists to prevent](#what-this-exists-to-prevent)
- [Stage 1 — The timing contract](#stage-1--the-timing-contract)
- [Stage 1b — Split the script across the clips, then spread the air](#stage-1b--split-the-script-across-the-clips-then-spread-the-air)
- [Stage 5 — Voiceover, one clip per line](#stage-5--voiceover-one-clip-per-line)

## What this exists to prevent

Two real production runs of a coffee-brand ad produced seven defects. Six happened
*between* steps rather than inside one, and the seventh is the reason the last
stage exists.

- The script computed a word budget and a voiceover window per shot. The audio
  step generated **one continuous read** instead, so the words bunched into the
  opening seconds and the rest played to silence.
- The pipeline ran animate → voiceover → mix without stopping, so **nobody saw
  the clips** until the cut was finished and paid for.
- Shot 1 came back **frozen**, caught only because a human watched it.
- Shot 5 took **three attempts**, because its shot seed asked for two actions.
- The script specified lower-thirds. **None were burned in.** Every clip rendered,
  the mix completed, and the words never appeared.
- Music level and ducking were decided ad hoc, differently each time.
- **A 30-second ad shipped with 21 seconds of audio, then one with 18.** Nothing
  in the pipeline objected, because the only timing check asked whether each line
  *fitted inside* its window, and a two-second read in a six-second window fits
  perfectly. The check could only fail in one direction.

That last one is the pattern worth naming, and it has a sharper second half.

**A check that can only fail in one direction will pass the opposite failure** —
the same shape as a preservation check approving a frozen clip. But the obvious
correction, demanding that speech *fill* the runtime, is also wrong, and the first
attempt at this skill made it. **Eighteen seconds of speech in a thirty-second ad
is a good ad**: read at a comfortable pace, each line on the shot it describes,
air around it. It is a bad ad only when those eighteen seconds run consecutively
and the last twelve play to nothing. The word count was never the defect. **Where
the silence ended up was.**

So the checks below are deliberately **asymmetric**. Too many words for a window
is a defect, because no later step can manufacture time. Too few is a pacing fact,
and the pipeline's job is to place the spare seconds rather than to fill them.
The measurement that separates the good case from the bad one is the **largest
single gap**, not total coverage — coverage is identical in both.

## Stage 1 — The timing contract

This is the artefact both failed runs threw away. Before a single clip renders,
build the plan (`plan.json` `rows`) with one row per shot and keep it as the pipeline's spine:

| field | meaning |
|---|---|
| `n` | shot number, the handle the user reshoots by |
| `start`, `dur` | its window in the finished cut, in seconds. **`dur` must be renderable** — see the quantisation rule below |
| `render_dur` | what the route will actually return, which is usually longer than `dur`; after render, what ffprobe measures on the downloaded clip |
| `action` | **exactly one** physical beat |
| `look` | lighting, grade and time of day, **and what it inherits from the row above** |
| `vo` | the script fragment for this shot, or empty |
| `vo_words` | word budget for `dur`, at ~2.4 words/second |
| `vo_start` | where this fragment's audio actually starts, set in stage 1b — **not** the same as `start` |
| `overlay` | text **and any image asset** burned over this window, or empty |

**`render_dur` must be a length the route can render — the route's floor: 4 seconds
on Seedance and Veo, 5 on MiniMax H3. `dur` is what the cut uses, and it may be
shorter.** Every generation route here has a minimum: Seedance 2.0 takes whole
seconds from `4` to `15`, Veo 3.1 Fast takes only `4s`, `6s` or `8s`, and
`minimax/h3/image-to-video`, the route for a realistic face at 480p and at 720p for
the lengths Veo cannot render (media-video-generation's face rule), takes whole
seconds from `5` to `15` (a `4` is refused with a 422). A shot shorter than the floor is therefore not
impossible, it is a **planned trim**: render at the floor, cut to `dur`. What a
run must never do is discover the floor at assembly — one that planned
`2/4/8/8/5/3` as render lengths came back `4/4/8/8/6/4` and had to be rescued by
improvised trims, because its contract had conflated the two columns. Each route's legal lengths
and its tiers' real ceilings are media-video-generation's facts (HR22): read them there.

So build the contract in this order: **choose the route, write each row's
`render_dur` from its legal durations, then write `dur` from the pacing the
brief asks for.** Consequences to state at delivery:

- **Pacing sets the shot count; the floor sets the price.** At default pacing
  `dur ≈ render_dur` and a 30-second ad holds about 7 shots. A fast-paced brief
  — TikTok, frenetic, montage — plans `dur` at 1–2.5 seconds per shot and pays
  the floor for each: eight quick shots in a 15-second cut bill roughly 32
  rendered seconds. That is a legitimate ad and a quoted cost, never a refusal;
  the choice is made here, priced on the sum of `render_dur`, not discovered at
  assembly.
- **Where `render_dur > dur`, the trim is planned, not improvised.** Say which end
  you trim from — take it from the tail unless the action resolves there, in which
  case trim the head and note it. And write the row's `action` for the seconds
  that survive: a 2-second cut of a 4-second render must land its beat inside
  the kept window, so the beat is prompted early, not at the render's midpoint.
- **The quote uses the rendered figure.** You paid for `render_dur` seconds and
  used `dur`; a fast cut costs more per finished second, and the quote says so.

Route choice therefore drives timing granularity. Seedance's whole-second enum
gives a contract close to the cut but not exact: it returned 4.06 s for a 5 s request, twice
(SL8 run, 2026-09-23), so after render `render_dur` is what ffprobe measures on the downloaded
clip, never the length requested. Veo's three-value enum forces every
shot to 4, 6 or 8 and makes trimming the norm. Say which you took and why.

**One action per `action` field, enforced here rather than hoped for.** If a row
names two beats — tie the bag *and* set it by the window — split it into two rows
and re-run the arithmetic. Models do not refuse a second action, they blend it,
and the blend reads as a mistake. Two short clips also cost what one long clip
costs and give two independent attempts.

**`look` exists because every shot is rendered blind to the others.** Each clip is
a separate call with no memory of the last one, so lighting and grade do not carry
unless you carry them. A run whose shot 4 was deep red and dark returned a shot 5
in ordinary daylight — the sip that was supposed to be the payoff of an escalating
mood arrived looking like a different ad, and it cost a relight, a re-animate and a
swap to fix after the fact.

So write the look into every row **in absolute terms, not relative ones**. "Deep
red key from screen-left, dark falloff, practicals only" renders; "same as before
but darker" does not, because the model cannot see "before". Where the mood is
meant to build across shots, each row states its own point on that curve, and the
row also names what it inherits so a human reading the plan can see the ramp.
Then check the ramp before rendering: any row whose `look` could be read as a reset
of the previous row's mood is the defect — catch it here, where it is a sentence,
not at the fence, where it is three calls.

**`vo_words` is a ceiling with a comfort floor, and they are not symmetric.**

- **Ceiling:** `dur × 2.7` words. Above that the line cannot be read in the window
  without rushing, and rushing is audible. A row over the ceiling is fixed here,
  while it is free, by moving a clause to a neighbouring shot or shortening `dur`
  elsewhere and giving the seconds to this row.
- **Comfort floor:** `dur × 1.9` words. Below this the window holds more air than
  speech. **That is a signal, not an error** — it means this shot is carrying the
  picture more than the words, which is often right. It is handled by *placing*
  the air (stage 1b), never by inventing words to fill it.

The asymmetry is the point. Too many words is a defect, because no downstream step
can create time. Too few is a pacing decision, and the pipeline's job is to spend
the spare seconds deliberately rather than let them pool at the end.

## Stage 1b — Split the script across the clips, then spread the air

**A script shorter than the runtime is normal, and it is not a defect.** Eighteen
seconds of speech in a thirty-second ad is a perfectly good ad — read at a
comfortable pace, each line landing on the shot it describes, air around it. The
same eighteen seconds becomes a defect only when it is delivered as one block and
the last twelve seconds play to nothing. **The problem is never the word count.
It is where the silence ends up.** Do not pad the script to fill time, and do not
speed anything up. Distribute.

**First, cut the script to the clips.** Take the script as written and split it at
**natural boundaries** — sentence ends first, then clause breaks at commas,
conjunctions and dashes. Never split mid-phrase, never split a brand name or a
URL across two clips. Assign one fragment per shot, in order, matching what the
fragment says to what the shot shows: the line about the roast date belongs on the
shot of the stamped bag. A fragment may be empty — some shots are meant to carry
the picture alone — and a fragment may span two shots only if those two shots are
one continuous idea, in which case say so.

Size each fragment against its shot's `dur` using the band above. If a fragment is
over the ceiling for its shot, move a clause to the neighbouring shot rather than
cutting words; if the script simply has more to say than the runtime allows, that
is a script problem and it belongs back at stage 1.

**Then spread the air deliberately, one shot at a time.** The air is a resource to
place, not a remainder to leave lying at the end. Place it *within each shot's own
window*, never by running a clock across the whole timeline:

```
slack    = dur − (spoken duration of this fragment)
vo_start = start + 0.35 × slack
```

Roughly a third of the spare time goes in front of the line, the rest behind it.
Record `vo_start` per row. That, not the row's `start`, is where stage 5 places
the audio.

**Do it per shot for a reason.** The obvious alternative — total the air, divide it
among the gaps, and run a cumulative clock — was tried and is subtly wrong: on a
worked 30-second example it put the last fragment's first word at `24.90` when its
own shot did not begin until `25.0`, so the line opened a tenth of a second before
its picture. Small, inaudible, and a direct breach of the boundary rule two
sections down. Deriving `vo_start` from the shot's own `start` makes that
impossible by construction rather than by a check.

It also spreads correctly on its own. Because the word band keeps each fragment
roughly proportional to its shot, taking a fixed share of each shot's slack leaves
even gaps without any global arithmetic. On that same example — 18 seconds of
speech across six shots in a 30-second ad — it yields a `0.98s` lead-in, a largest
gap of `2.38s`, a `0.91s` tail, and speech in all three thirds. The identical
script read as one continuous block yields a single 12-second hole.

Two edges to handle explicitly:

- **A shot with an empty fragment** is a deliberate silence, and it will show up as
  a long gap. That is fine and it is *not* a defect — but say so at delivery, so a
  long quiet stretch reads as a choice rather than a fault.
- **Negative slack** means the fragment is over the ceiling for its window. That is
  the overrun path above; fix it there, not here.

**Then check the distribution, which is the check that matters.** Total coverage
is the wrong measurement on its own — it cannot tell 18 seconds spread evenly from
18 seconds in a block, and those are a good ad and a broken one. Check instead:

- **Largest single silence** — no gap longer than **2.5s** anywhere in the cut,
  and none longer than `1.5s` at the tail. One long gap is the whole failure mode.
  A gap that falls inside a shot with a deliberately empty fragment is exempt, and
  is reported as intended silence rather than counted against this limit.
- **Per-shot presence** — every shot whose fragment is non-empty has speech inside
  its own window.
- **No empty third** — speech is present somewhere in each third of the runtime.

A cut can pass a coverage figure and fail all three. Report the largest gap next
to the coverage number, always, so the two are read together.

## Stage 5 — Voiceover, one clip per line

Run the pre-spend steps in SKILL.md before the first fragment, then:

**Generate one audio clip per fragment, and place each at its own `vo_start`.**
Never one continuous read.

A single read has to be cut apart afterwards by detecting silence, which assumes
the speech engine left detectable gaps. It is a rescue, not a design, and it fails
quietly by bunching every word into the opening seconds.

**Two things must be turned off in the hand-off, because the sibling does them by
default and both are correct outside this pipeline.** `media-audio-generation`
generates one request per part and then (a) **concatenates the parts** with a fixed
0.35s of silence between them, and (b) **appends digital silence** when the audio
comes in shorter than its window. Standalone, that is exactly right. Here it is the
defect: you get one welded file with 0.35-second gaps and every spare second pooled
at the tail, which is how eighteen seconds of speech became a front-loaded
thirty-second ad. The gaps in this pipeline are not 0.35s — on the worked example
they are 1.6s to 2.4s, derived from each shot's own slack.

So the hand-off must say, in these terms: **return the parts unconcatenated, as one
file per fragment, and do not pad any of them.** Placement and padding belong to
this skill, which is the only place that knows the shot boundaries. If the sibling
returns a single joined file anyway, do not accept it and split it on silence —
that is the rescue this stage exists to eliminate. Re-request per fragment.

**Pin the voice once, before the first call, and send that same voice identifier
on every fragment.** This is what makes per-fragment generation safe: separate
calls with a default or drifting voice produce an ad that changes narrator between
shots, which is far more obvious than any timing fault. If the route cannot pin a
voice, that is a reason to change route, not a reason to go back to one long read.
Fix the speaking rate, tone and language the same way — one setting, reused.

Then check each segment against its window. The two directions are **not**
symmetric, and treating them as if they were is what produced a padded script:

- **Overrun** — segment longer than its window. A defect. Re-generate shorter, or
  trim the line, or take seconds from a neighbour per the boundary rule below.
  Never speed the read up: it is audible, and "just have the voiceover read
  faster" is what produced a rushed cut once already.
- **Underrun** — segment shorter than its window. **Not a defect.** It is spare
  time, and stage 1b already decided where it goes. Re-centre the fragment on its
  `vo_start` and carry on. Do **not** lengthen the line, do not stretch the audio,
  and do not let the leftover collect at the end of the ad.

After placing every fragment, **re-measure the three distribution checks from
stage 1b against the real segment lengths** — largest gap, per-shot presence, no
empty third. The planned figures came from an estimate of speaking rate; these
come from audio that exists (ffprobe each fragment; `node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs plan-measured artifacts/<project>/plan.json`
prints each one's measured length against the plan). If the real lengths have opened a gap wider than
2.5s, redistribute the air now, before mixing, by shifting `vo_start` values. That
is free. Discovering it at stage 9 is not.

**If the audio has to be cut, cut on a scene boundary.** When a line genuinely
overruns and trimming words is not acceptable, the seconds come from somewhere,
and the only safe place is a window edge. Move the boundary between two shots and
re-derive both `start` values — never let a line bleed across a cut, and never
fade a word mid-syllable to make an arithmetic problem go away. A voiceover that
finishes a sentence over the next scene reads as a mistake even when every
individual asset is good. If moving the boundary means a clip is now longer than
what was rendered, that is a re-render and it goes back to the fence; say so
rather than stretching or looping the footage.

Silence between rows is correct. Silence at the end is the cut running long.
