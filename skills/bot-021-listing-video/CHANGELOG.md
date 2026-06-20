# Changelog — bot-021-listing-video

All notable changes to this skill. Versions are git tags (`bot-021-listing-video/vX.Y.Z`); no `version:` in frontmatter.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.1] — 2026-06-20
### Fixed
- Fix `scripts/assemble-listing.sh`: scale the burned-in first-frame AB-723 disclosure caption by WIDTH (`fontsize=w/42`) instead of height (`h/26`) so the full disclosure line fits within the frame on 9:16 (it overflowed the right edge at 1080×1920) and 16:9 — the disclosure must be fully legible to be AB-723-conspicuous.

## [v1.0.0] — 2026-06-20
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Added
- Initial authoring (BOT-021 cinematic-listing-video). The flagship + default phase: a deterministic, KEYLESS, MLS-safe Ken-Burns slideshow that turns a listing's REAL photos into a publish-ready cinematic video with ZERO generative calls (pure ffmpeg). Builds a branded intro card, one slow single-axis virtual-camera move per photo (photos shipped VERBATIM — only the camera moves, no pixel synthesis, no melting geometry), a CTA outro, an optional licensed music bed, and the mandatory burned first-frame California AB-723 disclosure. Renders BOTH a 16:9 (web/MLS/YouTube) and a 9:16 (Reels/TikTok/Shorts) export, then routes through the shared disclosure-stamp skill for the MLS remark + AB-723 line + reachable-original note (the real photos ARE the unaltered originals).
- References `scripts/still-segment.sh` (photo → single-axis Ken-Burns segment, KEYLESS), `scripts/title-card.sh` (branded intro/outro card), `scripts/assemble-listing.sh` (normalize + concat + music bed + first-frame AB-723 disclosure burn + ffprobe-verify, prints a PASS/FLAG JSON verdict; FLAG still exits 0).
- `references/ffmpeg-slideshow.md` (the verbatim still-segment / title-card / assemble recipes, single-axis discipline + why multi-axis melts, 16:9 vs 9:16 pacing, the two-layer AB-723 disclosure burn, the keyless + MLS-safe + photos-are-sacred discipline, and the ai-gen i2v handoff facts for the sibling cinematic-director track).
- `evals/evals.json` (3 cases: full two-photo dual-aspect run + disclosure; silent reel with missing sqft/cta defaults; missing-listing.json clean-failure gate). Declares `references-skills: [disclosure-stamp]`.
