---
name: video-ambient-loop
description: >-
  Seamless looping ambient video: one rain scene whose picture and sound loop with no jump, about 30
  seconds, 1, 2 or 2.5 minutes long, vertical unless wide or square is asked, film or real
  unfiltered look, optional soft piano. Decides every choice from the request without asking, makes
  one loop-frame picture, films one 7-second clip with that picture as first and last frame and
  native rain audio, checks frames, seam, voices and level with scripts, then builds a self-closing
  ffmpeg blend cell and repeats it; hard-cut windows are the fallback. Use when: rain video, rain
  ambience, rain sounds for sleep or study, cozy rainy window, snowy window, ambient background
  loop, looping rain for a TV. NOT for: one clip from a prompt (media-video-generation); a narrated
  or multi-shot video (media-video-production); music, a soundscape or sound effects alone
  (media-audio-generation); a still (media-image-generation); scenes with people, arrivals or
  thunder (not this method); measuring files (media-qc).
license: SL8 wording and SL8-authored scripts; method from Everygen's Rain and ambient workflow (no licence stated), restated and cited; points from fal agent skills (no licence stated; used with attribution) and Higgsfield (restated)
compatibility: "sl8-video >=1.5.0 (sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; ffmpeg and ffprobe 5.1 (xfade, acrossfade, amix normalize, ebur128, showspectrumpic, ffv1); python3 3.11 with numpy; faster-whisper optional (voice screen); fal endpoints and prices as of 2026-10-05/06"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [everygen/rainambient-fe45fe, fal/falvideogeneration-fe0127, fal/falaudiogeneration-ba1a03, fal/falvideoproduction-09f33d, higgsfield/wb-app-lane]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27; Everygen guidance captured 2026-10-26)
  approach: WF48-a1
  attribution: Method from the SL8 capability assessment (WF48-a1), restated from Everygen's Rain and ambient workflow with points from fal's video, audio and production skills and Higgsfield's cover animator; scene table, lines and scripts written by SL8
  deltas: VID-D380..VID-D399
---

# Ambient loop video

One picture, a 7-second clip made from that picture with native rain audio, and one self-closing cell
cut from the clip and repeated: the video plays on repeat with no jump in picture or sound. The
customer's chat gets a few calm lines (`references/lines.json`); the job record (`loop.json`,
`run.json`, the manifest, PROGRESS.md) gets every figure. Nothing here has run on this machine: the
numbers are the vendor's, from Seedance 2.5 in its own editor (`references/numbers.md`), and the
scene table, the lines (tuned by the vendor for models we do not run) and the default models are
unproven on ours. Treat the first clip of each scene as a measurement.

```bash
L=$HOME/.agents/skills/video-ambient-loop/scripts
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
```

## What a good one is

- One calm place: bright streaks of rain in front of something dark, shining wet surfaces, depth
  from near the lens to far. Film look (a single warm lamp against a cool blue evening or night,
  or pale silver day) or real look (overcast day, dusk, or a lone light after dark; muted colour,
  no filter).
- No event, yet nothing is frozen (rain falls, water rings, leaves dip and settle, a flame
  flickers): no people or animals, no arrivals, no change of light, no camera movement.
- The sound is the clip's native rain audio; never voices; music only when asked, rain heard
  under it.

## Steps (approach step numbers in brackets)

