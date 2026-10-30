---
name: marketing-static-ad-production
description: >-
  Static ad batch for paid social: a dated batch of new image ads iterated from the customer's
  winning ads or competitors' public ads, in every target language. A repeat-or-explore choice,
  compliant copy, masters in three mutation modes (copy-led, visual-led, full remix) on Nano
  Banana Pro by default with copy and the real logo composited, one master review, numbered
  ad-set folders, tool-made names, localization after a stress sample, a ten-item batch QA and a delivery record.
  Use when: a new statics batch, iterate our winning statics, competitor-inspired static ads, or
  continue today's batch. NOT for: one branded graphic or banner
  (marketing-branded-graphic); localizing finished ads alone (marketing-ad-localization); ranking
  winners (marketing-winner-analysis); copy alone (marketing-static-copywriting); a multi-channel
  campaign (marketing-campaign-pack); video ads (marketing-ad-remake); brand capture
  (marketing-brand-kit); ai-gen use (media-ai-gen); file checks (media-qc).
license: SL8 wording and SL8-authored scripts; method from JuicyLucy static-ad-production, ad-naming and workspace conventions (proprietary), restated and cited
compatibility: "marketing-studio >=1.0.0 (sl8-video 1.5.0, sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; node 22; playwright with chrome-headless-shell 152; imagemagick 6.9; pillow with libraqm; tesseract (optional, for ocr-name); siblings marketing-brand-kit, marketing-winner-analysis, marketing-static-copywriting and marketing-ad-localization in the same Marketing 1.0.0 bundle; fal endpoints as of 2026-10-27"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [juicylucy-ads/staticadproduction-39a415, juicylucy-ads/adnaming-d7bdfd, juicylucy-ads/juicylucy-b90136]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27)
  approach: companion; method WF01-a2; called by WF03-a1 step 11, beside WF01-a1 and WF02-a1
  attribution: Method from the SL8 capability assessment (WF01-a2), restated in SL8 wording from JuicyLucy's static-ad-production skill with its naming tool and workspace conventions; scripts written by SL8 (statics.mjs from the described behaviour, compose.py from the house rule HR10)
  deltas: MKT-D480..MKT-D499
---

# Static ad batch production

A batch of new static ads, iterated from one signal (the customer's winners or competitors'
public ads), made once as masters in the source language, reviewed once as a set, then filed in
numbered ad-set folders and localized. The idea is kept, the execution changes, the brand is
always the customer's, and the folders and `batch.json` are the record.

Nothing here has run on an SL8 Studio. The vendor rendered with its host's own image tool and
published no prompt text: the briefs in `references/prompts.json` are SL8's restatement of its
required contents, and neither they nor Nano Banana Pro's lettering of a full ad have been judged
on this machine. Treat the first batch as a test (learnings MKT-L480). The words and the logo
are set from files over the generated picture by default (HR10), not drawn by the model.

```bash
# set these at the start of every command: they do not persist between calls
T=$HOME/.agents/skills/marketing-static-ad-production/scripts/statics.mjs  # where history reserve folder name inherit map verify capture
C=$HOME/.agents/skills/marketing-static-ad-production/scripts/compose.py   # features compose stamp ocr-name (Pillow)
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
R=$HOME/.agents/skills/marketing-static-ad-production/references   # method.md, prompts.json, conventions.json
```

`statics.mjs` exits 0 ok, 1 a failed check or bad input, 2 usage, 3 no headless browser. `compose.py` exits 0 written, 1 a check failed (nothing written), 2 a missing library, font or shaping engine.

## What a request needs

- **The brand:** a marketing-brand-kit kit (palette, type, logo files, notes), the product facts
  every claim must come from, any compliance notes, and the competitor list for the competitors
  adapter.
- **The signal:** for winners, a marketing-winner-analysis run or the customer's ad export with
  the creative images; for competitors, their statics or the library pages to capture.
