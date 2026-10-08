---
name: media-video-production
description: >-
  Runs a multi-shot video job end to end: script and per-shot timing contract, hero stills, one
  clip per shot, a clip review fence, voiceover placed per shot, music bed, sidechain duck and
  loudness, titles burned last in one encode, a final watch-and-listen, and delivery
  with stems, plan and manifest. Quotes each paid stage first; every approval is a gate file
  (attended jobs stop there, unattended ones record it). Use when: make a
  video, short film, explainer, promo or narrated piece from a brief, script or stills; put a
  voiceover and music under generated clips; assemble, mix, duck, normalise or burn titles over a
  multi-shot cut; resume a video project stopped at a gate. NOT for: one clip from a prompt
  (media-video-generation); a voiceover, bed or transcript alone (media-audio-generation); a
  script alone (media-script-writer); shot wording (media-shot-craft); overlay type and motion
  alone (media-motion-graphics); stills (media-image-generation); running ai-gen (media-ai-gen);
  measuring files (media-qc).
license: Adapted from fal agent skills; no licence stated; used with attribution
compatibility: "sl8-video >=1.0.1 (sl8-image 1.0.1, Base 2.0.2); ai-gen 2.2.0; media-ai-gen 1.0.3; media-qc 1.1.0; ffmpeg and ffprobe; python-imaging 1.0.0 (Pillow 11.2.1, numpy, opencv-python-headless, scikit-image); fonts pack 1.1.0; fal endpoints as of 2026-10-05"
metadata:
  version: 1.0.4
  revision: 2026-10-08a
  house-rules: HR-1.0
  upstream: fal-agent/fal-video-production  # source only; that skill is not on this machine
  upstream-pin: export 2026-10-05
  attribution: Adapted from fal (fal.ai/agent/skills export 2026-10-05)
  deltas: VID-D60..VID-D79, VID-D100, VID-D103, VID-D104, VID-D108, VID-D113, VID-D118, VID-D119
---

# Video Production

A pipeline, not a router. It sequences skills that already exist and owns only the
four things none of them own: the **timing contract** between script and audio,
the **review fence** after the clips render, the **assembly**, and the **final
watch-and-listen** on the file that is about to be delivered.

Every generation call belongs to a sibling. This skill's job is to make sure
nothing between the steps gets dropped — which is the failure it was written for.

## What this exists to prevent

Two real production runs produced seven defects, and six happened *between* steps rather than
inside one: one continuous voiceover read, clips nobody saw before the spend, a frozen shot, a
two-action shot that took three attempts, lower-thirds never burned, ducking decided ad hoc, and a
30-second cut shipped with 18 seconds of audio that no check objected to. **A check that can only
fail in one direction will pass the opposite failure**, so the timing checks here are deliberately
**asymmetric**, and the measurement that matters is the **largest single gap**, not total coverage.
The full account is the opening of [references/timing-contract.md](references/timing-contract.md).

## Stage table

Each stage names the skill or endpoint that owns it. The fallback column is what
to do when the owner is unavailable — never "do it here anyway, unlabelled".