1. **Start** [1]. This folder is the kit: this file, `references/scenes.json`, `lines.json`,
   `numbers.md` and the two scripts, all read from the machine; nothing is fetched and no vendor
   workflow exists here. Every step is in this file; open a reference at the step that names it.
   Existing project: `node $S/gate.mjs status --project <p>` first (an open spend gate stops the
   job; resume at its `resume_at`). New project (kebab-case, one per video, or the caller's name):
   `node $S/manifest.mjs init --project <p>`.
2. **Decide, never ask** [2].
   `python3 $L/loop_decide.py decide --project <p> --request "<the request as written>" [--scene S --look film|real --frame 9:16|16:9|1:1 --length 30|60|120|145 --music yes|no --model ID --quality best --variety --silent]`
   writes `artifacts/<p>/loop.json` (the job state, with the reason for each choice) and the params
   files in `work/<p>/`. A kit, brief or caller choice is an override flag and always wins. Nothing
   is asked before the first output, and nothing at all in a bot job (HR12). The rules it applies:
   - **Scene:** the one named (`match` words in scenes.json); a real look with no place: the garden;
     mood words: sleep or cozy, the window seat; study or focus, the city window; else the window
     seat. A scene the customer describes: `--scene custom` with the four lines of step 4.
   - **Look:** the scene's own (real for the garden, the empty lot and the branch at night, film for
     the rest and for described scenes). Unfiltered, no filter, iPhone, phone, real footage or
     real: real. Cinematic or film look: film, and it wins when both appear. "Realistic", or a bare
     "footage" or "film", leaves the look as it is.
   - **Frame:** vertical 9:16; wide, horizontal, landscape, YouTube, TV or 16:9: 16:9, and so is a
     request of an hour or more (such long ambience is watched on a big screen); 1:1 only on
     square. An explicit frame word wins over the hour rule.
   - **Length:** one of four, with its repeat count N: half a minute (6), a minute (10), two minutes
     (20), the longest, about 2:25 (24). Named: under a minute, half; about one, or quick or short,
     one; about two, two; more, the longest plus `longest-note` (longer files are not offered on
     this machine yet). Not named: the longest on sleep, study, focus, reading, relaxing,
     meditation, ambience, background, piano, music, lofi, overnight, all night or hours; else one.
   - **Sound:** the clip's native rain audio; music only on music, piano, lofi or song; "no sound"
     is the silent route (`generate_audio` false, the same price on Seedance: facts `price-seedance-audio`).
   - **Model:** Default: `bytedance/seedance-2.0/image-to-video`, 720p, 7 s, the picture as first
     and last frame; a kit or brief may name another. 1080p only on "best quality". Named models:
     Veo 3.1 fast first-last (8 s, no square: a square request stays on the default), Kling v3 pro
     (7 s, very little sound), Seedance 2.5 (the model the vendor measured; on fal its aspect is
     fixed to `auto`); any other id: `decide` writes everything but `clip.params.json` (hard-cut
     route, a note), and you write that file from `ai-gen info`. Only Seedance takes the blend route.
3. **Plan line, plan and quote** [3]. Your first chat line is `plan_line` from the script
   (`plan-line`): the scene, the real look when chosen, the shape and the length, in plain words.
   Then the three steps (`plan-steps`); music is made inside step 1 and is never a separate step.
   Nothing comes before the plan line, not even a remark on what was decided.
   - **Chat for the whole run** (defaults; a kit may set its own lines): short, calm, plain words;
     the customer watches a scene take shape and never the machinery behind it. Never in the
     chat: how it is built (clips, takes, frames, seconds, repeats, loops, jumps, joins, blends, fades), the tools
     (the camera, the timeline, tracks, editing, levels, mixing, trimming, stitching, rendering,
     exporting) or the business (models, credits, documents, this workflow); never an internal id. A
     line ends in a question only in the hand-off or a failure line. Checks are silent in the chat;
     their figures go to the job record.
   - **Quote** each paid call from its params file (estimate takes no media flags; allow 300 s for
     the first estimate on a fresh machine):
     `ai-gen estimate <model> --params-file work/<p>/<frame|clip|music>.params.json --format json`,
     then `node $S/manifest.mjs budget --project <p>`. The total is the picture, the music, the clip
     and one clip redo (HR5 plans re-rolls); variety adds two clips. Each call is capped at its own estimate (`--max-cost`, below); the gate compares the total. Over what remains, or no budget
     known (the gate question goes to the owner, not the customer, and may name credits): `node $S/gate.mjs open --project <p> --slug approve-loop --question "Make the rain video for <total> credits?" --options '[{"id":"a","label":"Make it","credits":<total>},{"id":"b","label":"Stop","credits":0}]' --resume-at "step 5" --quote <total>`
     and end `partial` (HR12). Music is quoted on `fal-ai/elevenlabs/music`, the default, because `fal-ai/lyria3/pro` has no
     price on record (facts `price-unknown`, 2026-10-05; its estimate exits 12, so it cannot run inside a
     budget under HR5); a kit or brief may name Lyria with `--music-model lyria` and its own gate (VID-L382). Prices: references/numbers.md.
