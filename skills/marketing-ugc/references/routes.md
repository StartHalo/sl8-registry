# Routes: defaults, params files, quotes and commands

Loaded from SKILL.md steps 6, 8, 9, 11, 12, 13 and 15. Every route below is a default (Studio is a provider, not
an enforcer): a kit or brief may name another model, and then its `ai-gen info` fields replace the
ones here. Model choices are the assessment's (WF19-a2 step 8); dated facts are cited by their row id
in `media-video-generation/references/facts.md`, `media-audio-generation/references/facts.md` and
`media-image-generation/references/facts.md`. Command forms are checked against
`media-ai-gen/references/commands.md`. None of these calls has been run by this skill on SL8.

## Contents
- [Before the first paid call](#before-the-first-paid-call)
- [Route table](#route-table)
- [Voice: test sentence, then the full script](#voice-test-sentence-then-the-full-script)
- [Talking head on a portrait](#talking-head-on-a-portrait)
- [New speech on existing footage](#new-speech-on-existing-footage)
- [Stills: portrait, product still, hero, end frame, thumbnail](#stills-portrait-product-still-hero-end-frame-thumbnail)
- [Faceless b-roll: draft, then final](#faceless-b-roll-draft-then-final)
- [Assembly (only when one file is asked for)](#assembly-only-when-one-file-is-asked-for)
- [Fixes to the approach's command forms](#fixes-to-the-approachs-command-forms)

## Before the first paid call

Shell state does not persist between Bash calls: start every call that uses these with

```bash
U=$HOME/.agents/skills/marketing-ugc/scripts/ugc.mjs
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
mkdir -p artifacts/<project>/{ugc,audio,keyframes,drafts,clips,qc,final} work/<project>/ugc   # once; SKILL.md step 1
```

For every model in the plan, once per session:

```bash
ai-gen info <model-id> --format json          # fields, enums, defaults; exit 8 = not served (step 8)
# raw OpenAPI for every field you set (const and enum, HR2): media-ai-gen/references/commands.md
ai-gen estimate <model-id> --params-file work/<project>/ugc/<item>.params.json --format json
```

- Write the params file first and estimate and run from the same file (commands.md: `estimate` does
  not coerce types). Lip-sync routes are quoted on the speech's seconds instead (below).
- Exit 12 from `estimate` means the route is unpriced: it cannot run inside a budget (commands.md
  defects table). Do not run it; record it in the delivery.
- A field the schema does not list is dropped silently (HR3): run with `--strict-params`.
- Run every paid call with `--queue --strict-params --max-cost <quote> --format json` and `-o` set to
  a folder (never a file name). A timeout (exit 10) is already charged: fetch it with
  `ai-gen result <request-id> -o <the same folder> --format json`, never resubmit (HR6).

## Route table

| Need | Default | Status on SL8 | Quote |
|---|---|---|---|
| Voice (generated speech) | `fal-ai/elevenlabs/tts/multilingual-v2` | measured: 2 cr for a one-sentence line (`measured-elevenlabs-short-line`); billed per line by length (`price-ml2-line`) | estimate per line |
| Talking head, portrait + audio | `veed/fabric-1.0` at `480p` | proven: passed owner review (VP-195, `measured-fabric-480p`) | 20 cr per whole second of speech at `480p` |
| Talking head, portrait + text | `veed/fabric-1.0/text` | unproven; known result: it speaks with its own voice, not the project's registry voice | estimate; exit 12 = unpriced, do not run |
| Avatar with visual direction | `fal-ai/creatify/aurora` | not offered on this machine yet: no proxy price (`price-aurora`, exit 12) | — |
| New speech on real footage | `fal-ai/sync-lipsync/v2` | unproven; priced by the minute: 750 cr for a 5 s line (`price-sync-lipsync-v2`) | estimate on the speech's seconds |
| Product still, hero, end frame, portrait with the product | `openai/gpt-image-2/edit` with the photo as `--ref` | the assessment's choice; edit fields in `schema-gpt2-edit-fields` | estimate; the edit also bills the input image (`price-gpt2-edit`) |
| Still, alternative | `fal-ai/nano-banana-pro/edit` | known result: once turned a mug into a luggage tag (`beh-nbp-mug`) | 37.5 cr at 1K or 2K (`price-nbp`) |
| Still with no reference | `openai/gpt-image-2` | `image_size` rules in `schema-gpt2-size` | 52.75 cr high at 1024² (`price-gpt2-quality`) |
| Faceless b-roll draft | `xai/grok-imagine-video/image-to-video` | unproven; integer `duration` 1 to 15, no audio switch (media-video-generation picks.md) | estimate |
| Faceless b-roll final | `bytedance/seedance-2.0/image-to-video` at `720p` | priced: 378 cr for 5 s at 720p, audio off (`price-seedance20-proxy`) | estimate |

## Voice: test sentence, then the full script

The voice lives in the project's voice registry, `artifacts/<project>/audio/voices.json`, in
media-audio-generation's shape, under the role `creator` (read `bot/voices.json` first when it
exists; the project entry wins). Default when neither has a `creator` entry: `Brian` at `speed` 1.0,
the voice with the seeded rate (`rate-brian-ml2`, unverified on SL8); a kit or brief may name
another. Always send `voice` explicitly: omitted it becomes `Rachel` (`schema-voice-default`).

```json
{"text": "<one short test sentence from the script>", "voice": "Brian", "speed": 1.0,
 "apply_text_normalization": "on"}
```

```bash
ai-gen estimate fal-ai/elevenlabs/tts/multilingual-v2 --params-file work/<project>/ugc/voice-test.params.json --format json
ai-gen run fal-ai/elevenlabs/tts/multilingual-v2 --params-file work/<project>/ugc/voice-test.params.json \
  -o artifacts/<project>/audio/ --queue --strict-params --max-cost <quote> --format json > work/<project>/ugc/voice-test.result.json
ffprobe -v error -show_entries format=duration -of csv=p=0 artifacts/<project>/audio/<file>.mp3
```

- `ai-gen run` with the schema's own `text` field, not `ai-gen audio tts`, which also sets `prompt`
  and so cannot run with `--strict-params` (commands.md).
- Before the first full render, `ai-gen estimate` the line on `est_seconds` from `ugc.mjs script` and
  open the SKILL.md step 8 gate if it cannot be priced; re-quote after the measured render.
- `apply_text_normalization`: read its enum with the raw OpenAPI printer first (HR2); set `on` when
  listed, because prices and offers are spoken (`fal/falaudiogeneration-ba1a03#20`).
- Output is always MP3 at 128 kbps (`beh-ml2-128k`); there is no output-format field and no `seed`.
- An unknown voice returns `422 Voice not found` (`beh-voice-422`): stop that route and substitute
  nothing.
- The full script is the same call with `text` set to the contents of `artifacts/<project>/ugc/spoken.txt`
  (`ugc.mjs script --write-text`: the beats joined, `[stage directions]` removed; never the raw beats,
  which would be read aloud). Rename the file to `creator-full.mp3`, then record it with
  `manifest.mjs add … --json '{…,"files":["audio/creator-full.mp3"]}'` (SKILL.md step 8): `files` is
  passed because the renamed file is not the envelope's `local_path`.

## Talking head on a portrait

```json
{"resolution": "480p"}
```

```bash
ai-gen estimate veed/fabric-1.0 resolution=480p duration:=<speech seconds rounded up> --format json
ai-gen run veed/fabric-1.0 --image artifacts/<project>/source/portrait.png \
  --audio-file artifacts/<project>/audio/creator-full.mp3 --params-file work/<project>/ugc/clip-a.params.json \
  -o artifacts/<project>/clips/ --queue --strict-params --max-cost <quote> --format json > work/<project>/ugc/clip-a.result.json
```

- Quote `480p`, the measured tier; the estimate prices `720p` the same, but fal lists it at almost
  twice the rate and SL8 has not measured it (`price-fabric-720p`).
- Fabric animates the whole portrait (`creative-claw/cc-model-contracts-video#26`): wardrobe, setting
  and any held product must already be in the portrait. Its output keeps the portrait's own aspect
  (VP-195: 576×704), so a 9:16 deliverable needs a 9:16 portrait. Measure the clip, declare its real
  size and report a wrong aspect as a defect; `480p` is below platform norms (1080×1920) and `720p`
  is unmeasured.
- `veed/fabric-1.0/text` takes `image_url` plus `text` and a voice field `ai-gen info` names; it is
  run the same way with `text` in the params file, only when the brief asks for the endpoint's voice.

## New speech on existing footage

Only for a clip SL8 generated earlier and marked in the brief (`media.footage_origin: "generated"`):
real creator footage is refused until SL8's consent text is approved (SKILL.md step 2, MKT-L521).

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 artifacts/<project>/source/footage.mp4
ai-gen estimate fal-ai/sync-lipsync/v2 duration:=<speech seconds> --format json
ai-gen run fal-ai/sync-lipsync/v2 --video artifacts/<project>/source/footage.mp4 \
  --audio-file artifacts/<project>/audio/creator-full.mp3 --params-file work/<project>/ugc/clip-d.params.json \
  -o artifacts/<project>/clips/ --queue --strict-params --max-cost <quote> --format json > work/<project>/ugc/clip-d.result.json
node $U compare artifacts/<project>/source/footage.mp4 artifacts/<project>/clips/<clip>.mp4 --out artifacts/<project>/qc/ \
  --audio artifacts/<project>/audio/creator-full.mp3
```

- The params file holds only fields `ai-gen info` lists that you choose to pin (HR4); `{}` is valid
  when none is default-on. Read the sync-mode field in `ai-gen info` and pin the mode that holds
  the source's length or the new speech's length, whichever the brief wants: new speech changes the
  clip's length, so `compare --audio` checks it against the speech, not the source.
- Screen the footage first: singing, overlapping speakers, fast cuts, covered mouths or extreme
  angles mean no reliable result (`creative-claw/cc-video-model-guides#97`); say so before spending.

## Stills: portrait, product still, hero, end frame, thumbnail

```json
{"prompt": "<seven-layer prompt>", "image_size": {"width": 1152, "height": 2048}, "quality": "high",
 "output_format": "png", "num_images": 1}
```

```bash
ai-gen estimate openai/gpt-image-2/edit --params-file work/<project>/ugc/still.params.json --format json
ai-gen image -m openai/gpt-image-2/edit --ref artifacts/<project>/source/product.png \
  --params-file work/<project>/ugc/still.params.json -o artifacts/<project>/keyframes/ \
  --queue --strict-params --max-cost <quote> --format json > work/<project>/ugc/still.result.json
```

- `--ref` maps to `image_urls`, which both edit routes take; `--image` maps to `image_url`, which they
  reject. A thumbnail with the creator takes `--ref portrait.png --ref product.png`, in the order the
  prompt names them.
- 9:16 is `image_size` 1152×2048 on GPT Image (`schema-gpt2-size`); on `fal-ai/nano-banana-pro/edit`
  it is `"aspect_ratio": "9:16", "resolution": "2K"` and no `image_size` (`schema-nbp-aspect`,
  `schema-nbp-resolution`).
- No text in any still: an end frame is asked for with an empty upper third for copy, and the copy is
  composited later from the brief's exact wording (HR10).
- A creator portrait with no product and no reference runs on `openai/gpt-image-2` (no `--ref`).
  Known result (`beh-gpt2-name`): it prints a named character's name unless the prompt says "no text
  in the image".

## Faceless b-roll: draft, then final

Draft (`work/<project>/ugc/draft-<n>.params.json`):

```json
{"prompt": "<seven-layer prompt>", "duration": 5}
```

Final (`work/<project>/ugc/broll-<n>.params.json`):

```json
{"prompt": "<the same prompt>", "duration": "5", "aspect_ratio": "9:16", "resolution": "720p",
 "generate_audio": false}
```

```bash
ai-gen video -m xai/grok-imagine-video/image-to-video --image artifacts/<project>/keyframes/still.png \
  --params-file work/<project>/ugc/draft-<n>.params.json -o artifacts/<project>/drafts/ \
  --queue --strict-params --max-cost <quote> --format json > work/<project>/ugc/draft-<n>.result.json
ai-gen video -m bytedance/seedance-2.0/image-to-video --image artifacts/<project>/keyframes/still.png \
  --params-file work/<project>/ugc/broll-<n>.params.json -o artifacts/<project>/clips/ \
  --queue --strict-params --max-cost <quote> --format json > work/<project>/ugc/broll-<n>.result.json
```

- Seedance `duration` is a string `"4"` to `"15"` (`schema-seedance20-duration`); `aspect_ratio`
  `9:16` is in its enum (`schema-seedance20-aspect`); `generate_audio` defaults to `true` and is
  pinned `false` here, because the voiceover carries the sound and audio costs nothing either way
  (`schema-seedance-audio-default`, `price-seedance-audio`). A kit that wants the clip's own sound
  sets it `true` and adds the explicit audio line (`creative-claw/cc-video-model-guides#23`).
- Grok's `duration` is an integer 1 to 15 and it has no audio switch; it takes no aspect field in the
  facts on record, so the still's own 9:16 shape sets the frame (check with `ai-gen info`).
- Known result (`measured-seedance20-face-480p`): Seedance refused a realistic portrait at 480p. B-roll
  shows hands and the product, not a face.

## Assembly (only when one file is asked for)

```bash
node $Q clipset artifacts/<project>/clips/
printf "file '%s'\n" $PWD/artifacts/<project>/clips/broll-1.mp4 $PWD/artifacts/<project>/clips/broll-2.mp4 > work/<project>/ugc/list.txt
ffmpeg -v error -f concat -safe 0 -i work/<project>/ugc/list.txt -c:v libx264 -pix_fmt yuv420p -an work/<project>/ugc/broll.mp4
ffmpeg -v error -i work/<project>/ugc/broll.mp4 -i artifacts/<project>/audio/creator-full.mp3 \
  -map 0:v -map 1:a -c:v copy -c:a aac -shortest artifacts/<project>/final/ad.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 artifacts/<project>/final/ad.mp4
```

`-shortest` ends at the shorter stream: plan the clips with `ugc.mjs clipplan --seconds <measured
voiceover> --clips <n>` (total at least the voiceover plus 0.5 s) or the voice is cut, then run
`node $U assembly --voice artifacts/<project>/audio/creator-full.mp3 --final artifacts/<project>/final/ad.mp4 --clips artifacts/<project>/clips/`
(exit 0). Only when `final/ad.mp4` exists and `assembly` passed may the delivery say "stitched".

## Fixes to the approach's command forms

The approach's `on_sl8` lines carry recurring errors; this file uses the corrected forms (MKT-D525):

| Approach wrote | On this machine |
|---|---|
| `-o clip_A.mp4`, `-o voice.mp3`, `-o still.png` | `-o` is a directory; rename the file after the call |
| `--audio voice.mp3` | `--audio on\|off` only sets `generate_audio`; the speech file goes in with `--audio-file` |
| `ai-gen image … -m openai/gpt-image-2 --ref product.png` | a reference goes to the `/edit` route (`image_urls`) |
| `aspect_ratio=9:16` and `--aspect-ratio 9:16` side by side | the params file, with the schema's exact type |
| `ai-gen audio tts "<text>" --voice <voice>` | `ai-gen run` with `text` in the params file, so `--strict-params` holds |
| polling with a waiting status call | `--queue`, then `ai-gen result <id>` after a timeout |
