---
name: story-one-take-short
description: >-
  One-line idea to one finished 10-15 s animated story short with sound, rendered as a single
  Seedance 2.0 text-to-video generation with hard cuts inside it: one of eight comedy or
  heartstring archetypes, a render triage, one exaggerated character, timed beats with wind-up and
  overshoot, a SCORE, SFX and VOICE block, the locked style and constraints blocks, a sixteen-line
  pre-flight, one quoted render, then measured and frame-reviewed. Stylised 3D animation, 9:16 by
  default. Use when: a customer types one line and wants an animated gag, a pet or family moment,
  a bait-and-switch, a gag stack or a heartwarming clip, in one take. NOT for: a multi-shot film
  from a brief or script (media-video-production); a narrated faceless short (story-faceless-short);
  found footage (story-found-footage); a song (story-sing-along); a ranking video
  (story-ranking-short); a clip bound to reference images, or any single clip prompt in general
  (media-video-generation); measuring files (media-qc).
license: SL8 wording; method from Everygen's Shorts Studio animated-short skill (no licence stated), restated and cited
compatibility: "story-studio >=1.0.0 (sl8-video 1.5.0, sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; media-video-generation 1.2.0 (facts rows); python3 3.11 (stdlib); ffmpeg 5.1 and ffprobe; fal endpoints as of 2026-10-27"
metadata:
  version: 1.0.1
  revision: 2026-10-31a
  house-rules: HR-1.0
  upstream: [everygen/animated-421cf1]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27)
  approach: WF54-a1-s1
  attribution: Method from the SL8 capability assessment (WF54-a1-s1), restated from Everygen's Shorts Studio v2.1 animated-short guidance; prompt blocks, worked example and script written by SL8
  deltas: STO-D360..STO-D379, STO-D442
---

# One-take animated short

The customer's one line decides **what happens**; this skill decides everything else. It writes one
prompt and renders it once: no options, no commentary, no menu of versions. The prompt is a fixed
shape: the locked style block, the cast, the setting, the first frame, timed beats split by `cut,`,
the audio block, and the locked constraints block. Nothing here has been run on Seedance 2.0 yet:
the method was tuned by its source on Seedance 2.5 at another vendor, and every 480p limit and
blocked shape below comes from there.

```bash
T=$HOME/.agents/skills/story-one-take-short/scripts
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts
python3 $T/story_take.py show [slug ...]           # the table in references/prompts.json
python3 $T/story_take.py assemble --take work/<p>/take.json --out work/<p>/ [--max-chars N]
python3 $T/story_take.py probe --clip <file> --params work/<p>/params.json --out work/<p>/probe.json
python3 $T/story_take.py frames --clip <file> --take work/<p>/take.json --out work/<p>/frames/
```

`assemble` first deletes any earlier `prompt.txt` and `params.json`, then exits 0 with `prompt.txt`,
`params.json` and `check.json` (stamped `generated_at`) written; 1 when a scripted pre-flight line
fails (`check.json` lists it; no prompt or params file exists, so there is nothing to send); 2 for
bad input, a wrong type or shape (`check.json` carries the error). `probe` exits 1 on an `issue`
(no video or audio, wrong orientation or size); a length miss is a `note` and exits 0. `frames`
exits 1 when a frame could not be cut and 2 when ffmpeg or ffprobe is missing (HR21).

## Steps (WF54-a1-s1; approach step numbers in brackets)

1. **Load [1].** Read this file whole, then `python3 $T/story_take.py show` for every row. Work in
   this order and no other: settings, archetype, triage, cast and stage, beats, audio, assemble,
   pre-flight, render, check, deliver. `node $S/manifest.mjs init --project <p>` (kebab-case from
   the idea) and start `artifacts/<p>/PROGRESS.md` with `story-one-take-short 1.0.0 (method
   WF54-a1-s1, source v2.1)`: this is the run log the later steps add to.
