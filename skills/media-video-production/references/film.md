# The shot-planned keyframe film (Form: film)

Read this before stage 1 when Step 0 set `Form` to `film`. A film runs every stage of SKILL.md in
the same order and keeps every rule there. This file adds what a story told in shots needs on top:
a screenplay or plan behind the plan gate, identity masters and one approved keyframe per shot
behind a frame gate, one move per clip, a drift check before the fence, and a score under the
narration. The method is the capability assessment's shared film pattern, taken from its film,
explainer, story, tour, trailer and list methods and written here in SL8's words. It is documented,
not observed: no film has been made through this path on SL8 yet.

## Contents
- [What the film path changes](#what-the-film-path-changes)
- [F1 · Screenplay or plan (stage 1)](#f1--screenplay-or-plan-stage-1)
- [F2 · The plan gate (stage 1c)](#f2--the-plan-gate-stage-1c)
- [F3 · Masters, then one keyframe per shot (stage 2)](#f3--masters-then-one-keyframe-per-shot-stage-2)
- [F4 · The frame gate (stage 2b)](#f4--the-frame-gate-stage-2b)
- [F5 · One clip per shot, one move per clip (stage 3)](#f5--one-clip-per-shot-one-move-per-clip-stage-3)
- [F6 · The drift check (before the fence)](#f6--the-drift-check-before-the-fence)
- [F7 · Narration, score and assembly (stages 5–10)](#f7--narration-score-and-assembly-stages-510)
- [Not offered on this machine yet](#not-offered-on-this-machine-yet)

## What the film path changes

| Stage | Piece (the default) | Film |
|---|---|---|
| 1 | script, shot list, windows | a screenplay (a story) or a shot plan (a tour, an explainer, a list), with a style line and a cast |
| 1c | story gate | the same gate, showing the screenplay or plan: the plan gate |
| 2 | stills for hero shots | masters, then a keyframe for **every** shot |
| 2b | — | the **frame gate** (`Approve frames`) |
| 3 | one clip per shot | one clip per shot, from its keyframe, with **one move** |
| 3–4 | motion measured, then the fence | motion measured, the **drift check**, then the fence |
| 5–10 | | unchanged; masters and keyframes are delivered under `keyframes/` |

## F1 · Screenplay or plan (stage 1)

The rows are the timing contract's (`references/timing-contract.md`), and every rule there holds:
one physical beat per `action`, `look` in absolute terms, words inside the band. A film row adds
`cast` (who is in frame at the shot's first instant) and `cut` (`hard`, or `pinned` when an action
carries across the cut into the next row; F3).

- **A `pinned` row is never trimmed.** Its `dur` equals its `render_dur`, and the join to the next
  row is a hard cut at the handoff frame. The pair shares one handoff sentence, word for word the
  same in both clip prompts (who is where, pose, gaze, screen direction, what each holds, the
  light), and the end cue of row n, the start cue of row n+1 and that sentence must agree. A pair
  that crosses a scene names the scene move (a match on action, a sound bridge or a cut on a
  gesture) in the plan; a pair that cannot be written to agree is two `hard` rows.
- **Join type.** Each row's `join` to the next is one of `cut`, `match on action` or `scene move`;
  the delivery record lists it with the clip's timecodes.

- **A story** (characters and events): the screenplay (`artifacts/<project>/source/screenplay.md`)
  is the only place the story is written; every other file names its parts and never retells
  them. It holds the title and premise; the
  style line; each recurring character with three appearance fields (clothes, hair and make-up,
  condition), each place, and each prop the story turns on; the beats in order, each beat after the
  first caused by an earlier one and leaving something the viewer sees or hears; then per row its
  one action and its narrator line, if any.
- **A tour, an explainer or a list**: the plan is the shot list in the order the viewer meets
  things, one row per thing shown.
- **Style line**: one short line that fixes medium, period, palette, light, texture, lens and how
  the camera behaves. It opens every master, keyframe and clip prompt, word for word; each row's
  `look` still says how its light differs.
- **Cast.** Default: a film of 30 s or less has one or two main characters, and a shot has at most
  two people acting together; a kit or brief may name more.
- **Speech** follows Step 0's `Voice`: narration (one narrator, stage 5's fragments) or none. Lines
  spoken on screen are not offered on this machine yet (below); narration stands in. A
  narrator line stays inside its row's window.
- **Preset treatments** (a children's film, a horror or thriller) are kept as the brief's policy:
  the brief's guardrails apply to every prompt and are stated in the screenplay's header.
- **Self-check before anything is shown**, and again after every edit: each beat after the first
  names its cause; each row has one action; each name in `cast` has a master; each narrator line
  fits its band; each `pinned` pair agrees (above). Fix every failure first.

## F2 · The plan gate (stage 1c)

The plan gate is stage 1c's `Approve structure` gate, opened by the same command. Its beat map
shows the screenplay or plan, the style line, the cast and places (their masters still to make),
each row's `cut`, and the whole quote from the pre-spend steps. The brief answers it when it already
fixes the screenplay; unattended, it is recorded and the job goes on (SKILL.md, Stage 1c).

A change to the approved plan voids every keyframe and clip prompt it touches: rebuild those, and
name them in PROGRESS.md.

## F3 · Masters, then one keyframe per shot (stage 2)

media-image-generation owns every still call, its route and its quote: load it as SKILL.md says,
then run the pre-spend steps. Every still goes in `artifacts/<project>/keyframes/`, with a manifest
row each, named so they sort in row order: masters `master-<name>.png`, keyframes `shot01.png`,
`shot02.png` (zero-padded), a handoff keyframe `shot01-end.png`. Make the **masters**
first, all of them before any keyframe:

- one per recurring character: the whole figure, a neutral pose, a plain background, the first
  appearance;
- one per place: empty of people, at its time of day, in the film's aspect;
- one per prop the story turns on, in its first state.

A photo the customer supplies of a place or a prop is that subject's master. A real person's face
or voice is refused on this machine until SL8's consent text and privacy note are approved
(HR17; not offered on this machine yet; the brief's invented or described characters stand in).

Then one **keyframe** per row: the shot's first instant, posed mid-action, with only the row's
`cast` in frame.

- It is an edit of the masters it uses, passed as references in the order its prompt names them
  (one `--ref` per file); always the masters, never an earlier keyframe (HR11).
- Its prompt opens with the style line, names each subject in the same words every time, says what
  must stay (face, build, clothes, materials, palette, light) and the one thing this shot changes
  (a prop's new state, wet clothes, a later hour).
- No lettering, logos or watermarks in any generated frame; text is burned last (HR10).
- A `pinned` row gets one more keyframe, the handoff instant: who is where, pose, gaze, screen
  direction, clothes, what each holds, the light, and this shot's framing at its end. It is this
  clip's last frame **and** the next row's keyframe: that next row has no keyframe of its own, and
  its framing at its first instant is the handoff's (F1 writes the two rows to agree).

**Default: media-image-generation's picks for each frame (HR22): `fal-ai/nano-banana-pro` for a
master; for a keyframe built from several masters, its multi-reference row, whose fallback
`fal-ai/nano-banana-pro/edit` is the route the assessment's film methods name; a kit or brief may
name another.** The delivery names each route used. Set the film's aspect on every call with
`--aspect-ratio 9:16` (the typed flag, which sends `aspect_ratio`; `-s/--size` sends `image_size`,
which these routes do not use) and `--strict-params`, and confirm the field with
`ai-gen info <route> --format json` (HR2); the `fal-ai/nano-banana-pro` text route defaults to 1:1.
Set the resolution tier as `resolution=2K` (`k=v`; `image` has no `--resolution` flag). The film methods' wording was tuned on vendor
hosts; it has not been run on ours.

Open every keyframe and look at the image itself against its masters and the style line (a
vision-capable read of the file, not its name or prompt), and print
`row n: keyframe against masters — same / [what differs]` (face, clothes, place, prop state, an
extra person or hand, lettering). Redo a failing keyframe once, changing only what failed (HR7).
**A keyframe still failing after its one redo is never sent to a clip:** the row leaves the clip
batch and is listed as `FRAME FAILED` at the frame gate (a master that fails twice fails every
keyframe built on it). Unattended, the gate is recorded and the job goes on only when every
keyframe printed `same`; otherwise the gate stays a spend gate and the job ends `partial` with the
failing rows named, before any clip is quoted.

## F4 · The frame gate (stage 2b)

Make two sheets, passing the files in row order (the sheet draws no labels and takes files in the
order given): the masters,
`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet artifacts/<project>/keyframes/master-*.png --out artifacts/<project>/qc/masters.jpg`,
and the keyframes, `... sheet <shot01.png> <shot01-end.png> <shot02.png> ... --out artifacts/<project>/qc/frames.jpg`.
View both sheet images before the gate is opened. Write the frames into PROGRESS.md (row, action,
cast, the printed line, cost) with the **tile order** (the row number or file name of each tile, left
to right, top to bottom) beside the gate, then open the gate and end the job `partial`:

`node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-frames --question "Approve the <n> keyframes in PROGRESS.md (sheet qc/frames.jpg) and render the clips for <quote> credits, or name the frames to redo?" --options '[{"id":"a","label":"Approve: render the clips","credits":<quote>},{"id":"b","label":"Redo some: name the frame numbers","credits":<per-frame quote>},{"id":"c","label":"Stop here, give me the plan and frames","credits":0}]' --resume-at "stage 3: clips, or the frames the answer names" --quote <quote>`

- **No clip is submitted before this gate is answered** or, unattended (`autonomy: autonomous`),
  recorded: add `--kind text --default a`, go on, and list the gate in the delivery.
- **The numbers travel in the answer.** `gate.mjs answer` has no free-text field: answer option `b`
  with `--by "owner: redo shot03, shot07"`, and the resume step reads that string from the gate's
  JSON (`answer.by`) and from PROGRESS.md. It is a gate.mjs gap (VID-L591).
- A redone master re-makes every keyframe built on it; redo only those, then return to this gate.
- `Review: run-through` from Step 0 waives this gate with the clip fence, from intake only; the
  delivery then says no frame was approved before the clip spend.

## F5 · One clip per shot, one move per clip (stage 3)

Every clip is image-to-video from its approved keyframe; no film row is text-to-video. Hand each
row to media-video-generation as SKILL.md stage 3 says; it owns the route and the quote, and P3's
face rule comes first. **Default for a keyframe row: `bytedance/seedance-2.0/image-to-video`; a kit or brief may name another.** Before the batch, run `ai-gen info <route> --format json` once per
route the film uses and print one line: aspect values, duration enum, whether an end frame is
taken, the reference cap (HR2; never recall a capability).

A `pinned` row also needs its end frame, by route:

| Route | Pinned row | Cost note |
|---|---|---|
| `bytedance/seedance-2.0/image-to-video` | `ai-gen video -m <route> --image <keyframe> --last-frame <handoff> -o artifacts/<project>/clips/ --queue --format json` | about 378 cr per 5 s at 720p, no audio |
| `minimax/h3/image-to-video` | the same flags (`--last-frame` maps to `end_image_url`) | quote first-last calls at 30 cr per 5 s until 2026-10-15, then 50; the estimate prices only the start frame (media-video-generation facts) |
| Veo 3.1 first-last route | upload both frames first, put the hosted URLs in a params file as `first_frame_url` and `last_frame_url`, and run with `--params-file ... --strict-params` (`--image` and `--last-frame` do not map to those fields) | quote with `ai-gen estimate` |

A path written into `end_image_url` on `run` is not uploaded. Where P3 sends a face row to a route
with no end frame, that row is not pinned: it becomes a `hard` cut, and P3's line for the row says
so. Keep one route for the whole film where P3 allows.

The clip prompt opens with the style line, then the row's one action, then one camera move or a
locked camera, at real speed, over a short distance. It names only what moves: it never describes
the subject again, and it says everything else stays as the first frame shows it. The model can
only reveal what the keyframe holds, so whatever the move arrives at is in the keyframe already.
Default moves avoided unless a kit or brief asks for one: a shaking handheld camera, zooming, a
fisheye lens, ramped or slowed speed, whip pans and fast spins. No music and no lettering in a shot
prompt: the score comes at stage 6 and text at stage 8. P1–P3 still print per row; P2's line counts
the moves.

## F6 · The drift check (before the fence)

After the motion measure, for every clip:

1. Pull its first, middle and last frames (create the folder first):
   `mkdir -p work/<project>/drift` then
   `ffmpeg -v error -nostdin -y -ss <t> -i artifacts/<project>/clips/shot<nn>.mp4 -frames:v 1 work/<project>/drift/<nn>-a.png`
   at 0 (`-a`) and at half of the clip's measured duration (`-b`); the last frame (`-c`) with
   `-sseof -0.1` in place of `-ss <t>`. Check each file exists.
2. Sheet them in time order beside the row's keyframe and the masters its `cast` names:
   `node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet <keyframe> <master-a.png> <master-b.png> work/<project>/drift/<nn>-a.png work/<project>/drift/<nn>-b.png work/<project>/drift/<nn>-c.png --out artifacts/<project>/qc/drift-<nn>.jpg`,
   and view it.
3. On a `pinned` row, also run
   `node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs endpoints <clip> <its keyframe> <its handoff keyframe>`:
   it fails a clip that does not start and end on its frames.
4. Read the sheet for a changed face or clothes, a room that gains or loses furniture, walls or
   windows that move, a prop in the wrong state, an extra or missing person, extra hands,
   lettering, or a cut hidden inside the clip. Print `row n: drift — none / [what changed, at which frame]`.

A drifting clip gets the shot's one retry (the single retry whatever caused it, media-video-generation's
and HR7's) from the same keyframe with a shorter, smaller move (say the camera travels only a short
way). A clip that already used its retry for a frozen result goes straight to the fence, marked
`DRIFT` (or `LOOKS STATIC`), with both takes; never a third (HR7). When the keyframe caused the miss, the fix is a new keyframe (the
frame gate's redo), not another take. This is a reading of frames, not a measurement (HR14): print
what you saw, and the fence decides.

## F7 · Narration, score and assembly (stages 5–10)

- **Narration** is stage 5, unchanged; a film without words skips it.
- **Score.** Default: one instrumental bed for the whole film from media-audio-generation's music
  route, made after the fence (stage 6) and no shorter than the runtime; a kit or brief may
  name another or supply a track. It is ducked under the narration as `references/mix-and-duck.md`
  says; with no narration it is the only audio, normalised to −16 LUFS.
- **Assembly** is stages 7–10 as written: trim each clip from its start to `dur` (never a window
  longer than the clip, which would freeze on its last frame) except a `pinned` clip, which is not
  trimmed from its end (F1; if a trim is unavoidable, trim the head of the next row), join in row
  order, run `mediaqc.mjs endpoints` again on each `pinned` clip as joined, burn text last, watch
  and listen. Deliver the masters and keyframes under `keyframes/` with the screenplay or
  plan, and list the frame gate, every drift line and each join type with its timecodes in the delivery
  record.

## Not offered on this machine yet

Each names what stands in for it here.

- **Lines spoken on screen** (a character talking in the clip's own audio, with voices held by
  description or by voice samples): not offered on this machine yet. Narration stands in.
- **Shots driven by references instead of a keyframe** (character, place and voice references in
  one call), voice samples or cloned voices for a film, and separate images of a prop in use: not
  offered on this machine yet. A keyframe per shot, edited from the masters, stands in.
- **Fifteen-second shots carrying five timed actions, compiled into a fixed seven-part clip
  prompt**: not offered on this machine yet. One beat per row stands in; a longer moment is two rows.
- **The real last frame of one clip chained into the next**: not offered on this machine yet. The
  generated handoff keyframe (F3) stands in.
- **Recording the narration before any frame and cutting the shots on its sentence ends**: not
  offered on this machine yet. The timing contract's windows and stage 5's re-measure stand in.
- **An SRT of the narration timed from the script**: not offered on this machine yet. Stage 8b's
  captions, timed from measured words, stand in when the brief asks for captions.
- **Upscaling a clip after review**: not offered on this machine yet. Render at the declared
  resolution, pinned (HR4).
