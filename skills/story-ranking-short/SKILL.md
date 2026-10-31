---
name: story-ranking-short
description: >-
  Ranking listicle short: a vertical 9:16 countdown of about 23.5 s (6 items, or 5 for a top 5; 3 to 9 items) from
  a text brief. An approved script with a quote, one realistic phone-footage still per item (Nano
  Banana Pro), one Seedance image-to-video clip per still with its own pop, filmer reaction and
  bass hit, then a hard-cut ffmpeg stitch with the hook title and a numbered list that fills in one
  line per item. Three approvals (script, first still, all stills) come before the paid steps.
  Use when: a ranking, top 5, ranked list or countdown short is asked for (no top 10 yet). NOT for: a
  narrated faceless short (story-faceless-short); a single-take short (story-one-take-short); found-footage stories (story-found-footage); a
  multi-shot production with voiceover and music (media-video-production); captions on a finished
  video (edit-captions); music or voice (media-audio-generation); a single still
  (media-image-generation); running ai-gen in general (media-ai-gen); file checks (media-qc).
license: SL8 wording and SL8-authored scripts; method from Everygen's ranking-videos workflow (no licence stated), restated and cited; three fal agent-skill phrases used with attribution
compatibility: "story-studio 1.0.0 (E2-narrow chain: video-studio, image-studio, base-studio); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; ffmpeg 5.1; python3 3.11 with Pillow and numpy; fonts pack (Anton, Inter) and fonts-noto; edit-captions and media-audio-generation on the same machine; fal endpoints as of 2026-10-27"
metadata:
  version: 1.0.1
  revision: 2026-10-31a
  house-rules: HR-1.0
  upstream: [everygen/rankingvideos-1aa4ce, fal/falvideogeneration-fe0127, fal/falprompting-c6c3f4, fal/cinematography-2503ac, fal/falmotiongraphics-dc3541, fal/charactersheet-a2ae87, fal/characterdesign-c8e4b8, fal/falvideoproduction-09f33d]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27; Everygen capture 2026-10-26)
  approach: WF49-a1
  attribution: Method from the SL8 capability assessment (WF49-a1), restated in SL8 wording from Everygen's ranking-videos SOP; points and three continuity phrases from fal agent skills (used with attribution); companion prompts, cast, pacing and scripts written by SL8
  deltas: STO-D380..STO-D399, STO-D443
---

# Ranking short

A text brief in, one finished ranking short out. The vendor method's eight companion prompt files
were never served, so the look, realism, motion, cast and pacing text in `references/` is SL8's own
and has not been run on fal-ai/nano-banana-pro or bytedance/seedance-2.0 yet: treat the first runs
of each tone as a test. Model, count, length, look and route choices below are defaults; a kit or
brief may name others.

```bash
R=$HOME/.agents/skills/story-ranking-short/scripts/ranking.mjs
M=$HOME/.agents/skills/story-ranking-short/scripts/ranking_media.py
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
node $R refs                       # every reference file exists (step 1)
node $R windows --items 6          # windows and render lengths
node $R check-script work/<p>/script.json
node $R ready master|stills|clips --script work/<p>/script.json   # exit 1 unless the approvals that paid step needs are recorded
node $R params still|edit|clip --script work/<p>/script.json --rank <r> [--model <id>] [--fix <row>,…] [--drift] [--no-boom] --out <file>
python3 $M overlay --script work/<p>/script.json --out-dir work/<p>/overlay
python3 $M cues --clip <clip.mp4> --impact <s>
```

`ranking.mjs` and `ranking_media.py` exit 0 written or ok, 1 a listed problem, 2 usage or a missing
tool or font. Load media-ai-gen (ai-gen, manifest, gates) and media-qc before the first paid step.

## Two text routes

- **Overlay (default).** The stills and clips carry no lettering; the title and the list are drawn
  by `ranking_media.py overlay` and burned in the stitch's one encode (HR10). The list still builds
  up one line per item and never loses a line, so #1 cannot leak.
- **Painted (only when a kit or brief asks for text painted into the picture).** The method as the
  vendor wrote it: the master carries the title and list, and each further still is an edit of the
  previous approved still that adds one line. Exact text then passes through a generative model,
  so record the brief's words first: `node $S/manifest.mjs waive --project <p> --rule HR10 --instruction "<their words>"` (HR20).
  Both routes share every other step.

## Steps (approach steps in brackets)

1. **Start** [1]. `node $R refs` must exit 0: a missing reference file stops the run and is
   reported, never skipped. Open only the reference file a step names. On an existing project run
   `node $S/gate.mjs status --project <p>` first and resume at its `resume_at`. Refuse, in one line,
   a real, named or recognisable person's face or voice, or a supplied photo, clip or recording of
   one: SL8's consent text is not approved yet, so this skill generates generic people only (HR17).
   Start the project once: `node $S/manifest.mjs init --project <p>`.
