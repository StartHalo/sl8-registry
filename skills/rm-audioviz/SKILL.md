---
name: rm-audioviz
description: "Add an audio-reactive spectrum / waveform visualizer (audiogram, music-viz, bass pulse) to a Remotion Studio project, driven by a voiceover or music track via @remotion/media-utils (visualizeAudio / useWindowedAudioData). A CAPABILITY skill woven into the BUILD phase — it does NOT own a phase or a numbered artifact and it does NOT render. It stages the audio to WAV in public/ (useWindowedAudioData is WAV-only), ensures the vetted Spectrum.tsx component is present, and tells rm-build how to compose [Spectrum] (mode/freqRange/palette). Use when the storyboard tags a beat `audiogram` / `music-viz`, when a request is a podcast/voice clip with on-screen bars, or when an element should pulse to the beat. Reads the audio from rm-voiceover (assets/vo/narration.wav) or a staged music bed; reads 01-concept.md for palette and 03-storyboard.md for placement. Keyless; if no audio track exists it skips the visualizer and records why — it never prompts the user."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [rm-build, rm-voiceover]
  inputs:
    - name: audio
      type: audio
      required: true
      description: "The track to visualize. Default = artifacts/[project]/assets/vo/narration.wav (from rm-voiceover, already WAV + staged to public/voiceover/ by init.sh). A music bed in any other format is transcoded to WAV by scripts/stage-audio.sh (useWindowedAudioData is WAV-only)."
    - name: storyboard
      type: markdown
      required: false
      description: "artifacts/[project]/03-storyboard.md — when a beat is tagged `audiogram` / `music-viz`, it names the visualizer mode (bars/mirror/wave), placement, and which scene(s) it covers."
    - name: concept
      type: markdown
      required: false
      description: "artifacts/[project]/01-concept.md — the palette (hex literals) for the bar/line colors so the visualizer is on-brand."
    - name: mode
      type: text
      required: false
      description: "bars | mirror | wave. Default = bars (audiogram). Resolve from the storyboard tag, else the user request, else bars."
  outputs:
    - name: spectrum-component
      type: x-tsx
      path: artifacts/[project]/remotion-project/src/components/Spectrum.tsx
      description: "The vetted, deterministic audio-reactive component (bars/mirror/wave + getBassIntensity), present in every project via the bundled starter. rm-audioviz guarantees it is present and composed into the active composition with src/mode/palette/freqRange set. No rendering — rm-validate stills + rm-render produce pixels."
    - name: staged-audio
      type: audio
      path: artifacts/[project]/remotion-project/public/audio/[name].wav
      description: "The visualized track transcoded to a 44.1 kHz mono 16-bit WAV and staged for staticFile(\"audio/[name].wav\"), produced by scripts/stage-audio.sh when a music bed is used. (A voiceover track is already staged to public/voiceover/ by init.sh and needs no transcode.)"
---

# rm-audioviz — audio-reactive spectrum / waveform visualizer

## Purpose
Make a Remotion Studio video **react to its audio**: vertical frequency **bars** (audiogram / podcast
clip), a **mirror** music-viz, an oscilloscope **wave**, or a **bass pulse** on another element — all
driven by a voiceover or music track through `@remotion/media-utils`. This is a **capability skill**:
it owns no phase and no numbered artifact. It ships a vetted, contract-clean component
(`Spectrum.tsx`, bundled in the starter so every project has it) plus the reference contract, and it
prepares the inputs `rm-build` needs to **compose** the visualizer into the composition it authors.
The visualizer only *reads* the audio (it does not play it — the audible `<Audio>` track is added
separately by `rm-build`/`rm-voiceover`) and it **never renders** (the `rm-validate` gate stills and
`rm-render` produce pixels).

`$SKILL` = this skill's directory. The full Remotion API contract, hard rules, and gotchas live in
`references/audio-visualization.md` — read it before composing.

## When to run
- **Build phase (phase 5)**, woven into `rm-build`, when the work is audio-reactive:
  - the storyboard tags a beat **`audiogram`** / **`music-viz`**, or
  - JTBD-3 with on-screen bars over a podcast / voice clip, or
  - JTBD-5 ("describe any video") where the idea is a waveform / spectrum / beat-pulse, or
  - any request that says "make it react to the music / pulse on the beat".
