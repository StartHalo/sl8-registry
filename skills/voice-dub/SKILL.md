---
name: voice-dub
description: >-
  Dubs a customer's finished video into other languages with the same presenter: their voice
  carried over, lips optionally re-synced, captions burned or as SRT, or an audio-only track.
  HeyGen's translate decision layer (discovery, consent, triage, five content profiles, proofread
  choice, one delivery line per language) over fal ElevenLabs dubbing and sync-lipsync through
  ai-gen, with a subtitle-review route (Scribe v2, reviewed translation, a voice per cue).
  Use when: dub or translate this video, make it in Spanish and French, localise a talking head,
  interview or podcast, re-sync lips to a translated track the customer supplies. NOT for: a new
  video in another language from a script (voice-presenter-video); cloning a voice on its own
  (voice-clone-setup); replacing a line in the same language (voice-line-replace); a voiceover or a
  transcript alone (media-audio-generation); captions without translation (edit-captions); measuring
  files (media-qc).
license: SL8 wording and SL8-authored scripts; decision layer, locale tables and customer messages adapted from HeyGen heygen-translate (MIT, heygen-com/skills); fal audio points used with attribution; HeyGen legacy and CLI schema points restated and cited
compatibility: "sl8-video >=1.5.0 (sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; media-audio-generation (Video 1.5.0); ffmpeg and ffprobe 5.1; python3 3.11 with opencv; yt-dlp (Video 1.5.0, new); fonts-noto; fal endpoints as of 2026-10-27"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [heygen/heygentranslate-6301ed, heygen/retired-videotranslate-579d98, heygen/heygen-cli-request-schemas-video-translate, fal/falaudiogeneration-ba1a03, fal/ugc-3c015f]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27)
  approach: WF23-a1
  attribution: Method from the SL8 capability assessment (WF23-a1) after HeyGen's heygen-translate 3.2.0 (MIT, heygen-com/skills), whose decision layer, locale guide and customer messages are adapted; its legacy video-translate and the heygen CLI request schemas restated as contracts; points from fal audio generation and UGC (fal agent skills, used with attribution); scripts written by SL8
  deltas: VID-D480..VID-D499, VID-D606..VID-D607
---

# Dub a video into another language

The customer's finished video, translated and dubbed per target language, with the same presenter
and their voice carried over. HeyGen's value is its decision layer, kept here: one discovery round,
a silent pre-flight, silent waiting, one delivery line per language. HeyGen's engine is not on this
machine (no HeyGen key, no HeyGen CLI): the engine is `ai-gen` calls on fal. **Nothing here has run
on SL8 yet**: the first live run should be one 30–60 s close-up clip into one language, before any
batch.

```bash
D=$HOME/.agents/skills/voice-dub/scripts
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
```

Load **media-ai-gen** (commands, manifest, gates) and **media-audio-generation** (consent forms,
voice registry, Scribe and TTS fields) with the Skill tool before step 2. Every model and route below
is a default: a kit or brief may name another.

