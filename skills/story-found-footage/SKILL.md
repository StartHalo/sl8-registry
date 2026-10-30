---
name: story-found-footage
description: >-
  Narrated found-footage story shorts: a 30-45 s vertical story told by one calm narrator over 4-6
  clips that look like doorbell, CCTV, bodycam, dashcam or trail-camera footage, with the clips' own
  quiet sound, a drawn camera timestamp and low-key captions. One ElevenLabs take timed by Scribe v2
  sets the cuts; shot pictures are built from empty place and plain subject pictures, filmed on
  Seedance, checked with one redo round, stitched once with ffmpeg. Includes an animal rescue at a
  home base variant. Use when: a found-footage, doorbell-cam, security-camera, bodycam, dashcam or
  trail-cam story video, a narrated fake-footage short, or an animal rescue told from one camera.
  NOT for: one unnarrated device-look clip (video-device-footage); captions on an existing video
  (edit-captions); a faceless explainer (story-faceless-short); a voiceover alone
  (media-audio-generation); one generated clip (media-video-generation); a general multi-shot
  production (media-video-production); measuring files (media-qc).
license: SL8 wording and SL8-authored scripts; method from Everygen's found-footage story guidance (no licence stated), restated and cited; points from fal (no licence stated, used with attribution) and HyperFrames (Apache-2.0), restated
compatibility: "story-studio >=1.0.0 (sl8-video 1.5.0, sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; ffmpeg 5.1 with drawtext and libass; python3 3.11; fonts and display-fonts packs; fal endpoints as of 2026-10-27"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [everygen/foundfootagestories-179c12, everygen/animalclips-e048e4, everygen/cctv-e02220, fal/falaudiogeneration-ba1a03, fal/falvideogeneration-fe0127, fal/falvideoproduction-09f33d, fal/falmotiongraphics-dc3541, hyperframes/hyperframes-2afd9d]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27; Everygen guidance captured 2026-10-26)
  approach: WF37-a1-s1
  attribution: Method from the SL8 capability assessment (WF37-a1-s1), restated in SL8 wording from Everygen's found-footage story and animal-stories guidance, with points from Everygen's CCTV tests, fal's audio, video, production and motion-graphics skills and HyperFrames' caption guidance; scripts written by SL8 from the described behaviour
  deltas: STO-D340..STO-D359
---

# Found-footage story

A short, vertical story told by one narrator over clips that look as if a doorbell, a security camera,
a bodycam, a dashcam or a trail camera caught them. The narration's measured sentence ends decide the
cuts; the clips' own quiet sound plays under the voice; the stitch draws the camera's clock; captions
go on last. The method is the vendor's current guidance, restated: its prompt wording was tuned for
Nano Banana 2 and Seedance 2.5, and neither it nor the defaults below have been run on this machine.
Treat the first stories as a test (learnings STO-L340, STO-L341).

Every limit `footage.py` enforces is a default. A kit or brief that names another value passes
`--allow <rule>` to the same command (the failure line prints the rule name), and the script lists it
under `allowed`; copy that list into `work/<p>/plan.json`. Rules a script cannot judge stay with you.

```bash
FF=$HOME/.agents/skills/story-found-footage/scripts/footage.py   # the local steps; JSON out, exit 0/1/2
R=$HOME/.agents/skills/story-found-footage/references            # story.md, look.md, shots.md, prompts.json
S=$HOME/.agents/skills/media-ai-gen/scripts                       # manifest.mjs, gate.mjs
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
```

Project files: `work/<p>/` holds `plan.json`, `narration.txt`, `shotlist.json`, `timing.json`,
`checks.md`, `prompts/`, `params/`, `jobs/`, `results/` and `qc/`; deliverables go to
`artifacts/<p>/narration/`, `pictures/`, `clips/` and `final/` (HR8). Read
[references/story.md](references/story.md), [references/look.md](references/look.md),
[references/shots.md](references/shots.md) and [references/prompts.json](references/prompts.json)
when their step says so, and write every prompt from that text, never from memory.