- **The batch:** campaign (the project name), publish day, ad sets per language, ads per ad set,
  ratio (Default: 9x16; a kit or brief may name another), source language and target languages or
  the campaign files that allocate them. Optional: positioning, visual direction, references, a
  conventions folder from a kit, a budget.

A bot job has no one to answer a question (HR12): wherever the method asks, this skill states a
default and writes a gate file; only spend past the budget, and the master review before
localization, stop the job.

## Steps (approach WF01-a2 step numbers in brackets)

1. **Setup check** [1]. First command, before anything is read or written; every tool is its own test
   and the credentials are tested, never printed:
   `for t in node python3 identify convert fc-match ai-gen; do command -v $t >/dev/null || { echo "missing $t"; exit 1; }; done; test -n "$SL8_SESSION_TOKEN" && test -n "$SL8_API_URL" || { echo "no machine credentials"; exit 1; }; node $T where >/dev/null && python3 $C features && ai-gen estimate fal-ai/nano-banana-pro prompt=test aspect_ratio=9:16 resolution=2K --format json >/dev/null && ai-gen models --search nano-banana-pro --format json`
   (`estimate` is free and proves the proxy answers; the first call can take 1 to 3 minutes. The
   list must hold `fal-ai/nano-banana-pro` and `fal-ai/nano-banana-pro/edit`. `features` shows
   whether Pillow has raqm: without it Latin copy works and an Arabic, Hebrew or Indic line is
   refused, never drawn unshaped.) A pass is silent and is not a question. A failure ends the job,
   names what is missing and writes nothing (HR21).
2. **Stills only** [2]. The deliverable must be static images. A video ad or video batch, even one on
   the same date and number line, is a separate run; never mix mediums in one shortlist, reference
   set or QA pass.
3. **Brand** [3]. One kit: use it and name it in the first line of the reply. Several and the brief
   does not say which: `node $S/gate.mjs open --project <p> --slug which-brand …` and end `partial`
   before anything is spent. None: capture it with marketing-brand-kit first. The brand is the only
   source of identity: never take a name, logo, offer or face from a reference ad.
