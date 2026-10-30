# Layout, type and the composition source

## Contents
- [The layout file (Pillow route)](#the-layout-file-pillow-route)
- [Type set to a system](#type-set-to-a-system)
- [HTML and SVG compositions (Chromium route)](#html-and-svg-compositions-chromium-route)
- [Canvas families and safe areas](#canvas-families-and-safe-areas)
- [Contrast and legibility numbers](#contrast-and-legibility-numbers)

## The layout file (Pillow route)

`work/<p>/layout.json`, read by `graphic.py compose`. Boxes are percentages of the canvas
(`[x, y, width, height]`; x and width of the canvas width, y and height of its height), so one
layout redraws exactly at a new size of the same shape.

```json
{ "canvas": { "width": 1200, "height": 628, "format": "png" },
  "background": { "color": "#0B1F3A" },
  "images": [ { "file": "artifacts/<p>/source/product.png", "box": [55, 10, 40] } ],
  "logo": { "file": "artifacts/<p>/source/logo.png", "box": [6, 8, 18], "clearspace_ratio": 0.5, "min_width_px": 120 },
  "text": [ { "id": "headline", "lines": [1], "box": [6, 40, 46, 30], "font_file": "artifacts/<p>/source/fonts/Brand-Bold.ttf",
              "cap_height_pct": 6.5, "line_height": 1.12, "color": "#FFFFFF", "bold": true, "max_lines": 2 },
            { "id": "cta", "lines": [2], "box": [6, 78, 46, 10], "font_file": "artifacts/<p>/source/fonts/Brand-Regular.ttf",
              "cap_height_pct": 3, "color": "#F2C14E" } ] }
```

- `background` is one of `{"color": "#hex"}`, `{"gradient": ["#hex", "#hex", angle]}` (CSS angles:
  90 left to right, 180 top to bottom) or `{"image": "<file at the exact canvas>"}` (path B, after
  `graphic.py fit`).
- `images` are supplied pictures (a product photo), placed whole: the width is set, the height
  follows the file. The logo is placed the same way, never redrawn; an SVG logo is first turned into a
  PNG by `render.mjs raster` (shape and proportions kept).
- `text[].lines` are 1-based numbers of the non-blank lines of `copy.txt` (blank lines and a
  trailing `\r` are dropped), in any order in the layout: `check` compares the same lines, not their order. Every copy line must be used once, and no
  text exists anywhere else: `compose` exits 1 if a line is left unused.
- A box that cannot hold its copy at the set size is refused: change the layout (box, size, line
  count), never the words. That includes a single word wider than the box, and any text, image or
  logo box that is not inside the canvas. Pillow has no text shaper: right-to-left and joined scripts
  (Arabic, Hebrew, Indic, Thai, Khmer, Myanmar) are refused and use the HTML route; copy without
  spaces (CJK) needs explicit line breaks in `copy.txt`.
- The font file must be TTF or OTF. A WOFF or WOFF2 brand font uses the HTML route (Pillow and
  `fc-query` cannot read it).
- `bold` has no effect on the Pillow render (the font file decides); it only sets the "large text"
  threshold for contrast, so name the bold file in `font_file`. The text box that `check` measures
  is the ink box.
- A placed logo or image is never enlarged past its file silently: `boxes.json` carries `scale`, and
  `check` fails a logo above 1.0.
- `clearspace_ratio` is measured in logo heights around the logo box and `min_width_px` in canvas
  pixels; take both from the brand guide when one is supplied. Default with no guide: no text may
  overlap the logo box; the measured gap is reported.

## Type set to a system

The values below come from the assessment's enrichment of WF01-a1 (fal/falvideoproduction-09f33d#43,
creative-claw/creativeclawrenderhtml-1ac902#42); the numbers in the example are starting values, not
brand rules.

- Size text by **cap height as a percentage of the canvas's short edge**, never by a pixel size, so
  the same layout reads the same at feed, story and banner sizes.
- Name the layout (for example `left-stack`, `centre-card`) in `brief.md`, and keep one per canvas
  family.
- Constrain each text box's width and line height; body text wraps naturally inside its box.
- The brand font file is loaded from disk by path. `compose` refuses a missing file and a copy
  character the face has no glyph for (read with `fc-query`); there is no silent fallback.
- Stroke or shadow on text, when used, is computed from the size (a share of the cap height), never
  a fixed pixel value.

## HTML and SVG compositions (Chromium route)

Write `work/<p>/compose/compose.html` (or `compose.svg`) beside copies of its assets and fonts; `render.mjs
shot` serves that folder locally, so every path is relative.

- `html, body { margin: 0; overflow: hidden; }`, a fixed `width` and `height` on the root box equal
  to the canvas, plain `<style>` only (no CSS framework is on this machine).
- Fonts: `@font-face { font-family: "Brand"; src: url("fonts/Brand-Bold.woff2"); font-weight: 700; }`
  with a fallback after it in `font-family`. `shot` waits for `document.fonts.ready` and every image,
  then reads which face each copy element really rendered with; a fallback face fails the shot.
- Each copy element carries `data-copy="<id>"` and holds its copy.txt line(s) exactly; transformed
  spans take `display: inline-block`. Visible text anywhere else is reported as stray text and fails
  `graphic.py check`.
- The logo is `<img data-logo src="logo.svg">` (SVG `<image data-logo="" href="logo.svg">`: an SVG
  file is XML, so every attribute needs a value, and a file that does not parse fails the shot), with
  `data-clearspace-ratio` and `data-min-width-px` when the guide gives them; no text node draws it.
- `@2x`: `--scale 2` raises the device scale factor; the viewport stays at the canvas size, so the
  layout is unchanged (WF01 enrichment, step 9). Never use CSS `zoom` or a larger viewport.
- SVG `<text>` uses `fill` for its colour; `shot` reads it.
- `shot` measures each copy element's ink box (the text's own rectangles), so a wide block over a
  photo is not measured for contrast as a whole. A copy element whose content is larger than its
  element (`scrollWidth` or `scrollHeight`) fails the shot, even under `overflow: hidden`.
- A WOFF2 brand font, and right-to-left or joined scripts, belong on this route: Chromium loads the
  font and shapes the text.

## Canvas families and safe areas

- The pixel size, format and safe areas come from the brief or from the platform's current help page
  (URL recorded in `brief.md`), never from memory (fal/brandedgraphics-96ba6e#6).
- Story or 9:16 canvases: keep faces, the product and the key message in the upper two-thirds and
  leave the lower band for the platform's interface, inside the looked-up safe area
  (kling/klingaigenerateimage-572826#47). No remembered pixel numbers.
- Measure it: `check --safe x,y,w,h` (percent of the canvas) fails any box that leaves the safe
  rectangle you wrote from the looked-up area. The upper-two-thirds rule is `--safe 0,0,100,66`.
- A canvas wider than 3:1 takes route A by default (a model background is made at 3:1 and cropped
  to a thin band); with route B, put the text band inside the kept slice.
- A set of canvases (feed, story, banner) gets one layout file per canvas family, the same copy.txt
  and logo, and its own folder: `artifacts/<p>/final_<W>x<H>/`.

## Contrast and legibility numbers

- Measured by `graphic.py check` on the rendered ground behind each text box (the frame with the copy
  made transparent), not on palette pairs: a generated background varies under the text
  (videozero/videozeroeditorialguiderouter-041880#317).
- Thresholds: 4.5:1 for normal text, 3:1 for large text (24 px or more, or 19 px or more in bold)
  (WF01 enrichment, step 10). The figure is the worst case: the 5% of ground pixels
  closest in brightness to the text.
- Repair direction: a lighter palette colour on a dark ground, a darker one on a light ground, or a
  quieter area or a palette-coloured panel behind the text. Never change the copy.
- Feed ads: `--feed` writes a 25% copy; view it. The headline must read and the product and brand be
  recognisable at a glance (juicylucy-ads/staticformats-791474#28).
