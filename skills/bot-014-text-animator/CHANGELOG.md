# Changelog — bot-014-text-animator

All notable changes to this skill. Versions are git tags (`bot-014-text-animator/vX.Y.Z`); first publish is v1.0.0.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.2.1] — 2026-06-15
### Changed
- (next version's changes)

## [v1.2.0] — 2026-06-15
### Added
- **Real, produced score tracks (replacing the synth as the primary score).** Bundled two mastered ~−14 LUFS tracks in `scripts/remotion-template/assets/audio/` (`announcement-1.mp3`, `announcement-2.mp3`) as the reusable score library; `render.sh` stages them into `public/music/` and `<BackgroundScore>` muxes the mood-mapped track. `<BackgroundScore>` now skips the track's quiet intro (`SCORE_START_SECONDS` ≈ 10 s) to ride the main groove and runs near unity volume. `make-scores.mjs` is retained as a synth FALLBACK that writes the same filenames. The test harness uploads binary assets (mp3/png/fonts) as raw Buffers so the tracks reach the sandbox intact. To add/swap a track: drop an mp3 in `assets/audio/` + point a mood at it (`engine/moods.ts`).

## [v1.1.1] — 2026-06-12
### Changed
- **Score robustness — never silently mute.** `make-scores.mjs` now degrades the ffmpeg encode (full EQ → highpass+lowpass → none) and tries libmp3lame then native mp3, so it produces a bed wherever mp3 encoding works (the audibility is baked into the Node synth, not the EQ). `render.sh` skips synthesis when `music:false`, verifies a bed was actually produced (else mutes + warns loudly), and **asserts the rendered MP4 carries an audio stream** when music is on — surfacing a silent render instead of passing it. (Verified in-sandbox: sl8-animation's ffmpeg has libmp3lame/equalizer/alimiter, so the full chain is used there; sandbox skill output measures −14.6 LUFS, identical to host.)

## [v1.1.0] — 2026-06-11
### Added
- **Font packs (typography is now a parameter).** New `fontPack` prop — `modern` (default, Inter/Fraunces/Oswald) · `editorial` (Manrope/Playfair Display) · `bold` (Anton/Bebas Neue) · `tech` (Space Grotesk/DM Serif). Threaded via a `FontProvider` context so every style picks up the chosen pairing with zero style-code changes; all packs are loaded deterministically at module level. Brand color (`brand.accent`) + font pack are documented as a first-class **brand kit**, resolved from `context.md` with stated defaults, and reported back to the user after each render.
### Changed
- **Audible, mid-forward score.** The beds were bass-heavy (energy <200 Hz), so they measured "loud" but vanished on phone/laptop speakers. Re-voiced them mid-forward, added a **melodic arpeggio** (a clear pluck line, not just a pad), a presence EQ (sub-bass cut + 1.5–5 kHz boost) and raised volume to 0.92 → the muxed track is now ~-14 LUFS with the speaker-band (300–3500 Hz) within ~2 dB of full. Clearly audible on small speakers.

## [v1.0.1] — 2026-06-11
### Changed
- **Louder, fuller background score.** The muxed bed was too quiet for a music-only clip (~-25 dB mean). Raised `BackgroundScore` volume 0.42 → 0.85 and made the synth beds fuller (shallower tremolo/pulse, more headroom) so the bed now lands ~-18 dB mean / -6 dB peak — clearly audible, no clipping. Also hardened `giant-word`'s hero stat to auto-fit a long `primary_stat.value` (no overflow garble).

## [v1.0.0] — 2026-06-11
### Added
- Initial skill (the Kinetic Text renderer): render a MessageDoc as a styled animated-text MP4 — **nine styles × three aspect ratios (16:9/9:16/1:1)** with a **background score**. Style + aspect ratio + mood are parameters; you never hand-write React.
- `scripts/remotion-template/` — a complete, pre-built Remotion project: a shared `engine/` (deterministic fonts, type-scale floors, seeded RNG, pacing, StyleConfig, SafeZone, primitives) plus:
  - **Shared scene-sequencer** (`engine/sequence.ts` + `engine/SceneSeries.tsx`) — every style turns the MessageDoc into ordered scenes (headline → beats → stat → quote → credit) and transitions through them via `@remotion/transitions`, so no style holds a single headline.
  - **Background score** (`engine/{BackgroundScore,moods}.tsx` + `make-scores.mjs`) — four offline-synthesized, license-clean mood beds (calm/dramatic/upbeat/tech), looped + frame-faded under the clip and muxed into the MP4. Generated in-project by `render.sh` (sidesteps binary-upload corruption).
  - **Nine styles** (`src/styles/*`): kinetic-typography, box-reveal, giant-word, perspective-3d, pixel-reveal, blur-carousel (the five new ones adapted from the Skiper references to time-based Remotion), plus breaking-news, headline-highlight, minimal-editorial (all upgraded from static-headline holds to full message walks).
  - Per-aspect-ratio `<Composition>` registration; style chosen via `props.style`, mood via `props.mood`, score toggled via `props.music`.
- `scripts/render.sh` — generate score beds + version-aligned Remotion install + Chrome-shell ensure (uses sl8-animation's pre-installed shell) + per-AR render + best-effort ffprobe verify; renders silent if score synthesis is unavailable.
- `references/` — `styles.md` (the nine looks + fields each uses), rendering (troubleshooting), legibility (safe zones / min sizes / pacing); `engine/STYLE-AUTHORING.md` (the engine contract for adding a style).
- `evals/evals.json` — 6 expectation sets with media-judge (vision) dimensions, covering the upgraded + new styles, the scene walk, and the background score.