4. **Conventions** [4]. `node $T where [--conventions <kit dir>]` prints the conventions in force
   (`references/conventions.json`, replaced key group by key group by a kit's file). Unreadable: stop
   with a gate; never name anything from memory. Every date, path, page, language set, count,
   campaign number or root seen in an example or an earlier batch is an input, never a default.
5. **Project and dated folder** [6]. `node $S/manifest.mjs init --project <p>` once per campaign;
   `artifacts/<p>/` is the campaign root. The publish day comes from the request or the campaign;
   when nothing implies one, Default: today (UTC), written as a text gate
   (`gate.mjs open --kind text --default today …`) and flagged in the delivery. New day: create
   `artifacts/<p>/<YYYY.MM.DD>/c1/` and check it is empty before any research. A dated folder that
   exists is a same-day continuation (Default: continue, as a text gate): the next `c<k>/`, nothing
   earlier changed, renumbered, refetched or reallocated. Then
   `mkdir -p work/<p>/phone work/<p>/refs work/<p>/stress`.
6. **Remaining inputs** [5, 7]. Adapter, lookback window or research scope, ad sets per language, ads
   per ad set, ratio, positioning and references: from the brief, else from the newest earlier batch,
   each with its source written in `work/<p>/inputs.md`. Ask (a text gate with a default) only for
   what would change the result.
7. **History** [8]. `node $T history --root artifacts/<p>`, then the earlier images themselves:
   per concept the last date, days since, markets and modes. Records and images outrank file names;
   mark a doubtful match as doubtful.
8. **Winners adapter** [9]. Load marketing-winner-analysis and read its evidence records
   (`artifacts/<p>/winners/run-<YYYYMMDD>/evidence/*.json`), reference images (`…/refs/`) and
   unused-winner ledger (`artifacts/<p>/winners/ledger.json`) for the lookback window (run it on the
   customer's export when there is no run). A five-variation brief it wrote
   (`artifacts/<p>/winners/brief-<concept>.md`, WF03-a1 step 11) is a ready concept set: its
   hypothesis is the idea kept, each variation becomes one master with the one variable it names
   (new wording is a copy master, a new setting or surface a visual one, both a remix), the count
   made is the request's (ad sets x ads per ad set), not five, the unused variations stay in
   `batch.json` as `unused_variations`, and its figures to log go into `batch.json` (MKT-D489). What the batch needs from it:
   `references/method.md` § Source adapters. Statics only;
   no concept goes forward until its creative image was confirmed against its row. Live ad-account
   access is **not offered on this machine yet**: the customer's export is the source.
9. **Competitors adapter** [10]. `references/method.md` § Source adapters: competitor history first,
   then the customer's competitor statics, or one screenshot per library page with
   `node $T capture '<library URL with its filters>' --out work/<p>/refs/<competitor>-<n>.png`. A
   signed-in ad-library session is **not offered on this machine yet**; a page that blocks a headless
   browser (exit 1 or an empty shot) falls back to the customer's statics. No competitor list: a
   gate asking for it. A shot is a page, not a reference: look at it, then crop the one creative
   with `convert <shot> -crop <W>x<H>+<X>+<Y> +repage work/<p>/refs/<competitor>-<n>.png` and pass
   only the crop as `--ref`; a crop that shows a real face, another brand's name or page furniture is
   not passed (the generic-person rule of step 14 covers references, HR17).
10. **Repeat or explore** [11]. Two options with evidence, then the customer's choice or the
    stronger one with the reason: `references/method.md` § Repeat or explore. Record it in
    `batch.json`; write it as a text gate whose default is the choice made, so the review can
    overturn it.
11. **Allocation** [12]. Target languages from the brief, or, for new markets, from the campaign
    structure and per-language results the customer supplies for this run, by
    `conventions.json` § allocation. Print the table (campaign, language, ad sets) in the reply and
    in `work/<p>/allocation.md` before any folder exists; it is shown, not waited on. Only an old
    export to allocate from: a gate asking for fresh files.
12. **Transferable elements** [13]. One line per concept with the idea under test:
    `references/method.md` § Transferable elements.
13. **Copy** [14]. Load marketing-static-copywriting and write several English directions from the
    one idea, from the brand's product facts and compliance notes: a guaranteed result, invented
    precision or an unsupported promise becomes a capability, an experience or a qualified benefit
    (HR18). Each direction makes the product, the audience, the offer and the call to action clear.
14. **Characters** [15]. Only when the source idea depends on its own character, mascot or
    spokesperson and the brand kit has character files: pass the real file with `--ref` in step 17.
    Otherwise no brand character. A drawn mascot or an invented character only: a real person's
    face or voice (a spokesperson, founder, customer or creator, from the kit or a reference ad)
    is refused until SL8's consent text and privacy note are approved (MKT-L486, HR17); the
    master uses a generic person instead and the delivery says so.
15. **Modes and briefs** [16]. One mutation mode per master with what it keeps and alters
    (`references/method.md` § Mutation modes), all three across the set when the count allows, in
    `work/<p>/masters.json`. The masters needed are ad sets per language × ads per ad set, all
    distinct. Copy handling (HR10, MKT-D492): Default: a text-free plate; each prompt is the
    `master-brief` row of `references/prompts.json` plus its `composition` row, filled and saved as
    `work/<p>/<id>.prompt.txt`, and the approved lines (headline, proof line, call to action,
    brand name) go in `work/<p>/<id>.copy.json` for step 18, one line per role with its own box, size
    and colour (`references/conventions.json` § copy_file, safe zones in § safe_zones); the prompt's
    calm zones and its logo corner are written from those same boxes. Only when the brief asks the model to
    letter the ad itself: the `lettered-brief` row instead, recorded as a waiver with
    `node $S/manifest.mjs waive --project <p> --rule HR10 --instruction "<the brief's words>"`
    (HR20), and every word proof-read in step 19. The params file
    `work/<p>/<id>.params.json` holds `prompt` (the file's text), `aspect_ratio` (the nearest value
    the schema lists, facts `schema-nbp-aspect`), `resolution` `"2K"`, `num_images` 1 and the
    default-on flags pinned (`enable_web_search` false, `limit_generations` true, `safety_tolerance`
    `"4"`, `output_format` `"png"` when listed; facts `schema-nb-flags`; HR4). Read the values once a
    session with the raw OpenAPI printer (HR2). The prompt never goes on the command line.
16. **Quote** [17]. `ai-gen estimate <model> --params-file work/<p>/<id>.params.json --format json`
    per master, plus the localization worst case (masters × target languages × 2 attempts on
    `fal-ai/nano-banana-pro/edit`). Known result (facts `price-nbp`, 2026-10-05): 37.5 cr per image at
    1K or 2K. Compare the masters' total with `node $S/manifest.mjs budget --project <p>`; over it, or
    no budget known: a spend gate and end `partial` (HR5, HR12).
17. **Masters** [18, 19]. Without pausing between them:
    - From text: `ai-gen image -m fal-ai/nano-banana-pro --params-file work/<p>/<id>.params.json -o artifacts/<p>/<date>/c<k>/masters/<id>/ --queue --strict-params --max-cost <quote> --format json > work/<p>/<id>.result.json`.
    - When a reference or brand file must condition it: `-m fal-ai/nano-banana-pro/edit --ref <reference> [--ref <character file>]`
      (`--ref` fills `image_urls`, which the edit takes; `--image` would fill `image_url` and fail;
      `-o` is a directory).
    - Default: `fal-ai/nano-banana-pro`, and `fal-ai/nano-banana-pro/edit` with a reference; a kit or
      brief may name another.
    - Rename the output to `artifacts/<p>/<date>/c<k>/masters/<id>/plate.png` before the record (ai-gen
      names it `nano-banana-pro-<stamp>.png`, and `add` hashes the name), then record it:
      `node $S/manifest.mjs add --project <p> --result work/<p>/<id>.result.json --params work/<p>/<id>.params.json --json '{"item":"<id>","node":"masters","declared":{"aspect_ratio":"<r>","format":"png"},"credits":{"estimate":<quote>},"files":["artifacts/<p>/<date>/c<k>/masters/<id>/plate.png"],"parents":[<reference paths>]}'` (HR9).
    - A weak master, or one too close to the source or a sibling, gets one regeneration with the
      `follow-up` row: a named change of setting, surface, type or angle (the lever, HR7), never
      "another version". Record it with `"attempt":2,"lever":"<the named change>"` added to the same
      `add` (without a lever the record refuses it).
    - A call that fails with no image used no attempt only when it did not run: for every exit code
      follow media-ai-gen `references/recovery.md` (exit-code playbook). Exits 9, 10, 11 and 14 may
      have been charged: fetch any request id with `ai-gen result <id>` first (HR6), check
      `node $S/manifest.mjs budget --project <p>` after, count the possible charge against the quote
      before the second call, and record the failed call as a row with `"status":"failed"` and no
      files. Then send the same params file once more; a second failure is a fresh call built from the
      `recovery-brief` row, references attached again. No third call on the item.
    - ai-gen or the model unavailable: say so and stop. Never make a stand-in image with a script or
      drawing library.
18. **Copy, logo and file** [20]. The model draws no logo and, by default, no words. First look at
    `plate.png` alone against `references/method.md` § Plate check (letters, logos, badges or
    references' faces that crept in). Then one deterministic call sets every line of
    `work/<p>/<id>.copy.json` in its own box and the real logo in the safe-area corner:
    `python3 $C compose artifacts/<p>/<date>/c<k>/masters/<id>/plate.png --copy work/<p>/<id>.copy.json --out artifacts/<p>/<date>/c<k>/masters/<id>/master.png --phone work/<p>/phone/<id>.png`
    (Pillow with the kit's font file, `fc-match` confirms it; it sets sizes so the headline leads,
    adds a panel only where contrast would be under 4.5:1, keeps everything inside the safe zones
    and refuses, writing nothing, on a line that does not fit, a clash or a missing font; a logo that
    is an SVG is converted to PNG once with `convert -density 300 logo.svg logo.png`). Then record the
    delivered file: `node $S/manifest.mjs add --project <p> --json '{"item":"<id>","node":"masters","tool":"compose.py","declared":{"aspect_ratio":"<r>","format":"png"},"files":["artifacts/<p>/<date>/c<k>/masters/<id>/master.png"],"parents":["<plate.png path>","<logo file>"]}'`
    (marketing-brand-kit step 12). No usable font: deliver the plate and list the copy overlay as
    a debt (HR15). Write the mode beside it in `masters.json`; never point at a temporary or cache
    path. Plate, copy file and logo settings go to localization with the master.
19. **Master QA and the one review** [21]. Every master at full size and at phone width
    (`work/<p>/phone/<id>.png` from step 18), each line of `references/method.md`
    § Master QA written as an observation (HR14). A fault in the copy or logo is fixed by composing
    again from the same plate (no attempt, no spend); a fault in the picture uses the one
    regeneration when it is unused; otherwise the master is dropped from the sheet and the shortfall
    is an exception in `batch.json` (never a duplicate file to fill the count). Then one contact sheet:
    `node $Q sheet artifacts/<p>/<date>/c<k>/masters/*/master.png --out artifacts/<p>/<date>/c<k>/qa/masters-sheet.jpg`.
    With localization to follow: a spend gate (`node $S/gate.mjs open --project <p> --slug master-review --question "Localize these masters as planned?" --options '[{"id":"go","label":"Localize the masters as planned","credits":<localization total>},{"id":"stop","label":"Stop here","credits":0}]' --resume-at "step 20" --quote <localization total>`)
    and end `partial` with the sheet as the review artefact. Source language only: a text gate
    (`--kind text --default deliver`, options `deliver` and `revise`) and on to step 20; step 21 and
    the localization parts of step 22 are skipped, but the final copy of step 22 still runs. The
    answer, in the customer's words, says which masters go forward and any direction; record it
    with `gate.mjs answer`. A brand choice gate (step 3) uses options `{"id":"<kit>","label":"<kit name>"}` per kit.
20. **Ad-set folders** [22]. Reinspect the campaign root and the newest batch. For the source
    language: `node $T reserve --root artifacts/<p> --count <ad sets>` immediately before creating
    folders, `node $T folder --seq <n> --lang <src> --batch <descriptor> --ads <ads per set>`, then
    `mkdir -p "artifacts/<p>/<date>/c<k>/approved/<folder>"`, and copy each approved master in under
    `node $T name --lang <src> --concept <concept> --ratio <r> --mode <mode> --date <date> --dir "artifacts/<p>/<date>/c<k>/approved/<folder>"`
    (the full path, which must exist; never typed by hand; a taken name gets the next version,
    never an overwrite).
21. **Localization plan and stress sample** [23, 24]. One mode per master, text-only or creative
    adaptation (`references/method.md` § Localization modes). Then
    `node $T map --approved artifacts/<p>/<date>/c<k>/approved --src <src> --targets <codes> --root artifacts/<p> --out work/<p>/c<k>-map.json`:
    it reserves one number per target folder and prints the table (language, folder, planned names;
    one destination per language). Codes are the lowercase codes of marketing-ad-localization's
    `references/languages.json`; a code not there is confirmed first. Every localization path is
    rooted at `--project-dir artifacts/<p>/<date>/c<k>` (marketing-ad-localization's own
    `artifacts/<p>/final/<code>` becomes `artifacts/<p>/<date>/c<k>/final/<code>`; its `contract.md`
    § Names and numbering describes the `--map`). Stress sample: run marketing-ad-localization's
    single-ad mode on one approved master into a compact Latin, a long Latin, a non-Latin and (when
    present) a right-to-left language, writing only to `work/<p>/stress/<code>/` (never filed, so
    its later `plan` is not refused); look at all four at 100% including the logo corner, and
    write the rule each fault needs in `work/<p>/loc-rules.md` before scaling.
22. **Localization and final** [25]. (a) Load marketing-ad-localization and run its campaign mode with
    `--source-root artifacts/<p>/<date>/c<k>/approved --source-code <src> --targets <codes> --project-dir artifacts/<p>/<date>/c<k> --map work/<p>/c<k>-map.json`
    right after step 21 (nothing is locked until its folders exist), plus `adaptation` for the
    masters marked creative adaptation, and the step 21 rules. It owns the attempts, people check,
    Track A and the language gates. (b) HR10 holds for localized files too: its renders may re-letter
    the logo, so set the real logo again on each localized file with
    `python3 $C stamp <file> --logo <logo> --out <file> --corner <the master's corner> --ratio <r>`
    (same corner and width as the master), look at the corner at 100% for a ghost or outline of the
    model's own logo, and check the brand name in each file by eye and with
    `python3 $C ocr-name <file> --name "<exact brand name>"` (the lettering of a localized file is
    the model's; OCR is a screen, not a proof). (c) Copy the source language's approved folders unchanged (also when nothing is localized):
    `mkdir -p artifacts/<p>/<date>/c<k>/final/<src> && cp -rn artifacts/<p>/<date>/c<k>/approved/. artifacts/<p>/<date>/c<k>/final/<src>/`.
23. **Batch QA and delivery** [26, 27]. `node $T verify --cycle artifacts/<p>/<date>/c<k> --ads <ads per set> [--width W --height H --size-advisory]`
    (names, one language per folder, counts against the request and the folder name, no duplicate
    files; `--ads name` and `--size-advisory` for localized folders whose count or size differs) and
    `node $Q declared --plan artifacts/<p>/manifest.json --file <each master.png> --id <id>` (HR1);
    then the ten checks of `references/method.md` § Batch QA by eye. Several files with one layout
    fault: stop, fix the master or the rule, regenerate the affected files. Write `batch.json` and
    the reply (`references/method.md` § Delivery record), ending with: no live campaign was published.
24. **Failures** [28]. Keep everything the batch made; the next job resumes from
    `node $S/gate.mjs status --project <p>` and the first missing item, never from chat memory. Exit
    codes and their recovery: media-ai-gen `references/recovery.md`.

## Not on this machine

- **Live ad-account reads** are not offered on this machine yet: the winners adapter reads the
  customer's export through marketing-winner-analysis.
- **A signed-in ad-library session** is not offered on this machine yet: competitors come from the
  customer's statics or a headless screenshot that may be blocked.
- **Uploading to or changing an ad platform** is not part of this method.

## House rules (HR-1.0)

Relies on: HR1 (aspect and format declared per master, measured by `statics.mjs verify` and
media-qc), HR2, HR3, HR4 (resolution, count, web search, generation limit, safety tolerance and
format pinned), HR5 (masters quoted against the budget; the localization total is the review gate's
quote), HR6, HR7 (one regeneration per master moving a named lever; a fresh full brief after a
failed call; no third), HR8, HR9, HR10 (copy and logo composited from files by default), HR11 (every localized
file renders from its approved master), HR12 (brand choice, publish day, continuation, repeat or
explore are gates with defaults; spend past budget and the master review stop the job), HR13
(`statics.mjs verify`, `mediaqc.mjs`), HR14, HR15, HR16, HR17 (generic people only; a real person refused until SL8's consent text is approved), HR18 (claims
only from the brand's product facts), HR19, HR20, HR21, HR22 — see
media-ai-gen/references/house-rules.md.
HR10 is applied over the method (MKT-D492, learnings MKT-L485): the vendor's model letters the
whole ad, while here the headline, proof line, call to action, brand name and logo are composited
by `compose.py` from files over a text-free plate by default, and the real logo is set again on
every localized file (step 22b); model lettering runs only when the brief asks for it, as an HR20
waiver. The safe zones, the 4.5:1 contrast floor and the 18% logo width are SL8 defaults, not
judged on this machine (learnings MKT-L490).
