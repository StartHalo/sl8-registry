---
name: media-ai-gen
description: >-
  Runs generative models on this machine with ai-gen, the SL8 CLI over fal endpoints through the
  SL8 proxy: run a model, generate an image, video or audio file, find an endpoint, read its
  schema, estimate cost in credits, fetch a result by request id, recover from a timeout or an
  exit code, stay inside the spend ceiling, and record every generation in the manifest, gate
  files and PROGRESS.md. Every other media skill hands execution to it. Use when: run a model,
  generate, ai-gen, fal endpoint or model id, request id, estimate cost, credits, spend ceiling,
  manifest, gate, partial job, resume, exit code, timeout, delivery folder. NOT for: choosing an
  image model or writing its prompt (media-image-generation), editing pixels locally
  (media-photo-editing), checking outputs (media-qc).
license: MIT (fal-ai-community/skills README) for the fal-community parts; fal-agent parts adapted from fal agent skills; no licence stated; used with attribution
compatibility: "sl8-image >=1.0.0 (Base 2.0.2); ai-gen 2.2.0; node >=20; python3 (raw OpenAPI check)"
metadata:
  version: 1.0.0
  revision: 2026-10-05a
  house-rules: HR-1.0
  upstream: [fal-community/genmedia, fal-agent/fal-video-generation, fal-agent/wrap-it-up, fal-agent/fal-video-production]  # sources only; that CLI is not on this machine
  upstream-pin: fal-community 9ca850412943251fc9a466c4c29fdaf7a303a3d8 (2026-05-13); fal-agent export 2026-10-05
  attribution: Adapted from fal-ai-community/skills (MIT) and fal (fal.ai/agent/skills export 2026-10-05)
  deltas: IMG-D01..IMG-D19
---

# ai-gen: the model runner on this machine

**Every media skill on this machine runs its models through this skill.** `ai-gen` is the
agent-first CLI for fal.ai endpoints. It sends every generation through the SL8 proxy, which holds
the provider keys and bills credits; it never asks you for a key. Other media skills choose the
endpoint and write the prompt; they execute with the commands here and do not wrap the fal HTTP API
directly.

- Full command surface (every flag, the output envelope, exit codes, known defects):
  [references/commands.md](references/commands.md)
- Manifest, `plan.json`, gate files and PROGRESS.md: [references/gates-and-manifest.md](references/gates-and-manifest.md)
- Timeouts, failures, retries and missing models: [references/recovery.md](references/recovery.md)
- The numbered rules every media skill cites: [references/house-rules.md](references/house-rules.md)

## Critical rules

1. **Always use `--format json` when an agent will read the output.** Text mode is for humans
   only. On a failure the error envelope is printed to stdout as JSON: branch on the exit code,
   never on message text.
2. **Always name the endpoint.** Pass `-m <endpoint>` (or the positional id on `run`), taking the
   id from the owning skill's `picks.md` / `facts.md` (HR22). **Never invent endpoint IDs.** Verify
   one with `ai-gen info <id>` (exit 8 means unknown) and discover with `ai-gen models --search <q>`.
3. **Inspect the schema before running with custom params, and check values, not just names.**
   `ai-gen info <id> --format json` shows field names, types, enums and defaults, **but it shows a
   `const` as a plain default.** Read the raw OpenAPI for every field you set (pattern step 3). A
   field the schema does not list is dropped silently by the proxy (HR3); a value the schema
   rejects fails with exit 7, which may be charged.
4. **Estimate before every paid call, in credits.** `ai-gen estimate` with the same params file
   you will run (about 250 credits = $1). Never quote ai-gen's own USD figure: it divides by 100
   and overstates dollars 2.5×.
5. **Save files with `-o artifacts/<project>/<node>/`, not curl.** The CLI downloads by default;
   hosted URLs expire.
6. **Use `--queue` (or `--async`, then `ai-gen result <id>`) for every paid call.** Only queued
   calls return a request id, and the request id is the only handle that recovers a job.
   Never `status --wait`: it records the job in the spend ledger with no credits.
