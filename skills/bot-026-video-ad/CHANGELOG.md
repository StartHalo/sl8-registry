# Changelog — bot-026-video-ad

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-20
### Planned
- Full E2E sandbox confirmation on a real seller hero still (the host tests stub
  `ai-gen video`; the prompt-builder + manifest plumbing are host-verified, the i2v
  fal calls are not yet sandbox-confirmed for this exact `gen-video.sh` wiring).
- Smoke-test the non-fast `bytedance/seedance-2.0/image-to-video` slug at build (the
  KB verified the `/fast/` variant by name; confirm the start-frame `--image`→
  `image_url` forwarding live).
- Smoke-test the Kling `start_image_url` positional forwarding (the riskiest arg path —
  if it does not attach, the model invents a product; video-qc catches it, but confirm
  the forward at build and prefer Seedance until verified).
- Wire `video-qc` verdicts back into a manifest field as an automated drop (today the
  script emits `video-manifest.json` and the bot performs the blocking QC + drop).
- Optional first-frame disclosure-card burn wired into the handoff (today documented in
  `references/disclosure-note.md`; the platform-native label is the required disclosure).

## [v1.0.0] — 2026-06-20
### Added
- Initial authoring of the core skill (BDLC Author activity, BOT-026 Full Build — a
  Variation of Motion Studio / Video Creator in spirit). Covers JTBD-1 (a 9:16 product
  video ad that shows the real product with a stable logo) + JTBD-2 (≤ requested
  ad-test variants, each QC'd): phase 1 (base clip) + variant fan-out.
- `SKILL.md` — the architecture is the load-bearing finding: the reachable i2v models
  have NO geometry lock, so identity is held by the strict-product motion prompt (ONE
  slow safe camera move, name what stays stable, no extra text) + a BLOCKING video-qc
  vision pass that confirms the clip shows the REAL input product with a stable logo
  before any variant fan-out or paid spend. Seedance 2.0 i2v primary (multi-shot +
  in-pass dual-channel audio; start frame via `--image`); Kling 3.0 standard the
  logo-stays-sharper alt (positional `start_image_url`). Headless defaults,
  required-input gate (hero), declared output paths (frontmatter + body), state.md
  ledger update, failure-mode table, disclosure handoff to the shared guard.
- `scripts/motion-prompt.py` — pure string assembly (no model): builds the verbatim
  strict-product formula with ONE slow move from the SAFE whitelist (push-in / subtle
  orbit / pull-out / light sweep / static); auto-substitutes BANNED aggressive moves
  (fast / whip-pan / crash-zoom / shake / fly-through) for the closest safe move and
  records the substitution in a JSON note; `--multishot` emits the time-coded 4-beat
  hero arc; appends the community quality suffix.
- `scripts/gen-video.sh` — the i2v engine: builds the prompt via `motion-prompt.py`,
  runs `ai-gen video` per engine (Seedance `--image`→`image_url` + `duration=`; Kling
  positional `start_image_url=` + `generate_audio=true`), downloads `files[0].local_path`
  to the stable `<out>.mp4` immediately (fal URLs expire), `--max-cost` guard, ffprobe
  audio probe (advisory), and appends to `video-manifest.json` with `needs_qc: true`.
  Refuses to certify the output — the blocking QC is the bot's step.
- `scripts/video-qc.md` — the BLOCKING vision-QC procedure (not a script — needs a
  vision model): the four dimensions (product identity, logo/label stability, motion
  safety/no-artifacts, audio), the verdicts (pass / drift-drop / low-confidence), and
  the gating rules (never fan out off a failed clip, never spend/disclose on a drift,
  extra Kling identity scrutiny).
- `references/seedance-dialect.md` — the verified ai-gen 2.1.0 i2v syntax contract
  (engine slugs, per-model start-frame arg, positional `duration`/`generate_audio`,
  `files[0].local_path` objects + expiring URLs, ignore `credits_used`, the verbatim
  strict-product formula + multi-shot dialect).
- `references/motion-discipline.md` — why ONE slow move holds the product, the SAFE
  whitelist + the BANNED-and-substituted list, the "fast" price-tier-vs-camera-move
  naming trap, duration/aspect, and the change-one-variable variant fan-out loop.
- `references/disclosure-note.md` — why an AI product video ad must be labelled (Meta
  undisclosed-UGC = "Deceptive Practice"; TikTok AIGC) and the handoff contract to the
  shared `bot-022-compliance-guard` for the disclosure pre-flight.
- `evals/evals.json` — 3 objective-gate evals (a real-product 9:16 clip with a stable
  logo + a passing QC; QC-gated variant fan-out that changes one variable each;
  aggressive-move request → auto-substitution + honest report).
- `evals/rubric.md` + `iteration-charter.md` — 5 vision/judge dimensions
  (product-identity-vs-input 0.35, motion-safety-no-artifacts 0.25, logo-label-stability
  0.20, audio-and-format 0.10, qc-honesty-and-discipline 0.10; sum 1.00),
  target_score 0.85, publish_threshold 0.80, stuck_window 10.

### Decisions
- Identity is held by the prompt + the BLOCKING video-qc, NOT by the model — the
  single most important design decision, inherited from the sibling product-photo PoC
  (a generative edit hallucinated a different product) and made worse by motion: the
  more the camera accelerates, the more the model re-imagines the product.
- ONE slow safe camera move only — aggressive moves are auto-substituted by
  `motion-prompt.py`, never passed through, because they melt geometry. The job is
  testing velocity (a few clean variants), not a hero spot.
- `gen-video.sh` emits a manifest rather than calling Claude itself: video-qc needs a
  vision model the bot runs in-session, so the blocking drop/flag is the bot's step,
  kept out of the deterministic script (offline-iterate, sandbox-confirm).
- Disclosure is delegated to the shared `bot-022-compliance-guard` (Meta/TikTok AIGC +
  C2PA + dated law note) rather than re-implemented — one canonical disclosure owner.
- Seedance primary (multi-shot + in-pass audio, `--image` start frame works per KB);
  Kling alt (logo-stays-sharper) but its `start_image_url` schema is the riskiest arg
  path, so Seedance is preferred until the Kling forward is sandbox-confirmed.
