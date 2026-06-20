---
name: bot-028-kling-cinematic
description: Render a validated cinematic shot-list into one episode.mp4 with the Kling 3.0 engine — for EACH numbered time-coded shot, generate a per-shot start keyframe with nano-banana-pro (the shot scene composed with the bible CHARACTER_BLOCK tokens, the reference-sheet + hero passed as refs so the SAME character appears), then run a Kling image-to-video call on that keyframe, uniform-normalize every clip and concat with ffmpeg, add a subtle room-tone ambient bed (Kling clips are silent — added, NOT native), and ffprobe-verify. This is per-shot Kling i2v + ffmpeg concat — a DIFFERENT architecture from the Seedance sibling's single-pass native-audio render, and the PRIMARY path here, not a fallback. Run as phase 3, after the shot-list, reading shotlist.md + reference-sheet.png + hero.png, whenever episode.mp4 is missing or a re-render is asked.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-028
  inputs:
    - name: shotlist
      type: markdown
      required: true
      description: artifacts/<project-name>/shotlist.md — the validated cinematic shot-list (a header; the @Image1/@Image2 identity line; numbered time-coded [Xs-Ys] shots each with one camera move plus one action; a Total / Audio footer). Parsed for the shots, the aspect ratio, and the Audio line. Absence is a recorded failure; no MP4 is ever fabricated.
    - name: reference-sheet
      type: png
      required: true
      description: artifacts/<project-name>/reference-sheet.png — the bible character turnaround sheet. Passed as a --ref into every per-shot keyframe so the SAME character recurs across shots. If missing on disk, route back to phase 1 (character-bible); never render without it.
    - name: hero
      type: png
      required: true
      description: artifacts/<project-name>/hero.png — the bible hero portrait, the canonical look. Passed as a second --ref into every per-shot keyframe alongside the turnaround sheet. If missing on disk, route back to phase 1 (character-bible).
    - name: duration
      type: text
      required: false
      description: Total cinematic length in seconds as an integer in text form. Default is read from the shot-list time-codes; per-shot lengths come from each [Xs-Ys] span snapped to Kling granularity. Used only to cross-check the assembled total.
    - name: aspect-ratio
      type: text
      required: false
      description: Frame aspect for the keyframes, the Kling calls, and the normalize canvas. Default is read from the shot-list Total footer; common values are 16:9, 9:16, 1:1. Overrides the footer only when explicitly supplied.
    - name: tier
      type: text
      required: false
      description: Cost posture, economy or quality. Default economy (a lower per-call cap; 720p). quality raises the per-call cap. Recorded in summary.md; affects only the credit cap, not the model slug.
  outputs:
    - name: episode
      type: video
      path: artifacts/<project-name>/episode.mp4
      description: The assembled cinematic — per-shot Kling image-to-video clips, each started from a per-shot nano-banana-pro keyframe carrying the bible character, uniform-normalized (24fps, aspect canvas, h264/yuv420p) and concatenated in shot order, with a subtle added room-tone ambient bed (NOT native audio). ffprobe-verified for a video stream, an audio stream, and a duration near the sum of shot durations.
    - name: summary
      type: markdown
      path: artifacts/<project-name>/summary.md
      description: An honest production log — per-shot keyframe model plus Kling slug, the concat, the room-tone bed (stated clearly as an added ambient bed, NOT native audio), the ffprobe verdict, and per-shot plus total cost via ai-gen estimate. Carries the one-line note that this is per-shot Kling i2v + ffmpeg concat, a different architecture from Seedance's single-pass native-audio render, scored head-to-head in the KB results-log.
---

# Kling cinematic — render the shot-list per-shot, then concat

Render `artifacts/<project-name>/shotlist.md` into `artifacts/<project-name>/episode.mp4`
with the **Kling 3.0** engine. This is the head-to-head sibling of the Seedance director, and
it deliberately uses a **DIFFERENT architecture**:

- **Seedance** carries the WHOLE numbered shot-list across cuts in ONE `reference-to-video`
  pass, with native in-pass audio. No per-shot work, no stitching.