**Routes** (pick in step 9; P/B are the assessment's path ids):
- **Standard** (proofread off): dub per language → lip re-sync or keep the picture → mux. P1, P2.
- **Audio-only**: dub the audio → MP3. P3.
- **Proofread**: transcript → reviewed SRT → a voice per cue → track → lip re-sync or keep the
  picture → mux. P4 (cloned voice), P5 (stock voice), P6 (no re-sync, sidecar SRT). Needs a
  reviewer who reads the target (step 18); with none it ends `partial` at a gate.
- **Own dub track**: the customer's translated audio, lip re-sync only. P7.

## Phase 1: route, consent, discovery

1. **Route.** Run only when a finished video **with speech** exists and the customer wants it in
   another language. Not this skill (say so in one line; never load another workflow): a new video
   in another language from a script, avatar creation, TTS-only, text-only translation, a silent or
   animation-only source (it fails at the audio step). Check the audio stream:
   `ffprobe -v error -show_streams -select_streams a <source>` (no stream: stop).
2. **Consent gate.** Dubbing carries the speaker's voice into the new language, and lip re-sync
   changes their face: before step 11, record consent for **every person who speaks or appears** in
   `artifacts/<p>/consent.json`: `{"speakers":[{"name":"<name>","consent":"owner"}, …]}`, one entry per
   speaker, each in exactly one of the two forms media-audio-generation admits: `"owner"` or
   `"written permission from <name>"`. Parody, internal-only or "only a test" framing is not consent;
   a legal assurance is neither form; a named real person the customer neither is nor holds
   permission for is refused (HR17). The gate is a script: once the speaker count is known (step 3),
   `python3 $D/consent.py artifacts/<p>/consent.json --speakers <n>` must print `CONSENT OK` (exit 3
   blocks); its printout is the step's artefact and its first line opens steps 4 and 11. **An empty
   or failing consent blocks steps 4-21.** With no consent, deliver nothing paid: say what is needed
   (consent text in [messages.md](references/messages.md)). Step 19 writes the cloned voice into
   media-audio-generation's voice registry with the same `consent` value, which is the record that
   skill reads (it blocks a cloned voice with consent null). **A real person's voice or face is
   refused until SL8's consent text and privacy note are approved** (owner decision pending,
   learnings VID-L499): say so in one line and stop; the two recorded forms are necessary, not
   sufficient. Whether a stock-voice dub without re-sync may run without consent is also pending
   (VID-L484); until then it does not.
3. **Discovery** (the only phase that asks; phases 2 and 3 are silent). Take everything the brief,
   kit or message already gives. Required: the source (a link or a file) and the target language(s),
   asked as an open question, no picker. Important, with defaults: speaker count (default 1 for one
   person on camera; content with more than one person needs the exact count, never taken from
   metadata or the filename); content type (inferred, step 8); captions (on for talking head and
   corporate, off for podcast); duration (flexible). Optional: glossary or do-not-translate terms; a
   partial range (start and end in seconds); proofread before render (step 9).
   - **No question tool (HR12).** In a conversation, ask at most two questions per message in the
     customer's language ([messages.md](references/messages.md)) and end the turn. In a job with no
     one to answer, defaults stand and the delivery names them; the inputs the method never
     defaults (source, target language, the speaker count of multi-person content, a bare
     "Portuguese", consent) stop the job **before any spend**:
     `node $S/gate.mjs open --project <p> --slug dub-inputs --question "<what is missing>" --options '[{"id":"provide","label":"Provide the missing input"},{"id":"stop","label":"Stop here"}]' --resume-at "step 3"`
     and end `partial` (owner decision pending, learnings VID-L483).
4. **Quote, test clip.** Credits only (about 250 credits = $1). Run the consent check first (step 2).
   Recorded figures: dubbing 150 credits per **started** minute per language (media-audio-generation
   facts, 2026-10-05); `fal-ai/sync-lipsync/v2` about 750 credits per started minute (proxy estimate,
   media-video-generation facts, 2026-10-16); Scribe v2 2 credits a minute (+30% with keyterms);
   MiniMax clone 375 per speaker; `speech-2.8-hd` about 25 per 1,000 characters; audio isolation
   unpriced. The quote is the arithmetic: rate × started minutes × languages, for every call of the
   fan-out, **including the Scribe calls** (one per language for caption timing, one per language for
   step 22, one for the source on the proofread path). `ai-gen estimate` takes `--params-file` or
   `k=v`, not media flags, so it sees one minute only: run it on the params file you will send to
   confirm the registry's one-minute basis, and cap each call with `--max-cost <the arithmetic>` (HR5,
   HR22). Proofread cues: every TTS call pays a per-call floor (commands.md known defects), so a cue
   is `max(floor, characters / 1000 × 25)` with the floor read from a one-cue `estimate`. Sum all of
   it, compare with `node $S/manifest.mjs budget --project <p>`, and over budget, unpriced (exit 12)
   or with no budget known, open a spend gate and end `partial` (HR12). For batches, quote source
   minutes × languages plus the credit figure (cost line in messages.md). First-time customers get a
   30–60 s test clip first:
   `ffmpeg -ss 0 -t 45 -i work/<p>/source.mp4 -c:v libx264 -crf 18 -c:a aac work/<p>/test.mp4`;
   a test still bills one minute per model.

