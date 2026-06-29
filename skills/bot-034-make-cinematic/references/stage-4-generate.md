# Stage 4 — generate (the ONE reference-to-video call)

Absorbs BOT-027 `bot-027-seedance-cinematic` Steps 1–3 (the render half). This recipe's
generate stage is **a single model call**: the WHOLE multi-scene cinematic is rendered in ONE
`bytedance/seedance-2.0/fast/reference-to-video` pass — the bible images go in as `--ref`, the
shot-list becomes the prompt body, native score + SFX + ambience are generated in the same
inference. **No per-shot stills, no per-beat generation** on the happy path. The deep dialect is
in `references/seedance-dialect.md` — load it before composing the prompt.

**Reads:** `artifacts/<slug>/shotlist.md`, `artifacts/<slug>/seed-snapshot/` (the two anchors +
the frozen blocks).
**Writes:** `work/<slug>/render-prompt.txt`, `work/<slug>/raw.mp4` (single-call) **or**
`work/<slug>/clips/NN-shot.mp4` + a fallback episode (per-shot fallback).

> **Resumability — the honest limit.** This stage is set `in-progress` *before* the paid submit,
> with `work/<slug>/raw.mp4` named in `next_action`. The single ~15-minute reference-to-video
> call is **NOT rejoinable mid-render** (one model, one recipe — doc 06 §Tensions): a session
> killed *during* the call must re-submit the whole call. On resume, **if `work/<slug>/raw.mp4`
> already exists, skip the submit and go to assemble.** `--max-cost` caps the blast radius of a
> re-spend; `per-shot-fallback.sh` degrades to losing at most one shot.

---

## Phase A — compose the render prompt

The render prompt is the shot-list, concatenated in the PROVEN shape (the 8.8/10 PoC shape).
Build `work/<slug>/render-prompt.txt` from `shotlist.md`, **verbatim** (this stage concatenates,
it does not rewrite — the trait tokens and shot grammar were locked at stage 3):

1. **Global header** — the shot-list's opening style/look line, verbatim.
2. **The identity-lock line** — the `@Image1`/`@Image2` line, verbatim (it names `@Image1` =
   turnaround, `@Image2` = hero, with "maintain the EXACT same character identity in every shot").
3. **The scene line**, then the **numbered time-coded shots** `[0-Xs]:` …, in order, verbatim.
4. **The footer** — the `Total: …` line, the `Audio: …` line, and the positive-constraint suffix.

If the shot-list lacks the `@Image` lines or the suffix, append them defensively from
`references/seedance-dialect.md` and note it (the script also appends the suffix if missing).

## Phase B — pre-flight cost gate

Estimate the render with the shared cost helper before spending (cinematic = ONE expensive call):

```bash
.claude/skills/video-toolkit/scripts/cost.sh estimate \
  bytedance/seedance-2.0/fast/reference-to-video duration=<N> resolution=720p
```

720p / 15s / fast ≈ ~908 cr ≈ $3.63 (Step-0 PoC). The single call is gated with `--max-cost`
(passed by `gen-cinematic.sh`, default ~1200 cr for `fast`). If the estimate is too high, drop
`RESOLUTION=480p` (≈ halves it) or shorten `DURATION`. Record the estimate for `summary.md`.

## Phase C — the single reference-to-video call (the recipe)

Render the whole cinematic in ONE call with the **bot-local** recipe script. The turnaround is
`--ref` 1 (`@Image1`), the hero is `--ref` 2 (`@Image2`) — both from the seed snapshot:

```bash
mkdir -p work/<slug>
DURATION=<4-15> ASPECT=<16:9|9:16|1:1|21:9> TIER=fast RESOLUTION=720p \
  scripts/gen-cinematic.sh \
    work/<slug>/render-prompt.txt \
    artifacts/<slug>/seed-snapshot/anchors/turnaround.png \
    artifacts/<slug>/seed-snapshot/anchors/hero.png \
    work/<slug>/raw.mp4
```

`gen-cinematic.sh` issues the PROVEN command (`ai-gen video … -m
bytedance/seedance-2.0/fast/reference-to-video --ref <turnaround> --ref <hero> --duration <D>
--aspect-ratio <AR> --audio on --max-cost <cap> --format json`), parses `files[0].local_path`
(python3), ffmpeg-normalizes (24fps, the planned canvas, H.264/yuv420p + AAC, faststart),
ffprobe-verifies (duration ±1s, a video AND a **native** audio stream), and prints
`model<TAB>path<TAB>url`. Env knobs: `DURATION`, `ASPECT`, `TIER` (fast|standard), `RESOLUTION`
(480p|720p), `AUDIO` (default on), `MAX_COST`.

- `generate_audio` is **default-on** for reference-to-video (no surcharge) — the MP4 arrives WITH
  a native audio stream. **Do not add a music bed at assembly** — it would double up.
- Slug discipline: the v2 namespace is the **bare** `bytedance/seedance-2.0/...` (the
  `fal-ai/bytedance/seedance/*` form 404s). The script passes `-m` explicitly.
- **If it succeeds** (printed the contract line, ffprobe passed) → `work/<slug>/raw.mp4` exists;
  go to stage 5 (assemble = zero-concat passthrough). Capture the printed hosted URL for the summary.
- **If it errors (non-zero) or fails verification** (no native audio / duration far off — the
  script reports the reason on stderr) → run the fallback (Phase D). Record the route + reason.

## Phase D — fallback: per-shot i2v + concat (ONLY on single-call failure)

Use this **only** when the single call failed — never as the default. It trades the single-pass
identity lock for per-clip i2v (cross-shot identity rests on the shared hero start frame + the
verbatim shot text) and stitched cuts. **Recorded in `summary.md`, never silent.**

```bash
DURATION=<4-15> ASPECT=<16:9|9:16> \
  scripts/per-shot-fallback.sh \
    artifacts/<slug>/shotlist.md \
    artifacts/<slug>/seed-snapshot/anchors/hero.png \
    artifacts/<slug>
```

`per-shot-fallback.sh` splits the shot-list into its `[Xs-Ys]:` shots, generates one
`bytedance/seedance-2.0/fast/image-to-video` clip per shot (start frame = the bible hero), writes
the per-shot clips under `artifacts/<slug>/work-shots/`, normalizes each to a uniform layout,
concatenates them in shot order (its ffmpeg concat is the donor of the shared `assemble.sh`),
adds a quiet room-tone bed **only if** a shot lacked native audio, ffprobe-verifies, and writes
`artifacts/<slug>/episode.mp4` directly — printing a JSON verdict line. (Stage 5 records the
clips path; if you prefer the architecture-shared assembler, the per-shot clips can instead be
concatenated by `.claude/skills/video-toolkit/scripts/assemble.sh --roomtone never` — see stage 5.)

If the fallback ALSO fails for every shot → clean recorded failure in `state.md`
(`status: blocked`), **no fabricated MP4**.

## Phase E — advance the ledger

Mark stage 4 `done` (note the route: "single-call reference-to-video" or "per-shot fallback —
WHY the single call was abandoned, N/K shots"), set stage 5 `assemble` `in-progress`. Update the
dashboard "Render cinematic" row to `✓ done — <route>`. Update `next_action`:
"Stage 5 assemble — single-call: passthrough work/<slug>/raw.mp4 → episode.mp4 (zero-concat,
native cuts); fallback: episode.mp4 already concatenated (or assemble.sh over the per-shot clips)."
