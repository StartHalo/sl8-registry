---
name: story-sing-along
description: >-
  Kids' nursery-rhyme sing-along video from a text brief, song first: original lyrics written by a
  rhyme formula to an exact line count, one timeline with one row per sung line, one sung song that
  becomes the clock, a character sheet and one mid-action start frame per clip, 9:16 multi-shot 3D
  cartoon clips cut on the sung lines, a trim-from-end stitch with the song as the only sound, and
  karaoke lyric captions built from the known words. Use when: a customer orders a nursery rhyme,
  toddler song, counting, countdown, lullaby, action or dance song video, a new song echoing a
  classic, or a change to a sing-along this skill delivered (caption words or style, a wrong shot, a
  range cut, a title, 16:9 or 1:1). NOT for: a narrated story or musical with a storyteller (not
  offered); a song or music bed alone (media-audio-generation); speech captions on another video
  (edit-captions); a general shot-planned film (media-video-production); a one-take short from an
  idea (story-one-take-short); file checks (media-qc).
license: SL8 wording and an SL8-authored script; method from the Everygen nursery-rhymes pack (no licence stated), restated and cited; points from fal and Creative Claw (Apache-2.0), restated
compatibility: "story-studio >=1.0.0 (sl8-video 1.5.0, sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; edit-captions (same Video bundle); ffmpeg 5.1 (libass, libx264, aac); python3 3.11; fonts 1.1.0 (Comic Neue) and fonts-noto; fal endpoints as of 2026-10-27"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [everygen/nurseryrhymes-fcc8ba, fal/falaudiogeneration-ba1a03, creative-claw/cc-model-contracts-image-audio, fal/charactersheet-a2ae87, everygen/animated-421cf1, fal/videocompositing-6a3f7a, creative-claw/creativeclawcreatereels-b6e06c]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27; Everygen guidance captured 2026-10-26)
  approach: WF46-a1-s1
  attribution: Method from the SL8 capability assessment (WF46-a1-s1), restated in SL8 wording from Everygen's nursery-rhymes guidance, with points from fal's audio, character-sheet and compositing skills and Creative Claw's model contracts and reels skill (Apache-2.0); script written by SL8 from the described behaviour
  deltas: STO-D400..STO-D419
---

# Nursery-rhyme sing-along

The song is made first and is the clock. New words are written to an exact line count, one timeline
gives every sung line its bar, the song is generated from that timeline, and then every picture,
cut and caption reads its time from the song as it really came back. One sung line is one shot; the
video ends when the song ends.

The method is the vendor's current guidance, measured on its own routes (lyria-3-clip, GPT Image 2,
Seedance 2.5). **Nothing in it has run on an SL8 Studio**: the routes below are fal's nearest
equivalents, and the restated wording has not been run on them. Treat the first jobs as rehearsals of
one 30 s song (STO-L413).

```bash
G=$HOME/.agents/skills/story-sing-along/scripts/sing.py        # python3 $G <subcommand> --help
T=$HOME/.agents/skills/story-sing-along/references/prompts.json
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
```

`sing.py` exits 0 done; 1 bad input; 2 a tool missing; 3 unusable transcript; 4 a check failed;
5 song TOO LONG; 6 a sung line missing. Method files: [song.md](references/song.md) (lyrics, length,
filter, timeline), [pictures.md](references/pictures.md) (shots, look, cast, clips, QC, run log) and
[prompts.json](references/prompts.json) (the templates). Open each only at the step that names it.

## What a request needs

- **A topic, a theme or a classic to echo**, or nothing (step 2 picks one). Anything else the method
  decides: length, tempo, look, models, captions. A brief or kit may set any of them.
- **Refused:** a real person's face or voice (a photo to turn into the hero, a voice to sing, a named
  real person). Real people are not offered until the SL8 consent text is approved (STO-L417); offer a
  cartoon hero. The method's kid-safe defaults: no injury, scary threat, weapons, brands, real people
  or trademarked characters; a named classic gives its theme and engine only.
- **Questions:** a bot job has nobody to answer, so every choice below has a stated default and a
  spend the brief did not approve opens a gate (`$S/gate.mjs`) and ends the job `partial` (HR12). In
  an interactive session with the customer present, the chat may wait for their reply; no question
  tool is ever called. Never ask about length, model, style, budget, voice or captions.

## Defaults (each one: a kit or brief may name another)

