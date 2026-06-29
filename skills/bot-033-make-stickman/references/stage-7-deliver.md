# Stage 7 — deliver

Writes the honesty record and closes the project. The episode is already on disk and
verified — this stage makes the run auditable and reproducible.

**Reads:** `artifacts/<slug>/episode.mp4`, the verdict, `seed-snapshot/`, the per-beat logs.
**Writes:** `artifacts/<slug>/summary.md`; updates `artifacts/dashboard.html`; sets
`state.md` `complete`.

---

## Step 1 — Write `summary.md` from the shared template

Copy `.claude/skills/video-toolkit/references/summary-template.md` and fill **every** field
to `artifacts/<slug>/summary.md`. Never drop a field to hide a FLAG. For this recipe:

- **Deliverable:** `episode.mp4` (`<duration>s`, `<WxH>`, `<aspect>`).
- **Verdict:** `PASS` or `FLAG — <reasons from stage 6>`.
- **Model / recipe:** `bytedance/seedance-2.0/fast/image-to-video` via per-beat i2v over
  nano-banana-pro pencil stills, ffmpeg concat (one model, one recipe — by design).
- **Seed kit:** `image-anchor @ seed <N>` (style one-liner from `style.md`; identity one-liner
  from `identity.md`); snapshot at `artifacts/<slug>/seed-snapshot/`.
- **Shots / beats:** `<count>`, planned at `<durations>`.
- **Audio:** native Seedance ambient audio — OR, if `--roomtone auto` resolved to ON (every
  beat was a silent still-segment), say explicitly "ADDED brown-noise ambient bed at −38dB
  (NOT native)".
- **Assembly:** concat via the shared `assemble.sh`.
- **Cost:** estimated (pre-flight `.claude/skills/video-toolkit/scripts/cost.sh estimate …`) + measured
  (`ai-gen balance` delta). Never report per-call `credits_used` (unreliable).
- **What was compromised / fell back:** list every still-segment beat, every kept-best still
  with a failed self-check, any drift — or "none". 
- **Reproduce / iterate:** the kit lives at `artifacts/seed/` (run `bot-033-update-character`
  to change the look for future episodes); re-run `bot-033-make-stickman` to resume from `state.md`.

## Step 2 — Update the dashboard

Read `artifacts/dashboard.html`. Set the episode phase rows to their final states
(`✓ done …`), append the completed episode as a new collapsible row in `history`, and rewrite
the full HTML to `artifacts/dashboard.html`.

## Step 3 — Close the project & remember

- `state.md`: mark stage 7 `done`, set `status: complete`, and write
  `next_action: "Episode complete — artifacts/<slug>/episode.mp4 ready."` Log any FLAG/fallback
  in the decisions log.
- **Memory** (per the runtime loop): update `memory/summary.md` (rolling) and append one line
  to `memory/index.md` for the completed episode:
  `- **<YYYY-MM-DD>**: \`<slug>\` (skill: \`bot-033-make-stickman\`) — <one-line description>`.

The user receives: `episode.mp4` + `summary.md`, with every fallback and FLAG disclosed.