| # | Stage | Owner | Fallback when the owner will not load |
|---|---|---|---|
| 1 | Script, shot list, per-shot windows | `media-script-writer` | Draft the shot list here and **label it undrafted by the specialist**; keep the window arithmetic, it is this skill's contract |
| 2 | Opening stills — **mandatory for hero shots**, optional elsewhere | `media-image-generation` | Animate from text and say so, noting that the hero shot was never approved as a frame |
| 3 | Animate one clip per shot | `media-video-generation` | **No fallback — stop.** Clips are the deliverable; there is no degraded version worth billing for |
| 4 | **Clip review fence** | this skill, as a gate file | None. The fence does not degrade |
| 5 | Voiceover, **one file per fragment, unconcatenated and unpadded** | `media-audio-generation` | Deliver silent with the plan and manifest attached, and say the voiceover is outstanding |
| 6 | Music bed | `media-audio-generation` | Accept a user-supplied track, or deliver without music and say so |
| 7 | Mix, duck, normalise | this skill, in the sandbox | None needed — local work |
| 8 | Burn on-screen text, last | **this skill, in the sandbox, with `media-motion-graphics`** — the one overlay mechanism on this machine | None; never skip, never ship silently untexted |
| 8b | Captions of the voiceover, if asked for | `media-motion-graphics`, timed from measured words | Skip and say so — captions are an optional extra deliverable, not the lower-thirds |
| 9 | **Watch and listen to the finished file** | `fal-ai/elevenlabs/speech-to-text/scribe-v2` through `ai-gen`; `fal-ai/video-understanding` only when priced (optional) | `fal-ai/sa2va/8b/video` or a contact sheet of mid-window frames for the watch; `fal-ai/speech-to-text` for the transcript — **but it returns no word timings**, so say the placement check could not be run |
| 10 | Deliver with the measured figures | this skill | — |

**Stages 3 and 8 both re-render pixels, and 8 must follow every one of them.**
That ordering is why burn-in is stage 8 and not stage 5.

Stages 1, 1b and 5 are written out in [references/timing-contract.md](references/timing-contract.md),
stages 6–7 in [references/mix-and-duck.md](references/mix-and-duck.md), stage 8 and the delivery
record in [references/burn-and-deliver.md](references/burn-and-deliver.md), and stage 9 in
[references/watch-and-listen.md](references/watch-and-listen.md). Read each before its stage.

## Step 0 — Declared defaults, no card

A job runs headless: no one can answer a question inside it, so this skill never asks one (HR12).
Read `autonomy` in `$HOME/.sl8/run.json` once. `autonomous` means **unattended**: no one answers
mid-job, so the review gates (structure, clips) are recorded and the job goes on (Stage 4); any
other value means a person is attending and answers them.
**On an existing project, the first command is**
`node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs status --project <project>`, then the resume
protocol in media-ai-gen's `references/gates-and-manifest.md` (1.0.3): an open gate the brief answers
is recorded with `gate.mjs answer` and the job resumes at its `resume_at`; an open **spend** gate the
brief does not answer means spend nothing, restate it, and end `partial` again; an open text gate
proceeds on its default, flagged in the delivery.

Drop any question the brief already answers; each one it leaves unset proceeds on the stated
default, written into `plan.json` `declared` and flagged in the delivery.

1. **Brief** — what the piece is, who it is for, what it has to land. Read it from the job's brief.
2. **Runtime** — total finished duration, **taken from the brief**; there is no house length. With
   none stated, the length the script needs (stage 1 arithmetic); with no script either, one shot
   per beat the brief names, each at the route's floor.
3. **Shape** — **taken from the brief**; with none stated, the aspect of the still or footage the
   brief supplies, else 16:9.
4. **Voiceover** (`Voice`) — default **yes, one narrator**. `None` skips
   stage 5 and the ducking half of 7.
5. **On-screen text** — the exact strings for
   lower-thirds, plus any end card. **Default none**, never drafted here: a
   misspelt brand name burned into a finished cut is worse than no text.
6. **Review** — `Pause after the clips` (**default**) or
   `Run straight through, do not pause` (the brief says `review: run-through`). This is the only
   place the fence can be waived, and it is waived *before* anything is spent, never during: record
   it now with `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule HR12 --instruction "<the brief's words>"`.
7. **Native clip audio** (`Clip audio`) — `Discard` (**default** on a route that charges for it)
   or `Generate and keep it as a stem`. Every generation route defaults
   `generate_audio: true`. On Veo and Kling it charges 50–100% more for it, so the pipeline pins it
   off there: the piece gets a written voiceover and a chosen bed, and the model's guess at
   room tone is thrown away. On Seedance it costs the same either way (media-video-generation's
   facts; confirm with an `ai-gen estimate` pair), so there keep it as a stem: keeping is free.
   **But it is thrown away permanently.** Wanting it
   later means re-rendering every shot at full price, which costs far more than
   generating it once would have. So the choice is settled here, with that
   asymmetry stated, and whichever way it goes the delivery says so. If the brief has
   any diegetic sound — a pour, a door, footfalls that should be heard
   rather than replaced — keep it.