4. **The scene row** [4]. The script reads the row: picture, light (per look), motion and sound
   lines, and the car or snowy window's own rain sentence; the lake, fireside and storm rows carry a
   weaker-loop note. The starter rows are SL8 wording, untested (VID-L381). Rules for any line you
   write or change. The script checks only the word lists (stillness, shrinking, wind and travelling
   words in the motion line, voice, music and standout-sound words in the sound line, 1,300 characters) and
   refuses a line that breaks them (exit 1); `--allow-words` keeps a kit's or brief's line and records the break in loop.json.
   The rest (surfaces the picture shows, no featureless "rain") is yours to apply:
   - **Motion line:** the dark backdrop first, then what the rain does on a surface (splashes, rings,
     drips, trails). Only motion that returns to where it began: rain falling, splashes, rings on
     water, drops on a pane, a flame, leaves and branches that dip and settle. Never motion that
     travels: rolling fog, moving clouds, rising steam, growing waves, a lamp turning on, lightning,
     arrivals. No stillness word anywhere
     in the prompt, even negated (still, static, frozen, motionless): it freezes the rain. No
     shrinking word (gently, slightly, subtle, barely). No wind: with trees in view the script adds
     `windless`. The rain itself is never mist, haze or drizzle. A travelling element that was asked
     for is kept resting (`mist-resting`) and the hand-off adds `mist-note`.
   - **Sound line:** close sounds on surfaces the picture shows (taps on a pane, patter on leaves,
     drumming on a roof); a bare "rain" returns a featureless hiss. Never voices or music words
     (they bring them in), no single standout sound (a gust, a bird, thunder, one heavy drip) and no rustle with trees:
     each returns at every repeat.
   - **Avoidance is phrased positively**, never as a "no X" list appended to the prompt: negative
     prompts do not travel, and Seedance has no negative field (facts `schema-seedance-no-negative`).
5. **The picture** [5]. Write `before-call` in the chat, then
   `ai-gen image -m fal-ai/nano-banana-2 --params-file work/<p>/frame.params.json -o artifacts/<p>/keyframes/ --queue --strict-params --max-cost <this call's estimate> --format json > work/<p>/frame.result.json`.
   Default: `fal-ai/nano-banana-2` at 1K (2K on best quality), the aspect pinned (its default is
   `auto`); a kit or brief may name another. Before the first call of a session read the raw OpenAPI
   for each field the params file sets (HR2); `--strict-params` refuses an unknown one for free.
   Rename the file to `keyframes/<scene>-picture.png` and record it:
   `node $S/manifest.mjs add --project <p> --result work/<p>/frame.result.json --params work/<p>/frame.params.json --json '{"item":"picture","node":"keyframes","declared":{"aspect":"<frame>","format":"png"},"credits":{"estimate":<this call's estimate>},"files":["keyframes/<scene>-picture.png"]}'`.
   Look at it: bright streaks against something dark, wet surfaces shining, depth, nobody in it. A
   bad picture takes one fix-table clause (step 18); a refused one is made calmer once
   (`calmer-picture` in a `--picture` override; lever: prompt clause).
6. **The music** [6], only when decided, made right after the picture. Default: `fal-ai/elevenlabs/music`;
   the script sets `music_length_ms` (the video plus a little) and `force_instrumental` true; a kit or
   brief may name another. The vendor's piano findings were measured on Lyria and do not transfer
   (the mix gain is a default, VID-L385). With `--music-model lyria` (no price on record, so it needs
   its own gate) the prompt only carries the length in words (`music-line`) and, as Lyria's negative field does
   nothing (facts `schema-lyria`), instrumental solo piano sits in the positive prompt. Never make the rain with an
   audio model: about one rain track in three it tried came back with talking.
   `ai-gen run <music model> --params-file work/<p>/music.params.json -o artifacts/<p>/music/ --queue --strict-params --max-cost <this call's estimate> --format json > work/<p>/music.result.json`;
   rename to `music/<scene>-music.<ext>` and record it (the file is renamed, so name it in `files`):
   `node $S/manifest.mjs add --project <p> --result work/<p>/music.result.json --params work/<p>/music.params.json --json '{"item":"music","node":"music","declared":{"format":"<ext>"},"credits":{"estimate":<this call's estimate>},"files":["music/<scene>-music.<ext>"]}'`; measure it:
   `python3 $L/loop_av.py probe artifacts/<p>/music/<scene>-music.<ext> --loudness`. A refused track
   (as imitating an artist) or a failed one gets one retry with a new prompt wording, or on
   Lyria the move to `fal-ai/elevenlabs/music` (HR7); failing again, go on without music and add `music-failed`.
