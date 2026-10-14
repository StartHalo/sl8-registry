---
name: c10-making-song
description: "Song, music, track, vocal song, instrumental, background music, lyrics to song, song writing, in any language. Generates one original song, vocal or instrumental, as an MP3 from a short brief or the customer's own lyrics, with fal-ai/minimax-music/v2.6 through ai-gen on the SL8 Video Studio. Expands the brief into a vivid English prompt with its own prompt guide, writes original lyrics with section markers when none are supplied, estimates and gates the spend, records one manifest row per generation and measures the file with media-qc. Runs headless: every question the source asked becomes a stated default. Use when a job asks for music creation, song writing, lyrics turned into a song, or background music for a mood or scene. A cover of a reference track is recognised but cannot run on SL8 and ends as a recorded debt with no spend. Do not use to play existing files, answer music theory questions or recommend music without generating any."
license: MIT
compatibility: "SL8 Video Studio 1.0.2 (sl8-video build 15483cb4); loads media-ai-gen and the Studio's media skills"
metadata:
  version: 0.1.0
  kit: audio/song
  source: "D3/minimax-music-gen (MiniMax)"
  status: untested
---

## Kit: song

This kit makes one deliverable, audio/song: a generated song, vocal or instrumental, from a short brief or the customer's own lyrics. Its trigger words and exclusions are in the front matter description.

# MiniMax Music Generation Skill

Generate songs (vocal or instrumental) using the MiniMax Music API. Supports two creation
modes: **Basic** (one-sentence-in, song-out) and **Advanced Control** (edit lyrics, refine
prompt, plan before generating).

On SL8 this kit runs headless from start to finish and never stops to ask anyone (HR12). Both modes build everything straight from the brief: a one-line brief uses the Basic expansion, and a brief with detailed requirements also uses the Advanced planning (step 3). Every value the brief leaves out takes the default stated in its step, and the delivery line names every default taken.

Steps, in this order (a gate's `--resume-at` names one of them):
1. preflight · 2. resolve-intent · 3. build-prompt · 4. write-lyrics (vocal only) · 5. schema-and-params · 6. estimate-and-gate · 7. generate · 8. name-and-record · 9. verify · 10. retry-once (only after a failure) · 11. deliver

Durable inputs: everything a resumed step needs (intent, prompt, lyrics, params, quotes) is written under `artifacts/<project>/source/` before any paid call or gate, because `work/<project>/` is lost between jobs. Only result envelopes, gate status and schema dumps go in `work/<project>/`.

Reference files:
- `${CLAUDE_SKILL_DIR}/reference/prompt-guide.md`: read in step 3, before writing the prompt.
- `${CLAUDE_SKILL_DIR}/reference/params-and-recovery.md`: read in step 5 (params shapes for every route, delivery mapping) and in steps 6, 7 and 10 on any non-zero exit (the exit tables).
- `${CLAUDE_SKILL_DIR}/reference/retry.md`: read in step 10 (every command of the one retry and of a waived third attempt).

## Route and model choice

Every song generation runs through `media-ai-gen`:

- **Music Generation**: Load `media-ai-gen` (Skill tool) and run `ai-gen run fal-ai/minimax-music/v2.6 --params-file <f> --queue --strict-params --max-cost <quote>` (step 7). This is MiniMax music-2.6 on fal. Its fields:
  - `lyrics`: the song's lyrics with section markers, supplied by the customer or written by the agent in step 4.
  - `is_instrumental: true` for instrumental tracks.
  - `lyrics_optimizer`: always `false` (HR16); the agent writes the lyrics itself.
  - `audio_setting`: the delivery format, a nested object.
  - `enable_safety_checker`: pinned `true` (HR4).
  - `prompt`, 10-2000 characters. The structured values (genre, mood, vocals, instruments, bpm, key, tempo, structure, references, avoid, use-case) are not fields on this route, so each is written into the prompt as a sentence (T23).
- **Cover**: not runnable on SL8. fal has no MiniMax cover endpoint (T24); see Cover Mode.

**Agent flags**: every paid call carries `--queue` (so a request id exists), `--strict-params`, `--max-cost <quote>` and `--format json`, and its JSON goes into `work/<project>/`.

**Pipeline**:
- Vocal: `Brief -> English prompt + lyrics with section markers (agent-written or the customer's) -> fal-ai/minimax-music/v2.6 -> MP3`
- Instrumental: `Brief -> English prompt -> fal-ai/minimax-music/v2.6 (is_instrumental: true) -> MP3`
- Cover: `Source audio + style -> not runnable on SL8 (T24): debt recorded, nothing spent`

**Model choice**
- **Generate (vocal and instrumental): `fal-ai/minimax-music/v2.6`.** The source picks MiniMax music-2.6, fal's id for it is fal-ai/minimax-music/v2.6, and `media-audio-generation` names the same route for a song with written lyrics, so the vocal paths agree. The instrumental keeps the source's route (`is_instrumental: true`) because SL8 has measured neither route. The single test run uses this model.
- **Alternative: `fal-ai/elevenlabs/music`**, the Studio's general Music primary (150 cr per started minute, list). It has `music_length_ms` and `force_instrumental`, but no Studio skill teaches lyrics on it, so it serves instrumentals only: as gate option c (step 6) and as the route lever of a retry (step 10). Never switched to silently.
- **Lyrics: no model.** The agent writes them; `lyrics_optimizer: true` is barred by HR16.
- The minimax-music price through the SL8 proxy is unverified (T05, T22), so every call is estimated first with its own params file.

## Storage

Deliverables go under `artifacts/<project>/audio/`, durable inputs under `artifacts/<project>/source/`, and envelopes under `work/<project>/`; step 1 creates all three with `mkdir -p`. ai-gen names the download `{model-tail}-{timestamp}.{ext}`. Never guess that name: read it from `files[0].local_path` in the result JSON. Step 8 renames it to `<project>.<ext>` and the manifest row carries the new path in `files`. A retry is written as `<project>_v2.<ext>` (a waived third attempt `<project>_v3.<ext>`); no attempt's file is ever overwritten, and no file is ever deleted, so the source's 50-file cleanup suggestion has no place here.

## Step 1: preflight

Nothing is installed and there is no login: ai-gen is baked in and the platform sets its credentials. Never repair the machine (HR21). Nothing is played back; step 9 measures the file.

1. **Project slug.** `<project>` is the brief's `Project: <name>` in kebab case; if the brief names no project, the first five words of the brief in kebab case. Set it here, once, and never change it. It names `artifacts/<project>/` and `work/<project>/`, and the song file is `<project>.<ext>` (the source's `<slug>`). A brief that answers or resumes a gate must name the project; PROGRESS.md Next steps says so.
2. Load `media-ai-gen` (Skill tool) and `media-audio-generation` (Skill tool).
   **Bot check (BOT-C10), before anything is created:** save the request word for word to `work/request.md` and run `node ${CLAUDE_SKILL_DIR}/scripts/inputs.mjs work/request.md`. If it exits 1 (the request says nothing about the track), create nothing under `artifacts/`, spend nothing, and end partial with its `say` line, which the router puts in `/home/user/outcome.json`.