- Progressive disclosure: a plain kinetic-headline or chart request never loads this skill.
- Do **not** use it to write the script (`rm-script`), generate the voiceover (`rm-voiceover`), author
  the whole composition (`rm-build`), validate (`rm-validate`), or render (`rm-render`).

## Inputs (read before write)
- **audio** (required) — resolve the track: the user's named clip → else the project voiceover
  `artifacts/<project>/assets/vo/narration.wav` (from `rm-voiceover`). If there is **no** audio track,
  take the no-audio fallback (below) — never invent one, never prompt.
- **03-storyboard.md** (optional) — the `audiogram`/`music-viz` tag, mode, and placement.
- **01-concept.md** (optional) — palette hex literals for the bar/line color (`color` or `gradient`).
- **mode** (optional) — bars | mirror | wave (default bars).

## Procedure

### 1. Stage the audio as WAV in the project's public/
`useWindowedAudioData` is **WAV-only** and windowed (memory-safe under the ~1.9 GB ceiling). The
voiceover is already a WAV staged to `public/voiceover/` by `init.sh`. For a **music bed or any
non-WAV** track, transcode + stage it:
```bash
bash "$SKILL/scripts/stage-audio.sh" <input-audio> artifacts/<project>/remotion-project [out-basename]
#  -> writes public/audio/<base>.wav, prints {static_path, duration, window_in_seconds, spectrum_component}
```
Parse the printed JSON: `static_path` is what `staticFile()` takes (e.g. `audio/track.wav`),
`window_in_seconds` is the suggested `windowInSeconds`, `spectrum_component:true` confirms the vetted
component is present. If you are visualizing the **voiceover**, skip the transcode and use
`staticFile("voiceover/narration.wav")` directly.

### 2. Confirm the vetted component is present
`Spectrum.tsx` ships in the bundled starter and `init.sh` copies it to
`artifacts/<project>/remotion-project/src/components/Spectrum.tsx`. `stage-audio.sh` asserts this
(`spectrum_component:true`). If it is missing (`false`), the project was not scaffolded from the
starter — re-run `rm-build/scripts/init.sh`. Do **not** hand-write a replacement from scratch.

### 3. Choose mode + parameters (from the storyboard / concept)
- **mode** — `bars` (audiogram, default), `mirror` (symmetric music-viz), `wave` (oscilloscope).
- **color / gradient** — the concept palette accent (hex literals), never invented.
- **freqRange** — default `[0, 0.7]` (lower band where voice/music energy lives); widen for bright music.
- **bars** — downsample to a fixed bar count for a chunky look (e.g. 48); omit for fine bars.
- **dbRange** — set `[-90, -20]` when bass dominates and highs vanish (log balance).
- **numberOfSamples** — power of 2 (256 default; `optimizeFor:"speed"` for high counts / many bars).

### 4. Tell rm-build how to compose it
Hand `rm-build` the exact wiring. The visualizer goes inside `<SafeZone>` so bars clear the platform
UI rails. Pair it with the audible `<Audio>` (added by `rm-build`/`rm-voiceover`). Example the author
drops into the composition:
```tsx
import { Spectrum } from "./components/Spectrum";
import { Audio, staticFile } from "remotion"; // <Audio> = playback (separate); <Spectrum> = visual only
// inside a scene, within <SafeZone>:
<Audio src={staticFile("voiceover/narration.wav")} />
<Spectrum
  src={staticFile("voiceover/narration.wav")}
  mode="bars"
  numberOfSamples={256}
  freqRange={[0, 0.7]}
  bars={48}
  height={260}
  gradient={["#22d3ee", "#2dd4bf"]}   // concept palette
  optimizeFor="speed"
/>
```
**Inside a `<Sequence>` with an offset**, pass the GLOBAL frame so the bars stay synced to the audio:
`<Spectrum frame={useCurrentFrame() + sequenceFrom} … />` (see `references/audio-visualization.md`
rule 1). For a beat-pulse instead of bars, use the exported pure function
`getBassIntensity(audioData, frame, fps, dataOffsetInSeconds)` to drive a `scale`/`opacity`.

