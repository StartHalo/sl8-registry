// Background-score mood mapping. The score library is the set of REAL, produced tracks
// bundled at scripts/remotion-template/assets/audio/ (the reusable resources); render.sh
// stages them into public/music/ and BackgroundScore loads them via staticFile(). `mood` is
// a render parameter (the script-builder may recommend one; otherwise it's derived from the
// chosen style + tone) and resolves to one of the bundled tracks.
//
// To ADD or SWAP a track: drop an mp3 in assets/audio/, add it here, and (optionally) point a
// mood at it. To regenerate synthetic fallback beds under the same names, see make-scores.mjs.

import type { Mood, StyleName } from "./types";

export const ALL_MOODS: Mood[] = ["calm", "dramatic", "upbeat", "tech"];

// staticFile() paths (relative to public/). Two bundled "Clear Announcement" tracks; the four
// moods map onto them (announcement-1 = the brighter/forward bed, announcement-2 = the warmer/
// weightier bed). Swap freely — these are just file pointers.
export const MOOD_FILE: Record<Mood, string> = {
  upbeat: "music/announcement-1.mp3",
  calm: "music/announcement-1.mp3",
  dramatic: "music/announcement-2.mp3",
  tech: "music/announcement-2.mp3",
};

// Per-style default mood, so every style is musical out of the box.
const STYLE_MOOD: Record<StyleName, Mood> = {
  "headline-highlight": "upbeat",
  "breaking-news": "dramatic",
  "kinetic-typography": "upbeat",
  "minimal-editorial": "calm",
  "box-reveal": "upbeat",
  "giant-word": "dramatic",
  "perspective-3d": "calm",
  "pixel-reveal": "tech",
  "blur-carousel": "calm",
};

// Only STRONG tone signals override the style default; neutral/unknown tones fall through.
const TONE_MOOD: Record<string, Mood> = {
  urgent: "dramatic",
  serious: "dramatic",
  somber: "dramatic",
  celebratory: "upbeat",
  exciting: "upbeat",
  playful: "upbeat",
  technical: "tech",
};

export function moodForStyle(style: StyleName, tone?: string | null): Mood {
  const t = (tone ?? "").toLowerCase().trim();
  if (t && TONE_MOOD[t]) return TONE_MOOD[t];
  return STYLE_MOOD[style] ?? "calm";
}
