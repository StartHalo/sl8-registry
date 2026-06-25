---
name: stickman-clip-assembly
description: Animates scene stills into clips and assembles the episode MP4 for the stickman animator. For episodes of 15 seconds or less it tries Seedance reference-to-video multi-shot. For longer episodes (the common case) it uses per-beat image-to-video directly — the standard production path, not a fallback. Writes episode.mp4, 05-summary.md, and updates dashboard.html with completion status. Use this skill for stickman clip generation and episode assembly.
metadata:
  inputs:
    - name: episode-plan
      type: markdown
      description: Beat sheet with per-beat durations and camera keywords.
    - name: stills-log
      type: markdown
      description: Per-beat still hosted URLs that feed image-to-video generation.
  outputs:
    - name: episode
      type: video
      path: artifacts/<slug>/episode.mp4
      description: The assembled multi-beat stickman episode MP4 with ambient audio.
    - name: production-summary
      type: markdown
      path: artifacts/<slug>/05-summary.md
      description: Honest production log of approach, models, fallbacks, and limitations.
---

# Phase 4 — Clips & Assembly (stickman-clip-assembly)

**Reads:** `<ep>/01-episode-plan.md`, `<ep>/03-stills/stills-log.md`,
`<ep>/character/character-spec.md`

**Writes:** `<ep>/04-clips/`, `<ep>/episode.mp4`,
`<ep>/05-summary.md`, `artifacts/dashboard.html`

---

## Step 1 — Route by episode duration

Sum all beat durations from `01-episode-plan.md`.

- **Total ≤ 15s** → try Step 2 (Seedance reference-to-video multi-shot)
- **Total > 15s** → skip directly to Step 3 (per-beat i2v — the standard path)

Seedance reference-to-video hard-caps at 15s. Any episode longer than that must use
per-beat i2v. For a typical 30s episode, Step 2 will never run.

---

## Step 2 — Reference-to-video multi-shot (short episodes ≤15s only)

> **Scope:** Only viable when total episode duration ≤ 15s. Skip this step entirely
> if total > 15s.

### 2.1 Build the reference list

From `<ep>/character/character-spec.md` (hosted URL) and `<ep>/03-stills/stills-log.md`:
- First `--ref`: hosted character-source.png URL → character identity anchor
- Subsequent `--ref` flags: hosted still URLs in beat order (up to 8 stills)

If more than 8 stills: use only the first 8; note in 05-summary.md.

### 2.2 Compose the time-coded shot-list prompt

```
A stick figure hand-drawn pencil sketch animation. [total duration]s, [N] shots, [aspect].
Pencil-sketch style throughout: graphite grain, varied line weight, white paper background.
@Image1 as character reference — maintain exact stick figure construction and cap in every shot.

Shot 1 ([0s]-[Xs]): [motion field from beat 01 plan]. @Image2 as scene reference.
Shot 2 ([Xs]-[Ys]): [motion field from beat 02 plan]. @Image3 as scene reference.
...

Audio: NO MUSIC, ONLY AMBIENT SOUND. NO TALKING.
Quality: avoid jitter, avoid identity drift, maintain character proportions and cap, stable picture, no blur, no ghosting.
```

### 2.3 Call Seedance reference-to-video

```bash
ai-gen video -m bytedance/seedance-2.0/reference-to-video \
  --ref <hosted character-source.png URL> \
  --ref <hosted still 01 URL> \
  --ref <hosted still 02 URL> \
  [... up to 8 stills] \
  --duration <total seconds, max 15> \
  --resolution 720p \
  --audio on \
  --output <ep>/ \
  --format json \
  --max-cost 1000 \
  "<time-coded shot-list prompt>"
```

On success: output is ONE MP4 covering the full episode. Move to Step 4 (verify).
On failure (API error, timeout, style rejection): proceed to Step 3 (per-beat i2v).

---

## Step 3 — Per-beat i2v (standard path for >15s; fallback for ≤15s)

