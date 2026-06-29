# Stage 4 — generate (one base still, then the Veo extend chain)

Absorbs BOT-030 `bot-030-extend-chain`. Two phases: **(A) ONE base still** via the SHARED
image driver; then **(B) the Veo base i2v + extend chain** via the bot-local recipe, which
produces the whole grown `episode.mp4` with **ZERO concat**.

**Reads:** `artifacts/<slug>/continuous-plan.md`, `artifacts/<slug>/seed-snapshot/`.
**Writes:** `artifacts/<slug>/base-frame.png`, `artifacts/<slug>/episode.mp4` (+ `work/`).

> **Resumability:** this stage is set `in-progress` *before* the first paid submit. On resume,
> if `episode.mp4` already exists, skip to stage 5; if `base-frame.png` exists but no episode,
> re-run only `gen-extend.sh`. A Veo call is not rejoinable mid-render (single pass, ~15 min);
> `--max-cost` caps the blast radius and per-hop granularity loses at most one hop.

> Read `references/veo-extend-dialect.md` before composing — it carries the base-frame chain,
> the `image-to-video` base call (native audio, `--image` → `image_url`, durations 4s/6s/8s),
> the `extend-video` hop (`video_url` = the PREVIOUS hosted url, extend-returns-the-WHOLE-video
> / NO concat, up to 30s), the ≥80%-subject-repeat anchor, and the `files[0].local_path` +
> `files[0].url` JSON contract — all baked inline (no KB at runtime).

---

## Phase A — the ONE base still (shared image driver)

The recipe needs exactly ONE opening still — the Base scene's opening frame with the frozen
tokens. Generate it with the **`video-toolkit` driver** — **do not** author or copy a local
`gen-image.sh`.

### A.1 — Compose the base-frame prompt to a file

From `seed-snapshot/` load the look header (`style.md`) and the 5–7 frozen tokens
(`identity.md`); from `continuous-plan.md` take the Base opening-frame description. Compose
(`consumption: text-repeat` — the tokens go in verbatim), and the no-text tail:

```bash
mkdir -p artifacts/<slug> work
cat > work/base-frame-prompt.txt <<'PROMPT'
<look header verbatim> A single cinematic opening frame: <Base opening-frame description from the plan>. The subject is <the 5-7 frozen tokens, verbatim>, large in frame, clearly lit. No text, no watermark, no logo.
PROMPT
```

### A.2 — Generate via the SHARED image driver (NO `--resolution`)

nano-banana-pro **rejects** `--resolution` (it skips the primary model) — never pass it. The
chain is the bible chain (all ref/aspect-capable); this is a token kit so there is **no
`--ref`** — the frozen tokens in the prompt are the lock:

```bash
.claude/skills/video-toolkit/scripts/gen-image.sh \
  work/base-frame-prompt.txt artifacts/<slug> base-frame.png \
  --chain "fal-ai/nano-banana-pro,openai/gpt-image-2,fal-ai/nano-banana-2" \
  --aspect-ratio <16:9 | 9:16> \
  --seed <seed from the manifest> \
  --max-cost 80
```

`gen-image.sh` prints `model<TAB>local-path<TAB>hosted-url`. Capture the **local path**
(`artifacts/<slug>/base-frame.png`) — phase B animates that file. If the whole chain fails,
there is no base still → no episode; mark stage 4 `blocked` with the captured error (a clean
recorded failure, never a fabricated MP4).

---

## Phase B — the Veo base i2v + extend chain (bot-local recipe, NO concat)

Run the **bot-local** recipe script (the one model, one recipe for this bot). It does the Veo
base i2v on the base still, then the extend hops — each hop's `extend-video` call returns the
**FULL grown video**, so there is **no concat** and the final hop's file IS the episode.

```bash
ASPECT=<16:9 | 9:16> TIER=economy BASE_DURATION=8s HOP_DURATION=7 RESOLUTION=720p \
  scripts/gen-extend.sh \
    artifacts/<slug>/continuous-plan.md \
    artifacts/<slug>/base-frame.png \
    artifacts/<slug>
```

- The script parses the plan for the look header, the frozen CHARACTER tokens, the base motion
  prompt, the hop prompts, and the aspect. It restates the tokens ≥80% verbatim into the base
  motion and EVERY hop prompt (`consumption: text-repeat`) so identity holds across each seam.
- It runs `fal-ai/veo3.1/image-to-video` (8s, native audio default-on) on the base still,
  capturing `files[0].local_path` (the base clip) AND `files[0].url` (the hosted url — the
  first hop's `video_url`). Then for each hop it runs `fal-ai/veo3.1/extend-video` with
  `video_url=<previous hosted url>`; the response is the WHOLE grown video; the next hop uses
  THIS hop's url. **No `ffmpeg` concat, ever.**
- It writes intermediates under `artifacts/<slug>/work/` and copies the final grown video to
  `artifacts/<slug>/episode.mp4`. It prints ONE JSON line with `base_dur_s`, `final_dur_s`,
  `hops_done`, and `verdict`. **Capture `base_dur_s`** — stage 6's `verify.sh --mode grew`
  needs it as `--base`.
- Estimate first with `.claude/skills/video-toolkit/scripts/cost.sh estimate fal-ai/veo3.1/image-to-video duration=8s
  resolution=720p` if asked; `--max-cost` (default 700) gates each Veo call.

### B.1 — Failure triage (headless — clean recorded failure, never a fabricated MP4)

| situation | action |
|---|---|
| base still chain fails (all 3 image models) | No base — mark stage 4 `blocked`, no MP4, stop. |
| Veo base i2v fails | No base clip — script exits non-zero; mark `blocked`, no MP4, stop. |
| base i2v returns no hosted url | Cannot extend (extend needs `video_url`) — deliver the 8s base as the continuous shot, FLAG, record the shortfall. |
| a hop fails / no file / does not grow | Stop the chain, keep the LAST GOOD extended video as `episode.mp4`, FLAG, record the exact shortfall (which hop, why). Never fabricate length. |

## B.2 — Advance the ledger

Mark stage 4 `done` (note "base 8s + K/N hops, final ~Xs, NO concat" + the captured
`base_dur_s`), set stage 5 `assemble` `in-progress`. Update the dashboard "Base frame + base
i2v" and "Extend hops (no concat)" rows to `✓ done`. Update `next_action`:
"Stage 5 assemble — zero-concat passthrough; confirm episode.mp4 exists; then stage 6 verify.sh
--mode grew --base <base_dur_s>." Paste the recipe JSON line into the decisions log.
