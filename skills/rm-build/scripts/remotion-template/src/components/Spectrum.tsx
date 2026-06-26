// Spectrum.tsx — vetted, deterministic audio-reactive visualizer for BOT-032 Remotion Studio.
//
// Owned by the `rm-audioviz` skill; bundled in the starter so every project gets it via init.sh.
// rm-build composes <Spectrum src={staticFile("voiceover/narration.wav")} ... /> when the
// storyboard tags a beat `audiogram` / `music-viz`. It only READS the audio (frequency / waveform
// data) and draws bars or an oscilloscope line — it does NOT play audio (rm-build/rm-voiceover add
// the core <Audio> track separately) and it does NOT render (rm-validate stills + rm-render do).
//
// Contract-clean by construction: frame-driven only (no setTimeout/Date.now/Math.random), no CSS
// transitions/@keyframes, no native <img>/<video>, values clamped to [0,1]. visualizeAudio /
// visualizeAudioWaveform are pure functions of (frame, audioData) → identical pixels every run.
//
// IMPORTANT (useWindowedAudioData is WAV-only): pass a `.wav` src. A music bed in another format
// must be transcoded first (rm-audioviz/scripts/stage-audio.sh → public/audio/<name>.wav).
//
// IMPORTANT (inside <Sequence>): useCurrentFrame() is LOCAL to the sequence, so an internally-loaded
// visualizer would desync from the global audio timeline. When you place <Spectrum> inside a
// <Sequence>/<Series.Sequence> with an offset, pass the GLOBAL frame down via the `frame` prop
// (e.g. frame={useCurrentFrame() + sequenceFrom}). See references/audio-visualization.md.

import React from "react";
import {
  type AudioData,
  createSmoothSvgPath,
  useWindowedAudioData,
  visualizeAudio,
  visualizeAudioWaveform,
} from "@remotion/media-utils";
import { useCurrentFrame, useVideoConfig } from "remotion";

export type SpectrumMode = "bars" | "mirror" | "wave";

