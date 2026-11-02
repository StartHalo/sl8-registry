# Brief fidelity: end card, brand names, feature screens, keyframes, routes, ladder, photos

Five defaults from the first owner-graded Video 1.5.0 run (VID-T42-v14, the 75 s Ladderlight
explainer, 2026-10-30), and two from the graded product ad (VID-T16-w04, Harbor Roast,
2026-11-02): the quality ladder and supplied product photos. Each is a default: a kit or brief may
set another.

## Contents
- [End card length](#end-card-length-plan-stage-1)
- [Brand names are spoken right](#brand-names-are-spoken-right-stage-5-checked-at-stage-9)
- [Features shown in the picture](#features-shown-in-the-picture-plan-stages-2-and-6)
- [Keyframe check](#keyframe-check-stage-2-before-the-frame-gate)
- [Each clip's route in its manifest row](#each-clips-route-in-its-manifest-row-stages-2-and-3)
- [Quality ladder](#quality-ladder-stage-1-quote)
- [Supplied product photos that disagree](#supplied-product-photos-that-disagree-stage-1)

## End card length (plan, stage 1)

Default: the end card holds **about 4 s**. A longer card is time the viewer spends on a still frame;
the seconds a shorter card frees go to footage rows, not to more cards. media-script-writer budgets
no narration past the card's first line, so the voice-over ends as the card settles. On a 75 s piece
that is about 71 s of footage and type before the card, not a 10 s logo hold.

## Brand names are spoken right (stage 5, checked at stage 9)

Brand names are spelled in the brief and heard in the voice-over; a mispronounced brand name is a
common defect that captions cannot reveal.

1. List each brand or product name the brief spells (`Ladderlight`, `Harbor Roast`).
2. After the voice-over is made, transcribe it (stage 9, `scribe-v2` with word timings) and compare
   each listed name with the transcript, case and spacing ignored.
3. A name the transcript spells differently is a **mishearing**: re-voice that fragment only, with
   a phonetic respelling in the TTS text only (`Ladder-light`, `Harbour Roast`), so the on-screen
   text keeps the brief's spelling, and transcribe the new fragment once. A name heard right on the re-voice closes it; a
   second mishearing goes in the delivery with both transcripts, for a person to listen to.
4. Record each name, the transcript's spelling and the respelling used in the manifest row's
   `measured` (`brand_heard`).

media-audio-generation's Step 4 carries the same check for a voice-over made on its own.

## Features shown in the picture (plan, stages 2 and 6)

When the brief names product features ("matches you with a real coach", "books your first
session"), default: each feature gets a shot that **shows** it, not only a type card that names it.
The shot is a phone or laptop screen composited with brand graphics:

- a generated still or clip of a person holding a phone or sitting at a laptop, with the screen
  facing the camera and blank (the keyframe prompt asks for "a plain lit screen");
- a screen graphic drawn locally by media-motion-graphics (its `Feature screen` component: the
  brand's colours and type, the feature's own words, one simple element such as a booked-slot card
  or a coach's name card);
- the graphic placed on the screen with ffmpeg, as one step inside the final cut's single encode,
  not a separate re-encode. Read the screen's four corners off the frame (top-left, top-right,
  bottom-left, bottom-right), then scale the graphic to the full frame, give it a 2 px transparent
  border (the `perspective` filter repeats edge pixels outside the mapped shape, so the edge has to
  be transparent), map it onto the corners, and overlay it. Tested on a 1280x720 frame
  (2026-10-31): outside the screen the background is unchanged; inside, the graphic lands on the
  four corners.

  ```bash
  ffmpeg -i shot.mp4 -i screen.png -filter_complex \
    "[1:v]format=rgba,scale=1276:716,pad=1280:720:2:2:color=0x00000000,\
  perspective=x0=500:y0=150:x1=760:y1=170:x2=490:y2=600:x3=750:y3=620:sense=destination[s];\
  [0:v][s]overlay=format=auto[v]" -map "[v]" ...
  ```

  (W:H is the frame size, `scale` is W-4:H-4, and x0..y3 are the screen's corners in the frame.)
  Padding the screen-sized graphic at its x:y offset and then mapping the canvas corners does not
  place it: `perspective` moves the whole canvas.

A type card may still name the feature beside the shot. Full animated product UI (screens that
scroll, tap or build) is not this machine's work: that is Motion Studio's (HyperFrames); say so in
the delivery when a brief asks for it.

## Keyframe check (stage 2, before the frame gate)

Look at each keyframe and its clip's first frame before any clip spend. Default checks:

- **No stray marks:** no sign, logo, label, licence plate, exit sign or watermark the brief did not
  ask for. Text in the frame that the brief did not give is usually a redo of that keyframe; a prop
  label the scene needs can stay.
- **No unrequested move:** the clip row's camera line names the move ("locked off", "slow push
  in"); a clip that adds a pull-back, a pan or a zoom the row did not ask for is a redo of that
  clip, once, with the row's move restated.

Print one line per keyframe in PROGRESS.md (`marks: none` or the list, `move: as asked` or the move
seen). media-shot-craft's validator carries the same two lines.

## Each clip's route in its manifest row (stages 2 and 3)

Record each generation's own row with `manifest.mjs add --result <that call's JSON>`, one call per
clip, so the row carries the endpoint the clip ran on. A row added from another clip's result names
the wrong route, and a batch of rows with one result names one route for all of them.

## Quality ladder (stage 1 quote)

When the default clip route at the declared resolution does not fit what remains of the grant,
step down in this order, one step at a time, and re-quote after each step:

1. **The same model at a lower resolution.** On Seedance 2.0 that is the base route at `480p`
   (list rate 33.6 credits a second, about 134 for a 4 s clip; base at `720p` is about 303).
2. **Then a lower tier** of the same family, at the lowest resolution it takes: `/fast/` at `480p`
   (26.9 a second), then `/mini/` at `480p` (18 a second). Rates: media-video-generation's
   endpoints.md; price the exact payload with `ai-gen estimate`.
3. **Then the spend gate** (pre-spend step 5), with the clip line at the default route's quote.

Fewer or shorter shots change the structure the brief or the story gate fixed, so they are not a
ladder step: offer them as an option of the spend gate. On another family the order is the same:
its own lower resolution first, then its cheaper tier. The face rule (P3) still picks the route for
a realistic face.

Name the step in `plan.json` (`declared.clip_route`: the route, the resolution and the ladder step,
e.g. "bytedance/seedance-2.0/image-to-video at 480p: ladder step 1, 720p (303 a clip) did not fit
four clips in 1000"), in the quote line, and in the delivery, with the render size and the delivery
size when the clips are scaled up.

## Supplied product photos that disagree (stage 1)

Before any still, look at every supplied product photo (the Read tool) and write one line each in
PROGRESS.md: file, label text read verbatim, packaging (shape, colour, size). Photos disagree when
the label text, the packaging or the product differ between them ("single origin one" and "single
origin two" on two bags of one blend).

When they disagree:

1. **Pick one hero.** Default: the photo whose label is fully legible and closest to the product
   the brief names; on a tie, the first one supplied. Record it as `declared.hero_product` in
   `plan.json`, with the reason.
2. **Use only the hero** as the reference image for every product shot (stills and clips), so the
   label reads the same in every shot. The other photos are not references.
3. **Ask first when a person is attending:** put the difference and the hero pick into the
   `Approve structure` gate's question at stage 1c, with one approve option per photo, the default
   hero first as option `a` ("Approve, hero bag-1.jpg"), so the answer settles both and `--default a`
   picks the declared hero. Unattended, the gate is recorded on its default and the job goes on with the hero.
4. **Flag it in the delivery:** which photos differ and how, the hero used, and any difference
   between the hero's label and the brief's product name.
