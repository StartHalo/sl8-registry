---
name: bot-027-seedance-cinematic
description: Render a finished multi-scene cinematic MP4 with native audio from a time-coded shot-list and a character bible — in ONE Seedance 2.0 reference-to-video pass. Concatenates the shot-list's global header + @Image lines + numbered time-coded shots into a single multi-shot prompt, passes the turnaround sheet and hero as @Image1/@Image2 references so the SAME character holds across every cut, generates score + SFX + ambience in-pass, ffmpeg-normalizes and ffprobe-verifies the result (duration ±1s, video + audio streams present), and writes an honest production summary (model + slug, the shot-list executed, duration, cost via ai-gen estimate, any fallback). Falls back to per-shot image-to-video + ffmpeg concat only if the single call errors or fails verification — recorded, never silent. Use for phase 3 (render) of a cinematic project, or whenever asked to render the cinematic, make the episode MP4, animate the shot-list, or re-render episode.mp4.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-027
  inputs:
    - name: shotlist
      type: markdown
      required: true
      description: artifacts/<project-name>/shotlist.md — the cinematic shot-list from phase 2 (a global style/look + audio header, @Image1/@Image2 reference lines, and 4–6 numbered time-coded `[Xs-Ys]:` shots summing to the target duration). Concatenated VERBATIM into the render prompt; missing/empty → clean recorded failure, stop.
    - name: reference-sheet
      type: png
      required: true
      description: artifacts/<project-name>/reference-sheet.png — the character turnaround from the bible. Passed as the FIRST --ref (maps to @Image1). Missing → clean recorded failure (the bible was never built), stop.
    - name: hero
      type: png
      required: true
      description: artifacts/<project-name>/hero.png — the clean hero portrait from the bible. Passed as the SECOND --ref (maps to @Image2) and as the start frame of every per-shot fallback clip. Missing → clean recorded failure, stop.
    - name: duration
      type: text
      required: false
      description: Target cinematic length in seconds, 4–15. Default 15. Read from the shot-list header (`Total:`) when present; this input only overrides it.
    - name: aspect
      type: text
      required: false
      description: Aspect ratio (16:9 | 9:16 | 1:1). Default 16:9. Read from the shot-list header when present.
    - name: tier
      type: text
      required: false
      description: Seedance render tier, `fast` | `standard`. Default `fast` (the proven, cheaper tier; ~908 cr ≈ $3.63 @ 720p/15s). `standard` is higher quality and more expensive — use only on an explicit request.
  outputs:
    - name: episode
      type: video
      path: artifacts/<project-name>/episode.mp4
      description: The finished multi-scene cinematic — one MP4 with the SAME character across shots, the shot-list executed, a native audio stream, normalized (24fps, H.264/yuv420p + AAC, the planned canvas) and ffprobe-verified (duration within ±1s of target, a video AND an audio stream present).
    - name: summary
      type: markdown
      path: artifacts/<project-name>/summary.md
      description: Honest production summary — the model + slug actually used, the shot-list as executed, the ffprobe-verified duration + aspect, the cost basis (ai-gen estimate, never credits_used), and any fallback taken (the single-call route vs per-shot+concat).
---

# Seedance Cinematic — Render the Multi-Scene Cinematic (BOT-027 · phase 3)

This is the **engine** (JTBD-3) — the load-bearing core of the bot. Phase 1
(`bot-027-character-bible`) locked the character (`character-spec.md` +
`reference-sheet.png` + `hero.png`) and phase 2 (`bot-027-shotlist`) wrote the
numbered, time-coded `shotlist.md`. This skill turns those into one finished
`episode.mp4` and tells the truth about how it went in `summary.md`. It ends the
project.

The headline mechanic (PROVEN end-to-end in the Step-0 multi-shot PoC, 2026-06-20,
8.8/10): **Seedance 2.0 renders the whole multi-scene cinematic in ONE
`reference-to-video` call.** The bible images go in as `--ref` (the CLI maps them to
`image_urls`, addressed in the prompt as `@Image1`/`@Image2`); the shot-list's
time-coded shots become the prompt body; native score + SFX + ambience are generated
in the same pass. No per-shot generation, no stitching — the model carries the
character and cuts between shots itself. Per-shot + ffmpeg concat is the documented
**fallback only**.

This skill runs **headless**. Never ask the user anything: every optional input has a
default below; a missing required input is a clean recorded failure in `state.md`, not
a question. Never fabricate an MP4 — `episode.mp4` exists only when a real generation
produced it and ffprobe verified it.

## Trigger

The `render` row in the project's `state.md` (phase 3, after the bible + shot-list
exist). Also invoked directly when asked to "render the cinematic", "make the episode",
"animate the shot-list", or "re-render episode.mp4".