## What a request needs

- **A story request in words.** Anything else is optional and decided, never asked: camera, length
  (30-45 s), tone, time of day, landscape, HD, another route, names or facts the customer supplies,
  no captions, no timestamp, music.
- **The customer's own photos** (their pet, their porch) are not offered on this machine yet: subject
  and place pictures are generated from words; describe the photo's subject in the Subject or Place
  line instead (learnings STO-L345).
- **Real people are refused for now.** A named real person, a customer's photo of a person, or a real
  person's voice is declined in one line until SL8's consent wording is approved (learnings STO-L346);
  people in the story are generic roles and the narrator is a stock voice (HR17).

**Defaults** (each one a kit or brief may change; record every value in `work/<p>/plan.json`):

| Choice | Default |
|---|---|
| Camera | From the request's words (look.md "Which camera") |
| Length | 35 s (30-45) |
| Tone | heartwarming (also funny, tense, rescue) |
| Narrator voice | Default: `Brian` for calm, `George` for tense, `Jessica` for funny; a kit or brief may name another. Only Brian's pace is on record (STO-L343) |
| Time of day | day; night means infrared on fixed cameras |
| Orientation | 9:16 portrait; 16:9 only when landscape is asked |
| Captions, timestamp | on, unless refused |
| Place and subject pictures | Default: `fal-ai/nano-banana-2`, 1K; a kit or brief may name another |
| Shot pictures | Default: `fal-ai/nano-banana-pro/edit`, 1K; a kit or brief may name another. Known result (facts `schema-nb2`, 2026-10-05): `fal-ai/nano-banana-2/edit` also exists, takes `image_urls`, costs 20 cr against 37.5 and is the vendor's own model family; it is untested for this method (STO-L342) |
| Clips | Default: `bytedance/seedance-2.0/image-to-video`, 480p (720p only when HD is asked), Sound part on; a kit or brief may name another. Known result (facts `schema-seedance25`, `price-seedance25`, 2026-10): `bytedance/seedance-2.5/image-to-video` is live, 4-30 s, 118 cr a second at 720p, and the vendor's clip rules were measured on it; its picture shape follows the source image (`aspect_ratio` is the constant `auto`), so `params seedance --model bytedance/seedance-2.5/image-to-video` leaves that field out. It has not been run for this method (STO-L341) |
| Fallback clips | Default: `fal-ai/kling-video/v3/pro/image-to-video`, no Sound part; home-base variant option `minimax/h3/image-to-video` |
| Music | none under the narration; on request, a separate track, Default: `fal-ai/elevenlabs/music` |

## Steps (approach step numbers in brackets)

0. **Preflight once.** `python3 $FF preflight` (ffmpeg filters, fonts). No `drawtext`: the timestamp
   cannot be drawn, so stitch with `--no-timestamp` and say so. No `ass`: captions cannot run, so
   deliver the stitched video and say so. No monospace face: the clock uses the face `fc-match
   monospace` returns; a monospace timestamp face is not offered on this machine yet (STO-L344). On an
   existing project run `node $S/gate.mjs status --project <p>` first; else
   `node $S/manifest.mjs init --project <p>`. For each endpoint, before its first call in a session,
   read `ai-gen info <id> --format json` and the raw OpenAPI printer in
   `media-ai-gen/references/commands.md` (HR2), and pin any default-on field they show (HR4): `params` pins the ones on record and takes `--set key=value` for the rest.
1. **Decide, do not ask** [1]. Read the request and fix every default above in `plan.json`. When the
   request names no story at all, pick one yourself from the story engines in story.md, on a named
   camera, and say it in one line: no question tool is called (HR12); a person who replies with
   another story starts it over. Home-base variant: who saved which animal, the habit that bonded
   them at one spot, the night it went wrong there, a warm ending back there; one camera, one place;
   no invented names.
