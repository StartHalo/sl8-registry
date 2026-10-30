---
name: edit-cut-reframe
description: >-
  Edits a customer's own footage into one finished file: trims; multi-cuts of chosen moments
  from a JSON edit plan rendered as one ffmpeg filter graph (reordered; each range padded,
  centre-cropped or crop-panned from viewed frames; join fades); resize or reframe to any even
  size; speed change; dead-air removal on request; captions burned last; intros and outros; voiceover
  or music replace, mix or duck; logo or text marks; slideshows; voice isolation or AI upscale on
  request; size-capped, GIF or WebM output; splice review. Use when: trim, cut, shorten, reorder,
  join, reframe, make a vertical or square version, resize, speed up, remove pauses, add a voiceover,
  music, watermark or intro, compress or convert a supplied video. NOT for: picking highlights
  (edit-highlights); captions alone on a finished video (edit-captions); beat-synced montages
  (edit-beat-montage); dubbing (voice-dub); generated or restyled footage (media-video-generation);
  multi-shot films (media-video-production); measuring files (media-qc).
license: SL8 wording and SL8-authored scripts; method from Creative Claw edit-media and its cut-and-reframe contract (Apache-2.0), restated and cited, with points from HeyGen, Everygen, HyperFrames, fal and Higgsfield
compatibility: "sl8-video >=1.5.0 (sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; ffmpeg 5.1 (libass for captions, checked at preflight); python3 3.11 stdlib; imagemagick 6.9; fonts and fonts-noto packs; HyperFrames CLI 0.8.61 only for HTML cards on request; siblings edit-captions, edit-highlights, edit-beat-montage and voice-dub ship in the same Video 1.5.0 bundle"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [creative-claw/cc-cut-reframe-contract, creative-claw/creativeclaweditmedia-fbba56, heygen/retired-videoedit-fe9740, everygen/everygen-editor-tool-contracts, everygen/ryurefreshedsource-5dc49d, creative-claw/creativeclawcreatereels-b6e06c, hyperframes/mediause-ec397d, fal/falvideoproduction-09f33d, hyperframes/hyperframes-2afd9d, higgsfield/retired-ugctryonvideo-086072]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27; Creative Claw 5.4.2 installed 2026-10-25)
  approach: WF26-a1
  attribution: Method from the SL8 capability assessment (WF26-a1), restated in SL8 wording from Creative Claw's editing skill for media and cut-and-reframe contract (Apache-2.0), with points from HeyGen, Everygen, HyperFrames (Apache-2.0), fal and Higgsfield; scripts written by SL8 from the described behaviour
  deltas: VID-D340..VID-D359
---

# Cut, trim and reframe

Turns footage the customer supplies into one finished derivative, deterministically and locally. The
chain has a fixed order: **cutting and joining come first, the final framing second, captions third and marks last.** The master is never overwritten: every step writes a new derivative, and a fix restarts
from the last good one. Multi-cuts run from a JSON edit plan that one script turns into one ffmpeg
filter graph; everything else is a single ffmpeg command (`references/commands.md`). The only paid
calls are fal models through `ai-gen`, and only when a step needs them. Nothing in this method has run
on an SL8 Studio yet: treat the first jobs of each route as tests.

```bash
E=$HOME/.agents/skills/edit-cut-reframe/scripts
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
python3 $E/validate_plan.py init --src work/<p>/src/source.mp4 --probe work/<p>/probe.json --out work/<p>/edit-plan.json --project <p>
python3 $E/validate_plan.py check work/<p>/edit-plan.json [--words work/<p>/stt-<sha12>.json]
python3 $E/remap_captions.py work/<p>/edit-plan.json --words work/<p>/stt-<sha12>.json --ass work/<p>/caps.ass --srt work/<p>/caps.srt --json work/<p>/caps.json
python3 $E/cut_reframe.py work/<p>/edit-plan.json --out work/<p>/cut.mp4 [--words …] [--captions work/<p>/caps.ass --captions-report work/<p>/caps.json]
python3 $E/make_ass.py --words … | --captions … --video <final uncaptioned> --style clean --ass … --srt … --json …
python3 $E/validate_plan.py sidecar --final artifacts/<p>/final/<name>.mp4 --plan … [--report …] [--declared '<json>'] --tags … [--done …] [--splice-report …]
```

