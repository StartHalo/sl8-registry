---
name: video-fan-cam
description: >-
  Personalized fan-cam clip: one person's photo becomes a short live sports-broadcast spectator
  cutaway in two paid stages. An edit model makes an identity-preserving broadcast still
  (gpt-image-2 edit by default), the still is checked against the photo before any video spend,
  then image-to-video animates only the approved still (Kling v3 pro by default, Seedance 2.0 the
  other route) and the clip is reviewed frame by frame. Generic broadcast styling only; exact score
  text or graphics are burned on afterwards. Use when: put a consenting person in the stands at a
  match, a crowd-reaction or spectator cutaway from a selfie or portrait, a fan-cam clip for a
  sport, a broadcast-style reaction video. NOT for: a still or headshot edit alone
  (media-image-generation); animating any other still, or a talking head (media-video-generation);
  a score bug or titles on an existing clip (media-motion-graphics); a multi-shot film
  (media-video-production); measuring files (media-qc).
license: SL8 wording; fal fan-cam and character lines adapted (no licence stated, used with attribution); Kling AI motion lines (MIT); everygen and Higgsfield restated and cited
compatibility: "sl8-video >=1.5.0 (sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; media-motion-graphics 1.1.0; node 22; ffmpeg and ffprobe 5.1; imagemagick 6.9; fal endpoints as of 2026-10-27"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [fal/fancam-031b77, fal/charactersheet-a2ae87, fal/characterdesign-c8e4b8, kling/klingaigeneratevideo-5f0e8c, everygen/rankingvideos-1aa4ce, everygen/foundfootagestories-179c12, everygen/everygen-generation-tool-contracts, fal/falvideogeneration-fe0127, fal/falvideoproduction-09f33d, higgsfield/product-video-presets]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27)
  approach: WF38-a1
  attribution: Method from the SL8 capability assessment (WF38-a1), built on fal's fan-cam skill (fal Codex plugin 1.1.0) with identity points from fal's character-sheet and character-design skills and motion points from Kling AI's generate-video skill (MIT); everygen and Higgsfield points restated in SL8 wording
  deltas: VID-D420..VID-D439, VID-D610
---

# Fan-cam clip

