---
name: hyperframes
description: "Produce MP4 video from HTML/CSS compositions with the HyperFrames CLI in the sl8-animation sandbox. Use when a user asks to build a programmatic web/HTML video, motion graphics, an animated intro/explainer, or render an HTML composition to MP4. Triggers: hyperframes, HTML to video, render a web composition, code-driven video, animated intro from HTML."
metadata:
  author: StartHalo
  category: video
  tags: hyperframes, video, html, css, animation, render, mp4
---

# HyperFrames

## Overview

HyperFrames turns an HTML/CSS composition (with time-based animation tracks) into a deterministic
MP4: it seeks each frame in headless Chrome and encodes with ffmpeg. In the `sl8-animation`
sandbox the `hyperframes` CLI is installed globally, ffmpeg is present, and a Chrome build is
pre-staged, so renders run without any extra setup. The runtime is Node 22.

## Workflow

1. **Scaffold a project.** `hyperframes init <dir> --example blank --non-interactive`
   (use `--example <name>` for a starter; `blank` for an empty composition). This creates
   `index.html` plus project metadata.
2. **Author the composition.** Edit `<dir>/index.html` — lay out the scene with HTML/CSS and add
   animation tracks/timing. Keep the composition seekable (frame-addressable) so the render is
   deterministic. Iterate on dimensions, duration, and motion here.
3. **Render to MP4.** From the project directory:
   `hyperframes render . --output /home/user/artifacts/<name>.mp4 --non-interactive`
   Always pass `--non-interactive` in an agent/automated run so it never waits on a prompt. Write
   output under `/home/user/artifacts/` so it lands in the mounted artifacts directory.
4. **Verify.** Confirm the file exists and is non-empty, and check it with
   `ffprobe -v error -show_entries stream=codec_type,codec_name,width,height -of default=noprint_wrappers=1 <file>`
   — expect a `video` stream (h264). Report the path, dimensions, and duration.

## Notes for this sandbox

- **Render to `/home/user/artifacts/`** so outputs are collected.
- A Chrome build is **pre-installed** in the default Puppeteer cache, so the first render does not
  download a browser. If a render reports a missing browser, run
  `npx @puppeteer/browsers install chrome --path /home/user/.cache/puppeteer`.
- ffmpeg is already available (used for encoding). The sandbox is Node 22.
- For long/complex compositions, raise the player-ready timeout
  (`--player-ready-timeout <ms>`); on constrained memory the CLI auto-uses a low-memory profile.

## When NOT to use this

- For React-component video, use **Remotion** (the `remotion-best-practices` skill), not HyperFrames.
- For math/diagram animation, use **Manim** (`manim-ce` / `manim-gl`).

## Reference

Upstream docs: https://hyperframes.heygen.com — consult for the composition HTML schema, animation
adapters, and CLI flags. The CLI's own `--help` (`hyperframes`, `hyperframes init --help`,
`hyperframes render --help`) is authoritative for the installed version.
