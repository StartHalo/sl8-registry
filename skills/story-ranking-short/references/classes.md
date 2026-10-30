# Ranking short: one-glance sheet

| | |
|---|---|
| Deliverable | one 9:16 720x1280 MP4, about 23.5 s, 6 items (5 for a top 5; 3 to 9 allowed), #N first, #1 last |
| On screen | title top-centre, numbered list top-left filling bottom-up, one line per item |
| Text route | overlay (default, HR10); painted into the stills only on an explicit brief |
| Stills | Default: fal-ai/nano-banana-pro, 9:16, 2K; fallback openai/gpt-image-2; edits (painted) fal-ai/nano-banana-pro/edit, fallback openai/gpt-image-2/edit |
| Clips | Default: bytedance/seedance-2.0/image-to-video, 720p, 9:16, duration "4".."15", generate_audio true; draft bytedance/seedance-2.0/fast/image-to-video |
| Sound | inside each clip: pop at start, filmer reaction, bass hit on impact, frame-0 drop on clip 1 |
| Approvals | script (with the quote), master still, all stills; gate files in a bot job |
| Retries | one per still and per clip, moving a named lever; then the fallback route or a gate (HR7) |
| Never | voiceover, captions, music bed, intro or end card, recap, call to action, fades, real people |
| Files | `artifacts/<p>/script/`, `keyframes/`, `clips/`, `final/ranking.mp4`, `qc/`, manifest, PROGRESS.md |

A kit or brief may name another model, count, length or look; these are defaults.
