# Audio facts, dated

Every number, id, field and default this skill relies on, one row each, in the shape of the D2c
facts ledger (§4) of the 2026-10-05 media research program (sl8-pipeline repo, `docs/explore/`):
an id, the endpoint, the fact, its kind, the date it was true, its source and the free command that
re-checks it. A scripted verifier comes in an increment; until then re-check by hand before relying
on a row older than its kind allows (schema and price rows: re-check at first use in a session).
A row marked **unverified** is a claim nobody has measured on SL8: use it, and say so.

## Contents

- [Sources and kinds](#sources-and-kinds)
- [Rate](#rate)
- [Speaking rate](#speaking-rate)
- [Prices](#prices)
- [Schema: speech](#schema-speech)
- [Schema: transcription](#schema-transcription)
- [Schema: sound effects and music](#schema-sound-effects-and-music)
- [Schema: cloning](#schema-cloning)
- [ai-gen](#ai-gen)
- [Behaviour](#behaviour)

## Sources and kinds

- **D2c row n / Bn / Cn:** the research program's `D2-fal-agent-skills/D2c-facts-ledger.md` (rows
  checked against fal's live queue OpenAPI, **OA**, and fal's registry prices, **REG**, on
  2026-10-05; B-tests are the paid re-tests with their credit cost). **AG n:** line n of the
  pristine `fal-agent/fal-audio-generation/SKILL.md` in the repo (not a skill on this machine).
- **P1:** `P1-dialects-prices.md` and `P1-data/` (`ai-gen info` on 43 endpoints; fal list prices).
- **T3 #n:** `T3-sl8-prior-art.md`, fact n (each cites its run). **PG:** `PG-provider-guides/elevenlabs/`.
- **ai-gen source:** `studio/packages/worker/ai-gen/src/` at ai-gen 2.2.0.
- **Kinds:** `price` (re-check with `ai-gen estimate <id> --params-file p.json --format json`; the
  proxy figure wins), `schema` (re-check with media-ai-gen's raw OpenAPI check; `ai-gen info`
  shows a `const` as a default), `cli`, `behaviour` (a run; re-tested only by a paid test).
- Credits = US$ × 250. No audio price has been checked through the SL8 proxy; every price below is
  a **list** or registry price.

## Rate

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| rate-cr-per-usd | all | about 250 credits per US$; one proxy-verified point (Seedance 2.0 720p 5 s = 378 cr = $1.512) | price | 2026-10-05 | P1 takeaway 1; D2c §1b | `ai-gen estimate` on any priced id, compare with its list price |

## Speaking rate

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| rate-brian-ml2 | `fal-ai/elevenlabs/tts/multilingual-v2` | Brian, speed 1.0, English: 2.82 words/s (56 words in 19.83 s). **Unverified on SL8**; it is the seed in `voices.seed.json` | behaviour | fal export 2026-10-05 (undated run) | AG 209-210; D2c row 135 | D2c B8: three takes of the same 56-word script, ffprobe duration and `silencedetect`; about 30 cr |
| rate-ml2-spread | `fal-ai/elevenlabs/tts/multilingual-v2` | three renders at identical settings ran 2.93, 3.19 and 3.04 w/s (±4%); the route has no `seed`, so the spread cannot be controlled. These contradict the 2.82 seed | behaviour | fal export 2026-10-05 | AG 257-261; D2c row 136 | D2c B8 |
| rate-sl8-voice-timing | an earlier SL8 TTS pipeline | about 2.5 w/s; "prose estimates of narration length run ~2× long"; measure each block with ffprobe and `silencedetect -35dB 0.15s` | behaviour | 2026-07/08 | T3 #28 (`voice-timing/SKILL.md:17,30,39-47`) | D2c B8 |
| rate-set-inconsistent | fal's skill set | five rates across fal's skills: 2.4 (production `vo_words`), 2.7 ceiling, 2.8 × 0.9 (script writer), 2.82 (this skill), 2.5 × U (H3). On this machine one rate per voice comes from the registry | behaviour | 2026-10-05 | D2c row 137; RE-D2 learning 11 | — |

## Prices

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| price-eleven-v4 | `elevenlabs/tts/eleven-v4` | $0.08 per 1,000 characters = 20 cr per 1,000; 100 words (about 600 characters) ≈ 12 cr | price | 2026-10-05 | P1 §2 (Audio); `fal-public-pricing.json` | `ai-gen estimate elevenlabs/tts/eleven-v4 --params-file p.json --format json` |
| price-kokoro | `fal-ai/kokoro/american-english` | $0.02 per 1,000 characters = 5 cr per 1,000; 100 words ≈ 3 cr, but SL8 measured a per-call floor of about 5 cr against a ~1 cr estimate: batch lines per block, never per sentence | price | 2026-10-05 (floor 2026-07-22) | P1 §2; T3 #6; D2c §1c row 6 | estimate, then the ledger line of one call |
| price-minimax-speech | `fal-ai/minimax/speech-2.8-hd` | $0.10 per 1,000 characters (the page also says $0.06) = 25 or 15 cr per 1,000 | price | 2026-10-05 | P1 §2 | estimate with a 600-character `prompt` |
| price-minimax-clone | `fal-ai/minimax/voice-clone` | $1.50 per clone = 375 cr | price | 2026-10-05 | D2c row 123 (REG); P1 | estimate |
| price-dubbing | `fal-ai/elevenlabs/dubbing` | $0.60 per minute, **rounded up to whole minutes** = 150 cr per started minute; a 10 s dub bills a full minute | price | 2026-10-05 | D2c row 111 (REG), takeaway 6 | estimate with a 10 s input |
| price-music | `fal-ai/elevenlabs/music` | $0.60 per output minute, **rounded up** = 150 cr per started minute; a 20 s bed bills a full minute | price | 2026-10-05 | D2c row 114 (REG), takeaway 6 | estimate with `music_length_ms` 20000 |
| price-scribe-v2 | `fal-ai/elevenlabs/speech-to-text/scribe-v2` | $0.008 per input minute = 2 cr per minute; `keyterms` adds 30% | price | 2026-10-05 | D2c row 116 (REG) | estimate with a 60 s input |
| price-sonilo-t2s | `sonilo/v1.1/text-to-sound-effects` | $0.0018 per second = 0.45 cr per second | price | 2026-10-05 | D2c row 82 (REG) | estimate with `duration` 30 |
| price-unknown | `fal-ai/elevenlabs/tts/multilingual-v2`, `turbo-v2.5`, `eleven-v3`, `text-to-dialogue/eleven-v3`, `voice-changer`, `sound-effects/v2`, `audio-isolation`, `speech-to-text`; `fal-ai/minimax-music/v2.6`; `fal-ai/lyria3/pro`; `nvidia/nemotron-asr-multilingual/asr`; `fal-ai/cohere-transcribe`; `fal-ai/wizper`; `resemble-ai/chatterboxhd/text-to-speech`; `fal-ai/qwen-3-tts/clone-voice/1.7b` | **no price on record**. Run `ai-gen estimate` first; an exit 12 (unpriced) means the call is not capped, so it opens a gate (Step 0) | price | 2026-10-05 | P1 §2 (only three audio ids priced); D2c §1 | `ai-gen estimate <id> --params-file p.json --format json` |

## Schema: speech

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| schema-ml2-turbo | `fal-ai/elevenlabs/tts/multilingual-v2` · `turbo-v2.5` | identical: `text`*, `voice`, `stability` 0.5, `similarity_boost` 0.75, `style` 0, `speed` 0.7–1.2 (=1), `timestamps`, `previous_text`, `next_text`, `language_code`, `apply_text_normalization`; no `output_format` and no `seed` | schema | 2026-10-05 | D2c rows 101, 102, 136 (OA) | raw OpenAPI check |
| schema-voice-default | ElevenLabs TTS, v3, voice-changer, v4 | `voice` defaults to `Rachel` | schema | 2026-10-05 | D2c row 103 (OA, INFO) | raw OpenAPI check |
| schema-voice-names | ElevenLabs | `voice` takes a preset name or an ID; the dialogue schema's examples list 20 of the 21 presets AG names | schema | 2026-10-05 | D2c row 104 | raw OpenAPI check (`DialogueBlock`) |
| schema-v3 | `fal-ai/elevenlabs/tts/eleven-v3` | `text` ≤5,000 characters; no `speed`, `style`, `similarity_boost`, `previous_text` or `next_text` | schema | 2026-10-05 | D2c row 106 | raw OpenAPI check |
| schema-v3-tags | `fal-ai/elevenlabs/tts/eleven-v3` | audio tags (`[excited]`, `[whispers]` …): the v3 schema is silent; v4's says it supports them | schema | 2026-10-05 | D2c row 107 (unverifiable by schema) | PG elevenlabs 13, 17 |
| schema-v4 | `elevenlabs/tts/eleven-v4` (no `fal-ai/` prefix) | newer than fal's skill: `text`*, `voice` (=Rachel), `stability`, `similarity_boost`, `language_code`, `apply_text_normalization`, `timestamps`, `seed`, `output_format` (19 values, =`mp3_44100_128`); no `speed` or `style`. Not routed in 1.0.0 | schema | 2026-10-05 (schema updated 2026-10-02) | D2c row 108; P1 info | raw OpenAPI check |
| schema-dialogue | `fal-ai/elevenlabs/text-to-dialogue/eleven-v3` | `inputs`* [{text, voice}]; `stability` rounds to 0, 0.5 or 1; `use_speaker_boost`; `seed`; `language_code`; no speed | schema | 2026-10-05 | D2c row 109 | raw OpenAPI check |
| schema-voice-changer | `fal-ai/elevenlabs/voice-changer` | `audio_url`*, `voice`, `remove_background_noise` =false, `seed`, `output_format` =`mp3_44100_128` | schema | 2026-10-05 | D2c row 110 | raw OpenAPI check |
| schema-dubbing | `fal-ai/elevenlabs/dubbing` | `target_lang`* (ISO 639-1); `video_url` or `audio_url` (video wins); `source_lang` auto; `num_speakers` 1–50; `highest_resolution` =true; the output schema has only `video` | schema | 2026-10-05 | D2c rows 111, 112 | raw OpenAPI check |
| schema-isolation | `fal-ai/elevenlabs/audio-isolation` | `audio_url` or `video_url`; no options | schema | 2026-10-05 | D2c row 120 | raw OpenAPI check |
| schema-minimax-speech | `fal-ai/minimax/speech-2.8-hd` | text field `prompt`*; voice inside `voice_setting` (=`{voice_id: Wise_Woman, speed 1, vol 1, pitch 0}`); `output_format` url/**hex, default hex**; returns `audio` and `duration_ms` | schema | 2026-10-05 | D2c rows 121, 122; P1 §1, takeaway 11 | raw OpenAPI check |
| schema-kokoro | `fal-ai/kokoro/american-english` | text field `prompt` (=""); `voice` enum of 20 (`af_…`, `am_…`, =`af_heart`); `speed` 0.1–5. Not routed in 1.0.0 | schema | 2026-10-05 | P1 info | raw OpenAPI check |
| schema-formats-tiered | ElevenLabs music, SFX, voice-changer | `mp3_44100_192` "requires Creator tier", `pcm_44100` "requires Pro tier" per the field description; whether the proxy's account has them is untested | schema | 2026-10-05 | D2c row 115 (unverifiable by schema) | D2c B14, ≤10 cr |

## Schema: transcription

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| schema-scribe-v2 | `fal-ai/elevenlabs/speech-to-text/scribe-v2` | `audio_url`*; `language_code` ISO 639-3 (`eng`, `spa`, `deu`); `diarize` =true; `tag_audio_events` =true; `keyterms` ≤100 | schema | 2026-10-05 | D2c row 116 | raw OpenAPI check |
| schema-scribe-words | `fal-ai/elevenlabs/speech-to-text/scribe-v2` · `speech-to-text` | `words[]` of {text, start, end, type, speaker_id}; `type` is `word`, `spacing` or `audio_event` | schema | 2026-10-05 | D2c rows 117, 119 | raw OpenAPI check (`TranscriptionWord`) |
| schema-wizper | `fal-ai/wizper` | `chunk_level` is `const "segment"`: no word timings; `max_segment_len` 10–29; `language` =en | schema | 2026-10-05 | D2c row 128; T3 #28 | raw OpenAPI check (`ai-gen info` shows the const as a default) |
| schema-nemotron | `nvidia/nemotron-asr-multilingual/asr` | `language` =auto; `acceleration` none/regular/high/full (=regular); one `output` string, no timings | schema | 2026-10-05 | D2c row 129 | raw OpenAPI check |
| schema-cohere | `fal-ai/cohere-transcribe` | `language` =en; `punctuation`; `max_new_tokens` 1–1014 (=256); `timings` are server metrics, not word timings | schema | 2026-10-05 | D2c row 130 | raw OpenAPI check |

## Schema: sound effects and music

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| schema-sfx-v2 | `fal-ai/elevenlabs/sound-effects/v2` | `text` ≤450; `duration_seconds` 0.5–22; `prompt_influence` =0.3; `loop` =false | schema | 2026-10-05 | D2c row 113 | raw OpenAPI check |
| schema-sonilo-t2s | `sonilo/v1.1/text-to-sound-effects` | `duration` is a **number 0.5–180** (=8), not the integer 1–180 the skill's table says; `audio_format` =aac | schema | 2026-10-05 | D2c row 82 (contradicted, minor) | raw OpenAPI check |
| schema-music | `fal-ai/elevenlabs/music` | `prompt` ≤4,100 or `composition_plan`; `music_length_ms` 3,000–600,000; `force_instrumental` =false (prompt only); `respect_sections_durations` =true | schema | 2026-10-05 | D2c row 114 | raw OpenAPI check |
| schema-minimax-music | `fal-ai/minimax-music/v2.6` | `prompt` 10–2,000; `lyrics` ≤3,500 with tags; `lyrics_optimizer` =false; `is_instrumental`; no length field. "MP3 192k → bitrate 256000" is unverifiable | schema | 2026-10-05 | D2c rows 124, 125 | raw OpenAPI check |
| schema-lyria | `fal-ai/lyria3/pro` | `prompt` ≤5,000, `image_url`; negative prompting not supported; no length control | schema | 2026-10-05 | D2c row 126 | raw OpenAPI check |

## Schema: cloning

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| schema-minimax-clone | `fal-ai/minimax/voice-clone` | `audio_url` ≥10 s returns `custom_voice_id`; deleted after 7 days unused | schema | 2026-10-05 | D2c row 123 | raw OpenAPI check |
| schema-other-clones | `fal-ai/qwen-3-tts/clone-voice/1.7b` · `resemble-ai/chatterboxhd/text-to-speech` | qwen: sample ≤300 s plus `reference_text`; chatterbox: `audio_url` overrides `voice` | schema | 2026-10-05 | D2c row 127 | raw OpenAPI check |

## ai-gen

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| cli-stt-default | ai-gen 2.2.0 `audio stt` | the default model is `fal-ai/wizper` (no word timings): always pass `-m` | cli | 2026-10-05 | `commands/audio.ts:94-101,162`; media-ai-gen `commands.md` | `ai-gen audio stt --help` |
| cli-stt-task | ai-gen 2.2.0 `audio stt` | always adds `task` (default `transcribe`) and maps `--language` to `language`; scribe-v2 has neither field, so they are dropped (HR3) and `--strict-params` would refuse the call. Put `language_code` in the params | cli | 2026-10-05 | `commands/audio.ts:100-101,166-168` | `ai-gen audio stt --help` |
| cli-tts-fields | ai-gen 2.2.0 `audio tts` | sets both `text` and `prompt`, so `--strict-params` fails there: run TTS with `ai-gen run <id> --params-file` | cli | 2026-10-05 | `commands/audio.ts:47-54`; media-ai-gen `commands.md` | `ai-gen audio tts --help` |
| cli-audio-file | ai-gen 2.2.0 `run` | `--audio-file` uploads a local file into the first of `audio_url`, `input_audio_url`, `speech_url` the schema has; a local path inside a params file is not uploaded | cli | 2026-10-05 | `commands/shared.ts:361`; `commands/run.ts:47,84` | `ai-gen run --help` |
| cli-audio-output | ai-gen 2.2.0 | the normalizer lifts an `audio` object (`data.audio.url`, T3 #13) into `files[]` and the downloads; text comes from `text`, `transcription` or `output`; word timings stay in `raw` | cli | 2026-10-05 | `core/output-normalizer.ts:104,120` | confirm on the first VID-T5 TTS call |
| cli-hex-empty | ai-gen 2.2.0 with MiniMax speech | a `hex` string is no URL, so with the default `output_format` the call yields no file: `EMPTY_RESULT`, exit 1, charged. Always send `output_format: "url"` | cli | 2026-10-05 | `core/output-normalizer.ts:79-80,104-109`; media-ai-gen `commands.md` (exit 1) | inferred from source; not run |

## Behaviour

| id | endpoint | fact | kind | as_of | source | re-verify |
|---|---|---|---|---|---|---|
| beh-rachel | ElevenLabs | omitting `voice` gives Rachel in practice | behaviour | fal export 2026-10-05 | AG 110-111; D2c B6 | D2c B6, ≤15 cr |
| beh-voice-422 | ElevenLabs | an unknown voice returns `422 Voice not found: <name>` | behaviour | fal export 2026-10-05 | AG 112; D2c row 105 | D2c B7, 0 cr |
| beh-ml2-128k | `multilingual-v2` · `turbo-v2.5` | always MP3 at 128 kbps | behaviour | fal export 2026-10-05 | D2c row 102 | D2c B8 (bitrate read) |
| beh-scribe-mp4 | `scribe-v2` | an `.mp4` passed as `audio_url` 422s (wizper and cohere list mp4; scribe lists no formats): demux first | behaviour | fal export 2026-10-05 | D2c row 118 (from fal's production skill) | D2c B5, ≤5 cr |
| beh-dub-video | `dubbing` | returns `video` even for audio-only input | behaviour | fal export 2026-10-05 | AG 157; D2c row 112 | D2c B18, about 150 cr (a full minute) |
| beh-urls-expire | outputs | hosted `fal.media` URLs expire: download at once with `-o` | behaviour | 2026-06 | T3 #12 | — |
