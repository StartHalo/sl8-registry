# Params, delivery mapping and exit codes

# Params and recovery for kit-song

## Contents
- Params shapes (step 5)
- Delivery mapping (step 5)
- Estimate exits (step 6)
- Run exits (steps 7 and 10)

## Params shapes

Vocal (agent-written or customer's lyrics), fal-ai/minimax-music/v2.6:
```json
{"prompt":"<prompt.txt>","lyrics_optimizer":false,"is_instrumental":false,"enable_safety_checker":true,"audio_setting":{"format":"mp3","bitrate":128000},"lyrics":"<lyrics.txt, with section markers>"}
```

Instrumental, fal-ai/minimax-music/v2.6:
```json
{"prompt":"<prompt.txt>","lyrics_optimizer":false,"is_instrumental":true,"enable_safety_checker":true,"audio_setting":{"format":"mp3","bitrate":128000}}
```

Instrumental, fal-ai/elevenlabs/music (gate option c, retry route lever; prompt up to 4100 characters):
```json
{"prompt":"<prompt.txt>","force_instrumental":true,"music_length_ms":60000,"respect_sections_durations":true,"output_format":"mp3_44100_128"}
```
Add `"enable_safety_checker": true` when that route's schema lists it. 60 s is one started minute.

Retry files: `song.v2.params.json` is `song.params.json` with the prompt read from `prompt.v2.txt` (one clause moved); `song.v3.params.json` likewise from `prompt.v3.txt`. Never send genre, mood, vocals, instruments, bpm, key, tempo, structure, references, avoid or use-case as keys: `--strict-params` refuses them.

## Delivery mapping

| Delivery | minimax `audio_setting` | elevenlabs `output_format` | `declared.format` |
|---|---|---|---|
| MP3 128k (default) | `{"format":"mp3","bitrate":128000}` | `mp3_44100_128` | `mp3` |
| WAV / PCM 44.1k (brief asks) | `{"format":"wav","sample_rate":44100}` when the enum lists wav, else `{"format":"pcm","sample_rate":44100}` | `pcm_44100` (may be tier-gated) | `wav` or `pcm` |

A raw PCM download that `mediaqc artifact` cannot read (exit 3, or `takes` 'no audio stream' on `.pcm`/`.bin`) is reported 'not checked' and named as a debt; it never triggers a paid retry. The source's cover-only settings (seed 0-1000000, mono or stereo, sample rate default 44100, bitrate default 256000) have no route on SL8; the kit uses 128000 for MP3 per media-audio-generation's delivery table.

## Estimate exits (step 6)

| Exit | Action |
|------|--------|
| 0 | quote ≤ budget: step 7; quote > budget: approve-song gate |
| 2 / 7 | Fix the params file and estimate again (free) |
| 3 / 4 | `ai-gen doctor`, report, end failed |
| 6 route refused | Instrumental: approve-song with options c and b. Vocal: end partial, denial in Known gaps |
| 11 network | Estimate once more, then end partial |
| 12 unpriced | approve-song gate (unpriced wording) |

## Run exits (media-ai-gen recovery; steps 7 and 10)

The source's own exit table is not used: the same numbers mean different things on SL8, and its 'retry once on timeout' would pay twice (T30).

| Exit | Action |
|------|--------|
| 1 EMPTY_RESULT | Charged, no file. Read `error.code` and `raw` (for example an audio_setting that gave no URL); failed row; the fix is the step 10 lever |
| 2 bad command | Fix the command. Nothing was charged; not an attempt |
| 3 / 4 config or auth | `ai-gen doctor`, report, end failed. Never repair (HR21) |
| 5 insufficient credits | `ai-gen balance`, end partial with the shortfall in Known gaps |
| 6 route refused | Instrumental: step 10 with lever `route: fal-ai/elevenlabs/music` once its estimate fits. Vocal: never retry the same id; failed row, end partial with the denial in Known gaps |
| 7 bad params | Read `error.details`, fix that field; the fix is the retry's lever (step 10), estimated first |
| content refusal | Its exit code is unrecorded on ai-gen ('no content-filter exit code'). Read `error.code` and `error.details`; if they name a refusal, the lever is a prompt clause |
| 8 unknown model | `ai-gen models --search minimax`, report the stale pick, end partial |
| 9 queued job failed (may be billed) | One retry (step 10), then the elevenlabs route (instrumental) or the approve-next gate |
| 10 timeout (job may still finish) | `ai-gen result <id>`; the id is in `error.details.requestId` or the job store. Never resubmit |
| 11 network | `ai-gen result <id>` if an id exists, else the job store; one resend at most, counted as the retry |
| 12 unpriced on run | Open approve-song (step 6) unless the owner already approved an unpriced run |
| 13 cost cap | Nothing was submitted; not an attempt. Re-plan within the quote or open a gate |
| 14 download failed | Download again with `ai-gen result <id> -o artifacts/<project>/audio/ --format json` |

Every failed attempt gets its own manifest row with no `--result` (manifest.mjs refuses an error envelope): `--params <the attempt's params file>` and `--json` carrying `"endpoint"`, `"request_id"` (from `error.details.requestId`, or null), `"status":"failed"`, `"attempt"`, `"credits":{"estimate":…}` and the exit and error code in `"notes"` (command in SKILL.md step 7).