## Phase 2: pre-flight (silent)

5. **Languages.** Resolve each request against [languages.json](references/languages.json): a
   display name with region (for delivery and the proofread translation), the ISO 639-1
   `target_lang` for dubbing and the ISO 639-3 `language_code` for Scribe. Defaults: Spanish → Spain,
   Chinese/Mandarin → Mandarin Simplified, Taiwan → Taiwanese Mandarin Traditional, Hong Kong →
   Cantonese Traditional (a different language), French, German, Japanese, Korean → the main region;
   Portuguese is always asked. No match: offer the two or three closest names. A region variant
   reaches the voice only on the proofread path: record it and say so. Register defaults and the
   regional tables are in [locale-guide.md](references/locale-guide.md); a conversational source
   into ja, ko, th, de or hi goes to the proofread path.
6. **Source onto the machine.** Every later step needs a local copy: `work/<p>/source.mp4` (and a
   copy under `artifacts/<p>/source/`). Link handling, the probe command and the re-encode fallback
   are in [source-links.md](references/source-links.md): a ranged GET (not HEAD) decides, a login
   is never got round. A partial range: cut it now
   (`ffmpeg -ss <start> -to <end> -i … -c:v libx264 -c:a aac …`) and keep the offset for captions.
   **Audio copies are compressed**, never WAV (about 11 MB a minute): the dubbing audio input,
   isolation and the audio-only route use
   `ffmpeg -i work/<p>/source.mp4 -vn -ac 2 -ar 44100 -c:a libmp3lame -b:a 128k work/<p>/source.mp3`;
   Scribe uses `ffmpeg -i work/<p>/source.mp4 -vn -ac 1 -ar 16000 -c:a libmp3lame -b:a 64k work/<p>/speech16.mp3`.
   Scribe lists no input formats: the first run tests mp3 on the free `ai-gen info` read. The upload
   limit is unread (VID-L481); a call that fails with exit 2 is re-encoded smaller, audio as well
   as video.
7. **Triage** (first ~10 s for frames and sound, cuts over the whole file):
   `python3 $D/triage.py work/<p>/source.mp4 --out-dir work/<p>/triage`, then look at the frames it
   writes. Read the flags with the lip-sync ceiling: best on steady, front-facing, well-lit faces of
   720p or more with long takes; worse on profile, looking-down or covered faces, shots under 2 s,
   low light or blur, fast head movement. Burned-in source captions stay in the source language: two
   caption layers unless new captions are off. A close-up talking head into zh, yue, ja, ar, ru or ko:
   propose a test clip. Send the disclaimer **now**, before any spend, never after a bad result
   (texts in messages.md). With no one to answer, the default is the original picture (no re-sync)
   whenever a flag from the lip-sync-hard list is set; the delivery line says so and offers the
   re-sync as a second paid step. Whether speech is clear or a music bed dominates is **not judged by
   listening**: see step 22's note; use the triage levels, the customer's description and the step 16
   transcript.
