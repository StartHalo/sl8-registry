# Changelog — bot-013-clip-assembly

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.4] — 2026-06-16
### Changed
- ai-gen v2.1.0 re-pin. **`bytedance/seedance-2.0/fast/image-to-video`** is now the
  DEFAULT i2v engine (was opportunistic), with **native ambient audio** (`--audio on`,
  720p); fallback `fal-ai/kling-video/v3/pro/image-to-video`. The dead
  `kling-i2v / minimax-i2v / wan-i2v / runway-gen3` chain is removed.
- Fixed the discovery gate to match the **bare** `bytedance/seedance-2.0` namespace (the
  old `fal-ai/bytedance/seedance/*` form 404s upstream). seedance-dialect.md promoted to
  the default dialect; clip-dialects.md demoted to the fallback path.
- `scripts/assemble.sh` room-tone is now **AUTO** — the brown-noise bed is added only when
  no clip carries native audio (avoids doubling under Seedance's native audio). Every clip
  prompt carries the `NO MUSIC, ONLY AMBIENT SOUND. NO TALKING.` audio directive.
- bot-013-episode-design pairs with this: `room-tone` default flips to off.

### Fixed
- `scripts/gen-clip.sh` updated to the ai-gen v2.1.0 contract: parses `files[0].local_path`
  (entries are objects now, not strings); accepts a **local still path** as i2v input (v2
  uploads it transparently) in addition to an https URL; adds `--resolution`, `--audio`,
  and `--max-cost` (credits) passthrough. Keeps the 15-min timeout + one timeout retry.

## [v1.0.2] — 2026-06-09
### Changed

- Default i2v chain gains `fal-ai/runway-gen3` as a documented LAST resort
  (deprecated upstream, but the only i2v model the proxy actually routed in run 1 —
  the chain otherwise produced zero clips). Its use must be disclosed in
  05-summary.md. Updated in gen-clip.sh, SKILL.md Step 1, and references/clip-dialects.md.


## [v1.0.1] — 2026-06-09
### Fixed

- Frontmatter manifest compliance: `inputs[].type: boolean` (room-tone) and
  `outputs[].type: mp4` (beat-clips, episode) are not in the manifest type
  vocabulary and made the test harness skip this skill's manifest.json.
  room-tone is now `type: text` (on|off) and the video outputs are `type: video`.
  No behavior change.


## [v1.0.0] — 2026-06-09
### Fixed
- `scripts/gen-clip.sh` — removed the `jq` dependency (jq is not installed in the
  sl8-animation sandbox): the dependency guard now requires `ai-gen` + `python3`,
  and the two response parses (success + non-empty `files`, `files[0]` extraction)
  use `python3` JSON helpers. The documented exit-code contract is unchanged
  (0 = delivered, non-zero = chain exhausted, 2 = usage/deps).

### Added
- Initial authoring of the skill (BDLC Author activity, BOT-013 Full Build,
  2026-06-09). Covers JTBD-4: per-beat image-to-video clips + ffmpeg episode
  assembly + honest production summary (phase 4, `clips-and-assembly`).
- `SKILL.md` — phase workflow: runtime video-model discovery and dialect
  selection (single-shot default on `kling-i2v → minimax-i2v → wan-i2v`;
  Seedance dialect gated on a routed `fal-ai/bytedance/seedance/*` id), frozen
  CLIP_STYLE_LOCK / CLIP_NEGATIVES prompt blocks verbatim, still-as-segment
  fallback policy, state.md ledger update, declared output paths (frontmatter
  + body, anti-hallucination rule).
- `scripts/gen-clip.sh` — chain-walking i2v generator: hosted-URL input
  validation, `--timeout 900000` queue awareness, retry-once-on-timeout,
  retry-without-`duration=` on parameter rejection, `model<TAB>path` output
  contract, never leaves the documented chain.
- `scripts/still-segment.sh` — Ken Burns fallback (~1.05x push-in, 24fps,
  2x supersampled zoompan, white-padded canvas) matching assemble.sh normalize
  settings so fallback segments concat like real clips.
- `scripts/assemble.sh` — uniform normalize (24fps, planned canvas, yuv420p,
  H.264, uniform aac/anullsrc audio), concat demuxer with re-encode triage,
  brown-noise room tone at −38dB (`amix normalize=0`, `--no-roomtone` opt-out),
  optional 2s punchline caption card (`drawtext` via `textfile=`, font-probe
  with skip-and-warn), ffprobe verification printing a one-line JSON
  PASS/FLAG verdict (deliver + flag, never withhold).
- `references/clip-dialects.md` — single-shot prompt anatomy, ai-gen video
  mechanics, per-model duration/parameter notes (kling 5|10s; minimax/wan
  `duration=` caveat), anti-patterns.
- `references/seedance-dialect.md` — discovery-gated multi-shot dialect:
  [CUT]/timecode/multishot/@ImageN patterns, the "NO MUSIC, ONLY AMBIENT
  SOUND" rule and why, character-consistency mitigations, failure modes.
- `references/assembly.md` — every ffmpeg recipe explained, failure triage
  table (concat mismatch → re-encode; under-15s → deliver + FLAG), re-render
  guidance.

### Decisions
- `assemble.sh` accepts `--aspect` and `--caption` beyond the spec'd
  `--no-roomtone` so the script stays deterministic while the bot supplies
  plan-derived values (aspect, punchline) explicitly instead of the script
  parsing `01-episode-plan.md`.
- All segments are normalized to carry an audio track (silent `anullsrc` when
  the source clip has none) so silent kling/minimax/wan clips and
  audio-bearing Seedance clips concat through one code path.
