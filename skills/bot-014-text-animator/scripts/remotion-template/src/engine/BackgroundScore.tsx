// Background score — a single <Audio> that carries a real, produced track under the whole
// clip with a quick fade in/out. Remotion muxes the audio into the MP4 by default, so no
// extra step is needed at render time. Frame-driven volume (no CSS), so it's deterministic.
//
// The score tracks are the bundled mp3s in assets/audio/ (the reusable library), staged into
// public/music/ by render.sh and resolved per mood via MOOD_FILE. They open with a quieter
// intro, so we START the audio a few seconds in (SCORE_START_SECONDS) to ride the main groove
// instead of the build-up. If a track is missing, render mute by passing music=false in props
// (render.sh patches props.json when no track can be staged).

import React from "react";
import { Audio, interpolate, staticFile, useVideoConfig } from "remotion";
import type { Mood } from "./types";
import { MOOD_FILE } from "./moods";
import { FPS } from "./tokens";

// Skip the track's intro/build-up so the clip rides its energetic section (the bundled tracks
// reach full level ~10-12s in). Safe for the bundled 60s tracks vs an 8-15s clip.
const SCORE_START_SECONDS = 10;

export const BackgroundScore: React.FC<{ mood: Mood; volume?: number }> = ({
  mood,
  // Real, mastered ~-14 LUFS tracks — keep near unity so the muxed score stays clearly audible
  // on phone/laptop speakers (a small headroom margin under the fades).
  volume = 0.95,
}) => {
  const { durationInFrames, fps } = useVideoConfig();
  const fadeIn = Math.min(Math.round(0.5 * FPS), Math.floor(durationInFrames / 5));
  const fadeOut = Math.min(Math.round(1.2 * FPS), Math.floor(durationInFrames / 3));
  const src = staticFile(MOOD_FILE[mood] ?? MOOD_FILE.calm);
  return (
    <Audio
      src={src}
      loop
      startFrom={Math.round(SCORE_START_SECONDS * fps)}
      volume={(f) =>
        interpolate(
          f,
          [0, fadeIn, Math.max(fadeIn + 1, durationInFrames - fadeOut), durationInFrames],
          [0, volume, volume, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      }
    />
  );
};