7. **Picture back** [7]. `picture-back` exactly, nothing about the picture (it is on screen), then
   straight on. A job never ends on a failed call: each ends in its recovery or a failure line (18).
8. **The clip** [8, 15]. One call, every parameter in the params file (`duration` the string "7",
   `resolution`, `aspect_ratio`, and `generate_audio` true pinned: the sound is the product, HR4).
   The picture is the first and the last frame: `--image` fills `image_url` and `--last-frame` fills
   `end_image_url` (fal and Higgsfield both record that the end image brings a Seedance 2.0 clip back
   onto the picture; unmeasured on a loop).
   `ai-gen video -m bytedance/seedance-2.0/image-to-video --image artifacts/<p>/keyframes/<scene>-picture.png --last-frame artifacts/<p>/keyframes/<scene>-picture.png --params-file work/<p>/clip.params.json -o artifacts/<p>/clips/ --queue --strict-params --max-cost <this call's estimate> --format json > work/<p>/clip.result.json`
   Then `clip-wait`, alone. The queued call waits for the job (up to 15 minutes); a timeout (exit 10)
   is already charged: fetch it, `ai-gen result <request-id> -o artifacts/<p>/clips/ --format json > work/<p>/clip.result.json`
   (id in `error.details.requestId`; again while `ready` is false), never resubmit, never a waiting
   status poll. Rename to `clips/<scene>-in-motion.mp4` and record it (name the renamed file in `files`; the envelope's path is gone):
   `node $S/manifest.mjs add --project <p> --result work/<p>/clip.result.json --params work/<p>/clip.params.json --json '{"item":"clip","node":"clips","declared":{"aspect":"<frame>","duration_s":7,"audio":true},"credits":{"estimate":<this call's estimate>},"files":["clips/<scene>-in-motion.mp4"],"parents":["keyframes/<scene>-picture.png"]}'`.
   - `clip_flags` in loop.json gives each model's media flags. Veo 3.1 first-last takes its frames
     in `first_frame_url` and `last_frame_url`, which no media flag fills (facts `schema-veo31-flf`):
     `python3 $L/loop_decide.py frame-url --project <p> --result work/<p>/frame.result.json` writes the
     picture's hosted URL into both (hosted URLs expire: call at once; `--data-uri` for a picture of
     3 MB or less, read from the envelope or else the renamed `keyframes/<scene>-picture.png`), and the call has no `--image`. Kling takes `--image` only.
   - **Test pass** (a new scene row, or re-measuring): `--test-pass` uses
     `bytedance/seedance-2.0/fast/image-to-video` (720p only; `end_image_url` on every tier, facts
     `schema-seedance20-end-frame`). It measures; it is never the delivery.
