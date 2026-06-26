# Audio visualization in Remotion — the SL8 Remotion Studio contract

Ported from the bundled official rule
(`.agents/skills/remotion-best-practices/rules/audio-visualization.md`) and tightened to the
BOT-032 runtime. The canonical, vetted implementation of everything below already ships as
**`remotion-project/src/components/Spectrum.tsx`** (bundled in the starter, copied into every project
by `rm-build/scripts/init.sh`). Prefer composing `<Spectrum>`; only hand-author a bespoke visualizer
when the idea genuinely can't be expressed with bars / mirror / wave.

## What this draws

`@remotion/media-utils` reads decoded audio and hands you per-frame numbers; you draw them frame by
frame. Three shapes cover almost every request:

- **bars** — vertical frequency bars anchored at the bottom (audiogram / podcast clip look).
- **mirror** — the same bars mirrored around the centre line (symmetric music-viz look).
- **wave** — an oscilloscope line (`visualizeAudioWaveform` + `createSmoothSvgPath`).

`<Spectrum>` is presentational and reactive only — it visualizes; it does **not** play the audio. The
actual audible track is a separate core `<Audio src={staticFile("…")}/>` added by `rm-build` /
`rm-voiceover`. The render itself is keyless (Remotion → headless Chrome + FFmpeg); no AI model.

## Loading audio data (WAV-only, windowed)

Use `useWindowedAudioData()` — memory-efficient (it loads a sliding window, not the whole file),
which matters under the ~1.9 GB sandbox ceiling (>1.9 GB → Exit-137 OOM; renders run
`--concurrency=1`). **It only supports `.wav`.**

```tsx
import { useWindowedAudioData, visualizeAudio } from "@remotion/media-utils";
import { staticFile, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const { audioData, dataOffsetInSeconds } = useWindowedAudioData({
  src: staticFile("voiceover/narration.wav"), // WAV — transcode a music bed first (see below)
  frame,
  fps,
  windowInSeconds: 30,
});
if (!audioData) return null; // still loading / unreachable — render nothing this frame
```

> Do **not** use whole-file `getAudioData`/`useAudioData` for long beds — windowed stays under the RAM
> ceiling. (BOT-015 hit Exit-137 OOM six times; keep the footprint small.)

### Audio source & staging
- **Voiceover (JTBD-1)** — `rm-voiceover` writes `assets/vo/narration.wav`; `init.sh` stages it to
  `public/voiceover/narration.wav` → `staticFile("voiceover/narration.wav")`. Already WAV.
- **Music bed / any non-WAV** — run `scripts/stage-audio.sh <input> <project>/remotion-project`. It
  transcodes (mp3/m4a/aac/flac/ogg) to a 44.1 kHz mono 16-bit WAV at
  `public/audio/<base>.wav` → `staticFile("audio/<base>.wav")`, and prints the `static_path` plus a
  suggested `windowInSeconds` (= ceil(duration)).

## Spectrum bars

```tsx
const frequencies = visualizeAudio({
  fps, frame, audioData,
  numberOfSamples: 256,        // MUST be a power of 2 (32,64,128,256,512,1024)
  optimizeFor: "speed",        // "speed" for high sample counts / many bars; else "accuracy"
  dataOffsetInSeconds,         // REQUIRED when using windowed data — keeps the window aligned
});
// frequencies: number[] in 0..1. Left of the array = bass, right = highs.
```

The bundled `<Spectrum>` slices the lower portion (`freqRange`, default `[0,0.7]` — where speech/music
energy lives), optionally averages into a fixed `bars` count, applies `gain` or optional `dbRange`
log scaling, clamps to `[0,1]`, and draws flex bars.

## Waveform (oscilloscope)

