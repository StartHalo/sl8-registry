# Mix and duck: stages 6 and 7

Read this before stage 6. Below, `Q` is `$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs` (media-qc
1.1.0) and `<project>` the project folder under `artifacts/`.

## Stages 6–7 — Music and the mix

Settle `Music` per Step 0: a stated default, never a question. A bed from
`media-audio-generation` is a paid stage: run the pre-spend steps in SKILL.md first. Then assemble
in the sandbox with ffmpeg:

1. Concatenate the approved clips in plan order. First run `node $Q clipset artifacts/<project>/clips/`:
   a clip whose fps, size, pixel format or audio layout differs from the rest is named before the
   concat, where it is free to fix.
2. Lay each voiceover segment at its **`vo_start`** — not at its shot's `start`.
3. **Duck the bed with sidechain compression keyed to the voiceover** — not with
   a static gain, and never with a gate. A fixed multiplier was tried and it
   buried the narration: it cannot know how loud the bed's own material is
   moment to moment, so a fixed `0.15` leaves a busy passage still sitting on
   top of the words. Use ffmpeg's `sidechaincompress` with the VO stem as the
   key, a moderate ratio around 4:1, a fast attack and a release around
   250–400 ms so the bed comes back up between lines instead of pumping.
   **A duck is a dip, not a mute.** Real runs shipped ads where the music
   audibly stopped under every line and restarted after it, which reads as a
   broken file rather than a mix. Aim the settings at **6–9 dB of gain
   reduction** during speech; past 12 dB the music has stopped, whatever the
   filter was called.
4. **Then verify the ducking by measuring, not by listening once — in both
   directions.** The first version of this check could only fail one way, and a
   bed muted to silence sailed through it — the same one-directional shape as
   the timing check this skill opens with. Compute loudness over the voiceover
   regions and over the bed-only regions, on the mix and on the bed stem, and
   print both results (`node $Q duck <mix> --bed <bed-as-mixed> --plan artifacts/<project>/plan.json`, where the bed is the
   stem **as mixed**, after the sidechain duck, written out by the mix step; the pre-duck bed would read a
   duck depth of about 0;
   prints both figures and fails either way):
   - **Bed too loud** — speech sits at least **9 LUFS above** the bed underneath
     it. Below that the duck did not work: a bed that merely got quieter overall
     passes a casual listen and still buries a quiet line.
   - **Bed vanished** — the bed under speech stays within **12 dB of its own
     bed-only level** and remains measurably present, never digital silence.
     Deeper is a mute wearing a duck's name; the music plays *through* the
     line, just lower.
5. **Normalise the finished mix to −16 LUFS.** A mix that is merely "not clipping"
   is not normalised. Normalise **after** ducking, never before: normalising first
   re-raises the bed you just ducked. Measure it: `node $Q loudness <final> --target -16`
   (true peak −1.5 dBTP).

Both figures are defaults, stated here so they stop being decided fresh each time.
Report the numbers used — a mix whose levels are undocumented cannot be matched by
the next ad in the campaign.

Record the mix as a manifest row with `tool` (the ffmpeg command) and its parents (the clip, VO and
bed rows), and keep every stem: stage 10 delivers them.