9. **Check the clip** [9].
   `python3 $L/loop_av.py check artifacts/<p>/clips/<scene>-in-motion.mp4 --frame artifacts/<p>/keyframes/<scene>-picture.png --out-dir artifacts/<p>/qc --name clip --stt local`
   Look at `qc/clip-frames.png` (picture, first, middle, last) and `qc/clip-spectrum.png`, then
   rerun the same command with `--seen ok` (or `--seen "<what you saw>"`, which is a redo reason); `record` lists a clip check with no
   `--seen`, and a voice screen that did not run, as debts (HR15). A redo
   only for a person or animal, any writing, rising smoke or steam, a different place (by eye), or a
   script redo reason (exit 1): voices, or a standout sound (the 400 ms spread over its limit). Not
   camera movement, mist, focus, reflections or shifting rain: two vendor redos for "the camera
   moved" had held still frame by frame. Figures under `over` are reported beside their control
   (`step_median`), never a redo by themselves: the limits are the vendor's.
   - **Voices.** Default: the spectrogram (speech shows as stacked bands under 4 kHz) plus local
     faster-whisper when its weights load offline (`--stt local`, free; it can invent words in noise,
     so read both; when `--stt local` did not run, the Scribe route below is the check); a kit or brief may name another. Paid alternative: Scribe v2 on a demuxed wav,
     `ffmpeg -v error -y -i <clip> -vn -ac 1 -ar 16000 work/<p>/clip-voice.wav`, quoted, then
     `ai-gen run fal-ai/elevenlabs/speech-to-text/scribe-v2 --audio-file work/<p>/clip-voice.wav diarize=false tag_audio_events=true -o work/<p>/ --queue --strict-params --max-cost <this call's estimate> --format json > work/<p>/voices.json`
     (any `words[]` entry of type `word` is a voice; `audio stt` would add a `task` field Scribe
     lacks, and an `.mp4` input is refused: facts `cli-stt-task`, `beh-scribe-mp4`). Never a
     video-analysis model: one reported speech in a track that had none.
   - **One redo at most**, silent except `redo` then `clip-wait`; it costs a whole clip. Its lever
     (HR7): a new `seed` when `ai-gen info` lists one (lever: seed), else the fix-table clause for
     what was seen (step 18); a refused clip, `calmer-picture` and a new picture. A second failure:
     `scene-failed`, and nothing from this clip is delivered.
10. **Route** [10]. `route` in loop.json: `cell` (the blend) for a 7 s Seedance clip; `hardcut` for
    any other model, when a blend is not wanted, or as the fallback of step 11. Change it with
    `decide … --route hardcut` (loop.json keeps the history) before any ffmpeg call.
11. **The cell** [11].
    `python3 $L/loop_av.py cell artifacts/<p>/clips/<scene>-in-motion.mp4 --out work/<p>/cell.mkv > artifacts/<p>/qc/cell-check.json`
    The cell begins at the clip's one-second mark; the clip's final second dissolves into its first,
    picture (`xfade`, 1 s) and sound (`acrossfade`, equal power); then the rain is lifted 6 dB
    (`--gain 2.0`: clips come back quiet). It ends on the frame before the one it starts on, so every
    repeat, and the end of the video, flows on into the opening. The window, the blend and
    the cell are counted in the clip's own whole frames, its sound padded or trimmed to the picture
    first, and the cell kept lossless (FFV1, PCM) so repeats join with no encoder gap. The script
    measures it (length, final frame against opening frame, per-second level).
    Then set the repeat count from the measured cell, not the asked clip length (a 7 s request often
    comes back near 6 s: facts `beh-seedance-length`):
    `python3 $L/loop_decide.py count --project <p> --cell-s <cell_s>` gives N = asked length over `cell_s`
    and `handoff_length_words`; N in the table is a first estimate only. Over a limit: fix
    the cause once (sound that stops early, a frame-rate change) and rebuild; a second failure takes the
    hard-cut route, with the real length in the hand-off.
12. **Repeat** [12].
    `python3 $L/loop_av.py video --cells work/<p>/cell.mkv --n <N> --out artifacts/<p>/final/<scene>-rain.mp4 --work work/<p> [--music artifacts/<p>/music/<scene>-music.<ext>] > artifacts/<p>/qc/build-check.json`
    The length is N times the measured cell (the N from `count`; `video` takes `--n` as given). **Variety** (asked for): clips B and C from the same
    picture and prompt (each a full clip, quoted at step 3), each checked as step 9; cells A to B,
    B to C, C to A (`cell <A> --into <B> --out work/<p>/cellAB.mkv`, …), and the closing cell from
    clip number ((N-1) mod 3)+1 into A: `video --cells cellAB.mkv cellBC.mkv cellCA.mkv --last <closing cell> …`.
    A clip that fails twice drops out: alternate the clips that passed; with A alone, the plain cell.