2. **Intake** [2] (references/ideas.md). A bot job takes the brief's choices and fills every gap
   with the defaults (6 items, 5 for a top 5, 3 to 9 allowed; about 23.5 s; comedic fails; classic look; overlay
   route; voiceover off), naming each default it used. With the customer present and the topic,
   length, style or look missing, send the one intake message in ideas.md (at most four numbered
   questions, one round, plain chat, no question tool, HR12) and generate nothing that turn.
3. **Script and quote** [3] (style-bible.md, scripts.md). Write `work/<p>/script.json`: the hook
   title, each list line with its emoji, and per item the scene, action, payoff, impact,
   `impact_s` (seconds from the clip start, at most the window minus 0.5), follow-up and filmer;
   `window` and `render` from `node $R windows` (7 to 9 items get a longer total so no window is
   under 3 s; **a top 10 is not offered on this machine yet**: offer 9, or two shorts of 5). Run the five escalation checks and fix
   a weak #1 here. `node $R check-script` must exit 0. Then write every params file now
   (`node $R params …` for the master, each still or edit, each clip) and quote each one:
   `ai-gen estimate <model> --params-file <file> --format json`. Quote in credits (about 250 = $1):
   all stills and clips, plus one planned retry each (HR5). Known result (facts `price-seedance-audio`,
   2026-10-05): Seedance audio costs nothing extra, though the vendor's guidance said 50-100%; audio
   dropped now can only come back by re-rendering every clip. Write `artifacts/<p>/script/script.md`
   (a table of the script, the check notes and the quote) beside a copy of the JSON. No voiceover,
   captions, music bed, intro or end card, recap or call to action.
4. **Approval 1: the script** [3]. Nothing paid happens before it. Interactive: show the script and
   quote and wait for an explicit OK; add `{"stop":"script","words":"<their words>","by":"customer"}`
   to `approvals` in script.json. Bot job:
   `node $S/gate.mjs open --project <p> --slug approve-script --question "Make the ranking from this script for <total> credits?" --options '[{"id":"a","label":"Make it","credits":<total>},{"id":"b","label":"Stop with the script","credits":0}]' --quote <total> --resume-at "step 5: master still"`
   and end `partial`; the next job runs `gate.mjs status` first, records the owner's answer from the
   gate as an `approvals` entry (`"by":"gate 01"`) and resumes. **A brief that already carries the
   OK** (it approves this script, or says to go straight through, and states a budget that covers the
   quote) is recorded by the run as `{"stop":"all","words":"<the brief's words>","by":"brief"}` before
   anything is spent: that one entry stands for the three approval stops, and no gate is opened or
   waived by the job (HR12: a job never waives its own gate; an owner who waives a gate does it
   outside the job with `gate.mjs waive --gate NN`). The checks still run. If the quote is over the
   remaining budget (`node $S/manifest.mjs budget --project <p>`), a gate always opens and the entry
   does not cover it. Before the first paid call of steps 5, 6 and 7 run
   `node $S/gate.mjs status --project <p>` and `node $R ready master|stills|clips --script work/<p>/script.json`
   (exit 1 means stop, and record or open the missing approval).
5. **Master still** [4, 5] (look.md, reference-frames.md A). The first still in display order (the
   highest rank). **Default: `fal-ai/nano-banana-pro`**, `aspect_ratio` 9:16, `resolution` 2K, one
   image; a kit or brief may name another.
   `ai-gen image -m fal-ai/nano-banana-pro --params-file work/<p>/still_01.params.json -o artifacts/<p>/keyframes/ --queue --strict-params --max-cost <1.5 x this call's estimate> --format json > work/<p>/still_01.result.json`,
   then `node $S/manifest.mjs add --project <p> --result work/<p>/still_01.result.json --params work/<p>/still_01.params.json --json '{"item":"still-01","node":"keyframes","declared":{"aspect":"9:16"},"credits":{"estimate":<quote>}}'`
   (HR9) and `node $Q declared --plan artifacts/<p>/manifest.json --file <still>` (HR1). View it and
   write what you see for each point of reference-frames.md C. A failed check allows one retry that
   moves a named lever, recorded as `lever` (a `--fix <row>` restatement, such as `full-frame` for
   blurred edges or `realism` for a polished look); a second failure moves to the **default
   fallback `openai/gpt-image-2`** (`--model openai/gpt-image-2`; it renders quoted text cleanly);
   a failure there opens a gate (HR7). Text size, position or an emoji wrong on the painted route:
   a new master, never a patch. Then **Approval 2**: show the master (interactive OK, or in a bot job
   `node $S/gate.mjs open --project <p> --slug approve-master --question "Use this master still and make the other stills for <stills total> credits?" --options '[{"id":"a","label":"Use it","credits":<stills total>},{"id":"b","label":"Stop with the master","credits":0}]' --quote <stills total> --resume-at "step 6: other stills"`
   and end `partial`); record `{"stop":"master",…}` in `approvals`. Lock that file in script.json `master` and say the `master-lock` line of prompts.json.
