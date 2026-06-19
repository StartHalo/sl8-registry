# Changelog — hf-voiceover

All notable changes to this skill. Versions are git tags (`hf-voiceover/vX.Y.Z`); first publish is v1.0.0.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Added
- Initial release — Generate voiceover via ai-gen TTS (fal-ai/kokoro) and word-level timing via ai-gen ASR (fal-ai/wizper) for caption sync; renders silent + records fallback if TTS is unreachable. Writes assets/vo/*.wav + 04-timing.json.
