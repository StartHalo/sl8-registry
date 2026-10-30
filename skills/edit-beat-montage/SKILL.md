---
name: edit-beat-montage
description: >-
  Beat-cut montage of a customer's own footage on their own music track: shot-detect the clips,
  fit a beat grid to the track with librosa, plan every cut in beats with three written rethinks,
  write an EDL, render it with the shipped numpy frame renderer (levels, black and white, punch,
  push, shake, zoom and whip transitions, flashes, spoken-word titles), master at -14 LUFS and
  CRF 16, then pass the cut, edge, loudness and format gates. A
  remake follows a supplied reference edit cut for cut with the customer's clips. Use when: a hype,
  sigma, highlight-reel or music-video style edit cut to a song, a beat-synced montage of supplied
  clips, or a shot-for-shot remake of a reference edit. NOT for: captions on a finished video
  (edit-captions); a plain trim or reframe (edit-cut-reframe); picking highlights from a long video
  (edit-highlights); a scripted multi-shot production (media-video-production); generating clips
  (media-video-generation); music or voice (media-audio-generation); measuring files (media-qc).
license: SL8 wording and SL8-authored scripts; method from Higgsfield's Katana edit instructions (no licence stated), restated and cited, with points from HyperFrames (Apache-2.0), fal, JuicyLucy and EveryGen restated
compatibility: "sl8-video >=1.5.0 (sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; ffmpeg 5.1 (libx264, aac, ebur128, loudnorm, alimiter, minterpolate); python3 3.11 with numpy, scipy, librosa, Pillow and faster-whisper; fonts 1.1.0 (Anton, Inter) with fontconfig; siblings edit-captions, edit-cut-reframe and edit-highlights ship in the same Video 1.5.0 bundle"
metadata:
  version: 1.0.1
  revision: 2026-10-30a
  house-rules: HR-1.0
  upstream: [higgsfield/katana-432bce, hyperframes/hyperframes-2afd9d, hyperframes/mediause-ec397d, fal/falaudiogeneration-ba1a03, juicylucy-ads/adplatform-a2543e, everygen/animalclips-e048e4]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27; Higgsfield Katana instructions captured 2026-10-26)
  approach: WF27-a1
  attribution: Method from the SL8 capability assessment (WF27-a1), restated from Higgsfield's Katana edit instructions with points from HyperFrames (Apache-2.0), fal, JuicyLucy and EveryGen; scripts written by SL8 from the recorded numbers
  deltas: VID-D300..VID-D319, VID-D612, VID-D621
---

# Beat montage

Cuts a customer's footage to their music, on the beat. The track gives a beat grid, the footage
gives shots, a plan written in beats becomes an EDL, one render draws the grade, motion and titles,
one mix sets the loudness, and four scripted gates check the master before anyone sees it. The
default route runs entirely on this machine and spends nothing; the paid calls (remote
transcription, generated inserts, a swap, a reference description) are optional and quoted first.

The method is one vendor's written edit instructions, restated in SL8's words. Nothing in it has
run on an SL8 Studio yet, and the vendor supplies no render engine: `scripts/render.py` is SL8's,
built from the recorded numbers, and its few assumed constants are marked in
[references/edl.md](references/edl.md). Treat the first jobs as tests and tune on preview frames.