13. **Music mix** [13], with `--music`: the track is trimmed to the shorter of track and video,
    fades in over 1 s and out over the last 3 s, at gain 0.30 (Default; a kit or brief may set
    another), and is mixed over the rain with `amix` unnormalised. `build-check.json` reports the
    piano over the rain (vendor: about 8 dB at 0.30) and the share of moments the rain is louder
    above 2,000 Hz (vendor: a median 94%), measured on the stems in `work/<p>/`. Too loud or too soft
    is fixed by this gain only (`--music-gain 0.20` or `0.45`), never by re-filming. A track shorter
    than the video is normal: the rain carries the end.
14. **Hard-cut route** [14, 15].
    `python3 $L/loop_av.py window artifacts/<p>/clips/<scene>-in-motion.mp4 --out work/<p>/win.mkv [--window 7.7] > artifacts/<p>/qc/window-check.json`,
    then (`window` exits 0 for a seam figure; it is a join only on this route) `video --cells work/<p>/win.mkv --n <K> [--tail work/<p>/win-tail.mkv] …` as step 12. Each
    window plays the clip's native audio and stops a little before the clip's end (the audio stops
    slightly before the picture): the shorter of picture and sound minus 0.1 s, with a 15 ms
    crossfade closing each window's sound so the joins do not tick. K is the asked length over the measured window, rounded:
    `loop_decide.py count --project <p> --window-s <window_s>` (`k_hardcut` in loop.json is a first estimate for 6.9 s windows only). Veo: `--window 7.7`, checked against `best_return_s` in
    `clip-check.json` (the picture comes back at about 7.67 s). With music the video matches the
    track's length: as many windows as fit plus one last window of the rest
    (`window … --partial <rest> --out work/<p>/win-tail.mkv`), left out under 1 s. The rain keeps
    its own level on this route (`--gain 1.0`); music at 0.30 as step 13.
15. **Encode and measure** [16]. `video` makes the one encode: H.264 CRF 18 medium, yuv420p, AAC
    192k, faststart (SL8 choices; the vendor set no quality). Write `final-wait` while it runs. Then
    measure the encoded file, not the command:
    `python3 $L/loop_av.py measure artifacts/<p>/final/<scene>-rain.mp4 --cell-s <cell_s> --n <N> --asked-s <asked length> [--tail-s <s>] [--audio-from work/<p>/rain-bed.wav] --out-dir artifacts/<p>/qc`
    and `node $Q streams artifacts/<p>/final/<scene>-rain.mp4 --audio yes` (`--audio no` on the
    silent route). It checks the length, the final frame against the opening one and every join in
    picture and sound (on the rain stem when there is music), each beside the ordinary frame step. Record a
    tool row, `node $S/manifest.mjs add --project <p> --json '{"item":"video","node":"final","tool":"ffmpeg (loop_av.py video)","declared":{"aspect":"<frame>","duration_s":<expected>,"audio":true},"parents":["clips/<scene>-in-motion.mp4"],"files":["final/<scene>-rain.mp4"]}'`,
    then `node $Q declared --plan artifacts/<p>/manifest.json --file artifacts/<p>/final/<scene>-rain.mp4` (HR1).
    A failed join: rebuild once, then the hard-cut route. If the hard-cut build is over a limit too,
    deliver it with the figure recorded as a debt (HR15), unless a join is an audible cut (a level
    step over 3 dB): then end "video-failed". A length more than 5% off the asked one is a debt too.
16. **Hand-off** [17], the run's closing message: `handoff` filled in (the scene in a few words,
    the length in words, what the rain falls on and how it sounds) with one short question of two or
    three choices from `handoff-choices` that this job can make, and the file
    `artifacts/<p>/final/<scene>-rain.mp4`. Add `mist-note`, `thunder-note`, `longest-note` or
    `kling-note` when loop.json says so, `music-failed` when the music did not come, and no mention
    of rain audio on the silent route. After the hand-off the video counts as made; the question
    waits for nobody.
