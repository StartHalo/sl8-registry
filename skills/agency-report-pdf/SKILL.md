---
name: agency-report-pdf
description: Build a branded report or fix sheet as an HTML page and a PDF (A4 or US Letter, running header and footer) from one report.json of blocks, with screenshots embedded and a page-fit check that fails the build when any page overflows. Use when a task's deliverable is a written report, a fix sheet, a one-pager or any print document for the customer, and for each new version of one.
metadata:
  status: proven
  version: 1.1.0
---

# report-pdf

Write the report as data: one `report.json` of blocks, one block per page (a fix, a section). The
build renders the blocks with `template/blocks.html`, embeds the screenshots, adds header, footer,
fonts, logo and icons, writes `<doc-file>.html` and `<doc-file>.pdf`, and checks every page fits.
A new version is a copy of the folder and an edit of `report.json`, never a find/replace on HTML.

## When to use

A task's deliverable is a written report, a fix sheet, a one-pager or any print document.

## Files here

- `build_report.py`: the build and the page-fit check.
- `template/report.json`: the starter data (cover, a page, a fix, sources, back), placeholders in
  square brackets.
- `template/blocks.html`: the block types and their fields: `cover`, `page` (any layout: its `body`
  is HTML), `fix` (one per fix row: where, spot, screenshot, now, fix), `fix-code` (a fix seen
  only in the page code: the code line, as typed, in place of the screenshot), `sources`, `back`.
- `template/report.src.html`: every page layout in HTML (answer, method, finding, gaps, decision);
  copy a sheet's inner HTML into a `page` block's `body` when a page needs one of them.
- `assets/`: what the build inlines: `fonts/` (Inter, IBM Plex Mono, with their OFL licences),
  `slate-print.css` (tokens and every page class), `slate-logo-96.png`, `icons.svg`.

## Inputs

The task's refs (read notes, facts with sources); the screenshots as PNGs (agency-screenshots
writes them). Needs Python 3, Chromium (the pre-installed Playwright one or a Studio image's Headless Shell is found by itself; else
set `CHROME_PATH`), `pdfinfo` and `pdftoppm` (poppler).

## Steps

1. Copy `template/report.json` into the deliverable's folder (e.g. `work/<deliverable>/v1/`); put
   the screenshots in `shots/` there (`node ~/.claude/skills/agency-screenshots/shoot.mjs <urls> --out work/<deliverable>/v1/shots`).
2. **The customer's logo** on the cover's "Prepared for" card: the cover block's `logo` is the path
   from `report.json` to the file CUSTOMER.md names (`work/discovery/brand/logo.<ext>`, e.g.
   `../../discovery/brand/logo.svg`; svg, png, jpg or webp). None: leave `logo` empty; the card
   shows their name alone (D68).
3. Set the head: `title` and `short` (the document name, product first), `status` (footer text),
   `file` (`Customer-Product-Document-vN`, no status words in it), `size` (`a4`, or `letter` for US
   and Canadian customers). The built file is what the customer gets: set the final status text
   (no "draft") before the check. A comms task's refs name the PDF itself, never this folder.