| Use | Default route | Settings pinned |
|---|---|---|
| Song | `fal-ai/lyria3/pro` | `prompt` only (no length field; `negative_prompt` unset) |
| Song fallback | `fal-ai/minimax-music/v2.6` | `prompt`, tagged `lyrics`, `lyrics_optimizer` false, `is_instrumental` false |
| Read-back and word times | `fal-ai/elevenlabs/speech-to-text/scribe-v2` | `diarize` false, `tag_audio_events` false, `language_code` ISO 639-3, `keyterms` |
| Character sheet | `openai/gpt-image-2` | `image_size` 1536x864, `quality` high, `num_images` 1 |
| Start frames | `openai/gpt-image-2/edit` | `image_size` 864x1536, `quality` high, references through `--ref` |
| Clips (way A) | `bytedance/seedance-2.0/image-to-video` | `duration` "4"-"15", `resolution` 480p, `aspect_ratio` 9:16, `generate_audio` false |
| One shot (way B) | `fal-ai/kling-video/v3/pro/image-to-video`; `minimax/h3/image-to-video` when named | Kling `duration` "3"-"15", `generate_audio` false; H3 `duration` 5-15, `resolution` 480P, `prompt_expansion_mode` disabled |
| Captions | ASS karaoke, Comic Neue bold, burned with ffmpeg | white words, the sung word gold, 14 characters and 3 s per caption, top edge at 0.74 of the height |

Folders: `artifacts/<p>/plan/` (plan.json, lyrics.txt, style.json, timeline.json, shotplan.json,
state.json, lyric_map.json, captions.ass: kept for later changes), `song/`, `keyframes/`, `clips/`,
`cut/`, `final/`, `qc/`; params files and envelopes in `work/<p>/`. Step 5 makes them all
(ffmpeg never creates a folder). One manifest row per generation (`$S/manifest.mjs add`, HR9).

## Steps (WF46-a1-s1)

1. **Method files at their step.** Open `song.md` at steps 3 and 7, `pictures.md` at steps 9-13 and
   `prompts.json` when a prompt is built; never write a prompt from memory. No search tool runs. Never
   name a file, an id or a vendor to the customer.
