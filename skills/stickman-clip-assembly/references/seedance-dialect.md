# Seedance 2.0 Dialect — stickman-clip-assembly

Reference for Seedance prompting, the @-reference system, and multi-shot patterns.
Primary source: KB wiki/prompting/seedance-2.md and wiki/recipes/cinematic-video.md.

---

## Primary approach: reference-to-video multi-shot (KB Recipe C1)

One `reference-to-video` call generates the full episode in a single render. The model
carries character identity across all shots natively — no per-beat stitching needed.

**Endpoint:** `bytedance/seedance-2.0/reference-to-video`
**Namespace note:** Seedance 2.0 lives under the bare `bytedance/` prefix, NOT `fal-ai/`.
Tools that assume `fal-ai/<model>` will wrongly report it unavailable.

### @-reference envelope

```
@Image1 = character-source.png  → role: character reference
@Image2 = still-01.png          → role: scene reference for shot 1
@Image3 = still-02.png          → role: scene reference for shot 2
...up to @Image9 (9 images total max)
```

Every uploaded file must have an explicit role in the prompt. An untagged image is
processed ambiguously — name each one.

### Time-coded prompt structure

```
A stick figure hand-drawn pencil sketch animation. [total]s, [N] shots, [aspect].
Pencil-sketch style throughout: graphite grain, varied line weight, white paper background.
@Image1 as character reference — maintain exact stick figure construction and cap in every shot.

Shot 1 ([0s]-[Xs]): [motion from beat 01]. @Image2 as scene reference.
Shot 2 ([Xs]-[Ys]): [motion from beat 02]. @Image3 as scene reference.
...

Audio: NO MUSIC, ONLY AMBIENT SOUND. NO TALKING.
Quality: avoid jitter, avoid identity drift, maintain character proportions and cap, stable picture, no blur, no ghosting.
```

### Key rules (Seedance-specific)

- **NO negative prompts** — Seedance does not use negative_prompt syntax. Use positive
  constraints: "avoid X" / "maintain Y" not "no X".
- **One primary camera movement per shot** — don't stack camera moves.
- **Native audio** — `generate_audio: true` is default-on with no surcharge. The audio
  directive ("NO MUSIC, ONLY AMBIENT SOUND. NO TALKING.") must be stated or stock music
  leaks in (community-documented failure).
- **State shot count + total duration at the TOP** of the prompt.
- **Realistic human faces restricted** — Seedance is ideal for stylized characters and
  minimal figures. The stickman style is a good fit.

### CLI call

```bash
ai-gen video -m bytedance/seedance-2.0/reference-to-video \
  --prompt "<time-coded shot-list>" \
  --params-file work/seedance-refs.json \
  --format json \
  --max-cost 1000
```

`work/seedance-refs.json`:
```json
{
  "image_urls": [
    "<character-source.png hosted URL>",
    "<still-01 hosted URL>",
    "<still-02 hosted URL>"
  ],
  "generate_audio": true,
  "duration": <total seconds 4-15>,
  "resolution": "720p"
}
```

Cost: ~908 credits (~$3.63) at 720p / 15s. Use `ai-gen estimate` for precise cost.

---

## Fallback B: per-beat image-to-video

When multi-shot fails or duration exceeds 15s (Seedance max).

**Endpoint:** `bytedance/seedance-2.0/fast/image-to-video`
**Input:** one still per call (fal.media hosted URL)
**Output:** one MP4 per beat → ffmpeg concat → episode.mp4

### Per-beat prompt structure

```
[VIDEO_STYLE from spec]. [motion field from plan].
Audio: NO MUSIC, ONLY AMBIENT SOUND. NO TALKING.
Avoid jitter, avoid identity drift, maintain character proportions and cap.
```

ONE figure action + ONE camera move maximum in motion. No emotional/quality adjectives.

### Model chain (per-beat fallback)
1. `bytedance/seedance-2.0/fast/image-to-video` (primary per-beat)
2. `fal-ai/kling-video/v3/pro/image-to-video` (Kling fallback — per-shot, drift risk)

**Seedance vs Kling:** Seedance holds identity natively within a call; Kling per-shot
drifts without raised cfg_scale. Always prefer Seedance. Flag Kling use in 05-summary.md.

---

## Camera keyword reference (safe defaults)

```
fixed / locked-off       — zero movement (safest for stickman style)
slow push-in             — gentle tension
pull-out                 — reveal context
pan left / pan right     — follow action
tracking shot            — alongside subject
```

Avoid: `fast`, `epic`, `dynamic`, `lots of movement`, `amazing` (no visual meaning).
One movement per shot. Use "slow" / "gentle" modifiers by default.

---

## Fallback C: still-as-segment

Last resort when all i2v fails for a beat.

```bash
scripts/still-segment.sh <still-path> <duration>
```

Applies a slow zoompan (ffmpeg) to the still at the beat's duration (5s or 10s).
Always flag in 05-summary.md. No native audio — room-tone bed will be added by assemble.sh
if all clips are still-segment.
