# The manifest rows, and routes B and C

SL8 wording, written for this skill from the manifest and ai-gen contracts of media-ai-gen
(`manifest.mjs`, commands.md) and the method of WF22-a6 steps 8-11. Nothing here has run on an SL8
Studio; the routes B and C are unproven.

## Manifest rows (HR9)

`manifest.mjs add` needs `item`, `node` and `declared` on every row, `params` for a generation, and
`files` unless the row is `pending` or `failed`. One item per scene, so a retry becomes attempt 2 and
must name its `lever` (HR7). `<S>` is `$HOME/.agents/skills/media-ai-gen/scripts`.

Narration (after the file is moved to `artifacts/<p>/audio/scene-NN.mp3`; the row hashes it):

```bash
node <S>/manifest.mjs add --project <p> --result work/<p>/vo-NN.result.json --params work/<p>/vo-NN.params.json \
  --json '{"item":"vo-NN","node":"audio","declared":{"audio":"required","duration_s":<est_s>},"files":["artifacts/<p>/audio/scene-NN.mp3"],"credits":{"estimate":<quote>}}'
```

A talking head, the moment `--async` returns its id (a `pending` row has no files):

```bash
node <S>/manifest.mjs add --project <p> --result work/<p>/th-NN.submit.json --params work/<p>/th-NN.params.json \
  --json '{"item":"scene-NN","node":"scenes","status":"pending","declared":{"aspect":"<target>","audio":"required","duration_s":<audio_s>},"credits":{"estimate":<quote>}}'
```

When the clip is fetched and renamed to `scene-NN.mp4`, the same command with the fetched envelope
updates the row by its request id (no `--params`; the stored ones stay):

```bash
ai-gen result <request-id> -o artifacts/<p>/scenes/ --format json > work/<p>/th-NN.result.json
# rename the file named in files[0].local_path to artifacts/<p>/scenes/scene-NN.mp4, then
node <S>/manifest.mjs add --project <p> --result work/<p>/th-NN.result.json \
  --json '{"item":"scene-NN","node":"scenes","files":["artifacts/<p>/scenes/scene-NN.mp4"]}'
```

A retry of a scene is a new `--async` call with a new params file and a row that names what moved:
add `"lever":"shorter scene text"` (or `"cleaner portrait or audio"`, `"route B on approved footage"`)
to the `--json` of the new pending row. A failed call is recorded with `"status":"failed"` and its
error envelope's `error.code`.

## Route B: re-voice footage (unproven)

Only footage of an invented or non-human presenter: footage of a real person is refused until SL8's
consent text is approved (SKILL.md step 2). One lip-sync call covers the whole clip, because the
route bills per started minute (facts `price-sync-lipsync-v2`: a 5 s line quotes 750 cr).

1. Steps 1, 2, 5-8 and 10 as written (a voice, a script, one narration file per scene).
2. Probe the footage: `ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of json <footage>`.
3. Join the scene narrations into one file in scene order:
   `printf "file '%s'\n" $PWD/artifacts/<p>/audio/scene-*.mp3 > work/<p>/narr.txt` then
   `ffmpeg -v error -y -f concat -safe 0 -i work/<p>/narr.txt -c:a libmp3lame -q:a 2 work/<p>/narration.mp3`
   (a file name with a space needs a different list; check the scene numbers sort: 01 to 09 then 10).
4. Read `ai-gen info fal-ai/sync-lipsync/v2 --format json` and the raw OpenAPI. Pin (HR4) the field
   the schema offers for a footage and audio of different lengths, if it has one. Default: make the
   lengths equal locally before the call: footage longer than the narration is cut with
   `ffmpeg -v error -y -i <footage> -t <narration seconds> -c copy work/<p>/footage-cut.mp4`;
   narration longer than the footage is not padded or looped: end `partial` with a gate (more
   footage, or a shorter script).
5. Quote (`ai-gen estimate fal-ai/sync-lipsync/v2 duration:=<s> --format json`), then
   `ai-gen run fal-ai/sync-lipsync/v2 --video work/<p>/footage-cut.mp4 --audio-file work/<p>/narration.mp3 --params-file work/<p>/lip.params.json -o artifacts/<p>/scenes/ --async --strict-params --max-cost <quote> --format json > work/<p>/lip.submit.json`,
   a pending row, then collect as step 12. The single result is the finished picture: rename it
   `scene-01.mp4` and assemble with `--expect 1` for the loudness pass.

## Route C: text to talking head (unproven)

`veed/fabric-1.0/text` takes the portrait (`--image`), the scene's `spoken_text` without tags as
`text`, a `voice_description` and `resolution` (fields as the fal page showed on 2026-10-27; confirm
with `ai-gen info veed/fabric-1.0/text` and `ai-gen estimate`, VID-L526). Its built-in voice skips the
registry, so there is no voice step, no pronunciation test and no narration file; the audio cannot be
pre-tested. Run it per scene with `--async` as in step 11, then collect, assemble and check as written.