8. **Content profile** (pick one silently; ask only when genuinely ambiguous; never list all five).
   Write the choice to `work/<p>/flags.json` with the duration policy and caption setting.

   | Profile | Use when | This machine |
   |---|---|---|
   | **Talking head / presenter** (default) | One person speaks to camera; clean audio | dubbing (`num_speakers` 1, `highest_resolution` true) → lip re-sync on the original footage; captions on; flexible duration; output re-encoded to the source resolution and bitrate |
   | **Podcast / audio-only** | The visual is static, does not matter, or does not exist | dubbing on the audio; no lip-sync; MP3; no burned captions, sidecar SRT delivered |
   | **Music / high-soundtrack** | Background music interferes with speech | audio isolation first (step 10), dub the speech; the original bed only from a supplied music-and-effects stem; flexible duration; source format kept |
   | **Multi-speaker** | Two or more distinct speakers | Talking-head settings + `num_speakers: <count>`. The count is REQUIRED here: never guessed. Over three: warn about voice swaps |
   | **Corporate / branded** | Brand voice, glossary discipline, high stakes | Talking-head settings with the original picture kept (no re-sync) unless the customer asks for matched mouths + the proofread path |

   Duration tolerance (ours, untested): flexible, the final within +25% and -15% of the source; fixed, 0.2 s.
   Default: the highest-quality lip-sync setting unless the customer asks for fast; flexible duration
   unless they need exact length (en→zh/ja/ko run shorter; de→en, ja→en longer; ar/he/ur add RTL and
   register shifts); the final file re-encoded to the source resolution and bitrate; no watermark.
   An RTL target over source lower-thirds: sidecar SRT or audio-only.
9. **Proofread decision.** Default off. Propose it on, without asking, when two or more apply: over
   3 minutes; corporate or branded; legal, medical or educational; the customer reads the target
   natively; named entities; a high-formality target from a conversational source; RTL. Skip it for
   short (under 60 s) low-stakes clips or "just go". If nobody can read the target, do not run it as
   a checkbox: lower expectations, suggest a test clip, deliver the video plus a sidecar SRT for a
   native colleague. Glossary terms act only on the proofread path (keyterms, translation, edits).
   Fallbacks: the proofread path if the dubbing model is not enabled or a region is needed;
   audio-only or the original picture if no usable face or no lip-sync model.

## Phase 3: submit and wait (silent)

Every paid call: a params file under `work/<p>/` first (HR4: pin every field you set), `ai-gen info
<model> --format json` once per model per session (the live schema wins over this text; a not-found
exit means the model is not enabled: step 24), the quote from step 4, `--max-cost`. Local files go in
only through the media flags (`--video`, `--audio-file`): a path inside a params file or a `k=v`
value is not uploaded. `-o` is a **directory**.

**Recording (HR1, HR9).** A `--async` submit envelope has no files, so add the manifest row **after
the poll**, from the envelope the poll saved, with the outputs where the poll put them (`add` takes
files from the envelope's `files[].local_path` and fails on a renamed file: add first, rename after,
then `node $S/manifest.mjs verify --project <p>`):
`node $S/manifest.mjs add --project <p> --result artifacts/<p>/clips_<lang>/result.json --params work/<p>/dub_<lang>.params.json --json '{"item":"dub_<lang>","node":"clips_<lang>","declared":{"duration_s":<d>,"audio":true},"credits":{"estimate":<q>}}'`.
`declared` per route: dubbing, the source duration in flags.json (step 8 writes `duration_s` there)
and audio yes (add `"width"`, `"height"` when a video returns); lip re-sync, the dub's duration and
the source width and height; a cue or the clone, `"audio":true` and the cue's expected seconds.

10. **Speech isolation** (music or noise only; on a clean take it thins the voice):
    from `work/<p>/source.mp3` (step 6),
    `ai-gen run fal-ai/elevenlabs/audio-isolation --audio-file work/<p>/source.mp3 --queue --strict-params --max-cost <q> -o artifacts/<p>/clips/ --format json > work/<p>/isolate.json`.
    It returns speech only: the original bed cannot be rebuilt from it. Feed it to step 11 (with
    `--audio-file`) only when the source is noisy. The bed comes back only from a supplied
    music-and-effects stem; with none, the delivery says the original bed is lost.
