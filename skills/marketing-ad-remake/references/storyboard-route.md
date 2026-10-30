# Storyboard route (WF18-a2 steps 22-30)

## Contents
- [When it runs](#when-it-runs)
- [S1 Entry](#s1-entry-22)
- [S2 Read the reference in five layers](#s2-read-the-reference-in-five-layers-23)
- [S3 Write the storyboard](#s3-write-the-storyboard-24)
- [S4 Self-check](#s4-self-check-25)
- [S5 Approval](#s5-approval-26)
- [S6 One image per recurring character](#s6-one-image-per-recurring-character-27)
- [S7 Plan, quote and spend](#s7-plan-quote-and-spend-28)
- [S8 One call per scene](#s8-one-call-per-scene-29)
- [S9 Check, join, deliver](#s9-check-join-deliver-30)

Our words throughout; the method is restated from the assessment's WF18-a2 and the research ids its
register cites. `R`, `S`, `Q` and `<p>` are as in SKILL.md. Bracketed numbers are the approach steps.

## When it runs

Only in two cases: the reference is longer than 15 s and the customer will not send a trimmed one,
or the clone call failed after its one retry (SKILL.md step 16; skip the trim advice then). It is a
multi-job plan with its own quote and spend gate.

## S1 Entry [22]

- **The reference video is not an input on this route, and it is not cut.** The storyboard text and
  the image references carry its structure and pacing, so the storyboard has to be complete enough
  to be the prompt.
- Say at the start that the result is one clip per scene, joined into one file at the end, and that
  the scene list comes with it.
- SKILL.md steps 1-9 (intake, measurement, watch and listen, the one inquiry, material images,
  the voice-over) are done once and reused here.

## S2 Read the reference in five layers [23]

Build it from the watch pass and the transcript (SKILL.md step 4), plus the customer's corrections
when someone is in the session. Asking for corrections is storyboard preparation, not a second
inquiry. Beats the passes did not show are filled from what that kind of ad usually does and
marked **ASSUMED**.

1. **Hook, the first 3 s:** one sentence in the shape of the `hook-sentence` row of
   [prompts.json](prompts.json). Devices: a pain point, curiosity, a benefit, a contrast, the
   viewer seeing themselves, a claim against expectation.
2. **Persuasion chain,** each part with its time range. A common order: raise a problem, make it
   worse, show the answer, prove the selling points, add trust, call to action. Name the core
   selling point and the line meant to stick.
3. **Who and how:** the audience, the narrator, how the product appears, the tone.
4. **Close:** the call to action, what boosts it, and when it lands.
5. **The storyboard** (S3). Layers 1-4 stay short; the work goes into layer 5.

## S3 Write the storyboard [24]

Write `work/<p>/storyboard.json`; `remake.py storyboard` renders the tables from it.

```json
{"aspect_ratio": "9:16", "voice_over": "rewrite", "timbre": "<one voice description>", "total_s": 20,
 "scenes": [{"n": 1, "name": "Hook", "start": 0, "end": 8, "duration": 8,
   "shots": [{"n": 1, "size": "close-up", "visual": "…", "action_vo": "…"},
             {"n": 2, "size": "medium", "visual": "…", "silent": true}]}]}
```

- Reproduce the reference's shot structure and pacing, with the customer's product and character
  in place of the originals. **One scene is one call and one clip;** a scene may hold several
  shots, grouped the way the reference cuts. Shots have no length of their own and are never
  generated alone.
- Shot numbers run on across the whole video. Each visual description keeps the reference's
  composition with the swap made (a close-up of the original bottle becomes a close-up of the
  customer's jar) and is complete enough to be the prompt.
- A character who returns is called by one fixed name ("the model") in every scene, and their
  looks are never described in text: the canonical image (S6) is the only authority.
- The voice column follows the handling: a rewrite keeps the line count and the per-shot pacing; a
  customer's script is spread over the shots in the reference's rhythm; kept lines stay as they
  are. Leave a line empty only for a shot that is meant to be silent (`"silent": true`).
- No subtitle or caption field. Sound effects may stay; no background music. **One voice
  description, word for word the same in every scene** (`timbre`; the `timbre-example` row shows
  the shape). Describe a voice, never a named or real person's voice (HR17).
- Scene lengths are whole seconds from 4 to 15: split a longer scene, merge a shorter one with a
  neighbour. The scenes cover the whole reference without gaps. One aspect ratio for every scene.

## S4 Self-check [25]

```bash
python3 $R storyboard work/<p>/storyboard.json --ref-duration <duration_s> --md work/<p>/storyboard.md
```

It checks the eleven items and prints a `FAIL` line per problem: a complete header (aspect ratio
in the model's list, the handling, a voice description, the total); scenes numbered from 1; whole
seconds, starting at 0, each scene starting where the last ended, end minus start equal to the
length; every scene 4-15 s; the last scene ending at the total and the total within 1 s of the
reference; at least one shot per scene and shot numbers running on; a shot size on every shot;
visual descriptions of 15 to 800 characters; a voice entry on every shot not marked silent; under
4,000 characters of shot text per scene; no subtitle or caption field. Fix and rerun, at most three
rounds; still failing, show what is left and stop (a bot job ends `partial` with the list). **Never
generate from a storyboard that fails.**

## S5 Approval [26]

Show the checked tables (`work/<p>/storyboard.md`). With the customer in the session, take their
approval or changes; each revision reruns S4 and is shown again, and is not a second inquiry. A
change that breaks a check (a 3 s scene) is answered by naming the check and offering the nearest
valid version. In a bot job the storyboard goes into the S7 spend gate's question, so the
approval and the spend are one answer.

## S6 One image per recurring character [27]

**Hard gate: no scene with a recurring character is generated before that character's image
exists and is confirmed.** One image each, in this order:
1. the customer's image, or the material image confirmed in SKILL.md step 8 (no second one);
2. the reference's own person, only with the rights statement recorded in step 7: ask the watch
   pass for the clearest front-facing moment, then
   `ffmpeg -v error -ss <t> -i work/<p>/ref.mp4 -frames:v 1 artifacts/<p>/material/char-frame.png`;
3. a generated person from a described face shape, hair, build and clothes: default
   `fal-ai/nano-banana-pro` (a kit or brief may name another), quoted and recorded like any call,
   several characters as parallel jobs.

Show it and take confirmation (bot job: the S7 gate shows it). The same file goes into every scene
that character is in; never regenerate or swap it between scenes.

## S7 Plan, quote and spend [28]

Count the jobs by kind (character images, scene clips). Quote one representative scene with
`ai-gen estimate bytedance/seedance-2.0/reference-to-video --params-file work/<p>/scene-1.params.json --format json`
and each image job; scene calls carry no reference video, so no reference seconds are billed.
Add the watch and transcript lines of S9. Sum it, compare with `node $S/manifest.mjs budget --project <p>`,
and **open one spend gate for the whole plan** when it is over budget or no budget is known
(`gate.mjs open --slug approve-scenes --quote <total>`, with a stop option); the job ends
`partial`. Not enough credits: one sentence, then stop.

## S8 One call per scene [29]

Write each scene's params file, then check it:

```bash
python3 $R params --route scene --probe work/<p>/ref.probe.json --prompt-file work/<p>/scene-<k>.prompt.txt \
  --refs <n> --duration <scene seconds> --out work/<p>/scene-<k>.params.json
```

- **Exactly one call per scene, never one per shot.** The prompt is the scene's shots in order, the
  same voice description, the `character-lock` row for each recurring character in it (leave the
  clothes out where the storyboard changes them), and the `scene-fixed` row.
- Image references, in `--ref` order (`@Image1`, `@Image2`, …): the product, the canonical image of
  each recurring character in the scene, any other confirmed material image. The reference video
  is never passed.
- Length = the scene's planned seconds; one aspect ratio; `generate_audio` true; resolution as
  SKILL.md step 13.
- Scenes are independent: submit each with `--async`, add its `pending` manifest row at once (item
  `scene-<k>`, node `scenes`), then fetch each with `ai-gen result <request-id> -o artifacts/<p>/scenes/ --format json`.
  Sum all the quotes against the budget before the first submit: an async job reaches the ledger
  only when it is fetched.
- The submit line for each scene, with its variables:
  `ai-gen video -m bytedance/seedance-2.0/reference-to-video --params-file work/<p>/scene-<k>.params.json --ref artifacts/<p>/source/<product> --ref artifacts/<p>/material/<character-k> --strict-params --max-cost <q-k> --async --format json > work/<p>/scene-<k>.submit.json`
  (`--ref` once per `@ImageN`, in order; no prompt on the command line), and its row:
  `node $S/manifest.mjs add --project <p> --result work/<p>/scene-<k>.submit.json --params work/<p>/scene-<k>.params.json --json '{"item":"scene-<k>","node":"scenes","endpoint":"bytedance/seedance-2.0/reference-to-video","status":"pending","declared":{"duration_s":<d>,"aspect":"<ratio>","resolution":"720p","audio":"required"},"credits":{"estimate":<q-k>}}'`.
- A scene that needs an exact first frame may use `bytedance/seedance-2.0/image-to-video` with
  `--image <start frame>` instead (default off; a kit or brief may turn it on); read its schema first.
- A failed scene: read the error, fix that scene's fields, retry it once (HR7), then report which
  scene failed and keep the others.

## S9 Check, join, deliver [30]

1. For every scene clip: a frame sheet (`node $Q sheet <frames> --out artifacts/<p>/qc/scenes-sheet.jpg`,
   then read it), the watch pass with the `watch-clip` prompt, and the transcript of its extracted
   audio (as SKILL.md step 17). Check the product and its label, the same-looking character
   across scenes, the product name as spoken, a steady voice, and no music.
2. Ask the `scene-review-question` (bot job: the findings go into the delivery, with any scene
   to redo as a gate option).
3. `node $Q clipset artifacts/<p>/scenes/` (every clip must agree on codec, size, frame rate and
   audio). Write `work/<p>/scenes.txt` in scene order (`file '<absolute path>'` per line) and join
   with one re-encode, every clip's audio brought to one rate:
   `ffmpeg -v error -f concat -safe 0 -i work/<p>/scenes.txt -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -ar 48000 artifacts/<p>/final/final.mp4`.
   Known result (facts beh-seedance-44k): joining clips at mixed audio rates lengthened an 8.2 s
   cut by 0.72 s.
4. Per scene, a measured-versus-planned table (`node $Q declared --plan artifacts/<p>/manifest.json --file <scene clip> --id scene-<k>`
   gives the measured length; tolerance default 1 s per scene, since a 5 s request has returned
   4.06 s, facts `beh-seedance-length`). `node $Q streams artifacts/<p>/final/final.mp4 --audio yes`, and the joined length within
   1 s of the storyboard total; if the sum drifts over 1 s, re-time the join (trim or hold a scene's
   last frame in the concat), never regenerate a scene for length alone. The same check on the joined length:
   the storyboard total (`ffprobe -v error -show_entries format=duration -of csv=p=0 <file>`).
5. Deliver the joined file and the ordered scene list (number and name, time range, length, file),
   so one scene can be redone alone, and say which scenes failed after their retry. Subtitles, when
   asked, as SKILL.md step 18.