export interface SpectrumProps {
  /** A staticFile() WAV path — e.g. staticFile("voiceover/narration.wav"). WAV only. */
  src: string;
  /** "bars" (anchored bottom), "mirror" (symmetric, centered), "wave" (oscilloscope line). */
  mode?: SpectrumMode;
  /** FFT size — MUST be a power of 2 (32,64,128,256,512,1024). Default 256. */
  numberOfSamples?: number;
  /** Fraction slice of the frequency array to draw [start,end] (0=bass, 1=highs). Default [0,0.7]. */
  freqRange?: [number, number];
  /** Optional downsample: average the sliced bins into exactly N visual bars. */
  bars?: number;
  /** Drawing height in px. Default 220. */
  height?: number;
  /** Bar fill color. Ignored if `gradient` is set. Default "#ffffff". */
  color?: string;
  /** Optional top→bottom gradient [from,to] for the bars. */
  gradient?: [string, string];
  /** Gap between bars in px. Default 2. */
  barGap?: number;
  /** Bar corner radius in px. Default 4. */
  rounded?: number;
  /** Linear gain applied to each value before clamping. Default 1. */
  gain?: number;
  /** Optional logarithmic dB scaling [minDb,maxDb] (e.g. [-90,-20]) to balance bass dominance. */
  dbRange?: [number, number] | null;
  /** Windowed-loader window in seconds (clip length is fine for short studio videos). Default 30. */
  windowInSeconds?: number;
  /** "accuracy" (default) or "speed" — use "speed" for high sample counts / many bars. */
  optimizeFor?: "accuracy" | "speed";
  /** Stroke width for "wave" mode. Default 3. */
  strokeWidth?: number;
  /** Pass the GLOBAL frame when used inside a <Sequence> with an offset (see header note). */
  frame?: number;
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

// Logarithmic (dB) rescale so quiet highs stay visible against loud bass. Guards log10(0).
const toDb = (value: number, minDb: number, maxDb: number): number => {
  const db = 20 * Math.log10(Math.max(value, 1e-6));
  return clamp01((db - minDb) / (maxDb - minDb));
};

// Average `src` into exactly `count` buckets (deterministic downsample).
const bucketize = (src: number[], count: number): number[] => {
  if (count <= 0 || count >= src.length) return src;
  const out: number[] = [];
  const size = src.length / count;
  for (let i = 0; i < count; i++) {
    const a = Math.floor(i * size);
    const b = Math.max(a + 1, Math.floor((i + 1) * size));
    let sum = 0;
    for (let j = a; j < b; j++) sum += src[j];
    out.push(sum / (b - a));
  }
  return out;
};

export const Spectrum: React.FC<SpectrumProps> = ({
  src,
  mode = "bars",
  numberOfSamples = 256,
  freqRange = [0, 0.7],
  bars,
  height = 220,
  color = "#ffffff",
  gradient,
  barGap = 2,
  rounded = 4,
  gain = 1,
  dbRange = null,
  windowInSeconds = 30,
  optimizeFor = "accuracy",
  strokeWidth = 3,
  frame: frameProp,
}) => {
  const { fps, width } = useVideoConfig();
  const localFrame = useCurrentFrame();
  const frame = frameProp ?? localFrame;

  const { audioData, dataOffsetInSeconds } = useWindowedAudioData({
    src,
    frame,
    fps,
    windowInSeconds,
  });

  // Audio still loading (or unreachable) → render nothing this frame. Never throw headless.
  if (!audioData) {
    return null;
  }

  const background = gradient
    ? `linear-gradient(to top, ${gradient[0]}, ${gradient[1]})`
    : color;

  if (mode === "wave") {
    return (
      <WaveLine
        audioData={audioData}
        frame={frame}
        fps={fps}
        width={width}
        height={height}
        numberOfSamples={numberOfSamples}
        windowInSeconds={windowInSeconds}
        dataOffsetInSeconds={dataOffsetInSeconds}
        stroke={gradient ? gradient[0] : color}
        strokeWidth={strokeWidth}
      />
    );
  }

  const raw = visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples,
    optimizeFor,
    dataOffsetInSeconds,
  });

  const start = Math.floor(clamp01(freqRange[0]) * raw.length);
  const end = Math.max(start + 1, Math.floor(clamp01(freqRange[1]) * raw.length));
  let values = raw.slice(start, end);
  if (bars) values = bucketize(values, bars);

  values = values.map((v) => {
    const scaled = dbRange ? toDb(v, dbRange[0], dbRange[1]) : v * gain;
    return clamp01(scaled);
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: mode === "mirror" ? "center" : "flex-end",
        justifyContent: "center",
        gap: barGap,
        height,
        width: "100%",
      }}
    >
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            // floor of 2% so silent bins still read as a baseline tick, not a gap.
            height: `${Math.max(2, v * 100)}%`,
            minWidth: 2,
            borderRadius: rounded,
            background,
          }}
        />
      ))}
    </div>
  );
};

const WaveLine: React.FC<{
  audioData: AudioData;
  frame: number;
  fps: number;
  width: number;
  height: number;
  numberOfSamples: number;
  windowInSeconds: number;
  dataOffsetInSeconds: number;
  stroke: string;
  strokeWidth: number;
}> = ({
  audioData,
  frame,
  fps,
  width,
  height,
  numberOfSamples,
  windowInSeconds,
  dataOffsetInSeconds,
  stroke,
  strokeWidth,
}) => {
  const waveform = visualizeAudioWaveform({
    fps,
    frame,
    audioData,
    numberOfSamples,
    windowInSeconds: Math.min(0.5, windowInSeconds),
    dataOffsetInSeconds,
  });

  const points = waveform.map((y, i) => ({
    x: (i / Math.max(1, waveform.length - 1)) * width,
    y: height / 2 + (y * height) / 2,
  }));
  const path = createSmoothSvgPath({ points });

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
};

/**
 * Bass-reactive intensity (0..1) for beat-pulsing other elements (e.g. scale a logo on the kick).
 * Deterministic; call from the same frame you render. Average of the lowest 25% of the spectrum.
 * NOT a hook (visualizeAudio is a pure function) — safe to call conditionally. Pass it the
 * audioData/dataOffsetInSeconds you already loaded with useWindowedAudioData in the parent.
 */
export const getBassIntensity = (
  audioData: AudioData | null,
  frame: number,
  fps: number,
  dataOffsetInSeconds: number,
  numberOfSamples = 128,
): number => {
  if (!audioData) return 0;
  const freqs = visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples,
    optimizeFor: "speed",
    dataOffsetInSeconds,
  });
  const low = freqs.slice(0, Math.max(1, Math.floor(numberOfSamples * 0.25)));
  const sum = low.reduce((acc, v) => acc + v, 0);
  return clamp01(sum / low.length);
};