`validate_plan.py` exits 0 ok, 1 errors listed, 2 usage, 3 a source guardrail exceeded. Run every script
from the project root (the paths in the plan, such as `viewed_strip`, are relative to it).
`cut_reframe.py` exits 0 rendered and checked, 1 plan refused, render or check failed (the report says
which), 2 a filter or encoder it needs is missing. `make_ass.py` and `remap_captions.py` exit 0
written, 1 nothing to caption, 2 usage or a look not offered. The plan schema, the validator's rules,
framing and caption looks are in [references/plan.md](references/plan.md).

## Steps (WF26-a1)

1. **Preflight once** (`references/commands.md` §1): ffmpeg and ffprobe, the filters this order
   needs (`subtitles`/`ass` from libass for captions, `loudnorm`, `sidechaincompress`, `xfade`,
   `acrossfade`, `atempo`), the encoders (libx264, aac, flac; libvpx-vp9 and libopus for WebM),
   `fc-list` for the Noto faces the captions' script needs, and, only when a fal step is planned,
   `ai-gen doctor` plus `ai-gen info <id>` and the raw OpenAPI of every fal id before its first call
   (HR2).
   - A missing piece stops **only the operations that need it**: a plain trim is not blocked by a
     missing gateway or font. Name the gap before any edit starts, never substitute another tool,
     and never describe a result that was not made. Record the gap in the sidecar's
     `checks_not_done` and in PROGRESS.md under Known gaps, so the owner can file the studio
     request. Nothing is installed or downloaded (HR21).
