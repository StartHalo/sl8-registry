# Run contract: folders, records, gates and report

## Contents
- [Run folder](#run-folder)
- [Names and numbering](#names-and-numbering)
- [STATE.md](#statemd)
- [Ledgers](#ledgers)
- [Asset gate](#asset-gate)
- [Folder gate](#folder-gate)
- [Language gate: nine checks](#language-gate-nine-checks)
- [Project gate](#project-gate)
- [Incidents](#incidents)
- [Time, idle and tokens](#time-idle-and-tokens)
- [Final report](#final-report)
- [Blind benchmark](#blind-benchmark)

SL8 wording throughout; the method is JuicyLucy's static-localization and static-image-craft
(proprietary), restated and cited in `adaptations/marketing-ad-localization.json`.

## Run folder

Everything lives under `artifacts/<project>/` (persistent; `work/<project>/` holds only throwaway
crops):

| Path | What | Written by |
|---|---|---|
| `source/` | the customer's ads as supplied, folders and names unchanged; never edited | step 3 |
| `run/project-manifest.json`, `run/manifests/<code>.json` | the locked contract: languages, folders, every source to target name, expected counts and sizes | `loc.py plan` (once) |
| `run/STATE.md` | live state and the resume point | coordinator |
| `run/report.md` | the final report | coordinator |
| `candidates/<code>/<key>/a<N>/` | every attempt as ai-gen downloaded it (`-o` is this directory, one per attempt); `<key>` is the source path under `source/` with `/` as `__` and `.` as `_` | workers |
| `final/<code>/<target folder>/<target name>` | the deliverables; the only files that count; each in its source's format | workers (`loc.py canvas` of an accepted candidate) |
| `qa/<code>/` | `translation-provenance.json`, `retry-ledger.jsonl`, `hashes.txt`, `proof-sheet.png`, `sheets/`, `folder-<n>.json`, `ocr.json`, `ocr/`, `final-qa-report.json`, `FINAL_QA.md`, Track A specs and side-by-sides | workers |
| `manifest.json`, `gates/`, `outcome.json` | media-ai-gen's generation manifest and gate files | `manifest.mjs`, `gate.mjs` |
| `final-plan.json` | `entries[]` of `{id: <code>/<key>, declared: {width, height, format}}` for the HR1 check of the finals | coordinator, from the locked contract |

**Counting rule:** a final is a file directly inside `final/<code>/<target folder>/`. `qa/`,
`run/`, `candidates/`, `source/`, contact sheets and rejected attempts never count. Report the
localized total and the source total separately.

## Names and numbering

- Default: a target keeps its source folder and file name, with only a leading language token
  swapped (`EN - ad1_[2026.10.28].png` → `DE - ad1_[2026.10.28].png`; the token is the source code
  followed by a space, dash, underscore or dot, same case). A name with no leading token is kept as
  it is: the language is carried by `final/<code>/`.
- A kit or brief may supply its own names: `--map map.json` with
  `{"<code>": {"<source folder>": "<target folder>", "<source folder>/<file>": "<target file>"}}`.
- Workspace-wide ad-set numbering (reserving the next global batch number across sibling
  campaigns) is not offered on this machine yet; a kit that owns such a scheme writes the map.
- The contract is locked when `plan` writes it. Expected counts and sizes come from it, never
  from what is in `final/`. `plan` refuses to run twice; a changed request is a new project.

## STATE.md

Sections, kept current after every folder, retry, lane change, limit event and gate:

1. Goal (the coordinator brief from `prompts.json`), languages, expected totals.
2. Paths (absolute).
3. Contract: mode (`strict` or `general`), adaptation on or off, attempt cap (2), Track A
   authorised yes or no (with the customer's words), delivery format.
4. Folder map: source folder, count, language, target folder, owner lane, state.
5. Totals: languages done, folders done, finals saved, image-producing attempts, retries,
   no-output errors, terminal failures, confirmed idle, tokens.
6. Lanes: lane, language, last accepted file, next source file, attempts, capacity state.
7. Incidents: time, lane, event, image produced?, attempt used?, recovery.
8. QA: per language, folders passed, every final viewed or a stated sample, sheets, OCR,
   verify exit, FINAL_QA.md.
9. **Resume here:** reconcile manifests against `final/`; confirm no lane owns the next file;
   the exact language, folder and source file; the next attempt number, from the original.

## Ledgers

- `translation-provenance.json`: one entry per source before its first render: `source`,
  `target`, `headline`, `body`, `cta`, `protected_tokens`, `product_marks` (left as printed),
  `notes` (why a line was shortened or reworded), `locked_at`.
- `retry-ledger.jsonl`: one line per call: `source`, `attempt` (1 or 2, or `none` for a no-output
  error), `request_id`, `result` (`candidate`, `blocked`, `no-output`), `defects` seen, `lever`
  moved for the next attempt, `disposition` (`accepted`, `rejected`, `terminal`, `track-a`).
- `hashes.txt`: `sha256  final/<code>/<folder>/<name>` per accepted final.

## Asset gate

Every item is written as what you saw, never a bare pass (HR14):
- width × height equal the contract exactly (a canvas one or two pixels off, or the model's fixed
  size, is normalised with `loc.py canvas` after the look, then re-measured; a nearby size never
  passes);
- the locked copy, letter for letter: accents, punctuation, brand spelling, protected tokens; no
  word left from the source language, no extra words, no watermark, no stray instructions;
- product-printed marks match the source as printed; prices, legal lines and numbers read
  character by character;
- text readable, balanced, not clipped, inside safe margins; no lettering over any face;
- Track B: no loss of sharpness and no redesign nobody asked for; Track A: no old letters, halos or
  damage outside the text;
- people pass the people check (SKILL.md step 12);
- the file sits at its planned name; its hash is in `hashes.txt`; its row is in the ledger.

If nothing passes, report the limitation; never present a weak render as finished.

## Folder gate

After each target folder: the source and target name sets match; the count equals the contract;
no hash repeats; `loc.py sheets` is regenerated and every tile looked at (tiles are shrunk, so
edges, clipping and margins are judged on the full files); `qa/<code>/folder-<n>.json` written
(`folder`, `count`, `expected`, `duplicates`, `tiles_reviewed`, `issues`); the lane reports to the
coordinator before moving on.

## Language gate: nine checks

1. The folder set equals the contract.
2. Each folder holds its expected count.
3. Source and target names match one to one after the token swap.
4. Every final passed the asset gate (`loc.py verify` covers size, mode, decode, decoded format equals the extension, file size).
5. No duplicate hashes.
6. OCR lines checked against the image and the locked copy (a lead only).
7. Every final looked at, or the sample stated as a sample.
8. Every folder's contact sheet looked at.
9. Natural copy in the right script and letters, exact brand spelling, safe margins, fidelity to
   the source, a clear call to action.

`FINAL_QA.md` records the nine with evidence paths, plus time, OCR status, the retry ledger
summary and the sheets.

## Project gate

`loc.py verify-project run/project-manifest.json --report qa/overall-final-qa-report.json`
re-runs every language, checks hashes across languages and the language, folder and image totals
(all three expected values must be filled from the request; a missing one fails). Then count
`final/` yourself and compare with the manifest; a worker's message is never the count.

## Incidents

| What you see | What it is | Do |
|---|---|---|
| "too many concurrent requests" after adding a lane | the account's request ceiling | save checkpoints, pause the newest lane, go back to the last steady lane count, keep checking on healthy lanes, write it down |
| 429, 503 or a transport error with no image | a no-output error | log it apart from attempts; retry the same call once the service answers (`ai-gen result <id>` first if a request id exists) |
| a lane's session ends mid-folder | transport; files may be complete | reconcile files, hashes and ledgers before giving the work to anyone |
| a tracker or message disagrees with the folders | lag | trust the folders and the name map; update the tracker |
| OCR fails or returns no lines | engine or language pack missing | keep the raw output; judge the full image and the sheet by eye |
| OCR misreads accents or non-Latin letters | a lead, not proof | compare the image with the locked copy; do not reject on low confidence alone |
| a long render finishes normally | work | active time, not idle |
| more lanes throttle, fewer hold | the ceiling found | keep the steady count |
| the sandbox is about to end | lifetime | checkpoint and stop at a folder boundary; the next session resumes |
| a final will not open | incomplete write | redo the copy from its candidate; never hand off until every final decodes |

## Time, idle and tokens

Start at the first persistent production action; end when the last language gate passes. Idle is
only time a lane could not progress because a model or service refused; pauses, renders and QA
are not idle. Tokens: the exact runtime figure, else `Unavailable from runtime`.

## Final report

`run/report.md` and the reply, from files only: languages, folders, finals (localized total, then
the source total), image-producing attempts, retries, no-output errors, terminal failures with
their reasons, Track A uses, capacity incidents, confirmed idle, tokens, credits spent against the
quote, open gates, and whether an upload comparison was made (final, in progress, or not asked).
Keep final names stable through upload: they are the key that joins later results.

## Blind benchmark

Optional; for a new script, market or model when a human-made localization of the same ads exists.
- The human folder stays closed until the end: say so in the brief, give the bot a deny rule on it,
  and lock what was generated: `loc.py hashlock write final/ --out run/benchmark-lock.json` before
  opening it, `loc.py hashlock verify run/benchmark-lock.json` before scoring (a mismatch voids the
  run).
- One grid per source: source, one column per technique, human last (`montage` from ImageMagick 6
  or a Pillow grid), labelled with the source name.
- Score each machine output 1 to 4 against the human on six things: background fidelity, layout
  fidelity, text accuracy for the script, typography match, brand elements kept, ready to ship.
  Quality Index = total ÷ maximum × 100: 75 or more SHIP, 60 to 74 TWEAK, under 60 KILL.
- The report per technique: verdict, failure modes, copy risks, time, credits, and the projected
  cost and time for one folder in one language. A clear negative verdict is a result.