3. `mkdir -p artifacts/<project>/audio artifacts/<project>/source work/<project>`
4. `ai-gen doctor`. If it reports missing config or auth, report what it prints, write `node -e "require('fs').writeFileSync('artifacts/<project>/outcome.json',JSON.stringify({status:'failed',reason:'ai-gen doctor: <what it printed>',credits:0}))"` and end.
5. Gate state:
   `node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs status --project <project> > work/<project>/gate-status.json`
   - Exit 10 (a gate is open) and the brief answers it (an option id, or plain words that pick one option): record the answer, then run the status command above again:
     `node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs answer --project <project> --gate <gate id> --option <option id> --by "<the brief's words>"`
   - Exit 10 and the brief does not answer it: spend nothing; go to step 11 (the question restated under Known gaps and Next steps) and end partial.
   - List the answered gates and the option chosen:
     `node -e "const s=JSON.parse(require('fs').readFileSync('work/<project>/gate-status.json','utf8'));for(const g of s.answered||[])console.log(g.id,g.slug,g.answer,g.resume_at)"`
6. No `artifacts/<project>/manifest.json` yet: `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs init --project <project>`. It exists (a resumed project): `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>`, then fetch every pending row before submitting anything new: `ai-gen result <pending request-id> -o artifacts/<project>/audio/ --format json > work/<project>/song.result.json`, and continue at step 8 with it.
7. `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>`
   **Budget** = `remaining`, or the brief's `budget_credits` when smaller. When `remaining` is null it is the brief's `budget_credits`, default **300 credits for the whole job**.
8. **Act on the answered option** of the highest-numbered answered gate whose work is not yet done. Only an option that approves the spend resumes at its `resume_at`, reading its inputs from `artifacts/<project>/source/`:

| Gate | Option | What the job does |
|---|---|---|
| approve-song | a | step 7 on fal-ai/minimax-music/v2.6 with `song.params.json`; when the option's credits are null (unpriced) leave out `--max-cost` |
| approve-song | c | step 7 on fal-ai/elevenlabs/music with `song.el.params.json` and `song.el.estimate.json` |
| approve-retry | a | step 10, the one retry (`song.v2.params.json`, `song.v2.estimate.json`) |
| approve-next | a | record the waiver first: `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule HR7 --instruction "<the owner's words>"`, then step 10's third attempt (`song.v3.*`) |
| any gate | b ('Stop here', 'Stop with attempt 1 and its debt', 'Stop with the takes so far') | **spend nothing**: no `ai-gen run`, `estimate` or `result` for new work. Go to step 11, skip the copies, leave outcome.json `partial` |

   With no answered gate whose work is still to do, go to step 2.

