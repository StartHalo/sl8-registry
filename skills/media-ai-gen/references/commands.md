# ai-gen: full command reference

The complete command surface of `ai-gen` 2.2.0 as this machine uses it. SKILL.md has the critical
rules and quick patterns; this file is the manual. Every claim here was read from the ai-gen source
(`studio/packages/worker/ai-gen/`) or from a dated SL8 record named beside it.

## Contents
- [Configuration and environment](#configuration-and-environment)
- [models: search the catalog](#models-search-the-catalog)
- [info: inspect inputs](#info-inspect-inputs)
- [Raw OpenAPI: const and enum](#raw-openapi-const-and-enum)
- [estimate: cost per call, in credits](#estimate-cost-per-call-in-credits)
- [run: execute any endpoint](#run-execute-any-endpoint)
- [image, video, audio, transcribe](#image-video-audio-transcribe)
- [Parameters: k=v, k:=json, --params-file](#parameters)
- [Inputs and uploads](#inputs-and-uploads)
- [Output: the JSON envelope](#output-the-json-envelope)
- [Queue lifecycle: status, result, cancel](#queue-lifecycle-status-result-cancel)
- [balance and doctor](#balance-and-doctor)
- [Exit codes](#exit-codes)
- [Known defects and their workarounds](#known-defects-and-their-workarounds)
- [Proxy and billing facts](#proxy-and-billing-facts)
- [Facts rows (owned by other skills)](#facts-rows-owned-by-other-skills)

## Configuration and environment

There is nothing to install or set up: `ai-gen` is baked into the machine, and fal's own CLIs and
hosted tools are not on this machine. If `ai-gen` or a variable below is missing, the machine is
broken: run `ai-gen doctor`, report it, and do not repair it (HR21).

| Variable | Meaning |
|---|---|
| `SL8_SESSION_TOKEN`, `SL8_API_URL` | Proxy credentials, set by the platform. Without them generation exits 3; `models` and `info` still work. **Never print them** or write `env` output into a file: one transcript carrying a live token was pushed once (T3 #14) |
| `SL8_SPEND_CEILING` | The run's credit ceiling. Default `--max-cost` = ceiling − ledger total, floored at 0. A `--max-cost` flag can lower it, never raise it |
| `SL8_SPEND_LEDGER` | JSONL file: one line `{at, model, request_id, credits_used, credits_basis}` per generation. A request id is counted once |
| `AI_GEN_OUTPUT_DIR` | Default download directory (else `/home/user/artifacts`). Always pass `-o` instead |
| `AI_GEN_CACHE_DIR` | Catalog, schemas and the local job store (default `~/.cache/ai-gen`) |
| `AI_GEN_DATA_URI_MAX_BYTES` | Inline cap for local files when storage upload is unavailable (default 3 MB) |

## models: search the catalog

```bash
ai-gen models --search seedance --format json          # substring over id, name, description, tags
ai-gen models --category image-to-video --format json  # text-to-image, image-to-image, text-to-speech, …
ai-gen models --type video --format json                # image | video | audio category groups
ai-gen models --status deprecated --format json
ai-gen models --refresh --search nano-banana --format json
```

| Option | Description |
|---|---|
| `-s, --search <q>` | Client-side substring match over the whole cached catalog |
| `--category <c>` / `--type <t>` / `--status <s>` | Filters |
| `--limit <n>` | Text rows only (default 50); JSON is never truncated |
| `--refresh` | Bypass the 24 h cache. The first cold fetch pages ~1,500 models and took ~2 min (T2, 2026-10-05) |

JSON output carries `fetched_at` and `source`. The catalog prints **no prices**: run `estimate` on
each candidate. Discovery is advisory: the proxy has served unlisted ids and 404'd listed ones, so a
real call's success is the only proof (T3 #11).

## info: inspect inputs

```bash
ai-gen info fal-ai/nano-banana-pro/edit --format json
```

Prints status, category, the **input** schema (type, `enum`, `default`, min/max, `maxItems`), a
registry credit figure for registered ids only, and an example command. Exit 8 when discovery has
neither metadata nor schema. Always run it before `run` for an unfamiliar endpoint. Limits:
- **A `const` is shown as a plain default.** Read the raw OpenAPI (next section) for every field
  you set.
- **No output schema.** Read `raw` in the result envelope.
- **Reference caps often live in prose, not `maxItems`** (P1 hazard 6): read the description field.
- `info`'s example may suggest `image_urls:='["<path-or-url>"]'`; a local path there is not uploaded
  (see [Inputs and uploads](#inputs-and-uploads)).

## Raw OpenAPI: const and enum

`python3` is on this machine; `jq` may not be, so parse with python3 or node.

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

`UNRESOLVED` means the slug is gone. A field whose type is an `anyOf` prints without its inner
`enum`; `ai-gen info` resolves those, so read both. Free; no credentials needed.

## estimate: cost per call, in credits

```bash
ai-gen estimate fal-ai/nano-banana-pro --params-file work/p/hero.params.json --format json
ai-gen estimate bytedance/seedance-2.0/image-to-video duration:='"5"' resolution=720p generate_audio:=false --format json
```

- **Param-aware** (`POST /_estimate`, never charged), falling back to the proxy registry. **Exit 12
  when neither prices the model**: the model is unpriced (see the defects table).
- Output: `estimated_credits`, `basis`, `unit`, `unit_price`, and `warning` when an image model
  appears priced by video duration (a known proxy mispricing).
- **Work in credits only: about 250 credits = $1** (one proxy record: Seedance 2.0, 720p, 5 s =
  378 cr = $1.512, P1). The `estimated_usd` field is wrong on the registry path (credits ÷ 100,
  2.5× too high): never quote it.
- **`estimate` does not coerce types the way `run` does**, so `--duration 5` and `duration=5` can be
  priced as a different shape from the one sent. Estimate and run from the **same params file**
  with exact JSON types.

## run: execute any endpoint

```bash
ai-gen run <endpoint-id> [k=v …] [--params-file f.json] [media flags] -o artifacts/<project>/<node>/ \
  --queue --strict-params --max-cost <credits> --format json
```

| Option | Description |
|---|---|
| `<model-id>` | Full endpoint id, any namespace (`fal-ai/…`, `bytedance/…`, `openai/…`). Required |
| `-p, --prompt <text>` | Maps to `prompt` |
| `--params-file <path\|->` | JSON params (lowest precedence) |
| `--aspect-ratio`, `--resolution`, `--duration`, `-n/--num-images`, `--seed` | Typed flags → `aspect_ratio`, `resolution`, `duration`, `num_images`, `seed` |
| `--audio on\|off` | Sets **only** `generate_audio` (see defects) |
| `--image`, `--video`, `--audio-file`, `--ref` (repeatable) | Media inputs, uploaded |
| `-o, --output <dir>` | Download directory. Always set it to `artifacts/<project>/<node>/` |
| `--queue` / `--sync` / `--async` | Execution mode. `run` defaults to **sync**, which returns **no request id** |
| `--timeout <ms>` | Sync timeout or queue max-wait (queue default 15 min) |
| `--max-cost <credits>` | Abort before submitting if the estimate exceeds it (exit 13) |
| `--strict-params` | Fail before submitting on a param the schema does not list (exit 7, not charged) |
| `--url-only` / `--no-download` | Skip downloads. Do not use for deliverables: URLs expire |
| `--refresh` | Bypass catalog and schema caches |
| `-q, --quiet` | No progress output (automatic when stderr is not a terminal) |

Before submitting, ai-gen checks required fields, types, `enum`, min/max and `maxItems` against the
schema and refuses locally (exit 7, `error.details.checked: "client-side"`, nothing charged).
**Sync mode retries a retryable failure (5xx, 429, network) up to twice by itself**; queue mode never
resubmits. Use `--queue` for every paid call, and `--async` when the wait could outlast your
command's own time limit.

Files are named `{model-tail}-{ISO-stamp}[-index].{ext}` inside `-o`; there is no naming template.
Rename afterwards if you need a stable name, **before** `manifest.mjs add` hashes it.

## image, video, audio, transcribe

| Command | Default mode | Notes |
|---|---|---|
| `ai-gen image [prompt] [k=v…]` | sync | `-m` defaults to `fal-ai/flux/schnell`: always pass `-m`. `--image` always maps to `image_url`, which edit models that take `image_urls` reject: use `--ref` for those. `-s/--size` → `image_size`. **No `--resolution` flag here**: pass `resolution=2K` as k=v |
| `ai-gen video [prompt] -m <id>` | queue | `-m` required. `--image`/`--first-frame`, `--last-frame`, `--video`, `--audio-file`, `--ref`; param names picked from the schema (e.g. `start_image_url`) |
| `ai-gen audio tts <text> -m <id>` | sync | Sets both `text` and `prompt` (so `--strict-params` fails here; use `run` with the schema's field to be strict). `--voice` |
| `ai-gen audio sfx <prompt> -m <id>` | sync | Sets `prompt` and `text`; `--duration` |
| `ai-gen audio v2a [prompt] -m <id> --video <f>` | queue | Video-to-audio foley |
| `ai-gen audio stt <audio> [-m <id>]` | sync | Default `fal-ai/wizper`; `--task`, `--language`. Text arrives in `text`; word timings, when a model gives them, in `raw` |
| `ai-gen transcribe <audio>` | sync | v1 alias of `audio stt` |

All of them take the common flags of `run` (`-o`, `--format`, `--params-file`, `--queue`/`--async`,
`--max-cost`, `--strict-params`, `--timeout`, `--seed`).

## Parameters

| Form | Result |
|---|---|
| `key=value` | `true`/`false`/`null` → JSON; integers and decimals → numbers; `@path` → the file's text; else a string |
| `key:=<json>` | Exact JSON: arrays, objects, a string that looks like a number (`duration:='"5"'`) |
| `--params-file f.json` / `-` | A JSON object (stdin with `-`) |
| typed flags | Mapped to conventional names (above) |

**Precedence: typed flags > `key=value` > params file.** After merging, `run` re-coerces each value
to the schema's type (5 → "5" where the schema wants a string). Duration alone has five forms
(P1, 2026-10-05): strings `"4"`–`"15"` (Seedance, Kling); `"4s"`/`"6s"`/`"8s"` (Veo, no 5 s);
integer ranges (Wan 2–30, Grok 1–15, Gemini 3–10); an integer list (Happy Horse); decimals 0.92–15
(MiniMax H3). Write the schema's exact type in the params file.

**Write the params file first, then run from it** (`work/<project>/<item>.params.json`): ai-gen echoes
no parameters back, so the file is the only record of what was sent, and `manifest.mjs add --params`
copies it into the row.

## Inputs and uploads

There is no upload command. Local files reach a model only through the media flags, which resolve
them inside the call: proxy storage upload first, else an inline data URI up to 3 MB.

| Flag | Maps to (first name the schema has) |
|---|---|
| `--image` (`run`, `video`) | `image_url`, `start_image_url`, `first_frame_image_url`, `input_image_url`, `first_frame_image`, `image` |
| `--image` (`image`) | always `image_url` |
| `--last-frame` (`video` only) | `end_image_url`, `last_image_url`, `tail_image_url`, `last_frame_image_url`, `end_image` |
| `--video` | `video_url`, `input_video_url`, `source_video_url` |
| `--audio-file` | `audio_url`, `input_audio_url`, `speech_url` |
| `--ref` (repeatable) | `run`/`video`: `reference_image_urls`, `image_urls`, `reference_images`, `references`, `elements`; `image`: `image_urls` first. Checked against the schema's `maxItems` |

- **A local path inside a JSON array, a `k=v` value or a params file is NOT uploaded.** It is sent as
  text and the model fails (a 422, which may be charged). That covers `mask_url`, `video_urls`,
  `audio_urls`, and `end_image_url` on `run`. Workarounds: a media flag; a hosted URL from an earlier
  result (`hosted_urls[0]`, used promptly); or a data URI you build yourself (≤3 MB raw).
- `--ref` order is the prompt's `@Image1`, `@Image2`, … order. An untagged reference gets averaged
  (T3 #20).
- A file above the proxy's body limit fails with exit 2 (413).

## Output: the JSON envelope

```jsonc
{ "schema_version": "2.0", "success": true, "model": "fal-ai/nano-banana-pro",
  "request_id": "…",            // queue and async only; a sync call has none
  "files": [{ "url": "…", "local_path": "/home/user/artifacts/p/hero/nano-banana-pro-….png",
              "kind": "image", "content_type": "image/png", "size": 12345, "index": 0 }],
  "hosted_urls": ["https://v3b.fal.media/files/…"],   // EXPIRE: download now, never store as the deliverable
  "text": "…",                  // STT and other text outputs
  "credits_used": 38, "credits_basis": "result",     // "estimated" = display-only
  "timing": { "started_at": "…", "completed_at": "…", "elapsed_ms": 1234 },
  "raw": { } }                  // untouched provider payload (rewritten prompts, word timings live here)
```

Read `files[].local_path` and `hosted_urls[0]`; read `raw` only for fields the normalizer does not
lift (a returned rewritten prompt, `seed`, word timings). Never match on a URL prefix: the hosts vary
across the `*.fal.media` family (T3 #12). `--async` prints only `{request_id, model}`.

Error envelope, on stdout when not a terminal: `{"schema_version":"2.0","success":false,"error":
{"code","exit_code","message","retryable","details"}}`. Validation detail sits in
`error.details.detail[]` (upstream: `loc`, `msg`) or `error.details.issues[]` (client-side: `param`,
`message`). A queue timeout carries `error.details.requestId`. A download failure carries the whole
success envelope in `error.details.envelope`.

## Queue lifecycle: status, result, cancel

```bash
ai-gen result <request-id> [-m <id>] -o artifacts/<project>/<node>/ --format json
ai-gen status <request-id> [-m <id>] --format json    # one poll; never add --wait
```

- `result` fetches, normalizes and downloads a finished job from any process. While the job is not
  done it prints `{"status": …, "ready": false}` and **exits 0**, so a polling loop re-runs it. It
  records the job's credits in the ledger once per request id.
- `-m` is optional for jobs submitted on this machine: the local job store
  (`~/.cache/ai-gen/jobs.json`, newest first, last 100) maps request id → model.
- `status` without `--wait` is a cheap single poll. **Never use `status --wait`** (defect below).
- `cancel` always exits 12: the proxy has no cancel route, and the job runs to completion and is
  billed. So never fan out jobs you might abandon.

## balance and doctor

`ai-gen balance` prints the account's credits. **A balance delta measures the account, not the run**:
other runs share it, and billing lags about 5 minutes (T3 #4–5). Account for spend per request id from
the ledger (`manifest.mjs budget`). `ai-gen doctor` reports config, proxy and catalog reachability, and
the proxy capability table.

## Exit codes

| Exit | Code | Meaning | Charged? |
|---|---|---|---|
| 0 | — | Success | yes |
| 1 | `EMPTY_RESULT` / unknown | A "success" with no file and no text (JSON-only utility endpoints), or an unmapped error | `EMPTY_RESULT`: yes (recorded before the check) |
| 2 | `VALIDATION_ERROR`, `BAD_REQUEST` | Bad flags, local validation, 413 payload too large | no |
| 3 | `CONFIG_ERROR` | Missing `SL8_SESSION_TOKEN` / `SL8_API_URL` | no |
| 4 | `UNAUTHORIZED` | Proxy 401 | no |
| 5 | `INSUFFICIENT_CREDITS` | Proxy 402 | no |
| 6 | `PROXY_BLOCKED` | 403 model denied, or 402 unknown pricing (fail-closed) | no |
| 7 | `UPSTREAM_VALIDATION` | Parameters rejected. `details.checked: "client-side"` = refused before submit | client-side: no; upstream: may be (the proxy charges some validation failures) |
| 8 | `UPSTREAM_NOT_FOUND` | Endpoint not found upstream | usually no; check the ledger |
| 9 | `SERVICE_ERROR`, `RATE_LIMIT` | 5xx, 429, or a queued job that FAILED | may be: a queued-then-failed render may already be billed |
| 10 | `TIMEOUT` | Sync timeout or queue max-wait; the job may still finish | yes: treat as charged |
| 11 | `NETWORK_ERROR` | Proxy unreachable | unknown |
| 12 | `NOT_SUPPORTED_BY_PROXY` | `cancel`; `estimate` with no price; `balance` on an old proxy | no |
| 13 | `MAX_COST_EXCEEDED` | `--max-cost` / ceiling (or proxy 402 cost limit): **nothing was submitted** | no |
| 14 | `DOWNLOAD_FAILED` | Generation succeeded, a download failed; URLs are in the error envelope | yes |

The ledger line is written as soon as the proxy answers a sync or queued call, before the output is
checked, so exits 1 (`EMPTY_RESULT`), 7 (upstream, inside a success) and 14 appear in the ledger with
their charge. What to do for each: [recovery.md](recovery.md#exit-code-playbook).

## Known defects and their workarounds

Filed for one ai-gen release bundle (approach §6). Until a fixed version ships, the workaround is the rule.

| Defect (ai-gen 2.2.0) | Source | Workaround |
|---|---|---|
| `status --wait` writes the job to the ledger with **no credits**; the ledger counts a request id once, so a later `result` cannot add the real charge and the run under-counts | T2 takeaway 4 (`status.ts:84-89`, `spend-ledger.ts:72-75`) | Never use `status --wait`. Use `--queue`, or `--async` then `ai-gen result <id>` |
| `estimated_usd` = credits ÷ 100; the real rate is ~250 cr/$ | P1 takeaway 6 (`proxy-client.ts:313`) | Work and quote in credits only |
| `--audio on\|off` sets only `generate_audio`; Wan 3.0 uses `audio`, MiniMax `target_audio_url`, some have none | P1 takeaway 3 | Pin the audio field by its schema name in the params file; `--strict-params` exposes a miss |
| `info` shows a `const` as a default | D2b §4 gap 1 (`schema-engine.ts:159-164`) | Raw OpenAPI printer before the first submit of a session |
| No upload command; local paths in arrays and params files are sent unresolved | T2 §3c.1 | Media flags; hosted URL; self-built data URI |
| Sync calls return no request id | T2 §3c.5 | `--queue` for every paid call |
| No price → `--max-cost` not enforced; ai-gen warns and runs; the ledger counts the call as 0 | T2 §3d (`pipeline.ts:339-345`) | Do not run an unpriced model inside a budget; pick a priced route or open a gate |
| `--async` writes nothing to the ledger until `result`; parallel submits each see the full budget | T2 §3d (`pipeline.ts:105-109`) | Sum a fan-out's estimates against `budget` first; fetch every job |
| JSON-only results (metadata, image-size, vision JSON) fail `EMPTY_RESULT` after the charge | T2 §3c.3 | Do that work locally (ffprobe, ImageMagick, python3) |
| `estimate` does not re-coerce types | P1 hazard 1 | One params file with exact JSON types for both commands |
| No cancel; no logs in the JSON; `image -n` help text says 1–4 whatever the model allows; no `--dry-run`; no content-filter exit code | T2 §3c; approach §6 | Read ranges from `info`; never submit what you might abandon |

## Proxy and billing facts

Execution-level facts SL8 measured (T3 §2, dated by their source). They hold until a run disproves one;
record any contradiction as a learning, not a silent edit.

| # | Fact | As of |
|---|---|---|
| 1 | The proxy **silently drops unknown params**: `image_size` on nano-banana-pro was ignored and a 1:1 came back | 2026-07-22 |
| 2 | Edit endpoints take `image_urls[]`; a raw local path inside `image_urls:=[…]` gets a 422 | 2026-07 |
| 4 | `credits_used` over-reported ~8.4× on Seedance i2v (908 reported, 108 actual); `estimate` matched the bill; billing lags ~5 min | 2026-07-22 |
| 5, 8 | A balance delta is not a run's cost; a per-call cap is not a run cap (2,601 cr spent against an 800 brief, every call within its own cap) | 2026-09 |
| 6 | Per-call floors: Kokoro bills ~5 cr per call against a ~1 cr estimate, flux/schnell floors at 2 cr. Batch text into one call per block, never per sentence | 2026-07-22 |
| 7 | Exit 7 can be charged, never auto-retry it; exit 13 submitted nothing; exit 10 is an already-charged timeout, recover with `result` | 2026-08-23 |
| 10 | Always pass `-m` and `-o`: defaults are a stale model and the flat artifacts root | 2026-08 |
| 11 | Discovery is advisory: listed ids can 404 and unlisted ids can serve | 2026-07 |
| 12 | `*.fal.media` URLs expire: download at once and journal the request id at submit | 2026-06 |

## Facts rows (owned by other skills)

Model ids, limits, prices and defaults live in the owning skill's `references/facts.md` (HR22), one
dated row per fact, in this shape (D2c §4):

| id | endpoint | kind | assert | fact | as_of | source | re-verify | verdict |
|---|---|---|---|---|---|---|---|---|
| veo31-fast-ext-duration | fal-ai/veo3.1/fast/extend-video | schema | `const: "7s"` | duration is const "7s"; any other value is rejected | 2026-10-05 | fal queue OpenAPI | raw OpenAPI printer | confirmed |
| seedance20-i2v-720p-rate | bytedance/seedance-2.0/image-to-video | price | 378 cr ±5% for 5 s 720p, no audio | — | 2026-10-05 | proxy estimate | `ai-gen estimate … --params-file` | confirmed |

- `schema` rows re-verify with the raw OpenAPI printer (exact match; `UNRESOLVED` = gone).
- `price` rows re-verify with `ai-gen estimate` (within tolerance; a promotion carries its end date).
- `behaviour` rows name their run and expire at a review date; past it they read **unverified**.
