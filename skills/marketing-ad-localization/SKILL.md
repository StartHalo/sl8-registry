---
name: marketing-ad-localization
description: >-
  Localized static ads: a customer's image ads remade in each target language, every one a fresh
  render from its own original (Nano Banana Pro edit by default) with locked target copy, filed
  under the source's folders and names. Two attempts per ad, a people check, a text-only retype
  fallback that keeps the source pixels when the customer agrees, and checks per ad, folder,
  language and project with verifier scripts, OCR as a lead. Use when:
  localize or translate static ads, banners or social image ads, adapt an image ad set for a new
  market, redo one ad in another language, or resume a run. NOT for: video ads or dubbing
  (voice-dub); video captions (edit-captions); a new ad from a brief (marketing-branded-graphic,
  marketing-campaign-pack); remaking a reference ad (marketing-ad-remake); brand capture
  (marketing-brand-kit); picking winners (marketing-winner-analysis); product presets
  (image-product-presets); photo edits (media-photo-editing); ai-gen use (media-ai-gen); file
  checks (media-qc).
license: SL8 wording and SL8-authored scripts; method from JuicyLucy static-localization and static-image-craft (proprietary), restated and cited; points from Creative Claw (Apache-2.0), fal and Higgsfield
compatibility: "marketing-studio >=1.0.0 (sl8-video 1.5.0, sl8-image 1.5.0, Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; python3 3.11 with Pillow 11 (libraqm via harfbuzz), numpy, opencv; tesseract with per-language packs; imagemagick 6.9; fonts and fonts-noto packs; fal endpoints as of 2026-10-27"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [juicylucy-ads/staticlocalization-916db0, juicylucy-ads/staticimagecraft-1841a5, creative-claw/cc-image-model-guides, fal/charactersheet-a2ae87, higgsfield/product-image-presets]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27)
  approach: WF02-a1
  attribution: Method from the SL8 capability assessment (WF02-a1), restated from JuicyLucy's static localization skills with points from Creative Claw (Apache-2.0), fal and Higgsfield; scripts written by SL8 from the described behaviour
  deltas: MKT-D300..MKT-D319
---

# Localized static ads

Each supplied static ad is remade in every target language, keeping what made it work. Every
attempt is a whole new render from that ad's original, never from a rejected render; only the
language changes (or, when asked, the market's scene). Names and counts are locked before anything
is made, and the folders, not messages, are the record.

Nothing in this method has run on an SL8 Studio. The render prompt is SL8's (the vendor rendered
with its own host tool and published none), and Nano Banana Pro's lettering in Devanagari, Kazakh,
Chinese, Japanese, Korean and right-to-left scripts is unmeasured: treat a first campaign in a new
script as a test (step 23).

```bash
L=$HOME/.agents/skills/marketing-ad-localization/scripts
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
R=$HOME/.agents/skills/marketing-ad-localization/references   # contract.md, scripts.md, prompts.json, languages.json
python3 $L/loc.py plan|crops|canvas|verify|verify-project|sheets|ocr|proof|reconcile|hashlock …
python3 $L/track_a.py boxes|retype …
```

Both scripts exit 0 pass or written, 1 a failed check or refusal, 2 a missing tool or library
(the machine is broken: report it, never install, HR21).

## What a request needs

- **The ads:** still images (PNG, JPEG or WebP) in one folder or in batch folders one level deep
  (`plan` refuses images below that), at full resolution. A video is not this skill (step 2).
  Each final keeps its source's format (a JPEG ad is delivered as JPEG).
- **Target languages** (codes from `references/languages.json`, or a kit's own table with the same
  keys) and the source language.
