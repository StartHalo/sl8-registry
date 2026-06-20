# Seedance / Kling i2v dialect — verified ai-gen 2.1.0 syntax (use EXACTLY)

ai-gen 2.1.0 runs inside the sandbox. These forms are the verified contract for the
two i2v engines this skill uses. Do **not** re-flag them as unverified — they were
verified live. The riskiest break point is the **per-model start-frame arg path**
(Seedance `image_url` via `--image` vs Kling required `start_image_url`), which is
exactly why every output is gated by `video-qc.md`.

## The engines

| Engine | Slug | Start-frame arg | Audio | Notes |
|---|---|---|---|---|
| **Seedance 2.0 (PRIMARY)** | `bytedance/seedance-2.0/image-to-video` | `--image <start>` → `image_url` | in-pass dual-channel stereo, **same inference pass** (not a TTS stitch) | bare `bytedance/` namespace, NOT `fal-ai/`; multi-shot time-coded `(0-4s):`; 4-15s; up to 1080p |
| **Seedance 2.0 fast** | `bytedance/seedance-2.0/fast/image-to-video` | `--image <start>` → `image_url` | in-pass | the CHEAP tier slug. `fast` here is the price tier — it is **NOT** a fast camera move. Camera moves stay slow regardless. |
| **Kling 3.0 (ALT)** | `fal-ai/kling-video/v3/standard/image-to-video` | **`start_image_url=<start>`** (POSITIONAL key=value) — NOT `image_url` | native audio via `generate_audio=true` | logo-stays-sharper; 3-15s; 720p/1080p/4K. `--image` may NOT forward to `start_image_url`, so this skill passes BOTH. |
| Veo 3.1 (catalog) | `fal-ai/veo3.1/image-to-video` | smoke-test at build | — | listed-but-not-verified; not wired here. |

## The commands (verbatim shape)

### Seedance (the default path)

The start frame maps to the model's `image_url` via `--image`; `duration` is a
POSITIONAL model param; in-pass audio is native (no flag):

```bash
ai-gen video "<strict-product motion prompt>" \
  -m bytedance/seedance-2.0/image-to-video \
  --image /home/user/.../hero.jpg \
  --aspect-ratio 9:16 duration=5 \
  -o work/video --format json --max-cost 200
```

### Kling (the alt path — DIFFERENT arg)

Kling's schema **requires `start_image_url`**, not `image_url`. `gen-video.sh` passes
the frame as the POSITIONAL `start_image_url=<frame>` (and `--image` as belt-and-
braces), plus `duration` and `generate_audio` as positional key=value params:

```bash
ai-gen video "<strict-product motion prompt>" \
  -m fal-ai/kling-video/v3/standard/image-to-video \
  --image /home/user/.../hero.jpg \
  --aspect-ratio 9:16 \
  start_image_url=/home/user/.../hero.jpg duration=5 generate_audio=true \
  -o work/video --format json --max-cost 200
```

If a Kling clip comes back showing a DIFFERENT product, the start frame did not
attach — `video-qc.md` catches this; re-run preferring Seedance.

## The hard syntax rules (verified live — do NOT re-flag)

- **`--image <path|url>` → the model's `image_url`** (the single source / start
  frame). A local file works (v2.1.0 uploads it); an https URL works too.
- **`--ref <path|url>`** is multi-ref (repeatable) — not used by this skill.
- **Model params are POSITIONAL `key=value`** — `duration=5`, `resolution=2K`,
  `start_image_url=...`, `generate_audio=true`. **There is NO `--duration` /
  `--resolution` / `--start-image` flag** (they error). Aspect via `--aspect-ratio`.
- **Outputs:** read `files[0].local_path` from the `--format json` blob (entries are
  **objects**, not strings). The `*.fal.media` URL **expires** — copy/use the local
  file immediately. Never `startswith("https://fal.media")` (it rejects every real
  URL — the BOT-013 bug). `gen-video.sh` copies `files[0].local_path` to the stable
  `<out>.mp4` the moment the call returns.
- **Cost:** IGNORE the `credits_used` JSON field (over-reports ~8.4× on seedance
  i2v). Read true cost from `ai-gen estimate <slug>` + `ai-gen balance` deltas
  (billing lags ~5 min). Use `--max-cost` (in credits) as a per-call guard. Video is
  the most expensive op in the bot — confirm the base clip PASSES QC before any fan-out.

## The strict-product formula (verbatim from seedance.tv)

```
[Format], [product] on [surface], [one camera move], [lighting], [commercial style],
keep [logo/label/shape] stable, no extra text, no distorted details.
```

Rationale (verbatim): *"Product prompts should be strict because small details matter.
Mention the product material, the surface, one camera move, and what must remain
stable."* And: *"Shorter prompts with one clear motion often beat long prompts with
too many creative instructions."* `motion-prompt.py` assembles exactly this; the
quality suffix it appends is `sharp clarity, natural colors, stable picture, no blur,
no ghosting, no flickering`.

## Multi-shot (time-coded, one pass, in-pass audio)

Seedance reads parenthetical-seconds beats; still ONE primary move per beat, all slow:

```
(0-3s) macro shot of [PRODUCT] on a reflective acrylic surface, shallow depth of field,
rim light catching the edges
(3-7s) camera glides closer, soft light rakes across the surface revealing the label
texture, keep the label readable
(7-11s) slow-motion detail moment, volumetric lighting, preserve product color and shape
(11-15s) pull-out to centered hero frame, product isolated, premium minimalist background,
sharp clarity no jitter stable picture
```

`motion-prompt.py --multishot` emits this 4-beat arc.
