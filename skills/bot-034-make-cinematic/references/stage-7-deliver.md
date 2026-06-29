# Stage 7 — deliver

Writes the honesty record and closes the project. The cinematic is already on disk and verified
— this stage makes the run auditable and reproducible.

**Reads:** `artifacts/<slug>/episode.mp4`, the verdict, `seed-snapshot/`, `shotlist.md`, the
render log.
**Writes:** `artifacts/<slug>/summary.md`; updates `artifacts/dashboard.html`; sets `state.md`
`complete`.

---

## Step 1 — Write `summary.md` from the shared template

Copy `.claude/skills/video-toolkit/references/summary-template.md` and fill **every** field to
`artifacts/<slug>/summary.md`. Never drop a field to hide a FLAG. For this recipe:

- **Deliverable:** `episode.mp4` (`<duration>s`, `<WxH>`, `<aspect>`).
- **Verdict:** `PASS` or `FLAG — <reasons from stage 6>`.
- **Model / recipe:** `bytedance/seedance-2.0/fast/reference-to-video` via the **single
  reference-to-video pass** (the whole cinematic in one call — one model, one recipe by design),
  OR `per-shot image-to-video + ffmpeg concat` if the fallback shipped (say WHY the single call
  was abandoned).
- **References:** `@Image1 = anchors/turnaround.png` · `@Image2 = anchors/hero.png` (from the
  bible snapshot).
- **Seed kit:** `image-anchor @ seed <N>` (style one-liner from `style.md`; identity one-liner /
  the Name + 2–3 tokens from `identity.md`); snapshot at `artifacts/<slug>/seed-snapshot/`.
- **Shots:** `<count>`, the shot-list as executed (cite `shotlist.md`; a one-line-per-shot recap
  is enough — do not restate every shot).
- **Audio:** native in-pass (score + SFX + ambience, `generate_audio` on) — verified present:
  yes/no. OR, if the fallback added a brown-noise bed (a shot lacked native audio), say explicitly
  "ADDED brown-noise ambient bed at −38dB (NOT native)".
- **Assembly:** zero-concat passthrough (single call) OR concat via the shared `assemble.sh`
  (fallback).
- **Cost:** estimated (pre-flight `.claude/skills/video-toolkit/scripts/cost.sh estimate
  bytedance/seedance-2.0/fast/reference-to-video duration=<N> resolution=720p`) + measured
  (`ai-gen balance` delta). Never report per-call `credits_used` (over-reports ~8×).
- **What was compromised / fell back:** the single-call non-resumability if a re-submit happened,
  any duration deviation delivered + flagged, any identity drift across shots, the fallback route
  if taken — or "none".
- **Reproduce / iterate:** the bible lives at `artifacts/seed/` (run `bot-034-update-character-bible`
  to change the look for future cinematics); re-run `bot-034-make-cinematic` to resume from `state.md`.

## Step 2 — Update the dashboard

Read `artifacts/dashboard.html`. Set the cinematic phase rows to their final states (`✓ done …`),
append the completed cinematic as a new row in `history`, and rewrite the full HTML to
`artifacts/dashboard.html`.

## Step 3 — Close the project & remember

- `state.md`: mark stage 7 `done`, set `status: complete`, and write
  `next_action: "Cinematic complete — artifacts/<slug>/episode.mp4 ready."` Log any FLAG/fallback
  in the decisions log.
- **Memory** (per the runtime loop): update `memory/summary.md` (rolling) and append one line to
  `memory/index.md` for the completed cinematic:
  `- **<YYYY-MM-DD>**: \`<slug>\` (skill: \`bot-034-make-cinematic\`) — <one-line description>`.

The user receives: `episode.mp4` + `summary.md`, with every fallback and FLAG disclosed.