- **The brand:** what may be claimed and which words stay in Latin letters untranslated (a brand kit
  from marketing-brand-kit, or the customer's files).
- **Optional:** strict mode words ("fresh generation", "from zero", "source-only", "redo from
  scratch", "do not edit failed outputs", a two-attempt limit); cultural adaptation for a market;
  Track A allowed in advance; ready-made translations (a table of copy per ad and language);
  exact canvas sizes; a budget.

## Run modes

- **Campaign** (default): steps 1 to 21.
- **Single ad, no batch** (one ad, one or a few languages): steps 1, 3 (`plan` works on one
  file, so the contract, target name, size and `final/` path exist), 4 to 15 without lanes; the
  quote of step 5 still runs; no folder, language or project gates.
- **Resume**: step 17, then on from the recorded next file.

## Steps (WF02-a1)

1. **Brand and conventions first.** One brand kit: use it. Several and the brief does not say which:
   open a gate and end `partial` before anything is spent (HR12). The full command:
   `node $S/gate.mjs open --project <p> --slug which-brand --question "<which brand kit?>" --options '[{"id":"a","label":"<kit A>"},{"id":"b","label":"<kit B>"}]' --resume-at "step 1" --kind spend`
   (a spend-kind gate stops the run until answered). None: capture it with marketing-brand-kit
   from the customer's material, then continue. Claims come only from the brand's product facts;
   the untranslated Latin tokens and the benefit to stress come from its copy rules (HR18). The run's
   conventions are `references/contract.md` and `references/languages.json` unless a kit supplies
   its own; if a supplied file cannot be read, open a gate (same command, own slug and options)
   and stop: never work from memory.
2. **Stills only.** Every source must be a still image. A video ad (same footage per language, only
   its overlay text localized, soundtrack kept) is not this method: say so and name voice-dub or
   edit-captions.
3. **Lock the contract.** `node $S/manifest.mjs init --project <p>`; copy the ads, folders and names
   unchanged, to `artifacts/<p>/source/`; then
   `python3 $L/loc.py plan --source-root artifacts/<p>/source --source-code <xx> --targets <a,b,…> --project-dir artifacts/<p> [--map <kit map>] [--width W --height H] [--min-bytes N --mode RGB]`.
   Set `--min-bytes` from the smallest plausible final (the default 50,000 is a large portrait PNG's
   floor and fails small JPEG or flat ads) and `--mode` from the sources (`RGB`; a source with an
   alpha or palette mode is converted to `RGB` on a stated background in step 15).
   It inventories folders and sorted names, maps every source to its target folder and name
   (only the leading language token changes), records each target's exact size, fills every
   expected count from the inventory, creates the folders and refuses a second run. Workspace-wide
   ad-set numbering across sibling campaigns is **not offered on this machine yet** (a kit that has
   such a scheme writes the `--map`). **Item key:** `<key>` is the source's path under `source/`
   with `/` replaced by `__` and `.` by `_` (`FolderA__ad1_png`; a flat set: `ad1_png`); every work
   file, candidate folder, ledger entry and manifest `item` uses it, so two folders that both hold
   `ad1.png` never collide. Then write `run/STATE.md` (contract.md § STATE.md): the
   customer problem and the action wanted, the mapping, and the mode of step 4.
4. **Mode and track.** Track B (a fresh render of the whole ad) always comes first; Track A (keep the
   source pixels, replace only the letters, step 14) is a fallback. The strict words above switch on
   strict mode and forbid Track A entirely when they say fresh only. Cultural adaptation, when asked,
   may change buildings, people, vehicles, clothing, weather and street detail but keeps each
   element's role and the message order. The attempt cap is **2 image-producing attempts per ad in
   every mode** (HR7); the source's general-mode third attempt runs only on the customer's explicit
   instruction, recorded as a waiver (HR20). Write mode, adaptation, cap and Track A permission
   (with the customer's words) into STATE.md before production. The delivery format is the
   source's: png, jpeg or webp by its extension (`<fmt>` below).
5. **Quote, then lanes.** Quote the worst case before the first render (HR5):
   `ai-gen estimate fal-ai/nano-banana-pro/edit --params-file <one params file from step 8> --format json`
   gives the `<call estimate>`; the `<campaign quote>` is that × ads × languages × 2. Known result (facts `price-nbp`, 2026-10-05): 37.5 cr per image at 1K or
   2K, 75 at 4K. Compare the campaign quote with `node $S/manifest.mjs budget --project <p>`; over
   it or no budget known: `node $S/gate.mjs open --project <p> --slug spend --question "<ads> x <languages> x 2 renders, up to <campaign quote> credits; go?" --options '[{"id":"a","label":"Go","credits":<campaign quote>},{"id":"b","label":"Stop","credits":0}]' --resume-at "step 6" --quote <campaign quote>`
   and end `partial`. Then one language per lane: the
   coordinator (this session) owns the contract, STATE.md, the report and the last checks, and keeps
   one language itself; each other language goes to one worker started with the Agent tool and the
   `worker-brief` row of `references/prompts.json`; a freed lane takes the next untouched language
   or audits read-only. Never two writers on one language, folder, ledger or report. Start with two
   rendering lanes; add one only after a folder passes; on a concurrency error, pause the newest,
   return to the last steady count and log it (contract.md § Incidents). Right-to-left languages
   always get their own lane. On Codex or Pi (no Agent tool) the coordinator runs the languages one
   after another.
6. **Per ad, in name order: read it, then lock the copy.** `python3 $L/loc.py crops <source> --out work/<p>/crops/<key>`
   and read the whole ad and every crop (a whole-image read alone is downscaled). Note the scene,
   subject and object count, crop, palette, hierarchy, call to action, any checkbox or interface
   state, brand treatment and the exact message. Split the text into ad copy (localized) and marks
   printed on the product or pack (kept exactly as printed, unreadable glyphs as their shapes).
   Write concise, natural copy for the source's promise and the target market rather than a word
   for word translation, keeping protected tokens and numbers; use the customer's translations when
   supplied. A separate static-ad copywriting method is **not offered on this machine yet**: this
   step is the copy method. Plan the layout per language (`references/scripts.md` § Layout rules):
   shorten copy before shrinking type, keep every face clear. Record it in
   `qa/<code>/translation-provenance.json` before the first render.
7. **Proof sheet per script** (every non-Latin script, and Latin with accents the source lacks):
   `references/scripts.md` § Proof sheet. Check `features.check('raqm')` first; `False` stops proof
   sheets and Track A for complex scripts on this run; say so in STATE.md.
8. **Track B render.** Write `work/<p>/<code>/<key>.prompt.txt` from the `render` row of
   `references/prompts.json` (plus `adaptation` when asked; list **every** localized string the ad
   carries, headline, body, call to action, price, URL or handle, legal line, date, small tagline,
   each quoted with one type note, strings kept identical on purpose included; never a font name),
   then the params file `work/<p>/<code>/<key>.params.json` with `prompt` (the file's text), `aspect_ratio`,
   `resolution` `"2K"` (`"4K"`, 75 cr quoted, when the source's long edge is above 2048 px; otherwise
   state the 2048 px cap in STATE.md), `num_images` 1, and every default-on flag pinned at its default
   (`enable_web_search` false, `limit_generations` true, `safety_tolerance` `"4"`, `output_format`
   `"png"` if the schema lists it; HR4; facts `schema-nb-flags`). `aspect_ratio` takes only the
   schema's listed values (facts `schema-nbp-aspect`): read them with the raw OpenAPI printer once a
   session (HR2) and pick the **nearest** to the source's width ÷ height; step 15 restores the exact
   canvas. When the nearest ratio differs from the source's by more than 2 percent, add the
   `[EDGE MARGIN]` clause of `render` (keep text and key objects away from the edges) and look for
   edge clipping after step 15's crop. Run:
   `ai-gen image -m fal-ai/nano-banana-pro/edit --ref artifacts/<p>/source/<folder>/<file> --params-file work/<p>/<code>/<key>.params.json -o artifacts/<p>/candidates/<code>/<key>/a<N>/ --queue --strict-params --max-cost <call estimate> --format json > work/<p>/<code>/<key>.a<N>.json`
   (`--ref` fills `image_urls`, which the edit takes; `--image` would fill `image_url` and fail; `-o`
   is a directory). Then
   `node $S/manifest.mjs add --project <p> --result work/<p>/<code>/<key>.a<N>.json --params work/<p>/<code>/<key>.params.json --json '{"item":"<code>/<key>","node":"candidates","declared":{"width":W,"height":H,"format":"<fmt>"},"credits":{"estimate":<call estimate>},"parents":["source/<folder>/<file>"]}'`
   (HR9; the attempt number is set by the script, and attempt 2 adds `"lever":"<clause>"`, step 10;
   `declared` is the final's contract, which the candidate meets only after step 15). Default: `fal-ai/nano-banana-pro/edit` at 2K; a kit or brief may name another. The
   original is the only reference on every attempt, strict or not (HR11); keep a person recognisably
   the same across one concept's languages; an approved output may join as a second `--ref` only
   when the brief asks for it. Never fix a lettering problem by changing the idea. Read the
   candidate at 100% (crops) before it counts.
9. **Count attempts honestly.** An attempt is a call that came back with an image or with a safety
   refusal. A 429, 503, circuit-open or transport error with no image uses no attempt: log it apart
   and retry the same call when the service answers (if a request id exists, `ai-gen result <id>`
   first, HR6). Every call gets a line in `qa/<code>/retry-ledger.jsonl` (contract.md § Ledgers), the attempt's
   folder `a<N>` named in it. Only image-producing calls and refusals get a manifest row (step 11);
   a no-output error never does, or it would burn the cap.
   Never accept an image because the call succeeded; keep the best valid one.
10. **Defect retry** (an image came back with a fixable fault). Check, in order: spelling, accents,
    punctuation, natural phrasing; missing, doubled or invented words; clipping, overflow,
    alignment, hierarchy, contrast; identity, anatomy, pose, clothing, landmark and object fidelity;
    background, light, colour, crop, aspect drift; anything over a face; synthetic, painterly, waxy,
    embossed, noisy or soft texture. The second attempt adds **one** clause from the `defect-retry`
    row for the worst fault (the lever, HR7), on a new render from the original. Prices, legal lines
    and numbers that are wrong are regenerated, never accepted.
11. **Safety refusal.** Retry only that ad, once, within the cap: the original as reference, the same
    picture with only the language changed, person, pose, clothing, framing, background, light, crop
    and colours named as kept, and needless descriptions of people replaced by the
    `moderation-retry` row. Never raise `safety_tolerance`, disguise the request, or probe the
    filter; doing your best means using the faithful attempts, nothing more. How a refusal surfaces
    through ai-gen is not yet recorded (no content-filter exit code): log the error text as `blocked`
    and record the attempt with a failed row so the manifest counts it:
    `node $S/manifest.mjs add --project <p> --params work/<p>/<code>/<key>.params.json --json '{"item":"<code>/<key>","node":"candidates","endpoint":"fal-ai/nano-banana-pro/edit","request_id":null,"status":"failed","declared":{"width":W,"height":H,"format":"<fmt>"},"credits":{"estimate":<call estimate>},"error":"<error text>"}'`;
    the retry row then carries `"lever":"moderation-retry"`.
12. **People check** (any ad with people), on 100% crops of faces and hands: natural asymmetry,
    pores and skin texture, separate hair strands, lifelike eyes and teeth, correct hands and
    fingers; reject plastic or filtered skin, uncanny features, malformed fingers, heavy blur,
    generic backgrounds, and keep fabric, signs, props and light sharp. A right name and right words
    do not finish an ad with synthetic-looking people. Under preservation the redo is again from the
    original (it is attempt 2); only an adaptation run may replace the person:
    Default: `fal-ai/nano-banana-pro/edit` from the original with the `people-regenerate` row; the
    source names text-to-image `fal-ai/nano-banana-pro` for a whole new subject and scene; a kit or
    brief may name another. Generic people only, never a real person (HR17). An ad that shows an identifiable real
    person (a named spokesperson, a celebrity, a testimonial) is not remade until SL8's consent text
    and privacy note are approved (learnings MKT-L318): list it as undelivered with that reason.
13. **When Track B cannot pass** (two rejected attempts, or a refusal at the cap): the ad is a
    terminal failure unless Track A was allowed in advance and the contract is not fresh-only. Not
    allowed in advance and not fresh-only: open a gate with the `track-a-question` row
    (`node $S/gate.mjs open --kind text --default b --project <p> --slug track-a-<key> --question "<row text>" --options '[{"id":"a","label":"Use Track A"},{"id":"b","label":"Leave undelivered"}]' --resume-at "step 14 for <file>"`;
   it does not stop the run), record the ad as
    terminal for now, carry on with the rest, and list it in the delivery. A later message that
    answers `a` runs step 14 for it. Record the customer's words in STATE.md.
14. **Track A retype** (always from the original, never from a Track B render). Propose boxes with
    `python3 $L/track_a.py boxes <source> --langs <the source language's tesseract pack>+eng --out qa/<code>/<key>.spec.json`
   (the boxes find the **source's** letters; with no such pack, draw them by eye), then
    correct them by eye: one tight box per text block, `exclude` rectangles for faces, clothing
    edges, emoji, bullets and ornaments; fill `text` (the locked copy, `\n` between lines), `font`
    (matching class, weight, width; `fc-list` per references/scripts.md), `size`, `color`, `align`,
    `line_spacing`, `direction`. Run
    `python3 $L/track_a.py retype <source> --spec qa/<code>/<key>.spec.json --out artifacts/<p>/candidates/<code>/<key>/track-a/track-a.png --side-by-side qa/<code>/<key>.sbs.png`
   (create the `track-a/` folder first).
    It masks only letter pixels (dilated 2 px), inpaints them (radius 3), draws shaped text, saves a
    lossless PNG at the source size and mode, and fails if text overflows (shorten the copy first)
    or any pixel outside the boxes changed. Look at the side-by-side at 100% for halos, ghost
    letters, smears, repeated texture and damaged edges. Track A costs no credits and is usually
    sharper than Track B; its risk is around the old letters.
15. **Ad gate and filing.** Run the asset gate (contract.md § Asset gate) on the candidate of the
    named attempt (`candidates/<code>/<key>/a<N>/`, or `track-a/`) and write what you saw. Then
    write the final with one command, which sets the exact size and the target name's format
    (PNG, JPEG at quality 95 or WebP; an alpha or palette source becomes RGB):
    `python3 $L/loc.py canvas <accepted candidate file> --width W --height H --out artifacts/<p>/final/<code>/<target folder>/<target name>`.
    It re-measures and prints how many pixels it cropped: look at the final again if it cropped
    (edge text, margins). Leave the candidate in place. Append `sha256sum` to `qa/<code>/hashes.txt`,
    mark that attempt `accepted` in `retry-ledger.jsonl` (the other `rejected`), update STATE.md.
    Save at once: a closed session must lose nothing.
16. **Folder gate** after each target folder (contract.md § Folder gate):
    `python3 $L/loc.py sheets artifacts/<p>/final/<code> --output artifacts/<p>/qa/<code>/sheets` and
    look at every tile; then report to the coordinator before the next folder.
17. **Resume.** Never from chat memory. `node $S/gate.mjs status --project <p>` first; read STATE.md
    § Resume here; list what `final/` holds against `run/manifests/*.json`; queue only the missing
    targets; keep the same prompt, original, language and name; fetch any pending request id with
    `ai-gen result` before submitting; report recovered and missing totals before rendering.
18. **Incidents and live state.** Act on contract.md § Incidents and update STATE.md after each
    folder, retry, lane change, limit event and gate. A concurrency error is the account's request
    ceiling, not exhausted tokens. Time and idle: contract.md § Time. The sandbox's lifetime replaces
    the vendor's keep-awake rule: checkpoint at folder boundaries so a recycled sandbox resumes
    (step 17); never force a restart mid-run.
19. **Language gate** when a language is done:
    `python3 $L/loc.py ocr artifacts/<p>/final/<code> --langs eng+<tess> --output artifacts/<p>/qa/<code>/ocr.json --tsv-dir artifacts/<p>/qa/<code>/ocr`
    (missing pack in `tesseract --list-langs`: OCR unavailable for that language, recorded, not a
    failure; no lines is not a failure; Cyrillic on a Cyrillic target is not leftover source text),
    adjudicate every line by eye, then
    `python3 $L/loc.py verify artifacts/<p>/run/manifests/<code>.json --report artifacts/<p>/qa/<code>/final-qa-report.json`
    (folder set, counts, name map, decode, decoded format equals the extension, mode, exact size from the contract, size floor
    `min_bytes`, duplicate hashes, total; exit 0 only when all pass), the nine checks and
    `FINAL_QA.md` (contract.md § Language gate). Say whether every final was looked at or a sample.
    A failure is fixed in the files, never by loosening the manifest.
20. **Project gate** before hand-off: `loc.py verify-project` (contract.md § Project gate), your own
    count of `final/`, and the HR1 size check per final. The manifest names candidates, not finals,
    so write `artifacts/<p>/final-plan.json` once from the locked contract (one entry per target:
    `{"id":"<code>/<key>","declared":{"width":W,"height":H,"format":"<fmt>"}}`, an `entries` array)
    and run `node $Q declared --plan artifacts/<p>/final-plan.json --id <code>/<key> --file <that final>`
    for each (Track A finals use the same entry; add a `manifest.mjs add` row with `"tool":"track_a"`
    for them too). Never declare done from workers' reports.
21. **Report.** `run/report.md` and the reply (contract.md § Final report): the finals by language
    and folder, attempts, terminal failures, Track A uses, open gates, credits against the quote.
    An upload comparison runs only on a customer-supplied export, after the upload has finished:
    `python3 $L/loc.py reconcile artifacts/<p>/run/project-manifest.json --export <csv> --column <filename column>`;
    a direct ad-platform uploader is **not offered on this machine yet**.
22. **After launch** (a later run, optional). Results join on the stable final names; picking
    winners from an ad export is marketing-winner-analysis. From its findings: no winner before the
    evidence threshold the customer sets (none is given by the method); never compare languages with
    different audiences, budgets, placements or optimisation events as one test; a low performer
    with unreadable copy is a production defect, not a verdict on its angle; supported learnings go
    to the brand's standing copy rules, dated evidence to its history. The goal is profitable
    acquisition, not more ads.
23. **Blind benchmark** (optional; a new script, market or model, with a human localization of the
    same ads): contract.md § Blind benchmark. Techniques can include Track B on
    `fal-ai/nano-banana-pro/edit`, `openai/gpt-image-2/edit`, `bytedance/seedream/v5/lite/edit`
    (the catalog id; facts `schema-seedream-id`) and Track A; quote every one first (HR5).

## House rules (HR-1.0)

Relies on: HR1 (each final's size and format declared from the contract and measured by
`loc.py verify` and media-qc), HR2 (`aspect_ratio` values read from the raw OpenAPI), HR3, HR4
(resolution, image count, web search, generation limit, safety tolerance and format pinned), HR5
(the campaign's worst case quoted and checked against the budget before the first render), HR6,
HR7 (two attempts, the second moves one named lever; then Track A behind a gate, or a terminal
failure), HR8, HR9, HR11 (every attempt renders from the original), HR12 (brand choice, unreadable
conventions and spend are gates; Track A is a text gate defaulting to no), HR13 (`loc.py verify`,
`verify-project`, `track_a.py retype` exit non-zero), HR14 (the asset gate is written as observations),
HR15 (terminal failures and open gates are named in the hand-off), HR16 (no rewriting field is set),
HR17, HR18 (claims only from the brand's facts), HR19, HR20 (a third attempt only by the customer's
explicit instruction), HR21, HR22 — see media-ai-gen/references/house-rules.md.
Departs by method from HR10 (owner decision pending, learnings MKT-L304): Track B sends the localized
headline, body and call to action through the edit model, because the method redraws the whole ad;
steps 10, 15 and 19 are the control, and Track A (deterministic lettering) is the faithful
alternative behind the customer's agreement.
