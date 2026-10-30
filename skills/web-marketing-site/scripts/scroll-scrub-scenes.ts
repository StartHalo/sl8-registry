// scroll-scrub-scenes.ts: starter for app/src/scroll-scrub-scenes.ts (web-marketing-site).
// Copy it once, then replace every <...> placeholder with the brief's real values; the gate fails
// while any is left. Keep SCENES a module constant (a new array identity rebuilds the engine).
// Single-shot: exactly ONE scene entry whose clip is the film and whose chapters are the journey.
// Multi-leg: one entry per leg in journey order (Architecture B adds kind: 'connector' entries).
import type { ScrubScene, ScrubTheme } from './components/scroll-scrub/scroll-scrub'

export const SCRUB_THEME: ScrubTheme = {
  bg: '<page background hex from the brief>',
  ink: '<copy colour hex from the brief>'
}

export const SCENES: readonly ScrubScene[] = [
  {
    id: 'scene-01',
    clip: '/assets/world/scene-01.mp4',
    poster: '/assets/world/scene-01-poster.png',
    mobileClip: '/assets/world/scene-01-mobile.mp4',
    mobilePoster: '/assets/world/scene-01-mobile-poster.png',
    weight: 1.4,
    linger: 0,
    chapters: [
      { id: 'chapter-1', headline: '<chapter 1 headline>', body: '<one sentence>' },
      { id: 'chapter-2', headline: '<chapter 2 headline>', body: '<one sentence>' },
      { id: 'chapter-3', headline: '<chapter 3 headline>', body: '<one sentence>' }
    ]
  }
]
