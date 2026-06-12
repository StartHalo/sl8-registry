---
name: bot-014-kinetic-text
description: Make a Kinetic Text video end-to-end from a single request. Take any short message (pasted text OR a URL) — an announcement, product update, quote, stat, or headline — structure it into a faithful MessageDoc, then render a styled animated-text MP4 in one of nine styles (Kinetic Typography, Box Reveal, Giant Word, Perspective 3D, Pixel Reveal, Blur Carousel, Breaking News, Headline Highlight, Minimal Editorial) with a background score, at any aspect ratio (16:9, 9:16, 1:1). This is the ONE do-everything entry point for the Kinetic Text bot — use it whenever someone wants an animated-text video and does not want to think about steps. It orchestrates the granular skills (bot-014-script-builder then bot-014-text-animator) and never fabricates facts.
metadata:
  author: sl8
  version: 1.0.1
  references-skills: [bot-014-script-builder, bot-014-text-animator]
  inputs:
    - name: message-text
      type: text
      required: false
      description: Pasted message — a headline and/or body (announcement, update, quote, stat). One of text/url is required.
    - name: source-url
      type: text
      required: false
      description: A URL to the message/article; fetched + extracted. One of text/url is required.
    - name: style
      type: text
      required: false
      description: One of the 9 style ids (kinetic-typography, box-reveal, giant-word, perspective-3d, pixel-reveal, blur-carousel, breaking-news, headline-highlight, minimal-editorial). Default = the doc's recommended style, else minimal-editorial.
    - name: aspect-ratios
      type: text
      required: false
      description: Any of 16:9, 9:16, 1:1 (space/comma separated). Default = onboarding default, else 9:16.
    - name: duration-seconds
      type: text
      required: false
      description: Seconds (8-15) as a number. Default 12.
    - name: mood
      type: text
      required: false
      description: calm | dramatic | upbeat | tech — the background score. Default = derived from style + tone.
    - name: music
      type: text
      required: false
      description: on or off — whether to include the background score. Default on.
    - name: font-pack
      type: text
      required: false
      description: modern | editorial | bold | tech — the typography pairing. Default = brand font pack from context.md, else modern.
    - name: brand
      type: json
      required: false
      description: Brand kit — accent color (hex), optional accentAlt + label, and fontPack. Default from context.md, else a neutral accent + the modern font pack.
  outputs:
    - name: messagedoc
      type: json
      path: artifacts/<project-name>/newsdoc.json
      description: The structured, provenance-tracked MessageDoc (the render contract).
    - name: storyboard
      type: markdown
      path: artifacts/<project-name>/02-storyboard.md
      description: Scenes + frame ranges + on-screen text + style/AR/mood/defaults used.
    - name: videos
      type: video
      path: artifacts/<project-name>/exports/<style>-<ar>.mp4
      description: One rendered MP4 (with a background score) per requested aspect ratio.
---

# Kinetic Text — one skill, message in → animated video out

The **single do-everything path**: from a raw message (pasted text or a URL) to a faithful, styled animated-text **video** with a background score, in one go. You orchestrate the two granular skills — you do **not** re-implement them. They install alongside this one, so you run **their** bundled scripts directly:

- `bot-014-script-builder` → ingest + structure (`~/.claude/skills/bot-014-script-builder/`)
- `bot-014-text-animator` → render the styled MP4 (`~/.claude/skills/bot-014-text-animator/`)

> Read the two skills' `SKILL.md` for the authoritative detail of each step; this skill is the recipe that runs them back-to-back and hands back one finished video. Fidelity is the law: **never fabricate** a fact, number, quote, date, or source — every on-screen value traces to the input or is omitted.

## When to use
The default entry point whenever someone says "make a video of this", pastes an announcement / update / quote / stat, or gives a link. (The granular skills remain available when a user wants *only* the structured message, or wants to **restyle / re-score** an existing project without re-ingesting.)

## Workflow

### 1. Set up the project
Pick a kebab-case project name; create `artifacts/<project-name>/`. Save the raw input verbatim under `inputs/`.