7. **Never re-fire a job that may exist** (HR6). Once a request id exists, only `ai-gen result <id>`
   touches it again.

## Command index

| Command | Purpose |
|---|---|
| `ai-gen models --search <q> [--category <c>] --format json` | Search the live fal catalog (cached 24 h; `--refresh` bypasses) |
| `ai-gen info <id> --format json` | Status, input schema (types, enums, defaults, caps), example. Exit 8 if unknown |
| `ai-gen estimate <id> --params-file <p.json> --format json` | Credits for exactly these params. Never charged. Exit 12 means unpriced |
| `ai-gen run <id> --params-file <p.json> [media flags] -o <dir> --queue --format json` | Run any endpoint (the universal runner; sync unless `--queue`/`--async`) |
| `ai-gen image` / `video` / `audio tts\|sfx\|v2a\|stt` | Typed shortcuts. `video` and `audio tts\|sfx\|v2a` require `-m` |
| `ai-gen result <request-id> -o <dir> --format json` | Fetch and download a queued job from any process; not ready prints `ready:false`, exit 0 |
| `ai-gen status <request-id> --format json` | Poll once (never with `--wait`) |
| `ai-gen balance` · `ai-gen doctor` | Account credits · config, reachability, proxy capabilities |
| `ai-gen cancel <request-id>` | Not available: always exits 12; nothing is cancelled |
| `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs init\|add\|verify\|budget\|waive` | The project manifest (HR9) |
| `node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open\|answer\|status\|waive` | Gate files and the `partial` stop (HR12) |

## Quick patterns

### Run one endpoint, from discovery to manifest row

`P` is the project, `N` the node folder, `I` the item. Scripts live at
`$HOME/.agents/skills/media-ai-gen/scripts/`; deliverables go in `artifacts/$P/`, scratch in `work/$P/`.

```bash
S=$HOME/.agents/skills/media-ai-gen/scripts
node $S/manifest.mjs init --project "$P"                       # once per project
# 1. Discover only when the owning skill names no pick, or the pick fails
ai-gen models --search "background removal" --format json
# 2. Fields, types, enums, defaults
ai-gen info fal-ai/nano-banana-pro --format json
# 3. const / enum check on the raw OpenAPI (step below)
# 4. Params file: every field you set, every default-on flag pinned (HR4), exact JSON types
cat > "work/$P/$I.params.json" <<'EOF'
{"prompt": "…", "aspect_ratio": "16:9", "resolution": "1K", "num_images": 1}
EOF
# 5. Estimate with the SAME file, then check the run budget
ai-gen estimate fal-ai/nano-banana-pro --params-file "work/$P/$I.params.json" --format json
node $S/manifest.mjs budget --project "$P"
# 6. Run queued (request id), capped at the quote, downloaded into the node folder
ai-gen run fal-ai/nano-banana-pro --params-file "work/$P/$I.params.json" --queue \
  --strict-params --max-cost 40 -o "artifacts/$P/$N/" --format json > "work/$P/$I.result.json"
# 7. One manifest row per generation: endpoint, request id, files and credits come from the
#    result envelope; the files are hashed; you add what ai-gen cannot know
node $S/manifest.mjs add --project "$P" --result "work/$P/$I.result.json" \
  --params "work/$P/$I.params.json" \
  --json '{"item":"hero","node":"hero","declared":{"aspect":"16:9"},"credits":{"estimate":38}}'
```

