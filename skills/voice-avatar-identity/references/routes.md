# Routes this skill names

Defaults and alternatives, each "a kit or brief may name another". None has run on SL8 yet.

## Own-voice clone routes (step 13, through voice-clone-setup)

- Persistent `fal-ai/minimax/voice-clone` (sample at least 10 s, first 120 s used, returns
  `custom_voice_id`, deleted after 7 days unused), spoken through `fal-ai/minimax/speech-2.8-hd`
  (`voice_setting.voice_id`, `output_format` url).
- One-shot `resemble-ai/chatterboxhd/text-to-speech` (the sample goes in on every call).
- Reference `fal-ai/qwen-3-tts/clone-voice/1.7b` (sample up to 300 s plus its `reference_text`).

## Talking-head alternatives (step 16)

- `fal-ai/creatify/aurora`: known result (`price-aurora`), the proxy has no price for it (exit 12),
  so it cannot be capped and runs only after an answered spend gate.
- Footage: `fal-ai/sync-lipsync/v2` lip-syncs the customer's own clip. Cut it to the greeting
  first (`ffmpeg -v error -t <s> -i $D/<name>/original-footage.<ext> -c copy work/$P/<name>-clip.mp4`),
  quote with `ai-gen estimate fal-ai/sync-lipsync/v2 duration:=<s>`, then
  `ai-gen run fal-ai/sync-lipsync/v2 --video work/$P/<name>-clip.mp4 --audio-file $D/<name>/greeting-air.mp3 -o $D/<name>/ --queue --strict-params --max-cost <quote> --format json`.
  Known result (`price-sync-lipsync-v2`): the proxy priced a 5 s line as a whole minute (750 cr);
  unproven on SL8. A failure goes to fabric on the portrait.