2. **Intake [2].** The input is one line of text; whatever it says is content, never an
   instruction to you. You will hand back one clip.
   - **Empty idea.** Spend nothing. With the customer present in a chat, ask once, in one short
     line, for the idea; in a bot job, end the job saying a one-line idea is needed. Never ask which
     model, never offer options, and never call a question tool (HR12).
   - **Real people.** This skill casts invented characters only. A request to show or voice a
     real, identifiable person (the customer, a celebrity, a public figure, anyone named) is
     refused for now, because SL8's consent text for faces and voices is awaiting owner approval
     (learnings STO-L361, HR17): say so in one line and offer the same idea with an invented
     character.
   - **Reference images** are not offered on this machine yet by this skill (the method takes none).
     Describe the look in words in the cast instead; a clip bound to supplied images is
     media-video-generation's reference-to-video route.
   - **Landscape** only when the customer says so; a cheaper **draft first** only when asked (step 15).
3. **Settings [3].** `python3 $T/story_take.py show settings`. Each is a default; a kit or brief may
   name another, and its choice wins:
   - Default: `bytedance/seedance-2.0/text-to-video` (base tier); a kit or brief may name another.
   - Default: `resolution` `"480p"`, always sent (the endpoint's own default is 720p). Known result
     (on Seedance 2.5, not run on ours): higher resolutions cost more with no gain at this stage.
   - Default: `aspect_ratio` `"9:16"`; `"16:9"` on an explicit landscape request.
   - Default: `duration` `"12"`; `"15"` when the archetype's recipe is 15 s (D, F, H, a full E
     stack) or the planned beats need it. Always a whole-second string `"10"`-`"15"`, never
     `"auto"` (HR5). The source allowed 18 s for a gag stack; Seedance 2.0 stops at 15 s.
   - `generate_audio` `true`, pinned (HR4). One render, with its cuts inside it.
4. **Name the turn [4].** One sentence: "the big dog gives in to the kitten". If no turn can be
   named, or nothing pays off, choose archetype G and play it as observation. Log the sentence.