Then check the file with media-qc (HR13) before you deliver it. The row's fields are in
[gates-and-manifest.md](references/gates-and-manifest.md#asset-row).

### Check every value against `const` and `enum` (raw OpenAPI)

Model IDs drift, and fields get pinned. **Before the first submit of a session, print the route's
fields with their constraints, not just its name:**

```
curl -s "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<slug>" \
  | python3 -c "
import json,sys
doc=json.load(sys.stdin)
sch=(doc or {}).get('components',{}).get('schemas',{})
if not sch: print('UNRESOLVED'); sys.exit(1)
for n,s in sch.items():
    if n.endswith('Input'):
        print(n,'required:',s.get('required',[]))
        for f,p in s.get('properties',{}).items():
            print(' ',f,{k:p[k] for k in ('type','const','enum','default') if k in p})
"
```

`UNRESOLVED` means the slug is gone. Then **check every value the payload will carry against the
printed `const` or `enum`**: a check that only confirms a field's name exists will pass a route that
rejects your value. A `const` is not a default you can override: `duration` on
`fal-ai/veo3.1/fast/extend-video` is a `const` `"7s"`, so a `"4s"` payload is a guaranteed rejection
that a field-name check pronounces healthy. If a `const` or `enum` excludes the value the job needs,
the route cannot serve the request: move to the owning skill's fallback before building a payload.
**If the slug fails, search the catalog rather than guessing a name:** `ai-gen models --search <words>`,
then `ai-gen estimate` each candidate, since the catalog prints no prices. Then read the new
endpoint's schema for its real field names. Never assemble a payload from a sibling endpoint's
parameters.

### Long jobs: submit, then fetch by id

```bash
ai-gen video "<motion prompt>" -m <endpoint> --params-file "work/$P/$I.params.json" \
  --image "artifacts/$P/keyframes/k1.png" --async --format json > "work/$P/$I.submit.json"
node $S/manifest.mjs add --project "$P" --result "work/$P/$I.submit.json" \
  --params "work/$P/$I.params.json" --json '{"item":"shot-1","node":"clips","status":"pending",…}'
ai-gen result <request-id> -o "artifacts/$P/clips/" --format json > "work/$P/$I.result.json"
# repeat while it prints ready:false, then add again with --result: the same request id updates the row
```

Record the request id the moment you have it (the pending row is your journal). Video jobs run minutes, not seconds: do not resubmit on slowness. `--async` writes
nothing to the spend ledger until `ai-gen result` fetches the job, so fetch every job you submit.

### Local files as inputs

The media flags upload a local file inside the call: `--image`, `--video`, `--audio-file`,
`--first-frame`, `--last-frame`, and repeatable `--ref` (multi-reference and edit arrays such as
`image_urls`, addressed in the prompt as `@Image1`, `@Image2`, …). **A local path inside a JSON array,
a `k=v` value or a params file is NOT uploaded**; it is sent as text and fails. To chain nodes, pass
the previous output's local file through a media flag, or its `hosted_urls[0]` promptly.

## Cost comes first

**Quote before you spend.** Run `ai-gen estimate` for each paid step with its real params (the
duration, resolution, count and audio you will send), and put the figure in the plan.
- **A chained job is quoted per step**, one line per paid route plus a running total. Gate on the
  total, not on any single line: two small steps that sum past the budget still stop.
- **The run ceiling.** When `SL8_SPEND_CEILING` is set, ai-gen's default `--max-cost` is the ceiling
  minus what `SL8_SPEND_LEDGER` already records; a flag can tighten that cap, never raise it.
  Exit 13 means nothing was submitted. `manifest.mjs budget` prints ceiling, spent and remaining.
- **Unpriced models are not capped.** If `estimate` exits 12, ai-gen warns and runs uncapped and the
  ledger counts the call as 0. Pick a priced route, or open a gate.
- **Parallel submits each see the full remaining budget.** Sum the estimates of a fan-out and check
  the total against the remaining budget before the first submit.
- **Pin every default-on flag explicitly** (HR4), even when you want the default. Never send
  `duration: "auto"` to per-second billing: you are letting the model choose the bill.
- **Draft when the concept is unproven**, and price both the draft and the finish before drafting.
- **When a step would spend past what the brief approved**, open a gate and end the job `partial`
  (HR12); a re-run of an approved shape (same route, same length, new prompt) needs no new gate.

## Recovery

| Situation | Do |
|---|---|
| Exit 10 (timeout) | Already charged. `ai-gen result <id>`, never a resubmit. A sync timeout has no id: that is why paid calls run `--queue` |
| A 4xx or exit 7 | Read the error before retrying. A rejected value or field is a payload bug, not a transient failure: resubmitting unchanged fails again and may be charged again |
| Exit 13 | Nothing was submitted. Re-plan the spend or open a gate; never raise the cap |
| Exit 14 | Charged. Re-download with `ai-gen result <id> -o …` (sync: fetch `hosted_urls` now). Never regenerate |
| Exit 8 or `UNRESOLVED` | The model is gone or renamed: `ai-gen models --search <name>`, `ai-gen info`, report the stale pick |
| A bad output | **One retry, and it moves a named lever**; a second failure goes to the named fallback or a gate, never a third attempt on the same route (HR7). Record `attempt` and `lever` in the row |

The full exit-code playbook and the retry ledger are in [recovery.md](references/recovery.md).

## Delivery

- **Layout (HR8):** deliverables under `artifacts/<project>/` in named folders by role, never a
  flat dump: `final/`, `clips/`, `keyframes/`, `source/`. Split folders along the axis the project
  varies on (`final_9x16/ final_16x9/`, `variant_a/ variant_b/`). Scratch work stays in `work/<project>/`.
- **The manifest is the index** (`artifacts/<project>/manifest.json`, schema `sl8.media.manifest/1`):
  one row per generation, written by `manifest.mjs add`, never by hand. Run `manifest.mjs verify`
  before you deliver.
- **PROGRESS.md** at the project root follows the required skeleton in
  [gates-and-manifest.md](references/gates-and-manifest.md#progressmd): every section present,
  "None" when empty, and the manifest named as the map from file to prompt and model.
- **A hand-off names the file and the debt still owed on it** (HR15). Never substitute a route
  silently: name the fallback and its different cost.
- **Close with one short line:** the folder tree, the file count and the credits spent.
- **A spend gate ends the job:** `gate.mjs open` writes the gate and `artifacts/<project>/outcome.json`
  `{status: "partial"}`. The next job runs `gate.mjs status` first and resumes at `resume_at`.

## Errors and exit codes

| Exit | Meaning | Charged? | Do |
|---|---|---|---|
| 0 | Success | yes (`credits_used`) | Manifest row, then media-qc |
| 1 | Unknown, or `EMPTY_RESULT` (success with no file or text) | `EMPTY_RESULT`: yes | Read `error.code`; do not repeat a JSON-only utility call |
| 2 | Usage or local validation (also 413 payload too large) | no | Fix the command |
| 3 · 4 | Missing config · auth 401 | no | `ai-gen doctor`; the machine is broken, report it (HR21) |
| 5 | Insufficient credits (402) | no | Stop; report the balance |
| 6 | Model denied (403) or unknown pricing | no | Another route from the owning skill |
| 7 | Parameters rejected | client-side check: no; upstream: may be | Fix the named field (`error.details`); never blind-retry |
| 8 | Model not found upstream | no | `ai-gen models --search`, then `info` |
| 9 | Upstream or proxy infra error, 429 | may be | Sync already retried twice; for a queue job use `result <id>` |
| 10 | Timeout; the job may still finish | yes | `ai-gen result <id>` |
| 11 | Network unreachable | unknown | Never resubmit blind; see recovery.md |
| 12 | Not supported by the proxy (cancel; no price) | no | Pick a priced route; nothing can be cancelled |
| 13 | Cost cap exceeded | no, nothing submitted | Re-plan or gate |
| 14 | Generation OK, download failed | yes | Re-download (above) |

## House rules (HR-1.0)

Relies on: HR1, HR2, HR3, HR4, HR5, HR6, HR7, HR8, HR9, HR12, HR13, HR14, HR15, HR16, HR19, HR20,
HR21, HR22 — see media-ai-gen/references/house-rules.md.
Not applicable: HR10, HR11 (what to edit and how is the generation and editing skills' choice; this
skill only runs it), HR17, HR18 (no likeness, voice or claim is chosen here; the calling skill owns
the content).
