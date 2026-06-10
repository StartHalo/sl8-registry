---
name: bot-012-news-structure
description: Turn a news announcement (pasted text OR a URL) into a faithful, structured NewsDoc for video. Use this FIRST whenever the user gives a press release, announcement, headline + body, or a news/blog link and wants it presented as a video. Extracts the headline, dek, key facts, a quote, a stat, the dateline and source, picks 1-3 highlight phrases, and recommends a style — writing 01-newsdoc.md (human) and newsdoc.json (the render contract). It NEVER fabricates facts — every field traces to the input or is null.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: []
  inputs:
    - name: announcement-text
      type: text
      required: false
      description: Pasted headline and/or body of the announcement. One of text/url is required.
    - name: source-url
      type: text
      required: false
      description: A URL to the announcement; fetched + readability-extracted. One of text/url is required.
    - name: highlight-hints
      type: text
      required: false
      description: Optional phrases the user wants emphasized; otherwise the skill picks 1-3.
  outputs:
    - name: newsdoc-human
      type: markdown
      path: artifacts/<project-name>/01-newsdoc.md
      description: Human-readable structured story for the user to review before rendering.
    - name: newsdoc-machine
      type: json
      path: artifacts/<project-name>/newsdoc.json
      description: The NewsDoc — the read-only contract consumed by bot-012-news-video.
    - name: raw-input
      type: text
      path: artifacts/<project-name>/inputs/source.txt
      description: The verbatim pasted text or fetched extract + URL, saved unchanged.
---

# News Structure — announcement → NewsDoc

Turn ANY news announcement into a **faithful, structured NewsDoc** that the video skill renders. Your one job is fidelity: a field is either present in the input (verbatim or a meaning-preserving compression) or it is `null`. **You never invent a fact.**

> Deep references (read as needed): `references/news-anatomy.md` (inverted pyramid, hed/dek/lede), `references/newsdoc-schema.md` (the exact schema + field rules), `references/guardrails.md` (the fidelity rules), `references/style-selection.md` (which style to recommend). Canonical research: `research/domain-analysis.md`.

## When to use
First phase of any News Presenter project: the user pastes an announcement or gives a URL and wants a video. Run this BEFORE `bot-012-news-video`. If a valid `newsdoc.json` already exists for this project and the user only wants a different look, skip to the video skill (a restyle must NOT re-extract).

## Inputs
One of `announcement_text` (pasted) or `source_url` (a link) is required. If both, **text is authoritative**, the URL is recorded as source. Optional `highlight_hints`.

## Workflow

### 1. Get the text (faithfully)
- **Pasted text** → use it directly. Split the first line / an explicit `Headline:` as the headline; the rest is the body. Zero fabrication risk.
- **URL** → fetch then extract the main content (drop nav/ads/cookie banners):
  ```bash
  mkdir -p work
  curl -sL --max-time 20 -A "Mozilla/5.0 (compatible; SL8-NewsPresenter/1.0)" -o work/article.html "$URL"
  # extractor degrades gracefully if readability libs are missing:
  npm i --no-audit --no-fund @mozilla/readability jsdom 2>/dev/null || true
  node "$SKILL_DIR/scripts/extract.mjs" work/article.html "$URL" > work/extract.json
  ```
  Read `work/extract.json`. If `ok:false` OR `textLength < 600` OR no `headline`: treat as **thin** — build a headline-only NewsDoc from what you got (title/og:description) and set `meta.extraction_confidence` to `thin`/`headline_only`. If even the headline is missing, **stop and write a clean request** (see Failure handling) — do NOT pad with world knowledge.
- Always save the raw input verbatim to `artifacts/<project-name>/inputs/source.txt` (pasted text, or the URL + the extracted text).

### 2. Identify the news anatomy
Find what the input actually contains: headline, dek/standfirst, the lede (the 5W1H — Who/What/When/Where/Why/How), key facts, a quote, a hero stat, the dateline (place + date), and the source/attribution. See `references/news-anatomy.md`. Never assume a missing part.

### 3. Fill the NewsDoc (the structured story)
Build the object per `references/newsdoc-schema.md`. Rules that make it fabrication-safe:
- **`body_beats` are ordered by importance** (inverted pyramid): index 0 = the lede/core claim. 2–6 short beats, one on-screen line each. Trimming for time drops the LAST beats, never the lede.
- **Compression yes, alteration no.** "raised $40 million in a Series B round" → "$40M Series B" is fine. Changing $40M → "~$40M+" or "$40 million+" is **fabrication** — never.
- **Quotes and the hero stat are verbatim.** Copy `quote.text` and `primary_stat.value` exactly as the input wrote them.
- **`key_phrases`** (1–3) must each be a **verbatim substring** of the headline or a beat — a highlight can only emphasize text that's on screen. Use `highlight_hints` if given, else pick the most salient (a figure, the action, the named entity).
- **Missing → `null`.** No dek? `dek: null`. No date? `dateline.date: null` (NEVER default to "today"). No source? `source.name: null` (the video then carries no credit — that's correct).
- Pick `recommended_style` (`references/style-selection.md`): quotable line → headline-highlight; urgent/official/time-stamped → breaking-news; a number carries it / short-form social → kinetic-typography; else → minimal-editorial.

### 4. Validate
```bash
node "$SKILL_DIR/scripts/validate-newsdoc.mjs" artifacts/<project-name>/newsdoc.json
```
Must exit 0. Fix any `FAIL` (most common: a `key_phrase` that isn't a verbatim substring). `WARN`s are advisory.

### 5. Write the human story
Write `artifacts/<project-name>/01-newsdoc.md`: the headline, dek, the body beats, the dateline + source credit, the highlight phrases, and a one-line "Recommended style: X — because …". This is what the user reviews before any video renders.

## Outputs
Write exactly these (paths use the active project slug for `<project-name>`):
- `artifacts/<project-name>/01-newsdoc.md` — human-readable structured story.
- `artifacts/<project-name>/newsdoc.json` — the NewsDoc (render contract; read-only downstream).
- `artifacts/<project-name>/inputs/source.txt` — the verbatim input (pasted text or URL + extract).

## Failure handling (headless — never prompt mid-run)
- **No usable input** (no text, URL unfetchable/headline-less) → write `01-newsdoc.md` with what you have (often nothing) and set `state.md next_action` to: *"Paste the announcement headline and body and I'll structure it."* Do not invent a story.
- **Thin extraction** → headline-only NewsDoc, flagged `extraction_confidence: thin`; keep to the verified headline + source.
- **Ambiguous headline** → derive a neutral one from the lede and note the assumption in `01-newsdoc.md`.

## Quality criteria
- [ ] `newsdoc.json` validates (validator exits 0).
- [ ] Every number / quote / name / date / source in the NewsDoc appears in the input (no fabrication).
- [ ] `key_phrases` are verbatim substrings of on-screen text.
- [ ] `01-newsdoc.md` has headline, ≥3 beats (when the input supports them), source credit, ≥1 highlight phrase, and a recommended style with a reason.
- [ ] Raw input saved verbatim under `inputs/`.
