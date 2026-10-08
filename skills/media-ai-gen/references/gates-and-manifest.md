# Gates and manifest: the shared data contracts

Every media skill on this machine writes the same project folder, the same manifest and the same gate
files, through `scripts/manifest.mjs` and `scripts/gate.mjs`. This file is their contract. Below,
`$S` is `$HOME/.agents/skills/media-ai-gen/scripts`.

## Contents
- [The project folder](#the-project-folder)
- [The manifest](#the-manifest)
  - [Asset row](#asset-row)
  - [Worked rows](#worked-rows)
- [plan.json: the timing contract](#planjson-the-timing-contract)
- [Gate files and the partial stop](#gate-files-and-the-partial-stop)
  - [Resume protocol](#resume-protocol)
- [Waivers](#waivers)
- [PROGRESS.md](#progressmd)

## The project folder

`artifacts/<project>/` persists between jobs and is what the person sees; `work/<project>/` is
scratch and is lost. `<project>` is kebab-case, derived from the project or brief name.

```
artifacts/<project>/
  manifest.json            # the index: file → endpoint, request id, prompt, credits, sha256
  PROGRESS.md              # where the project stands (skeleton below)
  plan.json                # declared output and, for video, the timing contract
  gates/01-<slug>.json|md  # open or answered gates
  final/  clips/  keyframes/  source/     # named folders by role, never a flat dump
work/<project>/            # params files, result envelopes, probes, frames
```

All the files must land in **named folders by role**: `final/` the finished, deliverable outputs;
`clips/` intermediate per-scene or per-shot clips; `keyframes/` stills or scene frames feeding the
clips; `source/` input references, uploads, brand assets, logos. **Split folders along whatever axis
the project actually varies on**: languages (`clips_en/ clips_fr/`), platform (`final_9x16/
final_16x9/`), variant (`variant_a/ variant_b/`); only fork the folders that actually differ per
axis. Inputs the person uploaded stay in `artifacts/attachments/` and are never overwritten; copy
what you reference into `source/`.

## The manifest

`artifacts/<project>/manifest.json`, schema `sl8.media.manifest/1`. Written only by
`manifest.mjs`, never by hand: `init` creates it, `add` appends or updates one row per generation,
`waive` records waivers, `gate.mjs` keeps the gate index, `verify` re-hashes every file.

```json
{
  "schema": "sl8.media.manifest/1",
  "project": "acme-mug-hero",
  "created_at": "2026-10-05T09:00:00.000Z",
  "updated_at": "2026-10-05T09:20:00.000Z",
  "assets": [],
  "gates": [{ "id": "01", "slug": "approve-clips", "status": "answered", "file": "gates/01-approve-clips.json" }],
  "waivers": [{ "rule": "HR12", "gate": "02", "instruction": "run straight through, do not pause", "cost": null, "at": "…" }]
}
```

### Asset row

One row per generation (HR9), including failed attempts. `add --result <envelope> --params <file>`
fills the fields marked *auto* from ai-gen's JSON; you supply the rest with `--json`.

| Field | Required | Source | Meaning |
|---|---|---|---|
| `item` | yes | you | The logical asset (`hero`, `shot-03`); retries share it |
| `node` | yes | you | The folder under the project (`keyframes`, `final_9x16`) |
| `endpoint` | one of these two | *auto* (`model`) | The fal endpoint that ran |
| `tool` | | you | A local step instead (`ffmpeg …`, `convert …`, `python3 grade.py`) |
| `request_id` | yes for `endpoint` | *auto* | `null` only for a sync call (no id exists) |
| `mode` | | *auto* | `sync`, `queue` or `async` |
| `params` / `params_file` | yes for `endpoint` | *auto* (`--params`) | Exactly what was sent |
| `prompt` | | *auto* from `params.prompt` | The prompt as sent |
| `prompt_rewritten` | when the route returns one | you, from `raw` | The rewriter's version (HR16) |
| `declared` | yes | you, from `plan.json` | What the output must be: size, aspect, duration, fps, audio, format (HR1) |
| `measured` | after QC | you, from media-qc | The figures media-qc printed |
| `credits.estimate` | yes for `endpoint` | you | The `ai-gen estimate` figure; `null` if unpriced |
| `credits.used` / `credits.basis` | | *auto* | ai-gen's `credits_used` and `credits_basis` |
| `credits.ledger` | | *auto* from `SL8_SPEND_LEDGER` | What the run's ledger recorded for this request id |
| `attempt` | | *auto* | 1, 2, … per `item`. A third on the same route is refused (HR7) |
| `lever` | yes when `attempt` > 1 | you | The one lever the retry moved (prompt clause, reference, route, duration) |
| `parents` | | you | Row ids or files this was made from (edit from the original, HR11) |
| `files` | yes unless `pending`/`failed` | *auto* (`files[].local_path`) | Hashed by `add`: `{path, sha256, bytes}`, path relative to the project |
| `status` | | *auto*/you | `done`, `pending` (async, not fetched), `failed`, `rejected`, `accepted` |
| `debts` | | you | What is still owed on this file (HR15) |
| `notes` | | you | Free text: a failed attempt's exit code and error code, a continuity note |
| `waiver` | | you | The user's words when they ordered a third attempt (HR20) |

A row with the same non-null `request_id` as an existing row **updates** it: that is how an async
`pending` row becomes `done` when `ai-gen result` fetches it.

### Worked rows

Image, queued, first attempt:

```json
{"id":"hero#1","item":"hero","node":"keyframes","endpoint":"fal-ai/nano-banana-pro","request_id":"8f2c…","mode":"queue",
 "params":{"prompt":"a white ceramic mug on oak, morning window light","aspect_ratio":"16:9","resolution":"1K","num_images":1},
 "params_file":"work/acme-mug-hero/hero.params.json","prompt":"a white ceramic mug on oak, morning window light",
 "declared":{"aspect":"16:9","width":1376,"height":768,"format":"png"},"measured":{"width":1376,"height":768},
 "credits":{"estimate":38,"used":38,"basis":"result","ledger":38},"attempt":1,"parents":["source/mug.png"],
 "files":[{"path":"keyframes/nano-banana-pro-2026-10-05T09-12-03-120Z.png","sha256":"77684a…","bytes":1843120}],
 "status":"done","at":"2026-10-05T09:12:09.000Z"}
```

The retry of the same item names its lever: `{"item":"hero","attempt":2,"lever":"prompt: 'empty
counter' replaces 'no clutter'", …}`. A local step records the tool and its parents:
`{"item":"hero-cutout","node":"final","tool":"convert hero.png -fuzz 4% -trim","parents":["hero#2"],"declared":{"format":"png","alpha":true},"files":["final/hero-cutout.png"]}`.
An async video starts `{"item":"shot-1","node":"clips","status":"pending","request_id":"c41a…",
"files":[]…}` and the `add --result` after `ai-gen result` turns it `done` with its files and credits.

## plan.json: the timing contract

Reference only on the Image machine: a still job writes `declared` and the budget; the video
production skill on the Video machine fills `rows`. One shape, so nothing tells plans apart by field
shape.

```json
{"schema":"sl8.media.plan/1","project":"acme-mug-hero",
 "declared":{"aspect":"9:16","width":1080,"height":1920,"fps":24,"duration_s":10,"audio":"vo+bed"},
 "budget":{"credits":250,"approved_by":"brief"},
 "rows":[{"n":1,"start":0,"dur":3.5,"render_dur":4,"route":"bytedance/seedance-2.0/fast/image-to-video",
          "action":"steam rises from the mug","look":"morning window light; inherits nothing",
          "vo":"Start slow.","vo_words":2,"vo_start":0.9,"overlay":""}]}
```

| Field | Meaning |
|---|---|
| `n` | shot number, the handle the user reshoots by |
| `start`, `dur` | its window in the finished cut, in seconds. **`dur` must be renderable** |
| `render_dur` | what the route will actually return, which is usually longer than `dur`; measured with ffprobe after render |
| `action` | **exactly one** physical beat |
| `look` | lighting, grade and time of day, **and what it inherits from the row above** |
| `vo`, `vo_words` | the script fragment for this shot, and its word budget for `dur` |
| `vo_start` | where this fragment's audio actually starts: **not** the same as `start` |
| `overlay` | text **and any image asset** burned over this window, or empty |

The quote uses `render_dur`: you pay for the rendered seconds and use `dur`.

## Gate files and the partial stop

Jobs run headless: nobody can answer a question inside one. So:
- **A text-only choice** (tone, a crop, which of two framings) proceeds on a stated default and the
  delivery flags it. If you want it on record, `gate.mjs open --kind text --default <id>` writes it
  without stopping, writes no `outcome.json`, and never stops a later job either: `status` lists it
  under `open_text` with its default and exits 0.
- **A spend the brief did not approve** (a step past the budget or the remaining ceiling, an unpriced
  paid route, a second failure with no fallback) opens a spend gate and the job stops `partial`.
  Nothing further is spent; the work so far is delivered.

```bash
node $S/gate.mjs open --project acme-mug-hero --slug approve-clips \
  --question "Render two 4 s clips at 480p from the approved stills?" \
  --options '[{"id":"a","label":"Render both clips","credits":216},{"id":"b","label":"Stop with the stills","credits":0}]' \
  --resume-at "step 4: render clips from keyframes/" --quote 216
```

This writes `artifacts/<project>/gates/01-approve-clips.json` and `.md`, indexes the gate in the
manifest, and writes `artifacts/<project>/outcome.json` `{"status": "partial", "reason": "Stopped at gate 01 …"}`
(it persists with the project; `--outcome` overrides). The gate JSON:

```json
{"schema":"sl8.media.gate/1","id":"01","slug":"approve-clips","project":"acme-mug-hero","kind":"spend",
 "status":"open","question":"Render two 4 s clips at 480p from the approved stills?",
 "options":[{"id":"a","label":"Render both clips","credits":216},{"id":"b","label":"Stop with the stills","credits":0}],
 "quote":{"credits":216,"remaining":180},"default":null,"no_answer":"stop",
 "resume_at":"step 4: render clips from keyframes/","opened_at":"…","answer":null,"waiver":null}
```

Then end the job: finish PROGRESS.md (the gate goes under Known gaps and Next steps) and do not
overwrite `outcome.json` with anything but `partial`.

### Resume protocol

1. **First command of every job on an existing project:** `gate.mjs status --project <p>`.
   Exit 10 = a **spend** gate is open and unanswered (listed under `open`); exit 0 = no spend gate
   is open, with `resume_at` from the last answered or waived gate. **An open text gate never
   stops a job:** exit 0 lists it under `open_text` with its `default`; proceed on that default and
   flag it in the delivery (HR12).
   **A job never answers or waives its own spend gate:** `gate.mjs answer` (1.0.2) and `gate.mjs waive`
   (1.0.3) refuse the job run that opened it (they compare `SL8_SPEND_LEDGER` with the gate's
   `opened_by_run`). The owner answers outside any job, or the next job records the answer its brief
   carries. Changing or unsetting `SL8_SPEND_LEDGER` inside the job is not caught by the script; HR12
   forbids it all the same.

   ```json
   {"open":[],"open_text":[{"id":"02","slug":"tone","kind":"text","question":"Tone?","default":"warm","resume_at":"step 2","answer":null}],
    "answered":[{"id":"01","slug":"approve-clips","kind":"spend","question":"…","default":null,"resume_at":"step 4: render clips from keyframes/","answer":"a"}],
    "waived":[],"resume_at":"step 4: render clips from keyframes/"}
   ```
2. **Open gate, and the person's message answers it** (an option id, or words that plainly pick one):
   `gate.mjs answer --project <p> --gate 01 --option a --by "<their words>"`, then resume. This holds
   for a text gate too, when the message picks an option other than its default.
3. **Open spend gate (exit 10), no answer in the message:** spend nothing, restate the question,
   end `partial` again.
4. **Resume at `resume_at`.** The plan is intent; the filesystem is truth: `manifest.mjs verify`,
   then skip every item whose row is `done` and whose files verify. Fetch any `pending` row with
   `ai-gen result <id>` before submitting anything new: it may already be paid for.

## Waivers

**The user's explicit instruction wins, even against the house rules** (HR20): do it, state the cost
in one line, and record it.
- A rule waiver: `manifest.mjs waive --project <p> --rule HR5 --instruction "<their words>" --cost "+200 cr"`.
- A gate the user tells you to skip: `gate.mjs waive --project <p> --gate 02 --instruction "<their words>"`.
- **A "run straight through, do not pause" waiver is given before anything is spent, never during.**
  Record it at intake; a gate already open is answered, not waived retroactively.
- A third attempt the user orders: put their words in the row's `waiver` field.

## PROGRESS.md

Write `artifacts/<project>/PROGRESS.md` at every job's end, following this skeleton. Every section is
required; write "None" if empty rather than dropping the heading.

```
# <Project name> — Progress

## Summary
1-3 sentences: what this project is and where it stands.

## Decisions
Bullet list of choices locked in (models, aspect ratio, tone, style, casting).

## Asset inventory
Counts + the folder each role lives in. Note the varying axis (e.g. 3 languages).
e.g. Finals: 3 (final/) — EN, FR, DE · Clips: 9 (clips_*/) · Keyframes: 6 · Source: 1

## Pipeline
Ordered steps actually taken, with the model used at each step.

## Known gaps
Anything unfinished, rough, or deliberately skipped.

## Next steps
Concrete follow-ups someone could pick up.
```

Keep filenames traceable: PROGRESS.md references `manifest.json` as the map from filename to prompt
and model, so a bare name like `clip2.mp4` is always resolvable. The project folder is the delivery;
build a single archive only if the brief asks for one (`python3 -m zipfile -c final/<project>.zip <dirs>`).

Close the job with one short line: the folder tree, the total file count and the credits spent, e.g.
"Delivered 7 files: final/ (2 cuts 9x16, 16x9), keyframes/ (4), source/ (1), plus PROGRESS.md and
manifest.json; 252 credits."
