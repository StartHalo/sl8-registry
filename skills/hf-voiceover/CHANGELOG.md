# Changelog — hf-voiceover

All notable changes to this skill. Versions are git tags (`hf-voiceover/vX.Y.Z`); first publish is v1.0.0.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.1] — 2026-06-22
### Changed
- Batch the voiceover — synthesize the full narration in one ai-gen TTS call + transcribe once, then split word-timings into beats by order (was one TTS + one STT per beat). Collapses 2×N serial ai-gen round-trips to 2; output is now a single `assets/vo/narration.wav` + the same `04-timing.json` contract.

## [v1.0.0] — 2026-06-19
### Added
- Initial release — Generate voiceover via ai-gen TTS (fal-ai/kokoro) and word-level timing via ai-gen ASR (fal-ai/wizper) for caption sync; renders silent + records fallback if TTS is unreachable. Writes assets/vo/*.wav + 04-timing.json.