## Step 2: resolve-intent

Parse the user's message to determine:

1. **Song category**: vocal (with lyrics), instrumental (no vocals), or cover
2. **Creation mode preference**: did they provide detailed requirements (Advanced) or a
   casual one-liner (Basic)?

Read both from the brief, never by asking, with this decision tree:

```
Q1: What type of music?
  - Vocal (with lyrics)
  - Instrumental (no vocals)
  - Cover

Q2: Creation mode?
  - Basic — one-line description, auto-generate
  - Advanced — edit lyrics, refine prompt, plan
```

Defaults, first match wins. Q1: the brief says instrumental, no vocals, background music, or names a solo-instrument piece -> **instrumental**; the brief supplies lyrics -> **vocal-user-lyrics**; the brief supplies a reference track to re-sing -> **cover** (stop below); otherwise -> **vocal-auto-lyrics** (lyrics written by the agent). Q2: a one-line description -> Basic (step 3 expansion with the planning defaults); detailed requirements (structure, BPM, reference style, vocal character, lyrics) -> Advanced (step 3 expansion with the brief's planning values).

When the brief's lines conflict (for example 'no vocals' beside a named voice, or 'instrumental' beside lyrics), first match still wins; name each instruction dropped in the step 2 line, so it reaches PROGRESS.md Decisions and the delivery line. Lyrics the brief says are attached but are not in the request or `artifacts/attachments/` count as not supplied, and the delivery line says theirs were not received.

If the user gives a clear one-liner like "make me a sad piano piece", skip the questions —
infer instrumental + basic mode and proceed.

Also resolve from the brief:
- **Lyrics language**: the language the brief is written in (Lyrics language rule, Important Notes). Nothing is shown to anyone; what the source localized goes into the delivery line and PROGRESS.md.
- **Delivery**: `MP3 128k` by default; `WAV / PCM 44.1k` only when the brief asks for it.
- **Length**: `no target`. The route has no length field, so the duration is measured, never promised.

State the values in one line, naming each default taken (the media-audio-generation Step 0 line), and copy it into PROGRESS.md Decisions:
`Job: Music · Voice: n/a · Length: no target · Delivery: MP3 128k · Category: vocal-auto-lyrics · Lyrics: written by the agent · Lyrics language: English · Defaults taken: category, lyrics source, delivery, structure, budget 300`

Write `artifacts/<project>/source/intent.json`, for example:
`{"category":"vocal-auto-lyrics","lyrics_source":"agent","lyrics_language":"English","delivery":"MP3 128k","defaults_taken":["category","delivery","structure","budget"],"declared":{"audio":"on","format":"mp3","length":"no target","delivery":"MP3 128k"}}`
`category` is `vocal-auto-lyrics`, `vocal-user-lyrics`, `instrumental` or `cover`. For WAV, `delivery` is `WAV / PCM 44.1k` and `declared.format` is `wav` (`pcm` if step 5 finds no wav in the enum). Check it parses:
`node -e "JSON.parse(require('fs').readFileSync('artifacts/<project>/source/intent.json','utf8'))"`

If the brief explicitly orders something a house rule forbids (for example a third attempt), do it and record the waiver (HR20):
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule HR7 --instruction "<the brief's words>"` (name the rule the order breaks).

**Cover**: stop here, before any spend, with no substitute route. Write the outcome, then go to step 11 for PROGRESS.md (debt 'cover not runnable on SL8 (T24)' under Known gaps; step 11 skips the copies and writes no further outcome):
`node -e "require('fs').writeFileSync('artifacts/<project>/outcome.json',JSON.stringify({status:'partial',reason:'cover not runnable on SL8 (T24): no MiniMax cover endpoint on fal',credits:0}))"`

## Step 3: build-prompt

**Read `${CLAUDE_SKILL_DIR}/reference/prompt-guide.md` before writing the prompt.** It is the source's Prompt Writing Guide: the sentence pattern; the genre, vocal, instrument and BPM tables; the vocal and instrumental worked examples, which are the models for the prompt; the tips; and the toolkit's music examples.

**Goal**: User provides a short description, the skill auto-generates everything, then calls
the API.

1. **Expand the description into a prompt**: Take the user's one-liner and expand it into a
   rich music prompt. Refer to the **Prompt Writing Guide** appendix at the end of this
   document for style vocabulary, genre/instrument references, and prompt structure.
   **The API prompt should always be written in English** for best generation quality,
   regardless of the user's language.
   
   Follow this pattern:
   ```
   A [mood] [BPM optional] [genre] song, featuring [vocal description],
   about [narrative/theme], [atmosphere], [key instruments and production].
   ```

2. **Prompt phase**:
   - Generate a recommended prompt based on the lyrics' mood and content: the customer's lyrics when supplied; for agent-written lyrics, step 4 writes them to this prompt's theme, so the prompt is final here.
   - Write it as sentences from the guide's vocabulary, not as tags for anyone to edit.
   - Refer to `${CLAUDE_SKILL_DIR}/reference/prompt-guide.md` for the full vocabulary.

3. **Advanced planning** (read from the brief; anything it leaves out takes the default below):

   - Song structure: verse-chorus-verse-chorus-bridge-chorus or custom
   - BPM suggestion (encode in prompt as tempo descriptor)
   - Reference style: "something like X style" -> map to prompt tags
   - Vocal character description

Defaults: **structure** verse-chorus-verse-chorus-bridge-chorus; **BPM** from the guide's BPM table by the brief's feel, written as a tempo descriptor ('a slow 70 BPM ballad'); **reference style** mapped to genre and production words, never to a named artist (HR17); **vocal character** a described character from the guide's vocal table, never a bare 'female vocal'. List the values and defaults under PROGRESS.md Decisions.

Write every structured value the brief gives (genre, mood, vocals, instruments, bpm, key, tempo, structure, references, avoid, use-case) into the prompt as a sentence; on this route they are not fields. For instrumentals, write 'Instrumental with...' in place of the vocal description. Save the prompt as `artifacts/<project>/source/prompt.txt`, then count its characters by code point:
`node -e "const t=require('fs').readFileSync('artifacts/<project>/source/prompt.txt','utf8').trim();const n=[...t].length;console.log(n);process.exit(n>=10&&n<=2000?0:1)"`
It must exit 0 (10-2000; up to 4100 only on the elevenlabs route). The owner reviews prompt.txt for English sentences, no tag list and no artist name.

4. **No preview and no final confirmation.** Record what the source's preview and parameter summary would have shown under PROGRESS.md Decisions and in the delivery line, then go on:

```
About to generate:
Type: Vocal / Instrumental
Description: indie folk, melancholy, acoustic guitar, gentle female voice
Lyrics: Written by the agent (lyrics_optimizer false, HR16) / Customer's lyrics (markers fixed) / None
```

## Step 4: write-lyrics

Vocal categories only. For an instrumental, skip this step: no lyrics.txt exists.

1. **Lyrics phase**:
   - If the customer provided lyrics: keep their words and format them with section markers. Change only the markers and record each marker fix as a debt. The final lyrics go into the `lyrics` field.
   - If the customer has a theme but no lyrics: the agent writes original lyrics in the lyrics language, to the planned structure and the prompt's theme, with section markers. `lyrics_optimizer` stays false (HR16).
   - When the brief targets one section ('make the second chorus about leaving'), write only that section to it.

Save them as `artifacts/<project>/source/lyrics.txt`, markers on their own lines as `[Intro]`, `[Verse]`, `[Chorus]`, `[Bridge]`, `[Outro]` (the source's five names, in the case media-audio-generation writes them). Check, counting by code point:
`node -e "const t=require('fs').readFileSync('artifacts/<project>/source/lyrics.txt','utf8');const m=t.split('\n').filter(l=>/^\[(intro|verse|chorus|bridge|outro)( \d+)?\]/i.test(l.trim())).length;const n=[...t].length;console.log(JSON.stringify({markers:m,chars:n}));process.exit(m>=1&&n<=3500?0:1)"`

Invalid lyrics format: fix the section markers automatically and name the fix in the delivery line.

- **Never reproduce copyrighted lyrics.** If supplied lyrics are a published song the customer did not write, replace them with original lyrics on its theme and style, and say so in the delivery line. The owner reviews lyrics.txt for originality and language.

## Step 5: schema-and-params

Load `media-ai-gen` (Skill tool). Read each route's input schema before writing its params; read `${CLAUDE_SKILL_DIR}/reference/params-and-recovery.md` for the shapes and the delivery mapping (the source's format, sample-rate and bitrate settings become `audio_setting`).

fal-ai/minimax-music/v2.6, always:
`ai-gen info fal-ai/minimax-music/v2.6 --format json > work/<project>/schema-minimax-music-v2.6.json`
`curl -s "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/minimax-music/v2.6" > work/<project>/openapi-minimax-music-v2.6.json`
`python3 -c "import json,sys;d=json.load(open(sys.argv[1]));s=(d or {}).get('components',{}).get('schemas',{});print('UNRESOLVED') if not s else [print(n,json.dumps(v.get('required',[])),json.dumps(v.get('properties',{}))) for n,v in s.items() if n.endswith('Input') or 'Setting' in n]" work/<project>/openapi-minimax-music-v2.6.json`

Write the params (every default-on flag pinned: `lyrics_optimizer` false, `is_instrumental`, `enable_safety_checker` true, `audio_setting`):
`node -e "const fs=require('fs');const d='artifacts/<project>/source/';const i=JSON.parse(fs.readFileSync(d+'intent.json','utf8'));const v=i.category!=='instrumental';const w=i.delivery==='WAV / PCM 44.1k';const p={prompt:fs.readFileSync(d+'prompt.txt','utf8').trim(),lyrics_optimizer:false,is_instrumental:!v,enable_safety_checker:true,audio_setting:w?{format:'wav',sample_rate:44100}:{format:'mp3',bitrate:128000}};if(v)p.lyrics=fs.readFileSync(d+'lyrics.txt','utf8');fs.writeFileSync(d+'song.params.json',JSON.stringify(p,null,1))"`
If the printed format enum has no `wav`, change it to `pcm` (and `declared.format` with it). Check the keys:
`python3 -c "import json,sys;d=json.load(open(sys.argv[1]));p=json.load(open(sys.argv[2]));s=d['components']['schemas'];f=[v for n,v in s.items() if n.endswith('Input')][0].get('properties',{});bad=[k for k in p if k not in f];print('unknown keys:',bad);sys.exit(1 if bad else 0)" work/<project>/openapi-minimax-music-v2.6.json artifacts/<project>/source/song.params.json`

fal-ai/elevenlabs/music, only for an instrumental (gate option c, retry route):
`ai-gen info fal-ai/elevenlabs/music --format json > work/<project>/schema-elevenlabs-music.json`
`curl -s "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/elevenlabs/music" > work/<project>/openapi-elevenlabs-music.json`
`python3 -c "import json,sys;d=json.load(open(sys.argv[1]));s=(d or {}).get('components',{}).get('schemas',{});print('UNRESOLVED') if not s else [print(n,json.dumps(v.get('required',[])),json.dumps(v.get('properties',{}))) for n,v in s.items() if n.endswith('Input') or 'Setting' in n]" work/<project>/openapi-elevenlabs-music.json`
`node -e "const fs=require('fs');const d='artifacts/<project>/source/';const i=JSON.parse(fs.readFileSync(d+'intent.json','utf8'));fs.writeFileSync(d+'song.el.params.json',JSON.stringify({prompt:fs.readFileSync(d+'prompt.txt','utf8').trim(),force_instrumental:true,music_length_ms:60000,respect_sections_durations:true,output_format:i.delivery==='WAV / PCM 44.1k'?'pcm_44100':'mp3_44100_128'},null,1))"`
Add `"enable_safety_checker": true` if that schema lists it. Then:
`python3 -c "import json,sys;d=json.load(open(sys.argv[1]));p=json.load(open(sys.argv[2]));s=d['components']['schemas'];f=[v for n,v in s.items() if n.endswith('Input')][0].get('properties',{});bad=[k for k in p if k not in f];print('unknown keys:',bad);sys.exit(1 if bad else 0)" work/<project>/openapi-elevenlabs-music.json artifacts/<project>/source/song.el.params.json`

Pass: no UNRESOLVED from either printer, both key checks exit 0, and each value is inside its printed enum or range (format, bitrate 128000, sample_rate 44100, output_format mp3_44100_128 or pcm_44100, music_length_ms 3000-600000). Note whether a seed field exists. On exit 8 or UNRESOLVED: `ai-gen models --search minimax`, report the stale pick in PROGRESS.md, end partial (step 11's partial outcome); never guess a sibling id.

## Step 6: estimate-and-gate

Estimate every route the job may run with its own params file, saving each quote under `artifacts/<project>/source/`:
`ai-gen estimate fal-ai/minimax-music/v2.6 --params-file artifacts/<project>/source/song.params.json --format json > artifacts/<project>/source/song.estimate.json`
Instrumental only (for gate option c):
`ai-gen estimate fal-ai/elevenlabs/music --params-file artifacts/<project>/source/song.el.params.json --format json > artifacts/<project>/source/song.el.estimate.json`
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>`

The quote is `estimated_credits` (250 cr = US$1; ignore estimated_usd). **Over budget** means quote > budget (step 1). The retry is not counted here: step 10 estimates and gates it on its own. Write in PROGRESS.md Pipeline: planned chain = one generation at `<quote>` credits; a retry, if one runs, gets its own estimate.

- **Exit 0 and quote ≤ budget**: go to step 7.
- **Vocal, exit 0 and quote > budget**:
  `node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-song --question "Generate the song on fal-ai/minimax-music/v2.6 for <quote> credits? That is over the <budget> credit budget." --options '[{"id":"a","label":"Run fal-ai/minimax-music/v2.6 over budget","credits":<quote>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "step 7: generate (reads artifacts/<project>/source/song.params.json and song.estimate.json)" --quote <quote>`
- **Vocal, exit 12 (unpriced)**:
  `node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-song --question "Generate the song on fal-ai/minimax-music/v2.6? The route is unpriced on the SL8 proxy (estimate exit 12), so the call would run uncapped." --options '[{"id":"a","label":"Run fal-ai/minimax-music/v2.6 unpriced","credits":null},{"id":"b","label":"Stop here","credits":0}]' --resume-at "step 7: generate (reads artifacts/<project>/source/song.params.json)"`
- **Instrumental, exit 12 or quote > budget**: one gate offering both routes, labelled with the real reason:
  `node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-song --question "Instrumental: fal-ai/minimax-music/v2.6 is <unpriced (estimate exit 12) | over the <budget> credit budget at <quote> credits>. Run it, run fal-ai/elevenlabs/music (60 s, <quote_el> credits), or stop?" --options '[{"id":"a","label":"Run fal-ai/minimax-music/v2.6 (<unpriced | <quote> credits, over budget>)","credits":<quote or null>},{"id":"c","label":"Run fal-ai/elevenlabs/music, 60 s instrumental","credits":<quote_el>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "step 7: generate (option a reads song.params.json; option c reads song.el.params.json and song.el.estimate.json, all in artifacts/<project>/source/)"`
- **Instrumental, exit 6 (route refused)**: the same gate with only options c and b.
- **Vocal, exit 6**: no route to offer; end partial with the denial named in Known gaps (step 11's partial outcome).
- **Other exits**: 2 or 7: fix the params file and estimate again (free). 3 or 4: `ai-gen doctor`, report, end failed. 11: estimate once more, then end partial. See the estimate table in params-and-recovery.md.

After `gate.mjs open` exits 0 (it writes outcome.json `{status:'partial'}`), spend nothing further: go to step 11, which writes PROGRESS.md with the gate under Known gaps and Next steps (name the project in the answering brief) and leaves outcome.json partial. Never answer your own gate.

## Step 7: generate

Load `media-ai-gen` (Skill tool) and run the song queued, strict and capped at the quote, downloading into the audio folder. Typical generation takes 30-120 seconds, inside `--queue`'s 15-minute wait; no progress indicator is shown.
`ai-gen run fal-ai/minimax-music/v2.6 --params-file artifacts/<project>/source/song.params.json --queue --strict-params --max-cost <quote> -o artifacts/<project>/audio/ --format json > work/<project>/song.result.json`
After an approved unpriced run (approve-song a with credits null), leave out `--max-cost`: no quote exists.

**Option c** of an answered instrumental gate runs elevenlabs as attempt 1 (steps 8-9 then use `song.el.params.json` and `<quote_el>`):
`ai-gen run fal-ai/elevenlabs/music --params-file artifacts/<project>/source/song.el.params.json --queue --strict-params --max-cost <quote_el> -o artifacts/<project>/audio/ --format json > work/<project>/song.result.json`

The envelope holds `request_id`, `files[0].local_path` and `credits_used`. If the command is cut off before it prints, the request id is in the job store:
`python3 -c "import json,os;[print(j['submitted_at'],j['model'],j['request_id']) for j in json.load(open(os.path.expanduser('~/.cache/ai-gen/jobs.json')))['jobs'][:5]]"`
Then fetch the existing job; never resubmit (HR6):
`ai-gen result <request-id> -o artifacts/<project>/audio/ --format json > work/<project>/song.result.json`

On any non-zero exit, follow the run exit table in `${CLAUDE_SKILL_DIR}/reference/params-and-recovery.md` (media-ai-gen recovery; the source's own exit table is not used). Every failed attempt gets its own row, recorded without `--result` (manifest.mjs refuses an error envelope):
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params artifacts/<project>/source/song.params.json --json '{"item":"song","node":"audio","endpoint":"fal-ai/minimax-music/v2.6","request_id":null,"status":"failed","attempt":1,"notes":"exit <n> <error.code>","declared":{"audio":"on","format":"mp3","length":"no target","delivery":"MP3 128k"},"credits":{"estimate":<quote or null>},"files":[]}'`
Put `error.details.requestId` in `request_id` when it is present. For an elevenlabs attempt, name `fal-ai/elevenlabs/music` and `song.el.params.json`. A vocal exit 6 never retries the same id: record the failed row and end partial with the denial named in Known gaps.

## Step 8: name-and-record

Read the downloaded path from the envelope (never guess it), move it to the stable name keeping its extension, then write the row with the new path in `files`:
`SRC=$(node -e "console.log(JSON.parse(require('fs').readFileSync('work/<project>/song.result.json','utf8')).files[0].local_path)")`
`EXT="${SRC##*.}"`
`mv "$SRC" "artifacts/<project>/audio/<project>.$EXT"`
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/song.result.json --params artifacts/<project>/source/song.params.json --json '{"item":"song","node":"audio","declared":{"audio":"on","format":"mp3","length":"no target","delivery":"MP3 128k"},"credits":{"estimate":<quote or null>},"attempt":1,"files":["artifacts/<project>/audio/<project>.<ext>"]}'`
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>`
For WAV use the `declared` of intent.json; for an option-c attempt pass `song.el.params.json` and the elevenlabs quote. Check: add and verify exit 0, no changed or missing file.

## Step 9: verify

Nothing is played back; the file is measured and the owner listens. Load `media-qc` (Skill tool) and run:
`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/audio/<project>.<ext>`
`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs takes artifacts/<project>/audio/<project>.<ext> --n 3`
`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs loudness artifacts/<project>/audio/<project>.<ext>`
`ffmpeg -y -i artifacts/<project>/audio/<project>.<ext> -af volumedetect -f null - 2>&1 | grep mean_volume`
`ffprobe -loglevel error -show_entries format=duration -of default=nk=1:nw=1 artifacts/<project>/audio/<project>.<ext>`

`mediaqc declared` is not used: it needs a picture.
- **Pass**: `artifact` exit 0, `takes` exit 0 (each third above -50 dB, AQ-01), mean volume above -60 dB.
- **Measured failure**: exit 1 from `artifact` or `takes` on a readable mp3 or wav, or mean volume below -60 dB: go to step 10.
- **Loudness**: the source sets no target, so the figures are reported; an exit 1 is a review item, not a retry.
- **Not checked**: exit 3, or raw PCM (`.pcm`/`.bin`, 'no audio stream') that artifact cannot read, is reported 'not checked' and named as a debt (HR15), never a retry trigger.

Report the duration as measured, never against a target. Put the figures in the row by re-adding it with the same `--result`:
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/song.result.json --params artifacts/<project>/source/song.params.json --json '{"item":"song","node":"audio","attempt":1,"files":["artifacts/<project>/audio/<project>.<ext>"],"declared":{"audio":"on","format":"mp3","length":"no target","delivery":"MP3 128k"},"credits":{"estimate":<quote or null>},"measured":{"duration_s":<d>,"mean_db":<m>,"integrated_lufs":<l>,"true_peak_dbtp":<tp>,"stretches_db":[<s1>,<s2>,<s3>]}}'`

Taste, genre, mood, lyrics language and whether vocals are present go to the owner's listening review (HR14); they never trigger a retry.

## Step 10: retry-once

No feedback is asked for; the measurements decide. Every step 9 check passes: done, go to step 11 (the source's 'Satisfied').

Retry **once**, only after a measured failure in step 9, an exit 1, 7 or 9 from step 7, or an exit 6 on an instrumental (a vocal exit 6 ended partial in step 7; exit 2 and 13 are not attempts). Move one named lever:
- **Prompt clause**, same route (the default): write `artifacts/<project>/source/prompt.v2.txt` with that one clause changed (after exit 7, fix the field `error.details` names), then build `song.v2.params.json` from it. Lever `prompt: clause X replaces Y`.
- **Route**, instrumental only, when `artifact` exited 1 or step 7 got exit 6: `fal-ai/elevenlabs/music` with `song.el.params.json`. Lever `route: fal-ai/elevenlabs/music`.

Estimate the retry first (HR5). If its quote is over what remains, open approve-retry and go to step 11. Otherwise run it to `<project>_v2.<ext>` with row attempt 2 and its lever, run the step 9 checks on it and re-add its measured figures. A failed retry gets a failed row with `"attempt":2`.

**Second failure**: write `prompt.v3.txt` and `song.v3.params.json`, estimate them (free), open approve-next and go to step 11. A third attempt (`<project>_v3.<ext>`, attempt 3, its own lever and estimate, the waiver in the row) runs only after the owner answers approve-next a and the waiver is recorded (HR7, HR20).

Read `${CLAUDE_SKILL_DIR}/reference/retry.md` for every command of this step. The source kept the old file with a `_v1` suffix; here each attempt keeps its own name so its hash stays valid. 'Fine-tune' becomes the owner's next brief. 'Delete & restart' is dropped: files are never deleted.

## Step 11: deliver

**When a song was delivered**, copy the prompt file that produced the delivered take (`prompt.txt` for `<project>.<ext>`, `prompt.v2.txt` for `_v2`, `prompt.v3.txt` for `_v3`) and the lyrics beside it. On a run that ends without a song (cover, open or unanswered gate, Stop answer, denial) skip both copies.
`test -f artifacts/<project>/source/<prompt.txt | prompt.v2.txt | prompt.v3.txt> && cp artifacts/<project>/source/<prompt.txt | prompt.v2.txt | prompt.v3.txt> artifacts/<project>/audio/prompt.txt`
`test -f artifacts/<project>/source/lyrics.txt && cp artifacts/<project>/source/lyrics.txt artifacts/<project>/audio/lyrics.txt`

Always:
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>`
`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>`

Write `artifacts/<project>/PROGRESS.md` (media-ai-gen skeleton) with six sections: `## Summary` (the delivery line; this is the delivery note), `## Decisions` (step 2 line, preview record, planning values, defaults), `## Asset inventory` (each file; `manifest.json` is the map from file to prompt and model), `## Pipeline` (steps, endpoints, request ids, quotes, credits), `## Known gaps` (debts, review items, any open gate), `## Next steps` (a brief that answers a gate must name the project `<project>`). Check it:
`node -e "const t=require('fs').readFileSync('artifacts/<project>/PROGRESS.md','utf8');const need=['Summary','Decisions','Asset inventory','Pipeline','Known gaps','Next steps'];const miss=need.filter(h=>!t.includes('## '+h));console.log(JSON.stringify({missing:miss}));process.exit(miss.length?1:0)"`

Outcome:
- A song was delivered (the latest attempt that passed step 9): write `done`, overwriting an earlier gate's `partial`:
  `node -e "require('fs').writeFileSync('artifacts/<project>/outcome.json',JSON.stringify({status:'done',delivered:'audio/<delivered file>',credits:<spent>,debts:[<debts>]}))"`
- A gate opened in this run, a cover stop, or a Stop answer whose gate already left `partial`: leave outcome.json as it is.
- A vocal route denial, an exit-8 stale pick, an estimate that failed twice, or exit 5: write `partial`:
  `node -e "require('fs').writeFileSync('artifacts/<project>/outcome.json',JSON.stringify({status:'partial',reason:'<denial or stop reason>',credits:<spent>}))"`

Then check the pack (completeness, wiring and the budget sum; it never judges the music): `node ${CLAUDE_SKILL_DIR}/scripts/validate.mjs artifacts/<project> --budget <budget>`. This check is required on every job that wrote outcome.json, before the status step: the job is not finished until it prints `"ok": true`. Fix what it names and run it again until it exits 0.

Close the reply with the delivery line: the delivered file's path and endpoint; category and lyrics language; measured duration; defaults taken; credits spent; debts (markers fixed, lyrics replaced as non-original, loudness figures for review, 'not checked' items, cover not runnable, route denied); and the folder tree with its file count.

## Cover Mode (not runnable on SL8)

Generate a cover version of a song based on reference audio. Model: `music-cover-free`.

**Reference audio requirements**: mp3, wav, flac — duration 6s to 6min, max 50MB.
If no lyrics are provided, the original lyrics are extracted via ASR automatically.

When the brief asks for a cover, read its inputs from the brief, never by asking:
1. The source audio, a file in `artifacts/attachments/` or a URL.
2. The target cover style (e.g., "acoustic cover, stripped-down, intimate vocal").
3. Any custom lyrics or lyrics file.

The cover route is a **gap** (T24): fal has no MiniMax cover endpoint and no Studio skill teaches one. Step 2 records the debt 'cover not runnable on SL8 (T24)' and ends partial before any spend; no substitute route runs. The cover's commands and its optional settings (seed, channel, format, sample rate, bitrate) have no route either. If a cover brief promises an attachment that is not there, name that too.

## Important Notes

- **Prompt language**: The API prompt works best with English tags. Chinese tags are also
  acceptable. Mixing is OK.

- **Section markers in lyrics**: The API recognizes `[verse]`, `[chorus]`, `[bridge]`,
  `[outro]`, `[intro]`. Always include them in the `lyrics` field (written `[Verse]`, `[Chorus]` and so on, step 4).

- **Structured params**: on this route they are not fields. Write genre, mood, vocals, instruments, BPM and the rest as sentences in `prompt` (T23).

**Lyrics language rule**:
- Default lyrics language = the user's language. A Chinese-speaking user gets Chinese lyrics;
  an English-speaking user gets English lyrics.
- Only generate lyrics in a different language if the user **explicitly** requests it.
- When a different lyrics language is needed, embed it naturally into the vocal or genre
  description in the prompt. For example, instead of appending "with Korean lyrics", use
  "featuring a Korean female vocalist" or specify a genre that implies the language (e.g.,
  "K-pop", "J-rock", "Mandopop", "Latin pop").

- **Lyrics language via style**: When the user wants lyrics in a specific language, express
  it through the vocal description or genre (e.g., "Japanese female vocalist", "Mandopop
  ballad") rather than appending a language directive to the prompt.

House rules (load `media-ai-gen` before the first ai-gen call): estimate every paid step first (HR5); never resubmit a job that may exist (HR6); one retry (HR7); deliverables under `artifacts/<project>/` (HR8); one manifest row per generation (HR9); never ask: defaults and gates, and a Stop answer spends nothing (HR12); never install (HR21).

## Appendix: Prompt Writing Guide

See `${CLAUDE_SKILL_DIR}/reference/prompt-guide.md` for the complete prompt writing guide,
including genre/vocal/instrument references and BPM tables. Read it in step 3 before writing the prompt.

## On SL8

This kit runs on the SL8 Video Studio. Load `media-ai-gen` (Skill tool) before the first `ai-gen` call and follow its house rules (HR-1.0): estimate every paid step first and keep a running total (HR5); never resubmit a job that may exist (HR6); deliverables go under `artifacts/<project>/` (HR8); one manifest row per generation (HR9); never ask the user: use the defaults above, and open a gate if a step would spend past what the brief approved (HR12); never install anything (HR21).