- **Kling here** does NOT do native multi-shot in the SL8 pipeline. SL8 renders **each shot as
  its own image-to-video clip and stitches** — so this skill: makes one start keyframe per
  shot (bible character locked in), runs Kling i2v per shot, then ffmpeg-concats the clips and
  adds an ambient room-tone bed (Kling clips are SILENT). This per-shot path is the **PRIMARY**
  path here — it is not a fallback.

That difference is the whole point: BOT-027 (Seedance) and BOT-028 (Kling) consume the **same
bible + the same shot-list**, so the only variable is the engine, and the two episodes are
scored head-to-head in the KB results-log. Never present the room-tone bed as equivalent to
Seedance's native audio — disclose it honestly in `summary.md`.

This skill runs **headless**. Never ask the user anything: missing optional inputs take the
documented defaults; a missing shot-list, or a missing `reference-sheet.png` / `hero.png`, is a
clean, recorded failure (route the missing-bible case back to phase 1). Never fabricate an MP4.

Read `references/kling-dialect.md` before composing anything — it carries the Kling C3/E3
recipe, the per-shot keyframe-then-i2v mechanic, the `--image` → `start_image_url` mapping, the
silent-clips / room-tone rule, and the consistency cliff (2–3 distinctive details, large in
frame, avoid the darkest lighting) all baked **inline** (the runtime sandbox has no KB).

## The render mechanic (read before writing anything)

Kling 3.0's `fal-ai/kling-video/v3/pro/image-to-video` animates a **single start image** into a
clip — it is image-to-video, so each shot needs a start frame. The cross-shot identity lock is
therefore the **shared character bible**: every shot's start keyframe is generated by
nano-banana-pro from the SAME reference-sheet + hero, with the bible's verbatim CHARACTER_BLOCK
tokens in the prompt. Two things make the sequence hold together, and both are this skill's job:

1. **One keyframe per shot, character locked.** Compose the shot's scene/action with the
   bible's verbatim trait tokens, pass the reference-sheet AND hero as `--ref`, generate the
   keyframe with nano-banana-pro (**no `--resolution` flag** — it is rejected and skips the
   primary model). Keep the character **large in frame** and **avoid the very darkest lighting**
   — those are Kling's two consistency-cliff failure modes.
2. **One Kling i2v call per shot, then stitch.** Animate each keyframe with Kling i2v
   (`--image` = the start frame), normalize every clip to a uniform layout, concat in shot
   order, and add a quiet ambient bed. The character does NOT carry across cuts inside the
   model the way Seedance does — it rests on the shared bible keyframes + the verbatim tokens.

## Workflow

### 1. Read before writing

Read `artifacts/<project-name>/shotlist.md`, confirm `artifacts/<project-name>/reference-sheet.png`
and `artifacts/<project-name>/hero.png` exist on disk, and read `state.md`. From the shot-list pull:
the global look header, the `@Image1`/`@Image2` identity-lock line (with the verbatim trait tokens
and the character Name), every numbered `[Xs-Ys]:` shot, and the `Total: ... Audio: ...` footer
(the aspect ratio and the Audio bed description live there).

**If shotlist.md is missing or empty**: do NOT render — record the failure in state.md and stop.
**If reference-sheet.png OR hero.png is missing on disk**: do NOT render — route back to phase 1
(character-bible). See "Failure handling".

### 2. Resolve inputs and defaults

| input | required | default when absent |
|---|---|---|
| shotlist.md | yes | — (clean recorded failure) |
| reference-sheet.png | yes | — (route back to phase 1) |
| hero.png | yes | — (route back to phase 1) |
| aspect-ratio | no | read from the `Total:` footer (else `16:9`) |
| duration | no | read from the shot-list time-codes (cross-check only) |
| tier | no | `economy` (`quality` raises the per-call cost cap) |

Every default applied and every assumption made gets a bullet in `summary.md`.

### 3. Render — `scripts/gen-kling-cinematic.sh`

This script is the engine. It parses the shot-list, and for EACH shot:

1. **Composes the keyframe prompt** = the shot's scene/action + the bible's verbatim
   CHARACTER_BLOCK tokens (from the identity line) + the look header + a "no text, no
   watermark" tail. Keep the character large in frame; avoid the darkest lighting.
