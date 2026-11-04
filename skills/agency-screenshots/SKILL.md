---
name: agency-screenshots
description: Take screenshots of web pages at desktop (1280x800) and phone (390x844) width with the machine's pre-installed Playwright and Chromium - first screen or full page, optional red outlines with labels on chosen elements - plus an index of what was taken and when. Use to show a customer's site as it is (before and after a change), to evidence a finding, or to see text that only appears in a real browser.
metadata:
  status: proven
  version: 1.0.0
---

# screenshots

One script, `shoot.mjs`. It loads each page, scrolls it to the bottom (so blocks that animate in
on scroll appear), goes back to the top and captures. Read-only: it never types, never submits.

## Needs

Node 22+ and Playwright with Chromium. The machine's global Playwright is found by itself (else
`npm install playwright` next to the script); the Chromium at `/opt/pw-browsers/chromium` is used
when Playwright's own is missing; `CHROMIUM_PATH` overrides. The session proxy in `HTTPS_PROXY`
is passed to the browser.

## Steps

1. Take the shots, from `$HOME` (`/home/user`):
   `node ~/.claude/skills/agency-screenshots/shoot.mjs https://<site>/ https://<site>/pricing/ --out work/site/shots-YYYY-MM-DD`
   (both views, first screen, PNG at 2x pixels).
2. Options: `--full` (whole page), `--views phone` (one view), `--jpeg` (smaller files),
   `--wait 3000` (slow pages), `--open ".menu-btn"` (open a menu first; never a submit button),
   `--mark "<css selector>=<label>"` (repeatable; outlines the first visible match in red).
3. Look at every image before using it. Re-take one page by running it again into the same
   folder: its rows in `index.json` are replaced.

## Output

`<out>/<page>-<view>.png` (or `.jpg`) and `<out>/index.json`: file, URL, view, full or first
screen, HTTP status, page title, page size in CSS pixels, whether the page is wider than the
screen (a sign of horizontal scroll on phones), and the UTC time taken.

## Verify

Every row has status 200 and the expected title; a "not found" warning for a `--mark` means the
selector matched nothing visible; open each image and check it shows the page, not a cookie wall,
an error or a blank first screen.

## Known limits

- A page behind a login, a captcha or a bot check shows that wall instead.
- Cookie banners and chat widgets are captured as they appear; nothing is dismissed by default.
- `--mark` takes CSS selectors; to mark a piece of text, find its element's selector first.
- "Wider than the screen" is measured before marks are drawn; check it by eye before calling it
  a finding.
- Pages saved to disk lose their external CSS and images; shoot the live page for evidence.

## Lessons

- **Two widths, 2x pixels, phone user agent.** The conversion review's 19 shots used 1280x800
  and 390x844 at device scale 2, a touch phone with an iPhone user agent, and scrolled each page
  first so animated blocks showed. Source:
  a B2B customer's records.
- **Measure, then show.** Positions (how far down the school logos start on each width, whether
  the phone menu had a trial link) were measured by script and then shown in the shots. Source:
  a B2B customer's records.
- **Re-take only what changed.** The checker re-took just the shots its fixes touched and merged
  them into the index (`ONLY=` in the source script); this script merges `index.json` by file
  name. Same source.
- **Never submit.** The sign-up page was shot and measured, never submitted (project rule in the
  source script's header). Same source.
- **The Chromium path moves.** The source scripts point at `/opt/pw-browsers/chromium-1194/...`,
  gone on 2026-10-28 (now `chromium-1243`, linked from `/opt/pw-browsers/chromium`). Source: this
  pack's test, 2026-10-28.
- **Tested 2026-10-28** on local files (no outside traffic): two saved site pages and a built
  report, desktop and phone, first screen and full page (390 x 10,558 px), one mark drawn, a
  missing selector reported, `index.json` merged across two runs. Live capture through the proxy
  was last proven on 2026-10-18 by the source script (`knowledge/capabilities.md`, "Screenshot
  pages", and the v3 shots).
