// Background-score mood mapping. One bundled bed per mood, generated offline by
// make-scores.mjs into public/music/<mood>.mp3 and loaded via staticFile() at render time.
// `mood` is a render parameter: the script-builder may recommend one; otherwise it is
// derived from the chosen style (and nudged by the message tone).

import type { Mood, StyleName } from "./types";

export const ALL_MOODS: Mood[] = ["calm", "dramatic", "upbeat", "tech"];

// staticFile() paths (relative to the Remotion project's public/ dir).
export const MOOD_FILE: Record<Mood, string> = {
  calm: "music/calm.mp3",
  dramatic: "music/dramatic.mp3",
  upbeat: "music/upbeat.mp3",
  tech: "music/tech.mp3",
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