2. **Write the narration** [2] to `work/<p>/narration.txt`, following story.md: the word table row,
   hook, setup object, visible turn, payoff, voice rules, names rules. Write it yourself; there is no
   separate script call.
3. **Run the story checks** [3] before any paid call: `python3 $FF narration --text work/<p>/narration.txt --length <s>`
   (word count against the table, hook of 7 words or fewer, one break tag, no digit, `?`, `!`, `;`,
   `:` or dash, no stock phrase). Exit 1: fix and rerun. Its notes (no contractions, even sentences,
   first person) are yours to act on.
4. **Plan the look and the shots** [4] from look.md: the camera block, own-view and no-text rows, the
   fixed or moving rule, night rules, realism rules, the Subject, Place, Sound and Story object lines
   once, 4-6 shots (home-base: one per sentence), planned lengths, the readout a few minutes before
   the turn. Write `work/<p>/shotlist.json` (look.md shows its fields), then
   `python3 $FF plan --shots work/<p>/shotlist.json`.
   **Then quote the run (HR5).** Write every params file you can now (steps 5, 8, 9) and quote each:
   `ai-gen estimate <id> --params-file <file> --format json`; the Scribe call is quoted after step 5
   from the take's length (2 cr a minute), and clips at their planned render length (shot length plus
   a 1 s margin, about 34 cr a second of render on Seedance 480p), re-quoted after step 7. If the
   re-quote puts the total over the budget, open the gate before step 8. Add one redo per item, compare the total with
   `node $S/manifest.mjs budget --project <p>`, and over the remaining budget, or with no budget
   known, open a gate (`node $S/gate.mjs open --project <p> --slug approve-story --question "…" --options '[…]' --resume-at "step 5" --quote <cr>`)
   and end `partial` (HR12). Known result (facts as of 2026-10-05 to 10-17): Seedance 480p 33.6 cr
   a second (720p 75.9), Nano Banana Pro 37.5 and Nano Banana 2 20 per 1K picture, Scribe v2 2 cr a
   minute, the voice billed by line length, Kling 28 cr a second silent, ElevenLabs music 150 per
   started minute; a 35 s, 5-shot story is about 1,500 cr before redos. Never quote a price to the
   customer.
5. **Record the narration** [5], one take:
   `python3 $FF params tts --text work/<p>/narration.txt --voice <voice> --out work/<p>/params/tts.json`
   (the text byte for byte, the voice always sent, `apply_text_normalization` on, the other voice
   settings pinned), then
   `ai-gen run fal-ai/elevenlabs/tts/multilingual-v2 --params-file work/<p>/params/tts.json -o artifacts/<p>/narration/ --queue --strict-params --max-cost <quote> --format json > work/<p>/results/tts.json`.
   Rename the file in `files[0].local_path` to `artifacts/<p>/narration/narration.mp3` (MP3 always),
   then record it: `node $S/manifest.mjs add --project <p> --result work/<p>/results/tts.json --params work/<p>/params/tts.json --json '{"item":"narration","node":"narration","declared":{"format":"mp3"},"credits":{"estimate":<quote>}}'` (HR9).
6. **Measure the reading** [6].
   `python3 $FF params stt --out work/<p>/params/stt.json [--language eng] [--keyterm <name>]`
   (`diarize` and `tag_audio_events` pinned off), then
   `ai-gen run fal-ai/elevenlabs/speech-to-text/scribe-v2 --audio-file artifacts/<p>/narration/narration.mp3 --params-file work/<p>/params/stt.json -o work/<p>/stt/ --queue --strict-params --max-cost <quote> --format json > work/<p>/narration.words.json`
   and record its row. Then
   `python3 $FF timing --text work/<p>/narration.txt --words work/<p>/narration.words.json --audio artifacts/<p>/narration/narration.mp3 --target <s> --out work/<p>/timing.json`:
   the file length by ffprobe (trailing silence included), the speech end, one sentence end per
   sentence aligned to the known text, the transcript compared word by word, words per second.
   Exit 1 (more than 15% off the target, or the take differs from the text, such as a misread number):
   cut or add a sentence, or fix the wording, and record once more; that is the one narration redo.
   Exit 2 (the transcription has no `words[]`, or the file is unreadable) is not a narration problem:
   run Scribe once more on the same take (its own redo, about 2 cr) and spend nothing on the voice. If
   the second take is also off target or misread, or Scribe fails twice, open a spend gate naming the
   moment and end `partial` (HR7, HR12). Write the measured words per second into `plan.json`.