2. **Read the order and pick only the operations it needs**: trim, multicut (cut, reorder, reframe),
   scale, captions, transcribe, isolate, frames, audio (replace, mix, join), bookends, overlay
   (marks), compose, upscale, bg_remove (a logo), speed, deadair, loudness, compress, convert. No
   settings questionnaire: use the defaults below and say which you used.
   - Route elsewhere: new footage to be generated, or a model-made change to the source →
     media-video-generation; picking the moments from long footage → edit-highlights (this method
     executes chosen cuts; it does not choose them); captions alone on a finished video →
     edit-captions. HTML or code-rendered title cards only when the customer asks for them (step
     13); a caption request never selects HTML.
   - Name anything the chain cannot do before making any asset: a duplicated range, B-roll or a
     separate audio and picture timeline, video background removal, a speaker-following autonomous
     vertical cut with no cut points (the assessment's alternative WF26-a2), and an audio-only trim
     or cut: each is **not offered on this machine yet**.
   - A missing fact that would change the result (a trim with no end, a crop with no subject in
     view, bookend copy): never guess. A bot job has no one to answer and no question tool is called
     (HR12): use the stated default where one exists (pad, the clean look), else end `partial` with
     the missing fact named. With the customer present in chat, ask it once as a plain message.
   - Fix the chain order now and write it into the plan's `operations`. A captioned vertical clip,
     for example: start from the supplied footage, shorten it only when the order says so, resize it
     with a stated mode (step 12), then caption it (step 11); the transcription is the only model
     call.
3. **Bring the source in, read-only.**
   ```bash
   mkdir -p work/<p>/src artifacts/<p>/final && node $S/manifest.mjs init --project <p>
   cp <file> work/<p>/src/source.<ext>                    # a file already on the machine, or:
   curl -fL -o work/<p>/src/source.mp4 '<url>'             # a public, directly downloadable HTTPS file
   chmod a-w work/<p>/src/*
   ```
   A YouTube, Google Drive or social page is not footage: ask for the file itself (step 2; it may
   feed a transcript only once a file exists). A failed download, or a file ffprobe cannot open,
   stops before any edit. Reuse a finished derivative rather than fetching again; fal sees a file
   only through `ai-gen`'s media flags.
4. **Measure; never invent a size, rate or time** (§4): `probe.json`, a 12-frame timeline sheet (24
   at most), stills at chosen times, and a scene-change sheet that includes the lower safe area,
   then `validate_plan.py init`, which writes duration, displayed size after rotation, average and
   real frame rates (the VFR flag), audio streams and the source sha256 from the probe only.
   - Guardrails, as defaults on this sandbox: at most 4 h, 10 GB and 60 fps (`init` exits 3 over
     them; a kit or brief may lift them with `--guardrails off`. On exit 3 with no such brief, end
     `partial` naming the field, except a source over 60 fps with nothing else over: it is read at its
     average rate, so pass `--guardrails off` and say the delivery is constant at the plan's rate). Crop coordinates are read in the
     displayed orientation. A silent source gives a silent output. Several audio streams: stream 0
     is used and the delivery says so.
   - Burned-in text: look at every sheet. Captions already in the picture stay visible (crop or pad
     cannot remove them), so new captions would stack: by default burn none over them and say so.
5. **Transcribe only when the edit needs words or their times**: to choose or check cut edges in
   speech, for dead-air removal, for captions inside a cut, or to compare a cleaned voice (§5). Not
   when the caption pass will transcribe the final video anyway.
   - **Default: fal ElevenLabs Scribe v2** (`fal-ai/elevenlabs/speech-to-text/scribe-v2`); a kit or
     brief may name another. Extract `audio.flac` first (Scribe refuses an `.mp4`; 16 kHz mono, which speech needs and
     which keeps the file near 1 MB a minute); pin `diarize`
     and `tag_audio_events` in a params file (HR4); add `language_code` (ISO 639-3) and `keyterms`
     for names when known.
   - Quote it first (HR5): 2 credits per audio minute, +30% with `keyterms` (media-audio-generation
     facts, 2026-10-05; confirm the unit price with `ai-gen estimate`), times the measured minutes;
     compare with `node $S/manifest.mjs budget --project <p>`. Over budget or no budget known: open
     a spend gate (`gate.mjs`) and end `partial`.
   - Run it, record a manifest row (HR9) and save the request id in the plan's `jobs`:
     ```bash
     ai-gen transcribe work/<p>/audio.flac -m fal-ai/elevenlabs/speech-to-text/scribe-v2 \
       --params-file work/<p>/stt.params.json --queue --max-cost <quote> --format json > work/<p>/stt-<sha12>.json
     ```
     The words are in `raw.words`. The file is named by the source hash: an existing one is reused,
     never paid twice. The manifest row needs the transcript file in `files`, and a distinct `item` per
     call (`transcript-source`, `transcript-final`, `splice-<i>`, `isolation`, `upscale`,
     `logo-cutout`), or the second call is refused as an unexplained retry (commands.md §5).
   - Measure `audio.flac` before the call (`ls -l`): ai-gen sends a file above 3 MB through storage, and
     the size and duration limits are not yet known (learnings VID-L342). On exit 2 (413) or 10, or a
     source too long, split the audio into chunks (10 minutes), transcribe each, and add each chunk's
     offset to its word times; if that is not possible end `partial` naming the gap.
   - Check: `raw.words` is not empty, in source order, and ends inside the source (`validate_plan.py
     check --words` refuses otherwise). Keep the source-timed words; never make up alignment.
6. **Single-range trim** (§6): an explicit start (0 included) and an explicit end or duration; never
   a default range; an end past the source is clamped to the source end. Re-encode for
   frame-accurate edges. Check: the trimmed duration equals end - start within one frame.
7. **Multi-cut plan.** When the moments are chosen (by the customer or an earlier highlights step),
   write `segments` in **output order** as half-open `[start, end)` source seconds: each at least
   150 ms, no overlap, no duplicates, reordering allowed. Default caps: 40 ranges and 300 output
   seconds per render (the vendor's limits kept as defaults); a kit, brief or the request may set
   others in `limits`, said in the delivery.
   - Choose every edge in a gap between words, with lead-in and tail; never clip a consonant, a
     breath or a reaction; finish on a brief release that stops before the next word starts; keep
     some pauses, and keep what the speaker meant.
   - The agent cannot listen, so it uses proxies (§7): the word timings, a silence map
     (`silencedetect` at -35 dB over 0.15 s) and a waveform strip of ±1.5 s around each proposed
     edge. The validator grades each edge's word gap: 0.4 s or more is often natural, 0.15-0.4 s
     look at the strip, under 0.15 s keep more context.
   - A silent or music-only source has no words: edges rest on the silence map and the frame strips,
     and the validator says the word check was skipped.
   - **Dead-air removal is opt-in**: only when the customer asks for pauses, silences or filler
     gone. `validate_plan.py deadair` turns word gaps of 0.6 s or more into cuts that keep 0.15 s of
     each pause; it lists every pause over 1.5 s, whose frame strip you view first: a reaction or
     silent action is never dead air, so keep that pause (`--keep-pauses`). Then `--write
     --viewed-strips <the strip files>`, which refuses unless every listed strip exists. The cuts are
     made inside the plan's existing ranges (each keeps its framing and speed; ranges outside
     `--within` stay), and the command prints how many ranges there were before and after.
   - The renderer never extends a range, and each edge can shift by as much as half an output frame,
     so a cut is never described as sample-exact. Run `validate_plan.py check` and save the plan (it
     carries the source hash) before rendering.
8. **Output size, frame rate and framing per range** (plan.md "Framing"). Width and height are the
   order's, even integers 128-1920 by default (`limits.min_side` and `limits.max_side` may change it for
   a 4K order) (1080x1920 only when nothing is asked), so 9:16, 1:1, 4:5, 16:9
   or custom from any source. Frame rate: the source average made constant by default; 24, 25, 30,
   50 or 60; `source` keeps a rational rate.
   - Per range: **pad** when what is in frame matters or the subject's place is uncertain (the
     default); **center_crop** only after viewing that range's strip (§8) and seeing the subject
     stay inside; **crop**: an even rectangle in source pixels with the output's aspect, fixed or up
     to 20 keyframes timed from the range start, set only from frames you looked at (a straight line
     between points is not face tracking). Make the strip first, look at it, then set `"viewed": true`
     and `"viewed_strip": "work/<p>/range_<i>.png"` (the validator refuses `center_crop` and `crop`
     without both, and the strip file must exist). Odd sizes round down
     (405x720 → 404x720).
   - A speaker who leaves the crop on the contact sheet: add points or pad. Never stretch or guess.
