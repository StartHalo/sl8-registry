# Audio models — pick by use case

Live catalog — **verify with `ai-gen models --search` / `ai-gen info` before relying on an id**
(voices, languages, formats, and cost vary per endpoint).

## Text-to-speech (voiceover / narration)

| Need | Reach for | Why |
|---|---|---|
| Fast, clean narration, many languages | **Kokoro** (`fal-ai/kokoro/*`) | lightweight, multilingual, cheap; good default narration |
| Expressive / branded voices, voice control | **ElevenLabs** (`fal-ai/elevenlabs/tts/*`) | most natural + named voices + style control |
| A specific accent / language | search the catalog | `ai-gen models --search tts` then `ai-gen info` for the language/voice list |

```bash
ai-gen models --category text-to-speech --format json
ai-gen models --search kokoro
ai-gen info fal-ai/elevenlabs/tts/eleven-v3      # voices, formats, est. credits
```

## Sound effects / short music

| Need | Reach for |
|---|---|
| Designed sound effects from a text prompt | ElevenLabs sound-effects (`fal-ai/elevenlabs/sound-effects/*`) |
| Short music / stingers / ambience | search `--category text-to-audio` for a music model |

## Video-to-audio (foley)

| Need | Reach for |
|---|---|
| Audio that matches a silent clip (footsteps, ambience, impacts) | **MMAudio** (`fal-ai/mmaudio-v2`) — queue-based, takes `--video` |

## Speech-to-text (transcription)

| Need | Reach for |
|---|---|
| General transcription / translation | **Wizper** (`fal-ai/wizper`, the default — Whisper v3 large) |
| Timestamped chunks / captions | check `ai-gen info` for chunk/segment output; read `raw` only if the normalized `text` isn't enough |

Note: `fal-ai/whisper` was removed upstream → use `fal-ai/wizper`.

## Discipline

- A model that exits 6 was declined by the proxy → pick another via `ai-gen models --search`.
- TTS/SFX/STT are **sync** and cheap; `v2a` is **queue-based** (treat like video — `--async` + `result`).
- When `fal-model-catalog` is installed it carries maintained, curated audio picks; this file is the
  self-sufficient fallback.