```bash
M=$HOME/.agents/skills/edit-beat-montage/scripts
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
python3 $M/shots.py probe <file>... --out work/<p>/probe.json
python3 $M/shots.py photo <heic-or-rotated-photo>... --out-dir artifacts/<p>/source
python3 $M/shots.py scan <clip> --out-dir work/<p>/shots/<clip> [--threshold 0.3] [--metrics]
python3 $M/words.py local work/<p>/words/<clip>.wav --out work/<p>/words/<clip>.json [--language <xx>]
python3 $M/words.py place --edl work/<p>/edl.json --words work/<p>/words/<clip>.json --shot N --from-word A --to-word B
python3 $M/beat_grid.py grid work/<p>/track.wav --fps <fps> --out work/<p>/beats.json [--entry-bar N] [--need <s>] [--bpm N] [--beats-per-bar N]
python3 $M/beat_grid.py snap work/<p>/beats.json --cuts <t1,t2,…> --out work/<p>/cuts.json
python3 $M/render.py work/<p>/edl.json --check [--beats work/<p>/beats.json] | --preview work/<p>/preview | --slice 0:60 --out work/<p>/slice.mp4
python3 $M/render.py work/<p>/edl.json --out work/<p>/video.mp4 [--plain] [--no-interp]
python3 $M/mix_master.py work/<p>/edl.json --video work/<p>/video.mp4 --out work/<p>/master.mp4
python3 $M/verify.py work/<p>/edl.json work/<p>/master.mp4 --out work/<p>/verify.json --sheet artifacts/<p>/qc/sheet.jpg --beats work/<p>/beats.json
```

Every script exits 0 done; 1 bad input or a failed check, with the reason on one line; 2 a tool,
library, model weight or font is missing. Exit 2 means the machine is broken: report it, never
install anything (HR21). The master is built and checked in `work/<p>/`; only a master that passes
step 14 is copied to `artifacts/<p>/final/` in step 15.

## Routes

| Route | When | Spend |
|---|---|---|
| Edit (default) | footage, a track and a brief; titles from spoken words transcribed locally | none |
| Edit, Scribe | local transcription fails and the job allows remote speech-to-text | about 2 credits a minute |
| Edit, no speech | silent footage, or no titles wanted | none |
| Plain cut | a job that needs cuts on the beat only, or the fallback when the renderer fails | none |
| Edit with inserts | the brief wants a few shots the footage lacks, made from a subject photo | Seedance, per clip |
| Remake | a reference edit plus the customer's clips: cuts follow the reference one to one | none |
| Remake with a swap | the brief wants a product, object, character or garment replaced in reference shots | Kling, per clip, untested |
| Reference description | optional, on a remake | video-understanding, about 8 credits |

