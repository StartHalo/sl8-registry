---
name: agency-web-reads
description: Read a customer's live website with GET requests only (or as a browser renders it, for pages built by scripts) - each page's redirect chain and status codes, title, meta description, canonical, h1, JSON-LD types, and the site files (robots.txt, sitemap URLs, llms.txt) - and keep the raw replies as evidence. Use for a baseline or re-read of a site before and after changes, an SEO or AI-search check, or to source a claim about the site.
metadata:
  status: proven
  version: 1.0.0
---

# web-reads

One script, `site_read.py`, standard-library Python. It only sends GET: no forms, no logins,
no POST. Redirects are followed by hand so every hop is recorded. With `--render` it reads each
page as a browser shows it, through `render.cjs` and the machine's pre-installed Playwright
Chromium (no install): scripts run, the page is scrolled to the end, and the HTML after that is
read and saved. It still never types, clicks or submits.

## When to use

A baseline or re-read of a site, an SEO or AI-search check, a claim about a site that needs its
source; a rival's page in discovery.

## Inputs

The site's address and the pages (from the plan's scope or the sitemap). Python 3; Node with the
machine's Playwright for `--render`.

## Steps

1. Read the pages and the site files, keeping the replies:
   `python3 ~/.claude/skills/agency-web-reads/site_read.py https://<site>/ /pricing/ /faq/ --site --out work/site/live-YYYY-MM-DD`
   (a `/path` joins the first URL's site; `--json` gives one JSON line per page for a log).
2. A page built by scripts (an app sign-up, a single-page site: the plain read shows a title like
   "Loading…", no h1 or a few words), or blocks shown on scroll: read it again with `--render`
   into its own folder, e.g. `--render --out work/site/rendered-YYYY-MM-DD`. Never write a
   browser script of your own for this.
3. For a re-read, run the same list into a new dated folder and compare: `diff -r` on the saved
   bodies, or the summaries side by side.
4. When a claim in a deliverable rests on the site, cite the saved file and its read time
   (`read-started-utc.txt`, and `read_utc` per page).

## Output

Per page: the chain (`301 <url> -> 200 <url>`), final status, content type, bytes,
last-modified, read time, title, description, canonical, robots meta, h1s, JSON-LD types, word
count. With `--site`: robots.txt and llms.txt status, robots lines, every sitemap (index sitemaps
followed) and its URL count and URLs. With `--out`: each body (`<path>.html`, or the file's own
extension) and `<path>.headers.txt` with every hop's status and headers.

## Quality bar

Every page relied on has a saved body and headers with its read time; a page built by scripts was
read with `--render` (its title is not "Loading…", its h1 is there).

## Verify

Every page you rely on shows status 200 at the end of its chain; a page you expected but got 404
or a redirect to `/#section` is a finding, not an error. Spot-check one figure by opening the saved
body.

## Known limits

- Without `--render` it reads the HTML the server sends: text a script adds is not seen. With
  `--render`, about 4 s a page; a page behind a bot check ("Just a moment...") stays unread.
- Parsing is by pattern, not a full DOM: unusual markup can hide a title or a meta tag; open the
  saved body when a field is `None` and should not be.
- Some sites refuse scripted requests (403) some of the time; retry later or read in a browser.
- Saved pages can hold people's email addresses or phone numbers: remove them before the files
  go anywhere outside `work/`.
- Does not read search rankings or what AI assistants answer; those are other methods.

## Lessons

- **Keep headers and bodies, dated.** The status reads saved 13 addresses with their headers (3
  redirects) and were compared with the read of the day before. Source:
  a B2B customer's records and that project's
  `work/README.md`.
- **Redirects to a fragment are findings.** `/pricing/` and `/faq/` answered with redirects to
  `/#pricing` and `/#faq`; `/llms.txt` was 404 while robots.txt allowed all and named the sitemap
  (32 URLs). Source: a B2B customer's records.
- **Strip personal data from saved pages.** Email addresses in saved pages were replaced with
  "[email removed]"; third-party pages holding a person's email were not kept at all. Same source.
- **The proxy path works where the page-fetch tool does not.** curl through the session proxy
  read sites on which the session's page-fetch tool failed on DNS; one rival's site answered 403 to
  curl on one day and 200 on another. Source: `knowledge/capabilities.md` ("Read the cited method
  sources", "Read a rival's ad landing page", 2026-10-18).
- **A rendered read is part of the pack (2026-10-30).** Run 2026-10-30-uc1: the operator wrote its
  own `render.js` for rivals' sign-up pages built by scripts, then edited it twice for longer waits.
  `--render` replaces it. Tested 2026-10-30: the Brightloom fixture (home, sign-up, a 404) read with
  `--render` gave the same titles, h1s and statuses as the plain read; a page whose h1 a script adds
  read as title "Loading…", no h1, 1 word plain, and with its h1 and 20 words rendered; a `301 -> 200`
  chain was kept. Source: `docs/v5/runs/2026-10-30-uc1/verdict.md`, gap 9.
- **Tested 2026-10-28:** against a local server of the 23 Oct saved pages: home, a directory
  redirect recorded as `301 -> 200`, a 404, robots.txt 200, llms.txt 404, sitemap 32 URLs (the
  same count as the 23 Oct read), JSON-LD types Organization, WebSite, SoftwareApplication,
  FAQPage. One live GET of `http://example.com/` through the proxy: 200, title read, body and
  headers saved.