```tsx
import { createSmoothSvgPath, visualizeAudioWaveform } from "@remotion/media-utils";

const waveform = visualizeAudioWaveform({
  fps, frame, audioData, numberOfSamples: 256, windowInSeconds: 0.5, dataOffsetInSeconds,
});
const path = createSmoothSvgPath({
  points: waveform.map((y, i) => ({ x: (i / (waveform.length - 1)) * width, y: H / 2 + (y * H) / 2 })),
});
return <svg width={width} height={H}><path d={path} fill="none" stroke="#0b84f3" strokeWidth={3} /></svg>;
```

## Bass-reactive effects (pulse other elements on the kick)

Extract the low band and use it to drive a scale/opacity elsewhere (logo punch on the beat). Exported
from `Spectrum.tsx` as `getBassIntensity(audioData, frame, fps, dataOffsetInSeconds)` (a pure
function, **not** a hook — safe to call conditionally):

```tsx
const bass = getBassIntensity(audioData, frame, fps, dataOffsetInSeconds); // 0..1
const scale = 1 + bass * 0.5;
```

## Postprocessing — log (dB) scaling

Low frequencies naturally dominate; pass `dbRange={[-90,-20]}` to balance them (the component applies
`db = 20*log10(value)` then normalizes to `[0,1]`, guarding `log10(0)`).

## Hard rules (this is what `rm-validate` enforces — keep `<Spectrum>` contract-clean)

1. **Pass `frame` down inside a `<Sequence>`.** `useCurrentFrame()` is **local** (resets to 0) inside
   a `<Sequence>`/`<Series.Sequence>` with an offset, so an internally-loaded visualizer desyncs from
   the global audio. When you place `<Spectrum>` inside an offset sequence, pass the **global** frame:
   `<Spectrum frame={useCurrentFrame() + sequenceFrom} … />`. Equivalently, load `audioData` + `frame`
   once in the parent and feed children — never re-call `useCurrentFrame()` per child.
2. **WAV only** for `useWindowedAudioData`. Transcode first (`stage-audio.sh`); never point it at mp3.
3. **`numberOfSamples` is a power of 2.** Non-power-of-2 throws.
4. **Always pass `dataOffsetInSeconds`** from `useWindowedAudioData` into `visualizeAudio` /
   `visualizeAudioWaveform` — without it the window misaligns and the bars jump.
5. **Deterministic, frame-driven.** `visualizeAudio`/`visualizeAudioWaveform` are pure functions of
   `(frame, audioData)` → identical pixels every run. No `Math.random`, `Date.now`, `setTimeout`, no
   cross-frame React state, no CSS `transition`/`@keyframes`. (Contract C1/C2/C3.)
6. **Clamp.** All drawn values are clamped to `[0,1]` (NaN/overshoot → off-screen bars).
7. **Place content in `<SafeZone>`.** The caller wraps `<Spectrum>` so the bars clear the platform UI
   rails (Reels caption / IG crop / YouTube scrubber).
8. **`optimizeFor: "speed"`** for high sample counts or many bars (keeps the still/render fast).

## Gotchas
- **Blank / flat bars in the still** — audio not staged to `public/`, wrong `src`, or a non-WAV file
  silently failing to decode. Re-run `stage-audio.sh`; confirm `staticFile(...)` matches the
  `static_path` it printed.
- **Bars frozen across the whole clip** — you forgot `dataOffsetInSeconds`, or you're reading a local
  sequence frame instead of the global one (rule 1).
- **All energy crammed into the first few bars** — bass dominance; set `dbRange={[-90,-20]}` or widen
  `freqRange`.
- **Render slow** — drop `numberOfSamples`, set `optimizeFor: "speed"`, reduce visible `bars`.

## See also
- Component: `remotion-project/src/components/Spectrum.tsx` (this skill owns its contract).
- Audio playback: `.agents/skills/remotion-best-practices/rules/audio.md` (core `<Audio>` — added by
  `rm-build`/`rm-voiceover`, separate from this visualizer).
- Voiceover source: `rm-voiceover` (keyless ai-gen Kokoro → `assets/vo/narration.wav`).