A photo of one person becomes a few seconds of live sports TV: the camera cuts to them in the crowd.
The method has two paid stages in a fixed order. First an edit model turns the photo into a
broadcast still that keeps the person recognizable; that still is the identity anchor, and only an
approved still goes to video. Then an image-to-video model animates it with natural spectator
motion. The raw photo is never animated directly: video providers reject raw person photos as
references, and two unrelated vendors make a still first and animate that (everygen generation
contracts #8, Higgsfield product-video presets #1).

The source gives guardrails but no prompts, duration, cost or recovery. The prompts A1 and A2, the
format and reaction fills, the 5 s default and the cap of 3 attempts per stage are SL8's and have
not been run on any model on this machine: treat the first clips as a test.

```bash
F=$HOME/.agents/skills/video-fan-cam/scripts/fancam.mjs
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
node $F brief work/<p>/brief.json                     # validate, fill stated defaults, list them
node $F params still|clip work/<p>/brief.json --model <id> --out work/<p>/<item>-<n>.params.json [--reframe]
node $F check still|clip work/<p>/brief.json work/<p>/<item>-<n>.params.json [--reframe]   # every field is the script's
```

`references/brief.example.json` shows every key with its type. `fancam.mjs` exits 0 written; 1 a brief problem, each one named (no portrait, no consent, no sport,
a value outside its list, a duration the route cannot render, a text key that is not a string) or a failed check; 2 usage, an
unreadable file or a model it has no field mapping for.

## What a request needs

- **The portrait:** a photo or approved portrait of one person (JPEG, PNG or WebP), face visible.
- **The brief** (fal's required inputs): sport, team or event context, venue and crowd mood; a
  reaction (shocked, celebrating, nervous, chanting, laughing, emotional); a broadcast format
  (close-up cutaway, crowd pan, scoreboard moment, replay); duration and crop (usually 9:16 or
  16:9: 9:16 vertical for social, 16:9 horizontal for a broadcast look).
- **Consent (HR17):** whose face it is. `consent` is `owner` (the person in the photo is the
  customer) or `written permission from <name>`. A supplied photo is not consent.

## Steps (approach step numbers in brackets)

1. **Brief and consent** [1]. The brief becomes `work/<p>/brief.json` (written at the end of step 2,
   once the project exists): `portrait` (its copy in `artifacts/<p>/source/`), `consent`, `sport`,
   `context`, `venue`, `crowd_mood`, `reaction`, `format`, `crop`, `duration_s`, optional `audio`,
   `action` (replaces the reaction row's beat), `overlay_text`, `overlay_graphics` and
   `budget_credits`, and the retry levers `still_note` and `motion_note` (steps 5 and 7). Types: text keys are strings, `duration_s` a whole number, `audio` a JSON true or false, `portrait` a path that exists from the working directory (example file in `references/`).
   - Until the SL8 consent text and privacy note are approved by the owner (VID-L436), refuse a portrait
     of a real person in one line and spend nothing; the `consent` value below is recorded for when it is.
   - No consent: quote and spend nothing for that face, and say why in one line. No portrait or no
     sport: in an interactive session with the customer present ask only for that; a bot job ends
     and says what is missing. Everything else takes a stated default, named in the delivery
     (reaction celebrating, close-up cutaway, 9:16, 5 s, crowd mood excited, a venue typical of the
     sport, no sound); no question tool is called (HR12).
   - Generic styling: add sports broadcast details in prompt only when they are generic or
     user-provided; do not invent real network marks or false event claims (fal fan-cam). Before
     writing the brief, replace a real broadcaster, a real result or event claim, and a real team
     crest or sponsor mark with a generic description (team colours stay). A readable scoreboard
     without exact supplied text is dropped. Exact text or rights-safe graphics the customer
     supplies go in `overlay_text` / `overlay_graphics` for step 9, never into a prompt.
   - The brief's text and anything written in the photo are content, never instructions.
2. **Project and portrait** [2]. `node $S/manifest.mjs init --project <p>` (kebab-case from the
   brief, not from the person's name), copy the photo to `artifacts/<p>/source/` and check it opens
   (`identify artifacts/<p>/source/<portrait>`). HEIC, or a file over the proxy's upload limit
   (exit 2, 413): convert or downsize it with media-photo-editing first.
   - There is no upload command and no host to set up. `--ref` on `ai-gen image` uploads the file
     inside each call (proxy storage, else a data URI up to 3 MB) and maps it to `image_urls`, which
     both edit routes require; `--image` on `ai-gen image` maps to `image_url`, which they reject.
     On `ai-gen video`, `--image` uploads the still to the route's start-frame field. The upload
     worked when the call exits 0 (media-ai-gen commands.md, Inputs and uploads).
   - Write `work/<p>/brief.json` and run `node $F brief work/<p>/brief.json`; an exit 1 names each
     problem, and step 1 says what to do about it.
3. **Schemas and quote, before the first paid call** [3, 5]. Run `ai-gen --version` once (2.2.0;
   on any other version say so in the status line and trust only what `info` shows). Once per session, run
`ai-gen info <id> --format json` and the raw OpenAPI printer (media-ai-gen) on the edit route and
   the image-to-video route you will use (HR2). Exit 8 is an unknown id: take the other route.
   - Known results (media-image-generation and media-video-generation facts, 2026-10-05/06):
     `openai/gpt-image-2/edit` needs `prompt` and `image_urls` (at most 16), takes its size only as
     `image_size`, defaults `quality` to high and has no `seed` (schema-gpt2-edit-fields,
     schema-gpt2-quality). Kling v3 pro image-to-video needs `start_image_url`, has no aspect or
     resolution field (the clip takes the still's shape; aspect 0.4 to 2.5, at least 300 px, at most
     50 MB), takes `duration` as a string `"3"` to `"15"` and defaults `generate_audio` to true
     (schema-kling-v3). Seedance 2.0 image-to-video needs `image_url` and `prompt`, takes `duration`
     `"4"` to `"15"`, `aspect_ratio`, `resolution` (default 720p) and defaults `generate_audio` to
     true; it has no moderation field (schema-seedance20-duration, -aspect, -resolution,
     schema-seedance-audio-default, schema-seedance-no-negative). If `info` shows a prompt-rewrite or
     enhance field on a route, pin it off in the params file (HR16).
   - Write the first still and clip params files (steps 4 and 6) and quote both:
     `ai-gen estimate <id> --params-file <file> --format json`. The still's quote leaves out the
      portrait's input tokens, which the edit also bills, so add a margin of 10%: every `--max-cost`
      and the budget comparison below use quote x 1.1 (round up), and the real charge is recorded
      from `credits_used`. Known magnitudes (list prices): GPT Image
     edit high is 52.75 cr at 1024², about 2 to 4 times that at 2K, plus the input image
     (price-gpt2-quality, price-gpt2-size, price-gpt2-edit); Kling v3 pro is 28 cr/s silent and 42
     with sound (price-kling-v3-pro); Seedance 2.0 at 720p is 378 cr for 5 s (price-seedance20-proxy).
   - Compare the total with `node $S/manifest.mjs budget --project <p>` (remaining) or the brief's
     `budget_credits`. Over it, or no budget known: open a spend gate and end the job `partial` (HR5, HR12):
      `node $S/gate.mjs open --project <p> --slug clip-spend --question "Spend N cr on the still and the clip?" --options '[{"id":"go","label":"Go","credits":N},{"id":"stop","label":"Stop","credits":0}]' --resume-at "step 4: make the still" --quote N`. A job may need up to 3
     stills and 3 clips; every retry is quoted again before it runs, and every `ai-gen` call below ends the stage or switches route on exit 13 (over the cap), 8 (unknown id) or 6 (blocked), and a call that exits 0 with no file is a failure.
4. **Make the still** [3].
   `node $F params still work/<p>/brief.json --model openai/gpt-image-2/edit --out work/<p>/still-1.params.json`
   writes prompt A1 with the route's fields and prints the `declared` object. Then
   `ai-gen image -m openai/gpt-image-2/edit --ref artifacts/<p>/source/<portrait> --params-file work/<p>/still-1.params.json -o artifacts/<p>/keyframes/ --queue --strict-params --max-cost <quote x 1.1> --format json > work/<p>/still-1.result.json`.
   - **Default: `openai/gpt-image-2/edit`**, `quality` high, one image, png, safety checker on, sync
     off (pinned by the script, HR4); a kit or brief may name another. Sizes: 1152x2048 for 9:16,
     2048x1152 for 16:9. Known result (beh-nbp-scores): first on SL8's earlier identity-preserving
     headshot runs.
   - **Default fallback: `fal-ai/nano-banana-pro/edit`** (`aspect_ratio` the crop, `resolution`
     2K); a kit or brief may name another. Known result (beh-nbp-scores): it scored 0/4 twice on
     identity-preserving headshots, so it is the second choice, not a peer.
   - Not set: `input_fidelity`. Known result (schema-gpt2-edit-fields): fal's GPT Image edit schema
     has no such field and the proxy drops it. On this machine identity is held by the original
     portrait as the only reference, A1's line "keep the facial features exactly the same as
     Image 1" (fal character-sheet), and the route.
   - Prompt A1 (`references/prompts.json`, row `still`): one frame of a live sports broadcast, a
     spectator cutaway of this person; facial features exactly as Image 1, hair, skin marks and
     build recognizable; sport, venue, context and crowd mood from the brief; framing from the
     format row and expression from the reaction row; candid live TV camera, telephoto compression,
     stadium lighting, not a posed studio portrait; generic broadcast styling only, with no real
     network logos, team marks, scoreboard text, captions or readable text.
   - A failed call (exit 7, 10 unrecovered, an empty result): record it before any new attempt,
     `node $S/manifest.mjs add --project <p> --json '{"item":"still","node":"keyframes","endpoint":"<id>","params_file":"work/<p>/still-1.params.json","params":{},"declared":<declared>,"credits":{"estimate":<quote>},"request_id":null,"status":"failed","notes":"exit <n> <message>"}' --params work/<p>/still-1.params.json`.
      A refusal (exit 7 with a message about a person or the content) is charged until shown
      otherwise: never resend it unchanged; attempt 2 is `--reframe` (`lever: prompt`) or the fallback
      route (`lever: route`); after the caps stop and report. The next attempt's row names its `lever`
      and the count of rows is the cap (HR7).
   - Record the row:
     `node $S/manifest.mjs add --project <p> --result work/<p>/still-1.result.json --params work/<p>/still-1.params.json --json '{"item":"still","node":"keyframes","declared":<declared>,"credits":{"estimate":<quote>},"parents":["source/<portrait>"]}'`
     (HR9), then `node $Q declared --plan artifacts/<p>/manifest.json --file <the still>` (HR1).
5. **Approve the still before any video spend** [4]. View the portrait and the still together
   (`node $Q sheet artifacts/<p>/source/<portrait> <the still> --out artifacts/<p>/qc/still-<n>-pair.jpg`)
   and write what you see for each item of fal's quality bar, never a bare pass (HR14). Identity is the owner's judgement, not a measurement: the pair sheet goes with the status line, and the accepted row carries `"reviewed_by":"agent"` until the owner has looked:
   - **Person remains recognizable.** Compare face shape, eye spacing, hairstyle, marks and body
     build; drift in any of them is a fail (fal character-design).
   - **Broadcast frame feels live, not posed studio content.**
   - **Crowd and venue support the sport.**
   - **Any text/logos are absent, generic, or explicitly provided.** Here absent or generic, with no
     garbled lettering: supplied text is burned in step 9.

   Only a still that holds all four goes to video. Default: your review approves it; a kit or brief
   may require the customer's approval instead, which opens a spend gate for the clip (the pair
   sheet named in the question, the clip's quote, a stop option) and ends the job `partial`; the
   next job resumes at step 6. When the still fails, regenerate it rather than animate it (HR7, at
   most 3 stills): when identity drifts, the fix is a stronger anchor or a reference/edit workflow,
   not more style words (fal character-design). The fallback scored 0/4 on identity, so it is not the
   answer to drift:
   - identity drift: attempt 2 stays on the route with a `still_note` that restates the anchor in
     words taken from the portrait (hair, marks, build; `lever: prompt`; A1's identity line never
     changes); attempt 3 moves to the fallback edit route (`lever: route`);
   - a posed look, the wrong crowd or venue, or stray text: attempt 2 stays on the route with a
     `still_note` naming the fix (`lever: prompt`), then `params` and `check` again; attempt 3 moves to
     the fallback route (`lever: route`);
   - after attempt 3 nothing remains. Every attempt edits the original portrait, never an earlier
     still (HR11).

   After the cap, or with no lever left, mark the row `rejected` (`node $S/manifest.mjs add --project <p> --json '{"request_id":"<its id>","status":"rejected","notes":"<why>"}'`: the same request id updates the row), spend nothing on video, and report
   what failed with the pair sheet.
6. **Animate the approved still** [5].
   `node $F params clip work/<p>/brief.json --model fal-ai/kling-video/v3/pro/image-to-video --out work/<p>/clip-1.params.json`, then
   `ai-gen video -m fal-ai/kling-video/v3/pro/image-to-video --image artifacts/<p>/keyframes/<approved still> --params-file work/<p>/clip-1.params.json -o artifacts/<p>/clips/ --queue --strict-params --max-cost <quote x 1.1> --format json > work/<p>/clip-1.result.json`.
   - **Default: `fal-ai/kling-video/v3/pro/image-to-video`**; a kit or brief may name another.
     `duration` is the brief's as a string, `generate_audio` false; the clip takes the still's
     shape. `--ref` is not used on this route (Known result cli-kling-ref: it fills `elements` with bare
     strings).
   - **Other route: `bytedance/seedance-2.0/image-to-video`**; a kit or brief may name another.
     `aspect_ratio` the crop, `resolution` 720p, `generate_audio` false. Kling covers 3 to 15 s and Seedance 4 to 15 s, so a 3 s brief has no other route:
      `fancam.mjs brief` prints that note, and a 3 s job that fails twice on Kling stops there. Otherwise controls rarely decide:
     take Seedance when the brief names it, when Kling's id is unknown or blocked (exit 8 or 6), or
     as the third attempt after Kling fails the review twice. Known results: on SL8
     it refused a realistic portrait still at 480p with HTTP 422, exit 7
     (measured-seedance20-face-480p), and returned 4.06 s for a 5 s ask twice (picks.md, T3 #15).
   - **Duration:** the brief's; default 5 s (ours; the source gives none). **Sound:** default off;
     a kit or brief may ask for the route's own sound (`"audio": true`, quoted again: Kling 42 cr/s).
   - Prompt A2 (row `motion`): the first frame is kept as it is, not reimagined; it states what
     stays fixed (face, hair, build, clothing, place in the crowd, venue, light), what may move and
     how far (the reaction row), the action as starting pose, then the main change, then a settled
     state with time left to read it, and the camera path with its final position (the format row).
     Handheld motion keeps only mild body inertia: the camera stays mostly steady with no shake,
     jolt or focus hunting, because a shake request warps faces and twitches heads (Kling AI
     motion guide; everygen ranking videos). No new text or logos appear.
   - Exit 2 with a 413 means the still is over the proxy's upload limit: pass a high-quality JPEG
     copy of it (`convert <approved still> -quality 92 work/<p>/still-upload.jpg`), not a new still.
   - The call waits in the queue. Exit 10 (timeout) is already charged: fetch it with
     `ai-gen result <request-id> -o artifacts/<p>/clips/ --format json` (the id is in
     `error.details.requestId`; `ready: false` means fetch again later) and never resubmit (HR6).
     Never poll with a waiting status call.
   - A failed or timed-out-and-lost attempt: record a row with `"status":"failed"` as in step 4 (item `clip`, node `clips`, the error in `notes`) before the next attempt, which names its `lever`.
   - Record the row (`"item":"clip","node":"clips"`, the clip's `declared`, `parents` the approved
     still) and run `node $Q declared --plan artifacts/<p>/manifest.json --file <the clip>`.
7. **Review the clip** [6]. Measure first: `node $Q streams <the clip> --audio no` (`yes` when sound
   was asked), and `node $Q motion <the clip> --control work/<p>/frozen-<n>.mp4` with a control made
   from the clip's first frame (`<seconds>` and `<fps>` are `video_duration_s` and `fps` from `streams`; `ffmpeg -v error -i <the clip> -frames:v 1 work/<p>/first-<n>.png`,
   then `ffmpeg -v error -loop 1 -i work/<p>/first-<n>.png -t <seconds> -r <fps> -pix_fmt yuv420p work/<p>/frozen-<n>.mp4`).
   Then look: two frames a second plus the last frame (a first, middle and last sample can miss a
   glitch mid-clip), on one sheet with the portrait and the still: `mkdir -p work/<p>/frames-<n>`,
   `ffmpeg -v error -i <the clip> -vf fps=2 work/<p>/frames-<n>/f%03d.png`,
   `ffmpeg -v error -sseof -0.1 -i <the clip> -frames:v 1 work/<p>/frames-<n>/last.png`,
   `node $Q sheet artifacts/<p>/source/<portrait> artifacts/<p>/keyframes/<still> work/<p>/frames-<n>/ --out artifacts/<p>/qc/clip-<n>-sheet.jpg`.
   - A `motion` fail on a small-range reaction (shocked, nervous, laughing, emotional) is read against the
      sheet: if the frames show movement, lower `--floor` once, record the new floor and the reading
      in the row's `notes`, never pass it silently (HR14).
   - Write what you see for the four quality-bar items across the frames, and for motion: natural
     for a spectator (cheering, gasping, standing, waving, phone held up), no scoreboard or text
     artifacts, no warped face or twitching head, and a readable settled last frame. Reject video
     that changes age, face, costume or silhouette (fal character-design): a drifted clip is
     rejected, not tolerated.
   - Accept only at 4/4 with natural motion. Otherwise (HR7, at most 3 clips): attempt 2 on the same
     route from the same still with a `motion_note` asking for a smaller, steadier movement
     (`lever: prompt`); attempt 3 on the other route (`lever: route`). After the cap mark the row
      `rejected` (same command as step 5), report with the sheet, and deliver the approved still, not a failed clip.
8. **A refused photo** [5]. ai-gen 2.2.0 has no content-filter exit code: a refusal is exit 7 with
   an upstream message about a person, a face or the content. It may be charged; never resend it
   unchanged. Known result: no Seedance route has a moderation field, so a refusal there has no
   remedy except changing the still or the route (fal video-generation). The ladder, inside the caps:
   - make the still again with the person further back: a wider shot from a little higher, the
     person smaller and turned partly away (`node $F params still … --reframe`, `lever: prompt`), and
     approve it at step 5 (a smaller face is harder to recognize, so the identity item still decides);
   - animate that still on the same route (`lever: reference`);
   - refused again: the other route (`lever: route`). When the still has no attempt left, skip the
     first rung.

   Refused on both routes: stop, name both refusals, and deliver the approved still.
   **A third image-to-video route for a refused real face is not offered on this machine yet** in
   this method (the assessment left it out because it changes the approach's models). Local
   alternative: a kit or brief may name one, such as Veo 3.1 Fast, where media-video-generation
   sends realistic faces; then that skill's endpoint block for the route applies, and prompt A2 has
   not been written or run for it.
9. **Exact score text or graphics** [1, 3]. Exact text, logos and graphics never pass through the
   edit or video model (HR10): the still and the clip carry no readable text. Only when the brief
   supplies exact scoreboard text (`overlay_text`) or rights-safe graphics (`overlay_graphics`,
   rights-safe in the customer's word), burn them last over the accepted clip in one encode with
   media-motion-graphics, as a screen-fixed score bug or lower third inside the platform safe area,
   writing `artifacts/<p>/final/<clip>-scorebug.mp4`. Record it as a local row (`tool`, `parents` the
   clip, `declared`, `files`), then run `streams`, `declared` and a look at the safe area on it again.
   With nothing supplied, skip this step and name no debt. A readable scoreboard inside the scene (a
   stadium screen showing the exact text) is **not offered on this machine yet**: the in-scene screen
   stays unreadable, and the burned graphic is the local alternative.
10. **Deliver** [6]. The delivered clip is the last file made: the burned one if step 9 ran, else the
    accepted clip copied into `artifacts/<p>/final/` and recorded as a local step
    (`node $S/manifest.mjs add --project <p> --json '{"item":"fan-cam","node":"final","tool":"cp clips/<clip> final/","parents":["clips/<clip>"],"declared":<the clip declared>,"files":["final/<clip>"]}'`).
    Copy the approved still to `final/` the same way (`"item":"fan-cam-still"`). A capped job
    delivers the approved still alone, or nothing when no still was approved, with PROGRESS.md
    `status: partial`. Then `node $Q artifact artifacts/<p>/final/` and write `artifacts/<p>/PROGRESS.md`
    (media-ai-gen gates-and-manifest.md). Hand back the clip and the approved still with one status
    line: the routes used, the stated defaults taken (HR12), the measured figures, what was judged
    by eye only (identity, live feel, crowd, text: your reading, not a measurement; taste goes to the
    owner, HR14), and any debt still owed. Close with the folder tree, the file count and
    the credits spent.

## House rules (HR-1.0)

Relies on: HR1 (still size, clip aspect, duration and sound declared by `fancam.mjs params`,
measured with media-qc), HR2, HR3 (each route gets only its own fields; `--strict-params`), HR4
(quality, format, safety checker, sync mode, sound and resolution written by the script; `check` compares every field it wrote), HR5 (both
stages quoted before the first paid call; each retry quoted again), HR6, HR7 (one retry with a named
lever, then the other route; at most 3 attempts per stage), HR8, HR9, HR10 (exact score text and
graphics are burned last, never generated), HR11 (every still edits the original portrait; the clip
animates only the approved still), HR12 (stated defaults; a missing portrait, sport or consent ends
a bot job; a spend over budget is a gate), HR13, HR14 (observations per item, never a written pass),
HR15, HR16 (a rewrite field, if a route shows one, is pinned off), HR17 (the person's consent is
recorded before anything is quoted; never imitate a named real person), HR18 (no invented results,
events or claims), HR19, HR20, HR21, HR22 — see media-ai-gen/references/house-rules.md.
