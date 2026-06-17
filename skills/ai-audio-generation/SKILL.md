---
name: ai-audio-generation
description: "Generate and transcribe audio with the ai-gen CLI — text-to-speech (voiceover), sound effects and short music, video-to-audio foley, and speech-to-text transcription — across the fal.ai catalog (Kokoro, ElevenLabs, MMAudio, Wizper, and more) via the SL8 proxy. Use when the user asks for a voiceover, narration, text-to-speech, a sound effect, foley, background audio for a clip, or to transcribe/caption audio or video. Triggers: text to speech, voiceover, narrate this, sound effect, foley, add audio to this video, transcribe, captions, speech to text, tts, stt."
license: MIT
metadata:
  author: sl8
  category: media
  tags: audio, tts, speech, sound-effects, foley, transcription, ai-gen, fal
  references-skills: [ai-gen]
---

# AI Audio Generation

## Purpose

Generate and transcribe audio with `ai-gen audio`. Four sub-verbs cover the audio jobs; the CLI
mechanics (output envelope, queue, exit codes, inputs) live in the **`ai-gen`** skill.

| Sub-verb | Job | Mode | Reads |
|---|---|---|---|
| `tts` | text → **voiceover / speech** | sync, `-m` required | audio file (`hosted_urls`/`files`) |
| `sfx` | prompt → **sound effect / short music** | sync, `-m` required | audio file |
| `v2a` | silent video → **audio / foley** | queue, `-m` + `--video` | audio file |
| `stt` | speech → **text (transcription)** | sync, default `fal-ai/wizper` | **`text`** field |

## Text-to-speech (voiceover)

```bash
ai-gen audio tts "Welcome to SL8. Let's build something." -m fal-ai/kokoro/american-english --format json
ai-gen audio tts "Now in theaters." -m fal-ai/elevenlabs/tts/eleven-v3 voice=rachel --format json
```
Pick a voice/engine from the catalog (`ai-gen models --search tts` / `--search kokoro|elevenlabs`);
voice ids and supported languages/formats are per-model — `ai-gen info <id>`. For multi-paragraph
narration, generate per segment and mux, or pass the full text if the model supports it.

## Sound effects / short music

```bash
ai-gen audio sfx "car engine revving then idling" -m fal-ai/elevenlabs/sound-effects/v2 --duration 8 --format json
ai-gen audio sfx "ambient forest at dawn, birdsong" -m <sfx-model> --format json
```

## Video-to-audio (foley)

Generate audio that matches a silent clip (footsteps, ambience, impacts). Queue-based.
```bash
ai-gen audio v2a "ambient room tone and distant traffic" --video scene.mp4 -m fal-ai/mmaudio-v2 --async
# then: ai-gen result <request-id> -o ./out
```
The `--video` input accepts a local path (≤ 3 MB) or URL.

## Speech-to-text (transcription)

Default `fal-ai/wizper` (Whisper v3 large). The transcript is in the **`text`** field of the envelope,
not in `files`.
```bash
ai-gen audio stt recording.wav --format json | jq -r '.text'
ai-gen audio stt podcast.mp4 --task translate --language es --format json
ai-gen transcribe interview.mp3 -o transcript.txt     # v1 alias; -o writes the transcript to a FILE
```
`--task transcribe|translate`, `--language <code>` (a hint). Accepts audio or video (`--audio-file` /
`--video` / a positional path / URL).

## Choose a model

```bash
ai-gen models --category text-to-speech --format json
ai-gen models --search elevenlabs
ai-gen info fal-ai/kokoro/american-english     # voices, languages, formats, est. credits
```
See `references/model-picks.md` for engines by use case (natural narration vs many voices vs
multilingual; SFX vs music; foley; STT). When `fal-model-catalog` is installed it carries the
maintained picks.

## Read the output & hand off

- **Generated audio** (`tts`/`sfx`/`v2a`): `files[0].local_path` + `hosted_urls[0]` (URLs **expire** —
  persist). Hand the file/URL to muxing (ffmpeg) or to the `lipsync` skill.
- **Transcription** (`stt`): read `text`; `files` is usually empty.

See `references/parameters.md` (voices, languages, formats, the `text` field) and
`references/usage-patterns.md` (voiceover-for-video, foley-for-clip, transcribe-then-caption).

## Quality criteria

- [ ] The sub-verb matches the job (tts vs sfx vs v2a vs stt) and `-m` is set where required.
- [ ] Voice/model came from `ai-gen models`/`info`; params validated against the schema.
- [ ] Generated audio read from `hosted_urls`/`files[].local_path` and persisted; transcripts from `text`.
- [ ] `v2a` (queue) handled like video: `--async` → `result`; timeouts recovered, not retried blind.
