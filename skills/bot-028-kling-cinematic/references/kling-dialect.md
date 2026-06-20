# Kling 3.0 cinematic dialect — the render engine, baked inline

Per-model mechanics, the per-shot keyframe-then-i2v flow, the silent-clips / room-tone rule,
and failure triage for the Kling render. Baked **inline** here because the runtime sandbox has
**no KB access** — this file IS the source of truth at runtime. Source: KB
[Cinematic Video Recipes §C3/E3](../../../../../../kb/wiki/topics/cinematic-video-recipes.md) and
[Prompting Kling 3](../../../../../../kb/wiki/topics/prompting-kling-3.md). The render+assembly
donors are BOT-013 `clip-assembly` (`gen-clip.sh` Kling slug + `assemble.sh` concat) and BOT-027
`seedance-cinematic` (`per-shot-fallback.sh` per-shot i2v + concat). The keyframe donor is BOT-027
`character-bible` (`gen-image.sh` nano-banana-pro chain).

## Seedance vs Kling — the architectural difference (load-bearing for the fleet)

> **Seedance** does the whole numbered shot-list in **one `reference-to-video` pass with native
> in-pass audio** — no per-shot work, no stitching, one identity lock across all cuts.
>
> **Kling 3.0** is reachable but, in the SL8 per-shot pipeline, the cinematic sequence is realized
> as **N image-to-video calls + ffmpeg concat** (the BOT-013 model): cross-shot identity rests on
> the shared character **bible** image + verbatim tokens (re-instantiated per shot via a fresh
> keyframe) rather than a single in-model lock, and a **room-tone bed** stands in for native
> multi-shot audio. This is exactly the comparison the KB results-log scores — **never silently
> treat them as equivalent**, and state the room-tone bed honestly in `summary.md`.

This skill is the **Kling** side of that comparison. The per-shot path is the **PRIMARY** path
here (it is the only way to do Kling multi-shot in this pipeline), NOT a fallback.

## The engine — per shot, two calls

For each numbered `[Xs-Ys]:` shot in the shot-list, do two things in order.

### (1) The start keyframe — nano-banana-pro (image)

Kling i2v animates a single START IMAGE, so every shot needs a start frame. Generate it with the
SAME bible chain the character-bible used, so the SAME character recurs across shots:

```bash
ai-gen image "<KEYFRAME_PROMPT>" \
  -m fal-ai/nano-banana-pro \
  --ref <reference-sheet.png> --ref <hero.png> \
  --aspect-ratio <16:9|9:16|1:1> \
  --max-cost <cap> --format json
```

- **NO `--resolution` flag.** nano-banana-pro REJECTS `--resolution` as an unknown option (exit
  non-zero) and the whole image chain falls through, skipping the primary model on every run.
  Proven on BOT-016/BOT-027. Render at the model's default; pass only `--aspect-ratio`.
- **Both bible images as `--ref`.** The turnaround sheet first, the hero second — they bind the
  identity. nano-banana-pro accepts up to 14 refs. Local paths upload transparently.
- **Chain fallback (same as the bible):** if nano-banana-pro is unavailable, walk
  `fal-ai/nano-banana-pro → openai/gpt-image-2 → fal-ai/nano-banana-2` — all three are
  reference-capable and aspect-ratio-capable, so the character lock survives a fallback.
- **`KEYFRAME_PROMPT` shape:** the shot's scene + the ONE action as a still moment + the bible's
  verbatim CHARACTER_BLOCK trait tokens (quoted from the identity line — never paraphrase a locked
  token; "emerald eyes" stays "emerald eyes") + the look header (genre, lighting, color grade) +
  a "no text, no watermark, no logo" tail. Keep the character **large in frame**.
- JSON: the local file is **`files[0].local_path`** (files[] entries are OBJECTS — parse with
  python3, never regex the blob); the hosted URL is `hosted_urls[0]`.

### (2) Animate it — Kling i2v (video)

```bash
ai-gen video "<MOTION_PROMPT>" \
  -m fal-ai/kling-video/v3/pro/image-to-video \
  --image <keyframe.png> \
  --duration 5 --aspect-ratio <16:9|9:16|1:1> \
  --max-cost <cap> --format json "duration=<5|10>"
```

- **Slug:** `fal-ai/kling-video/v3/pro/image-to-video` (the PROVEN slug from BOT-013's model
  chain). The `standard` tier swaps `/pro/` for `/standard/`. 720p / 1080p / 4K available.
- **`--image` maps to Kling's `start_image_url`** — the keyframe is the first frame and Kling
  animates forward from it.
- **Duration:** Kling takes per-shot durations of 3–15s flexibly, but **5s and 10s** are the
  reliable granularities. Snap each shot's `[Xs-Ys]` span to the nearer of {5, 10}: a span ≤7s
  → 5, otherwise → 10. Pass it both as `--duration` and as the `duration=<n>` params
  pass-through; if the model rejects the pass-through, retry without it (the clip runs at the
  model default — disclose in summary.md).
- **`cfg` / guidance:** Kling exposes a guidance/cfg knob; raise it via the params pass-through
  (`cfg_scale=<n>`) ONLY if `ai-gen info` confirms the CLI exposes it. If it does not, omit it
  rather than guessing an arg the model will reject.