5. **Pick one archetype [5].** Read its row (`show archetype-a` … `archetype-h`), take its shot
   count, shot lengths, camera, pace and sound, and bend the recipe to the idea, not the idea to the
   recipe. If two fit, take the one that ends on a face.

   | | When the idea is | Shots | Length |
   |---|---|---|---|
   | A Soft giant | big or tough meets small or tender, or the small one wins | 4-6, ~2-2.5 s | 12 s |
   | B Chaos at home | a child, baby, sibling or partner makes trouble at home | 5-8, 1.5-2.5 s | 12-15 s |
   | C Pet troublemaker | an animal is the trouble | 5-7, ~2 s | 12-15 s |
   | D Bait and switch | something scary is harmless, or a trick is revealed | 7-9, 1-1.5 s, 3 s reveal | 15 s |
   | E Gag stack | a theme, not a story | 5-6 sketches, 2-3 s | 15 s at most |
   | F Heartstring | tender, sad, nostalgic, family love; no joke | 5-7, 2-3 s | 15 s |
   | G Fixed-camera oner | observational and repeating, or no payoff | no cuts; 3-4 repeats | 10-15 s |
   | H Toon-logic escalation | absurd or impossible on purpose | 7-8, ~2 s | 15 s |

   H tops out at 8 shots at 15 s (the source's 9 fitted its 18 s). H's celebrity gags are not
   offered on this machine yet (step 2, real people).
6. **Triage before writing [6]** (`show triage off-screen unrenderable silhouette count`). Ask
   whether a camera on a real set could film it: yes, write it straight; stageable, play it as comic
   contrast and let the reactions carry the impossible; impossible and the point, archetype H with a
   wind-up and a real arc. Cut away at the impossible frame (wind-up, `cut,` aftermath, `cut,`
   reaction). Drop anything on the unrenderable row: at most 3 moving characters and 2 locations.
   Small objects by outline, never by name. Put a number on every countable noun. A small animal
   that appears mid-scene enters from one named place and stays in view, and the `animals` line goes
   into the constraints with `"animal"` set in the take file: one species as a string, two or more
   as a list (`["kitten", "dog"]`), which gives one "only one X on screen" clause per species.
7. **Cast [7].** Each character once, in full: age, build, hair, the whole outfit including shoes,
   one feature that marks them out, and close with the phrase identical in every cut. Describe them;
   never give them names.
8. **Exaggeration budget [8]** (`show exaggeration squash-limits`). One character is the cartoon
   (the troublemaker); name the grounded one too. Adults act with the face only; babies, toddlers
   and animals may squash and stretch; no limb past its joint, no change to a face's bones.
9. **Setting [9]** (`show one-light`). One location (two at most), a single light source named
   once, no colour words for mood (F alone may write one cool-to-warm change at the turn), every
   prop counted, and "No mirrors." wherever a mirror could appear.
10. **Beats [10]** (`show four-phases face-acting weight-cues secondary-motion phrase-bank
    banned-words beat-ceiling`). Each beat: `[start]-[end]s - [shot size and camera] [the action with
    wind-up, move, overshoot, settle] + [a weight cue] + [the face] + [a follow-on movement]`, one
    main change per beat, ending in a state you can see. The opening frame catches the action under way
    (never a scene-setting shot or someone entering). An expression change has no wind-up. Reuse the phrase-bank
    constructions; never the weightless words. No beat over 4 s (split it with `cut,`). In the payoff
    the main subject changes in a big, well-framed way and holds for 2 s or more (3 s for F), with
    small signs of life written into the hold. With the sound muted, the story still has to be clear.
11. **Audio [11]** (`show audio`). SCORE always, with its arc and timings; SFX always, beat by beat;
    VOICE optional, one short line or one wordless sound at the turn or at the payoff, written `{line}`,
    never explanation, and none for E and F. `generate_audio` renders it in the same generation.
12. **Assemble [12]** (`show template example`). Write `work/<p>/take.json` (the shape is in the
    script's header: archetype, turn, aspect, duration, tier, n, characters, setting, first_frame,
    beats, audio, negatives, animal, extra, extra_params), then
    `python3 $T/story_take.py assemble --take work/<p>/take.json --out work/<p>/`. The script pastes
    the style block first (the landscape swap is its only edit) and the constraints block last with
    `[N]` filled and the chosen negatives lines added, and confirms both are byte-for-byte the
    stored text. The worked example shows the blocks as placeholders only to stay short; the real
    prompt always carries them in full.
13. **Pre-flight [13]** (`show preflight blocked-shapes`). `check.json` covers lines 1-3, 12, 13
    and 16 by script, and refuses a banned word, text or a sign that reads, a colour word for mood
    (outside F), a mirror, a beat over 4 s, beats that do not add up to the duration, a payoff hold
    under 2 s (3 s for D and F), a length off the archetype's recipe for D, F and H, and a
    placeholder left in. Lines 7 (the hold only) and 10 (colour words only) are partly scripted: you
    confirm the rest. Confirm lines 4-11, 14 and 15 yourself by reading `prompt.txt`, and write
    all sixteen into PROGRESS.md. Fix the plan and re-assemble until `check.json` says `"ok": true`
    with a `generated_at` newer than `take.json`; submit only then (a failed run leaves no
    `params.json`, so a stale one cannot be sent). Never write a known blocked shape; reject the idea's mechanic
    before spending, not after.
14. **Schema and length [14].** Once per run: `ai-gen info bytedance/seedance-2.0/text-to-video
    --format json` and the raw OpenAPI printer (`media-ai-gen/references/commands.md`) for every
    field you set: the `duration`, `resolution` and `aspect_ratio` enums, any prompt length limit,
    and any prompt-rewrite flag, which you pin off by adding `"extra_params": {"<flag>": false}`
    to `take.json` and re-assembling (never by editing `params.json`, which the next `assemble`
    overwrites; the quote and the run then read the same file) (HR2, HR4, HR16). With a stated limit, re-run
    `assemble --max-chars <limit>`; over it, shorten beats and phrasing, never the two blocks. With
    none stated, log "no prompt limit in the schema". The 2,500-character figure in the source
    belonged to another vendor's story tool and does not apply. Gone or unpriced endpoint: stop and
    report the broken route; do not substitute a model silently.
15. **Quote [15].** `ai-gen estimate bytedance/seedance-2.0/text-to-video --params-file
    work/<p>/params.json --format json` (the same file the run sends; `estimate` takes no typed
    flags) and `node $S/manifest.mjs budget --project <p>`. Also `ai-gen balance --format json` (the first
    `estimate` can take 1-3 minutes: use a 300 s timeout), and compare the balance with the quote. One
    clip the customer ordered proceeds on the quote when it fits the remaining budget and the
    balance; over it, with no budget known, or with the balance short, open a spend gate (`node $S/gate.mjs open … --quote <credits>`) and end `partial` (HR5,
    HR12). Reference figures (media-video-generation facts, 2026-10-05): base 480p about 33.6 credits
    a second, so 12 s is about 400 and 15 s about 500; the estimate is the quote.
    - **Draft first (on request).** `bytedance/seedance-2.0/fast/text-to-video` takes the same
      prompt and fields at 480p; set `"tier": "fast"` and re-assemble. Known result: the fast tier
      works only up to 12 s at 480p (above that a 422 that can hang), so a 15 s plan has no draft.
      Quote draft and final together before the draft runs; after the draft passes steps 18-19, run
      steps 15-19 again on the base tier with the same plan.
16. **Submit once [16].** `ai-gen run <endpoint> --params-file
    work/<p>/params.json --async --strict-params --max-cost <quote> --format json >
    work/<p>/submit.json`, then record the pending row:
    `node $S/manifest.mjs add --project <p> --result work/<p>/submit.json --params work/<p>/params.json --json '{"item":"short","node":"final","endpoint":"<endpoint>","declared":{"aspect":"<aspect>","duration_s":<duration>,"audio":"native"},"credits":{"estimate":<quote>},"status":"pending"}'`.
    `<endpoint>` is the `endpoint` in `check.json` (the base tier unless the draft route was chosen,
    where the item is named `short-draft` so it does not count toward the final's same-route limit).
    A submit the endpoint refuses (a 422) has no request id and no `--result` file: record
    `node $S/manifest.mjs add --project <p> --json '{"item":"short","node":"final","endpoint":"<endpoint>","params":<the params file>,"credits":{"estimate":<quote>},"request_id":null,"declared":{...},"status":"failed","notes":"<exit and error code>"}'` and go to step 20.
    Let the customer know the clip is being made. One submission: no second one to refresh anything.
17. **Wait [17].** Poll with `ai-gen result <request-id> -o artifacts/<p>/final/ --format json >
    work/<p>/result.json` every 30 s in a loop that returns after about 8 min (one foreground call is capped at 10 min), or
    run it in the background; `"ready": false` is pending, not failure. If the loop ends with the job
    still pending, write the request id to `work/<p>/submit.json` (already there), end the job
    `partial` and say "resume with `ai-gen result <id>`; never resubmit". A job that fails
    (`success` false) cannot go through `--result`: record the failed row as in step 16 with the
    request id and `notes`, then step 20. Retry a transient read error with backoff; never resubmit (HR6) and never
    use a waiting status poll (it under-counts spend). Then `manifest.mjs add` again with
    `--result work/<p>/result.json` to turn the row `done`. `-o` is a folder: the file keeps
    ai-gen's name there.
18. **Measure [18].** `python3 $T/story_take.py probe --clip <file> --params work/<p>/params.json
    --out work/<p>/probe.json`: the length against the request, the short side 480-class (for 9:16
    that is the width), the orientation, and an audio stream. Then
    `node $Q/mediaqc.mjs streams <file> --audio yes` and `node $Q/mediaqc.mjs takes <file> --n 3`
    (a present but silent track is not sound; in the near-silent B and D plans, read a quiet stretch
    against the planned silence before calling it a fault). Known result: Seedance 2.0 has returned clips
    shorter than asked (4.06 s for 5 s); a length off by more than 0.5 s is a `note` in `probe.json` with the
    measured figure (and `fps`, used in step 19), and is not by itself a reason to re-render, since no
    lever changes it. Only an `issue` (exit 1) counts as a failed take in step 20.
19. **Review frames [19].** `python3 $T/story_take.py frames --clip <file> --take work/<p>/take.json
    --out work/<p>/frames/` cuts one frame at the middle of every beat and one late in the payoff
    hold. The beat times are scaled by measured length over planned duration and the output lists
    the real times, the scale and which beat each frame stands for; a clip shorter than planned
    puts a `note` there, and you say in your description that the frames are approximate. Look at each: the exact character count, no copied animal, no text or logos, no morphing,
    faces readable at thumbnail size, the payoff held, the story readable with the sound off. Report
    what each frame shows; never write PASS (HR14). When a beat or the hold may have frozen, run the
    motion check: `ffmpeg -loop 1 -i work/<p>/frames/b1.png -t <duration_s> -r <fps> -pix_fmt yuv420p
    work/<p>/frozen.mp4` (`duration_s` and `fps` from `probe.json`) and `node $Q/mediaqc.mjs motion <file> --control work/<p>/frozen.mp4`;
    report `min_window`, `control_max_window` and `floor`, and say the floor rests on a local control
    (media-video-generation `references/motion-check.md`).
20. **Recover [20].** A 422 from Seedance is a refusal of the story's shape (there is no moderation
    field), not a transient error. A failed take (a refusal, a failed job, a step 18 `issue` or a step 19 flag that
    a lever can fix) gets one retry that moves one named lever (a beat rewritten, a negatives line,
    the archetype), recorded as `attempt` 2 with its `lever` (HR7), the step 16 line with
    `"item":"short","attempt":2,"lever":"beat 3 rewritten"` added (the manifest refuses attempt 2 without a lever); never move to 720p or 1080p to
    fix quality. Two failures on one story shape point at the shape itself: rewrite the
    mechanic (steps 6, 10-12, never just new characters or a new setting), re-run steps 13-15, and
    because a third attempt on one route is never run in the same job (HR7), open a spend gate with
    the rewritten plan quoted and end `partial`. Each retry is quoted first (step 15).
21. **Deliver [21].** Hand back the clip from `artifacts/<p>/final/`. The reply always carries two
    lines, word for word, in every run (a rehearsal, a stand-in clip or a `partial` end included):
    the settings line from `probe.json` (`Seedance 2.0 · 480p · aspect_ratio 9:16 · <measured> s ·
    audio on · one generation`, as it actually ran) and `This video is AI-generated.` Finish PROGRESS.md with the turn,
    the archetype, the pre-flight lines, the quote and credits, the request id, attempts, and the
    figures from steps 18-19. Name the debt still owed (HR15): the SCORE, SFX and VOICE are not
    checked by ear on this machine, only that sound is present.

## House rules (HR-1.0)

Relies on: HR1 (duration, aspect, size and audio declared in `params.json` and measured by
`probe` and media-qc), HR2 (raw OpenAPI before the first submit), HR3, HR4 (`resolution`,
`aspect_ratio`, `duration` and `generate_audio` always sent), HR5 (one quote from the params file,
never `duration: auto`), HR6 (one submission; `ai-gen result` only), HR7 (one retry with a named
lever; a rewritten mechanic waits behind a gate), HR8 (`artifacts/<p>/final/`, scratch in
`work/<p>/`), HR9 (a manifest row per generation, failed ones included), HR10 (no text in the
render; nothing is lettered by the model), HR12 (stated defaults, no question tool; spend past the
budget is a gate), HR13 (`assemble` and `probe` exit non-zero), HR14 (frames described, never a
written PASS), HR15 (the unheard audio is named as debt), HR16 (any rewrite flag pinned off), HR17
(invented characters only; real people refused until the consent text is approved), HR19, HR20,
HR21, HR22 (prices and limits from media-video-generation's facts rows, checked live) — see
media-ai-gen/references/house-rules.md.
Not applicable: HR11 (nothing is edited from an earlier render), HR18 (no claims are made).