Motion transfer, shots generated from a brief alone, the vendor's preset catalog and an edit with
no track are not offered on this machine yet: see [Not on this machine](#not-on-this-machine).

## Boundaries, and whose they are

From the source method (rights lines; the Studio surfaces them and the rights stay with the
customer; a kit may set its own policy): song lyrics never appear on screen, even when the
reference shows them; a repeated request gets a one-line refusal plus an alternative: the
subject's own spoken words, or a timing file whose text is left blank for the customer. `words.py`
marks words from segments the model doubts are speech `likely_sung` and `place` refuses them unless
the brief says the speaker is speaking (the thresholds are untuned guesses; words from the Scribe
route carry no mark, so read those yourself). Every
frame of the edit comes from the customer's clips or photos, or is generated from them: a
reference only guides framing, motion and rhythm. Tracks,
references and clips are files the customer supplies; this method never fetches them from YouTube,
TikTok or piracy sites. No music or sound effects are synthesised or written in code; extra effects
are licensed stock the customer supplies. House rules (always): HR17, no real person's likeness or
voice without their documented consent and never a named real person imitated (this covers
celebrities and known characters); HR18, no invented quotes or claims.

## Steps (approach step numbers in brackets)

1. **Intake and probe [1].** Start the project once (`node $S/manifest.mjs init --project <p>`;
   on an existing project first `node $S/gate.mjs status --project <p>`), copy the inputs to
   `artifacts/<p>/source/` (uploads stay in `artifacts/attachments/`) and probe every file: `python3 $M/shots.py probe artifacts/<p>/source/* --out work/<p>/probe.json`.
   Sort each file into footage, subject photo, track or reference edit from what it is and what the
   brief says: attaching a file is not an order to copy its edit. A photo that probe marks
   `needs_photo_convert` (HEIC, or an EXIF orientation other than upright) goes through
   `python3 $M/shots.py photo <file> --out-dir artifacts/<p>/source` and the PNG is used. Files with no requested result are
   described in a line or two, with no edit and no paid call. `vfr: true` is fine (every script
   decodes at one constant rate) but goes in the notes. Check the boundaries above now. Nothing is
   written to `artifacts/<p>/final/` before step 15.
2. **Mode [2].** **Edit** is the default: footage plus a brief such as "turn these clips into a
   sigma edit", with no reference matching. **Remake**: a reference edit is supplied, to be
   followed shot for shot with the customer's own subjects. A job that needs only cuts on the beat takes the plain
   route (step 12). Nothing attached and no brief: in a live session ask in one line what to edit;
   a bot job ends and says what is missing (HR12: no question tool). Record the mode in
   `work/<p>/notes.md`.
3. **Remake intake [3].** The reference is required: until it is on disk, nothing is generated or
   paid for. A reference with no subject named: ask once in a live session for subject clips,
   photos or a one-line description; a bot job ends and says so. Use every value already supplied as
   given; never ask for it again.
4. **Analyse the footage [4].** `python3 $M/shots.py scan <clip> --out-dir work/<p>/shots/<clip>`
   for each clip: cuts at scene score 0.3 with the scores kept in `scores.txt`, a labelled sheet
   with one frame per shot, each shot's first, middle and last frames, samples every 4.5 s inside
   long dark shots, and 1 fps sheets. Open the sheets and frames with the Read tool. You see
   pictures, not motion or sound: judge what is visible and let the scripts measure timing and
   loudness; fix what fails once and never ask the customer to check.
   - Scan the 1 fps sheets for subtitles already burned into the footage (they can start mid-shot);
     crop past them or keep titles off those shots.
   - Choose pieces: close, sharp, well-lit shots of the subject first; medium shots now and then;
     wide shots only when they are exceptional; never a shot where the subject cannot be
     recognised. A bright, close shot of the subject saying something striking makes a strong opening.
   - Another face in frame: crop it out with `zoom` up to 1.75 and a moved `cx`, `cy`. Letterbox bars
     or a streaming logo: `zoom` 1.25 or more. A chosen piece whose first or last frame shows a cut
     in the source is too long: trim it.
   - Spoken words, for titles and the line mix. **Default: local faster-whisper `small`** (word
     times, voice detection on, baked weights only); a kit or brief may name another engine:
     only for a clip whose `probe.json` has `has_audio` true (a clip without sound gets no titles and no lines):
     `mkdir -p work/<p>/words && ffmpeg -v error -y -i <clip> -vn -ac 1 -ar 16000 work/<p>/words/<clip>.wav`, then
     `python3 $M/words.py local work/<p>/words/<clip>.wav --out work/<p>/words/<clip>.json`, adding
     `--language <xx>` (ISO 639-1) only when the footage's language is known. Exit 2 (no engine or
     weights): the Scribe v2 route ([references/inserts.md](references/inserts.md#scribe-v2-transcription),
     `fal-ai/elevenlabs/speech-to-text/scribe-v2`) only when the job allows the audio to leave the
     machine; otherwise, and for footage without speech (exit 1), run with no spoken-line titles.
     Word times are in clip seconds; `words.py place` turns them into timeline frames (step 10).
5. **Reference breakdown [5]** (Remake). `python3 $M/shots.py scan artifacts/<p>/source/<reference>
   --out-dir work/<p>/shots/ref --threshold 0.15 --fps <its rate> --metrics`: cuts at 0.15 (fast, low-contrast reference cuts)
   with scores, the labelled sheet, and per frame the mean luma (to find black frames and flashes), a
   black-and-white flag and the white-text box (capital-letter height relative to the frame, centre).
   Write in the notes how the reference is built: shot lengths and rhythm, transitions, camera
   moves, how the cuts follow the music, and its type (face, weight, place, animation). An optional
   paid description: [references/inserts.md](references/inserts.md#reference-description).
6. **Track and beat grid [6].** Extract the track: `ffmpeg -v error -y -i <track> -vn -c:a pcm_s16le
   work/<p>/track.wav` (in a remake with no other track, the reference's own sound). No track: see
   [Not on this machine](#not-on-this-machine). Then
   `python3 $M/beat_grid.py grid work/<p>/track.wav --fps <fps> --out work/<p>/beats.json --need <seconds>`:
   - onset times are moved back by the measured detection lag (the envelope peaks come up to one
     hop after the attack; `onset_lag_ms` in the output); a straight-line fit of the strongest onsets to their beat numbers gives period and phase; a
     median error over 10 ms prints a warning, over 25 ms exits 1 (no reliable grid: try `--bpm`,
     `--beats-per-bar 3` or 6, or another track). The output lists the chosen tempo with half and
     double and an `ambiguous` flag: when it is set, state the chosen bpm and its octave in the notes
     and pass `--bpm` if it is half or double of the felt beat;
   - the edit enters on a bar (`suggested_entry_bar` is the biggest rise in energy; `--entry-bar N`
     picks another; `loudest_bar` is listed too) and ends on a bar line (`timeline.bar_frames`). A
     remake on the reference's own track keeps the reference's timeline: `--audio-in 0`;
   - cut frames come from `timeline.beat_frames`: beat j sits at round(j × period × fps), worked out
     from the beat number, because adding rounded beat lengths drifts off the music (at 128 BPM and
     30 fps by two frames in 32 beats). Cut on beats; bigger changes may wait for a bar;
   - a cut planned off the beat (a vocal hit, a reference cut): `beat_grid.py snap`. Up to one frame
     off is kept; two or three frames moves it to the nearest neighbouring beat that has an onset;
     more is reported `off-grid`: put it on a beat, or keep it and say why in the notes.
   Remake: the cut frames come from `work/<p>/shots/ref/shots.json`; `snap` takes seconds, so
   pass `start_f / fps`. Default `fps` 30, constant (a remake: the reference's own rate, so its cut frames carry over); a
   brief may set another. Default size and shape: the footage's (or the reference's), unless the
   brief names a platform format.
7. **Loudness and shot list [7].** `ffmpeg -nostdin -i work/<p>/track.wav -af ebur128=peak=true -f
   null - 2>&1 | tail -12`: note the integrated loudness and true peak (a reference's own sound is
   often mastered loud, near -6 LUFS and peaking over 0 dBFS). Then one row per shot in the notes:
   its frames (start, end), beat number, framing, the camera's move, what the subject does,
   on-screen text and treatment.
8. **Design, then challenge it three times [8].** Give each planned shot its source piece (a
   remake: each reference shot gets a customer shot matching its framing and movement). Then write
   three passes in the notes; each names the most generic thing left in the plan and replaces it with
   something only these subjects could carry. The strongest shots lead. No glitch, RGB-split or
   template effects. Generate (step 9) or render (step 11) only after the third pass.
9. **Inserts [9]** (when the brief asks for shots the footage lacks, or a remake's subject came as
   photos). Each matches the size, framing, move and length of the shot it fills, plus 0.5 s of
   handle each side. Under about 0.5 s: never generated; the photo goes in the EDL as a still with
   `punch` or `push`. A push or hold from a photo: **Default: `bytedance/seedance-2.0/image-to-video`**;
   a product, object, character or garment replaced inside a reference shot: **Default:
   `fal-ai/kling-video/o3/pro/video-to-video/edit`**
   (untested); a kit or brief may name others. Consent (HR17), quote, gate, call and manifest row:
   [references/inserts.md](references/inserts.md#inserts-from-a-subject-photo). A pure edit skips
   this step.
10. **EDL [10].** Write `work/<p>/edl.json` ([references/edl.md](references/edl.md)): header from
    step 6 (`total_frames` on a bar line, `audio` the track, `audio_in` the entry), contiguous shots,
    flashes, titles and lines. A remake on the reference's own track puts its cuts on the
    reference's cut frames one to one (`work/<p>/shots/ref/shots.json`), with `audio_in` 0 and
    `total_frames` the reference's frame count (no bar rule applies). Where someone speaks, titles
    are that person's own words, under the face (`cy` 0.82 to 0.88); never song lyrics. Do not do
    the clip-seconds to frames arithmetic by hand: `words.py place` prints the `text` and `lines`
    entries (a word that runs over a cut is split into one entry per shot). A title may not cross
    a cut: split it that way, or move the cut to a beat clear of the word. `lines` are not offered
    on a shot whose `speed` is not 1. A cut off the beat is listed in `off_grid` with a reason.
    `python3 $M/render.py work/<p>/edl.json --check --beats work/<p>/beats.json` must exit 0: it
    prints each shot start's beat number and frame offset and fails over 1 frame.
11. **Render engine [11].** The engine ships (`render.py`); it is not written per job. Default title
    face: Anton (fonts 1.1.0, a heavy condensed caps face), white; a kit, brief or reference may name
    another face that `fc-list : family` shows. A face that is not installed: take the closest
    installed bold face, `squeeze` 0.8 for narrow heavy caps; never a fallback face (`--check` exits
    2). First run the two-second test: `--slice 0:60 --out work/<p>/slice.mp4` exits 0.
12. **Preview, then render [12].** `python3 $M/render.py work/<p>/edl.json --preview work/<p>/preview`
    writes the middle of every shot, each title's entrance and middle, and each transition. Open every
    PNG: framing, exposure, title size and spelling, transitions, empty edges. Fix in the EDL and
    preview once more (HR7). `speed` under 1 is the slow path (motion interpolation): preview it first;
    `--no-interp` blends frames instead when it is too slow. A shot that still fails: set its `punch`, `push`, `shake` and
    transitions to 0 and `lv` to `off`, a plain cut on the grid. Then
    `python3 $M/render.py work/<p>/edl.json --out work/<p>/video.mp4`: a long command (10 s at
    1080x1920 took 11 s on a workstation with a fast preset; not yet measured on this machine), so
    give it a 10-minute
    limit or run it in the background; a long edit is a background run, not a reason to split. If it is
    split anyway: parts start and end on shot boundaries (`--slice a:b --preset slow --out
    work/<p>/part_NN.mp4`), then `printf "file '%s'\n" work/<p>/part_*.mp4 > work/<p>/list.txt; ffmpeg -f
    concat -safe 0 -i work/<p>/list.txt -c copy work/<p>/video.mp4`, and `ffprobe -count_frames
    -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 work/<p>/video.mp4` must equal
    `total_frames`. Plain route (cuts only, or the renderer cannot be made to work): `--plain`; it drops
    the grade, motion, flashes and titles, so a titled brief is told first.
13. **Sound and master [13].** `python3 $M/mix_master.py work/<p>/edl.json --video work/<p>/video.mp4
    --out work/<p>/master.mp4`. Defaults (a kit or brief may set others with the flags):
    the track from `audio_in`, faded over the last 0.5 s, by two-pass loudnorm with measured values
    and `linear=true` to -14 LUFS, true peak -1.5, LRA 11; each spoken line (0.4 s or longer) with
    25 ms fades, a fixed gain to -15.5 LUFS and a 0.80 limiter, laid over the track; the summed mix
    is then measured and given one linear gain if it is off -14 by more than 0.5 LU or peaks over
    -1.5 (figures before and after are printed; `--mix-gain` adds dB); the picture copied as
    rendered, AAC 256k. A `dynamic` warning means the track could not take a linear gain: the step 14 gate decides.
14. **Verify [14].** `python3 $M/verify.py work/<p>/edl.json work/<p>/master.mp4 --out
    work/<p>/verify.json --sheet artifacts/<p>/qc/sheet.jpg --beats work/<p>/beats.json [--ref artifacts/<p>/source/<reference>]`, then
    `node $Q streams work/<p>/master.mp4 --audio yes --fps <fps>`. The gates: every shot start and the
    end sit on a beat (offset at most 1 frame, or listed in `off_grid`); decoded frames, frame rate
    (constant) and size equal the EDL (this replaces `media-qc declared` for this deliverable); every
    detected cut is a planned one, the shot's own transition frames being its window (an extra cut
    is junk in that shot's source piece); no black bar at a frame edge on bright frames (dark
    content passes); -14 LUFS within 1 LU and true peak at most -1. Open the sheet (source or
    reference beside ours). A failed gate: fix the piece, the EDL or the mix (`--limit` is the peak
    ceiling, `--mix-gain` the loudness lever) and run once more; still failing, nothing is delivered
    as final and the figures are reported. The gates are defaults; a brief or kit may set others with
    the `verify.py` flags. Without such an instruction, a failed gate stops delivery.
15. **Deliver [15].** Only after step 14 passed: `cp work/<p>/master.mp4 artifacts/<p>/final/<name>.mp4`,
    then `node $Q artifact artifacts/<p>/final/`. Reply in three to five lines:
    the result, its path, what the gates measured, and the rights line ("A platform may mute a
    track you hold no licence for; make sure you may use any footage you did not shoot; credit the
    author of a reference edit."). On request, also copy `edl.json`, `render.py` and `mix_master.py`
    into `artifacts/<p>/final/` with an `edit.sh` holding the two commands. If export failed, say so;
    a preview or slice is never presented as the result.
16. **Run rules [16].** One finished video per job; offer variations afterwards, never make them
    unasked. Every paid call is quoted and inside the budget before it runs, with `--queue` (it waits
    for the job, so no turn ends with a job still running); never `ai-gen status --wait`; after a
    timeout fetch with `ai-gen result <request-id>` (HR6). Report a failed submission plainly. Ask
    nothing during the run except for a missing input, and browse no presets.

## Not on this machine

- **Motion transfer** (a reference shot's body or camera motion re-performed by the customer's
  photo, `bytedance/seedance-2.0/reference-to-video` with the cut shot in `video_urls`) is not
  offered on this machine yet: ai-gen 2.2.0 cannot upload a local video into a URL list (facts
  `cli-arrays-not-uploaded`). Use the customer's own clip of the move, or the photo with `push`, or
  an image-to-video insert (step 9).
- **Brief-only shots** (subject shots generated from a description alone) are not offered on this
  machine yet: the method names no model. Make the clip with media-video-generation and bring it in
  as footage.
- **The vendor's preset catalog** (named edit styles) is not offered on this machine yet; the general
  method takes the brief's own style words.
- **An edit with no track** is not offered on this machine yet (owner decision pending, VID-L307):
  a live session asks for the track; a bot job ends and says it is missing. Music is never generated
  or written in code for this method.

## House rules (HR-1.0)

Relies on: HR1 (the EDL header declares size, rate and length; `verify.py` measures them), HR2,
HR3, HR4 (Seedance `generate_audio`, `resolution`; Scribe `diarize`, `tag_audio_events` pinned),
HR5 (each paid call quoted against the budget; the default route is free), HR6, HR7 (one more
preview, one more gate run, one retry per insert), HR8 (`artifacts/<p>/final/`, `qc/`, `clips/`,
`source/`; scratch in `work/<p>/`), HR9 (a manifest row per paid call), HR10 (titles are drawn by
the renderer in the one picture encode, never by a model), HR11 (every shot is cut from the
customer's original file), HR12 (stated defaults; a spend over budget is a gate; no question
tool), HR13 (gates are `verify.py` and `media-qc` exits), HR14 (figures, never a written PASS),
HR15, HR16, HR17 (consent before a generated likeness), HR18 (titles are words actually spoken),
HR19, HR20, HR21 (no installs, no weight downloads), HR22 — see media-ai-gen/references/house-rules.md.
