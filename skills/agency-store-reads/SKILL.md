---
name: agency-store-reads
description: Read public app-store data with plain GETs - an app's exact lifetime Google Play installs (ours or a competitor's), Play and App Store listing fields (title, subtitle, short description, ratings, screenshots), search rank per keyword and country on both stores, iTunes lookup - and which apps carry which search words. Use for a daily install figure, an ASO baseline or read-out, or a competitor comparison.
metadata:
  status: proven
  version: 1.0.0
---

# store-reads

Two scripts, no account, no key, nothing paid. Each read prints one JSON line with the URL, the
UTC time, the HTTP status and the SHA-256 of the reply, so every figure has its source.

## Files here

- `store_reads.py`: `play-installs`, `play-listing`, `play-rank`, `ios-lookup`, `ios-listing`,
  `ios-rank`. `--file <saved page>` parses a saved reply instead of reading live; `--save <dir>`
  keeps each raw reply. `--help` lists the arguments.
- `keyword_gap.py`: from listing lines, which apps carry each search phrase in the fields the
  store searches; `--app` marks our app (give both store ids).

## Steps

Run from `$HOME` (`/home/user`); append the output to a log in `work/` (e.g. `work/stores/installs.jsonl`).

1. Installs (daily): `python3 ~/.claude/skills/agency-store-reads/store_reads.py play-installs <package> [<package>...] >> work/stores/installs.jsonl`.
   Compare with the previous line for the change; the page refreshes about once a day.
2. Listing fields: `python3 ~/.claude/skills/agency-store-reads/store_reads.py play-listing <package> --gl us --hl en` and
   `python3 ~/.claude/skills/agency-store-reads/store_reads.py ios-listing <app id> --cc us`. Save the raw page with `--save work/stores/raw`
   when the read backs a deliverable.
3. Ranks: `python3 ~/.claude/skills/agency-store-reads/store_reads.py play-rank <package> --kw "pregnancy tracker" --kw "due date" --cc us,gb`
   and the same with `ios-rank <app id>`. A rank of `null` means "not in the first `of` results".
4. Keyword gap: collect listing lines for our app and the leaders into one file, then
   `python3 ~/.claude/skills/agency-store-reads/keyword_gap.py listings.jsonl --kw "..." --app <package> --app <app id>`.

## Output

JSON lines: `store`, `app`, country, the fields read, plus `url`, `read_utc`, `status`, `sha256`
(or `source` when parsed from a file). Missing fields are `null` with a `note` when the page held
no data block.

## Verify

`status` 200 and a non-null value on every line you use. For a figure in a deliverable, keep the
raw reply (`--save`) so the evaluator can re-parse it with `--file`. A figure that looks odd: read
the page once more by hand (`curl -sL '<url>' | grep -o '"[0-9,]*+",[0-9]*,[0-9]*'`).

## Known limits

- Play installs are Android, worldwide, lifetime only; no per-country or iOS downloads from
  public pages. Competitor downloads by country need paid app-intelligence tools (outside a $0 budget, D67).
- Play search shows only the first 30 results; Play's `robots.txt` disallows the search page, so
  keep rank reads few (a daily set, paced 1 s).
- The iTunes Search API returns up to 200 results and throttles with 403/429; calls are paced
  4.5 s apart and retried.
- App Store keyword fields and search volumes are not public; Apple Search Ads popularity needs
  the app owner's account. App Store promotional text is not on the web page.
- Play's page data has no field names: positions were verified on 2026-10-28 and can change. A
  `null` score or ratings on Play can mean too few ratings; check the page by eye.

## Lessons

- **The exact Play count is in the page data**, after the band: `"50,000+",50000,<count>,"50K+"`;
  the page itself shows only "50K+". It refreshes about once a day (a second read 1 h later showed
  the same figure). Source: an app customer's records;
  `knowledge/capabilities.md` (Play rows, tested 2026-10-13 and 14).
- **App Store subtitle trap:** the page lists other apps with their own subtitles; read only the
  `<p class="subtitle">` right after the app's own `<h1>`, and treat a "subtitle" equal to the
  category as none. Source: an app customer's records.
- **An app missing in a storefront** answers 404 on the App Store page and no result from the
  lookup API; the Play page may load with no Install button. Same source ("Failures and limits").
- **Ranks: what worked and what is paid.** Play search page (30 results) and the iTunes Search API
  (200) are free; a paid router gave positions at fractions of a cent but some endpoints could
  not return results; anything paid needs a budget in the parameters (D67). Source: `knowledge/capabilities.md`
  (store search ranks, tool router rows, 2026-10-15).
- **Redacted captures break JSON.** A saved iTunes reply with an email hand-replaced by
  "[email removed]" no longer parsed; the script now tolerates stray backslashes. Source: this
  pack's test on 2026-10-28 against
  an app customer's records.
- **Tested 2026-10-28:** one live GET of a Play page (HTTP 200, 21:12 UTC): installs 67,710 in the
  50,000+ band, title, short description, 24 screenshots read. Offline on the 21 Oct captures:
  App Store rank 28 of 184 and Play "not in 30" for one keyword, the same as that day's logged
  read (an app customer's records);
  App Store listing name, subtitle, ratings and screenshots for four apps; lookup fields from a
  saved 15 Oct reply; keyword gap table built from those lines.