17. **Changes after the hand-off** [18]. Restart at the step the change needs, never from the
    finished video (HR11); one clip or video in flight at a time, and a message that arrives during a
    job is folded into its decisions. Rerun `decide` with the change as an override and `--restart`:
    a different scene, the other look, or a wide frame: new picture, clip and video
    (`--restart picture`); heavier or lighter rain, slower, darker, the lamp off: a new clip, plus a
    new picture if the opening frame changes (`--restart clip`); shorter or longer, up to the
    longest: a new video from the kept clip (`--restart video`; with music, a new track at the new
    length first); music in or out, louder or softer: a new video from the kept clip. Past the longest: no new video, one line from
    `longest-note`.
18. **Failures and fixes** [19]. Paid calls follow the exit-code playbook
    (`media-ai-gen/references/recovery.md`): a timeout is fetched by id, a rejected field is fixed
    against the schema, a queued job that failed gets one retry, an unpriced or refused route moves
    to the named fallback (HR6, HR7). An ffmpeg failure is rerun once with its cause fixed. Every
    failure ends on a plain line ("scene-failed", "video-failed"). **Fixes**, by what they see or
    hear, are the `fix-*` rows of `references/lines.json` (each row's `use` names the symptom and the
    fix; its `prompt` is the clause), passed as `--picture-add`, `--motion-add` or a whole `--sound`,
    `--light` or `--picture` line and recorded as the retry's `lever`. Fixes that need no new line:
    the rain too loud on the blend route, a new video at `--gain 1.0` (on the hard-cut route, re-film
    with the sound line softer); piano too loud or rain lost beneath it, `--music-gain 0.20`;
    too soft, `0.45`; the rain too harsh or busy, re-film with a softer sound line; a real or a
    more cinematic look, the other look (new picture, clip and video); the music stopping early is
    normal on the blend route, and on the hard-cut route means the windows did not add up to the
    track (rebuild). Never turn dusk or night into day, and never write "film look" in the real look.
19. **Record** [20]. `python3 $L/loop_av.py record --project <p>` writes `artifacts/<p>/run.json`:
    the job state, the prompts, every check with its control, the models each figure was measured
    on, and the cost from the manifest beside the vendor's headline. Then PROGRESS.md (the skeleton in
    `media-ai-gen/references/gates-and-manifest.md`) with the route and every debt (HR15: a hard-cut
    fallback, a missing track, a figure over its limit). These records are how the limits get
    re-measured on this machine's models.

## Not on this machine yet

- **Lengths past about 2:25** are not offered on this machine yet: ffmpeg could repeat the cell
  further, but sound and music past 2:25 are untested. The local alternative is the longest length
  with `longest-note` (the video is built to loop).
- **Thunder, lightning, people and arrivals** are not this method: each returns at every repeat.
  The storm is heavy rain falling straight down, and the hand-off adds `thunder-note`.

## House rules (HR-1.0)

Relies on: HR1 (aspect, length and sound declared in each row and measured by `loop_av.py` and
media-qc), HR2 (the raw OpenAPI before the first call of a session: `duration` enums are strings,
`aspect_ratio` defaults to `auto`), HR3, HR4 (`generate_audio`, resolution, duration, aspect, the
picture's safety and web-search fields and Veo's `auto_fix` pinned in the params files), HR5 (every
paid call quoted, one redo planned, the total against the budget), HR6, HR7 (one redo per item with
a named lever, then the named fallback), HR8, HR9 (one row per generation and one tool row for the
video), HR10 (the assembly is local ffmpeg; no model touches the repeat), HR11 (every clip films from
the original picture; every rebuild starts from the kept clip), HR12 (decided from the request; a
spend over budget is a gate), HR13 (both scripts exit non-zero on a failed check), HR14 (figures
beside their controls, never a written pass), HR15, HR16 (pin off any prompt-rewrite field
`ai-gen info` shows), HR19, HR20, HR21 (faster-whisper is used only when baked; nothing installed),
HR22 — see media-ai-gen/references/house-rules.md.
Not applicable: HR17 (the scenes hold no people, likeness or voice; a voice in the sound is a redo
reason), HR18 (no claims are made).