### 2. Structure (per `bot-014-script-builder`)
Produce the **MessageDoc** exactly as that skill specifies:
- Pasted text → structure it directly. URL → fetch + extract:
  ```bash
  SB=~/.claude/skills/bot-014-script-builder
  curl -sL --max-time 20 -A "Mozilla/5.0 (compatible; SL8-KineticText/1.0)" -o work/article.html "$URL"
  npm i --no-audit --no-fund @mozilla/readability jsdom 2>/dev/null || true
  node "$SB/scripts/extract.mjs" work/article.html "$URL" > work/extract.json
  ```
- Fill the MessageDoc per `$SB/references/newsdoc-schema.md` + `guardrails.md` (faithful, provenance-tracked; missing → null; `key_phrases` verbatim) and recommend a `style` + `mood` per `$SB/references/style-selection.md`. Write `01-newsdoc.md` + `newsdoc.json`, then validate:
  ```bash
  node "$SB/scripts/validate-newsdoc.mjs" artifacts/<project-name>/newsdoc.json   # must exit 0
  ```
- If the input is too thin to present (no usable headline), **stop and request pasted text** — do not fabricate.

### 3. Render (per `bot-014-text-animator`)
Render the MP4(s) exactly as that skill specifies:
- Resolve EVERY render parameter (see `$VD` SKILL.md **Parameters & defaults**): `style` (explicit → `recommended_style` → `minimal-editorial`), `aspect_ratios` (→ onboarding default → `9:16`), `durationSeconds` (→ 12), the **brand kit** (`accent`, `accentAlt`, `label`, `fontPack`) from `context.md` else defaults (neutral accent + `modern` pack), `mood` (explicit → `recommended_mood` → derived), `music` (on unless silent). Write `02-storyboard.md` (the scene plan + the resolved parameters) first.
  ```bash
  VD=~/.claude/skills/bot-014-text-animator
  mkdir -p artifacts/<project-name>/exports
  rm -rf artifacts/<project-name>/video && cp -r "$VD/scripts/remotion-template" artifacts/<project-name>/video
  # write artifacts/<project-name>/video/props.json = { style, durationSeconds, seed:1, music, mood, fontPack, brand:{accent,accentAlt,label}, doc:<newsdoc.json> }
  cd artifacts/<project-name>/video && bash "$VD/scripts/render.sh" "<ARs e.g. 1x1>" ../exports
  ```
  `render.sh` installs Remotion, generates the score beds (`make-scores.mjs`), uses the template's pre-installed Chrome shell on `sl8-animation`, and writes `exports/<style>-<ar>.mp4` with the score muxed in. See `$VD/references/rendering.md` for troubleshooting.

### 4. Verify (vision + audio) + report the parameters
**Read** a rendered MP4 (or a sampled frame) and judge the pixels: faithful to the MessageDoc, legible, recognizably the chosen style + the chosen font pack, and that it **progresses through the message** (not a held headline). Confirm an audio stream is present (`ffprobe -select_streams a:0`) unless `music:false`. Never judge from filename/size. Then **tell the user the resolved parameters** — style, aspect ratio(s), duration, brand color (accent), font pack, mood, music — flagging which were their choices vs defaults, so it's obvious what to tweak. Append the summary to `02-storyboard.md`; remember.

## Restyle / resize / re-score
A follow-up ("now the giant-word version", "a 1:1 cut", "make it calmer") re-runs **only** step 3 on the existing `newsdoc.json` (unchanged facts) → new `exports/<new-style>-<ar>.mp4` beside the old. Never alter MessageDoc facts on a restyle.

## Outputs
- `artifacts/<project-name>/newsdoc.json` (+ `01-newsdoc.md`) — the structured message.
- `artifacts/<project-name>/02-storyboard.md` — the scene plan + summary.
- `artifacts/<project-name>/exports/<style>-<ar>.mp4` — the finished video(s) with a score.

## Quality criteria
- [ ] `newsdoc.json` validates; every fact traces to the input (no fabrication).
- [ ] One non-empty MP4 per requested AR, correct dimensions, with an audio stream, recognizably the chosen style (vision check).
- [ ] The video progresses through the whole message (headline → beats → stat → quote → credit).
- [ ] Everything for one message lives in one resumable `artifacts/<project>/` folder.
