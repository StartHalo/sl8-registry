# What we can and cannot do today

Copied into v5 on 28 Oct 2026 from the agency's shared list, with customer names and paths taken
out. When you test a capability or find one missing, add a dated `[core]` line to `work/lessons.md`;
the next core release brings it here.

Tested, dated capabilities: the agency-plan skill checks them before choosing a lane. A gap closes only by a passing test or khalid's accepted risk in his words;
never by writing a document. Re-test when a line is older than the work needs. No customer data here.

| Capability | Status | Last tested | How / evidence |
|---|---|---|---|
| Read a client's live website (pages, redirects, sitemap, forms without submitting) | yes | 2026-10-13 | curl with redirects and headers, through the session proxy; full network access since 2026-10-13 |
| Read Google Play listings, including the install count in the page data | yes | 2026-10-13 | curl of `play.google.com/store/apps/details?id=…`; the count sits in the page data, the page shows only a band ("50K+") |
| Read any app's exact lifetime Play installs (competitors too), daily for a pace | yes | 2026-10-14 | curl of the Play page; the count follows the band in the page data, e.g. `"100,000,000+",100000000,<count>,"100M+"`; Android, worldwide only, refreshes about once a day |
| Competitor downloads and revenue by country and platform (app-intelligence estimates) | no (paid) | 2026-10-14 | Not readable from public pages. Researched, not bought: Appfigures Boost $399.99/mo (5 competitors, 99 download countries), AppTweak Market Intelligence Starter free (untested), Sensor Tower quote only ($29.5K–115K/yr per Vendr, Feb 2026). Estimates are modelled (Appfigures states 5–25% error) |
| Store search ranks per keyword and country | yes, with limits | 2026-10-15 | Play search page (`/store/search?q=…&c=apps&gl=<cc>`): first 30 results only (robots.txt disallows it); iTunes Search API (`itunes.apple.com/search?…&country=<cc>&entity=software&limit=200`): up to 200, throttled with 403s; paid fallback DataForSEO App Data, about $0.0012 a page (not tested) |
| Store keyword demand | partly | 2026-10-15 | Play and App Store autocomplete work (what people type, no volume); no service sells app-store volume; Apple Search Ads popularity needs the app owner's account |
| Store top charts, reviews, in-app prices per country | yes | 2026-10-15 | Apple RSS charts (top 100 per country and genre), App Store reviews RSS, App Store page in-app list per storefront; Play charts and reviews via npm google-play-scraper |
| Store keyword tools (AppFollow, AppTweak free plans) | not tested | 2026-10-14 | AppFollow Free (2 apps, 1,000 keywords), AppTweak Essential 7-day trial |
| Tool router treg.to (one token, pay per call) | yes, with gaps | 2026-10-15 | Tested in a separate session, $0.70 spent: App Store search with explicit positions (184 results, $0.00015) and Play search to 50 results without a position field ($0.0003 for 2 pages), both via litescrape; Meta Ad Library via ScrapeCreators ($0.00188) and Apify (charged its full $0.04 cap, not per ad); 15 company-enrichment providers by domain, $0.002–0.38 each, three of them matched the wrong company. Gaps: DataForSEO app-search tasks are billed but their results cannot be fetched through treg (no task_get); DataForSEO Labs rejects Pakistan; Diffbot rate-limited on treg's key. Token as the environment secret `TREG_TOKEN`, never in files |
| Who runs ads, and their creatives, by country | partly | 2026-10-15 | Google Ads Transparency Center: yes (its page's internal search works by script); Meta Ad Library: blocked by script (403), Apify actor as fallback (not tested); no public cost-per-install figure found for health apps |
| Read App Store listings and the iTunes lookup API | yes | 2026-10-13 | curl of `apps.apple.com` and `itunes.apple.com/lookup` (HTTP 200) |
| Screenshot pages (desktop and phone width) | yes | 2026-10-13 | Playwright with the pre-installed Chromium |
| Build a Slate report as HTML and PDF, with a page-fit check | yes | 2026-10-28 | the agency-report-pdf skill |
| Read khalid's mailbox | yes, read-only, where the session has the Gmail connector | 2026-10-13 | we never send from it |
| Read the agency inbox (the reply address in `bot/user.md`) | **no, not set up yet** | 2026-10-28 | follow-up work (D31); until then replies reach khalid, who forwards them: a stopgap like his hand-send of the `.eml` (D57) |
| Read WhatsApp | **no** | 2026-10-13 | No access; khalid shares notes |
| Read Notion meeting notes and pages | yes, read-only | 2026-10-13 | Notion connector |
| Independent check of a draft by a separate agent | yes | 2026-10-13 | A fresh agent with the draft, the sources and the rules; caught invented claims the builder missed in every test |
| Put files in a customer's shared Google Drive folder | **retired** (contract §11, D75) | n/a, retired 2026-11-03 | Drive is retired: files go attached to the email (D70), and a pass copies them into `artifacts/<customer id>/` (D64) |
| Render a motion film from code (titles, cuts, music) | yes | 2026-10-28 | the b2b-product-video-motion-video skill |
| Listen to a mix and judge it | **no, measure only** | 2026-10-28 | b2b-product-video-motion-video's mix check (loudness, peaks, balance above 300 Hz); a style call is the customer's |
| Draw one consistent child character across shots (AI image or video) | **unproven** | 2026-10-13 | No tool we can run has been tested |
| Send anything to a client | **v5: yes, by the agency-comms skill** once the email service is set up (D31); until then `send` writes `work/outbox/<task>.eml` for khalid to send (D57) | not yet on a machine (phase 1) | `agency send`; email from the reply address in `bot/user.md`, signed Slate Agency, Bcc from `bot/user.md`, files attached |

## Search and AI assistants' answers, 18 Oct 2026

Tested for a B2B customer's method check and first read, 18 Oct 2026.
Nothing paid, no account opened, no consumer AI app driven by script.

| Capability | Status | Last tested | How / evidence |
|---|---|---|---|
| Ask buyer questions to one AI assistant with live web search and record the vendors it names and the pages it links | yes, one assistant | 2026-10-18 | This session's web search tool returns the links and a written answer (Claude's); 20 questions, one run each, $0 beyond the session. One run is a first look, not a measure: answers vary run to run (SparkToro, Jan 2026). It is not Google's ranking |
| Read the cited method sources by direct download | yes | 2026-10-18 | curl through the proxy worked for developers.google.com, arxiv.org (abstract and PDF), lennysnewsletter.com (page and its public transcript JSON), ahrefs.com, blogs.bing.com, searchenginejournal.com; the session's page-fetch tool failed on DNS for the same hosts; searchengineland.com, help.openai.com and openai.com returned 403 |
| Ask ChatGPT by script | **no** | 2026-10-18 | chatgpt.com returned 403 to a plain request; OpenAI's Terms of Use bar programs that "automatically or programmatically extract data or Output". A person typing into the app works ($0) |
| Ask Perplexity, Copilot, duck.ai or Google's AI answers by script | not tried | 2026-10-18 | Their pages load (200), but answers need their app in a browser; scripting a consumer app is automated use, not ours to start. A person typing works ($0) |
| HubSpot AI Search Grader (what ChatGPT, Perplexity and Gemini say about a brand from training data) | not tested | 2026-10-18 | Free, "no account required", but the full report needs a contact form; reads the brand, not buyer questions |
| AI answers through paid APIs | not tested (paid) | 2026-10-18 | OpenAI API web search: $10 per 1,000 searches plus tokens; Perplexity API: their example, $0.0059 for one answer with one search; both need an account and card; whether API answers vary like the apps' is an open question (SparkToro) |
| AI answer trackers | not tested (paid) | 2026-10-18 | Otterly.ai Lite $29/month (15 prompts, daily, ChatGPT, Google AI Overviews, Perplexity, Copilot; free trial); Semrush SEO plan $139/month includes AI search tracking; Ahrefs Brand Radar: every paid Ahrefs plan includes a few custom prompts a day (Lite 5), custom prompts "Starts at €47/mo"; Peec AI prices load by script, not read |
| Copilot and Bing AI citations of a site; clicks from Google's AI answers | not tested (owner's account) | 2026-10-18 | Bing Webmaster Tools "AI Performance" (public preview, 10 Feb 2026) and Google Search Console's Performance report, "Web" (AI-answer clicks mixed in with ordinary search, not shown apart); both free, both need the site owner to verify the site |

