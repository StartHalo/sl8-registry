# Facts this skill relies on, dated

One row per fact, in the media facts shape (HR22). The image rows are owned by
`media-image-generation/references/facts.md` on this machine and repeated here only so the cover
steps can be checked in one place; the Seedance rows come from the Video Studio's facts file
(sl8-pipeline `studio/video-studio/skills/media-video-generation/references/facts.md`), which is not
on this machine.
Schema and price rows: re-check at first use in a session with the free command in the last column.

| id | endpoint | fact | kind | as of | source | re-check |
|---|---|---|---|---|---|---|
| sd20-end-frame | `bytedance/seedance-2.0/image-to-video` (all tiers, mini included) | `end_image_url` optional; `image_url` and `prompt` required. `ai-gen video --last-frame` maps to `end_image_url` | schema | 2026-10-06 | Video facts schema-seedance20-end-frame; media-ai-gen commands.md (Inputs) | raw OpenAPI check (media-ai-gen commands.md) and `ai-gen info bytedance/seedance-2.0/mini/image-to-video --format json` |
| sd20-resolution | Seedance 2.0 base vs `/mini/` | base `480p` `720p` `1080p` `4k`; mini `480p` `720p` only; default `720p` | schema | 2026-10-06 | Video facts schema-seedance20-resolution | raw OpenAPI check |
| sd20-duration | Seedance 2.0, all | `duration` string enum `"auto"`, `"4"`-`"15"`, default `"auto"`: always send a fixed string (`"5"`) | schema | 2026-10-06 | Video facts schema-seedance20-duration | raw OpenAPI check |
| sd20-aspect | Seedance 2.0, all | `aspect_ratio` `auto` (default), `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16` | schema | 2026-10-06 | Video facts schema-seedance20-aspect | raw OpenAPI check |
| sd-audio-default | Seedance 2.0 | `generate_audio` defaults to `true`: pin `false` | schema | 2026-10-06 | Video facts schema-seedance-audio-default | raw OpenAPI check |
| sd-no-negative | Seedance 2.0 | no `negative_prompt` and no moderation or safety field | schema | 2026-10-06 | Video facts schema-seedance-no-negative | raw OpenAPI check |
| sd20-price | `bytedance/seedance-2.0/image-to-video` | about 170.5 cr per second at 1080p (5 s about 853 cr); 75.9 cr/s at 720p; proxy estimate 378 cr for 5 s at 720p, audio off | price | 2026-10-05 | Video facts price-seedance20-base, price-seedance20-proxy | `ai-gen estimate bytedance/seedance-2.0/image-to-video --params-file p.json --format json` |
| sd20-mini-price | `bytedance/seedance-2.0/mini/image-to-video` | 18 cr/s at 480p (5 s about 90 cr), 38.7 cr/s at 720p (5 s about 194 cr) | price | 2026-10-06 | Video facts price-seedance20-mini | as above |
| sd-length | Seedance 2.0 | a 5 s request came back 4.06 s, twice: measure with ffprobe, never assume | behaviour | 2026-09-23 | Video facts beh-seedance-length | paid only |
| sd-credits-report | Seedance 2.0 i2v | `credits_used` over-reported about 8.4× once (908 reported, 108 billed); the estimate matched the bill | behaviour | 2026-07-22 | media-ai-gen commands.md proxy fact 4 | paid only |
| sd-photoreal | Seedance | photoreal human references get refused (measured on 2.5) | behaviour | 2026-07 | Video facts beh-seedance-photoreal | paid only |
| nbp-edit | `fal-ai/nano-banana-pro/edit` | `image_urls` required, no `maxItems`; 37.5 cr per image at 1K or 2K | schema, price | 2026-10-05 | Image facts schema-nbp-edit-refs, price-nbp | raw OpenAPI check; `ai-gen estimate` |
| gpt2-edit | `openai/gpt-image-2/edit` | `prompt`, `image_urls` (maxItems 16) required; also bills the input image tokens | schema, price | 2026-10-05 | Image facts schema-gpt2-edit-fields, price-gpt2-edit | raw OpenAPI check; `ai-gen estimate` |
| schnell | `fal-ai/flux/schnell` | the cheapest image route; SL8 measured a 2 cr floor per call; `ai-gen image` defaults to it | price, cli | 2026-10-05 | Image facts price-schnell, cli-default-model | `ai-gen estimate fal-ai/flux/schnell image_size=square_hd --format json` |
| rate | all | about 250 credits = US$1; quote in credits only | price | 2026-10-05 | Image facts rate-cr-per-usd | — |
| async-shape | ai-gen 2.2.0 `--async` | prints only `{request_id, model}`; writes no ledger line until `ai-gen result` | cli | 2026-10 | media-ai-gen commands.md (Output; Known defects) | `ai-gen run --help` |
| status-wait | ai-gen 2.2.0 `status --wait` | records the job in the ledger with no credits: poll with `ai-gen result <id>` instead | cli | 2026-10 | media-ai-gen commands.md (Known defects) | — |
| no-cancel | ai-gen 2.2.0 `cancel` | always exits 12: an abandoned job runs to the end and is billed | cli | 2026-10 | media-ai-gen commands.md (Queue lifecycle) | — |