11. **Dub, one job per language, in parallel** (skip for an own dub track: go to step 13).
    `work/<p>/dub_<lang>.params.json`: `{"target_lang":"<639-1>","num_speakers":<n>,"highest_resolution":true}`
    (`source_lang` only when known). Then
    `ai-gen run fal-ai/elevenlabs/dubbing --params-file work/<p>/dub_<lang>.params.json --video work/<p>/source.mp4 --async --strict-params --max-cost <q> --format json > work/<p>/dub_<lang>.submit.json`
    (for audio-only or isolated speech replace `--video` with `--audio-file work/<p>/source.mp3`, never
    both: the schema takes the video if both are given and dubs the noisy original). Append the request id and
    language to `work/<p>/ids.txt` at once. Only ai-gen talks to fal: no raw HTTP to the gateway.
12. **Wait**, one backgrounded Bash call per language (never a subagent: it does not inherit Bash
    approvals):
    `bash $D/poll_dub.sh <request-id> <lang> artifacts/<p>/clips_<lang>/ fal-ai/elevenlabs/dubbing`.
    It polls with `ai-gen result` (30 s for the first 3 minutes, then 60 s; stuck at 60 minutes),
    keeps the language in `TARGET_LANG` (never `LANG`, the locale variable), stops after three failed
    or empty polls in a row, stops on an unknown status word, and treats a timeout on a running job
    as still running. Speak only on a finished language, a hard failure, or once after a stall over
    5 minutes; deliver each language as it lands. **There is no cancel**: `ai-gen cancel` exits 12,
    so a stuck job keeps running and is billed. Never resubmit a job id that exists (HR6): fetch it
    later with `ai-gen result <id>`; a second submission is a new paid render and needs a new quote
    and the customer's yes. The rebuilt proofread calls use this same loop. The envelope's `files[]`
    are the outputs: take the audio file if one came back, else demux the speech from the video
    (`ffmpeg -i <dub>.mp4 -vn -c:a aac work/<p>/dub_<lang>.m4a`).
13. **Picture length, then lip re-sync.** All routes first: `ffprobe` the duration of the dub (or the
    track) and of the picture, and always build `work/<p>/picture_<lang>.mp4`. Dub longer by `d`
    seconds: under the flexible policy hold the last frame
    (`ffmpeg -i work/<p>/source.mp4 -vf tpad=stop_mode=clone:stop_duration=<d> -an work/<p>/picture_<lang>.mp4`)
    when `d` is 3 s or less (ours, untested), above that put the choice to the customer (a held tail
    that long, or the fixed policy); under the fixed policy the dub goes back for a shorter rewrite
    (proofread) or is rejected. Dub equal or shorter: `-c copy` the picture; the mux pads the audio
    with silence (step 14). Then the lip re-sync, an option: default on for talking head and multi-speaker, off for corporate,
    branded or technical content, audio-only and unusable faces:
    `ai-gen run fal-ai/sync-lipsync/v2 --params-file work/<p>/lips_<lang>.params.json --video work/<p>/picture_<lang>.mp4 --audio-file work/<p>/dub_<lang>.m4a --async --strict-params --max-cost <q> --format json > work/<p>/lips_<lang>.submit.json`
    and step 12's loop with its own directory, `artifacts/<p>/lips_<lang>/` (never the dub's, whose
    `result.json` and log it would overwrite). The params file is not recorded anywhere: before the
    first paid run, read `ai-gen info fal-ai/sync-lipsync/v2 --format json` (free), record it as a
    facts row (VID-L481) and pin every field you set, at least the sync mode for a length mismatch,
    the model tier, temperature and active-speaker detection, under whatever names the schema gives
    them. `fal-ai/sync-lipsync/v3` is a candidate to confirm the same way; v2
    stays the default. The model needs clean audio and can change more than the mouth: compare body,
    background and timing with the source (step 22). Face drift: shorten the segment or clean the
    audio, then one retry (HR7).