9. **Render once per output**: `cut_reframe.py edit-plan.json --out work/<p>/cut.mp4`. One filter
   graph over one input per range (seeked on input, so a reordered plan buffers nothing): trim to
   the range, framing, speed, constant fps, then concat; a 30 ms fade (`audio_fade_ms`, at most 100)
   at each discontinuity only, so contiguous ranges join with none and the audio stays in sync.
   Fades stop clicks; they do not fix a bad sentence cut: choose a better edge.
   - **Speed change** (on request): a range's `speed` (0.25-4 by default, `limits.speed_min` and `limits.speed_max`) sets video `setpts` to N = 1/speed
     and chains `atempo` so each stage stays within 0.5-2.0. Probe the result against length ÷
     speed.
   - **Loudness** only when asked, on the whole output, never as denoising or ducking: two passes
     with measured values and `linear=true`, TP -1.5, LRA 11. Default target: -14 LUFS for a vertical
     or square clip meant for social platforms, -16 LUFS for one that is mainly voice (talk, podcast,
     lesson); a kit or brief may name another, and the delivery states the one used. Set
     `normalize_audio` in the plan only when the cut is the whole audio of the deliverable. If music
     or a voiceover is added afterwards (step 14), leave it off and do the two-pass on the final mix
     (commands.md §14), then check it with `mediaqc.mjs loudness`.
   - It writes `cut.cmd.txt` (the exact command), `cut.report.json` (ranges, joins with the planned
     words either side, expected and measured duration, output probe, `declared`) and
     `cut.contact.png`. Check (the script does): duration = the sum of range lengths within the
     quantisation, an audio stream only if the source has one and ending within 0.2 s of the
     picture, the planned frame size. A re-run reuses the plan; it never invents a new one.
10. **Captions inside the cut** (optional): `remap_captions.py` maps each real source-timed word to
    output time through the range that holds it (reordered and sped-up ranges included), **drops any
    word that straddles a cut** and lists it, groups 3 words per caption (at most 7), picks the Noto
    face for the text's script, and writes `caps.ass`, `caps.srt` and `caps.json`. Then render with
    `--captions work/<p>/caps.ass --captions-report work/<p>/caps.json` (add `--fontsdir work/<p>/fonts`
    for a font file the customer supplied): burned last, in the same encode. When speakers overlap or the text runs right to left, keep the clean look unless the
    frames were reviewed. With only sentence-level timing, render the cuts first and caption the
    result (step 11). No libass: `cut_reframe.py` exits 2; deliver the uncaptioned cut and name the
    gap.