7. **Fit the shots** [7]. `python3 $FF fit --timing work/<p>/timing.json --shots work/<p>/shotlist.json --write`
   (home-base: `--per-sentence`): each cut on the sentence end nearest its planned end, the first at 0,
   the last at the file length so the last word is never cut, every shot 5-10 s, the total exactly
   the file length, render lengths the shot length rounded up plus a 1 s margin on Seedance
   (`--render-margin`; the route has returned 4.06 s for a 5 s ask), within the route's range. Exit 1: re-plan the shot count.
   Rewrite any shot whose fitted sentences changed so it shows only those lines.
8. **Reference pictures** [8], from shots.md and the `place-picture` and `subject-picture` rows:
   `python3 $FF params place|subject --prompt-file work/<p>/prompts/<name>.txt --aspect <ratio> --out work/<p>/params/<name>.json`
   (it refuses a prompt over its limit or without its required lines), then
   `ai-gen run fal-ai/nano-banana-2 --params-file work/<p>/params/<name>.json -o artifacts/<p>/pictures/ --async --strict-params --max-cost <quote> --format json > work/<p>/jobs/<name>.json`
   for all of them together (their quotes already summed, because `--async` reaches the ledger only at
   `result`), then `ai-gen result <request_id> -o artifacts/<p>/pictures/ --format json > work/<p>/results/<name>.json`
   for each. A job that prints `"ready": false` is asked again every 20 s, at most 15 minutes for a picture and 25 for a clip; then it counts as failed:
   record what it was charged, apply the step 13 table once, otherwise open a gate. A failed job (exit 9, which can be billed) or exit 10 is handled the same way and never resubmitted unchanged. Rename each file to its name (`place-porch-day.png`,
   `subject-old-dog.png`), record its row, then look at it (Read the image) and write its check line.
9. **Shot pictures** [9], from the `shot-picture` row (with `night-fixed`, `night-moving` or
   `moving-away` where they apply): `python3 $FF params shot --prompt-file … --out …` (add `--moving`
   for a moving camera), then
   `ai-gen run fal-ai/nano-banana-pro/edit --ref artifacts/<p>/pictures/<own place>.png --ref artifacts/<p>/pictures/<subject>.png [--ref …] --params-file work/<p>/params/shot-<n>.json -o artifacts/<p>/pictures/ --async --strict-params --max-cost <quote> --format json > work/<p>/jobs/shot-<n>.json`,
   all shots together; collect with `ai-gen result` as in step 8, name each `shot-<n>.png`, record its
   row with the place and subject pictures as `parents`. `--ref` order is the reference order.
10. **Check every shot picture** [10] against the misses list in shots.md before its clip: one line
    each in `work/<p>/checks.md`. One redo with the same references, changing only what failed. A
    redone picture with the wrong subject or place, or a picture that failed twice, stops all filming:
    open a spend gate naming the moment in one sentence and end `partial` (HR12). Never film a picture
    you have not looked at.