14. **Assemble.** Mux the dubbed speech (plus a supplied music-and-effects stem, mixed with
    `amix=inputs=2:normalize=0`) onto the re-synced or original picture, re-encoded to the source
    width, height and bitrate, the length bound to the picture so neither a tail of black nor a silent
    tail video appears:
    `ffmpeg -i <picture> -i work/<p>/dub_<lang>.m4a -map 0:v -map 1:a -af apad -t <picture duration> -c:v libx264 -b:v <source bitrate> -c:a aac -movflags +faststart artifacts/<p>/final_<lang>/<title>_<lang>.mp4`.
    Captions: on the standard path, demux the dub to a small file
    (`ffmpeg -i work/<p>/dub_<lang>.m4a -vn -ac 1 -ar 16000 -c:a libmp3lame -b:a 64k work/<p>/dub_<lang>_stt.mp3`),
    transcribe it (step 16's call on that file, `diarize` false) and build the SRT with
    `python3 $D/words_to_srt.py work/<p>/stt_<lang>.json --srt artifacts/<p>/final_<lang>/<title>_<lang>.srt --vtt artifacts/<p>/final_<lang>/<title>_<lang>.vtt [--shift <range start>]`;
    on the proofread path use the edited SRT (step 21 retimes it). Burn with `-vf "subtitles=<srt>:force_style='Alignment=2'"`
    in the same encode (check `ffmpeg -filters | grep subtitles` first; a non-Latin target needs a
    `fonts-noto` face; RTL captions away from source lower-thirds), or deliver the sidecar. No new
    captions over burned-in source captions unless the customer insists.
15. **Audio-only.** Dub with `--audio-file work/<p>/source.mp3` (no `--video`), take the audio file the
    envelope returns (or demux it from a returned video), and convert it:
    `ffmpeg -i <dubbed audio> -c:a libmp3lame -b:a 192k artifacts/<p>/final_<lang>/<title>_<lang>.mp3`
    (check `ffmpeg -encoders | grep libmp3lame`; none: deliver `.m4a` and say so). Podcast sidecar
    SRT: demux the MP3 to `work/<p>/dub_<lang>_stt.mp3` as in step 14, transcribe it (step 16's call),
    `words_to_srt.py` as in step 14, and deliver the `.srt` beside the MP3. It is a translated
    track to lay over their own video, not a fix for bad lip-sync.

### The proofread path (steps 16-21, replacing step 11)

16. **Transcript.** `work/<p>/stt_src.params.json`: `{"language_code":"<639-3>","diarize":true,"tag_audio_events":false,"keyterms":["<term>", …]}`
    (`diarize` true only where the speaker count matters; at most 100 keyterms, +30% price). Then
    `ai-gen transcribe work/<p>/speech16.mp3 -m fal-ai/elevenlabs/speech-to-text/scribe-v2 --params-file work/<p>/stt_src.params.json --queue --max-cost <q> --format json > work/<p>/stt_src.json`
    (no `-o`; no `--strict-params`, because `transcribe` adds a `task` field Scribe does not list;
    `speech16.mp3` is step 6's compressed copy).
    `python3 $D/words_to_srt.py work/<p>/stt_src.json --srt work/<p>/<title>_original.srt --speakers <n>`
    keeps only `type` "word" entries and exits 3 when the diarized count differs from the confirmed
    one: stop and settle the count. Titles are filename-safe.
17. **Translate the cue text only** (you, in the session): never touch a timecode; the region from
    step 5, the register from the locale guide, glossary terms kept as written, and a length budget
    per cue (`python3 $D/srt_tools.py budget work/<p>/<title>_original.srt --expansion <pair>`; the
    formula is ours, untested). Write `work/<p>/<title>_<lang>.srt`. The original SRT is reference
    only, never a target. This wording was tuned by HeyGen for its own engine and has not been run on
    the models used here.
18. **Review with the customer** (or their native colleague). Glossary: show the list, then
    `python3 $D/srt_tools.py glossary <srt> --terms work/<p>/terms.json` lists every match, and
    `--apply --out <srt>` writes it once confirmed. Register: line by line for ja, ko and th, a
    confirmed batch for de, fr and es. Spot-check numbers, currency, dates, units (imperial is not
    converted) and literal idioms (locale-guide.md). Then
    `python3 $D/srt_tools.py check work/<p>/<title>_original.srt work/<p>/<title>_<lang>.srt` must
    exit 0: it fails only on a changed cue count or timecode or an empty cue; a cue left unchanged
    (a name, a number, "OK", a kept glossary term) is a warning to read, not an edit to make. For
    ja, ko, zh and th the glossary matches without word boundaries. In a job with no one to review: open a gate with the SRT and end `partial` (learnings
    VID-L483).
19. **A voice per cue.** Cloned voice (default when consent is recorded): a clean sample of 10 s or
    more per speaker cut from the source audio (from the isolated audio only when the source is
    noisy), `ai-gen run fal-ai/minimax/voice-clone --audio-file work/<p>/spk1.wav --queue --strict-params --max-cost <q> -o artifacts/<p>/voices/ --format json`
    → `custom_voice_id`. Store the sample and the consent with it, not only the id, and add the voice to
    media-audio-generation's voice registry with the same `consent` value as consent.json: an id
    unused for 7 days is deleted, so a re-run clones again. Per cue (or per sentence group),
    `{"prompt":"<cue text>","voice_setting":{"voice_id":"<custom_voice_id>"},"output_format":"url"}` to
    `ai-gen run fal-ai/minimax/speech-2.8-hd --params-file … --queue --strict-params --max-cost <q> -o artifacts/<p>/clips_<lang>/cues/ --format json`,
    renamed to `cue_NNN.mp3` (NNN = the SRT cue number). Stock voice: `fal-ai/elevenlabs/tts/multilingual-v2`
    with `{"text":"<cue>","voice":"<preset>","language_code":"<639-1>","apply_text_normalization":"on"}`
    (always MP3), one preset per speaker from media-audio-generation's registry, never chosen for
    resemblance to anyone. MiniMax and ElevenLabs voice ids are separate namespaces, so an id from one does not carry to the other.
20. **Fit the cues and build the track:**
    `python3 $D/srt_tools.py track work/<p>/<title>_<lang>.srt --cues-dir artifacts/<p>/clips_<lang>/cues --out work/<p>/track_<lang>.wav --policy flexible|fixed --source-duration <s>`.
    Flexible: each cue at its start time, a long cue pushes the next ones, the picture is held to
    match (step 13), and the captions are retimed to the placed starts:
    `python3 $D/srt_tools.py retime work/<p>/<title>_<lang>.srt work/<p>/track_<lang>.wav.json --out work/<p>/<title>_<lang>.placed.srt`
    (the source-time SRT is only right for the fixed policy). Fixed: overflowing cues are listed (exit 4) and go back to step 17 to be
    rewritten shorter, at most twice each. **Never fix length by time-stretching, speed changes or
    trimming the tail**; a short cue is padded with silence. Mix a supplied music-and-effects stem
    here, if any.
21. **Re-sync and assemble** as steps 13-14, with the track as the audio, sent small
    (`ffmpeg -i work/<p>/track_<lang>.wav -c:a aac -b:a 128k work/<p>/track_<lang>.m4a`, used as
    `dub_<lang>.m4a` is above), and as the captions the `.placed.srt` under the flexible policy or
    the edited SRT under the fixed one (burned or sidecar; sidecar is cleanest for RTL,
    brand-styled captions and accessibility).

## Phase 4: check and deliver

22. **Output QC**, per language (ours; thresholds untested). Demux the final file for both
    transcriptions: `ffmpeg -i <final> -vn -ac 1 -ar 16000 -c:a libmp3lame -b:a 64k work/<p>/final_<lang>_stt.mp3`
    (the lip-synced file's audio is the track under test, not `dub_<lang>.m4a`).
    - `node $Q streams <final> --audio yes`, and `ffprobe` duration against the source inside the
      step 8 tolerance, width and height equal to the source. Proofread, flexible: rerun step 20's
      `retime` with `--max-end <final duration>` (exit 4: the captions outrun the file).
    - Frames every 5 s and at each cut (`ffmpeg -i <final> -vf fps=1/5 work/<p>/qc_<lang>_%03d.png`),
      looked at beside the source frames: mouth on close-ups, and body, background and timing
      unchanged. This review is the customer's judgment, not a PASS (HR14).
    - Back-transcribe (step 16's call on the demuxed file, the target `language_code`, `diarize` true
      for multi-speaker), then
      `python3 $D/srt_tools.py compare <target srt or the request text as an srt> work/<p>/stt_qc_<lang>.json --language <639-3> [--terms terms.json]`:
      it prints the token overlap against the 0.8 threshold (ours), numbers and glossary terms found,
      and the language; exit 5 fails. Also read the diarized speaker count (a wrong voice is almost
      always a wrong speaker count) and no source-language residue.
    - **Audio-only** (an MP3, no picture): `ffprobe` the duration inside the tolerance, the codec
      and sample rate, the back-transcription and `compare` as above; no frames, no width or height.
    - **Listening is not offered on this machine yet** (the agent cannot hear audio): voice match,
      gender, age, prosody and voice swaps are measured as above or judged by the customer; never
      claim them (HR14).
    A language that fails is held (step 24), the others are delivered, and the debt is named (HR15).
23. **Deliver** one message per finished language as it lands (format in messages.md): language with
    region, the file under `artifacts/<p>/final_<lang>/`, duration, lips re-synced or picture kept,
    captions on or off; a flipped caption default, a default language mapping, a lost music bed, a
    sidecar SRT, or an audio-only track each get one line. No ids or JSON. Update
    `artifacts/<p>/PROGRESS.md` as each language lands (HR15: name any debt still owed).
24. **Failures**: one cause line and one next action per language, from the decoder in
    messages.md; classify on the envelope's `error.code` and exit code, not on message words. A
    timeout on a job that is still running is not a failure. No retry menu unless asked. The next
    action:

    | What happened | Next action |
    |---|---|
    | `ai-gen info` finds no such model (not enabled) | proofread path with the named alternative voice route, a spend gate if unpriced; or audio-only; say which |
    | exit 2 or 413, payload too large | re-encode smaller (step 6), once |
    | face drift, or lip-sync fails | one retry with a shorter segment or cleaner audio (HR7), then the original picture |
    | QC fails for a language | hold that language, deliver the others, name the debt (HR15) |
    | gateway or model error | `ai-gen doctor`, `ffprobe` the source, report the model's message as provider-side |

## House rules (HR-1.0)

Relies on: HR1 (duration, size and streams declared in flags.json and measured), HR2 and HR4 (every
field set is checked against `ai-gen info` and pinned), HR3, HR5 (every paid call quoted, the
fan-out summed against the budget), HR6 (no resubmission; no cancel exists), HR7 (one retry per
language, then audio-only or the original picture), HR8, HR9, HR10 (captions burned in the final
encode), HR11 (re-sync and mux always from the original footage), HR12 (no question tool; defaults
stated; spend past the budget is a gate), HR13 (triage, SRT checks and track fitting are scripts),
HR14 (no PASS on lip-sync or voice), HR15, HR17 (consent before any voice is carried or lips
re-synced), HR18 (the translation adds no claims), HR19, HR20, HR21 (no installs), HR22 (prices
and fields from the facts files and live `ai-gen`) — see media-ai-gen/references/house-rules.md.
Not applicable: HR16 (no prompt is rewritten by these routes).
Departs by method from HR12 (owner decision pending, learnings VID-L483): the inputs the method never
defaults stop a job at a gate before any spend instead of proceeding.