Independent check, 18 Oct 2026 (a separate agent): every line above re-tested or re-read the same day and holds (the page-fetch tool's DNS failure, the 403s, the 200s, each price on its vendor's page); three lines made more exact (Ahrefs' included quota; Search Console does not show AI-answer clicks apart; SparkToro's open question on API answers). Five of the 20 questions re-run with the session's web search, $0, same results.

Re-check, 18 Oct 2026 (a second separate agent, $0): the three lines made more exact hold (Google's Search Console help shows no AI filter or search type; SEJ: "whether API calls yield the same variation as manual prompts"; Ahrefs Brand Radar: Lite 5 prompts, "Starts at €47/mo"); the 403s (chatgpt.com, openai.com, help.openai.com, searchengineland.com), the 200s (Perplexity, Copilot, duck.ai) and the Otterly, Semrush, Perplexity and OpenAI prices re-read the same; question 10 re-run, same result. One correction to the trackers line: Ahrefs' included prompts are each checked daily (Lite: 5 prompts, 150 checks a month), not "a few custom prompts a day". blogs.bing.com returned 504 at the re-check; the Bing line rests on the two earlier reads.

## Competitors' ads, 18 Oct 2026

Tested for a B2B customer's method check and read of competitors' ads, 18 Oct 2026.
$0 spent; no account opened. Independent check: below the table.

| Capability | Status | Last tested | How / evidence |
|---|---|---|---|
| Google Ads Transparency Center by script: find an advertiser, list its ads with first and last shown dates | yes, a few requests only | 2026-10-18 | The page's own search (`/anji/_/rpc/SearchService/…`) works with the session cookie of one page load: advertiser search, and one advertiser's 56 ads with dates in one reply. Google answered some requests with its "unusual traffic" page and, after about 20 in a few minutes, with 429 "too many requests"; this session's permission guard then refused a further scripted batch. A bulk read of many rivals this way does not work; a person in a browser does (free) |
| Read the text of a Google text ad | yes, by eye | 2026-10-18 | Google's library keeps text ads as pictures (`tpc.googlesyndication.com/archive/simgad/…`, free to download); 16 read by eye, no OCR. It shows the address printed in the ad, not the page a click lands on |
| First shown date of a US ad in Google's library | partly | 2026-10-18 | Its search list returns first and last shown; the ad's own record for a US ad holds only the last shown date and the country |
| Read a rival's ad landing page by script | no (one rival) | 2026-10-18 | a rival's site answered 403 to curl; a browser works (not tried) |
| Meta Ad Library through the tool router (ScrapeCreators) | not run (paid) | 2026-10-18 | Tested on 15 Oct at $0.00188 a call (line above); on 18 Oct this session's permission guard refused the first paid call, so nothing was charged. Needs a budget in the engagement's parameters (D67). The router's catalog pages (price, parameters) are free to read |
| Google ads library through the tool router (ScrapeCreators) | not tested (paid) | 2026-10-18 | $0.00188 a call; the router's catalog describes ads by domain or advertiser id with first and last shown dates (and "overallImpressions" for one ad); not called |
| LinkedIn Ad Library | not tested | 2026-10-18 | Free in a browser; the router lists a ScrapeCreators search at $0.00188 a call; not called |
| A written method for copying competitors' ads | found, a rule of thumb | 2026-10-18 | Demand Curve, Growth Newsletter #289 (23 Oct 2025): "if an ad runs for 3+ months, it's a sign that it's probably working"; #142 (17 Oct 2023): "Find their ads and click through the funnels". Libraries show no spend or results (Jon Loomer, updated 6 Mar 2025). No study found that tests run length against results |

Independent check, 18 Oct 2026 (a separate agent, $0): the lines above hold, with these additions.
Google's library by script, 08:43–08:47 UTC: from a fresh page load, 6 requests were answered
(three advertisers' ad lists, one of them the same 56 ads and dates as the first read; three
searches by web address) and the 7th got the "unusual traffic" page, so budget about 6 requests
per fresh session (inferred). A search by web address finds ads that a name search misses (one
rival's 9 ads sit under an advertiser with another company name). Google's record held dates up to
18 Oct for one advertiser, so a "last shown" date a week old means the ad stopped showing, not
that the record lags (inferred). Each ad in the search list also carries a day count, read as the
days it was actually shown (inferred: undocumented by Google; one scraper calls a similar field
"approxDaysShown", "Approximate number of days the ad has been running",
apify.com/solidcode/ads-transparency-scraper); first to last shown is a span, not an unbroken run.
14 more stored ad pictures read by eye, and the first read's 16 re-read as quoted. The rival's
landing page: 403 again to curl, and 404 on the ad's path with a browser user agent. The router's
Meta company-ads call "Fetches all ads currently running" (its catalog), so it shows no ended ads.
One correction to the Meta line: a read already tested is within the owner's 18 Oct instruction
("any spend beyond the tested reads comes to you first"); what blocked it was this session's
permission prompt, which needs his approval; the router's untested Google endpoint is new spend
and needs his yes either way.

Re-check, 18 Oct 2026 (a third agent, $0): the check's additions hold, with two updates. Google's
library by script, 08:58–08:59 UTC: after the 08:47 block, a fresh page load got 1 request answered
and the 2nd was sent to Google's "unusual traffic" page, so the limit outlasts a new session from
the same address for at least 11 minutes (inferred); after a block, expect one or two requests,
then wait (how long it lasts: unknown). The same request showed one ad last shown 18 Oct 07:44 UTC, about an hour before the
read, so the record runs close to live. The rival's site, 08:59 UTC: its home page answered curl
(200, with and without a browser user agent), so its block comes and goes; both addresses printed
in its ads answered 404, so an address printed in a Google ad may not be a live page. The stored
ad pictures (`tpc.googlesyndication.com`) downloaded again with no limit met (14 of 14).