## Read first (READ-BEFORE-WRITE)

Read, in this order — the dependencies are explicit so a resumed session can audit them:

1. `artifacts/<project-name>/context.md` — project truth (any duration/aspect override).
2. `artifacts/<project-name>/shotlist.md` — the global header (style/look + `@Image`
   reference lines + identity lock) + 4–6 numbered `[Xs-Ys]:` shots + the `Total:` line
   (duration / shot count / aspect / audio). This becomes the render prompt VERBATIM.
3. `artifacts/<project-name>/reference-sheet.png` and `artifacts/<project-name>/hero.png`
   — the character bible images the render conditions on.

**Required-input gate** (record, don't ask). Write a `blocked` failure note in `state.md`
(`status: blocked`, `next_action: re-run phase N — <file> missing`) and stop, fabricating
nothing:

- `shotlist.md` missing or empty → route back to phase 2 (`bot-027-shotlist`).
- `reference-sheet.png` **or** `hero.png` missing → route back to phase 1
  (`bot-027-character-bible`). The render conditions on both; never invent a reference.

**Defaults for optional inputs** (applied silently, headless): duration **15** (4–15),
read from the shot-list `Total:` line when present; aspect **16:9**, read from the header
when present; tier **fast**. The explicit `duration`/`aspect`/`tier` inputs override what
the shot-list says.

## Step 1 — Compose the multi-shot render prompt

The render prompt is the shot-list, concatenated in the PROVEN shape (the same shape that
scored 8.8/10 in the PoC). Build it from `shotlist.md`:

1. **Global header** — the shot-list's opening style/look paragraph, VERBATIM.
2. **The identity-lock line** — the shot-list's `@Image1`/`@Image2` reference lines,
   VERBATIM. They must name `@Image1` as the turnaround/character reference and `@Image2`
   as the hero, with "maintain the EXACT same character identity in every shot". (`@Image1`
   = the first `--ref`, `@Image2` = the second — the CLI maps `--ref` to `image_urls` in
   order.)
3. **The scene/world line**, then the **numbered time-coded shots** `[0-Xs]:` … VERBATIM,
   in order — each one action + one camera move.
4. **The closing line** — the `Total: <N>s / <K> shots / <AR>.` line, the `Audio:` line
   (score + SFX + ambience), and the positive constraint suffix ("Maintain character
   identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no
   flicker").

Save the assembled prompt to `work/<project-name>/render-prompt.txt`. Do **not**
paraphrase the shot-list — the trait tokens and shot grammar were locked upstream; this
skill concatenates, it does not rewrite. (If the shot-list lacks the `@Image` lines or the
constraint suffix, append them defensively from `references/seedance-dialect.md` and note
it in the summary — `gen-cinematic.sh` also appends the suffix if it is missing.) Full
prompt anatomy + the verbatim template: `references/seedance-dialect.md`.

## Step 2 — Render in ONE reference-to-video call

```bash
DURATION=<4-15> ASPECT=<16:9|9:16|1:1> TIER=<fast|standard> \
scripts/gen-cinematic.sh \
  work/<project-name>/render-prompt.txt \
  artifacts/<project-name>/reference-sheet.png \
  artifacts/<project-name>/hero.png \
  artifacts/<project-name>/episode.mp4
```

`gen-cinematic.sh` issues the PROVEN command —
`ai-gen video "<prompt>" -m bytedance/seedance-2.0/fast/reference-to-video --ref
<reference-sheet.png> --ref <hero.png> --duration <D> --aspect-ratio <AR> --audio on
--max-cost <cap> --format json` — then parses `files[0].local_path` (ai-gen `files[]`
entries are OBJECTS, parsed with python3), **ffmpeg-normalizes** the result (24fps, the
planned canvas, H.264/yuv420p video + AAC audio, `+faststart`), **ffprobe-verifies** it
(duration within ±1s of the target, a video stream AND an audio stream present), and on
success moves it to `episode.mp4` and prints `model<TAB>path<TAB>url`. It forwards
`--max-cost` (default ~1200 cr, raised for `standard` tier) as a guard. Env knobs:
`DURATION`, `ASPECT`, `TIER`, `RESOLUTION` (480p/720p, default 720p), `MAX_COST`,
`AUDIO` (default on).

- `generate_audio` is **default-on** for reference-to-video (no surcharge) — the MP4
  arrives WITH a native audio stream (score + SFX + ambience steered by the shot-list's
  `Audio:` line). Do **not** add a music bed at assembly; that would double up.
- Slug discipline: the v2 namespace is the **bare** `bytedance/seedance-2.0/...` — NOT
  `fal-ai/bytedance/seedance/*` (that 404s). Always pass `-m` explicitly (the script does).
- Discovery is informative only. The script attempts the pinned model regardless of what
  `ai-gen models` lists (the proxy has served unlisted models and 404'd listed ones); the
  JSON `success` field is the only truth. A wholesale engine swap is a STOP-and-ask per the
  model-reachability gate — but the documented per-shot fallback below is in-family, not a
  swap.

If `gen-cinematic.sh` **succeeds** (it printed the contract line and ffprobe passed), go to
Step 4. If it **errors** (non-zero exit) or **fails verification** (no audio stream, or
duration far off — the script reports the reason on stderr), go to Step 3.

## Step 3 — Fallback: per-shot image-to-video + concat (ONLY on failure)

Use this route **only** when the single call errored or its output failed ffprobe verify —
never as the default. It is recorded in the summary, never silent.

```bash
DURATION=<4-15> ASPECT=<16:9|9:16> \
scripts/per-shot-fallback.sh \
  artifacts/<project-name>/shotlist.md \
  artifacts/<project-name>/hero.png \
  artifacts/<project-name>
```

`per-shot-fallback.sh` splits the shot-list into its numbered shots, generates one
`bytedance/seedance-2.0/fast/image-to-video` clip per shot (start frame = `hero.png`, the
shot's action/camera text as the prompt, the shot's duration), normalizes each clip to a
uniform format, concatenates them in shot order with the ffmpeg concat demuxer, and writes
`episode.mp4`. Seedance i2v clips carry native ambient audio, so the concat preserves it;
**only if a shot's clip lacks an audio stream** does the script add a quiet room-tone bed
so the episode is never dead-silent. It ffprobe-verifies and prints the same
`model<TAB>path<TAB>url`-style verdict. (Recipes + the donor lineage — BOT-013
`clip-assembly` — are in `references/seedance-dialect.md`.)

The fallback trades the single-pass identity lock for per-clip i2v (cross-shot identity
rests on the shared hero frame + the verbatim shot text instead of one lock) and stitched
cuts instead of native ones. **Say so in the summary** — which route shipped and why the
single call was abandoned.

If the fallback ALSO fails for every shot → clean recorded failure in `state.md`
(`status: blocked`), no fabricated MP4. The bot does not ship an empty or placeholder file.

## Step 4 — Verify the result (the MP4 is real, not assumed)

`gen-cinematic.sh` / `per-shot-fallback.sh` already ran ffprobe, but confirm before writing
the summary — the verdict goes in the summary VERBATIM:

```bash
ffprobe -v error -show_entries stream=codec_type,codec_name -of csv=p=0 artifacts/<project-name>/episode.mp4
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 artifacts/<project-name>/episode.mp4
```

Pass = a `video` stream AND an `audio` stream are present, and the duration is within ±1s
of the target. A failing verify is a **FLAG**, not a silent ship: deliver the MP4 if it
exists but report the deviation prominently in the summary and `state.md`. Optionally
sample a few keyframes for a quick self-check (the eval grader does this — identity across
shots, the shot-list executed):

```bash
for ss in 1 5 9 13; do ffmpeg -y -ss $ss -i artifacts/<project-name>/episode.mp4 -frames:v 1 work/<project-name>/frame-${ss}s.png >/dev/null 2>&1; done
```

Read the sampled frames: is it ONE consistent character across the shots, on-brief, with
the shot-list's actions visible? A serious miss (identity drift, the shots not executed) is
disclosed in the summary — never hidden — so the user can decide on a re-render.

## Step 5 — Write the honest summary (honesty is graded)

Write `artifacts/<project-name>/summary.md`. Never hide a fallback, a verification flag, or
the real cost — the user decides what to re-render based on this file. Cost basis is
**`ai-gen estimate`** (run it for the model + duration + resolution actually used), never
the JSON `credits_used` (it over-reports). Cite the shot-list; don't restate every shot.

```markdown
# Cinematic Summary — <project-name>

## Render
- file: episode.mp4 · model: bytedance/seedance-2.0/fast/reference-to-video · route: single-call reference-to-video
- references: @Image1 = reference-sheet.png · @Image2 = hero.png
- duration: <ffprobe duration>s (target <N>s, ±1s: PASS|FLAG) · aspect: <AR> (<WxH>) · resolution: <480p|720p> · tier: <fast|standard>
- audio: native in-pass (score + SFX + ambience, generate_audio on) — verified present: yes|no
- streams (ffprobe): <e.g. video:h264 audio:aac>

## Shot-list executed
<!-- the numbered shots as rendered (cite shotlist.md; a one-line-per-shot recap is enough) -->
- [0-3s] <shot 1 …>
- … (4–6 shots)

## Cost
- basis: ai-gen estimate (NOT credits_used) — `ai-gen estimate bytedance/seedance-2.0/fast/reference-to-video duration=<N> resolution=720p` → ~<cr> cr ≈ $<usd>
- balance delta (if observed): <before → after>

## Fallbacks & flags
- route: single-call reference-to-video | per-shot image-to-video + ffmpeg concat (and WHY the single call was abandoned)
- <every verification flag, duration deviation, missing-audio shot, room-tone bed added in the fallback — plainly; or "none">
```

## Update state.md (the ledger is how phases chain)

After the phase completes (or fails), update the project's `state.md` row for `render`:
mark it `done` (or `blocked` with the reason), refresh `updated` and `status` (this is the
last phase — a clean run sets the project `complete`), and rewrite `next_action` to the one
imperative that's true now, e.g. "Project complete — review episode.mp4" or "Re-run phase 1:
hero.png missing". Then do the Remember step per the bot's execution loop. Never stop with a
stale ledger.

## Outputs

This skill writes exactly these paths (`<project-name>` = the active project slug) —
declared here and in the frontmatter so paths are never guessed:

- `artifacts/<project-name>/episode.mp4` — the finished multi-scene cinematic at the
  project root (normalized + ffprobe-verified; never a fabricated/empty file).
- `artifacts/<project-name>/summary.md` — the honest production summary.

Plus working files under `work/<project-name>/` (the assembled render prompt, sampled
keyframes, per-shot fallback clips) — never under `artifacts/`.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| `shotlist.md` missing/empty | Record failure in `state.md` (route to phase 2), stop. No invented shots. |
| `reference-sheet.png` or `hero.png` missing | Record failure in `state.md` (route to phase 1), stop. No invented reference. |
| Single `reference-to-video` call errors (non-zero exit) | Fall back to per-shot i2v + concat (Step 3); record the route + reason in the summary. |
| Single call output fails ffprobe verify (no audio stream / duration far off) | Fall back to per-shot i2v + concat; record the reason. Never ship the broken single-call file silently. |
| `--max-cost` aborts before submit (estimate exceeds cap) | Raise `MAX_COST`, or drop `RESOLUTION` to 480p, or shorten `DURATION` — then retry. Disclose the cost in the summary. |
| Slug 404s despite being "listed" | Confirm the bare `bytedance/seedance-2.0` slug (not `fal-ai/bytedance/...`); the script attempts it regardless of discovery. A genuine engine swap is STOP-and-ask. |
| A fallback shot's clip has no audio stream | The fallback adds a quiet room-tone bed so the episode isn't dead-silent; disclose it in the summary. |
| Every route fails | Clean `blocked` row in `state.md`; NO fabricated MP4. The user re-runs upstream or retries. |
| Verify FLAG (duration off, identity drift) but an MP4 exists | Deliver it + FLAG prominently in the summary and `state.md`; the user decides on a re-render. |

## References (load when needed)

- `references/seedance-dialect.md` — the reference-to-video mechanics baked inline
  (`--ref`→`image_urls`, `@ImageN` addressing, `generate_audio` default-on,
  duration/resolution envelope, the multi-shot prompt template), the per-shot+concat
  assembly recipes (donor: BOT-013 `clip-assembly`), the cost note (`ai-gen estimate`, not
  `credits_used`), and failure triage. Read this before composing the prompt.

## Scripts

- `scripts/gen-cinematic.sh <prompt-file> <reference-sheet.png> <hero.png> <out.mp4>` —
  the single-call render. Issues the PROVEN `bytedance/seedance-2.0/<tier>/reference-to-video`
  command with both bible images as `--ref`, parses `files[0].local_path` (python3),
  ffmpeg-normalizes, ffprobe-verifies (duration ±1s + a video AND an audio stream), moves to
  the out path, prints `model<TAB>path<TAB>url`. `set -euo pipefail`; non-zero exit ⇒ the
  caller runs the fallback. Env: `DURATION`, `ASPECT`, `TIER`, `RESOLUTION`, `AUDIO`, `MAX_COST`.
- `scripts/per-shot-fallback.sh <shotlist.md> <hero.png> <project-dir>` — the fallback only.
  Splits the shot-list into shots, generates one `bytedance/seedance-2.0/fast/image-to-video`
  clip per shot (start = hero.png), ffmpeg-concats them in order, adds room tone only when a
  shot lacks native audio, ffprobe-verifies, writes `episode.mp4`. `set -euo pipefail`.