11. **Film every shot** [11] from the `clip` and `behave-*` rows and the clip rules in shots.md:
    (`[b]` of the timed steps equals the render length)
    `python3 $FF params seedance --prompt-file work/<p>/prompts/clip-<n>.txt --duration <render_length> --aspect <ratio> [--resolution 720p] [--night] --out work/<p>/params/clip-<n>.json`
    (duration sent as a string of a whole number, `"8"`, never `"8s"`; `generate_audio` true), then
    `ai-gen run bytedance/seedance-2.0/image-to-video --image artifacts/<p>/pictures/shot-<n>.png --params-file work/<p>/params/clip-<n>.json -o artifacts/<p>/clips/ --async --strict-params --max-cost <quote> --format json > work/<p>/jobs/clip-<n>.json`
    for all shots together, collected with `ai-gen result`, named `clip-<n>.mp4`, set as `clip` and
    `clip_prompt` in `shotlist.json`, and recorded with `declared` from the params script. Say once that
    the shots take a few minutes. Home-base variant on MiniMax:
    `python3 $FF params minimax … --duration <5-15>` (integer duration, `480P`, `prompt_expansion_mode`
    disabled, no Sound part) and `ai-gen run minimax/h3/image-to-video --image …`.
12. **Check each clip** [12]: `python3 $FF clipcheck --clip artifacts/<p>/clips/clip-<n>.mp4 --shot-length <shot_length> --out-dir work/<p>/qc/ --audio yes`
    (`--audio no` off Seedance; add `--render-length <n>` and write the printed `render_ratio` into `plan.json`,
    so a later fit can re-derive the margin) writes a 4x3 contact sheet of 12 frames spread over the
    whole clip, frames at 0.3 s, the middle and 0.3 s from the end, and a frozen control; then
    `node $Q motion artifacts/<p>/clips/clip-<n>.mp4 --control work/<p>/qc/clip-<n>-frozen.mp4`
    (research `fal/falvideogeneration-fe0127#50`: a frozen clip passes every other check). Look at the
    sheet and frames against the misses list and answer the `count-question` row. One line per clip in
    `checks.md`: the figures, then pass, miss, or done without frames. A motion figure under its floor,
    or a clip short of its shot by more than 0.5 s (`--tolerance`; the printed `shortfall_s`), is a miss for the redo round; a smaller shortfall is held on the clip's last frame inside its own shot. Known result (facts `beh-seedance-length`,
    2026-09-23, T3 #15): Seedance returned 4.06 s for a 5 s ask, twice.
13. **One redo round** [13] for every miss together, by the table in shots.md, each redo moving its
    named lever (HR7). A call refused before it was submitted (exit 2, or exit 7 with `checked: client-side`) is fixed
    and sent again; a network failure with no request id (exit 11) may go once more unchanged; once a
    request id exists, only `ai-gen result <id>` touches it (HR6). Exit 3 is a broken machine: report it. Kling,
    the fallback for a second face refusal or a Seedance outage:
    `python3 $FF params kling --prompt-file <prompt without its Sound part> --duration <3-15> --out …`
    and `ai-gen run fal-ai/kling-video/v3/pro/image-to-video --image artifacts/<p>/pictures/shot-<n>.png …`
    (`--image` fills `start_image_url`; Kling i2v has no `resolution` or aspect field, the shape comes
    from the picture, and `generate_audio` is pinned false), then set the shot's `route` to `kling`.
    Home-base variant, a shot that still fails after its redo: `python3 $FF fit --timing … --shots … --per-sentence --drop <n> --write`
    gives its sentence to the neighbours and recomputes their windows and render lengths; film again any neighbour whose clip no longer covers its window.
    Exit 5 or 13 is out of budget: stop, say what is done and left, retry nothing.
