# Watch and listen: stage 9

Read this before stage 9. Run it on the **final** file, after stage 8. Both passes are paid calls:
run the pre-spend steps in SKILL.md first, submit with `--queue` and `--format json`, and record a
manifest row for each. `<project>` is the project folder under `artifacts/`.

## Contents
- [Stage 9 — Watch and listen to the finished file](#stage-9--watch-and-listen-to-the-finished-file)
- [Watch](#watch)
- [Listen](#listen)
- [When something fails](#when-something-fails)

## Stage 9 — Watch and listen to the finished file

**Nobody has seen the ad yet.** Every check so far measured a component. This stage
is the first and only look at the thing being delivered, and it exists because a
pipeline whose parts all pass can still assemble into something wrong.

Run both passes on the **final** file, after stage 8.

## Watch

**Watch.** Send the delivered video to `fal-ai/video-understanding` with
`detailed_analysis: true` and a prompt that asks for what you can check rather
than for an opinion: the number of distinct scenes, what physically happens in
each, any on-screen text read back verbatim, and whether any shot appears static.
Then reconcile against the plan — scene count equals row count, each `action`
is described, each `text` string is read back correctly. A vision pass is **not** a
substitute for the per-clip motion measurement; it is a check on the assembly.

**This pass is optional; quote it at its bill.** SL8 measured `fal-ai/video-understanding` at
**8 credits** on a 10 s cut against an `ai-gen estimate` of 3 (VID-T5, 2026-10-08). Quote 8, not the
estimate, and put its line in `plan.json` `budget` before the call; each transcript is its own line
at 2, and a second transcript is a new line. If `estimate` exits 12, the call would run uncapped: use
the local watch below. Run it only when its line is quoted and the pre-spend steps pass:

```bash
ai-gen estimate fal-ai/video-understanding --params-file work/<project>/watch.params.json --format json
ai-gen run fal-ai/video-understanding --params-file work/<project>/watch.params.json \
  --video artifacts/<project>/final/<cut>.mp4 --queue -o artifacts/<project>/qc/ --format json \
  > work/<project>/watch.result.json
```

`watch.params.json` holds `{"prompt": "…", "detailed_analysis": true}`; the `--video` flag uploads the
local file. Store the prompt as sent in the manifest row. When the route is unpriced, the local
watch stands in: extract the frame at the middle of every plan row's window with ffmpeg, build
one sheet (`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet <frames> --out artifacts/<project>/qc/final-sheet.jpg`),
open it with the Read tool, and reconcile the same three things against the plan. Say in the
delivery which watch ran. `fal-ai/sa2va/8b/video` is the named fallback route, under the same
pre-spend steps.

## Listen

**Listen. Step one is demux, and it is a step because a warning did not work.**
An earlier version of this skill said, in bold, that `scribe-v2` takes an
`audio_url` and that an `.mp4` 422s — citing the run that lost a step to it. The
next run sent the `.mp4` anyway. Emphasis is not enforcement (HR19), so:

**9a. Demux the mix to an audio container. Print the output path and its size.**
Then and only then, 9b passes that file to `ai-gen audio stt`, which uploads it inside the call,
and 9c reads the words. If you are about to call
the transcript route with a path ending `.mp4`, you have skipped 9a.


`scribe-v2` takes an `audio_url`, and an `.mp4` handed to it **422s**, which is how
one run lost a step. Extract the mix to a bare audio container in the sandbox
(`ffmpeg -i cut.mp4 -vn -acodec libmp3lame mix.mp3`), and pass that file. "The mixed audio"
means an audio file, not the video that contains it.

Then send it to `fal-ai/elevenlabs/speech-to-text/scribe-v2`, which returns
word-level `start` and `end` times:

```bash
ffmpeg -i artifacts/<project>/final/<cut>.mp4 -vn -acodec libmp3lame work/<project>/mix.mp3
ls -l work/<project>/mix.mp3                                     # 9a: print the path and size
echo '{"diarize": false, "tag_audio_events": false}' > work/<project>/listen.params.json
ai-gen estimate fal-ai/elevenlabs/speech-to-text/scribe-v2 --params-file work/<project>/listen.params.json --format json
ai-gen audio stt work/<project>/mix.mp3 -m fal-ai/elevenlabs/speech-to-text/scribe-v2 \
  --params-file work/<project>/listen.params.json --queue -o artifacts/<project>/qc/ --format json \
  > work/<project>/listen.result.json                            # 9b, 9c: words in raw.words
```

The words arrive in the envelope's `raw.words` (entries of `type` `word`; skip `spacing`). That transcript is what makes the timing claims measurable instead of
asserted. From it, compute and report:

- **Largest silence** — the biggest gap between consecutive words, and where it
  falls. **This is the check that matters, and the one that catches an
  eighteen-second voiceover sitting in the front of a thirty-second ad.** No gap
  over `2.5s` anywhere, none over `1.5s` at the tail. Report the figure and its
  timestamp every time, pass or fail.
- **Speech coverage** — total speech time over runtime, reported *next to* the
  largest gap and never on its own. Coverage alone cannot tell a well-spread ad
  from a front-loaded one: eighteen seconds of speech in thirty is a good ad when
  the gaps are even and a broken one when they are not, and the coverage figure is
  identical in both cases. A low coverage number with small gaps needs no fix.
- **Per-fragment placement** — the first word of each fragment against its
  `vo_start`, and the last word against the end of its shot's window. A fragment
  whose words fall outside its own window has crossed a scene boundary, which
  stage 5 forbids.
- **Empty thirds** — whether any third of the runtime contains no speech at all.
- **Transcript fidelity** — the words heard against the words scripted. A speech
  engine that dropped or mangled a brand name is a defect no visual check sees.

If scribe-v2 is unpriced or refused, `fal-ai/speech-to-text` is the fallback — **but it returns no
word timings**, so say the placement check could not be run.

## When something fails

**What this stage does when something fails.** It reports, with the numbers, and
does not silently re-render — re-rendering costs money and the user is entitled to
the choice. Name the failure, say which fix it needs (a longer line, a moved
boundary, a re-recorded segment, a re-burn), and deliver the file with the finding
attached. Never describe a cut as finished when this stage found a fault in it.

**Do not use `google/gemini-omni-flash` for this.** It is a text-to-video
*generator* — its input is `prompt`, `duration` and `aspect_ratio`, and its output
is a new video. Sending the finished ad to it produces an unrelated clip and
reviews nothing. The name suggests an omni-modal reviewer and it is not one; the
two endpoints above are.