11. **Caption pass on the final-framed, uncaptioned video** (§11), when captions are part of an edit
    order and not cut-remapped. Never caption a captioned file: the file chain must show the input
    is the uncaptioned derivative.
    - Words: transcribe the final video's audio (step 5's command). An exact script supplied:
      `--script` takes the wording and keeps the audio's timing, and is ignored (and said so) when
      it does not match the speech. Timed captions supplied (SRT, WebVTT or JSON `{start, end,
      text}`, also how a requested translation arrives): `--captions`, no transcription, no cost.
    - Defaults, looks, spellings, fonts and look previews are in [references/plan.md](references/plan.md)
      "Caption pass details". `word_box` is **not offered on this machine yet** (use highlight or box).
      When the customer wants to choose a look, render one preview still per candidate and deliver them
      beside the default render.
      Rule: fonts are never downloaded (HR21); a customer's font file goes through `fontsdir`, and a named face
      that is not on the machine falls back to the Noto face, said in the delivery.
12. **Simple resize or vertical version** (§12, no multi-cut): even dimensions and an explicit mode.
    Pad keeps the whole frame; crop is a centre crop with no subject tracking, used only when the
    timeline sheet shows the subject staying visible; otherwise pad, the stated default. Never
    stretch. A resize adds no detail: enhancement is step 17. Check: W x H as asked and even; a
    fresh contact sheet shows the subject after a crop.
13. **Intros and outros** (§13): establish the main video's size, aspect, frame rate, audio and
    platform. Supplied clips are used. HTML or code-rendered title cards only when the customer asks
    for them or accepts that offer for exact text, fonts and logos: load hyperframes-core and
    hyperframes-cli and render at the main video's size and rate. A generated cinematic bookend goes
    to media-video-generation, with a still from the main video as its style reference. Use the
    copy, logo, duration and audio given; never write a slogan or a call to action nobody gave;
    bookends stay brief. Make each segment match the main video in size and rate, inspect it, then
    join in playback order with the main frame kept whole (pad black, white or gray) unless cropping
    is authorised. The join is a hard cut by default (say so first if the main audio must carry on
    under a bookend); a crossfade on request.
