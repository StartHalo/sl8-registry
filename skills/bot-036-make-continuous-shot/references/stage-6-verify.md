# Stage 6 — verify (the grew-past-base gate)

Runs the **shared** verifier on the single grown file. There is no concat to verify and no
summed-duration target — the proof of a successful extend chain is that **the take grew past
its base**. The gate logic lives once, in `.claude/skills/video-toolkit/scripts/verify.sh`, called here with
`--mode grew`. This stage is the **deliver-and-disclose** decision point.

**Reads:** `artifacts/<slug>/episode.mp4`, the `base_dur_s` captured at stage 4.
**Writes:** the verdict + any FLAG into `state.md`.

---

## Step 1 — Run the shared verifier in `grew` mode

```bash
.claude/skills/video-toolkit/scripts/verify.sh \
  artifacts/<slug>/episode.mp4 \
  --mode grew --base <base_dur_s from stage 4> \
  --require-audio yes \
  --route veo-extend
```

`verify.sh` ffprobes the file and emits ONE JSON verdict line, e.g.
`{"file":"…/episode.mp4","route":"veo-extend","duration_s":22.1,"width":1280,"height":720,"has_video":true,"has_audio":true,"verdict":"PASS","reasons":[]}`.

- **`--mode grew --base <B>`** → PASS requires `duration_s > B` (the chain extended past the
  base). If all hops failed, only the 8s base was delivered → it did NOT grow → FLAG.
- **`--require-audio yes`** → asserts the native Veo audio stream is present (a missing audio
  stream is a FLAG — never an added bed).
- A `FLAG` verdict still **exits 0** (deliver + flag). Exit 2 only if the file is missing.

## Step 2 — Read the verdict

- **`PASS`** → record it; proceed to deliver. (A clean continuous take: one video stream, one
  native audio stream, duration grew past the base.)
- **`FLAG`** → **record the reasons in `state.md`, still deliver the episode.** A FLAG never
  withholds the MP4 — it is surfaced in `summary.md`'s **Verdict** and **What was compromised**
  sections (stage 7). Typical FLAG reasons: `did not grow past base` (every hop failed, only
  the base shipped), `no audio stream`, `no video stream`. Cross-check against the
  `gen-extend.sh` JSON `verdict`/shortfall from stage 4 and reconcile both honestly.

## Step 3 — Advance the ledger

Mark stage 6 `done`, set stage 7 `deliver` `in-progress`. Write the final verdict
(`PASS` or `FLAG — <reasons>`) into `state.md`, plus the measured `final_dur_s` and the base
duration. Update `next_action`: "Stage 7 deliver — write summary.md from the video-toolkit
template (model/recipe, token kit, base + each hop, final duration, native audio, NO concat,
cost), update dashboard, set status complete."