2. **Generates the start keyframe** with nano-banana-pro — `--ref reference-sheet.png --ref
   hero.png --aspect-ratio <AR>`, **NO `--resolution`** (the bible chain rejects it and the
   primary model is skipped). Parses `files[0].local_path` with python3.
3. **Animates it with Kling i2v**:

   ```bash
   ai-gen video "<shot motion prompt>" \
     -m fal-ai/kling-video/v3/pro/image-to-video \
     --image <keyframe.png> \
     --duration 5 --aspect-ratio <AR> \
     --max-cost <cap> --format json "duration=<5|10>"
   ```

   `--image` maps to Kling's `start_image_url`. Kling takes 5s or 10s reliably — snap each
   shot span to the nearer of {5,10}. Kling has **NO native audio** — the clip is silent.
   Raise `cfg`/guidance via the `params` pass-through (`cfg_scale=...`) only if the CLI exposes
   it; otherwise omit. Parse `files[0].local_path`.

Run it from the skill directory:

```bash
DURATION=<total> ASPECT=<AR> TIER=<economy|quality> \
  bash <skill-dir>/scripts/gen-kling-cinematic.sh \
  artifacts/<project-name>/shotlist.md \
  artifacts/<project-name>/reference-sheet.png \
  artifacts/<project-name>/hero.png \
  artifacts/<project-name>
```

It writes the per-shot keyframes and clips under `artifacts/<project-name>/work-shots/` and
prints a machine-readable JSON line naming the clips produced. A shot whose keyframe or whose
Kling call fails is skipped (recorded) — the run continues with the shots that succeeded. If
EVERY shot fails, the script exits non-zero and writes no episode (a clean recorded failure).

### 4. Assemble — `scripts/assemble.sh`

Normalize each per-shot clip to a uniform layout (24fps, the aspect canvas, h264/yuv420p),
concat them in shot order via the demuxer, and add the room-tone bed:

```bash
ASPECT=<AR> AUDIO_DESC="<the shot-list Audio: line>" \
  bash <skill-dir>/scripts/assemble.sh artifacts/<project-name>
```

