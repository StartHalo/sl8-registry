# ai-gen — media inputs & references

Media-input flags accept a **local path**, an **http(s) URL**, or a **data URI** — the same flag
works for all three. `ai-gen` resolves locals automatically.

## The input flags

| Flag | Maps to (schema-dependent) | Use for |
|---|---|---|
| `--image <path\|url>` | `image_url` / `start_image_url` / … | image edit, image-to-video first frame |
| `--first-frame <path\|url>` | first-frame param (alias of `--image`) | constrained i2v |
| `--last-frame <path\|url>` | `end_image_url` / `last_image_url` | first→last-frame video, extend |
| `--video <path\|url>` | `video_url` | extend, video-to-audio (foley), lipsync |
| `--audio-file <path\|url>` | `audio_url` | lipsync, video-to-audio reference |
| `--ref <path\|url>` (repeatable) | `reference_image_urls` / `image_urls` / … | multi-reference models |

The typed flags map to the model's actual param name from its schema (Kling i2v → `start_image_url`,
most others → `image_url`). For raw `key=value` params you must use the exact schema name — check
`ai-gen info <id>`.

## The 3 MB local-file limit

Local files ≤ 3 MB are inlined automatically as data URIs. **Larger files need a public URL** — a
local file over the cap fails with exit 2. To use a big image/video/audio: host it (or shrink it
with ffmpeg/imagemagick) and pass the URL. The cap is `AI_GEN_DATA_URI_MAX_BYTES`.

## Referencing inputs in the prompt: `@Image1`, `@Video1`, …

Multi-reference models (face-swap, reference-to-video, multi-subject composition) address each input
by position in the **prompt text**: the first `--ref` is `@Image1`, the second `@Image2`, etc.
(`@Video1`, `@Audio1` for those kinds). The model's reference **cap** comes from its schema —
`ai-gen info <id>` shows how many it accepts.

```bash
ai-gen video "@Image1 walks toward @Image2 in a cozy room" \
  -m bytedance/seedance-2.0/reference-to-video --ref a.png --ref b.png --duration 5
```

## Upload once, reuse the URL

In a multi-step pipeline, capture a generated artifact's `hosted_urls[0]` and feed it into the next
step as a URL — don't re-download and re-inline it. This avoids redundant transfers and keeps you
under the inline cap.

```bash
STILL=$(ai-gen image "a toy robot on a desk" --format json | jq -r '.hosted_urls[0]')
ai-gen video "the robot waves" -m fal-ai/veo3.1/fast/image-to-video --image "$STILL" --duration 5
```

Remember fal hosted URLs **expire** — for anything you need to keep, download it (`files[].local_path`
from a sync/`--wait` run) rather than relying on the URL later.
