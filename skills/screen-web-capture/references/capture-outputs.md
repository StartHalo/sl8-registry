# Capture outputs

## Contents
- [Route A: the project capture folder](#route-a-the-project-capture-folder)
- [Route B: stills and their JSON lines](#route-b-stills-and-their-json-lines)
- [The section map](#the-section-map)
- [capture-status.json](#capture-statusjson)
- [For the caller: using the files](#for-the-caller-using-the-files)

## Route A: the project capture folder

`hyperframes capture <url> -o <dir>/capture --json` (CLI 0.8.61) writes, inside `capture/`:

| Path | What it holds |
|---|---|
| `screenshots/scroll-000.png …` | viewport frames down the page at 1920x1080, each overlapping the last by about 30%; `scroll-000` is the hero |
| `screenshots/full-page.png` | the whole document at 1x, when it fits in one piece (absent on very tall pages) |
| `assets/` | downloaded images, `svgs/`, `fonts/` (the site's woff2 files), `lottie/` and `videos/` with `previews/` |
| `extracted/tokens.json` | colours, font families and weights, section, heading and CTA counts |
| `extracted/visible-text.txt` | the page text, one line per element, prefixed `[h1]`, `[p]`, `[a]` … |
| `extracted/asset-descriptions.md` | one line per downloaded asset (from page context; no vision model on this machine) |
| `extracted/animations.json`, `assets-catalog.json`, `detected-libraries.json` | scroll and CSS animations, remote URLs of assets not downloaded, libraries seen |
| `extracted/lottie-manifest.json`, `video-manifest.json`, `shaders.json` | only when the site has them |
| `AGENTS.md` | the CLI's own notes on the capture |
| `BLOCKED.md` | written instead of success when the site blocked the capture: the folder is unusable |

The run's stdout (`capture-run.json`) holds the JSON result with `ok`, `warnings` and `lastPhase`;
the CLI also prints `HYPERFRAMES_CAPTURE_PHASE` records, which name the last phase reached when a
run stalls. `capture_gate.py project` decodes the text at every `{` and takes the last object with an `ok` key, so a pretty-printed or a single-line result among phase records both work. Builds reference the
captured files by relative path (`../capture/assets/…`, fonts by `@font-face` on
`../capture/assets/fonts/…`), never by pasting their contents.

## Route B: stills and their JSON lines

`capture_site.mjs` prints one JSON object per line; the skill appends both runs to `stills.jsonl`.

```json
{"kind":"full","path":"output/site_full.png","exists":true,"status":200,"full_height":21400,"truncated":false}
{"kind":"section","label":"Pricing","path":"output/section_pricing.png","exists":true,"status":200,"rect":{"top":949,"height":941,"dpr":3},"rect_valid_for_full":true}
{"kind":"section","label":"Reviews","path":"output/section_reviews.png","exists":true,"status":200,"rect":null,"rect_valid_for_full":false}
{"kind":"error","error":"not reachable","url":"https://example.com"}
{"kind":"section","label":"Free plan","error":"not reachable"}
```

- `exists` is checked before the line is written, so a caller may chain on it.
- `rect` is the section's position in the whole document, in CSS pixels, with the device pixel
  ratio: `top` and `height` times `dpr` give device pixels in `site_full.png` when `rect_valid_for_full` is true. `null` means the
  section never painted: skip it rather than crop without a position.
- `rect_valid_for_full` is true only when the run had `--out` and `--sections` together and the rect was measured on the full-page load before any click. Otherwise crop from the section still. `truncated` true means the full page was cut at 25,000 CSS px; rects below the cut are not in it. `status` is the navigation's HTTP status; 400 or more fails the gate.
- The full-page line has no label and no rect. Section stills are viewport shots (390x664 CSS
  pixels at 3x on the iPhone 13 profile) with the matched heading centred.
- Still files are named `section_<label-slug>.png` in `--outdir`.

## The section map

`section_map.json`, top of the page to bottom, written by the agent from `site_full.png` and the
heading order in `page.html`:

```json
[
 {"label": "hero", "span": [0.0, 0.17], "key": true, "still": "output/section_acme-widgets.png"},
 {"label": "pricing", "span": [0.52, 0.66], "key": true, "still": "output/section_pricing.png"},
 {"label": "footer", "span": [0.95, 1.0], "key": false, "still": null}
]
```

`span` is the share of the page height the section covers. Filler (navigation, footer, logo strips)
is `key: false` and never becomes a still. The order of key sections is the order a caller's beats
and cards follow.

## capture-status.json

Written by `capture_gate.py` beside the capture folder (route A: next to `capture/`, never inside it; route B: beside the lines file); route C: by the agent, same fields:

| Field | Meaning |
|---|---|
| `route` | `project`, `stills` or `screenshots` |
| `passed` | the gate's verdict; `false` means the caller's failure default applies |
| `reasons` | why it failed (empty on a pass) |
| `warnings` | degraded optional phases, a missing bot-wall check, a thin capture |
| A: `scroll_frames`, `full_page`, `visible_text_lines`, `asset_files` | what the build can use |
| B: `full_page`, `full_page_bytes`, `usable[]` (label, path, rect), `skipped[]` (label, why) | the kept and skipped stills |

## For the caller: using the files

- **Band from the full page, by position.** `BAND_Y` is `rect.top` times `rect.dpr` and `BAND_H` is `rect.height` times `rect.dpr`:
  `ffmpeg -v error -i <out>/site_full.png -vf "crop=in_w:$BAND_H:0:$BAND_Y" -frames:v 1 <out>/band_<label>.png`.
  Without a rect, the last resort for a hero band is the top 35% of the page
  (`crop=in_w:in_h*0.35:0:0`). Never cut by a fixed fraction otherwise: page height moves by about 14%
  between loads.
- **Tall files.** A mobile full page is often 20,000-25,000 pixels tall. ImageMagick on this machine
  stops at 16K pixels and can fail with no message; use ffmpeg, or Pillow after setting
  `Image.MAX_IMAGE_PIXELS = None`.
- **Each still must read as the site:** a logo, the navigation bar, a price with its button, or a
  block of reviews in frame. When a band loses it, widen the band instead of cropping tighter.
- **Customer screenshots** (route C) are placed whole with a contain fit; they land shorter in a
  tall frame, which is expected.
- **Scroll shots** move a viewport over `full-page.png`; never make a page visibly scroll in a
  card or inset unless the caller's method asks for it.