**Three further headers are declared here and fire later, as gate files** (media-ai-gen's
`gate.mjs`). They ask about work that does not exist yet, so each fires at the stage that needs
it. Each states what happens with no answer:

- **`Approve structure`** — the story gate at stage 1c, before anything renders.
  **No answer means stop**, beat map delivered, nothing rendered. Waivable only
  here, alongside `Review`.
- **`Approve clips`** — the fence at stage 4. **No answer means stop**, clips
  delivered, remaining stages unrun. Unattended, both review gates are recorded instead (Stage 4).
- **`Reshoot`** — which clip numbers to redo: an option of the `Approve clips` gate, answered
  with the numbers. No answer means stop, as above.
- **`Music`** — mood or a supplied track, settled only when `Voice` is on and the
  brief named no music. No answer means **deliver without a bed**, which is a
  complete piece, so this one never blocks: a stated default, flagged in the delivery.

Stage 9 asks nothing. It measures, and reports what it measured.

## Before every paid stage, in order

Stages 2, 3, 5, 6, 8b and 9 spend credits, and every reshoot spends again. These are steps, not a
warning (HR19):

1. Load `media-ai-gen` (Claude Code: the Skill tool; any other agent: read its whole
   `$HOME/.agents/skills/media-ai-gen/SKILL.md`). It runs every model on this machine, writes the
   manifest row (HR9) and opens gates (HR12). Then load, the same way, each sibling that owns a stage
   you quote: `media-video-generation` for clips, `media-audio-generation` for voice and bed,
   `media-image-generation` for stills. Each owns its route choice and its quote; its tables alone
   are not enough.
2. Start the project record once:
   `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs init --project <project>`.
