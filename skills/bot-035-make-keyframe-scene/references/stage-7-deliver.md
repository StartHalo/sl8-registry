# Stage 7 — deliver

Writes the honesty record and closes the project. The episode is already on disk and verified —
this stage makes the run auditable and reproducible.

**Reads:** `artifacts/<slug>/episode.mp4`, the verdict, `seed-snapshot/`, `keyframes/keyframes-log.md`.
**Writes:** `artifacts/<slug>/summary.md`; updates `artifacts/dashboard.html`; sets `state.md`
`complete`.

---

## Step 1 — Write `summary.md` from the shared template

Copy `.claude/skills/video-toolkit/references/summary-template.md` and fill **every** field to
`artifacts/<slug>/summary.md`. Never drop a field to hide a FLAG. For this recipe:

- **Deliverable:** `episode.mp4` (`<duration>s`, `<WxH>`, `<aspect>`).
- **Verdict:** `PASS` or `FLAG — <reasons from stage 6>`.
- **Model / recipe:** `fal-ai/minimax/hailuo-02/standard/image-to-video` via Hailuo first-last
  morph over nano-banana-pro keyframes, ffmpeg concat (one model, one recipe — by design).
- **Seed kit:** `token @ seed <N>` (style one-liner from `style.md`; identity one-liner = the
  frozen tokens). Note it is a **token kit — no PNG anchors**; the keyframes were synthesized this
  project from the tokens. Snapshot at `artifacts/<slug>/seed-snapshot/`.
- **Shots / scenes:** `<K>` scenes from `<K+1>` pinned keyframes, planned at `<durations>`. Per
  scene: the START + END keyframe pair (the two state pngs) and whether it rendered as a Hailuo
  morph or a still-segment fallback.
- **Audio:** **ALWAYS** "ADDED brown-noise ambient bed at −38dB (NOT native — Hailuo first-last
  clips are silent)". Never present it as native audio.
- **Assembly:** concat via the shared `assemble.sh` (`--roomtone always`, summed±2s gate).
- **Cost:** estimated (pre-flight `.claude/skills/video-toolkit/scripts/cost.sh estimate …`) + measured (`ai-gen balance`
  delta). K+1 keyframe image costs + K Hailuo i2v costs (the END keyframe of scene i is the START
  of scene i+1 — K+1 keyframes, not 2K). Never report per-call `credits_used` (unreliable).
- **What was compromised / fell back:** list every still-segment scene (and why), any dropped
  scene, any kept-best keyframe with a failed self-check, any retry-without-duration — or "none".
- **Reproduce / iterate:** the token kit lives at `artifacts/seed/` (run `bot-035-update-character`
  to change the look — a FREE re-freeze, no image-gen, for future shorts); re-run
  `bot-035-make-keyframe-scene` to resume from `state.md`.
- **Architecture note** (verbatim, once): `Precise first-last-frame control — a pinned START AND a
  pinned END per scene, morphed by Hailuo 02 over nano-banana-pro keyframes synthesized from a
  token seed kit.`

## Step 2 — Update the dashboard

Read `artifacts/dashboard.html`. Set the project phase rows to their final states (`✓ done …`),
append the completed short as a new row in `history` (slug / date / scenes / duration / status),
and rewrite the full HTML to `artifacts/dashboard.html`.

## Step 3 — Close the project & remember

- `state.md`: mark stage 7 `done`, set `status: complete`, and write
  `next_action: "Short complete — artifacts/<slug>/episode.mp4 ready."` Log any FLAG/fallback in
  the decisions log.
- **Memory** (per the runtime loop): update `memory/summary.md` (rolling) and append one line to
  `memory/index.md` for the completed short:
  `- **<YYYY-MM-DD>**: \`<slug>\` (skill: \`bot-035-make-keyframe-scene\`) — <one-line description>`.

The user receives: `episode.mp4` + `summary.md`, with the added ambient bed and every FLAG/fallback
disclosed.
