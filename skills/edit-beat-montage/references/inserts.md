# Paid routes: transcription, inserts, swap, reference description

Every route here is optional and paid. Each follows the same pre-spend steps (HR5, HR9, HR12):
write the params file, quote it, compare the quote with the job's budget, run with `--queue`
(which waits for the job) and `--max-cost`, record one manifest row, then measure the file.

```bash
S=$HOME/.agents/skills/media-ai-gen/scripts
ai-gen estimate <model> --params-file work/<p>/<item>.params.json --format json   # the quote, in credits
node $S/manifest.mjs budget --project <p>                                         # what is left
# over budget, unpriced (estimate exit 12) or no budget known: open a gate and end the job partial
node $S/gate.mjs open --project <p> --slug <item> --question "<one line>" \
  --options '[{"id":"a","label":"Run it","credits":<quote>},{"id":"b","label":"Skip it","credits":0}]' \
  --resume-at "edit-beat-montage step <n>" --quote <quote>
```

A timeout (exit 10) is already charged: fetch it with `ai-gen result <request-id> -o <same dir>
--format json`, never resubmit (HR6), and never use `ai-gen status --wait` (it under-counts the
ledger). One retry per item, moving one named lever; then the fallback or a gate (HR7).

## Contents
- [Scribe v2 transcription](#scribe-v2-transcription)
- [Inserts from a subject photo](#inserts-from-a-subject-photo)
- [Swap inside a reference shot](#swap-inside-a-reference-shot)
- [Reference description](#reference-description)

## Scribe v2 transcription

Only when local faster-whisper exits 2 and the job allows remote speech-to-text (the audio leaves
the machine; for sensitive footage the caller decides). Scribe takes audio, never a video file.

```bash
mkdir -p work/<p>/words
ffmpeg -v error -y -i artifacts/<p>/source/<clip> -vn -ac 1 -ar 16000 work/<p>/words/<clip>.wav
ls -l work/<p>/words/<clip>.wav
# params: diarize and tag_audio_events default on and add speaker and event entries: pin both off.
# language_code is ISO 639-3 (eng, spa, deu) from the brief or the footage, else leave the key out;
# keyterms only for names and jargon the speaker uses (it adds about 30% to the price).
printf '%s' '{"diarize": false, "tag_audio_events": false, "language_code": "<iso-639-3>", "keyterms": ["<Name>"]}' \
  > work/<p>/words/scribe.params.json
ai-gen estimate fal-ai/elevenlabs/speech-to-text/scribe-v2 --params-file work/<p>/words/scribe.params.json --format json
ai-gen audio stt work/<p>/words/<clip>.wav -m fal-ai/elevenlabs/speech-to-text/scribe-v2 \
  --params-file work/<p>/words/scribe.params.json --queue --max-cost <quote> --format json \
  > work/<p>/words/<clip>.result.json
node $S/manifest.mjs add --project <p> --result work/<p>/words/<clip>.result.json \
  --params work/<p>/words/scribe.params.json \
  --json '{"item":"words-<clip>","node":"words","declared":{},"credits":{"estimate":<quote>}}'
python3 $HOME/.agents/skills/edit-beat-montage/scripts/words.py scribe work/<p>/words/<clip>.result.json \
  --out work/<p>/words/<clip>.json
```

- Known result (facts `cli-stt-task`, media-audio-generation): `audio stt` adds a `task` field Scribe
  does not have, so `--strict-params` would refuse the call; leave it off, and put the language in the
  params, not in `--language`.
- The words arrive in the envelope's `raw.words`; `words.py scribe` keeps only `type` "word". A
  response with no word entries is a failed transcription (exit 1): no spoken-line titles, said in
  the delivery line.
- Price (facts `price-scribe-v2`, 2026-10-05): about 2 credits per audio minute.

## Inserts from a subject photo

For a few shots the footage lacks (an edit whose brief asks for them, or a remake whose subject
came as photos). Plan each in step 8 first: size, framing, one camera move, and the shot's length
plus 0.5 s of handle at each end.

- **A shot under about 0.5 s is never generated:** put the photo in the EDL as the shot's `src` with
  `punch` or `push`.
- **Consent first (HR17):** a generated shot of a real person needs that person's documented
  consent, with SL8's consent text and a privacy note. That text is pending owner approval
  (learnings VID-L304), so this method does not make a shot of a real person's face or voice yet:
  use their supplied clips, or the photo as a still with motion.
- **Default: `bytedance/seedance-2.0/image-to-video`** for a push or a hold; a kit or brief may name
  another. Inserts are generated at 720p and
  upscaled into the edit, so they read softer beside native footage: keep each under about 1.5 s of
  screen time. Write the prompt with media-video-generation (one subject, one camera move, the shot's
  light); this method's numbers have not been run on Seedance.

```bash
# duration is a string from "4" to "15" (facts schema-seedance20-duration): the smallest that covers
# the shot plus 1.0 s of handles; a shorter shot is trimmed from a 4 s clip. generate_audio defaults
# to true: pin it false, the track is the sound. resolution 720p is the schema default, pinned (HR4).
mkdir -p work/<p>/inserts
printf '%s' '{"prompt": "<subject, one move, light>", "duration": "4", "resolution": "720p",
  "aspect_ratio": "<9:16 or the edit aspect>", "generate_audio": false}' > work/<p>/inserts/<n>.params.json
ai-gen estimate bytedance/seedance-2.0/image-to-video --params-file work/<p>/inserts/<n>.params.json --format json
ai-gen video -m bytedance/seedance-2.0/image-to-video --image artifacts/<p>/source/<photo> \
  --params-file work/<p>/inserts/<n>.params.json -o artifacts/<p>/clips/ \
  --queue --strict-params --max-cost <quote> --format json > work/<p>/inserts/<n>.result.json
node $S/manifest.mjs add --project <p> --result work/<p>/inserts/<n>.result.json \
  --params work/<p>/inserts/<n>.params.json \
  --json '{"item":"insert-<n>","node":"clips","declared":{"duration":4,"aspect":"9:16"},"credits":{"estimate":<quote>},"parents":["source/<photo>"]}'
```

- `--image` uploads the photo into `image_url`, the field this route requires (facts
  `schema-seedance20-end-frame`). Price (facts `price-seedance20-proxy`): about 378 credits for 5 s at
  720p; quote every call.
- Check the clip before it enters the EDL: at least the shot plus handles long, the subject
  recognisable (look at its first, middle and last frames). A failed or off-brief clip gets one
  retry with one changed lever (the prompt's move, or the duration); a second failure falls back to
  the photo as a still with motion, said in the delivery line.

## Swap inside a reference shot

Remake only, when the brief wants a product, object, character or garment replaced inside a
reference shot. **Default: `fal-ai/kling-video/o3/pro/video-to-video/edit`** (a kit or brief may name
another). Untested on SL8: no facts row, no price and an unverified field for the swap image.

```bash
mkdir -p work/<p>/ref_shots
ffmpeg -v error -y -ss <shot start - 0.5> -i artifacts/<p>/source/<reference> -t <shot length + 1.0> -an \
  -c:v libx264 -crf 16 -pix_fmt yuv420p work/<p>/ref_shots/shot_<nn>.mp4
ai-gen info fal-ai/kling-video/o3/pro/video-to-video/edit --format json      # free
# and the raw OpenAPI printer in media-ai-gen/references/commands.md (free): find the source-video
# field and the field for the replacement image, with their types.
```

- **Stop that shot and report it** when the model is not found (exit 8), when no field takes the
  replacement image, or when that field wants objects (`elements`): `--ref` fills only plain URL
  lists (facts `cli-kling-ref`). The shot then uses the customer's own clip, or is left out.
- Otherwise: params file with the swap described in one line and every default-on flag pinned
  (HR4), quote it, then
  `ai-gen video -m fal-ai/kling-video/o3/pro/video-to-video/edit --video work/<p>/ref_shots/shot_<nn>.mp4 --ref artifacts/<p>/source/<photo> --params-file … -o artifacts/<p>/clips/ --queue --strict-params --max-cost <quote> --format json`,
  and a manifest row. HR17 applies to a person swapped in.

## Reference description

Remake only, optional: a scene-by-scene description of the reference beside the numeric breakdown.
Default: `fal-ai/video-understanding`; a kit or brief may name another. Known result
(media-video-production `references/watch-and-listen.md`, VID-T5, 2026-10-08): it billed 8
credits on a 10 s cut against an estimate of 3, so quote the larger figure.

```bash
printf '%s' '{"detailed_analysis": true, "prompt": "List each shot of this edit in order with its length in seconds, the camera move, how the cut lands on the music, the transition, and any on-screen text read back exactly with its typeface style and position."}' \
  > work/<p>/ref_watch.params.json
ai-gen estimate fal-ai/video-understanding --params-file work/<p>/ref_watch.params.json --format json
ai-gen run fal-ai/video-understanding --params-file work/<p>/ref_watch.params.json \
  --video artifacts/<p>/source/<reference> --queue -o artifacts/<p>/qc/ --format json > work/<p>/ref_watch.result.json
```

The text is in the envelope's `text`; record the prompt as sent in the manifest row. On any failure
skip it: the numeric breakdown of step 5 stands alone.