4. One block per page, one point per page, title as a full sentence. A fix block's `shot` is the
   PNG's name without `.png`; a raw `<img src="__SHOT_<name>__">` works in any `body` too. Every
   figure carries its source (`<sup><a href="#s1">1</a></sup>`; the sources block's items are s1, s2…).
5. Build: `python3 ~/.claude/skills/agency-report-pdf/build_report.py work/<deliverable>/v1/report.json [out_dir]`.
   It writes `report.src.html` next to the JSON (generated: never edit it). `--shots <dir>` reads
   the PNGs from another folder; `--assets <dir>` points at another copy of the design assets.
6. If a page fails: cut words, split the block or drop an exhibit. Never shrink type below the
   stylesheet's sizes, never remove the margin.
7. A new version: `cp -R v1 v2`, edit `v2/report.json` (add, drop or change blocks; `file` and
   `status` to v2), re-take changed screenshots into `v2/shots/`, build.

## Output

`<doc-file>.html` (the page for a browser or an artifact; no doctype, the host wraps it) and
`<doc-file>.pdf` (one page per sheet, colours kept), next to the source or in `out_dir`. One
line per page is printed with the free space left.

## Quality bar

Every page `ok`; every fix row has its own screenshot of the exact spot (a code-only fix: a
`fix-code` block showing the code line, its file and line in the caption): count them, images =
fix rows. Every figure has a source number; no placeholder in square brackets left; the status
text is final.

## Verify

1. Exit code 0: every page `ok`, PDF pages = sheets. The check renders twice: with the embedded
   fonts (each inner page must keep 6 mm free at the bottom) and with Arial and Courier New (no
   overflow allowed).
2. Look at every page: `pdftoppm -r 60 -png <doc-file>.pdf page`, then view the images. Look
   for empty stretched boxes, crowded pages, labels that touch.
3. Then the evaluator checks every figure, quote and tag against its source before anything
   reaches the customer.

## Known limits

- The build stops (exit 1, naming it) on a missing or badly named screenshot, a missing block or
  head field, or a starter placeholder left in `report.json` ("[Capitalised text]").
- The check measures layout, not content: it cannot tell a wrong number or an invented claim.
- Charts are hand-built HTML or SVG in a `page` block's body; there is no chart library.
- Narrow screens scale each sheet (never re-flow it), so on a phone the page is small text.
- Brand is the agency's own (logo, colours, "Slate Agency" in the header); the customer's logo
  appears only on the cover's "Prepared for" card. A customer-branded report needs a different
  `assets/` folder and header text in the script.

## Lessons

- **Header and footer get their own space; the build must guarantee the fit.** After khalid,
  2026-10-09: "The footers are completely wrong and mixing with page content. The page content
  not fitting correctly you need to take measures for that". Cause: the footer was pinned over
  the page and pages were filled to it; any font or zoom difference pushed text under it. Fix:
  stacked header, body, footer; embedded fonts; 6 mm free; a fallback-font pass; scale, never
  re-flow. Source: `knowledge/log.md` (2026-10-09 entry), `knowledge/recipes/pdf/README.md`.
- **Fixed sheets, not CSS page-margin boxes.** Chrome 131+ supports `@page` margin boxes but
  shows them only in print, not on screen, so screen, browser print and PDF would differ.
  Source: `knowledge/recipes/pdf/README.md` ("Why fixed sheets").
- **The Chromium path moves.** The old recipe hard-coded `/opt/pw-browsers/chromium-1194/...`;
  on 2026-10-28 the machine had `chromium-1243` and the old path was gone, so the script now
  searches (`CHROME_PATH`, `/opt/pw-browsers/chromium`, any `chromium-*`). Source: this pack's
  test run, 2026-10-28.
- **No customer names in shared assets.** A CSS comment in the shared stylesheet named an earlier
  client's product and was found by a leak check. Source: `knowledge/log.md`, 2026-10-14 entry
  "A client name removed from the shared stylesheet".
- **Tested 2026-10-28:** the starter template built to 8 sheets, 8 PDF pages, all `ok`, exit 0,
  in about 6 s; the same file with 90 extra lines on page 2 failed with
  `free -786.9mm` and exit 1.
- **Screenshots belong in the build, not a per-report script.** Run 2026-10-30-uc1: the operator
  wrote a `build.py` of its own to fill `__SHOT_name__` placeholders; K1 moved that into the build
  (`shots/`, `--shots`). Source: `docs/v5/runs/2026-10-30-uc1/verdict.md`, gap 7.
- **A version is a data edit (2026-10-30).** Run 2026-10-30-uc1: each of four versions was a Python
  find/replace on a 15 KB HTML template. Now the source is `report.json`, one block per fix or
  section. Tested 2026-10-30 on the Brightloom fixture: v1 (2 fix blocks, 2 screenshots) built to 5
  sheets; v2 (a fix block and a `fix-code` block added to the JSON) to 7, all `ok`, exit 0, about
  6 s each; a
  wrong `--shots` folder and a block missing `fix` each stopped the build, exit 1. Source:
  `docs/v5/runs/2026-10-30-uc1/verdict.md`, gaps 7 and 8.
