# Changelog

All notable changes to this skill are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versions are tagged in the `StartHalo/sl8-registry` repo as `bot-008-pixel-art-studio/vMAJOR.MINOR.PATCH`. `publish-skill.sh` promotes this file automatically: on each publish, `[Unreleased]` becomes `[v<new-version>] — <today>` and a fresh empty `[Unreleased]` section is inserted at the top.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-05-05
### Added
- Initial v1.0.0 — vendored from [Synero/pixel-art-studio](https://github.com/Synero/pixel-art-studio) (MIT, snapshot 2026-05-05).
- Text → pixel art flow via Pollinations API (free, no API key, ~1 req/60s rate limit). 7 technical styles, 14 artistic styles, 5 aspect ratios.
- Photo → pixel art flow via local Wu's Color Quantization. 14 hardware presets (NES, SNES, Game Boy, C64, etc.), 40+ named palettes, 4 dithering methods.
- `summary.md` written next to every PNG documenting the prompt/preset/palette/dither choices.
- Headless rule: missing input → `error.md` and non-zero exit. Pollinations 429 → wait ≥60s, retry once, then fail clean.
- Animated video (`pixelart_video.py`) intentionally out of scope for this version.
