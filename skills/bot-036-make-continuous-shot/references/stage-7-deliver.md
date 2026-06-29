# Stage 7 — deliver

Writes the honesty record and closes the project. The episode is already on disk and verified
— this stage makes the run auditable and reproducible.

**Reads:** `artifacts/<slug>/episode.mp4`, the verdict, `seed-snapshot/`, the stage-4 recipe JSON.
**Writes:** `artifacts/<slug>/summary.md`; updates `artifacts/dashboard.html`; sets `state.md`
`complete`.

---

## Step 1 — Write `summary.md` from the shared template

Copy `.claude/skills/video-toolkit/references/summary-template.md` and fill **every** field to
`artifacts/<slug>/summary.md`. Never drop a field to hide a FLAG. For this recipe:

- **Deliverable:** `episode.mp4` (`<final_dur_s>s`, `<WxH>`, `<aspect>`).
- **Verdict:** `PASS` or `FLAG — <reasons from stage 6>`.
- **Model / recipe:** `fal-ai/veo3.1/image-to-video` base + `fal-ai/veo3.1/extend-video` hops
  over ONE nano-banana-pro base still — **NO concat** (extend returns the whole grown video).
  One model, one recipe — by design.
- **Seed kit:** `token @ seed <N>` (style one-liner from `style.md`; identity = the 5–7 frozen
  tokens from `identity.md`, one-liner); snapshot at `artifacts/<slug>/seed-snapshot/`. Note
  `consumption: text-repeat` — the tokens were repeated ≥80% verbatim into the base + every hop.
- **Shots / scenes / beats:** 1 base + `<hops_done>`/`<hops_planned>` extend hops (base 8s +
  ~7s each).
- **Audio:** **native Veo audio throughout** (`generate_audio` default-on) — NOT an added
  room-tone bed (that is the Kling sibling).
- **Assembly:** **zero-concat extend** — the final extend's file IS the episode; verified with
  the shared `verify.sh --mode grew` (duration grew past the base). No `assemble.sh`, no ffmpeg
  concat.
- **Cost:** estimated (pre-flight `.claude/skills/video-toolkit/scripts/cost.sh estimate fal-ai/veo3.1/image-to-video
  …` + each extend) + measured (`ai-gen balance` delta). Never report per-call `credits_used`
  (~8× over-reported on Veo-class i2v).
- **What was compromised / fell back:** every hop that failed (which one, why), a base-only
  delivery (no hosted url to chain from), any "did not grow" FLAG — or "none".
- **Reproduce / iterate:** the token kit lives at `artifacts/seed/` (run
  `bot-036-update-character` to change the look/subject for future shots — a FREE token
  re-freeze); re-run `bot-036-make-continuous-shot` to resume from `state.md`.
- **Architecture note (verbatim):** `One continuous Veo 3.1 shot — an image-to-video base
  extended by N extend-video hops, each hop returning the FULL grown video (NO concat); native
  audio throughout. A different architecture from Seedance's single-pass reference-to-video and
  Kling's per-shot i2v + ffmpeg concat; scored head-to-head in the KB results-log.`

## Step 2 — Update the dashboard

Read `artifacts/dashboard.html`. Set the shot phase rows to their final states (`✓ done …`),
append the completed shot as a new row in `history` (hops + duration), and rewrite the full
HTML to `artifacts/dashboard.html`.

## Step 3 — Close the project & remember

- `state.md`: mark stage 7 `done`, set `status: complete`, and write
  `next_action: "Continuous shot complete — artifacts/<slug>/episode.mp4 ready."` Log any
  FLAG/shortfall in the decisions log.
- **Memory** (per the runtime loop): update `memory/summary.md` (rolling) and append one line
  to `memory/index.md` for the completed shot:
  `- **<YYYY-MM-DD>**: \`<slug>\` (skill: \`bot-036-make-continuous-shot\`) — <one-line description>`.

The user receives: `episode.mp4` + `summary.md`, with every shortfall and FLAG disclosed.
