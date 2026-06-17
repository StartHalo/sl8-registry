# Audio usage patterns

Common end-to-end flows. Audio almost always pairs with another modality (video, captions), so the
pattern is usually **generate audio → hand off the URL/file → mux or sync**.

## Voiceover for a video

Generate the narration, then mux it onto the video with ffmpeg.
```bash
# 1. narration
VO=$(ai-gen audio tts "Meet the all-new SL8 workspace." -m fal-ai/kokoro/american-english --format json | jq -r '.files[0].local_path')
# 2. mux onto an existing silent video (ffmpeg is available in sl8-video / sl8-animation sandboxes)
ffmpeg -i scene.mp4 -i "$VO" -c:v copy -c:a aac -shortest narrated.mp4
```
For talking-head/lip-synced delivery, hand the voiceover to the `lipsync` skill instead of a flat mux.

## Foley / ambience for a silent clip

```bash
REQ=$(ai-gen audio v2a "footsteps on gravel, distant wind" --video clip.mp4 -m fal-ai/mmaudio-v2 --async --format json | jq -r '.request_id')
AUD=$(ai-gen result "$REQ" --format json | jq -r '.files[0].local_path')
ffmpeg -i clip.mp4 -i "$AUD" -c:v copy -c:a aac -shortest clip-with-audio.mp4
```

## Full audio bed (narration + SFX)

Generate each layer, then mix with ffmpeg `amix` (or hand to the forthcoming `voiceover-sfx` skill).
```bash
VO=$(ai-gen audio tts "..." -m <tts> --format json | jq -r '.files[0].local_path')
SFX=$(ai-gen audio sfx "rain on a window" -m <sfx> --duration 12 --format json | jq -r '.files[0].local_path')
ffmpeg -i "$VO" -i "$SFX" -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest" bed.mp3
```

## Transcribe, then caption

```bash
ai-gen audio stt talk.mp4 --format json > stt.json
jq -r '.text' stt.json                      # the transcript
# build .srt from chunk timings in raw if the model provides them (check ai-gen info)
```

## Notes

- Generated-audio URLs **expire** — persist `files[].local_path`, don't rely on `hosted_urls` later.
- `v2a` is queue-based; everything else is sync.
- ffmpeg lives in the `sl8-video` and `sl8-animation` runtimes (not `sl8-base`) — mux there, or
  download the audio and assemble wherever ffmpeg is available.