3. Quote. At the end of stage 1, before the first paid call, quote **the whole job, one line per
   paid stage, with a running total**: stills, clips (on Σ`render_dur`), voiceover fragments, bed,
   the stage-9 transcript. Each line starts from `ai-gen estimate <id> --params-file <p.json> --format json`
   with the params you will send, then is raised to the bill SL8 measured where the estimate runs low
   (list prices under-bill, and the estimate cannot see media flags): `minimax/h3-max-turbo/image-to-video`
   with a start and an end frame bills **30 per 5 s** at 768P against an estimate of 19 (a promotional
   bill until 2026-10-15; then quote 50 per 5 s until it is measured again), and Kokoro bills about
   **5 per call** however short the line (the siblings' facts). Write the table into `plan.json` `budget`
   as media-ai-gen's budget shape, `{"credits", "approved_by"}` (the grant and who gave it), extended so
   one plan shape serves both machines: `{"credits": 140, "approved_by": "brief", "lines": [{"stage",
   "endpoint", "calls", "estimate", "quote"}], "total"}` (`quote`: what that line should bill; `total`:
   their sum), and into PROGRESS.md. Re-quote each later paid stage the same way; a re-run (reshoot,
   retake) adds its own line and raises `total` before the call.
4. Read what remains: `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>`.
   When it prints `remaining: null` (no ceiling), what remains is the brief's budget, or the quote
   of the gate the person last approved, less what the manifest records as spent.
5. If the quote is more than what remains (the running total before the first paid call; the
   stage's own line after that), and that includes a run with **no spend authority** (ceiling 0,
   or no ceiling, budget or approved quote at all), open the gate and end the job there:
   `node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-<stage> --question "<what, route, credits>" --options '[{"id":"a","label":"<stage and route>","credits":<quote>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "<this stage>" --quote <quote>`.
   The gate file, not a question in your reply, is how a job asks; it writes
   `artifacts/<project>/outcome.json` as `partial`.
   Then **stop there**. A job never answers its own spend gate (the owner does; media-ai-gen refuses
   it), and a paid step that cannot run is never replaced by a local stand-in (camera moves over a
   still in place of generated motion, a locally installed voice or transcription model) or by
   installing tools (`pip`, `npm`, model downloads; HR21). The first `ai-gen estimate` in a fresh
   machine can take 1–3 minutes: wait for it; a slow quote is not a reason to go local.
6. Submit with `--queue`, `-o artifacts/<project>/<node>/` and `--format json`; never `status --wait`.
   Record one manifest row per generation with `manifest.mjs add`. An unpriced route (`estimate`
   exit 12) is uncapped: take the stage's named fallback, or open the gate.

## Stage 1 — The timing contract

Read [references/timing-contract.md](references/timing-contract.md) first: it holds stages 1, 1b
and 5 in full. The contract is `artifacts/<project>/plan.json` `rows` (`n, start, dur, render_dur,
action, look, vo, vo_words, vo_start, overlay`), built before a single clip renders, in this order:
choose the route, write each row's `render_dur` from its legal durations, then `dur` from the pacing
the brief asks for. One physical beat per `action`; every `look` in absolute terms; `vo_words`
between `dur × 1.9` (the comfort floor, a signal) and `dur × 2.7` (the ceiling, a defect). After
render, `render_dur` is what ffprobe measures, not what was requested.

## Stage 1b — Split the script across the clips, then spread the air

Cut the script at natural boundaries, one fragment per shot, and place each fragment's air inside
its own window: `vo_start = start + 0.35 × slack`. Check the distribution, not the coverage: no
gap over 2.5 s, none over 1.5 s at the tail, speech inside every shot with a fragment, speech in
every third of the runtime. The full stage is in [references/timing-contract.md](references/timing-contract.md).

## Stage 1c — The story gate, before any pixels

**Stop here and get the structure signed off.** This is the cheapest gate in the
pipeline and the one that saves the most, because the structural shape of a piece
is the single most expensive thing to change after clips exist — and it is the
thing a reader can only judge once they see it stated plainly.

A run whose brief storyboarded a gradual in-kitchen escalation was executed
faithfully, and the author then rewrote the core structure **twice** after watching
rendered clips — moving to a smash cut, then adding a beat. That was not a defect
in the brief or the execution; it was a better idea arriving late, which is normal.
What was wrong is that it arrived *after* animation instead of before, so each
revision cost renders instead of costing a sentence.

Present the spine as a short numbered beat map — shot number, the one action, the
`look`, and the VO fragment — plus the three questions that decide its shape:

1. **Is the change gradual or a smash cut?** State which the beat map implements
   and where the pivot sits.
2. **Which beats did the shot budget drop?** From `media-script-writer`'s triage, in
   priority order.
3. **What is the payoff shot, and does anything build into it?** Name the shots
   either side of the pivot and what carries.

Write the beat map and the three answers into PROGRESS.md, then open one gate, header
`Approve structure`, declared in Step 0, and end the job `partial`:
`node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-structure --question "Approve the beat map in PROGRESS.md and render it for <quote> credits?" --options '[{"id":"a","label":"Approve: start rendering","credits":<quote>},{"id":"b","label":"Change the structure (say how)","credits":0},{"id":"c","label":"Stop: I will revise the brief","credits":0}]' --resume-at "stage 2: stills" --quote <quote>`.
The quote is the running total from the pre-spend steps.

**The brief answers this gate when it already fixes the structure** (Step 0: drop any question
the brief already answers): it names the shots, one action each, in order, and the beat map
implements exactly that, nothing added, dropped or merged. Then record the brief's answer instead
of stopping: open the same gate with `--kind text --default a`, answer it at once with
`gate.mjs answer --project <project> --gate <NN> --option a --by "brief: <its words>"`, and go on
to the pre-spend steps.

**No answer means stop**, with the beat map delivered and nothing rendered. Unattended, open it
with `--kind text --default a` and go on: the beat map is recorded and flagged in the delivery.
Stopping needs no input, so this gate is safe without a reply; it needs one only to
spend money, which is the correct direction. Like the clip fence, it is waivable
only from intake — and if it was waived, the delivery says the structure was never
approved before rendering.

## Stages 2–3 — Render the clips

**Before wording or critiquing anything visual, load `media-shot-craft`** (Claude Code: the Skill
tool; any other agent: read its whole `$HOME/.agents/skills/media-shot-craft/SKILL.md`). It
carries the craft this pipeline's checks enforce mechanically: the reason
behind precondition P2 (one settled state per clip), the slot grammar for
framing, the motivated-or-locked camera rule, and the
gesture-not-the-named-emotion rule that separates a renderable action from a
mood word. Use it when reviewing stage-1 rows that arrive undrafted by the
specialist, when critiquing a hero still, and when phrasing the motion brief
handed to `media-video-generation`. If it will not load, the plan fields and
P1–P3 below are the minimum, and the delivery says the craft reference was
unavailable.

**Generate a still first for every hero shot, and iterate on the still.** A hero
shot is the one the piece is built to arrive at — the payoff, the reveal, the
product moment, the frame someone will screenshot. Text-to-video gives you one
expensive attempt at composition, subject and world all at once, and if the
landscape comes out shapeless or the subject is badly placed you pay a full clip to
find out. A still is a fraction of the cost and can be regenerated until it is
right, and animating an approved frame then only risks the motion.

This is not a quality nicety, it is where "the terrain looks simple and flat" gets
fixed. Ask `media-image-generation` for the frame (after the pre-spend steps), look at it, say
what is wrong in concrete terms — silhouette, scale, depth, how many planes the landscape has,
where the horizon sits — and regenerate until it holds. **Then** animate it.

Hero shots go through this. Ordinary shots may skip it. If you skip it on a hero
shot, say so in the delivery, because the composition was then never approved by
anyone before it was animated.

### Three preconditions. Print them, per row, before you submit anything

Each of these existed as advice in an earlier version of this skill and each was
skipped by a capable agent under momentum. They are steps now, and each produces a
line you must print, because a check whose only output is your own confidence
leaves no evidence of not having run.

**P1 — An image overlay on a shot that animates is composited into the still, not
burned afterwards.** A logo burned onto moving footage rides the frame like a
sticker while the picture moves underneath it, and no amount of care at stage 8
fixes that: the overlay has to be part of what the motion model sees. So for every
row whose `overlay` carries an image asset **and** whose shot is animated, the
asset is composited into the stage-2 still, and the row may not be submitted for
animation until it is. Print `row n: image overlay composited into still — yes/no`.
A `no` is a hard stop on that row, not a note.

**P2 — One settled state per clip. No transformation verbs.** A single clip renders
one continuous motion, not a change of state. Prompts written as transitions —
"resolves into a skull", "pre-fire to fire", "becomes", "transforms into", "morphs",
"turns into", "shifts to" — ask one clip to be two shots, and the model answers by
cutting or resetting inside the frame, which reads as a glitch. Two reshoot rounds
went to this. **Treat those verbs as a lint failure on the prompt before submit**:
scan each prompt for them, and if one is present, the fix is not a reword but a
split — the settled state goes in the still, the continuous motion goes in the clip,
and if the brief needs the change to be visible it needs two rows. Print
`row n: transformation verbs found — none/[list]`.

**P3 — The route matches the content, decided up front.** Route photorealistic
human likenesses and other moderation-sensitive frames by the face rule in
`media-video-generation`'s routing notes, from the first attempt, at the row's declared
resolution and `render_dur`: Veo 3.1 Fast at 720p for 4, 6 or 8 s and at any length above
720p; `minimax/h3/image-to-video` at 720p for any other length (`768P`) and at 480p for any
length (`480P`); after a refusal, the next route that rule names. Three 422 rounds were spent
discovering this by collision. Print `row n: route chosen for content — <route>, because <reason>`.

Hand each row to `media-video-generation` with its `action`, `render_dur` (the length to render;
`dur` is what the cut keeps), `look` and the shape from intake — and the still's file where stage 2
produced one (passed with `--image`, which uploads it), so the route is
image-to-video rather than text-to-video. That skill owns route choice, cost quoting and its own ceiling of one retry
per shot; **do not override it into a third attempt** — a shot that fails twice
goes to the fence marked failed, and the user decides.

Then, before the fence, **measure every clip for motion**.
`media-video-generation` specifies the measurement and how to calibrate its floor
with a frozen control and a moving control per route, because a fixed threshold is
how this check passes a still image; `node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs motion <clip> --control <frozen-control>`
prints it. Carry three numbers per clip into the fence:
the measured minimum one-second window, the frozen control, and the floor.

A clip below the floor is **flagged, not silently rejected** — it may be a slow
push-in the user wants. The fence is where that is decided.

## Stage 4 — The clip review fence

**Everything before it is cheap and reversible; everything after it costs money
and compounds.**

**First, reconcile the look ramp against the rendered clips — this is mandatory and
it is not the stage-1 check.** Stage 1 checked the ramp you *intended*. This checks
the ramp you *got*, which is the only one the viewer sees. A run wrote a correct
plan and never ran this, and shot 5 came back warm between a deep-red shot 4
and a fire-lit payoff — the pivot of the whole piece, visually disconnected from
both sides.

Sample a mid-frame from every clip, in order, and measure each one's mean hue,
saturation and luminance. Print the three numbers per shot as a table. Then judge
the sequence, not the individual frames: **any shot whose numbers step back toward
the opening's values, where the plan said the mood should build, is a reset**
and goes into the list below marked `LOOK RESET`. The plan's `look` column is
the reference; a clip that does not match its own row is flagged even if it looks
fine alone.

Then write the clips into PROGRESS.md as a numbered list, one line each: number, the `action` it
was meant to show, its motion figure against the floor, its hue/saturation/luminance
against the row above, its cost, and a plain `LOOKS STATIC` or `LOOK RESET` where
either check is under, with a contact sheet of the mid-frames
(`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet <frames> --out artifacts/<project>/qc/clips.jpg`).
Then open **one** gate, header `Approve clips`, and end the job `partial`:

- `Approve all — continue` → stages 5 onward, quoted from the pre-spend steps.
- `Reshoot some` → the answer names the clip numbers (the `Reshoot` header). Reshoot only
  those, re-measure, return to this fence. It repeats.
- `Stop here, give me the clips` → deliver the clips, the plan and the manifest.

`node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-clips --question "Approve the <n> clips listed in PROGRESS.md (sheet qc/clips.jpg) and continue for <quote> credits, or name the clips to reshoot?" --options '[{"id":"a","label":"Approve all: continue","credits":<quote>},{"id":"b","label":"Reshoot some: name the clip numbers","credits":<per-clip quote>},{"id":"c","label":"Stop here, give me the clips","credits":0}]' --resume-at "stage 5: voiceover, or the reshoots the answer names" --quote <quote>`

**Unattended** (`autonomy: autonomous`), add `--kind text --default a` to the same command: the gate
records the clips, the sheet and the figures, and the job goes on to stage 5 without answering it.
It still ends `partial` when a shot failed twice, or when the remaining stages' quote is more than
what remains (the pre-spend steps open that spend gate). The delivery lists the fence, its figures
and every `LOOKS STATIC` or `LOOK RESET` for the owner; a reshoot is a later job, and the stems make
its re-mix free.

Three rules that make this a fence rather than a courtesy when a person is attending:

1. **A sentence in your reply cannot return an answer.** It must be a gate file. "Let me know if
   these look right" is not a checkpoint.
2. **No answer means stop** — deliver the clips, say which stages did not run, end
   the job `partial` (the gate wrote `outcome.json`). Stopping needs no input, so the fence is
   safe without a reply; it needs one only to *continue*, which is the right direction for a spend
   gate.
3. **It is skippable only from intake.** If `Review` was waived, say in the
   delivery that no clip was reviewed before the audio spend.

## Stage 5 — Voiceover, one clip per line

**Generate one audio clip per fragment, and place each at its own `vo_start`.**
Never one continuous read. The hand-off to `media-audio-generation` must say: **return the parts
unconcatenated, as one file per fragment, and do not pad any of them**; and pin one voice before
the first call and send it on every fragment. Run the pre-spend steps first. An overrun is a
defect (shorten the line or move a boundary); an underrun is not (re-centre the fragment on its
`vo_start`). The full stage — the hand-off, the voice pin, the asymmetric checks, the re-measure
and the scene-boundary rule — is in [references/timing-contract.md](references/timing-contract.md).

## Stages 6–7 — Music and the mix

Settle `Music` per Step 0 and run the pre-spend steps for the bed, then assemble in the sandbox
with ffmpeg, from [references/mix-and-duck.md](references/mix-and-duck.md): concatenate the
approved clips in plan order, lay each voiceover segment at its `vo_start`, duck the bed with
`sidechaincompress` keyed to the voiceover (6–9 dB of gain reduction; past 12 dB the music has
stopped), verify the duck in both directions by measuring, and normalise the finished mix to
−16 LUFS after ducking, never before.

## Stage 8 — Burn the on-screen text, last

Run only after every re-rendering step is complete, from
[references/burn-and-deliver.md](references/burn-and-deliver.md). Drive it from the plan's
`overlay` column, not from memory of the brief; an overlay is text *or* an image (a logo is the one
that gets forgotten). Before burning, check the region behind each overlay and, if it is not clear,
**fix the picture, not the text** (a reframe, done before the burn). The type system and the burn
itself are `media-motion-graphics`: load it (Claude Code: the Skill tool; any other agent: read its
whole `$HOME/.agents/skills/media-motion-graphics/SKILL.md`), apply its Steps 1–6 to every `overlay` row, and burn every overlay, plus any voiceover captions
(8b, timed from measured words), in one encode (HR10). **Never deliver a cut with an unburned
`overlay` row silently.**

## Stage 9 — Watch and listen to the finished file

**Nobody has seen the cut yet.** Run both passes on the **final** file, after stage 8, from
[references/watch-and-listen.md](references/watch-and-listen.md). **Listen:** demux the mix to an
audio file first and print its path and size, then transcribe it with word timings and report the
largest silence with its timestamp next to the coverage, per-fragment placement, empty thirds and
transcript fidelity. **Watch:** reconcile scene count, actions and on-screen text against the
plan; the vision route runs only when it is priced, otherwise a contact sheet of mid-window frames
stands in. The stage reports and never re-renders on its own.

## Stage 10 — Deliver

**Hand back the stems, not just the cut.** Every one of these already exists on
disk as a byproduct, so keeping them costs nothing — and not keeping them is what
turns "make the music quieter" into a re-render. Deliver alongside the final file:

- the **picture cut with no audio at all**,
- each **voiceover fragment** as its own file, named by shot number,
- the **music bed** before ducking, and the bed **as mixed** (after the duck), which `mediaqc.mjs duck --bed` measures,
- any **sound-effect** files,
- the **plan** itself (`plan.json`), including every `vo_start`, `render_dur` and trim, and the
  **manifest** (`manifest.json`): one row per generation and per local step, with endpoint,
  request id, params, prompt, credits, attempt and files with sha256 (HR9; run
  `manifest.mjs verify` before delivery),
- and the **native clip audio** as a stem if intake chose to keep it.

They go in named folders under `artifacts/<project>/` (`final/`, `clips/`, `keyframes/`, `audio/`,
`source/`), with PROGRESS.md in media-ai-gen's skeleton (HR8).

With those, any later change of mind about levels, ducking, a line's placement or
the bed is a free re-mix in the sandbox. Without them it is a re-generation. A run
that had to relight, re-animate and swap one shot, and separately re-do the whole
mix for ducking, would have been minutes of local work instead of new calls.

Then state the delivery record — runtime, shape and routes; per-clip motion figures; the largest
silence with its timestamp beside the coverage; placement; the mix figures; overlays; timing
honesty; look continuity; native clip audio; total credits and reshoots; every waiver — in the
block set out in [references/burn-and-deliver.md](references/burn-and-deliver.md#stage-10--the-delivery-record).

## Guardrails

Each states the action it takes on its own, with no further input required.

- **Never invent on-screen text, a brand name, a price, a claim or a URL.** Those
  come from the brief or the `On-screen text` field. With neither, the piece ships
  with no text and the delivery says so.
- **Never fix a timing overrun by speeding up the read**, and never fix an
  underrun by stretching or looping audio. Change the words or change the window.
- **Never pad the script to fill the runtime.** A script shorter than the ad is a
  pacing fact, not a shortfall. Spread the air (stage 1b); do not write filler
  sentences, repeat the brand name, or add a line nobody asked for. Words invented
  to fill time are words nobody approved, and on an ad they are a claims risk as
  well as a quality one.
- **Never generate the voiceover as one continuous read**, and never let the voice
  drift between fragments. Pin it once and reuse it.
- **Never let a voiceover line cross a scene boundary.** Move the boundary and
  re-derive the plan, or trim the line.
- **Never continue past the fence without an answer while a person is attending.** Stop: the gate
  file ends the job `partial`, and the clips are delivered. Unattended, record it (Stage 4).
- **A re-cut cancels every downstream step already planned or queued.** After a
  reshoot or a re-mix, a pending burn-in, transcript or QC step was queued against
  a file that no longer exists, and a row parked as failed earlier is now
  meaningless. One run finished with two stale steps still pending — an old
  text-burn the re-cut had already done, and a dead retry — and clearing them was
  manual. On every re-cut: **name what it supersedes, drop those steps, and say
  which you dropped.** A paid job already submitted cannot be cancelled (`ai-gen cancel` always
  exits 12): fetch it with `ai-gen result <id>`, mark its manifest row `rejected` with the reason
  in `notes`, and never re-fire it (HR6). A queue that outlives its input duplicates work at best
  and burns onto the wrong cut at worst.
- **A reshoot always invalidates the mix.** Re-mix from the stems; never patch the
  old mix. Stems make that free (stage 10), which is why they are delivered.
- **Never call a cut finished before stage 9 has run on it.** If stage 9's owners
  are both unavailable, deliver and say plainly that the finished file was never
  watched or listened to — that is a real gap in the deliverable, not a formality.
- **A shot that fails twice is not attempted a third time.** It goes to the fence
  marked failed, with the failure named.
- **Do not re-implement a sibling's job when it fails to load.** Take the stage
  table's fallback, label the output as not the specialist's, and name the missing
  skill. Stage 3 has no fallback on purpose.
- **Human faces and voices:** any real person's likeness or voice needs their documented consent
  (HR17). Nothing ships with a recognisable real person who was not in the brief.

## House rules (HR-1.0)

Relies on: HR1 (`plan.json` declares, media-qc measures), HR2, HR3, HR4 (`generate_audio` pinned
either way), HR5 (the whole job quoted per stage with a running total), HR6, HR7 (one retry per
shot, never a third), HR8, HR9, HR10 (text and logos burned last, in one encode), HR11 (re-mixes
and re-burns start from the stems, never from a finished cut), HR12 (the story gate, the fence and
every spend are gate files), HR13, HR14, HR15, HR17, HR18 (no invented text, price, claim or URL),
HR19, HR20 (waivers recorded in the manifest), HR21, HR22 — see media-ai-gen/references/house-rules.md.
Not applicable: HR16 (no generation prompt is written here: each sibling owns its route's
rewriter; stage 9's watch prompt asks for checkable facts and is stored as sent).