- **NO native audio.** Kling i2v clips come back **SILENT** in this pipeline. Do NOT pass
  `--audio on` expecting a score — there is none. The audio is added at assembly (room tone).
- **`MOTION_PROMPT` shape (lead with camera, then action, then framing — the C3 Elements order):**
  `<camera move> on the <character>, <ONE present-tense action>, <lighting/look>`. One action +
  one camera move per shot (the #1 jitter lever). Keep the subject large in frame; avoid the very
  darkest lighting (Kling's consistency cliff).
- JSON: the clip is **`files[0].local_path`** (same parse as the image).

## The C3 multi-shot Elements sequence (verbatim — adapt camera/action per shot)

> Shot 1 (4 seconds): Dolly in on @character from behind, walking through neon-lit street at night
> Shot 2 (3 seconds): Arc shot from behind to front view, character looks tense, slow zoom to face
> Shot 3 (4 seconds): Over-the-shoulder of character looking at glowing device in hand
> Shot 4 (4 seconds): Close-up of character speaking, "This changes everything." Native audio, English, confident tone

In THIS pipeline each "Shot N" is a SEPARATE i2v call on its own keyframe — we do not feed Kling
the whole numbered list. The verbatim sequence is the **shape** to mirror per shot: lead with the
camera move, then the subject action, then framing.

## The E3 fight beat (verbatim)

> The warrior turns around as the focus shifts to a monster standing opposite him. He draws his sword, ready to begin.

Pair a fight shot's keyframe with a single action focus per shot; keep the subject large in frame
to stay in Kling's ~90% consistency band.

## Consistency cliff (the descriptor rules)

| condition | reported consistency |
|---|---|
| 2–3 distinctive character details | ~78% |
| 2 characters in scene | ~84% |
| 3 characters in scene | ~67% |
| 4+ characters | <40% |

- **Cap distinctive character details at 2–3** in the motion prompt — the bible keyframe carries
  the full look; the motion prompt should not re-describe every trait.
- **Keep lighting and camera distance stable** between shots.
- **Keep the character large in frame; avoid the very darkest lighting** — the failing ~10% are
  extreme angles, very dark scenes, or small-in-frame subjects.

## Negative-elements anchor (Kling DOES take negatives)

Unlike Seedance, Kling has a Negative Elements field. When the CLI exposes a negative-prompt arg,
this is the verbatim identity-stability anchor:

> glasses, sunglasses, facial hair, beard, changing clothes, suit color shift, missing tie, open collar, messy hair, sweat, skin changes, de-aging, fewer wrinkles, messy office, moving desk items, extra fingers, bad hands, shifting tie patterns

If the CLI does not expose a negative-prompt arg, rely on the positive constraints baked into the
keyframe + motion prompt and the bible lock — do NOT invent an unsupported flag.

## Assembly — uniform-normalize → concat → room-tone bed

Donor: BOT-013 `assemble.sh` + BOT-027 `per-shot-fallback.sh`.

1. **Normalize every clip to a uniform layout BEFORE concat** (mixed fps/size/SAR/codec is the #1
   concat failure):
   `fps=24,scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p`,
   re-encode `libx264 -crf 20`. Canvas by aspect: `16:9 → 1280x720`, `9:16 → 720x1280`,
   `1:1 → 720x720`. Kling clips are silent → attach a silent stereo track per clip so every
   segment has an identical A/V layout for the demuxer.
2. **Concat in shot order** via the demuxer (`-f concat -safe 0 -c copy`); on an edge-case
   stream-copy failure, re-encode the concatenation (slower, always works).
3. **Room-tone bed — ALWAYS added** (Kling clips are silent; there is no native audio to double
   up). Derive a quiet ambience from the shot-list `Audio:` line: a low brown-noise room tone is
   the safe default —
   `[1:a]volume=-38dB,pan=stereo|c0=c0|c1=c0[rt]` mixed under the (silent) episode track. A faint
   sine pad (`sine=frequency=110`) at a very low volume is an acceptable alternative for a calm
   scene. The bed is an **added ambient bed, NOT native audio** — say so in summary.md.
4. **ffprobe verify:** a video stream present, an audio stream present (the room tone), and the
   duration within ±1s of the **sum of the per-shot (snapped) durations**.

## Cost

- Per shot = the keyframe image cost (nano-banana-pro) + the Kling i2v cost. Use
  `ai-gen estimate` for each, and `ai-gen balance` deltas to confirm — **never** the JSON
  `credits_used` field (it over-reports ~8× on i2v). 1 credit ≈ $0.004.
- A failed generation is not charged, but a needless re-render is — prefer fixing the composed
  prompt over re-rendering. Drop the Kling tier to `standard` or the keyframe to default
  resolution to trim cost while iterating.

## Slug discipline (pinned 2026-06-19 — re-confirm at build via the reachability gate)

| role | slug | notes |
|---|---|---|
| keyframe (image) | `fal-ai/nano-banana-pro` | NO `--resolution`; refs + aspect only; chain → gpt-image-2 → nano-banana-2 |
| render (video) | `fal-ai/kling-video/v3/pro/image-to-video` | `--image` = start_image_url; silent; 5s/10s reliable; `/standard/` for the cheaper tier |

Confirm reachability with a `-m <slug>` pass-through at build (the reachability gate). A model
that rejects an arg falls THROUGH to the next model in the chain — recorded, never improvised
around.