6. **Other stills** [6] (reference-frames.md B, C). In display order. Overlay route: one
   `params still` call per item, the same command as step 5 (stills are independent; one at a time
   keeps the spend visible). Painted route: one `params edit` per item, ONE AT A TIME, each with
   `--ref <previous approved still>` (`ai-gen image -m fal-ai/nano-banana-pro/edit --ref <previous> [--ref <master>] --params-file … -o artifacts/<p>/keyframes/ --queue --strict-params --max-cost <1.5 x this call's estimate> --format json`);
   run the line check before the next edit; a title-style change takes the drift guard (`--drift`,
   previous and master as references). The edit fallback is `openai/gpt-image-2/edit` (with
   `--model`; `input_fidelity` is not set, because fal's GPT Image edit has no such field, facts
   `schema-gpt2-edit-fields`). Same one-retry rule and manifest rows as step 5. On the overlay route
   run `python3 $M overlay --script work/<p>/script.json --out-dir work/<p>/overlay` and view each
   preview (reference-frames.md C). Then **Approval 3**: all stills in display order in one message
   or one sheet (`node $Q sheet artifacts/<p>/keyframes --out artifacts/<p>/qc/stills.jpg`); in a bot job
   `node $S/gate.mjs open --project <p> --slug approve-stills --question "Make the <N> clips from these stills for <clips total> credits?" --options '[{"id":"a","label":"Make the clips","credits":<clips total>},{"id":"b","label":"Stop with the stills","credits":0}]' --quote <clips total> --resume-at "step 7: clips"`
   and end `partial`; record `{"stop":"stills",…}` in `approvals`.
7. **Clips** [7] (pacing.md, audio.md). One clip per item from its approved still.
   **Default: `bytedance/seedance-2.0/image-to-video`**, `resolution` 720p, `aspect_ratio` 9:16,
   `duration` the item's `render` (a bare-integer string), `generate_audio` true, all pinned in the
   params file (HR4); a kit or brief may name another. For a cheap draft a kit may name
   `bytedance/seedance-2.0/fast/image-to-video` (same fields). Sum the clip quotes against the budget
   first (async submits each see the full budget), then submit each:
   `ai-gen video -m bytedance/seedance-2.0/image-to-video --image artifacts/<p>/keyframes/<still> --params-file work/<p>/clip_KK.params.json -o artifacts/<p>/clips/ --async --strict-params --max-cost <1.5 x this call's estimate> --format json > work/<p>/clip_KK.submit.json`
   and record the pending row at once:
   `node $S/manifest.mjs add --project <p> --json '{"item":"clip-KK","node":"clips","status":"pending","request_id":"<id from the submit JSON>","declared":{"aspect":"9:16","audio":true,"duration_s":<render>},"credits":{"estimate":<this clip's estimate>}}' --params work/<p>/clip_KK.params.json`.
   Keep the turn active: fetch each with
   `ai-gen result <request-id> -o artifacts/<p>/clips/ --format json > work/<p>/clip_KK.result.json`,
   waiting 5 s between fetches in bounded loops of about 50 s, until every job is done; never
   resubmit a job that exists (HR6), never `status --wait`. Update each row (same request id)
   with `node $S/manifest.mjs add --project <p> --result work/<p>/clip_KK.result.json --params work/<p>/clip_KK.params.json --json '{"item":"clip-KK","node":"clips","declared":{"aspect":"9:16","audio":true,"duration_s":<render>}}'`,
   then `node $Q declared --plan artifacts/<p>/manifest.json --file <clip>` (HR1).
   Then run the clip checks in pacing.md on every clip.
8. **Clip repairs** [8]. One retry per clip, alone, moving one lever (`--fix` rows): slow motion
   `speed-lead`; shake or jolt `steady`; floaty, morphing, doubled or vanishing things
   `motion-realism`; payoff missing (rewrite the payoff in script.json as a visible result) or cut
   off `payoff-timing`; the same voice as another clip (give it a new filmer from audio.md);
   boom missing or off `boom` (or `--no-boom`); text wobble `text-lock-painted`; shorter than its
   window `length` (the same params sent again, no `--fix` row). A second failure is
   never a third call (HR7): keep the better take, log the failure on its row, and name it in the
   hand-off. A refusal that the clip "may contain a real person" (exit 7 on a realistic face) has
   one retry with the person shown from behind, at a distance or as hands only. **People fallback**:
   a route for realistic people is **not offered on this machine yet**; after that retry, open a
   gate naming the item and stop.