14. **Stitch once** [14]. `python3 $FF stitch --shots work/<p>/shotlist.json --timing work/<p>/timing.json --narration artifacts/<p>/narration/narration.mp3 --out artifacts/<p>/final/stitched.mp4 --work work/<p> [--no-timestamp] [--loud 0-3]`:
    each shot trimmed to its window from its own clip, every segment at one size and 24 fps, each
    shot's sound chosen by the calm-clip rule (`python3 $FF sound` shows the choice), the narration
    mixed over that bed in this one run, every cut kept on its sentence end (a clip short of its window holds its own last frame inside that shot, 5 s in all at most; the report prints each cut against `sentenceEnds`), the readout drawn top left
    (per camera when the story cuts between cameras), the mix normalised to -16 LUFS. Exit 1 when the
    length is off by more than 0.1 s, the audio streams are not one, the narration is under 9 LU over
    the bed (restitch one step down the ladder), or the holds pass 5 s in all. Then
    `node $Q loudness artifacts/<p>/final/stitched.mp4` and `node $Q streams artifacts/<p>/final/stitched.mp4 --audio yes`,
    and look at its first frame for the readout. A music request: one sentence saying music cannot go
    under the narration, then a separate track for the customer's editor (`ai-gen run fal-ai/elevenlabs/music`
    with `python3 $FF params music --prompt-file … --duration <s>`, instruments and mood named,
    quoted first; `fal-ai/lyria3/pro` has no price on record, so it opens a gate).
15. **Captions and hand-off** [15]. `python3 $FF captions --timing work/<p>/timing.json --video artifacts/<p>/final/stitched.mp4 --ass work/<p>/captions.ass --out artifacts/<p>/final/final.mp4`:
    the narration's own words with Scribe times, groups of at most 4 words, a new group at a sentence
    end or a 150 ms pause, one on screen at a time, the first at 0.1 s or later. Default look: small
    white sans (Inter) with a soft shadow, bottom-anchored 25% up the frame, above the platform's
    bottom bar; a kit or brief may set `--margin 0.12` (the approach's own) or another. Then hand off
    by shots.md: one or two plain sentences saying the video is AI-generated and naming one thing they could change, no model, field, price, id,
    path or em dash; deliver `final.mp4` (or `stitched.mp4` when captions were refused or could not
    run, and say which). The stitched story is final: never re-check, re-film or re-stitch it on your
    own. Finish `PROGRESS.md` as media-ai-gen says, naming any shot that still looks off (HR15).
16. **Changes after delivery** [16]: one round per steer, regenerating only what the change table in
    shots.md names; picking up a part-finished run follows "Picking up a run part-way" there.

## Not on this machine

- **The customer's own photos as subject or place pictures** are not offered on this machine yet
  (STO-L345): every reference picture is generated from text.
- **A monospace timestamp face** is not offered on this machine yet (STO-L344): the readout uses
  whatever `fc-match monospace` returns.
- **A designed caption template** (the approach's alternative caption render) is not offered on this
  machine yet: the ASS burn in step 15 is the one route (STO-L355).
- **The silent-masters build** (the assessment's fallback method WF37-a1-s2: exact-duration silent
  clips and a narration-only two-pass mix) is not offered on this machine yet; `--loud 3` gives a
  narration-only mix of the same clips.

## House rules (HR-1.0)

Relies on: HR1 (duration, aspect and audio declared by `footage.py params`, measured by `clipcheck`,
`stitch` and media-qc), HR2, HR3, HR4 (voice settings, normalisation, Scribe flags, resolution,
audio, prompt expansion pinned by the params script), HR5 (every paid call quoted, fan-outs summed
first), HR6, HR7 (one redo per item, each moving a named lever; the second failure goes to Kling or a
gate), HR8, HR9, HR10 (the timestamp and captions are drawn by ffmpeg, never by a model), HR11 (every
shot picture is made from the place and subject pictures, never from another shot picture), HR12 (no
question tool; stops are gates and `partial`), HR13 (`footage.py` checks exit non-zero), HR14 (check
lines report what was seen and the figures; no PASS for a measured value), HR15, HR16 (`prompt_expansion_mode`
disabled on MiniMax; check `ai-gen info` for any rewrite field on the other routes and pin it off),
HR17 (real people refused until the consent wording is approved; generic roles and stock voices),
HR18 (no invented facts about real events), HR19, HR20, HR21, HR22 (prices and fields from the dated
facts rows named above) — see media-ai-gen/references/house-rules.md.