### 5. Hand off to the gate
The composed visualizer is validated by `rm-validate` like any other authored code: contract lint
(no `Math.random`/`Date.now`/CSS transitions; clamped values), `tsc`, then a **still + vision grade**
— the still must show **non-flat, on-brand** bars/line that move frame-to-frame. A flat/blank
spectrum routes back to `rm-build` with the diagnostic (usually a missing `dataOffsetInSeconds`, a
non-WAV `src`, or a local-vs-global frame mismatch — see the gotchas in the reference).

## Outputs
- `artifacts/<project>/remotion-project/src/components/Spectrum.tsx` — the vetted, deterministic
  audio-reactive component (bars / mirror / wave + `getBassIntensity`), present via the bundled
  starter and **composed** into the active composition with `src`/`mode`/palette/`freqRange` set.
  This skill owns its contract. **No rendering happens here.**
- `artifacts/<project>/remotion-project/public/audio/<name>.wav` — the visualized music bed,
  transcoded to a 44.1 kHz mono 16-bit WAV and staged for `staticFile("audio/<name>.wav")` (only when
  a music bed is used; a voiceover track is already staged to `public/voiceover/` by `init.sh`).

## Failure / fallback (headless — never prompt)
- **No audio track at all** (no voiceover, no bed) — an audio-reactive visualizer is impossible. Do
  NOT fabricate audio. Either (a) **skip** the visualizer and record in `state.md` that the
  audio-reactive element was dropped (no audio source), or (b) if the storyboard's *hero* IS the
  audiogram, fall back to a **frame-driven placeholder** (bars animated by `interpolate`/`spring` on
  `frame`, not by audio) and flag it `audio_reactive:false` in `06-summary.md`. The video still ships.
- **`stage-audio.sh` non-zero** (missing input / no ffmpeg) — report it; if the source was a music bed
  the bed is unavailable → take (a). ffmpeg/ffprobe are present on `sl8-animation`.
- **`spectrum_component:false`** — re-run `rm-build/scripts/init.sh`; never scaffold a replacement.
- Always keyless (no AI model in the render); never block the project on the visualizer.

## Examples

### Example 1 — voiceover audiogram (JTBD-3)
A 30s voice clip → bars over the speaker. Audio already at `public/voiceover/narration.wav` (no
transcode). Tell `rm-build` to compose `<Spectrum src={staticFile("voiceover/narration.wav")}
mode="bars" bars={48} gradient={[accent, accentAlt]} />` inside `<SafeZone>` over the clip, with an
audible `<Audio>`. Validate → still shows moving on-brand bars → render.

### Example 2 — music-viz with a bed (JTBD-5)
"A square spectrum that pulses to this track." Run
`stage-audio.sh track.mp3 artifacts/<proj>/remotion-project` → `public/audio/track.wav`,
`window_in_seconds: 12`. Compose `<Spectrum src={staticFile("audio/track.wav")} mode="mirror"
windowInSeconds={12} dbRange={[-90,-20]} />`, plus a logo that scales with `getBassIntensity`. Render.

### Example 3 — no audio source (fallback)
A request asks for "sound bars" but the project has no voiceover and no bed. Skip the visualizer (or
use the frame-driven placeholder if it is the hero element), record `audio_reactive:false` in
`06-summary.md` and the reason in `state.md`, and report it honestly. Do not prompt the user.

## Quality criteria
- [ ] The audio is a WAV in `public/` (voiceover staged, or a bed transcoded by `stage-audio.sh`).
- [ ] `<Spectrum>` is composed with a real `staticFile()` WAV `src`, an on-brand `color`/`gradient`,
      a power-of-2 `numberOfSamples`, and `dataOffsetInSeconds` wired (the component handles it).
- [ ] Inside an offset `<Sequence>`, the GLOBAL `frame` is passed so the bars stay synced.
- [ ] Contract-clean: frame-driven, deterministic, clamped, no CSS transitions / `Math.random` — passes
      `rm-validate`'s lint + `tsc`.
- [ ] The still vision-grade shows **non-flat, on-brand** bars/line that move frame-to-frame.
- [ ] No audio source → the visualizer is skipped or a frame-driven placeholder is used, and the
      fallback is recorded — never a prompt, never fabricated audio.
