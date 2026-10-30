# Facts this skill relies on, dated

Each row is carried from the skill that owns it (HR22), with its date and source; re-check schema
rows with the raw OpenAPI printer in media-ai-gen's `references/commands.md` and price rows with
`ai-gen estimate` at first use in a session. A row the live check contradicts loses: use the live
answer and record a learning. The video and audio rows are owned by Video Studio skills that are not
on this machine; their sources are sl8-pipeline's `studio/video-studio/skills/media-video-generation/references/facts.md`
and `studio/video-studio/skills/media-audio-generation/references/facts.md`, and the image rows'
source is `studio/image-studio/skills/media-image-generation/references/facts.md`.

| id | endpoint | fact | as_of | source |
|---|---|---|---|---|
| schema-gpt2-size | `openai/gpt-image-2` | no `aspect_ratio` field: `image_size` is a preset, `auto` or `{width, height}` in multiples of 16, 655,360 to 8,294,400 px, sides at most 3:1. An `aspect_ratio` sent here is dropped silently (HR3) | 2026-10-05 | image facts |
| schema-gpt2-quality | `openai/gpt-image-2` · `/edit` | `quality` `auto`/`low`/`medium`/`high`, default `high`; `num_images` 1 to 4; no `seed` | 2026-10-05 | same |
| schema-gpt2-edit-fields | `openai/gpt-image-2/edit` | `image_urls` required (max 16): pass files with `--ref`, never `--image` | 2026-10-05 | same |
| price-gpt2-quality | `openai/gpt-image-2` | high at 1024²: 52.75 cr; a 2K custom size costs about 2 to 4 times that | 2026-10-05 | same (list price) |
| schema-nbp | `fal-ai/nano-banana-pro` · `/edit` | `aspect_ratio` (11 values), `resolution` `1K`/`2K`/`4K`; `/edit` requires `image_urls` (use `--ref`) | 2026-10-05 | same |
| price-nbp | `fal-ai/nano-banana-pro` · `/edit` | 37.5 cr per image at 1K or 2K | 2026-10-05 | same |
| schema-bria-remove | `fal-ai/bria/background/remove` | `image_url` required (use `--image`); one image per job, no batch; the returned PNG's alpha channel is the mask | 2026-10-20 | same; fal photo-editing #7, #8 |
| price-bria-remove | `fal-ai/bria/background/remove` | 4.5 or 10 cr (billing and prose disagree) | 2026-10-05 | same |
| schema-seedance20-duration | Seedance 2.0, every route | `duration` is a string enum `"auto"`, `"4"` to `"15"`; `"15s"` and `"2"` are not in it | 2026-10-06 | video facts; fal video-generation #26 |
| schema-seedance20-aspect | Seedance 2.0 | `aspect_ratio` `auto`, `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16` | 2026-10-06 | same |
| schema-seedance20-resolution | Seedance 2.0 base vs `/fast/` | base `480p`/`720p`/`1080p`/`4k`; `/fast/` and `/mini/` stop at `720p` | 2026-10-06 | same; fal video-generation #17 |
| schema-seedance-audio-default | Seedance 2.0 | `generate_audio` defaults to `true` on every route: pin it `false` | 2026-10-06 | same; fal video-production #8 |
| schema-seedance-no-negative | Seedance 2.0 | no `negative_prompt` and no safety field: phrase every avoidance positively | 2026-10-06 | same |
| schema-seedance20-r2v | `bytedance/seedance-2.0/reference-to-video` | `image_urls` up to 9 (`--ref`), only `prompt` required | 2026-10-06 | same |
| schema-seedance20-end-frame | `bytedance/seedance-2.0/image-to-video` | `image_url` and `prompt` required, `end_image_url` optional (`--image`, `--last-frame` on `ai-gen video`) | 2026-10-06 | same; fal video-generation #27 |
| price-seedance20-base | Seedance 2.0 base | token-billed: 720p about 75.9 cr/s, 1080p about 170.5 cr/s, 4k about 389 cr/s (list); a 15 s film at 1080p is about 2,560 cr | 2026-10-05 | same; fal video-generation #11 (never inherit a rate: quote it) |
| beh-seedance-length | Seedance 2.0 | a 5 s request returned 4.06 s, twice: measure the delivered length | 2026-09-23 | same |
| schema-flux3-flf | `blackforestlabs/flux-3/first-last-frame-to-video` | `start_image_url` and `end_image_url` both required; `duration` integer 5 to 20; `generate_audio` true by default | 2026-10-06 | same |
| schema-sfx-v2 | `fal-ai/elevenlabs/sound-effects/v2` | `text` up to 450 chars; `duration_seconds` 0.5 to 22 | 2026-10-05 | audio facts |
| price-music | `fal-ai/elevenlabs/music` | 150 cr per started minute: a 20 s bed bills a full minute | 2026-10-05 | same |
| machine-imagemagick | web-studio machine | ImageMagick 6 (`convert`, `identify`, `montage`, `mogrify`); there is no `magick` command | 2026-10-28 | E2-narrow web-studio machine.json layer 2 |
| machine-fonts | web-studio machine | font files: DejaVu Sans and Serif, Comic Neue, Inter, Outfit, Fraunces, Anton, Space Grotesk; Montserrat, TikTok Sans, Caveat, Patrick Hand, Permanent Marker, Metropolis; Noto | 2026-10-28 | same (fonts, display-fonts, fonts-noto packs) |