14. **Narration or music on a clip** (§14). **Replace** (the default) drops the clip's own sound,
    dialogue and ambience included: check both durations first and never shorten the video silently
    to fit a voiceover. **Mix** keeps the clip's sound at the video's full length, gains from 0 to 1
    (music sits under speech at roughly 0.3) and a start offset. A clip with no audio stream has no `[0:a]`: use the replace recipe, or `[1:a]` alone with the
    gain (`volume=<gain>`), after reading `audio_streams` in `edit-plan.json`. Added audio that outruns the
    picture holds the last frame (the `tpad` recipe; the replace recipe cuts it at the picture, so check
    the lengths first). Several audio files join end to end in one pass, never layered:
    check every segment is there, in order, and the total covers the narration. When clip lengths
    follow narration, lock them from the final speech's word timings (no more than 2.5 words spoken
    per second of clip, with about half a second of air on both sides) and never make a second
    voiceover. Ducking and an audio crossfade (`acrossfade`, 0 to 30 s, 5 a common start) are available on
    request (commands.md §14); loudness (step 9's targets) is applied after ducking, never before. An operation still not possible is named before any asset
    is made. An audio-only file gives an `.m4a`.
15. **A logo or copyright mark on a finished video** (§15). Prepare a tightly cropped transparent
    image: a logo on a solid background goes through background removal (**Default:
    `fal-ai/bria/background/remove`**; a kit or brief may name another; 4.5 or 10 credits per the
    media-image-generation facts, quoted with `ai-gen estimate`, HR5); exact text is set with
    ImageMagick `label:` and an explicit font **file** (`fc-match -f '%{file}'`), because
    ImageMagick silently swaps a missing font. Overlay 1 to 8 marks at one of nine anchors, sized as
    a share of the video width (12% of a 1920-px frame is roughly 230 px) with a 48 px margin, later
    marks above earlier, shrunk to fit. Copy the audio; keep the unmarked master. With captions too,
    burn both in one encode. Check: stills at start, middle and end show the mark at its anchor;
    duration and audio equal the master's.
16. **A video assembled from images with durations, clips and an optional track** (§16): 1 to 25
    inputs in playback order; each image needs a duration; clips play in full with their own sound
    unless excluded; contain pads, cover crops; the first video sets the canvas (images only: the
    first image, capped near 1080p); one audio track at full level may outlast the last clip, with
    the final frame held. Probe every input before rendering and report a bad one by its field.
    Check order, framing, audio and duration with ffprobe and a contact sheet.
17. **Cleanup and enhancement, only on request** (§17).
    - **Voice isolation** (**Default: `fal-ai/elevenlabs/audio-isolation`**; a kit or brief may name
      another): clean the audio of the file that will be delivered (the cut, when the order is a cut;
      the whole source only when the whole source is the deliverable), mux it back over the full video
      length, and re-run `init` on the cleaned file so the edit plan reads it. Its price is
      not in the facts files: if `ai-gen estimate` exits 12 the route is unpriced, so open a spend
      gate and end `partial` (HR5). Cleanup can change speech: keep the original, transcribe both
      (two Scribe calls in the quote) and compare the word lists; if words changed beyond noise,
      deliver the original and report it.
    - **AI upscale** (**Default: `fal-ai/topaz/upscale/video`**, fallback
      `fal-ai/seedvr/upscale/video` when the Topaz estimate exits 12, which the facts say is the usual
      case; a kit or brief may name another): read the schema, pin the model and factor, and declare
      the output size before the call (HR1; for example 1080x1920 from 540x960 at factor 2; choose
      `target_resolution` from that size). Quote it by hand, since `ai-gen estimate` does not see the
      media: SeedVR is about 0.25 credits per megapixel of width x height x frames; Topaz is per
      second of video (2.5 to 30 credits, by the facts rows). Sum the quote against `manifest.mjs
      budget` first. Order of work when an upscale is ordered: cut and frame **without** `--captions`,
      upscale that derivative, then caption and mark the upscaled file (step 11, step 15). The plan's
      size limits govern only the cut, so an upscaled file may exceed them. Check the output size. Video background
      removal and image upscalers are not offered on this machine yet.
18. **Splice review for every multi-cut or join** (§18), at each `joins[].at_out_s` in the report,
    with about 1.5 s either side: a frame strip across the splice (crop continuity, captions), the
    window transcribed and compared with the report's planned words (no clipped first or last word),
    and a click proxy (`astats` peak against a window 1 s away). Each window is a Scribe call: quote
    them all with step 5's rate before the first. A silent source gets frame strips and click
    proxies only. These are proxies: passing them says nothing about whether the edit reads well,
    and the delivery says so. Write the result (one line per join) to `work/<p>/splice.txt`, which step 19's
    `--splice-report` names, and give each Scribe call its `splice-<i>` manifest row. Fix only a fault you found, from the plan; never re-render
    speculatively.
19. **Final check and delivery** (§19): ffprobe and a final contact sheet; `mediaqc.mjs streams`;
    order, duration and cut points against the plan; framing, speech, caption timing and safe zones
    on the sheets. Deliver `artifacts/<p>/final/<readable-name>.mp4` (or `.m4a`, `.gif`, `.webm`),
    with burned captions the SRT beside it as `<name>.srt`, and its sidecar from `validate_plan.py
    sidecar` (name, tags, plan, `checks_done`, `checks_not_done`, `declared`). The cut report's
    `declared` and `checks_done` are taken only when the delivered file is byte-identical to the cut.
    For any other delivery (WebM, GIF, `.m4a`, a size cap, bookends, marks, an upscale, a trim or a
    resize, so no cut report) pass `--declared '<json>'` describing that file (format, w, h, fps,
    audio, duration) and `--done "<check run on that file>"` for each check you ran on it. A plan
    with more than one range needs `--splice-report <step 18 result>` or `--not-done "splice review
    not done: <why>"`. Name an edit not finished with `--incomplete`. It refuses an empty `checks_done`.
    Example for a trim: `sidecar --final F --plan P --declared '{"w":1080,"h":1920,"fps":30,"audio":"required","format":"mp4","duration_s":12.0}' --done "ffprobe 1080x1920 30 fps" --done "mediaqc streams exit 0" --tags trim`.
    Then compare the file with its declaration (HR1):
    `node $Q declared --plan artifacts/<p>/final/<name>.json --file artifacts/<p>/final/<name>.mp4`.
    Pass on approved wording, quoted copy and timecodes unchanged, and keep references in their
    order.
    - A size cap: bitrate = (cap_MB × 8 × 1000 ÷ seconds) × 0.97 - audio kbps, the 3 percent being container headroom,
      with maxrate equal and bufsize double (25 MB = 25 x 10^6 bytes unless the platform says MiB;
      25 MB, 120 s, 128 kbps → 1538k, 1489k with the 3 percent); check the size and lower it if over. No cap: CRF 18
      (23 and 28 are smaller).
    - GIF: two-pass palette at 15 fps, 480 wide, lanczos; delete the palette after. WebM: VP9 at CRF
      30 with `-b:v 0` and Opus. A missing encoder stops that format, named as a gap.
    - Write PROGRESS.md and close with the folder, file count and credits (media-ai-gen gates and
      manifest). State every check not done and any edit not completed; never claim one without its
      evidence.
20. **Jobs and recovery.** Local steps are checked by exit status and a probe of what they wrote; a
    failure resumes from the last completed derivative. Every fal call runs with `--queue` (or
    `--async`, then `ai-gen result <id>`), and its request id goes into the plan's `jobs` and the
    manifest at once. A timeout or a lost response is not a failure: fetch the known request with
    `ai-gen result <id>`, never resubmit it, never use `status --wait` (it under-counts the ledger).
    A request id is not an output file. Report credits only when the envelope gives them (missing is
    unknown, not zero). Rejected before paid work (exit 7, client-side): fix the field and retry. A
    retryable error: one retry that moves a named lever, never a silent model switch (HR7). A
    content-policy rejection is terminal. Exit codes: media-ai-gen `references/recovery.md`.
21. **Cost.** Local ffmpeg work costs no credits. The paid steps are the fal calls: transcription
    (and each splice window), isolation, upscale and background removal. Estimate each before it
    runs and sum them against the budget; a partial estimate is never given as the total, and the
    delivery names what an estimate leaves out. The run's spend comes from `manifest.mjs budget`, not
    from a balance delta.

## House rules (HR-1.0)

Relies on: HR1 (size, rate, duration and audio declared in the plan and the report, measured with
media-qc; the report's `declared` is derived from the plan, not independent, so a paid upscale or cutout
gets its own `declared` in its manifest row), HR2 (`ai-gen info` and the raw OpenAPI before each fal id's first call), HR3, HR4 (Scribe's
`diarize` and `tag_audio_events`, the upscaler's model and factor pinned in params files), HR5 (every
paid call quoted against the budget; an unpriced route opens a gate), HR6, HR7 (one retry moving a
lever), HR8 (deliverables under `artifacts/<p>/final/`, scratch under `work/<p>/`), HR9 (a manifest row
per fal call), HR10 (captions and marks burned last, in one encode; exact text and logos never pass
through a generative model: background removal only cuts the logo out), HR11 (edit from the original, never from a render of a render, unless the brief asks for an
iterative chain; here the cut with its captions is one encode, captions and marks together are one
encode, and a bookend, upscale or cleanup pass on a finished derivative is the iterative chain the order
asks for, said in the delivery; captions re-burn from the uncaptioned file),
HR12 (stated defaults and gate files, no question tool), HR13 (`validate_plan.py`, `cut_reframe.py`
and media-qc are the checks), HR14 (frames and proxies are reported, never a written PASS), HR15 (a
hand-off names what is still owed, such as captions not burned), HR18 (bookend copy is the customer's,
never invented), HR19, HR20, HR21 (no installs, no font or tool downloads), HR22 — see
media-ai-gen/references/house-rules.md.
Not applicable: HR16 (no prompt is written), HR17 (no likeness or voice is made; isolation only cleans
the customer's own recording).