- Kling clips are SILENT, so the bed is **always added** (unlike the Seedance fallback, which
  only adds a bed when a clip lacked native audio). The bed is a simple, quiet ffmpeg ambience
  derived from the shot-list `Audio:` line — `anoisesrc` brown-noise at a low volume (a "room
  tone"), optionally a faint sine pad. It is an **added ambient bed, NOT native audio** — state
  that plainly in `summary.md`.
- Writes `artifacts/<project-name>/episode.mp4` and prints a JSON verdict line (file, duration,
  shots, audio=roomtone, verdict).

`gen-kling-cinematic.sh` may call `assemble.sh` itself at the end (one combined run), or you
run them in two steps — both are supported; the scripts are idempotent on a clean `work-shots/`.

### 5. ffprobe-verify

The assemble step records the ffprobe verdict; confirm it before writing the summary:

- a **video stream** is present;
- an **audio stream** is present (the room-tone bed);
- the format **duration** is within ±1s of the **sum of the per-shot (snapped) durations**.

A missing video stream or a wildly-off duration is a FLAG, reported prominently in `summary.md`.
A small duration wobble inside ±1s passes. Never discard a usable episode over a sub-second
wobble — deliver and flag.

### 6. Write `summary.md` (honest production log)

Write `artifacts/<project-name>/summary.md` recording, truthfully:

- **per shot**: the keyframe model (nano-banana-pro, or the chain fallback that produced it),
  the keyframe file, the Kling slug (`fal-ai/kling-video/v3/pro/image-to-video`), the snapped
  duration, and whether the shot succeeded or was skipped (and why);
- **assembly**: the uniform-normalize parameters, the concat, and the **room-tone bed —
  explicitly "an added ambient ambience derived from the Audio: line, NOT native Kling audio"**;
- **verification**: the ffprobe verdict (video stream, audio stream, duration vs the summed
  target), with any FLAG called out;
- **cost**: per-shot and total via `ai-gen estimate` (the keyframe image cost + the Kling i2v
  cost per shot), and the `ai-gen balance` delta if available — **never** the JSON `credits_used`
  field (it over-reports);
- the **one-line architecture note**, verbatim:
  `Per-shot Kling i2v + ffmpeg concat — a DIFFERENT architecture from Seedance's single-pass native-audio render; scored head-to-head in the KB results-log.`

### 7. Update the ledger

`state.md` is how phases chain — never leave it stale (see "Ledger updates").

## Failure handling (headless)

| situation | action |
|---|---|
| shotlist.md missing or empty | Phase cannot run — mark the phase row `blocked`, project `status: blocked`, blocker `render blocked; no shotlist.md — run phase 2 (bot-027-shotlist) first`. Produce no MP4. Stop. |
| reference-sheet.png and/or hero.png missing on disk | Do NOT render — mark the phase row `blocked`, blocker `render blocked; bible image(s) missing — run phase 1 (bot-027-character-bible) first`. `next_action` routes back to phase 1. Produce no MP4. Stop. |
| no time-coded `[Xs-Ys]:` shots parse from the shot-list | The shot-list is malformed — mark `blocked`, blocker `render blocked; no parseable shots in shotlist.md — re-run phase 2`. Stop. |
| one shot's keyframe or Kling call fails | Skip that shot, record it, continue with the rest. If ≥1 shot succeeded, deliver the episode with the skipped shot disclosed (verdict FLAG). |
| EVERY shot fails | No usable episode — the script exits non-zero; mark the phase `blocked` with the captured errors quoted; produce no MP4. Stop. |
| episode produced but ffprobe FLAGs it (no video / duration far off) | Deliver the file, mark the run `done` with a prominent FLAG in `summary.md` and a decisions-log note; do NOT silently pass it as clean. |

A clean recorded failure is a correct outcome; a silent or invented one is not.

## Outputs

This phase writes exactly two artifacts (plus per-shot intermediates under `work-shots/`):

- `artifacts/<project-name>/episode.mp4` — the assembled Kling cinematic: per-shot
  image-to-video clips, each started from a per-shot nano-banana-pro keyframe carrying the bible
  character, uniform-normalized (24fps, aspect canvas, h264/yuv420p), concatenated in shot order,
  with a subtle **added** room-tone ambient bed (NOT native audio). ffprobe-verified for a video
  stream, an audio stream, and a duration near the sum of the per-shot durations.
- `artifacts/<project-name>/summary.md` — the honest production log: per-shot keyframe model +
  Kling slug, the concat, the room-tone bed (stated as an added ambient bed, NOT native), the
  ffprobe verdict, per-shot + total cost via `ai-gen estimate`, and the one-line architecture
  note (per-shot Kling i2v + ffmpeg concat vs Seedance single-pass — scored head-to-head in the
  KB results-log).

No other deliverables. The character bible belongs to phase 1; the shot-list to phase 2.

## Ledger updates

After the episode is delivered, update `artifacts/<project-name>/state.md`:

- Mark this phase row (`render`) `done`; if it is the last phase, set project `status: complete`.
- Refresh `updated:` to today.
- Rewrite `next_action:` to the imperative for what follows (e.g. review the episode, or — if a
  FLAG was raised — re-render the flagged shot).
- Append a Decisions-log line recording the engine (Kling per-shot i2v + concat), the room-tone
  bed, the cost basis, and any skipped shot or FLAG.

On failure, write the `blocked` shape from "Failure handling" instead — a clean recorded failure
is a correct outcome; a silent or invented one is not.

## References

- `references/kling-dialect.md` — the Kling 3.0 engine baked inline: the C3 Bind-Subject /
  per-shot mechanic, the E3 fight beat, the keyframe-then-i2v flow, the `--image` →
  `start_image_url` mapping, the silent-clips / room-tone rule, the consistency cliff (2–3
  distinctive details, keep the subject large in frame, avoid the darkest lighting), the
  negative-elements anchor, the ai-gen JSON contract (`files[0].local_path`), and the
  Seedance-vs-Kling architectural difference. Load before composing keyframes or motion prompts.
- `scripts/gen-kling-cinematic.sh` — per-shot keyframe (nano-banana-pro) + Kling i2v engine.
- `scripts/assemble.sh` — uniform-normalize → concat → room-tone bed → ffprobe verify.
