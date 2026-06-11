---
name: bot-012-news-presenter
description: Make a news video end-to-end from a single request. Take a news announcement (pasted text OR a URL), structure it into a faithful NewsDoc, then render a styled MP4 (Headline Highlight, Breaking News, Kinetic Typography, or Minimal Editorial) at any aspect ratio (16:9, 9:16, 1:1). This is the ONE do-everything entry point for the news-presenter bot — use it whenever someone wants a news video and does not want to think about steps. It orchestrates the granular skills (bot-012-news-structure then bot-012-news-video) and never fabricates facts.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [bot-012-news-structure, bot-012-news-video]
  inputs:
    - name: announcement-text
      type: text
      required: false
      description: Pasted headline and/or body of the announcement. One of text/url is required.
    - name: source-url
      type: text
      required: false
      description: A URL to the announcement; fetched + extracted. One of text/url is required.
    - name: style
      type: text
      required: false
      description: headline-highlight | breaking-news | kinetic-typography | minimal-editorial. Default = the NewsDoc's recommended style, else minimal-editorial.
    - name: aspect-ratios
      type: text
      required: false
      description: Any of 16:9, 9:16, 1:1 (space/comma separated). Default = onboarding default, else 9:16.
    - name: duration-seconds
      type: text
      required: false
      description: Seconds (8-15) as a number. Default 12.
    - name: brand
      type: json
      required: false
      description: Brand accent color (hex) plus optional accentAlt and a short label. Default from context.md, else neutral.
  outputs:
    - name: newsdoc
      type: json
      path: artifacts/<project-name>/newsdoc.json
      description: The structured, provenance-tracked NewsDoc (the render contract).
    - name: storyboard
      type: markdown
      path: artifacts/<project-name>/02-storyboard.md
      description: Scenes + frame ranges + on-screen text + style/AR/defaults used.
    - name: videos
      type: video
      path: artifacts/<project-name>/exports/<style>-<ar>.mp4
      description: One rendered MP4 per requested aspect ratio.
---

# News Presenter — one skill, news in → video out

The **single do-everything path**: from a raw announcement (pasted text or a URL) to a faithful, styled news **video**, in one go. You orchestrate the two granular skills — you do **not** re-implement them. They install alongside this one, so you run **their** bundled scripts directly:

- `bot-012-news-structure` → ingest + structure (`~/.claude/skills/bot-012-news-structure/`)
- `bot-012-news-video` → render the styled MP4 (`~/.claude/skills/bot-012-news-video/`)

> Read the two skills' `SKILL.md` for the authoritative detail of each step; this skill is the recipe that runs them back-to-back and hands back one finished video. Fidelity is the law: **never fabricate** a fact, number, quote, date, or source — every on-screen value traces to the input or is omitted.

## When to use
The default entry point whenever someone says "make a news video of this", pastes a press release/announcement, or gives a news/blog link. (The granular skills remain available when a user wants *only* the structured story, or wants to **restyle** an existing project without re-ingesting.)

## Workflow

### 1. Set up the project
Pick a kebab-case project name; create `artifacts/<project-name>/`. Save the raw input verbatim under `inputs/`.

### 2. Structure (per `bot-012-news-structure`)
Produce the **NewsDoc** exactly as that skill specifies:
- Pasted text → structure it directly. URL → fetch + extract:
  ```bash
  SD=~/.claude/skills/bot-012-news-structure
  curl -sL --max-time 20 -A "Mozilla/5.0 (compatible; SL8-NewsPresenter/1.0)" -o work/article.html "$URL"
  npm i --no-audit --no-fund @mozilla/readability jsdom 2>/dev/null || true
  node "$SD/scripts/extract.mjs" work/article.html "$URL" > work/extract.json
  ```
- Fill the NewsDoc per `$SD/references/newsdoc-schema.md` + `guardrails.md` (faithful, provenance-tracked; missing → null; `key_phrases` verbatim). Write `01-newsdoc.md` + `newsdoc.json`, then validate:
  ```bash
  node "$SD/scripts/validate-newsdoc.mjs" artifacts/<project-name>/newsdoc.json   # must exit 0
  ```
- If the input is too thin to present (no usable headline), **stop and request pasted text** — do not fabricate.

### 3. Render (per `bot-012-news-video`)
Render the MP4(s) exactly as that skill specifies:
- Choose `style` (explicit → NewsDoc `recommended_style` → `minimal-editorial`) and `aspect_ratios` (→ onboarding default → `9:16`). Write `02-storyboard.md` (the scene plan) first.
  ```bash
  VD=~/.claude/skills/bot-012-news-video
  mkdir -p artifacts/<project-name>/exports
  rm -rf artifacts/<project-name>/video && cp -r "$VD/scripts/remotion-template" artifacts/<project-name>/video
  # write artifacts/<project-name>/video/props.json = { style, durationSeconds, seed:1, brand, doc:<newsdoc.json> }
  cd artifacts/<project-name>/video && bash "$VD/scripts/render.sh" "<ARs e.g. 1x1>" ../exports
  ```
  `render.sh` installs Remotion, uses the template's pre-installed Chrome shell on `sl8-animation`, and writes `exports/<style>-<ar>.mp4`. See `$VD/references/rendering.md` for troubleshooting.

### 4. Verify (vision) + summarize
**Read** a rendered MP4 (or a sampled frame) and judge the pixels: faithful to the NewsDoc, legible, recognizably the chosen style. Never judge from filename/size. Append a short summary to `02-storyboard.md`; remember.

## Restyle / resize
A follow-up ("now the breaking-news version", "a 1:1 cut") re-runs **only** step 3 on the existing `newsdoc.json` (unchanged facts) → new `exports/<new-style>-<ar>.mp4` beside the old. Never alter NewsDoc facts on a restyle.

## Outputs
- `artifacts/<project-name>/newsdoc.json` (+ `01-newsdoc.md`) — the structured story.
- `artifacts/<project-name>/02-storyboard.md` — the scene plan + summary.
- `artifacts/<project-name>/exports/<style>-<ar>.mp4` — the finished video(s).

## Quality criteria
- [ ] `newsdoc.json` validates; every fact traces to the input (no fabrication).
- [ ] One non-empty MP4 per requested AR, correct dimensions, recognizably the chosen style (vision check).
- [ ] Everything for one announcement lives in one resumable `artifacts/<project>/` folder.