Generate one clip per beat. This is the expected path for all standard episodes.

### 3.1 Per beat in stills-log order

```bash
ai-gen video -m bytedance/seedance-2.0/fast/image-to-video \
  --image "<fal.media URL from stills-log>" \
  --aspect-ratio <16:9 | 9:16> \
  --resolution 720p \
  --duration <beat-duration> \
  --audio on \
  --output <ep>/04-clips/ \
  --format json \
  --max-cost <see table> \
  "<VIDEO_STYLE from spec>. [Camera]: <camera keyword from beat's camera: field in stills-log — e.g. slow dolly-in, locked-off, arc shot>. [Action]: <motion field from plan>. [Subject]: Stickman figure — single-stroke arms and legs, minimal construction, baseball cap. Maintain exact character proportions and cap throughout. Avoid identity drift, avoid jitter, avoid rounded limbs. [Constraints]: Monochrome pencil sketch on white. NO MUSIC, ONLY AMBIENT SOUND. NO TALKING. Sharp clarity, stable picture, no blur, no ghosting."
```

**max-cost by beat duration (live-validated at 720p):**

| Beat duration | `--max-cost` |
|---|---|
| 4–7s | 360 |
| 8–15s | 700 |

Model chain: `bytedance/seedance-2.0/fast/image-to-video` → `fal-ai/kling-video/v3/pro/image-to-video`

If both i2v models fail for a beat: use Step 4 fallback (still-as-segment) for that beat.
Save clip to `<ep>/04-clips/NN-<beat-slug>.mp4`.

### 3.2 Assembly via ffmpeg

```bash
scripts/assemble.sh <project-dir> [--aspect 16:9|9:16] [--caption "<punchline>"]
```

The assemble script normalises each clip (24fps, H.264, yuv420p, canvas by aspect),
concats in beat order, optionally adds a 2s caption card, and adds a room-tone bed
(brown-noise −38dB) ONLY when NO clip has native audio.

See `references/assembly.md` for ffmpeg recipes.

---

## Step 4 — Still-as-segment (per beat, last resort)

For any beat where all i2v models failed:

```bash
scripts/still-segment.sh <still-path> <duration>
```

Produces a slow zoompan animation from the still at the beat's duration.
Flag every still-as-segment in 05-summary.md.

---

## Step 5 — Verify episode.mp4

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=duration,width,height \
  -of json <ep>/episode.mp4
```

Checks: duration 15–60s? Aspect matches plan? On fail: FLAG in summary (deliver anyway,
disclose the issue).

---

## Step 6 — Write 05-summary.md

```markdown
# Production Summary — <slug>

## Episode
- Duration: Xs (target: Xs)
- Aspect: 16:9 | 9:16
- Beats: N planned, N delivered
- Approach: multi-shot | per-beat | mixed

## Per-clip log
| Beat | Approach | Model | Duration | Audio | Notes |
|------|----------|-------|----------|-------|-------|
| 01-<slug> | per-beat | seedance-2.0/fast/i2v | Xs | native | |
...

## Audio treatment
<native Seedance audio | room-tone bed (−38dB) | silent — no audio>

## Fallbacks taken
<list any fallbacks, or "none">

## Limitations
<any known issues, drift, missing beats, FLAG from ffprobe>
```

---

## Step 7 — Update dashboard.html

Read `artifacts/dashboard.html`. Update the episode phases table:
- Animate clips: `✓ done (N multi-shot | N per-beat | N still-segment)`
- Assemble episode: `✓ done — <duration>s`

Update history section: append the completed episode as a new collapsible row.
Rewrite the full HTML to `artifacts/dashboard.html`.

---

## Step 8 — Update state.md

Mark phase 4 `done`. Status = `complete`. Update `next_action`:
"Episode complete — episode.mp4 ready at artifacts/<slug>/episode.mp4."

Log any fallbacks or flags in state.md open-questions section.