9. **Stitch** [9]. First `node $Q streams <clip> --audio yes` on every clip: a clip with no sound or
   not 9:16 stops the stitch and is named (repair it in step 8, or keep the better take and name it
   in the hand-off); the encode below would fail or stretch it without saying which. Then, per
   clip, in display order, one encode (KK = display position, 01 first):
   overlay route
   `ffmpeg -v error -y -i artifacts/<p>/clips/<clip> -i work/<p>/overlay/overlay_KK.png -t <window> -filter_complex "[0:v]scale=720:1280:flags=lanczos,setsar=1,fps=30[v];[v][1:v]overlay=0:0[o]" -map "[o]" -map 0:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -ar 48000 -ac 2 work/<p>/norm/norm_KK.mp4`;
   painted route the same without the overlay input
   (`-vf "scale=720:1280:flags=lanczos,setsar=1,fps=30"`). A clip shorter than its window was
   redone once in step 8; only a redo that is still short shortens the window (pacing.md; if
   `impact_s` is then past the new window minus 0.5, name it as debt); never pad. Then
   `node $R list --script work/<p>/script.json --dir work/<p>/norm --out work/<p>/list.txt`,
   `ffmpeg -v error -y -f concat -safe 0 -i work/<p>/list.txt -c copy -movflags +faststart artifacts/<p>/final/ranking.mp4`
   and `node $R verify --script work/<p>/script.json --file artifacts/<p>/final/ranking.mp4 --dir work/<p>/norm`
   (total within 0.1 s of the windows, windows not all equal, sound in every segment, 9:16). Then
   `node $Q streams artifacts/<p>/final/ranking.mp4 --audio yes`, frames at each cut viewed (the next
   item and the right list state), and a stitch row (`"tool":"ffmpeg concat"`, parents the clips).
   Hard cuts only: no added audio track, fades, captions or music. Never send the customer to an
   outside editor.
10. **Hand-off** [10]. Only after step 9's checks: deliver `artifacts/<p>/final/ranking.mp4` with
    one short line: one thing they could change (a line, an item, the tone) and, if they will post
    it, that a trending sound at low volume suits the format. Name any debt (a missed boom, a
    shortened window, emoji left out, a listening check owed, HR15). No position words such as
    "above" or "below". Write PROGRESS.md (media-ai-gen) and nothing more.
11. **Final cut, on request only** [11]. Nothing here runs unless the customer asks for an edit in
    their own words; run only what that edit needs.
    - **Trims**: remove the asked ranges only, with
      `ffmpeg -i <in> -vf "select='not(between(t,<a>,<b>))',setpts=N/FRAME_RATE/TB" -af "aselect='not(between(t,<a>,<b>))',asetpts=N/SR/TB" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac <out>`.
      Never cut a clip's opening pop, its bass hit or the #1 payoff, never a clip to nothing, never
      crop or reframe.
    - **Captions**: load edit-captions and use its bold look at its fixed bottom geometry. The
      vendor's caption preset (7 characters a caption, 85% down the frame) is **not offered on this
      machine yet**; captions never go above the middle.
    - **Music**: a bed from media-audio-generation, mixed at about 15%
      (`-filter_complex "[1:a]volume=0.15[b];[0:a][b]amix=inputs=2:duration=first[a]"`), so each
      clip's pop, hit and reactions carry. No added sound effects.
    - Compare the new length with the windows' sum and say in one sentence what changed.
    - **Voiceover** is **not offered on this machine yet**: the short is delivered without one.

## House rules (HR-1.0)

Relies on: HR1 (aspect and audio declared per call, the stitch measured by `ranking.mjs verify` and
media-qc), HR2, HR3, HR4 (aspect, resolution, duration and `generate_audio` pinned by
`ranking.mjs params`), HR5 (every call quoted with the script, one retry each planned), HR6 (fetch
by request id, never resubmit), HR7 (one retry per still or clip with a named lever, then the
fallback route or a gate; stills are never redone without limit), HR8, HR9, HR10 (the
title and list are composited in the stitch's one encode by default), HR11 (overlay-route stills
come from the script; the painted ladder is an iterative chain only on the brief's request), HR12
(defaults in a bot job, gate files for the three approvals and any spend past the budget, no
question tool), HR13 (`ranking.mjs`, `ranking_media.py`, media-qc), HR14 (stills and frames are
described, listening is a review item), HR15, HR16 (no prompt rewriter is set on these routes; if
`ai-gen info` shows one, pin it off), HR17 (generic people only; real people refused until SL8's
consent text is approved), HR18 (a ranking is opinion; no invented statistics, prices or claims),
HR19, HR20 (the painted route needs the brief's HR10 waiver), HR21, HR22 (facts rows cited by id)
— see media-ai-gen/references/house-rules.md.
