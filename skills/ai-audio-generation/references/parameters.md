# Audio parameters

Per-model — **`ai-gen info <id>` is the truth** for voice ids, languages, formats, and limits. Typed
flags + `key=value`; `--strict-params` catches typos.

## Text-to-speech (`tts`)

| Param | What it does |
|---|---|
| `voice` | the voice id/name — enum is per-engine (`ai-gen info`); ElevenLabs has named voices, Kokoro has language-voice ids |
| `language` / `language_code` | language selection on multilingual engines |
| `speed` / `stability` / `similarity` | delivery controls on some engines (e.g. ElevenLabs) |
| `output_format` | audio format/quality where exposed (mp3/wav) |

```bash
ai-gen audio tts "Now boarding." -m fal-ai/elevenlabs/tts/eleven-v3 voice=rachel stability=0.4 --format json
```
Text length: some engines cap characters per call — for long scripts, split into segments and mux,
or check the model's limit with `ai-gen info`.

## Sound effects (`sfx`)

| Param | What it does |
|---|---|
| `--duration` | length of the effect (seconds) where supported |
| `prompt` | the sound description (positional) |

## Video-to-audio (`v2a`)

| Param | What it does |
|---|---|
| `--video` | the silent clip (local ≤ 3 MB or URL) — **required** |
| `prompt` | optional hint for the kind of audio (ambience/foley) |
| queue | runs async; fetch with `ai-gen result <request-id>` |

## Speech-to-text (`stt` / `transcribe`)

| Param | What it does |
|---|---|
| `--task transcribe\|translate` | transcribe in source language, or translate to English (default transcribe) |
| `--language <code>` | a language hint (e.g. `en`, `es`) — improves accuracy |
| input | audio **or** video via `--audio-file` / `--video` / a positional path/URL |

The transcript is the envelope's **`text`** field. With `ai-gen transcribe`, `-o <file>` writes the
transcript to that FILE (not a directory); `--format json` emits the full envelope.

```bash
ai-gen audio stt lecture.mp4 --task transcribe --language en --format json | jq -r '.text'
```

## Cost
TTS/SFX/STT are sync and inexpensive (low single-digit credits typically); `v2a` is pricier (video-
length dependent). Read the real `credits_used` from the envelope; `ai-gen estimate` for `v2a`.