2. **Intake.** A topic, theme or classic goes straight to step 3. With none, pick an idea yourself
   (the approach's own no-answer default) from a template and say it in one plain line; in an
   interactive session you may first offer three ideas in a parent's everyday words, one question at
   most. Refuse real people's faces and voices (above).
3. **Plan the song** (`song.md`). Pick one template and one engine, the BPM (120 action, 92 lullaby,
   128 dance) and the length row (default about 30 s: 12 lines at 120 BPM). Write
   `artifacts/<p>/plan/lyrics.txt` (one sung line per line, a blank line between verses) by the rhyme
   formula, then build the timeline:
   `python3 $G plan --lyrics artifacts/<p>/plan/lyrics.txt --bpm 120 --out artifacts/<p>/plan/timeline.json`.
   Exit 4 lists what to rewrite; a customer's own words are never rewritten, so add `--waive blocked`,
   `--waive open-ending` or `--waive length` and keep the recorded waiver for the manifest (HR20).
   Then the formula's final check by reading. Keep `state.json`: `look_lock`, `set_sentence`,
   `prop_pin`, `cast` (hero clause plus the two side characters), `performance` (one line on how the hero
   moves), optional `sky_pin` and `bpm`, plus your notes (template, engine, lines, hero line, language,
   keyterms). `clip-prompt` names any of the five keys that is missing.
4. **The brief**, in the chat, like a text to a friend: what the song is, what happens, how long.
   Never "clips", "vertical", "animated", "template", "sing-along video" or a credit number; never like
   an ad. A named classic gets the `line-named-classic` line. A long run (over about 40 s or over 4
   clips) is confirmed through step 5's quote: within the approved budget it goes ahead and says so;
   over it, a spend gate with "Go ahead" (default) and "Make it shorter" (the 30 s row). "Cheaper
   model" is **not offered on this machine yet** (STO-L405).
5. **One plan message and the quote.** First set up (once): `mkdir -p artifacts/<p>/{plan,song,keyframes,clips,cut,final,qc/clip01} work/<p>`,
   `node $S/manifest.mjs init --project <p>`, read each route's fields (`ai-gen info <id> --format json`
   and media-ai-gen's raw OpenAPI printer; check every value you set, HR2) and write
   `artifacts/<p>/plan/plan.json` `declared` (9:16, the planned length, then the song's real length after
   step 8, one audio stream, mp4; HR1). Then settle the song route before anything is quoted: write
   `plan/style.json` (mood, genre, key, time signature, two or three instruments, voice, sound note), build
   `python3 $G song-prompt --timeline artifacts/<p>/plan/timeline.json --style artifacts/<p>/plan/style.json --templates $T --out work/<p>/song.params.json`
   (exit 4: a blocked phrase or a prompt over 4,500 characters; 1,500 and over is a warning, song.md) and
   `ai-gen estimate fal-ai/lyria3/pro --params-file work/<p>/song.params.json --format json`.
   **exit 12 means the route is unpriced**, so `--max-cost` would not hold: rebuild with
   `song-prompt --route minimax ... --out work/<p>/song.params.json` (the script's flag; `ai-gen` has
   no `--route`), estimate `fal-ai/minimax-music/v2.6` the same way, and say so in one line (HR5, STO-L401). Quote every other paid
   call from params files for the planned timeline (the sheet and each frame plus one redo, one Scribe pass
   at 2 credits a minute plus 30% for keyterms, each planned clip at its length rounded up, minimum 4 s, plus
   one redo, the song with up to two retries), total it and compare with `node $S/manifest.mjs budget --project <p>`.
   The plan message is titled with the song and has exactly seven steps in plain words about this song: the
   lyrics (written here), the song, the character sheet, the start frames, the clips, the stitch with the
   song, the final cut (lyric captions). Route ids, files and vendors go in the quote and the manifest only.
   The plan message is the one place a spend figure appears. Within the brief's budget: start step 6 at once.
   Over it, or no budget known: `node $S/gate.mjs open … --quote <total>` with a stop option, end
   `partial`. Nothing paid runs before this. The clips are re-quoted after step 9 from their real `render_s`;
   a new total over the budget opens the gate then.
6. **Lyrics.** Post the lyrics only, one sung line per line, then the `line-lyrics` line. A customer's
   exact words are used as written. A change after the song is made means a new song (step 19).
7. **The song** (`song.md`, filter list). Read every line once more against the filter list, then run
   the route step 5 settled on (lyria shown; on the fallback, `fal-ai/minimax-music/v2.6` with the same
   flags and the minimax params file):
   `ai-gen run fal-ai/lyria3/pro --params-file work/<p>/song.params.json --queue --strict-params --max-cost <quote> -o artifacts/<p>/song/ --format json > work/<p>/song.result.json`,
   then `SONG=$(python3 $G out work/<p>/song.result.json)` and a manifest row:
   `node $S/manifest.mjs add --project <p> --result work/<p>/song.result.json --params work/<p>/song.params.json --json '{"item":"song","node":"song","declared":{"format":"mp3"},"credits":{"estimate":<quote>}}'`.
   Never ElevenLabs music: it returns no sung words to time captions by. Songs stay at 60 s or less.
8. **Read the song back.** Demux it for Scribe (an mp4 input is refused):
   `ffmpeg -v error -y -i "$SONG" -ac 1 -ar 16000 work/<p>/song16k.wav`, quote it, and run
   `ai-gen run fal-ai/elevenlabs/speech-to-text/scribe-v2 --audio-file work/<p>/song16k.wav language_code=eng diarize=false tag_audio_events=false 'keyterms:=["<hero name>","<sound word>"]' --queue --strict-params --max-cost <quote> --format json > artifacts/<p>/song/song.words.json`
   (the words are in the JSON envelope; there is no file to download). Then
   `python3 $G readback --timeline artifacts/<p>/plan/timeline.json --song "$SONG" --words artifacts/<p>/song/song.words.json --out artifacts/<p>/plan/readback.json`.
   The transcript of singing is fuzzy: a near match counts (`--near` 0.5 by default, STO-L408); a line
   wholly absent is a miss. It proves words, not pronunciation, and you cannot listen: say the
   pronunciation is unchecked. The song failure ladder (one retry, then the fallback, then a gate; HR7):
   - **Exit 5, TOO LONG** (over 5 s past plan, or words sung twice): a failed song, never a longer plan,
     never padding or silence. Retry once on the same route with a changed prompt; a shorter song
     makes a shorter video.
   - **Exit 6, a line missing**: retry once with two fewer lines (step 3 again, `plan --free-length`).
   - **Blocked or "could not be generated"**: rewrite only the lines the filter list would catch (or
     cut the prompt back to the template) and say nothing yet. Never resend the same lyrics or prompt.
   - **Second failure**: move to `fal-ai/minimax-music/v2.6` with every line rewritten except the
     hook's idea (new sound word, new end rhymes), and the `line-song-rewritten` line.
   - **One sound word sung wrong** and nothing else: respell only that word in the sung text (the
     timeline row's `sung` field), the same way in every repeat; captions keep the written spelling.
   - **The fallback fails too**: open a spend gate (two new ideas near the customer's, "use the take
     as it came" with a new quote, stop) and end `partial`. Never a silent video.
9. **Shot plan, in the same job the song lands** (`pictures.md`). Time the song:
   `python3 $G retime --timeline artifacts/<p>/plan/timeline.json --readback artifacts/<p>/plan/readback.json --out artifacts/<p>/plan/timeline.json`.
   Write `shotplan.json` (shape in pictures.md: one shot per sung line by the verse template; shot 1 also
   covers the intro bar and the last shot the end row; an instrumental gap over 1.5 s gets a wide travel
   shot; clips of one verse or 8-15 s), then
   `python3 $G shots --timeline artifacts/<p>/plan/timeline.json --plan artifacts/<p>/plan/shotplan.json --fix-last --write`
   (`--lullaby` for a lullaby). Re-quote the clips from the real `render_s` (step 5). Post one hand-over
   line and a plain table of each shot's `see`; never counts, times or totals.
10. **Character sheet before any video.** Pick the setting and light row, fill `look-lock`, then build
    the sheet prompt from `character-sheet` (hero clause, 3-5 design facts) into
    `work/<p>/sheet.params.json` (`prompt`, `image_size` `{"width":1536,"height":864}`, `quality`
    "high", `num_images` 1; frames take `{"width":864,"height":1536}`), check it with
    `python3 $G check-prompt --file work/<p>/sheet.params.json --kind image`, quote and run
    `ai-gen run openai/gpt-image-2 --params-file work/<p>/sheet.params.json --queue --strict-params --max-cost <quote> -o artifacts/<p>/keyframes/ --format json > work/<p>/sheet.result.json`.
    Look at it: four panels, one design, no letters; one redo changing only what failed. Write the
    4-6 word hero line and the two side characters into `state.json`.
11. **Start frames, one per clip, at most four in flight.** `start-frame` with the look lock, the hero
    clause and line, the same set words, the prop pin and the clip's first shot caught mid-move:
    the params file holds `prompt`, `image_size` `{"width":864,"height":1536}`, `quality` "high",
    `num_images` 1; check it with `check-prompt --kind image`, quote it, then
    `ai-gen run openai/gpt-image-2/edit --params-file work/<p>/frame01.params.json --ref <sheet> --queue --strict-params --max-cost <quote> -o artifacts/<p>/keyframes/ --format json > work/<p>/frame01.result.json`,
    adding `--ref <clip 1's frame>` from clip 2 on, sheet first (references go through `--ref`, which
    fills `image_urls` in order; `--image` does not). There is no `input_fidelity` field on this route.
    Each frame's path is `python3 $G out work/<p>/frame01.result.json`. Look at each:
    same hero, exact cast, no letters, mid-action; one redo changing only what failed.
12. **Clips (way A).** For each clip:
    `python3 $G clip-prompt --plan artifacts/<p>/plan/shotplan.json --state artifacts/<p>/plan/state.json --timeline artifacts/<p>/plan/timeline.json --templates $T --clip clip01 --out work/<p>/clip01.params.json`
    (it writes the pinned params and refuses quoted lyrics, slowed actions and prompts of 2,500
    characters or more). Sum the clips' estimates against the budget first (async jobs reach the ledger
    only when fetched), then submit at most four:
    `ai-gen run bytedance/seedance-2.0/image-to-video --params-file work/<p>/clip01.params.json --image "$(python3 $G out work/<p>/frame01.result.json)" --async --strict-params --max-cost <quote> --format json > work/<p>/clip01.submit.json`,
    a `pending` manifest row at once, then `ai-gen result <request-id> -o artifacts/<p>/clips/ --format json > work/<p>/clip01.result.json`
    until it is ready (never `status --wait`). A client-side exit 7 sent nothing: fix the argument and
    submit. The start frame is the only image; never the sheet again.
13. **QC each clip before the stitch** (`pictures.md`): `node $Q streams <clip>`, then
    `ffmpeg -v error -i <clip> -vf fps=2 artifacts/<p>/qc/clip01/f%03d.png` and look. Then the cuts:
    `python3 $G cutcheck --file <clip> --plan artifacts/<p>/plan/shotplan.json --clip clip01 --out artifacts/<p>/qc/cuts01.json`
    compares where the model really cut with each shot's planned time (0.3 s). Record what the frames
    show in `artifacts/<p>/qc/qc.json`, never "pass". A failure, by HR7:
    - one redo of that clip keeping its rows, length and start frame, changing only what failed (look
      up the symptom in the run log); a sound-blocked clip gets its sound line rewritten;
    - a second failure, one drifting shot inside a good clip, or a cut `cutcheck` missed: that shot alone
      on way B, a 4 s Kling clip from a new start frame, set as the shot's `replace` file in `shotplan.json`:
      `python3 $G clip-prompt --plan artifacts/<p>/plan/shotplan.json --state artifacts/<p>/plan/state.json --timeline artifacts/<p>/plan/timeline.json --templates $T --clip clip01 --shot 3 --route kling --out work/<p>/clip01s3.params.json`,
      then quote, run and fetch it as in step 12;
    - still wrong: stitch anyway, run `lyricmap`, and cut that line out with step 19's range cut (the
      song loses it too), tell the customer in one line, and move on. A merge into the shot before changes no pixels:
      never. Never merge separate clips or re-time a clip.
    - A timeout is fetched by request id, never resubmitted (HR6); a job reported FAILED is a failed
      attempt. Two failures with the same defect: change the species or the action, not the words.
    Way B for a whole video (a Kling or MiniMax model the customer named): one clip per shot, each built
    with the command above (`--route h3` for MiniMax, whose shortest render is 5 s). Gemini Omni Flash, Veo and Grok are **not offered on this machine yet** (STO-L410).
14. **Stitch.** Put each clip's file (`python3 $G out work/<p>/clip01.result.json`) into
    `shotplan.json`, then
    `python3 $G stitch --plan artifacts/<p>/plan/shotplan.json --song "$SONG" --out artifacts/<p>/cut/stitch.mp4 --work work/<p>/stitch`.
    It trims each clip from the start point to its planned length (from the end only), refuses a clip
    shorter than its window (it would freeze), encodes every segment with one setting, joins them and
    maps the song as the only sound; exit 4 when the picture and the song differ by more than 0.25 s. A
    miss is fixed in the cut list, never by rendering again. Then `node $Q streams artifacts/<p>/cut/stitch.mp4 --audio yes`.
15. **Final cut: captions from the known lyrics.** Speech-to-text only times words; it never writes
    them. Nothing is cut here: every cut already sits on a sung line.
    `python3 $G lyricmap --timeline artifacts/<p>/plan/timeline.json --readback artifacts/<p>/plan/readback.json --out artifacts/<p>/plan/lyric_map.json`, then
    `python3 $G ass --map artifacts/<p>/plan/lyric_map.json --video artifacts/<p>/cut/stitch.mp4 --out artifacts/<p>/plan/captions.ass --srt artifacts/<p>/plan/captions.srt`
    (exit 4 when a line's captions do not spell it exactly or run outside it; nothing over an
    instrumental gap; a later burn reads this stitch's size). Preflight once: `ffmpeg -hide_banner -filters | grep -E ' subtitles '` and
    `fc-list | grep -i 'Comic Neue'`. Burn:
    `ffmpeg -v error -y -i artifacts/<p>/cut/stitch.mp4 -vf subtitles=artifacts/<p>/plan/captions.ass -c:v libx264 -crf 18 -c:a copy artifacts/<p>/final/<p>.mp4`.
    Read the ffmpeg error before counting a failure (a missing folder or font is not libass). Two failed
    builds or burns: `ass --plain` (plain line captions) and say so in the delivery. No
    libass: plain captions through the Video machine's burner,
    `python3 $HOME/.agents/skills/edit-captions/scripts/burn_captions.py --in artifacts/<p>/cut/stitch.mp4 --srt artifacts/<p>/plan/captions.srt --out artifacts/<p>/final/<p>.mp4 --style bold --bridge 0 --tail 0`.
    Captions are always the last edit: any later change rebuilds them from the stitch.
16. **A song in another language.** The same build; Scribe gets the song's ISO 639-3 code
    (`language_code=spa`, never the 639-1 `es`); captions go to the bottom (`ass --position bottom`)
    in a Noto face that covers the script (`--font "Noto Sans"`, or the family `fc-match` names). Whether
    the song routes sing the language, and how the formula's syllable rules apply, is untested
    (STO-L415).
17. **Final check and render.** `ffprobe` the final: its length equals the song's within 0.25 s, one
    audio stream (`node $Q streams artifacts/<p>/final/<p>.mp4 --audio yes`). Extract frames at the
    middle of the first, a middle and the last caption (`ffmpeg -ss <t> -i <final> -frames:v 1 artifacts/<p>/qc/final_<k>.png`)
    and look: captions present, low and clear of the hero's face. No music, effects, zooms, punch-ins
    or text overlays unless asked. The final MP4 is rendered every run; a failed render is retried once,
    then the `line-export-failed` line.
18. **Deliver.** The `line-delivery` line with the real song length, the final MP4 attached; then one
    status line: the routes used, the defaults taken (including the delivered size, 480p unless the
    customer asked for more), what was measured, and what was not (sung pronunciation unheard, frames
    judged by eye). Write `PROGRESS.md` and close with the folder tree,
    the file count and the credits spent.
19. **Changes after delivery,** done at once from the kept plan files:
    - caption words or style: steps 15 and 17 again with the customer's exact words (no paid call);
    - a range cut: `python3 $G cut --stitch artifacts/<p>/cut/stitch.mp4 --map artifacts/<p>/plan/lyric_map.json --start <s> --end <s> --out-stitch artifacts/<p>/cut/stitch_cut.mp4 --out-map artifacts/<p>/plan/lyric_map_cut.json`
      (snapped to sung-line edges; the song is cut with it, say so). Then skip `lyricmap`: `ass --map
      artifacts/<p>/plan/lyric_map_cut.json --video artifacts/<p>/cut/stitch_cut.mp4 ...`, burn from
      `stitch_cut.mp4` and run step 17 on that file;
    - a wrong shot: re-rendered alone (way B) from a new start frame, restitched, recaptioned;
    - "no captions": deliver the stitch;
    - a title: one text event at the top for the first 2 s, in the same caption burn
      (`ass --title "<text>"`), never drawn by a video model;
    - 16:9 or 1:1: new frames and clips at that ratio and a new stitch, never a crop; the song, the sheet
      and the shot plan are kept.
    The gates hold in order: no frames before the song, no video before the frames, no stitch before
    every clip lands, no final cut before the stitch. A pivot keeps what is still true (new words keep
    the sheet; a new hero keeps the song), is confirmed in the customer's words, names what is redone
    and that work already made stays spent, and is quoted like step 5.

A narrated musical or story (a storyteller who breaks into song) is the assessment's other approach;
it is **not offered on this machine yet** (STO-L411). This skill makes the song-only sing-along.

## House rules (HR-1.0)

Relies on: HR1 (format, size, length and one audio stream declared in `plan.json` and measured),
HR2 (`ai-gen info` and the raw OpenAPI before the first submit of each route), HR3, HR4 (audio off on
every clip route, H3 prompt expansion off, quality and size pinned), HR5 (every paid call quoted in
step 5; an unpriced song route gives way to a priced one), HR6 (a timeout is fetched by request id),
HR7 (one retry with a named lever, then the named fallback, then a gate), HR8, HR9, HR10 (all on-screen
words are burned last in one encode; no model draws text), HR11 (captions and titles are rebuilt from
the stitch, never over a burned final), HR12 (stated defaults, spend gates, no question tool), HR13
(`sing.py` and media-qc exit non-zero), HR14 (frames are described, never passed), HR15 (the status line
names what is unchecked), HR16 (H3's prompt expansion and minimax's `lyrics_optimizer` off; a rewritten prompt a route returns goes in the manifest row), HR17
(no real person's face or voice), HR19, HR20, HR21, HR22 (route facts from the facts files of
media-image-generation, media-video-generation and media-audio-generation) — see
media-ai-gen/references/house-rules.md.
Not applicable: HR18 (a children's song makes no claims).
